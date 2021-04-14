
######################################################################################################################
#  Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           #
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

from botocore.exceptions import ClientError
import boto3
import json
import os
import re
from helper import S3Helper, DynamoDBHelper
import pdb

# the maximum number of exclusion lists we support, like legal, marketing, etc
MAXIMUM_EXCLUSION_LISTS = 100

# we expect uuid, headers, footers, redactItems
REDACTION_NUM_OF_KEYS = 4

# we expect position, text, backgroundColor, fontColor
HEADER_FOOTER_ITEM_KEYS = 4

# there can be 0 up to 3 headers maximum, same for footers
MAXIMUM_NUM_OF_HEADERS_FOOTERS = 3

# we expect a redacted item to have 6 keys: page, top, left, width, height label
REDACTED_ITEM_KEYS = 6

# get the redacted items of this document
def getDocumentRedaction(documentId, bucket):

    # if redaction doesn't exists in s3, this empty here is returned
    redaction = {}
    redaction['uuid'] = documentId
    redaction['redactedItems'] = []
    redaction['headers'] = []
    redaction['footers'] = []
    
    # the redaction file may or may not exist. If it doesn't its ok, we
    # return a plain redaction object
    try:
        data = S3Helper.readFromS3(bucket, 'public/' + documentId + '/redaction.json')
        redaction = json.loads(data)
    except Exception as e:
        print("getDocumentRedaction exception: " + str(e))
    except:
        print("getDocumentRedaction exception")
    
    return redaction


# a valid document exists as a row in dynamodb
def checkDocumentExists(docId, tableName):
    
    # check entry in dynamodb
    items = DynamoDBHelper.getItems(tableName, 'documentId', docId)

    # if items we returned then the document exists
    if len(items) > 0:
        return True
    
    return False


# headers and footers have the same data definition
def validateHeadersFooters(items, typeStr):

    # to validate that headers (or footers) are not at the same position
    # (left, center, right).
    positions = set()
    
    for item in items:
        
        if len(item.keys()) != HEADER_FOOTER_ITEM_KEYS:
            return (400, "bad request, invalid number of keys for " + typeStr)
        
        if 'position' not in item:
            return (400, "bad request, no position provided for " + typeStr)

        if isinstance(item['position'],str) == False:
            return (400, "bad request, position is not a string")

        if item['position'] != "left" and item['position'] != "center" and item['position'] != "right":
            return (400, "bad request,  position invalid for " + typeStr)

        if item['position'] in positions:
            return (400, "bad request, position already used by another " + typeStr)

        positions.add(item['position'])

        if 'text' not in item:
            return (400, "bad request, no text defined for " + typeStr)

        if isinstance(item['text'],str) == False:
            return (400, "bad request, text is not a string for " + typeStr)

        if 'backgroundColor' not in item:
            return (400, "bad request, no background color defined for " + typeStr)

        if isinstance(item['backgroundColor'],str) == False:
            return (400, "bad request, backgroundColor is not a string for " + typeStr)

        # rgb color validation i.e. #ffffff
        regex = re.compile('^#(([0-9a-fA-F]{2}){3}|([0-9a-fA-F]){3})$')
        match  = regex.match(str(item['backgroundColor']))

        if bool(match) != True:
           return (400, "bad request, invalid background color for " + typeStr)

        if 'fontColor' not in item:
            return (400, "bad request, no font color defined for " + typeStr)

        if isinstance(item['fontColor'],str) == False:
            return (400, "bad request, fontColor is not a string for " + typeStr)

        match  = regex.match(str(item['fontColor']))

        if bool(match) != True:
            return (400, "bad request, invalid  font color for " + typeStr)

    return (200, "ok")
                    
                    
def validateRedactedItem(item):
                    
    if len(item.keys()) != REDACTED_ITEM_KEYS:
        return (400, "bad request, redacted item has invalid number of keys")
            
    # validate page number
    if 'page' not in item:
        return (400, "bad request, redacted item has no page number")

    if isinstance(item['page'], int) == False:
        return (400, "bad request, redacted item has invalid page number type")

    if item['page'] < 1:
        return (400, "bad request, redacted item page number is invalid")
    
    # validate top number
    if 'top' not in item:
        return (400, "bad request, redacted item has no top number")

    if isinstance(item['top'], float) == False:
        return (400, "bad request, redacted item has invalid top number type")

    if item['top'] < 0.0:
        return (400, "bad request, redacted item top number is invalid")

    # validate left number
    if 'left' not in item:
        return (400, "bad request, redacted item has no left number")

    if isinstance(item['left'], float) == False:
        return (400, "bad request, redacted item has invalid left number type")

    if item['left'] < 0.0:
        return (400, "bad request, redacted item left number is invalid")
            
    # validate width number
    if 'width' not in item:
        return (400, "bad request, redacted item has no width number")

    if isinstance(item['width'], float) == False:
        return (400, "bad request, redacted item has invalid width number type")

    if item['width'] < 0.0:
        return (400, "bad request, redacted item width number is invalid")

    # validate height number
    if 'height' not in item:
        return (400, "bad request, redacted item has no height number")

    if isinstance(item['height'], float) == False:
        return (400, "bad request, redacted item has invalid height number type")

    if item['height'] < 0.0:
        return (400, "bad request, redacted item height number is invalid")

   # validate label string
    if 'label' not in item:
        return (400, "bad request, redacted item has no label")

    if isinstance(item['label'], str) == False:
        return (400, "bad request, redacted item label is not a string")

    return (200, "ok")


# retrieve the redacted items of this document
def saveDocumentRedaction(documentId, bucket, table, body):

    statusCode = 400
    result = "bad request"
   
    # save the document redaction, if it parses and validates correctly
    try:
        redaction = json.loads(body)
        
    except Exception as e:
        return (400, "invalid json document")

    # validatw that we have the expected keys
    for x in ["uuid","headers","footers","redactedItems"]:
        if not x in redaction: return (400, "Please only provide uuid, headers, footers and redactedItems")

    # validate that we dont have unexpected key
    if len(redaction.keys()) != len(set(redaction.keys())):
        return (400, "No duplicate keys allowed")

    if isinstance(redaction['uuid'],str) == False:
        return (400, "bad request, document uuid is not a string type")

    # check doc exists in dynamodb
    if not checkDocumentExists(documentId, table): return (404, "document doesn't exist")

    if not isinstance(redaction['headers'],list): return (400, "bad request, redaction headers provided is not a list")

    numOfHeaders = len(redaction['headers'])

    if numOfHeaders > MAXIMUM_NUM_OF_HEADERS_FOOTERS:
        return (400, "bad request, too many headers in list. Maximum number of headers supported is " +
                str(MAXIMUM_NUM_OF_HEADERS_FOOTERS))

    statusCode, result = validateHeadersFooters(redaction['headers'], "header")

    if statusCode != 200:
        return (statusCode, result)

    if isinstance(redaction['footers'],list) == False:
        return (400, "bad request, redaction footers provided is not a list")

    numOfFooters = len(redaction['footers'])

    if numOfFooters > MAXIMUM_NUM_OF_HEADERS_FOOTERS:
        return (400, "bad request, too many footers in list. Maximum number of footers supported is " +
                str(MAXIMUM_NUM_OF_HEADERS_FOOTERS))

    statusCode, result = validateHeadersFooters(redaction['footers'], "footer")

    if statusCode != 200:
        return (statusCode, result)

    if isinstance(redaction['redactedItems'],list) == False:
        return (statusCode, "bad request, redacted items provided is not a list")

    for item in redaction['redactedItems']:
        
        statusCode, result = validateRedactedItem(item)
        
        if statusCode != 200:
            return (statusCode, result)

    S3Helper.writeToS3(json.dumps(redaction),
                       bucket,
                       'public/' + documentId + '/redaction.json')

    return (200, "ok")


# get the redacted items of this document
def getRedactionGlobal(bucket):
    
    redactionGlobal = {}
    redactionGlobal['labels'] = []
    redactionGlobal['exclusion'] = []
    
    #
    # fetch redaction labels
    #
    import pdb
    pdb.set_trace()
    try:
        data = S3Helper.readFromS3(bucket, 'redactionglobal/labels.csv')
        lines = data.splitlines()
    
        # remove csv header with column names
        lines.pop(0)
        
        numOfLabels = len(lines)
        
        if numOfLabels > 0:
            for i in range(0, numOfLabels):
                tokens = lines[i].split(',')
                label = {}
                label['name'] = tokens[0]
                label['display'] = tokens[1]
                label['description'] = tokens[2]
                redactionGlobal['labels'].append(label)

    # the labels.csv file is optional, if it doesn't exist in s3
    # then we simply return an empty set of labels
    except ClientError as  e:
        # this is expected if the user hasn't provided a labels file
        if e.response['Error']['Code'] == 'NoSuchKey':
            print("no optional global redaction labels file exists in s3, an empty set will be provided")
        # another error that terminates this processing
        else:
            print("getRedactionGlobal exception: " + str(e))
            raise e

    #
    # fetch exclusion lists
    #
    allowedFileTypes = set()
    allowedFileTypes.add('csv')

    # this may return an empty list if no exclusion files exist
    filenames = S3Helper.getFileNames(bucket,
                                      'redactionglobal/exclusion/',
                                      MAXIMUM_EXCLUSION_LISTS,
                                      allowedFileTypes)
    numOfFiles = len(filenames)

    # if exclusion lists exist
    if numOfFiles > 0:
        
        # for each exclusion list
        for i in range(0, numOfFiles):
            
            # the list name is the filename (no extension): redactionGlobal/exclusion/legal.csv
            listName = filenames[i].split('/')[2].split('.')[0]
            data = S3Helper.readFromS3(bucket, filenames[i])
            lines = data.splitlines()
            # remove csv header
            lines.pop(0)
            
            items = []
            for line in lines:
                tokens = line.split(',')
                item = {}
                item['type'] = tokens[0]
                item['value'] = tokens[1]
                items.append(item)

            list = {}
            list['name'] = listName
            list['items'] = items
            
            redactionGlobal['exclusion'].append(list)
    
    return redactionGlobal
