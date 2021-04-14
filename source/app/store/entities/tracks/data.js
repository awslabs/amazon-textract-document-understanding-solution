
/**********************************************************************************************************************
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the License). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

import { schema } from 'normalizr'
import { lensPath } from 'ramda'
import { MIN_SEARCH_QUERY_LENGTH, ENABLE_KENDRA, ENABLE_COMPREHEND_MEDICAL, ENABLE_ELASTICSEARCH } from '../../../constants/configs'

// Track Schemas
export const trackSchema = new schema.Entity('tracks')
export const tracksSchema = new schema.Array(trackSchema)

// Track Lenses
export const lensTracks = lensPath(['entities', 'tracks'])
export const lensTrack = id => lensPath(['entities', 'tracks', id])

const discoveryTrackDescription = `In this track, you can search through multiple documents and find information faster
and more efficiently, using `+ 
(ENABLE_ELASTICSEARCH? `Amazon Elasticsearch ` : ``) +
(ENABLE_ELASTICSEARCH && ENABLE_KENDRA? `as well as using ` : ``) +
(ENABLE_KENDRA? `state-of-the-art machine learning and natural language enterprise search with Amazon Kendra.`: ``) +
`\n Once you select a document, you'll be able to interact with Amazon Textract ` + 
(ENABLE_COMPREHEND_MEDICAL? `, Amazon Comprehend and Amazon Comprehend Medical ` :`and Amazon Comprehend `) +
`to experience the power of document digitization and extraction of important information. ` +
(ENABLE_KENDRA?`
\n For demo purposes, the solution is pre-loaded with data related to certain medical conditions such as Diabetes and Kidney Disease. Ask a question related to these topics or use the suggested queries in the search bar and explore the different search capabilities.`:
``)

const complianceTrackDescription = `
In the compliance track, you can redact information from documents. You have the
capability to redact specific key-value pairs detected by Amazon Textract`+
(ENABLE_COMPREHEND_MEDICAL? `, entities detected by Amazon Comprehend and medical entities 
detected by Comprehend Medical.`: `and entities dected by Amazon Comprehend.`)+ 
` You also have the flexibility to redact specific word matches under the
Preview Tab.

These controls help you redact Protected Health Information (PHI) and other
sensitive information that may be critical to your use case. You also have the option
to download the redacted document before you would want to share it.
`
// Initial Data
export default {
  search: {
    id: 'search',
    title: 'Discovery',
    subtitle: 'Search across many documents, or within a single document',
    longDescription: discoveryTrackDescription,
    icon: '/images/icon_cloud-search.svg',
    palette: 'blue',
  },
  redaction: {
    id: 'redaction',
    title: 'Compliance',
    subtitle: 'Redact information from a document',
    longDescription: complianceTrackDescription,
    icon: '/images/icon_redact.svg',
    palette: 'teal',
  },
  workflow: {
    id: 'workflow',
    title: 'Workflow automation',
    subtitle: 'Edit and transfer data to other tools',
    longDescription: `
      This track focusses on how data from different AWS services in DUS can be
      consumed. The data extracted from DUS is available in the backend storage
      (Amazon S3) and then it can be consumed by your downstream dependencies.
    `,
    icon: '/images/icon_workflow.svg',
    palette: 'purple',
  },
}
