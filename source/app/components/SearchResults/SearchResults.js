
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

import React, { useMemo } from 'react'
import classNames from 'classnames'
import Link from 'next/link'
import PropTypes from 'prop-types'

import Highlight from '../../components/Highlight/Highlight'
import Loading from '../../components/Loading/Loading'

import { MIN_SEARCH_QUERY_LENGTH } from '../../constants/configs'
import { makeDocumentLink } from '../../utils/link-generators'

import css from './SearchResults.module.scss'

SearchResults.propTypes = {
  className: PropTypes.string,
  results: PropTypes.array,
  searchQuery: PropTypes.string,
  searchStatus: PropTypes.string,
  searchTotalDocuments: PropTypes.number,
  searchTotalMatches: PropTypes.number,
}

SearchResults.defaultProps = {
  results: [],
}

export default function SearchResults({
  className,
  results,
  searchQuery,
  searchStatus,
  searchTotalDocuments,
  searchTotalMatches,
  isComparing,
  ...rest
}) {
  const searchResultsClassNames = classNames(css.searchResults, className)
  const isQueryLongEnough = searchQuery && searchQuery.length >= MIN_SEARCH_QUERY_LENGTH

  if (!searchStatus || !searchQuery) return null

  const highlightRegex = useMemo(() => {
    const words = searchQuery.split(/\W+/).filter(Boolean).map(x => `\\b${x}\\b`)
    return new RegExp('(?:' + words.join('|') + ')', 'i');
  }, [ searchQuery ])

  return (
    <nav className={searchResultsClassNames} {...rest}>
      <header className={classNames(isComparing && css.comparing)}>
        <h2>Amazon Elasticsearch Service{!isComparing ? ' Results' : ''}</h2>
        { isComparing ?
          <p>Keyword search results</p>
        : null }
      </header>

      {!isQueryLongEnough && (
        <p className={css.noContent}>
          Enter a search query longer than {MIN_SEARCH_QUERY_LENGTH - 1} characters to initiate a
          search.
        </p>
      )}

      {!searchTotalDocuments && searchStatus !== 'pending' && (
        <p className={css.noContent}>No results found.</p>
      )}

      {!!searchTotalDocuments && searchStatus !== 'pending' && (
        <div className={css.searchSummary}>
          {`Found about ${searchTotalMatches} ${
            searchTotalMatches === 1 ? 'result' : 'results'
          } across ${searchTotalDocuments} ${
            searchTotalDocuments === 1 ? 'document' : 'documents'
          }`}
        </div>
      )}

      {searchStatus === 'success' && isQueryLongEnough && (
        <ul>
          {results.map(({ documentId: id, count, name, lines }) => {
            if (!count) return null
            return (
              <li className={css.resultItem} key={id}>
                <Link {...makeDocumentLink(id)}>
                  <a>
                    <header>
                      <h3><Highlight search={highlightRegex}>{name}</Highlight></h3>
                    </header>
                    <ul className={css.lines}>
                      {lines.slice(0, 4).map((line, i) => (
                        <li key={i}>
                          &hellip;<Highlight search={highlightRegex}>{line}</Highlight>&hellip;
                        </li>
                      ))}
                    </ul>
                  </a>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </nav>
  )
}
