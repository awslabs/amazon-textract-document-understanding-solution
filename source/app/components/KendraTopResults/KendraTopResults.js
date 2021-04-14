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

import React, {
  Fragment,
  useMemo,
  useState,
  useCallback,
  useEffect,
} from "react";

import KendraResultTitle from "../KendraResultTitle/KendraResultTitle";
import KendraHighlightedText from "../KendraHighlightedText/KendraHighlightedText";
import KendraResultFooter from "../KendraResultFooter/KendraResultFooter";
import TooltipButton from "../TooltipButton/TooltipButton";

import styles from "./KendraTopResults.module.scss";
import cs from "classnames";

function getTopAnswer(text) {
  if (text && text.Highlights) {
    for (const highlight of text.Highlights) {
      const length = highlight.EndOffset - highlight.BeginOffset;
      if (highlight && highlight.TopAnswer && length < MAX_TOP_ANSWER_LENGTH) {
        return (
          <h1>
            {text.Text.substring(highlight.BeginOffset, highlight.EndOffset)}
          </h1>
        );
      }
    }
  }

  return null;
}

export default function KendraTopResults({ results, submitFeedback }) {
  const renderedResults = useMemo(
    () =>
      results.map((result) => {
        const answer = result.AdditionalAttributes.find(
          (attr) => attr.Key === "AnswerText"
        );

        return (
          <article key={result.id} className={styles.result}>
            <KendraResultTitle
              result={result}
              submitFeedback={submitFeedback}
            />
            {getTopAnswer(answer.TextWithHighlightsValue)}
            <p>
              <KendraHighlightedText
                textWithHighlights={answer.Value.TextWithHighlightsValue}
              />
            </p>
            <KendraResultFooter
              result={result}
              submitFeedback={submitFeedback}
            />
          </article>
        );
      }),
    [results]
  );

  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = useCallback(() => {
    setExpanded((e) => !e);
  }, []);

  if (!results.length) return null;

  return (
    <div className={styles.topResults}>
      <header>
        <h2>
          Amazon Kendra suggested answers
          <TooltipButton
            tooltip={
              <>
                <h4>Amazon Kendra suggested answers</h4>
                <p>
                  When you type a question, Kendra uses machine learning
                  algorithms to understand the context and return the most
                  relevant results, whether that be a precise answer or an
                  entire document. Kendra will map to the relevant documents and
                  return a specific answer.
                </p>
              </>
            }
          >
            <a>
              <img src="/images/icon_tip.svg" />
              More info
            </a>
          </TooltipButton>
        </h2>
      </header>
      <div className={styles.results}>
        {renderedResults[0]}

        {renderedResults.length > 1 ? (
          <>
            <div
              className={cs(styles.showMore, expanded && styles.expanded)}
              onClick={toggleExpanded}
            >
              More suggested answers ({renderedResults.length - 1})
            </div>
            {expanded ? <div>{renderedResults.slice(1)}</div> : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
