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

import React, { useCallback, useEffect, useState, useMemo } from "react";
import { connect } from "react-redux";
import cs from "classnames";

import { getSelectedSearch } from "../../store/ui/selectors";
import { setSelectedSearch } from "../../store/ui/actions";

import styles from "./SearchTypeTabs.module.scss";

function SearchTypeTabs({ selectedSearch, setSelectedSearch }) {
  const selectES = useCallback(() => {
    setSelectedSearch("es");
  }, [setSelectedSearch]);
  const selectKendra = useCallback(() => {
    setSelectedSearch("kendra");
  }, [setSelectedSearch]);
  const selectBoth = useCallback(() => {
    setSelectedSearch("both");
  }, [setSelectedSearch]);

  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    function resized() {
      setWidth(window.innerWidth);
    }

    window.addEventListener("resize", resized);

    return () => {
      window.removeEventListener("resize", resized);
    };
  }, []);

  const canShowSideBySide = useMemo(() => width >= 1000, [width]);

  useEffect(() => {
    if (selectedSearch === "both" && !canShowSideBySide) {
      setSelectedSearch("es");
    }
  }, [selectedSearch, canShowSideBySide]);

  return (
    <div className={styles.wrapper}>
      <a
        className={cs(styles.tab, selectedSearch === "es" && styles.selected)}
        onClick={selectES}
      >
        Amazon ES
        <span>Keyword Search Results</span>
      </a>
      <a
        className={cs(
          styles.tab,
          selectedSearch === "kendra" && styles.selected
        )}
        onClick={selectKendra}
      >
        Amazon Kendra
        <span>Semantic Search Results</span>
      </a>
      {canShowSideBySide ? (
        <a
          className={cs(
            styles.tab,
            selectedSearch === "both" && styles.selected
          )}
          onClick={selectBoth}
        >
          Amazon ES and Amazon Kendra
          <span>Compare Search Technologies</span>
        </a>
      ) : null}
    </div>
  );
}

export default connect(
  function mapStateToProps(state) {
    return {
      selectedSearch: getSelectedSearch(state),
    };
  },
  function mapDispatchToProps(dispatch) {
    return {
      setSelectedSearch: (type) => dispatch(setSelectedSearch(type)),
    };
  }
)(SearchTypeTabs);
