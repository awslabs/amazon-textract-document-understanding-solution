
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

import React, { useCallback, useRef } from 'react'
import ReactDOM from 'react-dom'
import Webcam from 'react-webcam'

import css from './CameraCapture.module.scss'
import Button from '../Button/Button'

const videoConstraints = {
  facingMode: 'environment',
}

function CameraCapture({ onCapture, onCancel }) {
  const webcam = useRef()
  const capture = useCallback(() => {
    const canvas = webcam.current.getCanvas()
    canvas.toBlob(blob => {
      onCapture(blob)
    }, 'image/jpeg')
  }, [onCapture])

  return ReactDOM.createPortal(
    <div className={css.cameraCapture}>
      <Webcam
        ref={webcam}
        audio={false}
        screenshotFormat="image/jpeg"
        videoConstraints={videoConstraints}
      />
      <div>
        <button className={css.button} onClick={capture} />

        <Button className={css.cancel} simple onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>,
    document.body
  )
}

export default CameraCapture
