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

import React, { Fragment, useRef, useEffect } from "react";
import { groupWith } from "ramda";
import cs from "classnames";

import Button from "../../components/Button/Button";

import css from "./KeyValueList.module.scss";

export default function KeyValueList({
  kvPairs,
  visible,
  pageCount,
  currentPageNumber,
  onSwitchPage,
  onRedact,
  onHighlight,
  showRedaction,
  onRedactAll,
  onDownload,
}) {
  if (!kvPairs.length && visible) {
    return <p className={cs(css.noKv)}>No Key-Value Pairs detected</p>;
  }

  return (
    <div className={cs(css.kvList, visible && css.visible)}>
      <ul>
        <h4>Key-Value Pairs : {kvPairs.length || 0} Found</h4>
        {groupWith((a, b) => a.pageNumber === b.pageNumber)(kvPairs).map(
          (pairs, i) => (
            <Fragment key={pairs[0].pageNumber}>
              {pageCount > 1 ? (
                <li
                  key={`pn${i}`}
                  className={cs(
                    css.pageSeparator,
                    pairs[0].pageNumber === currentPageNumber && css.onThisPage
                  )}
                >
                  Page {pairs[0].pageNumber}
                </li>
              ) : null}
              {pairs.map(
                (
                  {
                    id,
                    key,
                    value,
                    pageNumber,
                    keyBoundingBox,
                    valueBoundingBox,
                  },
                  i
                ) => (
                  <li
                    key={i}
                    className={cs(
                      css.kv,
                      pageNumber === currentPageNumber && css.onThisPage,
                      showRedaction && css.hasRedact
                    )}
                    onClick={() => {
                      onHighlight(id);
                      onSwitchPage(pageNumber);
                    }}
                  >
                    <h5>{key}</h5>
                    <p>
                      {(value && String(value).trim()) || <em>no value</em>}{" "}
                    </p>
                    {showRedaction ? (
                      <a
                        title="Redact this value"
                        className={css.valueRedact}
                        onClick={(e) => {
                          e.stopPropagation();
                          onRedact(valueBoundingBox, pageNumber);
                          onSwitchPage(pageNumber);
                        }}
                      >
                        Redact
                      </a>
                    ) : null}
                  </li>
                )
              )}
            </Fragment>
          )
        )}
      </ul>

      <footer className={css.actions}>
        {showRedaction ? (
          <Button className={css.redactButton} onClick={onRedactAll}>
            Redact All Values
          </Button>
        ) : (
          <Button className={css.downloadButton} onClick={onDownload}>
            Download CSV
          </Button>
        )}
      </footer>
    </div>
  );
}
