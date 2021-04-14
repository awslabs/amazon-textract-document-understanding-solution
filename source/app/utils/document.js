
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

import {
  ascend,
  either,
  flatten,
  indexBy,
  is,
  isEmpty,
  isNil,
  lensPath,
  multiply,
  path,
  pipe,
  prop,
  range,
  reject,
  sortBy,
  sortWith,
  view,
  memoizeWith,
} from 'ramda'

import {
  COMPREHEND_MEDICAL_SERVICE,
  COMPREHEND_SERVICE
} from './dus-constants'

import {getEscapedStringRegExp} from './getEscapedStringRegExp'

// Location of Blocks within a document object
const lensDocumentBlocks = lensPath(['textractResponse', 'Blocks'])

// Location of page count within single/multi page document
const lensPageCount = lensPath(['textractResponse', 'DocumentMetadata', 'Pages'])
const lensMultiPageCount = lensPath(['textractResponse', 0, 'DocumentMetadata', 'Pages'])

/**
 * Get a PAGE block by page number
 * @param {Object} document A Textract document object
 * @param {Number} pageNumber A page number
 * @return {Object}
 */
function getPage(document, pageNumber) {
  const blocks = getDocumentBlocks(document)
  const pageBlocks = blocks.filter(
    ({ BlockType, Page }) =>
      // Single page docs only have one PAGE, and it doesn't include a Page prop
      BlockType === 'PAGE' && (Page === pageNumber || (pageNumber === 1 && !Page))
  )
  return isEmpty(pageBlocks) ? {} : pageBlocks[0]
}


/**
 * Get all Blocks for a given document.
 * @param {Object} document A Textract document object
 * @return {Array}
 */
function getDocumentBlocks(document) {
  if (either(isNil, isEmpty)(document) || !document.textractResponse) return []
  const isChunkedResponse = is(Array, document.textractResponse)
  const combinedChunks =
    isChunkedResponse &&
    document.textractResponse.reduce((accumulator, { Blocks }) => accumulator.concat(Blocks), [])
    return isChunkedResponse ? combinedChunks : view(lensDocumentBlocks, document) || []
}

/**
 * Get all Blocks for a given document, in an object indexed by ID
 * @param {Object} document A Textract document object
 * @return {Object}
 */
function getIndexedDocumentBlocks(document) {
  const blocks = getDocumentBlocks(document)
  const indexedBlocks = indexBy(prop('Id'), blocks)
  return indexedBlocks
}

/**
 * Memoized version of the above, since indexing blocks by ID is a
 * common and very expensive task on very large documents
 */
const memoizedGetIndexedBlocks = memoizeWith(
  doc => [doc.id, doc.textractFetchedAt].join(),
  getIndexedDocumentBlocks
)

/**
 * Get a list of Blocks matching the IDs provided.
 * @param {Object} document A Textract document object
 * @param {Array} ids An array of Block IDs to get
 * @return {Array}
 */
function getDocumentBlocksByIds(document, ids) {
  const indexedBlocks = memoizedGetIndexedBlocks(document)
  return ids.reduce((accumulator, current) => {
    return indexedBlocks[current] ? [...accumulator, indexedBlocks[current]] : accumulator
  }, [])
}

/**
 * Get text/boolean content of VALUE or CELL Blocks.
 * @param {Object} document A Textract document object
 * @param {Array} ids An array of Block IDs
 * @return {Boolean|String}
 */
function getCellOrValueContents(document, ids) {
  if (!ids) return ''
  const contentBlocks = getDocumentBlocksByIds(document, ids)

  let isCheckbox = false
  const value = contentBlocks.map(({ Text, BlockType, SelectionStatus }) => {
    if (BlockType === 'SELECTION_ELEMENT') isCheckbox = true
    return BlockType === 'WORD' ? Text : SelectionStatus === 'SELECTED'
  })

  // If the value is a checkbox, we want to retain it as a boolean value
  // instead of joining it, which converts it to a string
  return isCheckbox ? (value[0] ? 'Yes' : 'No') : value.join(' ')
}

/**
 * Get a page's child Blocks of a given type.
 * @param {Object} document A Textract document object
 * @param {Number} pageNumber A page number
 * @param {String} type A BlockType
 * @return {Array}
 */
function getPageChildrenByType(document, pageNumber, type) {
  const Relationships = prop('Relationships', getPage(document, pageNumber)) || []
  const childBlockIds = path([0, 'Ids'], Relationships) || []
  const children = getDocumentBlocksByIds(document, childBlockIds)
  const filteredChildren = type ? filterBlocksByType(children, type) : children

  return filteredChildren
}



/**
 * Get test from a list of LINE Blocks
 * @param {Array} blocks An array of LINE Blocks
 * @return {Array}
 */
function transformLineBlocksToText(blocks) {
  return blocks.map(({ Text }) => Text)
}

/**
 * Filter a list of Blocks with a given BlockType.
 * @param {Array} blocks An array of Blocks
 * @param {String} type A BlockType
 * @return {Array}
 */
function filterBlocksByType(blocks, type) {
  return blocks.filter(({ BlockType }) => BlockType === type)
}

/**
 * Get the total number of pages in a document.
 * @param {Object} document A Textract document object
 * @return {Number}
 */
export function getDocumentPageCount(document) {
  const isChunkedResponse = is(Array, document.textractResponse)
  return view(isChunkedResponse ? lensMultiPageCount : lensPageCount, document)
}

export function getDocumentLines(document) {
  const totalPages = getDocumentPageCount(document)

  const linesByPage = range(1, totalPages + 1).map(pageNumber => {
    const lines = getPageLines(document, pageNumber)
    return lines
  })

  return flatten(linesByPage)
}

/**
 * Get lines of text found in a page.
 * @param {Object} document A Textract document object
 * @param {Number} pageNumber The page number to get results for
 * @return {Array}
 */
export function getPageLines(document, pageNumber) {
  const lines = getPageChildrenByType(document, pageNumber, 'LINE')
  return lines.map(({ Text, Geometry, Page }) => {
    return {
      text: Text,
      pageNumber: Page,
      boundingBox: Geometry.BoundingBox,
    }
  })
}

export function getDocumentBlocksByType(document, type) {
  const blocks = getDocumentBlocks(document)
  return filterBlocksByType(blocks, type)
}

export function countDocumentKeyValuePairs(document) {
  const keyValueSetBlocks = getDocumentBlocksByType(document, 'KEY_VALUE_SET')

  // Filter those down to get the blocks of EntityType KEY
  // NOTE: EntityTypes is an array, even though it only ever contains one value
  const keyBlocks = keyValueSetBlocks.filter(({ EntityTypes }) => EntityTypes.indexOf('KEY') >= 0)

  return keyBlocks.length
}

/**
 * Get forms found in a page.
 * @param {Object} document A Textract document object
 * @param {Number} pageNumber The page number to get results for
 * @return {Array}
 */
export function getDocumentKeyValuePairs(document) {
  const totalPages = getDocumentPageCount(document)

  const blocksByPage = range(1, totalPages + 1).map(pageNumber => {
    const blocks = getPageKeyValuePairs(document, pageNumber)
    return blocks.map(b => {
      return {
        ...b,
        pageNumber,
      }
    })
  })
  return flatten(blocksByPage)
}

/**
 * Get entities found in a page.
 * @param {Object} document A Comprehend document object
 * @param {String} comprehendService The comprehend Service being used : Comprehend/ComprehendMedical
 * @return {Array}
 */
export function getDocumentEntityPairs(document,comprehendService) {
  const totalPages = getDocumentPageCount(document)
  let MERGE_KEY = null
  if (comprehendService == COMPREHEND_MEDICAL_SERVICE){
    MERGE_KEY = 'Category'
  }else{
    MERGE_KEY = 'Type'
  }
  const blocksByPage = range(1, totalPages + 1).map(pageNumber => {
    const blocks = getPageEntityPairs(document, pageNumber,comprehendService)
    const entity_array = consolidateDictionaryList(blocks["Entities"],MERGE_KEY,"Text")
    return entity_array.map(b => {
      return{
      ...b,
      pageNumber,
    }})
  
  })
  return (isEmpty(blocksByPage) ? [] : [].concat.apply([], blocksByPage))
}

export function consolidateDictionaryList(dictionaryList, mergeKey , mergeValue){
  let output = []
  let entity_object = {}
  let processing_dict = {}
  dictionaryList.forEach(function(item) {
    if (!(item[mergeKey] in processing_dict)){
      processing_dict[item[mergeKey]] = new Set()
    }
    processing_dict[item[mergeKey]].add(item[mergeValue])
});
  const entityDictKeys = Object.keys(processing_dict)
  for (const key of entityDictKeys) {
    entity_object["entity"] = key
    entity_object["value"] =  [...processing_dict[key]]
    output.push(entity_object)
    entity_object = {}
  }
  
  return output
}

export function resetFormsonPage() {
  let formsCollection=document.forms
  for(let i=0;i<formsCollection.length;i++){
  formsCollection[i].reset();
  }
}


/**
 * Get forms found in a page.
 * @param {Object} document A Comprehend/Comprehend Medical document object
 * @param {Number} pageNumber The page number to get results for
 * @param {String} comprehendService The comprehend service used : Comprehend/ComprehendMedical
 * @return {Array}
 */
export function getPageEntityPairs(document, pageNumber,comprehendService) {
  // Get all blocks of Entities for a PAGE
  let blocks = []
  if (comprehendService == COMPREHEND_MEDICAL_SERVICE){
   blocks = document.comprehendMedicalRespone["results"]
  }else{
   blocks = document.comprehendRespone["results"]  
  }
  const pageBlocks= blocks.filter(
    ({ Entities, Page }) =>
      // Single page docs only have one PAGE, and it doesn't include a Page prop
    Page === pageNumber 
  )
  return (isEmpty(pageBlocks) ? {} : pageBlocks[0])
}

/**
 * Get forms found in a page.
 * @param {Object} document A Textract document object
 * @param {Number} pageNumber The page number to get results for
 * @return {Array}
 */
export function getPageKeyValuePairs(document, pageNumber) {
  // Get all blocks of BlockType KEY_VALUE_SET for a PAGE
  const keyValueSetBlocks = getPageChildrenByType(document, pageNumber, 'KEY_VALUE_SET')

  // Filter those down to get the blocks of EntityType KEY
  // NOTE: EntityTypes is an array, even though it only ever contains one value
  const keyBlocks = keyValueSetBlocks.filter(({ EntityTypes }) => EntityTypes.indexOf('KEY') >= 0)

  // Iterate over each KEY block
  const pairs = keyBlocks.map(({ Id, Relationships, Geometry }) => {
    // Get related VALUE blocks and WORD blocks for this KEY block
    const valueBlockIds = path([0, 'Ids'], Relationships) || []
    const keyWordIds = path([1, 'Ids'], Relationships) || []
    const keyWordBlocks = getDocumentBlocksByIds(document, keyWordIds)
    const valueBlocks = getDocumentBlocksByIds(document, valueBlockIds)

    // Get WORD blocks for each VALUE block
    const valueWordIds = valueBlocks.reduce((accumulator, { Relationships }) => {
      const childIds = Relationships ? Relationships[0].Ids : []
      return [...accumulator, ...childIds]
    }, [])
    // Finally, return a simple object containing joined KEY and VALUE words
    const key = keyWordBlocks.map(({ Text }) => Text).join(' ')
    const value = getCellOrValueContents(document, valueWordIds)

    return {
      id: Id,
      key,
      value,
      keyBoundingBox: Geometry.BoundingBox,
      valueBoundingBox: valueBlocks[0].Geometry.BoundingBox,
    }
  })

  return sortBy(x => x.keyBoundingBox.Top + 0.05 * x.keyBoundingBox.Left)(
    pairs.filter(p => p.key || p.value)
  )
}

export function getDocumentTables(document) {
  const totalPages = getDocumentPageCount(document)

  const blocksByPage = range(1, totalPages + 1).map(pageNumber => {
    const blocks = getPageTables(document, pageNumber)
    return blocks.map(b => {
      return {
        ...b,
        pageNumber,
      }
    })
  })
  return (isEmpty(blocksByPage) ? [] : [].concat.apply([], blocksByPage))
}

/**
 * Get tables/rows/cells found in a page.
 * @param {Number} pageNumber The page number to get results for
 * @param {Object} document A Textract document object
 * @return {Array}
 */
export function getPageTables(document, pageNumber) {
  // Get all blocks of BlockType TABLE for a PAGE
  const tableBlocks = getPageChildrenByType(document, pageNumber, 'TABLE')

  // Iterate each TABLE in order to build a new data structure
  const tables = tableBlocks.map(table => {
    const { Relationships } = table
    // Get all blocks of BlockType CELL within this TABLE
    const cellBlockIds = path([0, 'Ids'], Relationships) || []
    const cellBlocks = getDocumentBlocksByIds(document, cellBlockIds)

    // Iterate each CELL in order to build an array for each row containing an object for each cell
    const rowData = cellBlocks.reduce((accumulator, current) => {
      const { RowIndex, ColumnIndex, RowSpan, ColumnSpan, Relationships, Geometry } = current
      const contentBlockIds = path([0, 'Ids'], Relationships) || []
      const row = accumulator[RowIndex - 1] || []
      row[ColumnIndex - 1] = {
        RowIndex,
        ColumnIndex,
        RowSpan,
        ColumnSpan,
        content: getCellOrValueContents(document, contentBlockIds),
        Geometry,
      }
      accumulator[RowIndex - 1] = row
      return accumulator
    }, [])

    return { table, rows: rowData }
  })

  return tables
}


export function getMultiPageWordsBySearch(document,pageNumber,wordList){
  const wordRegexes = wordList.map(word => new RegExp(getEscapedStringRegExp(word)))

  return getPageWordsBySearch(document, pageNumber, wordRegexes)
}

/**
 * Get WORD blocks that match a search query on a page.
 * @param {Object} document A Textract document object
 * @param {Number} pageNumber The page number to get results for
 * @param {RegExp[]} searchQueries The regular expresion to find in the document
 * @return {Array}
 */
export function getPageWordsBySearch(document, pageNumber, searchQueries) {
  if (!searchQueries) return []
  
  // Get all the LINE Blocks for a PAGE that match the searchQuery
  const lines = getPageChildrenByType(document, pageNumber, 'LINE')
  const matchingLines = lines.filter(({ Text }) => searchQueries.some(query => query.test(Text)))

  // Get all the WORD Blocks for each LINE that match the searchQuery
  const matchingWords = matchingLines.reduce((accumulator, { Relationships }) => {
    const wordIds = path([0, 'Ids'], Relationships) || []
    
    // Sort all the WORD Blocks in order from left to right
    const wordBlocks = sortWith([ascend(path(['Geometry', 'BoundingBox', 'Left']))])(
      getDocumentBlocksByIds(document, wordIds)
    )
    
    const wordText = wordBlocks.map(word => word.Text).join(' ')
    
    function getWordIndexByStringIndex(idx) {
      let searchIndex = 0
      let wordIndex
      for (wordIndex = 0; wordIndex < wordBlocks.length; wordIndex++) {
        const word = wordBlocks[wordIndex]
        
        if (idx < searchIndex + word.Text.length + 1) return wordIndex
        searchIndex += word.Text.length + 1
      }
      return wordIndex
    }


    const matchingWordBlocks = searchQueries.flatMap(query => {
      const res = query.exec(wordText)
      
      const queryMatchingWordBlocks = []

      if (res !== null) {
        const startIndex = res.index
        const endIndex = startIndex + res[0].length
        const startWord = getWordIndexByStringIndex(startIndex)
        const endWord = getWordIndexByStringIndex(endIndex)
  
        for (let i = startWord; i <= endWord; i++) {
          if (!queryMatchingWordBlocks.includes(wordBlocks[i])) queryMatchingWordBlocks.push(wordBlocks[i])
        }
      }

      return queryMatchingWordBlocks
    })

    // TODO most of the below logic can probably be removed / consolidated into the above

    // Pick specific props from each WORD Block
    const matchingWordBounds = matchingWordBlocks.map(
      ({
        Text,
        Geometry: {
          BoundingBox: { Top, Left, Width, Height },
        },
      }) => ({
        Text,
        Top,
        Left,
        Width,
        Height,
      })
    )

    // Sort all the words by their location from top/left to bottom/right
    const matchingWordBoundsSorted = sortWith([
      ({ Top: a }, { Top: b }) => {
        const difference = pipe(
          Math.abs,
          multiply(100),
          Math.floor
        )(a - b)
        return !difference ? 0 : a < b ? -1 : a > b ? 1 : 0
      },
      ascend(path(['Left'])),
    ])(matchingWordBounds)

    // Combine words together such that they match the query (and merge their bounding box info)
    let unmatched = null
    const matchingWordBoundsCombined = matchingWordBoundsSorted.reduce((accumulator, word) => {
      const wordMatches = searchQueries.some(query => query.test(word.Text))

      // If a single word matches the query, add it to the list
      if (wordMatches) {
        unmatched = null
        return [...accumulator, word]
      }

      // If there's an unmatched word from a previous iteration,
      // see if combining the two will match the query
      if (unmatched) {
        const combinedText = `${unmatched.Text} ${word.Text}`
        const combinedWords = {
          Text: combinedText,
          Top: Math.max(unmatched.Top, word.Top),
          Left: Math.min(unmatched.Left, word.Left),
          Width: word.Left - unmatched.Left + word.Width,
          Height: Math.max(unmatched.Height, word.Height),
        }
        const combinedWordsMatch = searchQueries.some(query => query.test(combinedText))

        // If the combined words match the query, add it to the list
        if (combinedWordsMatch) {
          unmatched = null
          return [...accumulator, combinedWords]
        }

        // Otherwise, update unmatched with the combined words object
        unmatched = combinedWords
      } else {
        // If there wasn't an unmatched word from a previous iteration, set unmatched
        unmatched = word
      }

      return accumulator
    }, [])

    return accumulator.concat(matchingWordBoundsCombined)
  }, [])
  return matchingWords
}

export const getAreRedactionsOnDocument = document => !!document.redactions && Object.values(document.redactions).some((redactionsOnPage) => Object.values(redactionsOnPage).length > 0);