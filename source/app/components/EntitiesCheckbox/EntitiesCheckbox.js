
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

import {
  getMultiPageWordsBySearch,
  resetFormsonPage
} from '../../utils/document'

import {
  COMPREHEND_MEDICAL_SERVICE,
  COMPREHEND_SERVICE
} from '../../utils/dus-constants'


import css from './EntitiesCheckbox.module.scss'

export default function EntitiesCheckbox({
  entities,
  visible,
  pageCount,
  currentPageNumber,
  onSwitchPage,
  onRedact,
  onHighlight,
  showRedaction,
  onRedactAll,
  onDownloadPrimary,
  onDownloadSecondary,
  comprehendService,
  document
}) {
  const container = useRef()

  useEffect(() => {
    if (visible && container.current) {
      onHighlight(getMultiPageWordsBySearch(document, currentPageNumber, []))
      resetFormsonPage()
    }
  }, [currentPageNumber, visible])
  let is_comprehend_medical = false
  

  if (comprehendService == COMPREHEND_MEDICAL_SERVICE)is_comprehend_medical=true

  
  if (!entities.length&& visible) {
    return <p className={css.noEntity}>No {is_comprehend_medical? (`Medical `):null}Entities detected</p>
  }
  return (

    <div className={cs(css.entityList, visible && css.visible,)} ref={container}>
      <ul>
        <h4>{is_comprehend_medical? (`Medical `):null}Entities: {entities.length || 0} Found</h4>
        {groupWith((a, b) => a.pageNumber === b.pageNumber)(entities).map((pairs, i) => (
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
            <form id ={(`${comprehendService}-${i}-form`)}>
            {pairs.map(({ entity, value , pageNumber }, i) => {
              const id = `${entity}-${pageNumber}`

              return (
                <li
                  key={id}
                  className={cs(
                    css.ev,
                    pageNumber === currentPageNumber && css.onThisPage,
                    showRedaction && css.hasRedact
                  )}
                  > 
                <input id={id} name="entityChoice" type="radio"  onClick={e => {
                    e.stopPropagation()
                    onSwitchPage(pageNumber)
                    onHighlight(getMultiPageWordsBySearch(document, pageNumber, value),pageNumber)
                  }
                }/> <label htmlFor={id}>{entity}</label>
  
                  {
                  showRedaction ? (
                    <span className = {css.redactSpan}>
                    <a
                      title="Redact Entity Matches"
                      className={css.valueRedact}
                      onClick={e => {
                        e.stopPropagation()
                        onRedact(pageNumber , getMultiPageWordsBySearch(document, pageNumber, value))
                        onSwitchPage(pageNumber)
                      }}
                    >
                      Redact All
                    </a></span>
                  ) : null}
                </li>
    
              )
            })}
            </form>
          </Fragment>
        ))}
      </ul>

      <footer className={css.actions}>
      <div className={css.downloadButtons}>
      <Button  onClick={onDownloadPrimary}>
      ⬇ {is_comprehend_medical? (`Medical `):null} Entities
      </Button></div>
      {is_comprehend_medical?
      ( <div className={css.downloadButtons}><Button className={css.downloadButton} onClick={onDownloadSecondary}>
            ⬇ ICD-10 Ontologies
        </Button></div>
      ):null}
      </footer>
    </div>
  )
}
