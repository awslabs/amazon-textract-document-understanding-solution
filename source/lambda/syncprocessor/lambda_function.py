
######################################################################################################################
 #  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           #
 #                                                                                                                    #
 #  Licensed under the Apache License, Version 2.0 (the License). You may not use this file except in compliance    #
 #  with the License. A copy of the License is located at                                                             #
 #                                                                                                                    #
 #      http://www.apache.org/licenses/LICENSE-2.0                                                                    #
 #                                                                                                                    #
 #  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES #
 #  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    #
 #  and limitations under the License.                                                                                #
 #####################################################################################################################

import boto3
from decimal import Decimal
import json
import os
from helper import AwsHelper, S3Helper, DynamoDBHelper
from og import OutputGenerator, KVPAIRS, DOCTEXT ,SERVICE_OUTPUT_PATH_S3_PREFIX,COMPREHEND_PATH_S3_PREFIX,TEXTRACT_PATH_S3_PREFIX,PUBLIC_PATH_S3_PREFIX
import datastore
from comprehendHelper import ComprehendHelper
from kendraHelper import KendraHelper

def generatePdf(documentId, bucketName, objectName, responseBucketName, outputPath):

    responseDocumentName = "{}{}response.json".format(outputPath,TEXTRACT_PATH_S3_PREFIX)
    fileName = os.path.basename(objectName).split(".")[0]
    outputDocumentName = "{}{}-searchable.pdf".format(outputPath,fileName)

    data = {}
    data["bucketName"] = bucketName
    data["documentName"] = objectName
    data["responseBucketName"] = responseBucketName
    data["responseDocumentName"] = responseDocumentName
    data["outputBucketName"] = responseBucketName
    data["outputDocumentName"] = outputDocumentName

    client = boto3.client('lambda')

    response = client.invoke(
        FunctionName=os.environ['PDF_LAMBDA'],
        InvocationType='RequestResponse',
        LogType='Tail',
        Payload=json.dumps(data)
    )


    

def callTextract(bucketName, objectName, detectText, detectForms, detectTables):
    textract = AwsHelper().getClient('textract')
    if(not detectForms and not detectTables):
        response = textract.detect_document_text(
            Document={
                'S3Object': {
                    'Bucket': bucketName,
                    'Name': objectName
                }
            }
        )
    else:
        features = []
        if(detectTables):
            features.append("TABLES")
        if(detectForms):
            features.append("FORMS")

        response = textract.analyze_document(
            Document={
                'S3Object': {
                    'Bucket': bucketName,
                    'Name': objectName
                }
            },
            FeatureTypes=features
        )

    return response


def processImage(documentId, features, bucketName, outputBucketName, objectName, outputTableName, documentsTableName, elasticsearchDomain):

    detectText = "Text" in features
    detectForms = "Forms" in features
    detectTables = "Tables" in features

    response = callTextract(bucketName, objectName,
                            detectText, detectForms, detectTables)

    dynamodb = AwsHelper().getResource("dynamodb")
    ddb = dynamodb.Table(outputTableName)

    
    outputPath = '{}{}/{}'.format(PUBLIC_PATH_S3_PREFIX,documentId,SERVICE_OUTPUT_PATH_S3_PREFIX)
    print("Generating output for DocumentId: {} and storing in {}".format(documentId,outputPath))

    opg = OutputGenerator(documentId, response, outputBucketName, objectName, detectForms, detectTables, ddb,outputPath, elasticsearchDomain)
    opg_output = opg.run()

    generatePdf(documentId, bucketName, objectName, outputBucketName,outputPath)

    # generate Comprehend and ComprehendMedical entities in S3
    comprehendOutputPath = "{}{}".format(outputPath,COMPREHEND_PATH_S3_PREFIX)
    print("Comprehend output path: " + comprehendOutputPath)
    maxPages = 100
    comprehendClient = ComprehendHelper()
    responseDocumentName = "{}{}response.json".format(outputPath,TEXTRACT_PATH_S3_PREFIX)
    # comprehend medical entities API will be called only if the flag is set to true during deployment
    isComprehendMedicalEnabled = True if os.environ['ENABLE_COMPREHEND_MEDICAL']=="true" else False
    comprehendAndMedicalEntities = comprehendClient.processComprehend(outputBucketName, responseDocumentName, comprehendOutputPath, isComprehendMedicalEnabled, maxPages)

    # if Kendra is available then let it index the document
    # index the searchable pdf in Kendra
    if 'KENDRA_INDEX_ID' in os.environ :
        kendraClient = KendraHelper()
        fileName = os.path.basename(objectName).split(".")[0]
        fileExtension = os.path.basename(objectName).split(".")[1]
        outputDocumentName = "{}{}-searchable.pdf".format(outputPath, fileName)
        kendraClient.indexDocument(os.environ['KENDRA_INDEX_ID'],
                                   os.environ['KENDRA_ROLE_ARN'],
                                   outputBucketName,
                                   outputDocumentName,
                                   documentId,
                                   fileExtension)

    print("Processed Comprehend data for document: {}".format(documentId))

    if 'ES_DOMAIN' in os.environ :
        for key, val in opg_output[KVPAIRS].items():
            if key not in comprehendAndMedicalEntities:
                comprehendAndMedicalEntities[key] = val
            else:
                comprehendAndMedicalEntities[key].append(val)
        opg.indexDocument(opg_output[DOCTEXT], comprehendAndMedicalEntities)

    ds = datastore.DocumentStore(documentsTableName, outputTableName)
    ds.markDocumentComplete(documentId)

# --------------- Main handler ------------------


def processRequest(request):

    output = ""

    print("Request: {}".format(request))

    bucketName = request['bucketName']
    objectName = request['objectName']
    features = request['features']
    documentId = request['documentId']
    outputBucketName = request['outputBucketName']
    outputTable = request['outputTable']
    documentsTable = request['documentsTable']
    documentsTable = request["documentsTable"]
    elasticsearchDomain = request["elasticsearchDomain"]

    if(documentId and bucketName and objectName and features):
        print("DocumentId: {}, features: {}, Object: {}/{}".format(documentId,
                                                                   features, bucketName, objectName))

        processImage(documentId, features, bucketName, outputBucketName,
                     objectName, outputTable, documentsTable, elasticsearchDomain)

        output = "Document: {}, features: {}, Object: {}/{} processed.".format(
            documentId, features, bucketName, objectName)
    
    return {
        'statusCode': 200,
        'body': output
    }


def lambda_handler(event, context):

    print("Event: {}".format(event))
    message = json.loads(event['Records'][0]['body'])
    print("Message: {}".format(message))

    request = {}
    request["documentId"] = message['documentId']
    request["bucketName"] = message['bucketName']
    request["objectName"] = message['objectName']
    request["features"] = message['features']
    request["outputBucketName"] = os.environ['OUTPUT_BUCKET']
    request["outputTable"] = os.environ['OUTPUT_TABLE']
    request["documentsTable"] = os.environ['DOCUMENTS_TABLE']
    request["elasticsearchDomain"] = os.environ['ES_DOMAIN']
    return processRequest(request)
