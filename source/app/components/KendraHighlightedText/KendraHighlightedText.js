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

import React, { Fragment } from "react";

import styles from "./KendraHighlightedText.module.scss";

function unionSortedHighlights(highlights) {
  if (!highlights) {
    return highlights;
  }

  let prev = highlights[0];
  const unioned = [prev];
  for (let i = 1; i < highlights.length; i++) {
    const h = highlights[i];
    if (prev.EndOffset >= h.BeginOffset) {
      // union
      prev.EndOffset = Math.max(h.EndOffset, prev.EndOffset);
      prev.TopAnswer = prev.TopAnswer || h.TopAnswer;
    } else {
      // disjoint, add to results
      unioned.push(h);
      prev = h;
    }
  }

  return unioned;
}

export default function KendraHighlightedText({ textWithHighlights }) {
  if (!textWithHighlights) return null;

  const { Text: text, Highlights: highlights } = textWithHighlights;

  if (!highlights || !highlights.length) {
    return <span>{text}</span>;
  }

  const sortedHighlights = unionSortedHighlights(
    highlights.sort((a, b) => a.BeginOffset - b.BeginOffset)
  );
  const lastHighlight = sortedHighlights[sortedHighlights.length - 1];

  return (
    <span className={styles.base}>
      {sortedHighlights.map((highlight, idx) => (
        <Fragment key={idx}>
          {text.substring(
            idx === 0 ? 0 : sortedHighlights[idx - 1].EndOffset,
            highlight.BeginOffset
          )}
          <mark>
            {text.substring(highlight.BeginOffset, highlight.EndOffset)}
          </mark>
        </Fragment>
      ))}
      {text.substring(lastHighlight ? lastHighlight.EndOffset : 0)}
    </span>
  );
}
