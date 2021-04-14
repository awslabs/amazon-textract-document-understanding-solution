
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

import React, { Fragment } from 'react'
import { connect } from 'react-redux'
import classNames from 'classnames'
import PropTypes from 'prop-types'

import { setCurrentPageNumber } from '../../store/entities/meta/actions'
import { getCurrentPageNumber } from '../../store/entities/meta/selectors'

import css from './Pager.module.scss'

Pager.propTypes = {
  children: PropTypes.func,
  className: PropTypes.string,
  currentPageNumber: PropTypes.number,
  defaultActivePageIndex: PropTypes.number,
  dispatch: PropTypes.func,
  noContent: PropTypes.node,
  pageTotal: PropTypes.number,
  subtitle: PropTypes.string,
}

export default connect(function mapStateToProps(state) {
  return { currentPageNumber: getCurrentPageNumber(state) }
})(Pager)

function Pager({
  dispatch,
  children,
  className,
  currentPageNumber,
  noContent,
  pageTotal = 1,
  subtitle,
  ...rest
}) {
  const pagerClassNames = classNames(css.pager, className)
  const isSinglePage = pageTotal === 1

  function handlePrevClick() {
    const prevPageNumber = Math.max(1, currentPageNumber - 1)
    dispatch && dispatch(setCurrentPageNumber(prevPageNumber))
  }

  function handleNextClick() {
    const nextPageNumber = Math.min(pageTotal, currentPageNumber + 1)
    dispatch && dispatch(setCurrentPageNumber(nextPageNumber))
  }

  const makeKeyPressHandler = fn => () => {
    const code = event.keyCode || event.which
    if (code === 13) fn()
  }

  return (
    <div className={pagerClassNames} {...rest}>
      <header className={css.header}>
        <div>{subtitle && <p className={css.subtitle}>{subtitle}</p>}</div>
      </header>

      {children && children(currentPageNumber)}
      {noContent && noContent}

      <footer className={css.footer}>
        {!isSinglePage && (
          <>
            <svg
              onClick={handlePrevClick}
              onKeyPress={makeKeyPressHandler(handlePrevClick)}
              className={currentPageNumber === 1 ? css.disabled : null}
              height="24"
              viewBox="0 0 24 24"
              width="24"
              xmlns="http://www.w3.org/2000/svg"
              tabIndex={currentPageNumber === 1 ? null : 0}
            >
              <g fill="none" fillRule="evenodd" stroke="#fff" strokeLinecap="round" strokeWidth="2">
                <path d="m8 12 6 6" />
                <path d="m8 6 6 6" transform="matrix(-1 0 0 1 22 0)" />
              </g>
            </svg>
            <span>
              Page {currentPageNumber} of {pageTotal}
            </span>
            <svg
              onClick={handleNextClick}
              onKeyPress={makeKeyPressHandler(handleNextClick)}
              className={currentPageNumber === pageTotal ? css.disabled : null}
              height="24"
              viewBox="0 0 24 24"
              width="24"
              xmlns="http://www.w3.org/2000/svg"
              tabIndex={currentPageNumber === pageTotal ? null : 0}
            >
              <g fill="none" fillRule="evenodd" stroke="#fff" strokeLinecap="round" strokeWidth="2">
                <path d="m16 12-6 6" />
                <path d="m16 6-6 6" transform="matrix(-1 0 0 1 26 0)" />
              </g>
            </svg>
          </>
        )}
      </footer>
    </div>
  )
}
