import boto3
from botocore.exceptions import ClientError
import json
import os
from helper import S3Helper


class KendraHelper:
    

    #
    #   This function instruct Kendra to index a pdf document in s3
    #
    #   region:                 region of Kendra index
    #   kendraIndexId:          Kendra index id
    #   kendraRoleArn:          a role that Kendra can assume to read the s3 bucket
    #   s3bucket:               bucket name where document to index exists
    #   s3key:                  key of the document to index
    #   documentId:             the document id generated by DUS
    #
    def indexDocument(self,
                      region,
                      kendraIndexId,
                      kendraRoleArn,
                      s3bucket,
                      s3key,
                      documentId):
        
        
        kendraclient = client = boto3.client('kendra', region_name=region)
        
        response = client.batch_put_document(IndexId=kendraIndexId,
                                             RoleArn=kendraRoleArn,
                                             Documents=[
                                                {
                                                'Id': documentId,
                                                'S3Path': {
                                                    'Bucket': s3bucket,
                                                    'Key': s3key
                                                        },
                                                'AccessControlList': [
                                                          {
                                                          'Name': 'everybody',
                                                          'Type': 'GROUP',
                                                          'Access': 'ALLOW'
                                                          }
                                                ],
                                                'ContentType': 'PDF'}])
        
        return

    #
    #   This function instruct Kendra to remove a pdf document from its index
    #
    #   region:                 region of Kendra index
    #   kendraIndexId:          Kendra index id
    #   documentId:             the document id generated by DUS
    #
    def deindexDocument(self,
                        region,
                        kendraIndexId,
                        documentId):
        
        kendraclient = client = boto3.client('kendra', region_name=region)

        response = client.batch_delete_document(IndexId=kendraIndexId,
                                                DocumentIdList=[documentId])
                                                
        return

    #
    #   This function seaches Kendra using a natural language query string and a
    #   user membership tag (healthprovider, scientist, generalpublic)
    #
    #   region:                 region of Kendra index
    #   kendraIndexId:          Kendra index id
    #   requestBody:            POST body of json search, see example below.
    #
    #   { "query":"my keywords",
    #     "tag":"scientist",
    #     "pageNumber":1,       pagination is done by providing the page number needed in each request
    #     "pageSize":100        each page may have a maximum of 100 results
    #   }
    #
    def search(self,
               region,
               kendraIndexId,
               requestBody):

        search = json.loads(requestBody)

        client = client = boto3.client('kendra', region_name=region)

        if 'tag' in search and search['tag'] != None:
            response = client.query(
                QueryText=search['query'],
                IndexId=kendraIndexId,
                AttributeFilter={
                    "OrAllFilters": [
                        {
                            "EqualsTo": {
                            "Key": "_group_ids",
                            "Value": {
                                "StringListValue": [search['tag']]
                                }
                            }
                        }
                    ]
                },
                PageNumber=search['pageNumber'],
                PageSize=search['pageSize']
            )

        else:
            response = client.query(
                QueryText=search['query'],
                IndexId=kendraIndexId,
                PageNumber=search['pageNumber'],
                PageSize=search['pageSize']
            )

        return response

    #
    #   This function tells Kendra that a specific search result from a previous
    #   results set is relevant or not. Kendra will use this hint in subsequent
    #   searches.
    #
    #   region:                 region of Kendra index
    #   kendraIndexId:          Kendra index id
    #   requestBody:            POST json body of feedback,  see example below
    #
    #   {  "queryId":"4c97e09a-5a97-4d3a-beb6-9362fb90fa16",
    #      "resultId":"4c97e09a-5a97-4d3a-beb6-9362fb90fa16-df5306d5-085d-4c51-8eaf-4add4848643b",
    #      "relevance":true
    #   }
    #
    def feedback(self,
                       region,
                       kendraIndexId,
                       requestBody):
        
        feedback = json.loads(requestBody)
        
        client = client = boto3.client('kendra', region_name=region)

        relevance = 'RELEVANT'
        
        if feedback['relevance'] == False:
            relevance = 'NOT_RELEVANT'
        
        response = client.submit_feedback(IndexId=kendraIndexId,
                                          QueryId=feedback['queryId'],
                                          RelevanceFeedbackItems=[
                                              {
                                                  'ResultId': feedback['resultId'],
                                                  'RelevanceValue': relevance
                                              }
                                          ])
        
        # best effort, nothing to return
        return
