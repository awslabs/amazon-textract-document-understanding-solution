
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

import Button from '../Button/Button'

import css from './ErrorPage.module.scss'

Error.propTypes = {
  statusCode: PropTypes.number,
}

export default function Error({ statusCode }) {
  return (
    <div className={css.error}>
      {statusCode ? (
        <p className={css.message}>
          A {statusCode} error occurred on server. Please refresh the page and try again.
        </p>
      ) : (
        <p className={css.message}>Something went wrong. Please refresh the page and try again.</p>
      )}

      <p>
        <Button link={{ href: '/home' }}>Go Home</Button>
      </p>
    </div>
  )
}
