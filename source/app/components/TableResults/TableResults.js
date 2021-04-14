
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

import React, { Fragment, useRef, useEffect , useMemo, useCallback } from 'react'
import classNames from 'classnames'
import PropTypes from 'prop-types'
import cs from 'classnames'

import { groupWith } from 'ramda'

import css from './TableResults.module.scss'


export default function TableResults({
  tables,
  visible,
  pageCount,
  currentPageNumber,
  onSwitchPage,
  onHighlight,
  onDownload,
  document
}) {
  if (!tables.length&& visible) {
    return <p className={css.noTable}>No Tables detected</p>
  }
  
  return (

    <div className={cs(css.tableList, visible && css.visible,)}>
      <ul>
        <h4>Tables: {tables.length || 0} Found</h4>
        {groupWith((a, b) => a.pageNumber === b.pageNumber)(tables).map((pairs, i) => (
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
            
    
               {pairs.map(({ table,pageNumber ,rows }, i) => (
              <li
                key={i}
                className={cs(
                  css.ev,
                  pageNumber === currentPageNumber && css.onThisPage
                )}
                onClick={() => {
                  onSwitchPage(pageNumber)
                }}
              >
                <h5>Table {i+1} : {rows.length || 0} rows</h5>
                
              </li>
            ))}
  
         

           
           

          </Fragment>
        ))}
      </ul>

      <footer className={css.actions}>
      </footer>
    </div>
  )


}


