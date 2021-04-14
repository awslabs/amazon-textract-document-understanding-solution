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

import React from "react";
import PropTypes from "prop-types";
import classNames from "classnames";
import css from "./ContextModal.module.scss";

Modal.propTypes = {
  children: PropTypes.node.isRequired,
  onClose: PropTypes.func.isRequired,
  show: PropTypes.bool.isRequired,
  modalTitle: PropTypes.string.isRequired,
};
export default function Modal({ children, onClose, show, modalTitle }) {
  const modalClassNames = classNames(css.modal);
  if (!show) {
    return null;
  }
  return (
    show && (
      <div className={css.modal} id="modal">
        <div className={css.modal__content}>
          <h4>{modalTitle}</h4>
          <div className={css.content}>
            <p>{children}</p>
          </div>
          <div className={css.actions}>
            <button className="toggle-button" onClick={onClose}>
              OK
            </button>
          </div>
        </div>
      </div>
    )
  );
}
