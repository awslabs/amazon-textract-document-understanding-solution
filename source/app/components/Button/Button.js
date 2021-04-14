
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
import classNames from 'classnames'
import Link from 'next/link'
import PropTypes from 'prop-types'

import { linkShape } from '../../utils/link-generators.js'

import css from './Button.module.scss'

export const BUTTON_PALETTES = ['black', 'blue', 'orange']

const Button = React.forwardRef(({
  children,
  className,
  disabled = false,
  inverted = false,
  link,
  onClick = null,
  palette = 'orange',
  simple = false,
  ...otherProps
}, ref) => {
  const { target, ...linkProps } = link || {}
  const buttonClassNames = classNames(css.button, css[palette], className, {
    [css.disabled]: disabled,
    [css.inverted]: inverted && !simple,
    [css.simple]: simple,
  })
  onClick = disabled ? () => false : onClick

  if (otherProps.href) {
    return (
      <a
        ref={ref}
        className={buttonClassNames}
        target={target || null}
        tabIndex={disabled ? -1 : null}
        {...otherProps}
      >
        {children}
      </a>
    )
  }

  return !disabled && link ? (
    <Link ref={ref} {...linkProps}>
      <a
        className={buttonClassNames}
        target={target || null}
        tabIndex={disabled ? -1 : null}
        {...otherProps}
      >
        {children}
      </a>
    </Link>
  ) : (
    <button ref={ref} className={buttonClassNames} onClick={onClick} tabIndex={disabled ? -1 : null} {...otherProps}>
      {children}
    </button>
  )
})

Button.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  disabled: PropTypes.bool,
  inverted: PropTypes.bool,
  link: PropTypes.shape(linkShape),
  onClick: PropTypes.func,
  palette: PropTypes.oneOf(BUTTON_PALETTES),
  simple: PropTypes.bool,
}

export default Button
