
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

import { lensPath } from "ramda";

export const lensSampleDocuments = lensPath([
  "entities",
  "sampleDocuments",
  "single"
]);
export const lensSampleCollections = lensPath([
  "entities",
  "sampleDocuments",
  "collections"
]);

export default {
  single: {
    expense: {
      id: "expense.png",
      object: "public/samples/Misc/expense.png",
      title: "Expense Report",
      previewImage: "/images/sample-previews/expense.png"
    },
    employment: {
      id: "employmentapp.pdf",
      object: "public/samples/Research/employmentapp.png",
      title: "Employment App",
      previewImage: "/images/sample-previews/employmentapp.png"
    },
    management: {
      id: "management.png",
      object: "public/samples/Misc/management.png",
      title: "Management Report",
      previewImage: "/images/sample-previews/management.png"
    }
  },

  collections: {
    finance: {
      id: "finance",
      title: "Finance",
      previewImage: "/images/sample-previews/Lacey city bonds.png",
      objects: [
        "public/samples/Finance/Lacey city bonds.png",
        "public/samples/Finance/Spokane accounting.png",
        "public/samples/Finance/USDC balance sheet.png",
        "public/samples/Finance/USDE balance sheet.png"
      ]
    },
    medical: {
      id: "medical",
      title: "Medical",
      previewImage: "/images/sample-previews/history.png",
      objects: [
        "public/samples/Medical/HIPAA Release Form.pdf",
        "public/samples/Medical/Medical History Form.png",
        "public/samples/Medical/Medical Insurance Claim Form.pdf",
        "public/samples/Medical/Medical Progress Tracker.png"
      ]
    }
  }
};
