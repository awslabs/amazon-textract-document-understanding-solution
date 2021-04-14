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

import React, { useMemo, useState, useCallback } from "react";
import KendraHighlightedText from "../KendraHighlightedText/KendraHighlightedText";
import KendraResultFooter from "../KendraResultFooter/KendraResultFooter";

import css from "./KendraFAQItem.module.scss";
import cs from "classnames";

export default function KendraFAQItem({ item, submitFeedback }) {
  const question = useMemo(
    () => item.AdditionalAttributes.find((att) => att.Key === "QuestionText"),
    [item]
  );
  const answer = useMemo(
    () => item.AdditionalAttributes.find((att) => att.Key === "AnswerText"),
    [item]
  );

  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = useCallback(() => setExpanded((e) => !e), []);

  return (
    <div className={css.item} data-walkthrough="faq">
      <div
        className={cs(css.question, expanded && css.expanded)}
        onClick={toggleExpanded}
      >
        <h3>
          <KendraHighlightedText
            textWithHighlights={question.Value.TextWithHighlightsValue}
          />
        </h3>
      </div>
      {expanded ? (
        <div className={css.answer}>
          <p>
            <KendraHighlightedText
              textWithHighlights={answer.Value.TextWithHighlightsValue}
            />
          </p>
          <KendraResultFooter result={item} submitFeedback={submitFeedback} />
        </div>
      ) : null}
    </div>
  );
}
