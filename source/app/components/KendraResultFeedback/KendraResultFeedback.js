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

import React, { useState, useCallback } from "react";

import cs from "classnames";
import styles from "./KendraResultFeedback.module.scss";

function Thumb() {
  return (
    <path d="M64.5,32c1.6-5.7,0.6-11.8-2.7-16.7l-1.3-2c-1-1.5-2.7-2.4-4.5-2.3c-1.8,0.1-3.4,1.1-4.3,2.8c-1.5,3-3.4,5.7-5.5,8.1   c-1.9,2.2-3.5,3.6-5.4,5.1c-1.7,1.5-3.7,3.1-6,5.6c-2.7,2.9-5.1,6.2-7.2,9.6l-13.2,2c-3.1,0.5-5.4,3.2-5.4,6.3l0.3,23.5   c0,3.4,2.9,6.2,6.3,6.2h18.2l26.3,6.5l0.1,0c1.2,0.3,2.5,0.4,3.7,0.4c7.1,0,13.7-4.1,16.7-10.8c1.6-3.5,3.1-7.3,4.5-11.2   c1.9-5.3,3.5-10.8,4.6-16.4c0.4-2.1-0.1-4.3-1.3-6c-1.3-1.7-3.2-2.8-5.4-3.1c-3.5-0.3-6.4-0.6-9-0.9c-4.1-0.4-7.7-0.7-12.4-1.2   l2.8-5.5L64.5,32z M73.4,46c2.7,0.2,5.5,0.5,9,0.9c0.2,0,0.4,0.2,0.5,0.3c0.1,0.1,0.2,0.3,0.1,0.5c-1,5.2-2.5,10.4-4.3,15.3   c-1.4,3.7-2.8,7.3-4.3,10.7c-2.1,4.8-7.4,7.4-12.5,6.4l-27.1-6.7H16.4l-0.3-22.2l16-2.4l0.8-1.5c1.9-3.5,4.3-6.8,7-9.8   c2-2.2,3.6-3.5,5.4-5c1.9-1.6,3.9-3.2,6.1-5.9c1.8-2.1,3.5-4.4,4.9-6.8c1.8,3,2.3,6.6,1.5,10l-7,13.8l5,0.6   C63.2,45,68,45.5,73.4,46z" />
  );
}

export default function KendraResultFeedback({ result, submitFeedback }) {
  const [submitted, setSubmitted] = useState(null);

  const submitPositive = useCallback(() => {
    setSubmitted("RELEVANT");
    submitFeedback("RELEVANT", result);
  }, [submitFeedback, result]);

  const submitNegative = useCallback(() => {
    setSubmitted("NOT_RELEVANT");
    submitFeedback("NOT_RELEVANT", result);
  }, [submitFeedback, result]);

  return (
    <div data-walkthrough="feedback">
      <button
        disabled={!!submitted}
        className={cs(
          styles.button,
          submitted === "NOT_RELEVANT" && styles.selected,
          styles.negative
        )}
        onClick={submitNegative}
      >
        <svg viewBox="0 0 150 150">
          <g transform="translate(25 25) rotate(180 50 50)">
            <Thumb />
          </g>
        </svg>
      </button>
      <button
        disabled={!!submitted}
        className={cs(
          styles.button,
          submitted === "RELEVANT" && styles.selected,
          styles.positive
        )}
        onClick={submitPositive}
      >
        <svg viewBox="0 0 150 150">
          <g transform="translate(25 25)">
            <Thumb />
          </g>
        </svg>
      </button>
    </div>
  );
}
