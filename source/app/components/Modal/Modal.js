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

import React, { useCallback } from "react";
import ReactDOM from "react-dom";

import css from "./Modal.module.scss";

export default function Modal({ title, children, onRequestClose }) {
  const stopProp = useCallback((e) => {
    e.stopPropagation();
  }, []);

  return ReactDOM.createPortal(
    <div className={css.container} onClick={onRequestClose}>
      <div className={css.modal} onClick={stopProp}>
        <header>
          <h2>{title}</h2>
          <a className={css.closeButton} onClick={onRequestClose}>
            <svg width={20} height={20}>
              <path d="M5,5l10,10M5,15l10,-10" />
            </svg>
          </a>
        </header>
        <div className={css.content}>{children}</div>
      </div>
    </div>,
    document.body
  );
}
