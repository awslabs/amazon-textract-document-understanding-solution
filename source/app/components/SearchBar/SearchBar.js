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

import React, { useCallback, useEffect, useRef, useState } from "react";
import classNames from "classnames";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { throttle } from "lodash";
import { reject, isNil } from "ramda";

import Button from "../Button/Button";
import FormInput from "../FormInput/FormInput";

import {
  clearSearchQuery,
  setSearchQuery,
  setSearchStatus,
  setSearchPersona,
} from "../../store/entities/meta/actions";
import {
  getSearchQuery,
  getSearchStatus,
  getSearchPersona,
} from "../../store/entities/meta/selectors";
import {
  search,
  clearSearchResults,
} from "../../store/entities/searchResults/actions";

import { MIN_SEARCH_QUERY_LENGTH } from "../../constants/configs";

import css from "./SearchBar.module.scss";

SearchBar.propTypes = {
  className: PropTypes.string,
  dispatch: PropTypes.func,
  searchQuery: PropTypes.string,
  light: PropTypes.bool,
};

SearchBar.defaultProps = {};

function SearchBar({
  className,
  dispatch,
  searchQuery,
  searchPersona,
  light,
  suggestions,
  placeholder,
}) {
  const searchBarClassNames = classNames(css.searchBar, className);

  const [hasTerm, setHasTerm] = useState(!!searchQuery);
  const handleClearClick = useCallback(() => {
    dispatch(clearSearchQuery());
    input.current.value = "";
  }, [dispatch]);

  useEffect(() => {
    dispatch(clearSearchQuery());
    // eslint-disable-next-line
  }, []);

  const input = useRef();

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    dispatch(setSearchQuery(input.current.value));
    dispatch(setSearchPersona(undefined))
    input.current.blur();
  }, []);

  const searchValueChange = useCallback((e) => {
    setHasTerm(!!e.target.value);
  }, []);

  useEffect(() => {
    input.current.value = searchQuery;
    searchValueChange({ target: { value: searchQuery } });
  }, [searchQuery]);

  const selectSuggestion = useCallback(
    (q) => {
      dispatch(setSearchQuery(q));
      dispatch(setSearchPersona(undefined))
    },
    [dispatch]
  );

  return (
    <form className={searchBarClassNames} onSubmit={handleSubmit}>
      <div className={css.wrapper}>
        <FormInput
          ref={input}
          light={light}
          type="search"
          className={css.search}
          placeholder={placeholder || "Search..."}
          defaultValue={searchQuery}
          onChange={searchValueChange}
        />
        {hasTerm ? (
          <Button
            type="button"
            simple
            palette="black"
            className={css.clear}
            onClick={handleClearClick}
          >
            <svg
              height="24"
              viewBox="0 0 24 24"
              width="24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="m12 10.5857864 5.2928932-5.29289318c.3905243-.39052429 1.0236893-.39052429 1.4142136 0s.3905243 1.02368927 0 1.41421356l-5.2928932 5.29289322 5.2928932 5.2928932c.3905243.3905243.3905243 1.0236893 0 1.4142136s-1.0236893.3905243-1.4142136 0l-5.2928932-5.2928932-5.29289322 5.2928932c-.39052429.3905243-1.02368927.3905243-1.41421356 0s-.39052429-1.0236893 0-1.4142136l5.29289318-5.2928932-5.29289318-5.29289322c-.39052429-.39052429-.39052429-1.02368927 0-1.41421356s1.02368927-.39052429 1.41421356 0z" />
            </svg>
          </Button>
        ) : null}
        {suggestions ? (
          <div className={css.suggestions}>
            <ul>
              {suggestions.map((q) => (
                <li key={q} onClick={() => selectSuggestion(q)}>
                  {q}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      <Button onClick={handleSubmit}>Search</Button>
    </form>
  );
}

export default connect(function mapStateToProps(state) {
  return {
    searchQuery: getSearchQuery(state),
    searchStatus: getSearchStatus(state),
    searchPersona: getSearchPersona(state),
  };
})(SearchBar);
