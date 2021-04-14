
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
import { groupWith } from 'ramda'
import cs from 'classnames'

import Button from '../Button/Button'
import css from './DocumentPreview.module.scss'


export default function DocumentPreview({
  pageCount,
  visible,
  track,
  document
}) {        
  return (
     <div className={cs(css.entityList, visible && css.visible)}>
      <ul>
        <h4>File Details</h4>
          <Fragment key={document.documentName}>
           <h5>Name : {document.documentName}</h5>
           <h5>Total Page: {pageCount}</h5>
          </Fragment>


      </ul>

        <footer className={css.actions}>
            {track === 'search' ? (
                  <div className={css.downloadButtons}>
                  <Button
                  download={document.documentName.split('.')[0]+"-searchable.pdf"}
                  href={document.searchablePdfURL}
                  >
                    ⬇ Searchable PDF
                  </Button>
                </div>) : null}

                <div className={css.downloadButtons}>
              <Button
                inverted
                download={document.documentName.split('/').pop()}
                href={document.documentURL}
              >
                ⬇ Original Doc
              </Button>
            </div>

        </footer>
    </div>
  )
}
