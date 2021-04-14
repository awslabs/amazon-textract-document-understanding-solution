
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

import { handleActions } from 'redux-actions'
import { view, set, lensPath, mergeDeepRight } from 'ramda'

import {
  FETCH_DOCUMENTS,
  FETCH_DOCUMENT,
  REDACT_DOCUMENT,
  CLEAR_REDACTION,
  SEARCH,
  CLEAR_SEARCH_RESULTS,
  SET_CURRENT_PAGE_NUMBER,
  SET_DOCUMENTS_NEXT_TOKEN,
  SET_SEARCH_QUERY,
  SET_DOCUMENT_SEARCH_QUERY,
  SET_SEARCH_STATUS,
  CLEAR_SEARCH_QUERY,
  CLEAR_DOCUMENT_SEARCH_QUERY,
  HIGHLIGHT_DOCUMENT,
  SET_SEARCH_PERSONA,
  FETCH_GLOBALS,
  SAVE_REDACTIONS_STARTED,
  REDACTIONS_SAVED
} from '../../constants/action-types'

import documents from './documents/data'
import tracks from './tracks/data'
import meta from './meta/data'
import sampleDocuments from './sampleDocuments/data'
import exclusionLists from './exclusionLists/data'
import redactionLabels from './redactionLabels/data'

export function receiveEntities(state, { payload }) {
  return payload ? mergeDeepRight(state, payload) : state
}

export default handleActions(
  {
    [FETCH_DOCUMENT]: receiveEntities,
    [FETCH_DOCUMENTS]: receiveEntities,
    [REDACT_DOCUMENT]: (state, action) => ({
      ...receiveEntities(state, action),
      areUnsavedRedactions: true,
    }),
    [CLEAR_REDACTION]: (state, { payload: { documentId, pageNumber, redactions } }) => ({
      ...state,
      documents: set(lensPath([documentId, 'redactions', pageNumber]), redactions, state.documents),
      areUnsavedRedactions: true,
    }),
    [HIGHLIGHT_DOCUMENT]: receiveEntities,
    [SEARCH]: receiveEntities,
    [CLEAR_SEARCH_RESULTS]: receiveEntities,
    [SET_CURRENT_PAGE_NUMBER]: receiveEntities,
    [SET_DOCUMENTS_NEXT_TOKEN]: receiveEntities,
    [SET_SEARCH_QUERY]: receiveEntities,
    [SET_DOCUMENT_SEARCH_QUERY]: receiveEntities,
    [SET_SEARCH_STATUS]: receiveEntities,
    [SET_SEARCH_PERSONA]: receiveEntities,
    [CLEAR_SEARCH_QUERY]: receiveEntities,
    [CLEAR_DOCUMENT_SEARCH_QUERY]: receiveEntities,
    [FETCH_GLOBALS]: (state, { payload: { exclusionLists, redactionLabels } }) => ({
      ...state,
      exclusionLists,
      redactionLabels,
    }),
    [SAVE_REDACTIONS_STARTED]: (state) => ({ ...state, isSavingRedactions: true }),
    [REDACTIONS_SAVED]: (state) => ({ ...state, isSavingRedactions: false, areUnsavedRedactions: false, })
  },

  // Initial Data
  { documents, tracks, meta, sampleDocuments, exclusionLists, redactionLabels, isSavingRedactions: false, areUnsavedRedactions: false, }
)
