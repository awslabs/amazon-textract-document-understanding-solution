
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

import { createAction } from "redux-actions";
import { either, isEmpty, isNil, lensPath, reject, view } from "ramda";
import { normalize } from "normalizr";
import { API, Storage, Auth } from "aws-amplify";
import uuid from "uuid/v4";

import {
  SUBMIT_DOCUMENTS,
  SUBMIT_DOCUMENT,
  FETCH_DOCUMENTS,
  FETCH_DOCUMENT,
  REDACT_DOCUMENT,
  CLEAR_REDACTION,
  HIGHLIGHT_DOCUMENT,
  SAVE_REDACTIONS_STARTED,
  REDACTIONS_SAVED,
} from "../../../constants/action-types";
import { documentsSchema, documentSchema } from "./data";
import { ENABLE_COMPREHEND_MEDICAL } from '../../../constants/configs'
import { normalizeRedactionResponse, getRedactionsDto } from "../../../utils/redaction";

const lensNextToken = lensPath(["data", "nextToken"]);
const lensDocumentsTotal = lensPath(["data", "Total"]);
const lensDocumentsData = lensPath(["data", "documents"]);
const lensDocumentData = lensPath(["data"]);

export const submitDocument = createAction(
  SUBMIT_DOCUMENT,
  async ({ sample, key }) => {
    const response = await API.post("TextractDemoTextractAPI", "document", {
      headers: {
        Authorization: `Bearer ${(await Auth.currentSession())
          .getIdToken()
          .getJwtToken()}`
      },
      response: true,
      body: {
        sample: !!sample,
        key
      }
    });

    const data = view(lensDocumentData, response);
    return data;
  }
);

export const submitDocuments = createAction(
  SUBMIT_DOCUMENTS,
  async ({ objects }) => {
    const response = await API.post("TextractDemoTextractAPI", "document", {
      headers: {
        Authorization: `Bearer ${(await Auth.currentSession())
          .getIdToken()
          .getJwtToken()}`
      },
      response: true,
      body: {
        objects
      }
    });

    const data = view(lensDocumentData, response);
    return data;
  }
);

/**
 * Get documents from TextractDemoTextractAPIs
 */
export const fetchDocuments = createAction(
  FETCH_DOCUMENTS,
  async ({ nextToken: nexttoken } = {}) => {
    const response = await API.get("TextractDemoTextractAPI", "documents", {
      headers: {
        Authorization: `Bearer ${(await Auth.currentSession())
          .getIdToken()
          .getJwtToken()}`
      },
      response: true,
      queryStringParameters: reject(either(isNil, isEmpty), {
        nexttoken,
        type: "user"
      })
    });
    const documentsNextToken = view(lensNextToken, response) || null;
    const documentsTotal = view(lensDocumentsTotal, response);
    const documents = view(lensDocumentsData, response).map(document => ({
      ...document,
      documentName: document.objectName.replace(/^.*\//, "")
    }));
    const { entities } = normalize(documents, documentsSchema);
    const meta = reject(isNil, { documentsNextToken, documentsTotal });
    return { ...entities, meta };
  }
);

export const fetchSingleDocument = createAction(
  FETCH_DOCUMENT,
  async documentid => {
    const response = await API.get("TextractDemoTextractAPI", "document", {
      headers: {
        Authorization: `Bearer ${(await Auth.currentSession())
          .getIdToken()
          .getJwtToken()}`
      },
      response: true,
      queryStringParameters: {
        documentid
      }
    });

    const document = view(lensDocumentData, response);

    return normalize(document, documentSchema).entities;
  }
);

/**
 * Get document from TextractDemoTextractAPI and combine with redactions
 */
export const fetchDocument = createAction(FETCH_DOCUMENT, async documentid => {
  const session = await Auth.currentSession()
  const token = session.getIdToken().getJwtToken()

  const headers = {
    Authorization: `Bearer ${token}`
  }

  const response = await API.get("TextractDemoTextractAPI", "document", {
    headers,
    response: true,
    queryStringParameters: {
      documentid
    }
  });

  const document = view(lensDocumentData, response);
  const { documentId, objectName, bucketName } = document;

  // Remove the last slash and everything before it
  const documentName = objectName.replace(/^.*\//, "");
  const fileNameWithoutExtension = documentName.split(".")[0]
  // Amplify prepends public/ to the path, so we have to strip it
  const documentPublicSubPath = objectName.replace("public/", "");
  const resultDirectory = `${documentId}/output`;
  const textractResponsePath = `${resultDirectory}/textract/response.json`;
  const comprehendMedicalResponsePath = `${resultDirectory}/comprehend/comprehendMedicalEntities.json` 
  const comprehendResponsePath = `${resultDirectory}/comprehend/comprehendEntities.json` 
  
  
  // Get a pre-signed URL for the original document upload
  const [documentData, searchablePdfData, redactionsResponse] = await Promise.all([
    Storage.get(documentPublicSubPath, {
      bucket: bucketName,
      download: true
    }),
    Storage.get(`${resultDirectory}/${fileNameWithoutExtension}-searchable.pdf`, {
      download: true
    }),
    API.get("TextractDemoTextractAPI", "redaction", {
      headers,
      response: true,
      queryStringParameters: {
        documentId: documentid
      }
    })
  ]);

  const documentBlob = new Blob([documentData.Body], {
    type: documentData.contentType
  });
  const searchablePdfBlob = new Blob([searchablePdfData.Body], {
    type: "application/pdf"
  });

  // Get the raw textract response data from a json file on S3
  const s3Response = await Storage.get(textractResponsePath, {
    download: true
  });
  const s3ResponseText = await s3Response.Body?.text()
  const textractResponse = JSON.parse(s3ResponseText);

  // Get the raw comprehend medical response data from a json file on S3
  let comprehendMedicalRespone = null;
  if(ENABLE_COMPREHEND_MEDICAL){
    const s3ComprehendMedicalResponse = await Storage.get(comprehendMedicalResponsePath, {
      download: true
    });
    const s3ComprehendMedicalResponseText = await s3ComprehendMedicalResponse.Body?.text()
    comprehendMedicalRespone = JSON.parse(s3ComprehendMedicalResponseText);
  }
  // Get the raw comprehend response data from a json file on S3
  const s3ComprehendResponse = await Storage.get(comprehendResponsePath, {
    download: true
  });
  const s3ComprehendResponseText = await s3ComprehendResponse.Body?.text()
  const comprehendRespone = JSON.parse(s3ComprehendResponseText);

  const redactions = normalizeRedactionResponse(redactionsResponse.data.redactedItems)

  return normalize(
    {
      ...document,
      documentURL: URL.createObjectURL(documentBlob),
      searchablePdfURL: URL.createObjectURL(searchablePdfBlob),
      documentName,
      textractResponse,
      textractFetchedAt: Date.now(),
      comprehendMedicalRespone,
      comprehendRespone,
      resultDirectory,
      redactions,
    },
    documentSchema
  ).entities;

});

export const deleteDocument = createAction(FETCH_DOCUMENT, async documentid => {
  const response = await API.del("TextractDemoTextractAPI", "document", {
    headers: {
      Authorization: `Bearer ${(await Auth.currentSession())
        .getIdToken()
        .getJwtToken()}`
    },
    response: true,
    queryStringParameters: {
      documentid
    }
  });

  return normalize(
    {
      documentId: documentid,
      deleted: true
    },
    documentSchema
  ).entities;
});

export const addRedactions = createAction(
  REDACT_DOCUMENT,
  (documentId, pageNumber, redactions) => {
    const keyedRedactions = redactions.reduce((acc, r) => {
      acc[uuid()] = r;
      return acc;
    }, {});


    return normalize(
      {
        documentId,
        redactions: { [pageNumber]: keyedRedactions }
      },
      documentSchema
    ).entities;
  }
);

export const clearRedaction = createAction(
  CLEAR_REDACTION,
  (documentId, pageNumber, redactions, redactionId) => {
    const newRedactions = {...redactions[pageNumber]};

    delete newRedactions[redactionId];

    return {
        documentId,
        pageNumber,
        redactions: newRedactions,
      }
  }
);

export const addHighlights = createAction(
  HIGHLIGHT_DOCUMENT,
  
  (documentId, pageNumber, highlights) => {
    const response = normalize(
      {
        documentId,
        highlights:  highlights
      },
      documentSchema
    ).entities

    return response;
  });


export const clearRedactions = createAction(REDACT_DOCUMENT, documentId => {
  return normalize(
    {
      documentId,
      redactions: false
    },
    documentSchema
  ).entities;
});

export const clearHighlights = createAction(HIGHLIGHT_DOCUMENT, documentId => {
  return normalize(
    {
      documentId,
      highlights: []
    },
    documentSchema
  ).entities;
});

export const saveRedactions = (documentId, redactions) => {
  return async (dispatch) => {
    const session = await Auth.currentSession()
    const token = session.getIdToken().getJwtToken()
      
    const headers = {
      Authorization: `Bearer ${token}`
    }
    
    dispatch(saveRedactionsStarted())
    
    try {
      await API.post("TextractDemoTextractAPI", "redaction", {
        headers,
        response: true,
        queryStringParameters: {
          documentId
        },
        body: {
          uuid: documentId,
          headers: [],
          footers: [],
          redactedItems: getRedactionsDto(redactions)
        }
      });
    } finally {
      dispatch(redactionsSaved())
    }
  }
}


const saveRedactionsStarted = createAction(SAVE_REDACTIONS_STARTED)
const redactionsSaved = createAction(REDACTIONS_SAVED)
