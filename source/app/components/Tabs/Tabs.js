
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
import PropTypes from 'prop-types'
import { useDispatch } from 'react-redux'
import {  setSelectedTrack} from '../../store/ui/actions'

import css from './Tabs.module.scss'

Tabs.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  items: PropTypes.array,
  selected: PropTypes.string,
}

Tabs.defaultProps = {
  children: null,
  items: [],
}

export default function Tabs({ children,track, selected, className, items, isTrackTab, onSelectTab, ...rest }) {
  let tabsClassNames = null
  const dispatch = useDispatch()

  isTrackTab?tabsClassNames = classNames(css.trackTabs, className):tabsClassNames=classNames(css.tabs,css.className)

  function handleTabClick(e) {
    e.preventDefault()
    const id = e.target.getAttribute('data-id')
    onSelectTab?.(id)
    if(id=='searchTrack'){dispatch(setSelectedTrack('search'));}
    if(id=='complianceTrack')dispatch(setSelectedTrack('redaction'))
    if(id=='workflowTrack')dispatch(setSelectedTrack('workflow'))
  }

  return (
    <div className={tabsClassNames} {...rest}>
      <nav>
        <ul>
          {items.map(({ id, title }, i) => {
            return (
              <li key={i} 
              className={selected === id ? css.active : 
                        id=='searchTrack' && track == 'search'? css.active:
                        id=='complianceTrack' && track == 'redaction'? css.active: 
                        id=='workflowTrack' && track == 'workflow'? css.active:
                        null}>
                <a href="#" data-id={id} onClick={handleTabClick}>
                  {title}
                </a>
              </li>
            )
          })}
        </ul>
      </nav>

      {children}
    </div>
  )
}
