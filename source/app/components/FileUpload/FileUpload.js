
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

import React, { useCallback, useEffect, useState, Fragment } from 'react'
import { connect } from 'react-redux'
import classNames from 'classnames'
import { Storage } from 'aws-amplify'
import { useDropzone } from 'react-dropzone'
import { format } from 'date-fns'
import uuid from "uuid/v4";
import getConfig from "next/config";

import Button from '../Button/Button'
import Modal from '../Modal/Modal'
import { useContext } from 'react';
import ModalContext from '../ModalContext/ModalContext'
import CameraCapture from '../CameraCapture/CameraCapture'

import { submitDocument } from '../../store/entities/documents/actions'
import { clearSearchQuery } from '../../store/entities/meta/actions'

import css from './FileUpload.module.scss'

const {
  publicRuntimeConfig:{
    isROMode
  }
} = getConfig();

function FileUpload({ dispatch }) {
  const [canUseCamera, setCanUseCamera] = useState({})
  const [cameraCapturing, setCameraCapturing] = useState(false)
  const [fileStatus, setFileStatus] = useState({})
  const [uploadStatus, setUploadStatus] = useState('')
  const [files, setFiles] = useState({})
  const {modal, setModal} = isROMode==="true"? useContext(ModalContext): useState('')
  const fileNames = Object.keys(files)

  // Aggregate upload statuses
  const isUploadPending = uploadStatus === 'pending'
  const isUploadSuccessful = uploadStatus === 'success'
  const isUploadFailed = uploadStatus === 'error'
  const isReadyToUpload = !uploadStatus

  useEffect(() => {
    const md = window.navigator && navigator.mediaDevices
    if (!md || !md.enumerateDevices) {
      setCanUseCamera(false)
    } else {
      md.enumerateDevices().then(devices => {
        setCanUseCamera(devices.some(device => device.kind === 'videoinput'))
      })
    }
  }, [])

  // Configure dropzone
  const onDrop = useCallback(acceptedFiles => {
    if(isROMode === 'true'){
      setModal(true)
    } 
    else{
    const fileMap = {}
    setUploadStatus('')
    acceptedFiles.forEach(file => {
      fileMap[file.name] = file
    })
    setFiles(files => ({ ...files, ...fileMap }))
  }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: !isReadyToUpload,
  })

  /**
 * Handle clicks on the select documents CTA when the mode is Demonstration Mode
 *
 */
  const handleSelectDocumentsClickDemoOnly = useCallback(() => {setModal(true) },[])
  // Dynamic class names
  const fileUploadClassNames = classNames(css.fileUpload, {
    [css.dragActive]: isDragActive,
  })

  /**
   * Click handler for upload button
   */
  const handleUploadClick = useCallback(() => {
    // Set aggregate status
    setUploadStatus('pending')

    // Upload files
    const uploads = uploadFiles({
      fileNames,
      files,
      onProgress({ fileName, progress }) {
        setFileStatus(fileStatus => ({
          ...fileStatus,
          ...{
            [fileName]: {
              progress: `${Math.min(Math.round((progress.loaded / progress.total) * 100), 99)}%`,
            },
          },
        }))
      },
      onSuccess({ result, fileName }) {
        return dispatch(submitDocument({ key: `public/${result.key}` })).then(() => {
          setFileStatus(fileStatus => ({
            ...fileStatus,
            ...{ [fileName]: { success: true } },
          }))
        })
      },
      onError({ fileName }) {
        setFileStatus(fileStatus => ({
          ...fileStatus,
          ...{ [fileName]: { error: true } },
        }))
      },
    })

    // Set aggregate status based on result of upload promises
    Promise.all(uploads)
      .then(() => {
        dispatch(clearSearchQuery())
        setUploadStatus('success')
      })
      .catch(error => {
      setUploadStatus('error')})
  }, [dispatch, fileNames, files])

  /**
   * Delete a file
   *
   * @param {String} fileName The name of the file to delete
   */
  function deleteFile(fileName) {
    setFiles(({ ...files }) => delete files[fileName] && files)
  }

  const startCamera = useCallback(() => {
    setCameraCapturing(true)
  }, [])

  const cameraCaptured = useCallback(blob => {
    setCameraCapturing(false)

    const datestring = format(new Date(), 'YYYYMMDDHHmmss')

    const filename = `cameracapture-${datestring}.jpg`
    setFiles(files => ({ ...files, [filename]: blob }))
  }, [])

if (isROMode==="true"){
  return (
    <div>
    <div
      {...getRootProps({
        className: fileUploadClassNames,
        onClick: handleSelectDocumentsClickDemoOnly,
        tabIndex: -1,
      })}
    >
      <input {...getInputProps({
        disabled: true
      })} />
      <img src="/images/icon_file-upload.svg" alt="File Upload Icon" />
      {isDragActive && <p className={css.instructions}>Drop the documents here...</p>}
      {!isDragActive && isReadyToUpload && (
        <>
          <p className={css.instructions}>
            Drag and drop files or <em tabIndex="0">Choose documents</em>
          </p>
          {isReadyToUpload && (
            <p className={css.limits}>
              Accepts JPG/PNG (max 5MB) and PDF (max 150 MB, max 200 pages)
            </p>
          )}

          {canUseCamera && (
            <p className={css.instructions}>
              or <Button onClick={() => setModal(true)}>use your camera</Button>
            </p>
          )}
        </>
      )}
      </div>
    </div>
  )
}
else {
  return (
    <div
      {...getRootProps({
        className: fileUploadClassNames,
        onClick: handleSelectDocumentsClick,
        tabIndex: -1,
      })}
    >
      <input {...getInputProps()} />
      <img src="/images/icon_file-upload.svg" alt="File Upload Icon" />
      {isDragActive && <p className={css.instructions}>Drop the documents here...</p>}
      {!isDragActive && isReadyToUpload && (
        <>
          <p className={css.instructions}>
            Drag and drop files or <em tabIndex="0">Choose documents</em>
          </p>
          {isReadyToUpload && (
            <p className={css.limits}>
              Accepts JPG/PNG (max 5MB) and PDF (max 150 MB, max 200 pages)
            </p>
          )}

          {canUseCamera && (
            <p className={css.instructions}>
              or <Button onClick={startCamera}>use your camera</Button>
            </p>
          )}
        </>
      )}

      {isUploadPending && <p className={css.instructions}>Uploading...</p>}
      {isUploadSuccessful && <p className={css.instructions}>Done!</p>}
      {isUploadFailed && (
        <p className={css.instructions}>Something went wrong, please refresh and try again.</p>
      )}

      {!!fileNames.length && (
        <Fragment>
          <ul>
            {fileNames.map(fileName => {
              const status = fileStatus[fileName] || {}
              const { success, error, progress } = status
              return (
                <li key={fileName}>
                  {isReadyToUpload && (
                    <img src="/images/icon_document.svg" alt="Document Icon" />
                  )}
                  {!success && !error && progress && <span>{progress}</span>}
                  {success && <img src="/images/icon_success.svg" alt="Success Icon" />}
                  {error && <img src="/images/icon_error.svg" alt="Error Icon" />}
                  {fileName}
                  {isReadyToUpload && (
                    <svg
                      height="24"
                      viewBox="0 0 24 24"
                      width="24"
                      xmlns="http://www.w3.org/2000/svg"
                      onClick={() => deleteFile(fileName)}
                    >
                      <path d="m12 10.5857864 5.2928932-5.29289318c.3905243-.39052429 1.0236893-.39052429 1.4142136 0s.3905243 1.02368927 0 1.41421356l-5.2928932 5.29289322 5.2928932 5.2928932c.3905243.3905243.3905243 1.0236893 0 1.4142136s-1.0236893.3905243-1.4142136 0l-5.2928932-5.2928932-5.29289322 5.2928932c-.39052429.3905243-1.02368927.3905243-1.41421356 0s-.39052429-1.0236893 0-1.4142136l5.29289318-5.2928932-5.29289318-5.29289322c-.39052429-.39052429-.39052429-1.02368927 0-1.41421356s1.02368927-.39052429 1.41421356 0z" />
                    </svg>
                  )}
                </li>
              )
            })}
          </ul>
          {isReadyToUpload && (
            <Button inverted onClick={handleUploadClick}>
              Upload
            </Button>
          )}

          {isUploadSuccessful && (
            <Button inverted disabled={!isUploadSuccessful} link={{ href: '/documents' }}>
              Continue
            </Button>
          )}
        </Fragment>
      )}

      {cameraCapturing && (
        <CameraCapture onCapture={cameraCaptured} onCancel={() => setCameraCapturing(false)} />
      )}
    </div>
  )}
}

export default connect()(FileUpload)

async function isUUIdPresentInS3(documentUUID){
  var s3ListPromise = Storage.list(`${documentUUID}/`)
      .then((result) => {return result});
  let s3Result = await s3ListPromise
  return s3Result.length > 0
}
 
async function getUniqueDocumentId(){
  let documentUUID = uuid() 
    if (await isUUIdPresentInS3(documentUUID)){
      return getUniqueDocumentId()
    }else{
      return documentUUID
    }  
}

/**
 * Upload files to S3. NOTE: Amplify does not allow you to upload multiple files
 * in a single call, which is why this function runs a loop to make a call for each file.
 *
 * @param {Object}   config             An object of configs
 * @param {Array}    config.fileNames   An array of file names
 * @param {Object}   config.files       An object of files where the keys are the file names
 * @param {Function} config.onSuccess   A callback that fires on success of a single upload
 * @param {Function} config.onError     A callback that fires on error of a single upload
 * @param {Function} config.onProgress  A callback that fires on progress of a single upload
 */
function uploadFiles({ fileNames = [], files = {}, onSuccess, onError, onProgress }) {
  const fileLengthExceeded = Boolean (fileNames.length > 100);

  if(fileLengthExceeded){
    alert(" Supported no. of files upload limit : less than 100");
  }

  return fileNames.map(fileName => new Promise((resolve, reject) => {
    const file = files[fileName]

    if(fileLengthExceeded){
      onError({ fileName })
      reject();
    }
    if(!["application/pdf","image/png","image/jpeg"].includes(file.type)){
      alert(fileName + " : Supported file formats : JPG,PNG,PDF");
      onError({ fileName })
      reject();
    }
    if (file.type =="application/pdf" && file.size/(1000000)>=150){  //Maximum File size supported is 150MB
      alert(fileName + " : Supported PDF size : less than 150MB");
      onError({ fileName })
      reject();
    }
    if (["image/png","image/jpeg"].includes(file.type) && file.size/(1000000)>=5){  //Maximum File size supported is 5MB
      alert(fileName + " : Supported Image size : less than 5MB");
      onError({ fileName })
      reject();
    }
    
    onProgress({
      progress: {
        loaded: 0,
        total: file.size || 100,
      },
      fileName,
      file,
    })

    getUniqueDocumentId()
    .then((result) => {   
        const key = [result, fileName].join('/')
        
        return Storage.put(key, file, {
          progressCallback(progress) {
            onProgress({ progress, fileName, file })
          },
        })
        .then(result => {
            onSuccess({ result, fileName, file })
            resolve()
          })
          .catch(error => {
            onError({ error, fileName, file })
            reject(error);
          })
      });
  }));
}

/**
 * Handle clicks on the select documents CTA
 *
 * @param {Object} e Event object
 */
function handleSelectDocumentsClick(e) {
  e.preventDefault()
  e.target.tagName.toLowerCase() !== 'em' && e.stopPropagation()
}
