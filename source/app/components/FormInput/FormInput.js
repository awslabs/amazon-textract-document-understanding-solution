
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

import React, { forwardRef } from 'react'
import classNames from 'classnames'
import PropTypes from 'prop-types'

import css from './FormInput.module.scss'

export const INPUT_TYPES = ['text', 'textarea', 'checkbox', 'radio', 'search', 'password']

const FormInput = forwardRef(function FormInput({ children, className, disabled, error, label, type, light, white, ...rest }, ref) {
  const statusClassNames = classNames({
    [css.light]: !!light,
    [css.white]: !!white,
    [css.disabled]: !!disabled,
    [css.error]: !!error,
    [css.hasLabel]: !!label,
  })

  const inputClassNames = classNames(css.input, statusClassNames)

  const labelClassNames = classNames(css.label, className, {
    [css[type]]: type === 'search' || type === 'checkbox' || type === 'radio',
  })

  return (
    <label className={labelClassNames}>
      {(type === 'checkbox' || type === 'radio') && (
        <>
          <input ref={ref} type={type} className={statusClassNames} disabled={disabled} {...rest} />
          <span />
        </>
      )}

      {label}

      {(type === 'text' || type === 'password') && (
        <input ref={ref} type={type} className={inputClassNames} disabled={disabled} {...rest} />
      )}
      {type === 'textarea' && (
        <textarea ref={ref} className={inputClassNames} disabled={disabled} {...rest}>
          {children}
        </textarea>
      )}
      {type === 'search' && (
        <>
          <input type="text" ref={ref} className={inputClassNames} disabled={disabled} enterKeyHint="search" {...rest} />
          <svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
            <path
              d="m16.6177513 14.496431 4.8068699 4.8068699c.5857864.5857864.5857864 1.5355339 0 2.1213203s-1.5355339.5857864-2.1213203 0l-4.8068699-4.8068699c-1.2814131.8723474-2.8293751 1.3822487-4.496431 1.3822487-4.418278 0-8-3.581722-8-8s3.581722-8 8-8 8 3.581722 8 8c0 1.6670559-.5099013 3.2150179-1.3822487 4.496431zm-6.6177513.503569c2.7614237 0 5-2.2385763 5-5 0-2.76142375-2.2385763-5-5-5-2.76142375 0-5 2.23857625-5 5 0 2.7614237 2.23857625 5 5 5z"
              fillRule="evenodd"
            />
          </svg>
        </>
      )}
    </label>
  )
})

FormInput.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  disabled: PropTypes.bool,
  error: PropTypes.bool,
  label: PropTypes.string,
  type: PropTypes.oneOf(INPUT_TYPES),
}

FormInput.defaultProps = {
  disabled: null,
  label: '',
  type: 'text',
}

export default FormInput
