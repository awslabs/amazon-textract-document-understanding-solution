
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

import React from 'react'
import classNames from 'classnames'
import PropTypes from 'prop-types'

import Highlight from '../Highlight/Highlight'

import css from './Table.module.scss'

Table.propTypes = {
  className: PropTypes.string,
  rows: PropTypes.array,
  searchQuery: PropTypes.string,
}

Table.defaultProps = {
  rows: [],
  searchQuery: '',
}

export default function Table({ className, rows, searchQuery, ...rest }) {
  const searchQueryRegex = RegExp(`${searchQuery}`, 'i')
  const tableContainerClassNames = classNames(css.tableContainer, className)

  if (!rows.length) return null

  return (
    <div className={tableContainerClassNames} {...rest}>
      <table>
        <tbody>
          {rows.map((cells, rowIndex) => {
            return (
              <tr key={rowIndex}>
                {cells.map(({ content, ColumnSpan, RowSpan }, cellIndex) => (
                  <td
                    key={cellIndex}
                    colSpan={ColumnSpan > 1 ? ColumnSpan : null}
                    rowSpan={RowSpan > 1 ? RowSpan : null}
                    className={!searchQueryRegex.test(content) ? css.muted : null}
                  >
                    <Highlight search={searchQuery}>{content}</Highlight>
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
