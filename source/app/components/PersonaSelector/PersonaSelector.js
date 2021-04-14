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

import React, { useCallback, useState } from "react";
import { connect } from "react-redux";
import cs from "classnames";

import {
  getSearchQuery,
  getSearchStatus,
  getSearchPersona,
} from "../../store/entities/meta/selectors";
import {
  setSearchStatus,
  setSearchQuery,
  setSearchPersona,
} from "../../store/entities/meta/actions";


import css from "./PersonaSelector.module.scss";
import PersonaInfoModal from "../PersonaInfoModal/PersonaInfoModal";

function PersonaSelector({ dispatch, searchQuery, searchPersona }) {
  const personaChange = useCallback(
    (persona) => {
      dispatch(setSearchPersona(persona));
    },
    [dispatch, searchQuery]
  );

  const [showingInfoModal, setShowingInfoModal] = useState(false);

  const showInfoModal = useCallback(() => {
    setShowingInfoModal(true);
  }, []);

  const hideInfoModal = useCallback(() => {
    setShowingInfoModal(false);
  }, []);

  const onModalSubmit = useCallback(
    (persona, query) => {
      personaChange(persona);
      if (query) {
        dispatch(setSearchQuery(query));
      }
      setShowingInfoModal(false);
    },
    [personaChange, dispatch]
  );

  return (
    <div className={css.container}>
      <div
        className={cs(css.filterButton, searchPersona && css.hasFilter)}
        onClick={showInfoModal}
      >
        Filter
      </div>
      {showingInfoModal ? (
        <PersonaInfoModal onClose={hideInfoModal} onSubmit={onModalSubmit} />
      ) : null}
    </div>
  );
}

export default connect(function mapStateToProps(state) {
  return {
    searchQuery: getSearchQuery(state),
    searchStatus: getSearchStatus(state),
    searchPersona: getSearchPersona(state),
  };
})(PersonaSelector);
