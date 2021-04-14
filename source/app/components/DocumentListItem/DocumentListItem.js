
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

import React, { useEffect, useCallback } from 'react'
import { useDispatch } from 'react-redux'
import PropTypes from 'prop-types'
import Link from 'next/link'
import classNames from 'classnames'

import Loading from '../Loading/Loading'
import { fetchSingleDocument, deleteDocument } from '../../store/entities/documents/actions'

import css from './DocumentListItem.module.scss'

export default function DocumentListItem({ id, title, link, basename, extension, documentStatus }) {
  const pending = documentStatus == 'IN_PROGRESS'
  useRefetch(id, pending)

  const dispatch = useDispatch()

  const doDelete = useCallback(
    e => {
      e.stopPropagation()
      e.preventDefault()
      if (confirm('Are you sure you want to delete this document?')) dispatch(deleteDocument(id))
    },
    [dispatch, id]
  )
  const fileProcessFailed =  documentStatus == 'FAILED'
  const { target, ...linkProps } = link || {}
    
  return (
    <li>
      {pending ? (
        <a className={css.pending} onClick={e => e.preventDefault()}>
          <span className={css.icon}>
            <Loading size={24} overlay={false} />
          </span>
          <span className={css.filename}>{basename}</span>
          <span className={css.extension}>{extension}</span>
          <span className={css.processing}>Processing&hellip;</span>
          <span className={css.deleteSpacer} />
        </a>
      ) : fileProcessFailed?(
        <a  className={css.failedFileRow} target={null}>
            <span className={css.icon}>
              <svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="m11.9999259 2.01129642v7.35237875.81817933h7.9707628l.0290631 10.8154583c.0014841.5522828-.4450265 1.0011995-.9973092 1.0026836-.0008958.0000024-.0017915.0000036-.0026872.0000036h-13.9997554c-.55228475 0-1-.4477153-1-1v-17.99982331c0-.55228475.44771525-1 1-1 .00052958 0 .00105915.00000042.00158873.00000126zm1.5999851.22400401 5.9122424 6.31019543h-5.9122424z"
                />
              </svg>
            </span>
            <span className={css.filename}>{basename}</span>
            <span className={css.extension}>{extension}</span>
            <span className={css.failed}>Failed</span>
            <button onClick={doDelete} className={css.deleteButton} />
          </a>
      ) :(
        <Link {...linkProps}>
          <a target={target || null}>
            <span className={css.icon}>
              <svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="m11.9999259 2.01129642v7.35237875.81817933h7.9707628l.0290631 10.8154583c.0014841.5522828-.4450265 1.0011995-.9973092 1.0026836-.0008958.0000024-.0017915.0000036-.0026872.0000036h-13.9997554c-.55228475 0-1-.4477153-1-1v-17.99982331c0-.55228475.44771525-1 1-1 .00052958 0 .00105915.00000042.00158873.00000126zm1.5999851.22400401 5.9122424 6.31019543h-5.9122424z"
                  fillRule="evenodd"
                />
              </svg>
            </span>
            <span className={css.filename}>{basename}</span>
            <span className={css.extension}>{extension}</span>
            <span className={css.ready}>Ready</span>
            <button onClick={doDelete} className={css.deleteButton} />
          </a>
        </Link>
      )}
    </li>
  )
}

function useRefetch(documentId, pending) {
  const dispatch = useDispatch()
  useEffect(() => {
    if (!pending) return

    const to = setInterval(() => {
      dispatch(fetchSingleDocument(documentId))
    }, 5000)

    return () => {
      clearInterval(to)
    }
  }, [dispatch, documentId, pending])
}
