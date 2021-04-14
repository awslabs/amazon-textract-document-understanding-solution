import { FETCH_GLOBALS } from '../../constants/action-types';
import { createAction } from 'redux-actions';
import { Auth, API } from 'aws-amplify';

export const fetchGlobals = createAction(FETCH_GLOBALS, async () => {
  const session = await Auth.currentSession();
  const token = session.getIdToken().getJwtToken();

  const {
    data: { exclusion: exclusionLists, labels: redactionLabels },
  } = await API.get('TextractDemoTextractAPI', 'redactionglobal', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    response: true,
  });

  return { exclusionLists, redactionLabels };
});
