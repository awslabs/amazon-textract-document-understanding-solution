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
import Floater from "react-floater";

import css from "./TooltipButton.module.scss";
import { createPortal } from "react-dom";

export default function TooltipButton({ tooltip, children }) {
  const [ open, setOpen ] = useState(false);

  const onClick = useCallback(() => {
    setOpen(open => !open);
  }, []);

  return (
    <>
      <Floater
        content={<div className={css.tip}>{tooltip}</div>}
        placement="top"
        open={open}
        styles={{
          container: {
            backgroundColor: "#00a1c9",
            color: "#fff",
            borderRadius: 5,
          },
          arrow: {
            color: "#00a1c9",
          },
          options: {
            zIndex: open ? 600 : 100
          }
        }}
      >
        {React.cloneElement(children, {
          onClick
        })}
      </Floater>

      {open && createPortal(
        <div className={css.overlay} onClick={onClick} />,
        document.body
      )}
    </>
  );
}
