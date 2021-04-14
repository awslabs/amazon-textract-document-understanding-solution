
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

import React, { Fragment, useRef, useEffect } from 'react'
import { groupWith } from 'ramda'
import cs from 'classnames'

import Button from '../Button/Button'

import css from './RawTextLines.module.scss'

export default function RawTextLines({
  lines,
  visible,
  pageCount,
  currentPageNumber,
  onSwitchPage,
  onHighlight,
}) {
  if (!lines.length) {
    return <p className={css.empty}>No Key-Value Pairs detected</p>
  }

  return (
    <div className={cs(css.lineList, visible && css.visible)}>
      <ul>
        {groupWith((a, b) => a.pageNumber === b.pageNumber)(lines).map((pageLines, i) => (
          <Fragment key={pageLines[0].pageNumber}>
            {pageCount > 1 ? (
              <li
                key={`pn${i}`}
                className={cs(
                  css.pageSeparator,
                  pageLines[0].pageNumber === currentPageNumber && css.onThisPage
                )}
              >
                Page {pageLines[0].pageNumber}
              </li>
            ) : null}
            {pageLines.map(({ id, text, pageNumber, boundingBox }, i) => (
              <li
                key={i}
                className={cs(css.line, pageNumber === currentPageNumber && css.onThisPage)}
                onClick={() => {
                  onHighlight(id)
                }}
              >
                {text}
              </li>
            ))}
          </Fragment>
        ))}
      </ul>

      <footer className={css.actions} />
    </div>
  )
}
