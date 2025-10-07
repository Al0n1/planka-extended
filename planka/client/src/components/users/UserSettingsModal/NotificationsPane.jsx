/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Tab, Divider } from 'semantic-ui-react';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import NotificationServices from '../../notification-services/NotificationServices';
import NotificationChannelsSettings from '../../notification-channels/NotificationChannelsSettings';

import styles from './NotificationsPane.module.scss';

const NotificationsPane = React.memo(() => {
  const notificationServiceIds = useSelector(selectors.selectNotificationServiceIdsForCurrentUser);
  const currentUser = useSelector((state) => state.users.items[state.users.currentId]);

  const dispatch = useDispatch();

  const handleCreate = useCallback(
    (data) => {
      dispatch(entryActions.createNotificationServiceInCurrentUser(data));
    },
    [dispatch],
  );

  return (
    <Tab.Pane attached={false} className={styles.wrapper}>
      {/* Legacy Notification Services */}
      <NotificationServices ids={notificationServiceIds} onCreate={handleCreate} />
      
      <Divider section />
      
      {/* New Notification Channels System */}
      {currentUser && <NotificationChannelsSettings userId={currentUser.id} />}
    </Tab.Pane>
  );
});

export default NotificationsPane;
