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

import React, { useMemo, useCallback } from "react";
import { useDispatch } from "react-redux";
import PropTypes from "prop-types";

import KendraTopResults from "../../components/KendraTopResults/KendraTopResults";
import KendraDocumentResults from "../../components/KendraDocumentResults/KendraDocumentResults";

import { submitKendraFeedback } from "../../store/entities/searchResults/actions";

import styles from "./KendraResultPage.module.scss";
import KendraFAQs from "../KendraFAQs/KendraFAQs";
import PersonaLabel from "../PersonaLabel/PersonaLabel";

KendraResultPage.propTypes = {
  className: PropTypes.string,
  results: PropTypes.array,
  searchQuery: PropTypes.string,
  searchStatus: PropTypes.string,
  resultCount: PropTypes.number,
};

KendraResultPage.defaultProps = {
  results: [],
};

export default function KendraResultPage({
  title,
  results,
  queryId,
  resultCount,
  persona,
}) {
  const dispatch = useDispatch();

  const topResults = useMemo(
    () => results.filter((res) => res.Type === "ANSWER"),
    [results]
  );
  const faqResults = useMemo(
    () => results.filter((res) => res.Type === "QUESTION_ANSWER"),
    [results]
  );
  const docResults = useMemo(
    () => results.filter((res) => res.Type === "DOCUMENT"),
    [results]
  );

  const submitFeedback = useCallback(
    (feedback, item) => {
      dispatch(
        submitKendraFeedback({
          relevance: feedback,
          queryId: queryId,
          resultId: item.Id,
        })
      );
    },
    [dispatch, queryId]
  );

  return (
    <div className={styles.resultList}>
      {title && <h3>{title}</h3>}
      <div className={styles.searchSummary}>
        1&ndash;{results.length} of {resultCount} Results
        {persona ? (
          <>
            {" "}
            for{" "}
            <PersonaLabel persona={persona} />
          </>
        ) : null}
      </div>
      <KendraTopResults results={topResults} submitFeedback={submitFeedback} />
      <KendraFAQs results={faqResults} submitFeedback={submitFeedback} />
      <KendraDocumentResults
        results={docResults}
        submitFeedback={submitFeedback}
      />
    </div>
  );
}
