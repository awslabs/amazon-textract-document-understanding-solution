
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

import React, { Fragment, useCallback, useState, useEffect, useRef, forwardRef } from 'react'
import classNames from 'classnames'
import PropTypes from 'prop-types'
import { Document, Page, pdfjs } from 'react-pdf'
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

import Loading from '../Loading/Loading'
import Pager from '../Pager/Pager'
import TableDownloader from '../TableDownloader/TableDownloader'

import cs from 'classnames'
import css from './DocumentViewer.module.scss'
import {Tooltip} from '@chakra-ui/react'
import {useDispatch} from 'react-redux';


DocumentViewer.propTypes = {
  className: PropTypes.string,
  document: PropTypes.object,
  marks: PropTypes.array,
  pageCount: PropTypes.number,
  onRedactionClick: PropTypes.func,
  onMarkClick: PropTypes.func,
  isComplianceTrack: PropTypes.bool,
}

DocumentViewer.defaultProps = {}

export default function DocumentViewer({
  className,
  document,
  marks,
  redactions,
  tables,
  pageCount,
  highlightedMark,
  onRedactionClick,
  onMarkClick,
  isComplianceTrack,
  redactMatches,
  ...rest
}) {
  const { searchablePdfURL, documentURL } = document
  const isPDF = true // /.pdf$/.test(documentName)
  const viewerClassNames = classNames(css.viewer, className, isPDF && css.pdfViewer)
  const { containerRef, documentWidth, handleResize } = useDocumentResizer(isPDF, [marks, tables])
  const onLoadSuccess = useCallback(handleResize, [])
  const dispatch = useDispatch();

  const pager = (
    <Pager className={css.pager} pageTotal={pageCount}>
      {currentPageNumber =>
        <>
          {
              isPDF ? (
                <DocumentMarks
                  marks={marks}
                  highlightedMark={highlightedMark}
                  tables={tables}
                  redactions={redactions}
                  onRedactionClick={onRedactionClick}
                  onMarkClick={onMarkClick}
                  ref={containerRef}
                  isComplianceTrack={isComplianceTrack}
                  >
                  <Page
                    className={css.page}
                    loading={<Loading />}
                    pageNumber={currentPageNumber}
                    width={documentWidth}
                    renderAnnotationLayer={false}
                    />
                </DocumentMarks>
              ) : (
                <div className={css.imageWrapper}>
                  <DocumentMarks
                    marks={marks}
                    highlightedMark={highlightedMark}
                    tables={tables}
                    redactions={redactions}
                    onRedactionClick={onRedactionClick}
                    onMarkClick={onMarkClick}
                    isComplianceTrack={isComplianceTrack}
                  >
                    <img className={css.image} src={documentURL} />
                  </DocumentMarks>
                </div>
              )
          }
        </>
      }
    </Pager>
  )
  return (
    <div className={viewerClassNames} {...rest}>
      {documentURL && isPDF && (
        <Document
          className={css.document}
          file={searchablePdfURL}
          loading={<Loading />}
          onLoadSuccess={onLoadSuccess}
        >
          {pager}
        </Document>
      )}

      {documentURL && !isPDF && pager}

      {!documentURL && <Loading />}
    </div>
  )
}

// Resize PDF on window resize
export function useDocumentResizer(isPDF, resizeDeps) {
  const containerRef = useRef(null)
  const [documentWidth, setDocumentWidth] = useState(0)

  const handleResize = useCallback(() => {
    const sz = containerRef && containerRef.current && containerRef.current.offsetWidth
    if (sz !== documentWidth) setDocumentWidth(sz)
  }, [documentWidth])

  // eslint-disable-next-line consistent-return
  useEffect(() => {
    if (isPDF) {
      window.addEventListener('resize', handleResize, { passive: true })
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [handleResize, isPDF])

  useEffect(() => {
    handleResize()
    setTimeout(() => {
      handleResize()
    }, 500)
  }, resizeDeps) // eslint-disable-line react-hooks/exhaustive-deps

  return { containerRef, documentWidth, handleResize }
}

export const DocumentMarks = forwardRef(function DocumentMarks(
  { children, marks , tables, redactions, onRedactionClick, onMarkClick, highlightedMark, isComplianceTrack, isExportPreview = false, },
  ref
) {

  return (
    <div className={css.canvasWrapper}>
      <div className={css.canvas} ref={ref}>
        {children}
        {marks &&
          marks.map(({ Text, Top, Left, Width, Height, type, id }, i) => {
            const key = `${id || ''}${type || ''}` || i

            const markProps = {
              className: cs(css.highlight, type, id === highlightedMark && css.highlighted),
              style: {
                top: `${Top * 100}%`,
                left: `${Left * 100}%`,
                width: `${Width * 100}%`,
                height: `${Height * 100}%`,
              },
            }

            return (
              isComplianceTrack ? 
                <Tooltip  key={key} hasArrow label="Click to redact" bg="rgb(24, 29, 43)" fontSize='1rem' color="white">
                  <mark {...markProps} onClick={() => onMarkClick({Text, Top, Left, Width, Height})} />
                </Tooltip> :
                <mark key={key} {...markProps} />
            )
          })}
        {redactions && (isComplianceTrack || isExportPreview) &&
          Object.entries(redactions).map(([id, { Top, Left, Width, Height }]) => {
            const key = id

            const markProps = {
              className: cs(css.redact, isExportPreview && css.exportPreviewRedaction),
              style: {
                top: `${Top * 100}%`,
                left: `${Left * 100}%`,
                width: `${Width * 100}%`,
                height: `${Height * 100}%`,
              }
            }


            return (
              isExportPreview ?
                <mark key={key} {...markProps} /> : 
                <Tooltip key={key} hasArrow label="Click to remove" bg="rgb(24, 29, 43)" fontSize='1rem' color="white">
                  <mark {...markProps} onClick={() => onRedactionClick(id)} />  
                </Tooltip>
            )
          })}
        {tables &&
          tables.map(({ table, rows }, i) => <TableHighlight key={i} table={table} rows={rows} />)}
      </div>
    </div>
  )
})

DocumentMarks.displayName = 'DocumentMarks'

DocumentMarks.propTypes = {
  children: PropTypes.node,
  marks: PropTypes.array,
  onRedactionClick: PropTypes.func,
  onMarkClick: PropTypes.func,
}

function TableHighlight({ table, rows }) {
  const { Top, Left, Width, Height } = table.Geometry.BoundingBox
  return (
    <>
      <mark
        className={css.highlight}
        style={{
          top: `${Top * 100}%`,
          left: `${Left * 100}%`,
          width: `${Width * 100}%`,
          height: `${Height * 100}%`,
        }}
      />
      <TableDownloader {...{ table, rows }} />
      {rows.map((r, i) => (
        <Fragment key={i}>
          {r.map((cell, i) => {
            const { Top, Left, Width, Height } = cell.Geometry.BoundingBox
            return (
              <mark
                className={css.cellHighlight}
                style={{
                  top: `${Top * 100}%`,
                  left: `${Left * 100}%`,
                  width: `${Width * 100}%`,
                  height: `${Height * 100}%`,
                }}
              />
            )
          })}
        </Fragment>
      ))}
    </>
  )
}
