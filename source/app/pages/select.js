
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

import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'

import FileUpload from '../components/FileUpload/FileUpload'
import Button from '../components/Button/Button'
import getConfig from 'next/config'

import css from './select.module.scss'
import ContextModal from '../components/ContextModal/ContextModal'
import ModalContext from '../components/ModalContext/ModalContext'
import SampleCollections from '../components/SampleCollections/SampleCollections'

Select.propTypes = {
  dispatch: PropTypes.func,
}
const {
  publicRuntimeConfig:{
    isROMode
  }
} = getConfig();
function Select({ dispatch }) {
  if(isROMode === 'true'){
    const [modal, setModal] = React.useState(false)
    return (
      <ModalContext.Provider value={{modal:modal, setModal:setModal}}>
        <ContextModal onClose={() => setModal(false)} show={modal} modalTitle={"Cannot Upload Your Own Documents - Read Only Mode"}>
        This DUS instance is running in Read-Only Mode which does not support uploading your own documents.
        To use all the features of DUS, please deploy your own instance following the instructions
         <a href="https://github.com/awslabs/document-understanding-solution"> here.</a>
          </ContextModal>
          <div className={css.select}>
          <p>
            <Button inverted link={{ href: '/documents' }}>
              View Existing Documents
            </Button>
          </p>
          <h2>Add some example documents</h2>
          <SampleCollections />
          <h2>Or Upload your own documents</h2>
          <FileUpload />
        </div>
      </ModalContext.Provider>
    )
  }
else {
  return (
    <div className={css.select}>
      <p>
        <Button inverted link={{ href: '/documents' }}>
          View Existing Documents
        </Button>
      </p>

      <h2>Upload your own documents</h2>
      <FileUpload />
      <h2>Or add some example documents</h2>
      <SampleCollections />
    </div>
  )
  }
}

Select.getInitialProps = function() {
  return {
    pageTitle: 'Upload documents',
  }
}

export default connect(function mapStateToProps(state) {
  return {}
})(Select)
