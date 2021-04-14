
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
from botocore.exceptions import ClientError
from botocore.config import Config
import json
import threading
from helper import S3Helper
import time


# current service limit of Comprehend per page
MAX_COMPREHEND_UTF8_PAGE_SIZE = 5000

# Comprehend batch API call has a limit of 25
PAGES_PER_BATCH = 15

# maximum retries for comprehend and comprehend medical API call
MAX_API_RETRIES = 6

class ComprehendHelper:

    def getNumOfPages(self,
                      textract):
        return textract[0]['DocumentMetadata']['Pages']

    #
    # this function iterates and extracts all textual elements, aka blocks, that were
    # identified by Textract in each page.  The result is organized as a list of strings,
    # each containing the concatenated text of a given page.
    #
    def extractTextByPages(self,
                           textract,
                           rawPages,
                           numOfPages):

        # the textract results json file in S3 has a peculiar structure of
        # top-level list of block lists, each appear to have a size limit of 1000.
        # A new one is creatd and appended when the previous blocklist reaches that limit.
        # Not sure why it is so. A blocklist may contain blocks from different document pages.
        for blocklist in textract:

            for block in blocklist['Blocks']:

                # PAGE block type have no text, so skip those
                if block['BlockType'] == 'LINE':

                    # page numbers start at 1 in Textract for png, however
                    # for png there are no page reference since it is a single
                    # page, in this case all blocks have page 1
                    if numOfPages == 1:
                        pageNumber = 1
                    else:
                        pageNumber = block['Page']

                    # skip pages above limit
                    if pageNumber > numOfPages:
                        continue

                    # but our storage of page results list start at index 0
                    pageResultIndex = pageNumber - 1

                    # some block may not contain text
                    if 'Text' in block:

                        # calculate the size of this page if we add this text element + the ". " separator.
                        # Comprehend has a UTF8 size limit, so we dismiss excessive elements once size is
                        # reached.
                        projectedSize = len(
                            rawPages[pageResultIndex]) + len(block['Text']) + 2

                        # add if page size allows
                        if MAX_COMPREHEND_UTF8_PAGE_SIZE > projectedSize:
                            # add a separator from previous text block
                            rawPages[pageResultIndex] += ". "
                            # text block
                            rawPages[pageResultIndex] += block['Text']

        return numOfPages

    #
    # thread execution calling Comprehend synchronously by batch of up to
    # 25 pages
    #
    
    def batchComprehendDetectEntitiesSync(self,
                                          rawPages,
                                          pagesToProcess,
                                          pageStartIndex,
                                          comprehendEntities):

        config = Config(
                        retries = {
                        'max_attempts': MAX_API_RETRIES,
                        'mode': 'standard'
                        }
        )
                        
        client = boto3.client('comprehend', config=config)
        
        textPages = []
        endIndex = pageStartIndex + pagesToProcess

        for i in range(pageStartIndex, endIndex):
            textPages.append(rawPages[i])

        # service limit is around 10tps, sdk implements 3 retries with backoff
        # if that's not enough then fail
        response = client.batch_detect_entities(
            TextList=textPages,
            LanguageCode="en")

        # store results
        for i in range(0, pagesToProcess):
            comprehendEntities[pageStartIndex +
                               i] = response['ResultList'][i]
    
    #
    # thread execution calling ComprehendMedical Entities synchronously for each page
    #
    
    def comprehendMedicalDetectEntitiesSync(self,
                                            rawPages,
                                            index,
                                            comprehendMedicalEntities,
                                            mutex):
        config = Config(
                        retries = {
                        'max_attempts': MAX_API_RETRIES,
                        'mode': 'standard'
                        }
        )
                        
        client = boto3.client('comprehendmedical', config=config)
    
        # service limit is 10tps, sdk implements 3 retries with backoff
        # if that's not enough then fail
        response = client.detect_entities_v2(Text=rawPages[index])

        # save results for later processing
        if 'Entities' not in response:
            return

        mutex.acquire()
        comprehendMedicalEntities[index] = response['Entities']
        mutex.release()

    
    #
    # thread execution calling ComprehendMedical ICD10 synchronously for each page
    #
    
    def comprehendMedicalDetectICD10Sync(self,
                                         rawPages,
                                         index,
                                         comprehendMedicalICD10,
                                         mutex):

        config = Config(
                        retries = {
                        'max_attempts': MAX_API_RETRIES,
                        'mode': 'standard'
                        }
        )

        client = boto3.client('comprehendmedical', config=config)
            
        # service limit is 10tps, sdk implements 3 retries with backoff
        # if that's not enough then fail
        response = client.infer_icd10_cm(Text=rawPages[index])
        
        # save results for later processing
        if 'Entities' not in response:
            return

        mutex.acquire()
        comprehendMedicalICD10[index] = response['Entities']
        mutex.release()


    #
    # processes all Comprehend results for all pages
    #
    def processAndReturnComprehendEntities(self,
                                  comprehendEntities,
                                  numOfPages,
                                  bucket,
                                  comprehendOutputPath):

        data = {}
        data['results'] = []
        entities_to_index = {}

        # process comprehend entities for each page
        for p in range(0, numOfPages):
            page = {}
            # page number start at 1 but list of page data starts at 0
            page['Page'] = p + 1
            page['Entities'] = []

            # to detect and skip duplicates
            entities = set()

            for e in comprehendEntities[p]['Entities']:

                # add this entity if not already present
                if e['Text'].upper() not in entities:
                    # add entity to results list
                    entity = {}
                    entity['Text'] = e['Text']
                    entity['Type'] = e['Type']
                    entity['Score'] = e['Score']
                    page['Entities'].append(entity)

                    if e['Type'] not in entities_to_index:
                        entities_to_index[e['Type']] = []
                    entities_to_index[e['Type']].append(e['Text'])

                    # make a note of this added entity
                    entities.add(e['Text'].upper())

            data['results'].append(page)

        # create results file in S3 under document folder
        S3Helper.writeToS3(json.dumps(data), bucket,
                           comprehendOutputPath + "comprehendEntities.json")
        return entities_to_index

    #
    # processes all ComprehendMedical results for all pages
    #
    def processAndReturnComprehendMedicalEntities(self,
                                         comprehendMedicalEntities,
                                         numOfPages,
                                         bucket,
                                         comprehendOutputPath):

        data = {}
        data['results'] = []
        medical_entities_to_index = {}
        
        for p in range(0, numOfPages):
            page = {}
            # page numbers start at 1
            page['Page'] = p + 1
            page['Entities'] = []

            # to detect and skip duplicates
            entities = set()

            for e in comprehendMedicalEntities[p]:

                # add this entity if not already present
                if e['Text'].upper() not in entities:
                    # add entity to results list
                    entity = {}
                    entity['Text'] = e['Text']
                    entity['Category'] = e['Category']

                    if 'Score' in e:
                        entity['Score'] = e['Score']

                    page['Entities'].append(entity)
                    
                    if e['Category'] not in medical_entities_to_index:
                        medical_entities_to_index[e['Category']] = []
                    medical_entities_to_index[e['Category']].append(e['Text'])

                    # make a note of this added entity
                    entities.add(e['Text'].upper())

            data['results'].append(page)

        # create results file in S3 under document folder
        S3Helper.writeToS3(json.dumps(data), bucket, comprehendOutputPath + "comprehendMedicalEntities.json")
        return medical_entities_to_index

    #
    # processes all ComprehendMedical results for all pages
    #

    def processComprehendMedicalICD10(self,
                                      comprehendMedicalICD10,
                                      numOfPages,
                                      bucket,
                                      comprehendOutputPath):

        data = {}
        data['results'] = []

        for p in range(0, numOfPages):
            page = {}
            # page numbers start at 1
            page['Page'] = p + 1
            page['Entities'] = []

            # to detect and skip duplicates
            entities = set()

            for e in comprehendMedicalICD10[p]:

                # add this entity if not already present
                if e['Text'].upper() not in entities:
                    # add entity to results list
                    entity = {}
                    entity['Text'] = e['Text']
                    entity['Category'] = e['Category']
                    entity['Type'] = e['Type']

                    entity['ICD10CMConcepts'] = []

                    if 'ICD10CMConcepts' in e:

                        for c in e['ICD10CMConcepts']:
                            concept = {}
                            concept['Description'] = c['Description']
                            concept['Code'] = c['Code']
                            concept['Score'] = c['Score']
                            entity['ICD10CMConcepts'].append(concept)

                    page['Entities'].append(entity)
                    entities.add(e['Text'].upper())

                    # make a note of this added entity
                    entities.add(e['Text'].upper())

            data['results'].append(page)

        # create results file in S3 under document folder
        S3Helper.writeToS3(json.dumps(data), bucket,
                           comprehendOutputPath + "comprehendMedicalICD10.json")

    #
    #  Call this function from the sync processor or the job result processor to
    #  feed Textract results to Comprehend and ComprehendMedical.  This function will
    #  create comprehenEntities.json, comprehendMedicalntities.json and comprehendMedicalICD10.json
    #  in S3 in the document folder
    #
    #   bucket:                     bucket name i.e. "v081textractdemo-document-s3-bucket-v4glarbidueb1lggzu2k3f"
    #   textractResultsFilename:    currently this is "response.json" in the document folder
    #   documentPath:               path of the document i.e. "public/1581983617022/premera.pdf/bb2186ec-51e0-11ea-a3c3-2e0ec40645f6/"
    #   maxPages:                   max number of pages to process for the document, counted from page 1. Suggested to limit
    #                               that number to 200 pages or so.
    #   isComprehendEnabled:        flag that indicates whether or not to extract comprehend medical entities in the document. The flag value
    #                               can be set during deployment.
    #

    def processComprehend(self,
                          bucket,
                          textractResponseLocation,
                          comprehendOutputPath,
                          isComprehendMedicalEnabled,
                          maxPages=200):


        # get textract results from S3
        textractFile = S3Helper.readFromS3(
            bucket, textractResponseLocation)
        textract = json.loads(textractFile)

        # total number of textracted pages
        numOfPages = self.getNumOfPages(textract)

        # error
        if numOfPages <= 0:
            return False

        # enforce a maximum of pages to be processed
        if numOfPages > maxPages:
            numOfPages = maxPages

        # iterate over results page by page and extract raw text for comprehend
        # initialize rawPages with atleast a 1 character string helps prevent errors produced by comprehend and comprehend medical
        # comprehend and comprehend medical need text with atleast 1 character and infer_icd10_cm() needs a non empty string
        rawPages = ["."] * numOfPages
        if self.extractTextByPages(textract, rawPages, numOfPages) == False:
            return False

        # process pages by batches of 25 max, determine how many batches we need
        numOfBatches = int(numOfPages / PAGES_PER_BATCH)
        if numOfPages % PAGES_PER_BATCH != 0:
            numOfBatches += 1

        # to store comprehend and medical API calls results.
        comprehendEntities = [None] * numOfPages
        comprehendMedicalEntities = [None] * numOfPages
        comprehendMedicalICD10 = [None] * numOfPages

        pagesProcessed = 0

        # process pages by batch
        for batch in range(0, numOfBatches):

            pageStartIndex = batch * PAGES_PER_BATCH
            pagesToProcess = numOfPages - pagesProcessed

            if pagesToProcess > PAGES_PER_BATCH:
                pagesToProcess = PAGES_PER_BATCH

            # keep track of all threads we spawn
            threads = list()

            # Comprehend call that can batch up to 25 pages together synchronously
            x = threading.Thread(target=self.batchComprehendDetectEntitiesSync,
                                 args=(rawPages, pagesToProcess, pageStartIndex, comprehendEntities))
            x.start()
            threads.append(x)

            if(isComprehendMedicalEnabled):
                # comprehendMedicalEntities is shared among threads
                medicalEntitiesMutex = threading.Lock()

                # ComprehendMedical
                for index in range(0, pagesToProcess):

                    # Comprehend Medical can only handle one page at a time synchronously. The SDK handles
                    # throttling by the service.
                    x = threading.Thread(target=self.comprehendMedicalDetectEntitiesSync,
                                        args=(rawPages,
                                            pageStartIndex + index,
                                            comprehendMedicalEntities,
                                            medicalEntitiesMutex))
                    x.start()
                    threads.append(x)

                # comprehendMedicalEntities is shared among threads
                medicalICD10Mutex = threading.Lock()

                # ComprehendMedical
                for index in range(0, pagesToProcess):

                    # Comprehend Medical can only handle one page at a time synchronously. The SDK handles
                    # throttling by the service.
                    x = threading.Thread(target=self.comprehendMedicalDetectICD10Sync,
                                        args=(rawPages,
                                            pageStartIndex + index,
                                            comprehendMedicalICD10,
                                            medicalICD10Mutex))
                    x.start()
                    threads.append(x)

            # wait on all threads to finish their work
            for index, thread in enumerate(threads):
                thread.join()

            print("All threads joined...")

            # check success of threads
            if(isComprehendMedicalEnabled):
                for i in range(pageStartIndex, pagesToProcess):
                    if (comprehendEntities[pageStartIndex + i] == None) or (comprehendMedicalEntities[pageStartIndex + i] == None):
                        print("Page failed to process" + str(i))
                        return False
            else:
                for i in range(pageStartIndex, pagesToProcess):
                    if (comprehendEntities[pageStartIndex + i] == None):
                        print("Page failed to process" + str(i))
                        return False

            # increment the number of pages processed for the next batch
            pagesProcessed += pagesToProcess

        # process comprehend data, create the entities result file in S3
        processedComprehendData = self.processAndReturnComprehendEntities(comprehendEntities,
                                       numOfPages,
                                       bucket,
                                       comprehendOutputPath)

        if(isComprehendMedicalEnabled):
            # process comprehend medical data, create the entities result file in S3
            comprehendMedicalEntities = self.processAndReturnComprehendMedicalEntities(comprehendMedicalEntities,
                                                numOfPages,
                                                bucket,
                                                comprehendOutputPath)
            # final list of comprehend and comprehend medical entities to be indexed
            processedComprehendData.update(comprehendMedicalEntities)

            # process comprehend medical data, create the ICD10 result file in S3
            self.processComprehendMedicalICD10(comprehendMedicalICD10,
                                            numOfPages,
                                            bucket,
                                            comprehendOutputPath)

        return processedComprehendData
