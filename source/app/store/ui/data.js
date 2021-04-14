
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

import { lensPath } from 'ramda'
import { ENABLE_ELASTICSEARCH , ENABLE_KENDRA } from '../../constants/configs'

export default {
  selectedTrack: 'search',
  selectedSearch: (ENABLE_ELASTICSEARCH && ENABLE_KENDRA)? "both": ENABLE_KENDRA ? "kendra" : "es",
  headerProps: {},
}

export const lensSelectedTrack = lensPath(['ui', 'selectedTrack'])
export const lensHeaderProps = lensPath(['ui', 'headerProps'])
export const lensSelectedSearch = lensPath(['ui', 'selectedSearch'])
export const lensDismissedWalkthrough = lensPath(['ui', 'dismissedWalkthrough'])
