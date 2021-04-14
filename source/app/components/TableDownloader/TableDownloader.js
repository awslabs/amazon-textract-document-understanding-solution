
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

import React, { useMemo, useEffect } from 'react'

import Button from '../Button/Button'

import css from './TableDownloader.module.scss'

export default function TableDownloader({ table, rows }) {
  const tableBlob = useMemo(() => {
    const csv = rows
      .map(row => {
        return row
          .map(cell => cell.content)
          .map(x => `"${x.replace(/"/g, '""')}"`)
          .join(',')
      })
      .join('\n')
    return new Blob(['\ufeff', csv], { type: 'text/csv' })
  }, [rows])

  const url = useMemo(() => URL.createObjectURL(tableBlob), [tableBlob])
  useEffect(() => {
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [url])

  const { Top, Left, Width, Height } = table.Geometry.BoundingBox

  return (
    <Button
      style={{
        top: `${(Top + Height) * 100}%`,
        left: `${Left * 100}%`,
      }}
      className={css.button}

      download="table.csv"
      href={url}
    >
      Download CSV
    </Button>
  )
}
