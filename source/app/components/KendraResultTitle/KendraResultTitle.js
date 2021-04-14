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

import React, { useCallback } from "react";

import LinkWithClickHandler from "../LinkWithClickHandler/LinkWithClickHandler";

import KendraHighlightedText from "../KendraHighlightedText/KendraHighlightedText";

import styles from "./KendraResultTitle.module.scss";
import { makeDocumentLink } from "../../utils/link-generators";

export default function KendraResultTitle({ result, submitFeedback }) {
  let resultTitle;

  if (result.DocumentTitle && result.DocumentTitle.Text) {
    const truncatedTitle = {
      ...result.DocumentTitle,
      Text: result.DocumentTitle.Text.replace(/-searchable$/, ''),
    }
    resultTitle = (
      <KendraHighlightedText textWithHighlights={truncatedTitle} />
    );
  } else if (result.DocumentURI) {
    resultTitle = result.DocumentURI;
  }

  const handleClick = useCallback(() => {
    submitFeedback("CLICK", result);
  }, [submitFeedback, result]);

  if (!resultTitle) return null;

  const uri = result.DocumentURI;

  // TODO link to doc

  return (
    <header className={styles.header}>
      <LinkWithClickHandler
        {...makeDocumentLink(result.DocumentId)}
        onClick={handleClick}
      >
        <h3 className={styles.title}>{resultTitle}</h3>
      </LinkWithClickHandler>
    </header>
  );
}
