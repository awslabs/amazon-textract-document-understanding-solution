
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

import json
import os
import boto3
import time
from helper import AwsHelper
from og import OutputGenerator, KVPAIRS, DOCTEXT ,SERVICE_OUTPUT_PATH_S3_PREFIX,COMPREHEND_PATH_S3_PREFIX,TEXTRACT_PATH_S3_PREFIX,PUBLIC_PATH_S3_PREFIX
import datastore
from comprehendHelper import ComprehendHelper
from kendraHelper import KendraHelper

def generatePdf(documentId, bucketName, objectName, responseBucketName,outputPath):
    
    responseDocumentName = "{}{}response.json".format(outputPath,TEXTRACT_PATH_S3_PREFIX)
    fileName = os.path.basename(objectName).split(".")[0]
    outputDocumentName = "{}{}-searchable.pdf".format(outputPath, fileName)

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
    
    
def getJobResults(api, jobId):

    pages = []

    client = AwsHelper().getClient('textract')
    response = client.get_document_analysis(JobId=jobId)
    pages.append(response)
    print("Resultset page recieved: {}".format(len(pages)))
    nextToken = None
    if('NextToken' in response):
        nextToken = response['NextToken']
        print("Next token: {}".format(nextToken))

    while(nextToken):
        try:
            if(api == "StartDocumentTextDetection"):
                response = client.get_document_text_detection(JobId=jobId, NextToken=nextToken)
            else:
                response = client.get_document_analysis(JobId=jobId, NextToken=nextToken)

            pages.append(response)
            print("Resultset page recieved: {}".format(len(pages)))
            nextToken = None
            if('NextToken' in response):
                nextToken = response['NextToken']
                print("Next token: {}".format(nextToken))

        except Exception as e:
            if(e.__class__.__name__ == 'ProvisionedThroughputExceededException'):
                print("ProvisionedThroughputExceededException.")
                print("Waiting for few seconds...")
                time.sleep(5)
                print("Waking up...")


    return pages

def processRequest(request):

    output = ""

    print("Request : {}".format(request))

    jobId = request['jobId']
    documentId = request['jobTag']
    jobStatus = request['jobStatus']
    jobAPI = request['jobAPI']
    bucketName = request['bucketName']
    outputBucketName = request['outputBucketName']
    objectName = request['objectName']
    outputTable = request["outputTable"]
    documentsTable = request["documentsTable"]
    elasticsearchDomain = request["elasticsearchDomain"]

    pages = getJobResults(jobAPI, jobId)

    print("Result pages recieved: {}".format(len(pages)))

    dynamodb = AwsHelper().getResource("dynamodb")
    ddb = dynamodb.Table(outputTable)

    detectForms = False
    detectTables = False
    if(jobAPI == "StartDocumentAnalysis"):
        detectForms = True
        detectTables = True

    dynamodb = AwsHelper().getResource('dynamodb')
    ddb = dynamodb.Table(outputTable)

    outputPath = '{}{}/{}'.format(PUBLIC_PATH_S3_PREFIX,documentId,SERVICE_OUTPUT_PATH_S3_PREFIX)
    print("Generating output for DocumentId: {} and storing in {}".format(documentId,outputPath))

    opg = OutputGenerator(documentId, pages, outputBucketName, objectName, detectForms, detectTables, ddb,outputPath, elasticsearchDomain)
    opg_output = opg.run()

    generatePdf(documentId, bucketName, objectName, outputBucketName,outputPath)

    # generate Comprehend and ComprehendMedical entities
    comprehendOutputPath = "{}{}".format(outputPath,COMPREHEND_PATH_S3_PREFIX)
    print("Comprehend output path: " + comprehendOutputPath)
    maxPages = 100
    comprehendClient = ComprehendHelper()
    responseDocumentName = "{}{}response.json".format(outputPath,TEXTRACT_PATH_S3_PREFIX)
    # comprehend medical entities API will be called only if the flag is set to true during deployment
    isComprehendMedicalEnabled = True if os.environ['ENABLE_COMPREHEND_MEDICAL']=="true" else False
    comprehendAndMedicalEntities = comprehendClient.processComprehend(outputBucketName, responseDocumentName, comprehendOutputPath, isComprehendMedicalEnabled, maxPages)

    # if Kendra is available then let it index the document
    if 'KENDRA_INDEX_ID' in os.environ:
        kendraClient = KendraHelper()
        fileName = os.path.basename(objectName).split(".")[0]
        fileExtension = os.path.basename(objectName).split(".")[1]
        outputDocumentName = "{}{}-searchable.pdf".format(outputPath, fileName)
        kendraClient.indexDocument(os.environ['KENDRA_INDEX_ID'],
                                   os.environ['KENDRA_ROLE_ARN'],
                                   bucketName,
                                   outputDocumentName,
                                   documentId,
                                   fileExtension)

    print("DocumentId: {}".format(documentId))
    print("Processed Comprehend data: {}".format(comprehendAndMedicalEntities))

    # index document once the comprehend entities and KVPairs have been extracted
    if 'ES_DOMAIN' in os.environ :
        for key, val in opg_output[KVPAIRS].items():
            if key not in comprehendAndMedicalEntities:
                comprehendAndMedicalEntities[key] = val
            else:
                comprehendAndMedicalEntities[key].append(val)
        opg.indexDocument(opg_output[DOCTEXT], comprehendAndMedicalEntities)

    ds = datastore.DocumentStore(documentsTable, outputTable)
    ds.markDocumentComplete(documentId)

    output = "Processed -> Document: {}, Object: {}/{} processed.".format(documentId, bucketName, objectName)

   
    return {
        'statusCode': 200,
        'body': output
    }

def lambda_handler(event, context):

    print("event: {}".format(event))

    body = json.loads(event['Records'][0]['body'])
    message = json.loads(body['Message'])

    print("Message: {}".format(message))

    request = {}

    request["jobId"] = message['JobId']
    request["jobTag"] = message['JobTag']
    request["jobStatus"] = message['Status']
    request["jobAPI"] = message['API']
    request["bucketName"] = message['DocumentLocation']['S3Bucket']
    request["objectName"] = message['DocumentLocation']['S3ObjectName']
    request["outputBucketName"] = os.environ['OUTPUT_BUCKET']
    request["elasticsearchDomain"] = os.environ.get('ES_DOMAIN',None)
    request["outputTable"] = os.environ['OUTPUT_TABLE']
    request["documentsTable"] = os.environ['DOCUMENTS_TABLE']

    return processRequest(request)

def lambda_handler_local(event, context):
    print("Event: {}".format(event))
    return processRequest(event)
