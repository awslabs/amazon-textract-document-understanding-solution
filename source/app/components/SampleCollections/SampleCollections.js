
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

import React, { useState } from 'react'
import ReactDOM from 'react-dom'
import { connect, useDispatch } from 'react-redux'
import Router from 'next/router'

import Button from '../Button/Button'

import {
  submitDocument,
  submitDocuments,
  fetchDocuments,
} from '../../store/entities/documents/actions'
import {
  getSampleDocuments,
  getSampleCollections,
} from '../../store/entities/sampleDocuments/selectors'
import { clearSearchQuery } from '../../store/entities/meta/actions'

import css from './SampleCollections.module.scss'
import cs from 'classnames'
import Loading from '../Loading/Loading'

function SampleCollections({ dispatch, sampleDocuments, sampleCollections }) {
  const [previewDoc, setPreviewDoc] = useState(null)

  return (
    <div>
      <ul className={css.list}>
        {sampleDocuments.map(({ id, object, title, previewImage }) => {
          const submitAction = () => submitDocument({ sample: true, key: object })
          return (
            <li key={id} className={css.item}>
              <div className={css.doc}>
                <img
                  src={previewImage}
                  onClick={() => setPreviewDoc({ id, object, title, previewImage, submitAction })}
                />
              </div>
              {title}
              <AddButton action={() => dispatch(submitAction())} />
            </li>
          )
        })}
        {sampleCollections.map(({ id, objects, title, previewImage }) => {
          const submitAction = () =>
            submitDocuments({
              objects: objects.map(x => ({ sample: true, key: x })),
            })
          return (
            <li key={id} className={cs(css.item, css.collection)}>
              <div className={css.docPile}>
                <div className={css.doc}>
                  <img
                    src={previewImage}
                    onClick={() =>
                      setPreviewDoc({ id, objects, title, previewImage, submitAction })
                    }
                  />
                </div>
                <div className={css.doc} />
                <div className={css.doc} />
              </div>
              {title}
              <br />({objects.length} documents)
              <AddButton action={() => dispatch(submitAction())} />
            </li>
          )
        })}
      </ul>

      {previewDoc
        ? ReactDOM.createPortal(
            <div className={css.previewDoc}>
              <img src={previewDoc.previewImage} />
              <div className={css.details}>
                <h3>{previewDoc.title}</h3>
                {previewDoc.object ? (
                  <p>{previewDoc.object.split('/').pop()}</p>
                ) : (
                  <p>{previewDoc.objects.length} documents</p>
                )}
                <p>
                  <AddButton simple={false} action={() => dispatch(previewDoc.submitAction())} />
                </p>
                <p>
                  <Button simple onClick={() => setPreviewDoc(null)}>
                    Cancel
                  </Button>
                </p>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  )
}

export default connect(function mapStateToProps(state) {
  return {
    sampleDocuments: getSampleDocuments(state),
    sampleCollections: getSampleCollections(state),
  }
})(SampleCollections)

function AddButton({ action, simple = true }) {
  const dispatch = useDispatch()
  const [pending, setPending] = useState(false)
  return (
    <Button
      className={cs(css.spinnerButton, pending && css.pending)}
      simple={simple}
      disabled={pending}
      onClick={() => {
        setPending(true)
        action().then(() => {
          dispatch(clearSearchQuery())
          dispatch(fetchDocuments())
          Router.push('/documents')
        })
      }}
    >
      <span>
        <Loading overlay={false} size={18} color="currentColor" thickness={6} />
      </span>
      Add
    </Button>
  )
}
