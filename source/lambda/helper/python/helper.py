
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
from botocore.client import Config
import os
import csv
import io
from boto3.dynamodb.conditions import Key


class DynamoDBHelper:

    @staticmethod
    def getItems(tableName, key, value):
        items = None

        ddb = AwsHelper().getResource("dynamodb")
        table = ddb.Table(tableName)

        if key is not None and value is not None:
            filter = Key(key).eq(value)
            queryResult = table.query(KeyConditionExpression=filter)
            if(queryResult and "Items" in queryResult):
                items = queryResult["Items"]

        return items

    @staticmethod
    def insertItem(tableName, itemData):

        ddb = AwsHelper().getResource("dynamodb")
        table = ddb.Table(tableName)

        ddbResponse = table.put_item(Item=itemData)

        return ddbResponse

    @staticmethod
    def deleteItems(tableName, key, value, sk):
        items = DynamoDBHelper.getItems(tableName, key, value)
        if(items):
            ddb = AwsHelper().getResource("dynamodb")
            table = ddb.Table(tableName)
            for item in items:
                print("Deleting Items")
                table.delete_item(
                    Key={
                        key: value,
                        sk: item[sk]
                    })
                print("Deleted items")


class AwsHelper:
    def getClient(self, name, awsRegion=None):
        config = Config(
            retries=dict(
                max_attempts=30
            )
        )
        if(awsRegion):
            return boto3.client(name, region_name=awsRegion, config=config)
        else:
            return boto3.client(name, config=config)

    def getResource(self, name, awsRegion=None):
        config = Config(
            retries=dict(
                max_attempts=30
            )
        )

        if(awsRegion):
            return boto3.resource(name, region_name=awsRegion, config=config)
        else:
            return boto3.resource(name, config=config)


class S3Helper:
    @staticmethod
    def getS3BucketRegion(bucketName):
        client = boto3.client('s3')
        response = client.get_bucket_location(Bucket=bucketName)
        awsRegion = response['LocationConstraint']
        return awsRegion

    @staticmethod
    def getFileNames(bucketName, prefix, maxPages, allowedFileTypes, awsRegion=None):

        files = []

        currentPage = 1
        hasMoreContent = True
        continuationToken = None

        s3client = AwsHelper().getClient('s3', awsRegion)

        while(hasMoreContent and currentPage <= maxPages):
            if(continuationToken):
                listObjectsResponse = s3client.list_objects_v2(
                    Bucket=bucketName,
                    Prefix=prefix,
                    ContinuationToken=continuationToken)
            else:
                listObjectsResponse = s3client.list_objects_v2(
                    Bucket=bucketName,
                    Prefix=prefix)

            if(listObjectsResponse['IsTruncated']):
                continuationToken = listObjectsResponse['NextContinuationToken']
            else:
                hasMoreContent = False

            if 'Contents' in listObjectsResponse:
                for doc in listObjectsResponse['Contents']:
                    docName = doc['Key']
                    docExt = FileHelper.getFileExtension(docName)
                    docExtLower = docExt.lower()
                    if(docExtLower in allowedFileTypes):
                        files.append(docName)

        return files

    @staticmethod
    def writeToS3(content, bucketName, s3FileName, awsRegion=None):
        s3 = AwsHelper().getResource('s3', awsRegion)
        object = s3.Object(bucketName, s3FileName)
        object.put(Body=content)

    @staticmethod
    def readFromS3(bucketName, s3FileName, awsRegion=None):
        s3 = AwsHelper().getResource('s3', awsRegion)
        obj = s3.Object(bucketName, s3FileName)
        return obj.get()['Body'].read().decode('utf-8')

    @staticmethod
    def writeCSV(fieldNames, csvData, bucketName, s3FileName, awsRegion=None):
        csv_file = io.StringIO()
        # with open(fileName, 'w') as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=fieldNames)
        writer.writeheader()

        for item in csvData:
            i = 0
            row = {}
            for value in item:
                row[fieldNames[i]] = value
                i = i + 1
            writer.writerow(row)
        S3Helper.writeToS3(csv_file.getvalue(), bucketName, s3FileName)

    @staticmethod
    def writeCSVRaw(csvData, bucketName, s3FileName):
        csv_file = io.StringIO()
        # with open(fileName, 'w') as csv_file:
        writer = csv.writer(csv_file)
        for item in csvData:
            writer.writerow(item)
        S3Helper.writeToS3(csv_file.getvalue(), bucketName, s3FileName)


class FileHelper:
    @staticmethod
    def getFileNameAndExtension(filePath):
        basename = os.path.basename(filePath)
        dn, dext = os.path.splitext(basename)
        return (dn, dext[1:])

    @staticmethod
    def getFileName(fileName):
        basename = os.path.basename(fileName)
        dn, dext = os.path.splitext(basename)
        return dn

    @staticmethod
    def getFileExtension(fileName):
        basename = os.path.basename(fileName)
        dn, dext = os.path.splitext(basename)
        return dext[1:]

    @staticmethod
    def readFile(fileName):
        with open(fileName, 'r') as document:
            return document.read()

    @staticmethod
    def writeToFile(fileName, content):
        with open(fileName, 'w') as document:
            document.write(content)

    @staticmethod
    def writeToFileWithMode(fileName, content, mode):
        with open(fileName, mode) as document:
            document.write(content)

    @staticmethod
    def getFilesInFolder(path, fileTypes):
        for file in os.listdir(path):
            if os.path.isfile(os.path.join(path, file)):
                ext = FileHelper.getFileExtension(file)
                if(ext.lower() in fileTypes):
                    yield file

    @staticmethod
    def getFileNames(path, allowedLocalFileTypes):
        files = []

        for file in FileHelper.getFilesInFolder(path, allowedLocalFileTypes):
            files.append(path + file)

        return files

    @staticmethod
    def writeCSV(fileName, fieldNames, csvData):
        with open(fileName, 'w') as csv_file:
            writer = csv.DictWriter(csv_file, fieldnames=fieldNames)
            writer.writeheader()

            for item in csvData:
                i = 0
                row = {}
                for value in item:
                    row[fieldNames[i]] = value
                    i = i + 1
                writer.writerow(row)

    @staticmethod
    def writeCSVRaw(fileName, csvData):
        with open(fileName, 'w') as csv_file:
            writer = csv.writer(csv_file)
            for item in csvData:
                writer.writerow(item)
