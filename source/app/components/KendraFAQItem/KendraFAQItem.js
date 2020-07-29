import React, { useMemo, useState, useCallback } from "react";
import KendraHighlightedText from "../KendraHighlightedText/KendraHighlightedText";
import KendraResultFooter from "../KendraResultFooter/KendraResultFooter";

import css from './KendraFAQItem.scss';
import cs from 'classnames';

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
      <div className={cs(css.question, expanded && css.expanded)} onClick={toggleExpanded}>
        <h3>
          <KendraHighlightedText textWithHighlights={question.Value.TextWithHighlightsValue} />
        </h3>
      </div>
      {expanded ? (
        <div className={css.answer}>
          <p>
            <KendraHighlightedText textWithHighlights={answer.Value.TextWithHighlightsValue} />
          </p>
          <KendraResultFooter result={item} submitFeedback={submitFeedback} />
        </div>
      ) : null}
    </div>
  );
}
