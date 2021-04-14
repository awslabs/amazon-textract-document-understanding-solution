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

import React, { useState, useCallback, useRef } from "react";
import { connect } from "react-redux";
import { getSearchPersona } from "../../store/entities/meta/selectors";

import Modal from "../Modal/Modal";
import Button from "../Button/Button";
import css from "./PersonaInfoModal.module.scss";
import cs from "classnames";
import FormInput from "../FormInput/FormInput";

const PERSONA_QUESTIONS = [
  "What is muscle dystrophy?",
  "Is Muscular Dystrophy inherited?",
  "What causes Muscular Dystrophy?",
];

function PersonaInfoModal({ onClose, onSubmit, searchPersona }) {
  const [selectedPersona, setSelectedPersona] = useState(searchPersona);

  const inputRef = useRef();

  const submit = useCallback(
    (query) => {
      onSubmit(selectedPersona, query);
    },
    [onSubmit, selectedPersona]
  );

  const submitForm = useCallback(
    (e) => {
      e.preventDefault();
      submit(inputRef.current.value);
    },
    [submit]
  );

  const [apiVisible, setApiVisible] = useState(false);
  const toggleAPI = useCallback(() => setApiVisible((x) => !x), []);

  return (
    <Modal
      title="Filter query results on User Context"
      onRequestClose={onClose}
    >
      <p>
        Amazon Kendra can deliver highly relevant query results based on user
        name or group membership associated with the content metadata. Follow these simple steps, and see how this
        feature works.
      </p>

      <section>
        <header>
          <div className={css.stepLabel}>Step 1</div>
          <p>
            For this demo, we created fictitious users and search queries to
            showcase how the filtering feature works. Select one of the
            fictitious users below.
          </p>
        </header>

        <div className={css.personas}>
          <label>
            <img src="/images/healthcare-provider.png" />
            <input
              name="persona"
              type="radio"
              value="healthcareprovider"
              onChange={() => setSelectedPersona("healthcareprovider")}
              checked={selectedPersona === 'healthcareprovider'}
            />
            <h4>Healthcare provider</h4>
            <p>Has access to information for Healthcare Professionals.</p>
          </label>
          <label>
            <img src="/images/scientist.png" />
            <input
              name="persona"
              type="radio"
              value="scientist"
              onChange={() => setSelectedPersona("scientist")}
              checked={selectedPersona === 'scientist'}
            />
            <h4>Scientist</h4>
            <p>Has access to scientific papers and research documents.</p>
          </label>
          <label>
            <img src="/images/general-public.png" />
            <input
              name="persona"
              type="radio"
              value="generalpublic"
              onChange={() => setSelectedPersona("generalpublic")}
              checked={selectedPersona === 'generalpublic'}
            />
            <h4>General public</h4>
            <p>
              Has access to official guidance to prevent and manage diseases/medical conditions.
            </p>
          </label>
          <label>
            <img src="/images/nofilter.svg" />
            <input
              name="persona"
              type="radio"
              value=""
              onChange={() => setSelectedPersona(undefined)}
              checked={!selectedPersona}
            />
            <h4>No filter</h4>
            <p>Use this option for unfiltered search results.</p>
          </label>
        </div>
      </section>

      <section>
        <header>
          <div className={css.stepLabel}>Step 2</div>
          <p>
            Choose one of the auto suggested queries we’ve created to
            demonstrate this feature.
          </p>
        </header>

        <ul className={css.sampleQueries}>
          {PERSONA_QUESTIONS.map((q) => (
            <li onClick={() => submit(q)}>{q}</li>
          ))}
        </ul>
      </section>

      <aside className={css.notes}>
        Please note, this demo allows you to upload your own documents. If you
        do so, Amazon Kendra will index your documents and you'll be able to search
        through them. However, the filtering feature won't work. The three personas
        and Medical datasets are used to demonstrate the{" "}
        <strong>Filter query results on User Context</strong> feature.
      </aside>

      <div
        className={cs(css.toggleAPI, apiVisible && css.expanded)}
        onClick={toggleAPI}
      >
        Want to see the query filtering API? Check out the sample code
      </div>

      {apiVisible && (
        <>
          <section>
            <p>
              Amazon Kendra can deliver highly relevant query results based on
              user name or group membership. To enable this feature, documents
              must be indexed into Kendra along with their relevance to various
              users and groups. Queries can then include this information to
              obtain filtered results sets that matter to specific users. The
              code snippet below shows how this information is supplied.{" "}
            </p>
          </section>
          <section>
            <pre>
              {`
response = kendra.query(
  QueryText = query,
  IndexId = index,
  AttributeFilter = {
    "OrAllFilters": [
      {
        "EqualsTo": {
          "Key": "_user_id",
          "Value": {
            "StringValue": "user1"
          }
        }
      },
      {
        "EqualsTo": {
          "Key": "_group_ids",
          "Value": {
            "StringListValue": ["HR", "IT"]
          }
        }
      }
    ]
  }
)
`.trim()}
            </pre>
          </section>
          <p className={css.learnMore}>
            <a
              href="https://docs.aws.amazon.com/kendra/latest/dg/user-context-filter.html"
              target="_blank"
            >
              Learn more about this feature in the Amazon Kendra Developers page
            </a>
          </p>
        </>
      )}
    </Modal>
  );
}

export default connect(function mapStateToProps(state, { trackName }) {
  return {
    searchPersona: getSearchPersona(state),
  };
})(PersonaInfoModal);
