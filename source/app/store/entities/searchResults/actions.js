
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

import { createAction } from "redux-actions";
import { normalize } from "normalizr";
import { API, Auth } from "aws-amplify";

import { ENABLE_ELASTICSEARCH, ENABLE_KENDRA } from '../../../constants/configs'
import { SEARCH, CLEAR_SEARCH_RESULTS, SUBMIT_FEEDBACK } from "../../../constants/action-types";
import { searchResultsSchema, kendraResultsSchema,kendraFilteredResultsSchema } from "./data";

/**
 * Get documents from TextractDemoTextractAPI
 */
export const search = createAction(SEARCH, async params => {
  const headers = {
    Authorization: `Bearer ${(await Auth.currentSession())
      .getIdToken()
      .getJwtToken()}`
  }

  const [ esResponse, kendraResponse, kendraFilteredResponse ] = await Promise.all([
    ENABLE_ELASTICSEARCH ? API.get("TextractDemoTextractAPI", "search", {
      headers,
      response: true,
      queryStringParameters: { ...params }
    }) : null,

    ENABLE_KENDRA ? API.post("TextractDemoTextractAPI", "searchkendra", {
      headers,
      response: true,
      queryStringParameters: {},
      body: {
        query: params.k,
        pageNumber: 1,
        pageSize: 10
      }
    }) : null,

    ENABLE_KENDRA && params.persona ? API.post("TextractDemoTextractAPI", "searchkendra", {
      headers,
      response: true,
      queryStringParameters: {},
      body: {
        query: params.k,
        tag: params.persona,
        pageNumber: 1,
        pageSize: 10
      }
    }) : null
  ]);

  let esResults = {}
  let searchTotalMatches = 0
  let searchTotalDocuments = 0
    
  if (ENABLE_ELASTICSEARCH){
    const data =  Array.isArray(esResponse.data) ? esResponse.data : [] ;
    
    esResults =  data.map(result => {
      searchTotalMatches += result.count;
      if (result.count) searchTotalDocuments++;
      return {
        ...result,
        name: result.name.replace(/^.*\//, "")
      };
    })
  }

  const kendraQueryId = ENABLE_KENDRA ? kendraResponse.data.QueryId : null;
  const kendraTotalResults = ENABLE_KENDRA ? kendraResponse.data.TotalNumberOfResults : null;
  const kendraFilteredQueryId = ENABLE_KENDRA && params.persona ? kendraFilteredResponse.data.QueryId : null;
  const kendraTotalFilteredResults = ENABLE_KENDRA && params.persona ? kendraFilteredResponse.data.TotalNumberOfResults : null;
  const kendraData = ENABLE_KENDRA ? normalize(kendraResponse.data.ResultItems, kendraResultsSchema).entities : {}
  const kendraFilteredData = ENABLE_KENDRA && params.persona ? normalize(kendraFilteredResponse.data.ResultItems, kendraFilteredResultsSchema).entities : {}

  return {
    ...(normalize(esResults, searchResultsSchema).entities),
    ...kendraData,
    ...kendraFilteredData,
    meta: {
      searchTotalMatches,
      searchTotalDocuments,
      kendraQueryId,
      kendraFilteredQueryId,
      kendraTotalResults,
      kendraTotalFilteredResults
    }
  };
});

export const submitKendraFeedback = createAction(SUBMIT_FEEDBACK, async ({ relevance, queryId, resultId }) => {
  const response = await API.post("TextractDemoTextractAPI", "feedbackkendra", {
    headers: {
      Authorization: `Bearer ${(await Auth.currentSession())
        .getIdToken()
        .getJwtToken()}`
    },
    response: true,
    body: {
      relevance,
      queryId,
      resultId
    }
  });
})

/**
 * Clear search results
 */
export const clearSearchResults = createAction(CLEAR_SEARCH_RESULTS, () => ({
  searchResults: [],
  kendraResults: [],
  kendraFilteredResults: undefined,
  meta: {
    searchTotalMatches: 0,
    searchTotalDocuments: 0,
    kendraQueryId: null
  }
}));
