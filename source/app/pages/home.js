
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

import React, { useCallback, useState } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import Router from 'next/router'

import Card from '../components/Card/Card'

import { setSelectedTrack } from '../store/ui/actions'
import { getTracks } from '../store/entities/tracks/selectors'

import css from './home.module.scss'
import TrackInfoModal from '../components/TrackInfoModal/TrackInfoModal'

Home.propTypes = {
  dispatch: PropTypes.func,
  tracks: PropTypes.array,
}

function Home({ dispatch, tracks }) {
  const [ showingTrackInfo, setShowingTrackInfo ] = useState(false);

  const handleCardClick = useCallback(id => {
    setShowingTrackInfo(id);
  }, []);

  const navigateToTrack = useCallback(
    () => {
      dispatch(setSelectedTrack(showingTrackInfo))
      Router.push('/documents')
    },
    [dispatch, showingTrackInfo]
  )

  const clearTrackInfo = useCallback(() => {
    setShowingTrackInfo(false);
  }, [])

  return (
    <div className={css.home}>
      <div className={css.tracks}>
        {tracks.map(({ id, icon, ...rest }) => (
          <Card {...rest} key={id} icon={<img src={icon} />} onClick={() => handleCardClick(id)} />
        ))}
      </div>

      { showingTrackInfo ?
        <TrackInfoModal
          trackName={showingTrackInfo}
          onNavigateToTrack={navigateToTrack}
          onClose={clearTrackInfo}
        />
      : null }
    </div>
  )
}

Home.getInitialProps = function() {
  return {
    pageTitle: 'Welcome',
  }
}

export default connect(function mapStateToProps(state) {
  return {
    tracks: getTracks(state),
  }
})(Home)
