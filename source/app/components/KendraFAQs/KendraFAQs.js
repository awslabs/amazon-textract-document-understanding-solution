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
import KendraFAQItem from "../KendraFAQItem/KendraFAQItem";
import TooltipButton from "../TooltipButton/TooltipButton";

import css from "./KendraFAQs.module.scss";

export default function KendraFAQs({ results, submitFeedback }) {
  if (!results.length) return null;

  return (
    <div className={css.faqs}>
      <header>
        <h2>
          Frequently asked questions
          <TooltipButton
            tooltip={
              <>
                <h4>Frequently asked questions</h4>
                <p>
                  You can upload a list of FAQs to Kendra to provide direct
                  answers to common questions your end users are asking. Kendra
                  will find the closest question to the search query and return
                  the corresponding answer.
                </p>
              </>
            }
          >
            <a>
              <img src="/images/icon_tip.svg" />
              More info
            </a>
          </TooltipButton>
        </h2>
      </header>
      {results.map((item) => (
        <KendraFAQItem
          item={item}
          key={item.Id}
          submitFeedback={submitFeedback}
        />
      ))}
    </div>
  );
}
