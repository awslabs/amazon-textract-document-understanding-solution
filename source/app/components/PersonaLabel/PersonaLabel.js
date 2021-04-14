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

import React, { useMemo, useState, useCallback } from "react";
import ReactDOM from 'react-dom';
import { useDispatch } from "react-redux";
import { setSearchPersona } from "../../store/entities/meta/actions";

import css from './PersonaLabel.module.scss';

const PERSONAS = {
  scientist: "Scientist",
  healthcareprovider: "Healthcare Provider",
  generalpublic: "General Public",
};

export default function PersonaLabel({
  persona
}) {
  const [ showingMenu, setShowingMenu ] = useState(false);
  const dispatch = useDispatch();

  const clearPersona = useCallback(() => {
    dispatch(setSearchPersona(undefined));
  }, []);

  const showMenu = useCallback(() => {
    setShowingMenu(true);
  }, []);

  const selectPersona = useCallback(which => {
    dispatch(setSearchPersona(which));
    setShowingMenu(false);
  }, []);

  return (
    <>
      <div className={css.wrapper}>
        <div className={css.personaLabel} onClick={showMenu}>
          {PERSONAS[persona]}
        </div>

        {showingMenu ?
          <div className={css.menu}>
            {Object.keys(PERSONAS).map(p => (
              <a key={p} onClick={() => selectPersona(p)}>
                {PERSONAS[p]}
              </a>
            ))}

            {ReactDOM.createPortal(
              <div className={css.overlay} />,
              document.body
            )}
          </div>
        : null}
      </div>

      <a className={css.removePersona} onClick={clearPersona}>
        Remove filter
      </a>
    </>
  )
}
