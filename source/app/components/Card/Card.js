
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

import React, { Fragment } from 'react'
import classNames from 'classnames'
import PropTypes from 'prop-types'

import css from './Card.module.scss'

export const CARD_PALETTES = ['blue', 'black', 'teal', 'purple']
export const CARD_VOLUMES = ['loud', 'conversational', 'quiet']

Card.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  icon: PropTypes.node,
  palette: PropTypes.oneOf(CARD_PALETTES),
  subtitle: PropTypes.string,
  title: PropTypes.string,
  volume: PropTypes.oneOf(CARD_VOLUMES),
}

Card.defaultProps = {
  className: '',
  palette: 'black',
  volume: 'conversational',
}

export default function Card({
  children,
  className,
  icon,
  palette,
  title,
  subtitle,
  volume,
  ...rest
}) {
  const cardClassNames = classNames(css.card, css[palette], css[volume], className)

  function handleKeyPress() {
    if (!rest.onClick) return
    const code = event.keyCode || event.which
    if (code === 13) rest.onClick()
  }

  return (
    <div className={cardClassNames} onKeyPress={handleKeyPress} {...rest} tabIndex={0}>
      {children ? (
        children
      ) : (
        <Fragment>
          {icon && <div className={css.icon}>{icon}</div>}
          <div>
            {title && <h3 className={css.title}>{title}</h3>}
            {subtitle && <p className={css.subtitle}>{subtitle}</p>}
          </div>
        </Fragment>
      )}
    </div>
  )
}
