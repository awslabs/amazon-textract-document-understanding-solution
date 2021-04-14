
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

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import PropTypes from 'prop-types'
import { connect, useSelector } from 'react-redux'
import queryString from 'query-string'
import cs from 'classnames'
import { Storage } from 'aws-amplify'
import { useRouter }  from 'next/router'



import Loading from '../../components/Loading/Loading'
import DocumentViewer from '../../components/DocumentViewer/DocumentViewer'
import Tabs from '../../components/Tabs/Tabs'
import DocumentActionBar from '../../components/DocumentActionBar/DocumentActionBar'

import {
  fetchDocument,
  addRedactions,
  clearRedaction,
  clearRedactions,
  addHighlights,
  clearHighlights,
  saveRedactions

} from '../../store/entities/documents/actions'
import { getDocumentById } from '../../store/entities/documents/selectors'
import { getSelectedTrackId } from '../../store/ui/selectors'
import { setCurrentPageNumber, setDocumentSearchQuery } from '../../store/entities/meta/actions'
import { getDocumentSearchQuery, getCurrentPageNumber } from '../../store/entities/meta/selectors'

import {
  getDocumentPageCount,
  getPageLines,
  getDocumentLines,
  getDocumentEntityPairs,
  getDocumentKeyValuePairs,
  getPageTables,
  getPageWordsBySearch,
  getDocumentTables,
} from '../../utils/document'

import { getEscapedStringRegExp } from '../../utils/getEscapedStringRegExp'

import {
  COMPREHEND_MEDICAL_SERVICE,
  COMPREHEND_SERVICE
} from '../../utils/dus-constants'



import css from './view.module.scss'
import KeyValueList from '../../components/KeyValueList/KeyValueList'
import RawTextLines from '../../components/RawTextLines/RawTextLines'
import EntitiesCheckbox from '../../components/EntitiesCheckbox/EntitiesCheckbox'
import DocumentPreview from '../../components/DocumentPreview/DocumentPreview'
import TableResults from '../../components/TableResults/TableResults'
import { ENABLE_COMPREHEND_MEDICAL } from '../../constants/configs'


Document.propTypes = {
  currentPageNumber: PropTypes.number,
  dispatch: PropTypes.func,
  document: PropTypes.object,
  id: PropTypes.string,
  pageTitle: PropTypes.string,
  searchQuery: PropTypes.string,
  track: PropTypes.string,
}

Document.defaultProps = {
  document: {},
}

Document.getInitialProps = function({ query, store }) {
  const state = store.getState()
  const { id } = query || {}
  const { documentName } = getDocumentById(state, id) || {}

  const props = {
    showNavigation: false,
    backButton: true
  }

  return props
}

const tabItems = [
  { id: 'search', title: 'Preview' },
  { id: 'text', title: 'Raw Text' },
  { id: 'kv', title: `Key-Value Pairs` },
  { id: 'tables', title: `Tables` },
  { id: 'entities', title: `Entities` },
]

if (ENABLE_COMPREHEND_MEDICAL) tabItems.push({ id: 'medical_entities', title: `Medical Entities` })

function Document({ currentPageNumber, dispatch, id, document, pageTitle, searchQuery, track }) {
  // TODO: Ensure id corresponds to a valid resource, otherwise 404
  // e.g. /documents/export and /documents/view should fail
  const isDocumentFetched = !!document.textractResponse && !!document.comprehendMedicalResponse && !!document.comprehendResponse
  const { status } = useFetchDocument(dispatch, id, isDocumentFetched)
  const pageCount = getDocumentPageCount(document)

  const router = useRouter()
  const areUnsavedRedactions = useSelector((state) => state.entities.areUnsavedRedactions);
  const { documentId, redactions } = document

  // prompt the user if they try and leave with unsaved changes
  useEffect(() => {
    if (!areUnsavedRedactions) return;

    const handleWindowClose = (e) => {
      e.preventDefault();
      e.returnValue = 'Are you sure you would like to leave this page? Unsaved changes will be lost.'
      return e.returnValue;
    };

    const handleBrowseAway = () => {
      if (!window.confirm('You have unsaved changes. Would you like to save them before you leave?')) return;

      dispatch(saveRedactions(documentId, redactions))
    };

    window.addEventListener('beforeunload', handleWindowClose);
    router.events.on('routeChangeStart', handleBrowseAway);

    return () => {
      window.removeEventListener('beforeunload', handleWindowClose);
      router.events.off('routeChangeStart', handleBrowseAway);
    };
  }, [areUnsavedRedactions, documentId, redactions]);


  // Reset currentPageNumber on mount
  useEffect(() => {
    dispatch(setCurrentPageNumber(1))
  }, [dispatch])

  useEffect(() => {
    return () => {
      dispatch(clearRedactions(id))
    }
  }, [dispatch, id])


  // Set search results data
  const wordsMatchingSearch = useMemo(() => {
    return searchQuery ? getPageWordsBySearch(document, currentPageNumber, [new RegExp(getEscapedStringRegExp(searchQuery), 'i')]) : []
  }, [document, currentPageNumber, searchQuery])

  const docData = useMemo(() => {
    const pairs = getDocumentKeyValuePairs(document)
    const tables = getDocumentTables(document)
    const lines = getDocumentLines(document)
    const entities = getDocumentEntityPairs(document, COMPREHEND_SERVICE)
    const medicalEntities = ENABLE_COMPREHEND_MEDICAL? getDocumentEntityPairs(document, COMPREHEND_MEDICAL_SERVICE) : []
    return { pairs, tables, lines, entities , medicalEntities }
    // eslint-disable-next-line

  }, [document, document.textractResponse ,document.medicalComprehendResponse, document.comprehendResponse])

  // Set the paged content for each tab
  const pageData = useMemo(() => {
    const lines = getPageLines(document, currentPageNumber)
    const pairs = docData.pairs.filter(d => d.pageNumber === currentPageNumber)
    const tables = docData.tables.filter(d => d.pageNumber === currentPageNumber)
    const entities = docData.entities.filter(d => d.pageNumber === currentPageNumber)
    const medicalEntities = docData.medicalEntities.filter(d => d.pageNumber === currentPageNumber)
    return { lines, pairs, tables , entities , medicalEntities }
    // eslint-disable-next-line
  }, [document, document.textractResponse,document.comprehendMedicalResponse, currentPageNumber, docData.pairs, docData.entities , docData.medicalEntities , docData.tables])

  const [tab, selectTab] = useState('search')

  const isComplianceTrack = track === 'redaction'

  const downloadKV = useCallback(async () => {
    const { resultDirectory } = document
    const url = await Storage.get(`${resultDirectory}/textract/page-${currentPageNumber}-forms.csv`, {
      expires: 300,
    })
    window.open(url)
  }, [currentPageNumber, document])

  const downloadEntities = useCallback(async () => {
    const { resultDirectory } = document
    const url = await Storage.get(`${resultDirectory}/comprehend/comprehendEntities.json`, {
      expires: 300,
    })
    window.open(url)
  }, [ document])

  const downloadMedicalEntities = useCallback(async () => {
    const { resultDirectory } = document
    const url = await Storage.get(`${resultDirectory}/comprehend/comprehendMedicalEntities.json`, {
      expires: 300,
    })
    window.open(url)
  }, [ document])

  const downloadMedicalICD10Ontologies = useCallback(async () => {
    const { resultDirectory } = document
    const url = await Storage.get(`${resultDirectory}/comprehend/comprehendMedicalICD10.json`, {
      expires: 300,
    })
    window.open(url)
  }, [ document])

  const redactMatches = useCallback(async () => {
    dispatch(addRedactions(id, currentPageNumber, wordsMatchingSearch))
    dispatch(setDocumentSearchQuery(''))
  }, [currentPageNumber, dispatch, id, wordsMatchingSearch])

  const redact = useCallback(
    async (bbox, pageNumber = currentPageNumber) => {
      dispatch(addRedactions(id, pageNumber, [bbox]))
    },
    [currentPageNumber, dispatch, id]
  )

  const highlightEntities = useCallback(
    async (bbox, pageNumber = currentPageNumber) => {
      dispatch(addHighlights(id, pageNumber, bbox))
    },
    [currentPageNumber, dispatch, id]
  )

  const redactAllValues = useCallback(
    async (bbox, pageNumber = currentPageNumber) => {
       dispatch(addRedactions(id, currentPageNumber, pageData.pairs.map(p => p.valueBoundingBox)))
  }, [currentPageNumber, dispatch, id, pageData.pairs])


  const redactEntityMatches = useCallback(async (pageNumber ,bboxlist) => {
    dispatch(addRedactions(id, pageNumber,bboxlist.map(p => p)))
  }, [currentPageNumber, dispatch, id])

  const contentRef = useRef()

  const pagePairsAsMarks = useMemo(() => {
    return pageData.pairs.reduce((acc, { id, keyBoundingBox, valueBoundingBox }) => {
      return [
        ...acc,
        { ...keyBoundingBox, id, type: 'key' },
        { ...valueBoundingBox, id, type: 'value' },
      ]
    }, [])
  }, [pageData.pairs])

  const pageLinesAsMarks = useMemo(() => {
    return pageData.lines.map(({ id, boundingBox }) => {
      return {
        id,
        ...boundingBox,
      }
    })
  }, [pageData.lines])

  const [highlightedKv, setHighlightedKv] = useState(null)

  useEffect(() => {
    if (highlightedKv) {
      setTimeout(() => {
        setHighlightedKv(null)
      }, 10)
    }
  }, [highlightedKv])



  const switchPage = useCallback(
    pageNumber => {
      dispatch(setCurrentPageNumber(pageNumber))
    },
    [dispatch]
  )

  const setHighlightedLine = useCallback(() => {}, [])

  return (
    <div className={css.document}>
      {status === 'pending' && <Loading />}

      {status === 'success' && (
        <>
          <div className={css.tabWrapper}>
            <Tabs
              isTrackTab={false}
              selected={tab}
              track={track}
              onSelectTab={selectTab}
              items={tabItems}
            />

            <div>
              <Tabs
              isTrackTab
              track={track}
              items={[
                { id: 'searchTrack', title: 'Discovery'},
                { id: 'complianceTrack', title: 'Compliance'},
                { id: 'workflowTrack', title: 'Workflow Automation'}
              ]}
            />
            </div>
          </div>

          <div className={css.content} ref={contentRef}>
            <div>
              <DocumentActionBar document={document} isComplianceTrack={isComplianceTrack} redactMatches={redactMatches} />

              <DocumentViewer
                className={cs(
                  css.tabSourceViewer,
                  tab === 'kv' && css.withKv,
                  tab === 'entities' && css.withEv,
                  tab === 'medical_entities' && css.withEv,
                  tab === 'text' && css.withText
                )
              }
                document={document}
                pageCount={pageCount}
                redactions={(document.redactions || {})[currentPageNumber]}
                onRedactionClick={(redactionId) => dispatch(clearRedaction(document.documentId, currentPageNumber, document.redactions, redactionId))}
                onMarkClick={(redaction) => dispatch(addRedactions(document.documentId, currentPageNumber, [redaction]))}
                marks={
                  [
                    ...wordsMatchingSearch,
                    ...tab === 'text'
                      ? pageLinesAsMarks
                      : tab === 'kv'
                      ? pagePairsAsMarks
                      : tab === 'entities'
                      ? (document.highlights || [])
                      : tab === 'medical_entities'
                      ? (document.highlights || [])
                      : []
                  ]
                }
                tables={tab === 'tables' && pageData.tables}
                highlightedMark={highlightedKv}
                isComplianceTrack={isComplianceTrack}
                redactMatches={redactMatches}
              />
            </div>

            <div
              className={cs(
                css.sidebar,
                (tab === 'kv' || tab === 'text' || tab === 'entities' || tab ==='medical_entities' || tab === 'search' ||tab === 'text'||tab === 'tables') && css.visible
              )
            }
            >
              <KeyValueList
                kvPairs={docData.pairs}
                pageCount={pageCount}
                currentPageNumber={currentPageNumber}
                showRedaction={track === 'redaction'}
                onHighlight={setHighlightedKv}
                onSwitchPage={switchPage}
                onRedact={redact}
                onRedactAll={redactAllValues}
                onDownload={downloadKV}
                visible={tab === 'kv'}
              />

              <DocumentPreview
                document={document}
                pageCount={pageCount}
                visible={tab === 'search'}
                track = {track}
              />

              <RawTextLines
                lines={docData.lines}
                pageCount={pageCount}
                currentPageNumber={currentPageNumber}
                onHighlight={setHighlightedLine}
                onSwitchPage={switchPage}
                visible={tab === 'text'}
              />

              <EntitiesCheckbox
                entities={docData.entities}
                pageCount={pageCount}
                currentPageNumber={currentPageNumber}
                showRedaction={track === 'redaction'}
                onHighlight={highlightEntities}
                onSwitchPage={switchPage}
                onRedact={redactEntityMatches}
                onRedactAll={redactAllValues}
                onDownload={downloadKV}
                visible={tab === 'entities'}
                comprehendService={COMPREHEND_SERVICE}
                onDownloadPrimary = {downloadEntities}
                onDownloadSecondary = {null}
                document = {document}
              />

              { ENABLE_COMPREHEND_MEDICAL &&
               <EntitiesCheckbox
                entities={docData.medicalEntities}
                pageCount={pageCount}
                currentPageNumber={currentPageNumber}
                showRedaction={track === 'redaction'}
                onHighlight={highlightEntities}
                onSwitchPage={switchPage}
                onRedact={redactEntityMatches}
                onRedactAll={redactAllValues}
                onDownloadPrimary={downloadMedicalEntities}
                onDownloadSecondary = {downloadMedicalICD10Ontologies}
                visible={tab === 'medical_entities'}
                comprehendService={COMPREHEND_MEDICAL_SERVICE}
                document = {document}
              /> }

              <TableResults
                tables={docData.tables}
                pageCount={pageCount}
                currentPageNumber={currentPageNumber}
                onSwitchPage={switchPage}
                visible={tab === 'tables'}
                document = {document}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default connect(function mapStateToProps(state) {
  const { id } = queryString.parse(location.search)

  return {
    id,
    currentPageNumber: getCurrentPageNumber(state, id),
    document: getDocumentById(state, id),
    searchQuery: getDocumentSearchQuery(state),
    track: getSelectedTrackId(state),
  }
})(Document)

/**
 * Conditionally fetch documents from the client side.
 *
 * @param {Function} dispatch Redux dispatch function
 * @param {Array} documents An array of documents
 * @param {Boolean} isDocumentFetched True if the document has already been fetched
 */
function useFetchDocument(dispatch, id, isDocumentFetched) {
  const isMounted = useRef(true)
  const [status, setStatus] = useState('')

  useEffect(() => {
    if (!isDocumentFetched) {
      isMounted.current && setStatus('pending')

      dispatch(fetchDocument(id))
        .then(meta => {
          isMounted.current && setStatus('success')
        })
        .catch(() => {
          isMounted.current && setStatus('error')
        })
    } else {
      isMounted.current && setStatus('success')
    }
  }, [dispatch, id, isDocumentFetched])

  // Ensure we don't try to set state after component unmount
  useEffect(() => () => (isMounted.current = false), [])

  return { status }
}
