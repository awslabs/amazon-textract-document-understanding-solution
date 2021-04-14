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
import { connect } from "react-redux";
import { getTracks } from "../../store/entities/tracks/selectors";

import Modal from "../Modal/Modal";
import Button from "../Button/Button";
import css from "./TrackInfoModal.module.scss";

function TrackInfoModal({ trackName, onNavigateToTrack, onClose, track }) {
  const descriptionParagraphs = (track.longDescription || "")
    .trim()
    .split(/(?:\n\s*){2,}/);

  return (
    <Modal title={`${track.title} Track`} onRequestClose={onClose}>
      {descriptionParagraphs.map((text) => (
        <p>{text}</p>
      ))}

      <div className={css.actions}>
        <Button onClick={onNavigateToTrack}>Okay</Button>
      </div>
    </Modal>
  );
}

export default connect(function mapStateToProps(state, { trackName }) {
  return {
    track: getTracks(state).find((x) => x.id === trackName),
  };
})(TrackInfoModal);
