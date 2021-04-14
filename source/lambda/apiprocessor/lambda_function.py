
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

import os
import json
import boto3
from botocore.exceptions import ClientError
from documents import getDocuments
from document import getDocument, createDocument, deleteDocument
from redact import redact
from search import search, deleteESItem
from kendraHelper import KendraHelper
from redaction import getDocumentRedaction, saveDocumentRedaction, getRedactionGlobal

def redactHeadersFromLambdaEvent(lambdaEvent):
    lambdaEvent.pop('headers', None)
    lambdaEvent.pop('multiValueHeaders', None)
    return lambdaEvent


def validate_create_document_request(request):
    """
    load() throws an exception if the object does not exist in the bucket.
    """
    s3 = boto3.resource('s3')
    try:
        s3.Object(request['bucketName'], request['objectName']).load()
        return True
    except ClientError as ex:
        print(f"Object does not exist in bucket, rejecting: {ex}")
        return False


def validate_get_documents_request(request):
    if 'nexttoken' in request:
        if not (type(request['nexttoken']) == str and request['nexttoken'].isalnum()):
            return False
    return True


def validate_get_document_request(request):
    if 'documentId' in request:
        if type(request['documentId']) != str or False in [chunk.isalnum() for chunk in request['documentId'].split('-')]:
            return False
    return True


def lambda_handler(event, context):

    eventCopy = event

    print("Redacted Event: {}".format(redactHeadersFromLambdaEvent(event)))

    result = {}
    status_code = 200

    documentBucket = os.environ['CONTENT_BUCKET']
    sampleBucket = os.environ['SAMPLE_BUCKET']

    if('resource' in event):
        request = {}
        if 'ES_DOMAIN' in os.environ:
            request["elasticsearchDomain"] = os.environ['ES_DOMAIN']
        request["outputTable"] = os.environ['OUTPUT_TABLE']
        request["documentsTable"] = os.environ['DOCUMENTS_TABLE']

        # search Elasticsearch handler
        if(event['resource'] == '/search' and 'ES_DOMAIN' in os.environ):
            if('queryStringParameters' in event and 'k' in event['queryStringParameters']):
                request["keyword"] = event['queryStringParameters']['k']
                if('documentId' in event['queryStringParameters']):
                    request["documentId"] = event['queryStringParameters']['documentId']
                result = search(request)

        # a specific document redaction items (terms, headers and footers)
        elif(event['resource'] == '/redaction'):
            
             if event['httpMethod'] == 'GET':
                 
                 if 'documentId' in event['queryStringParameters']:
                     result = getDocumentRedaction(event['queryStringParameters']['documentId'],
                                                   documentBucket)
                 else:
                     status_code = 400
                     result = "Bad request, no document id given"

             elif event['httpMethod'] == 'POST':
                status_code, result = saveDocumentRedaction(event['queryStringParameters']['documentId'],
                                               documentBucket,
                                               os.environ['DOCUMENTS_TABLE'],
                                               event['body'])

        # global redaction items (labels and exclusion lists)
        elif(event['resource'] == '/redactionglobal'):

            if event['httpMethod'] == 'GET':
                result = getRedactionGlobal(documentBucket)
                    
        # search Kendra if available
        elif(event['resource'] == '/searchkendra' and event['httpMethod'] == 'POST' and 'KENDRA_INDEX_ID' in os.environ):
            kendraClient = KendraHelper()
            result = kendraClient.search(os.environ['KENDRA_INDEX_ID'], event['body'])

        # Kendra search result feedback for relevance boosting
        elif(event['resource'] == '/feedbackkendra' and event['httpMethod'] == 'POST'):
            if 'KENDRA_INDEX_ID' in os.environ:
                kendraClient = KendraHelper()
                result = kendraClient.submitFeedback(os.environ['KENDRA_INDEX_ID'],
                                                     event['body'])

        elif(event['resource'] == '/documents'):
            if('queryStringParameters' in event and event['queryStringParameters'] and 'nexttoken' in event['queryStringParameters']):
                request["nextToken"] = event['queryStringParameters']['nexttoken']
            if validate_get_documents_request(request):
                result = getDocuments(request)
            else:
                status_code = 400
                result.append(
                    "Bad request, nexttoken is not valid")
        elif(event['resource'] == '/document'):
            if(event['httpMethod'] == 'GET'):
                if('queryStringParameters' in event and event['queryStringParameters']):
                    if('documentid' in event['queryStringParameters']):
                        request["documentId"] = event['queryStringParameters']['documentid']
                        if validate_get_document_request(request):
                            result = getDocument(request)
                        else:
                            status_code = 400
                            result.append(
                                "Bad request, documentId is not valid")
                    elif('bucketname' in event['queryStringParameters'] and 'objectname' in event['queryStringParameters']):
                        request["bucketName"] = event['queryStringParameters']['bucketname']
                        request["objectName"] = event['queryStringParameters']['objectname']
                        if validate_create_document_request(request):
                            result = createDocument(request)
                        else:
                            status_code = 400
                            result.append(
                                "Bad request, object key does not exist in bucket")
            elif(event['httpMethod'] == 'POST'):
                body = json.loads(event['body'])
                if('objects' in body):
                    results = []
                    for obj in body['objects']:
                        request["bucketName"] = sampleBucket if obj['sample'] else documentBucket
                        request["objectName"] = obj['key']
                        successes = failures = 0
                        if validate_create_document_request(request):
                            results.append(createDocument(request))
                            successes += 1
                        else:
                            result.append(
                                f"Object key {request['objectName']} does not exist in bucket")
                            failures += 1
                        status_code = 207 if successes > 0 and failures > 0 else status_code
                        status_code = 400 if successes == 0 and failures > 0 else status_code
                    result = results
                else:
                    request["bucketName"] = sampleBucket if body['sample'] else documentBucket
                    request["objectName"] = body['key']
                    if validate_create_document_request(request):
                        result = createDocument(request)
                    else:
                        status_code = 400
                        result.append(
                            "Bad request, object key does not exist in bucket")

            elif(event['httpMethod'] == 'DELETE'):
                if('documentid' in event['queryStringParameters']):
                    request["documentId"] = event['queryStringParameters']['documentid']
                    result = deleteDocument(request)
                    if 'ES_DOMAIN' in os.environ:
                        deleteESItem(request["elasticsearchDomain"], request["documentId"])
                    # remove it from Kendra's index too if present
                    if 'KENDRA_INDEX_ID' in os.environ:
                        kendraClient = KendraHelper()
                        kendraClient.deindexDocument(os.environ['KENDRA_INDEX_ID'],
                                                     request["documentId"])


    return {
        "isBase64Encoded": False,
        "statusCode": status_code,
        'body': json.dumps(result),
        "headers": {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
        }
    }
