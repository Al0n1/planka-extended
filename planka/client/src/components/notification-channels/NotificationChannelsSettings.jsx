/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Form,
  Input,
  Segment,
  Header,
  Table,
  Icon,
  Message,
  Checkbox,
  Dropdown,
  Label,
} from 'semantic-ui-react';

import styles from './NotificationChannelsSettings.module.scss';

const NOTIFICATION_EVENTS = [
  { key: 'card.created', text: 'Card Created', icon: 'file' },
  { key: 'card.moved', text: 'Card Moved', icon: 'arrows alternate horizontal' },
  { key: 'comment.created', text: 'Comment Created', icon: 'comment' },
  { key: 'user.assigned', text: 'User Assigned', icon: 'user plus' },
  { key: 'user.unassigned', text: 'User Unassigned', icon: 'user minus' },
  { key: 'dueDate.approaching', text: 'Due Date Approaching', icon: 'clock outline' },
  { key: 'dueDate.passed', text: 'Due Date Passed', icon: 'exclamation triangle' },
  { key: 'task.created', text: 'Task Created', icon: 'tasks' },
  { key: 'task.completed', text: 'Task Completed', icon: 'check square' },
  { key: 'attachment.added', text: 'Attachment Added', icon: 'paperclip' },
];

const SERVICE_TYPES = [
  { key: 'webhook', text: 'Webhook', value: 'webhook' },
  { key: 'slack', text: 'Slack', value: 'slack' },
  { key: 'discord', text: 'Discord', value: 'discord' },
  { key: 'telegram', text: 'Telegram', value: 'telegram' },
  { key: 'email', text: 'Email', value: 'email' },
];

const FORMAT_OPTIONS = [
  { key: 'json', text: 'JSON', value: 'json' },
  { key: 'markdown', text: 'Markdown', value: 'markdown' },
  { key: 'plain', text: 'Plain Text', value: 'plain' },
];

const NotificationChannelsSettings = React.memo(({ userId }) => {
  const [t] = useTranslation();
  const [channels, setChannels] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [newChannel, setNewChannel] = useState({
    serviceType: 'webhook',
    url: '',
    format: 'json',
    isActive: true,
  });

  // Fetch channels and subscriptions
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch channels
      const channelsResponse = await fetch('/api/notification-channels', {
        credentials: 'include',
      });

      if (!channelsResponse.ok) {
        throw new Error('Failed to fetch notification channels');
      }

      const channelsData = await channelsResponse.json();
      setChannels(channelsData.items || []);

      // Fetch subscriptions
      const subscriptionsResponse = await fetch('/api/notification-subscriptions', {
        credentials: 'include',
      });

      if (!subscriptionsResponse.ok) {
        throw new Error('Failed to fetch notification subscriptions');
      }

      const subscriptionsData = await subscriptionsResponse.json();
      setSubscriptions(subscriptionsData.items || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching notification data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle channel creation
  const handleCreateChannel = useCallback(async () => {
    if (!newChannel.url) {
      setError('URL is required');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/notification-channels', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          ...newChannel,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create channel');
      }

      setSuccess('Channel created successfully');
      setShowAddForm(false);
      setNewChannel({
        serviceType: 'webhook',
        url: '',
        format: 'json',
        isActive: true,
      });

      await fetchData();
    } catch (err) {
      setError(err.message);
      console.error('Error creating channel:', err);
    } finally {
      setLoading(false);
    }
  }, [newChannel, userId, fetchData]);

  // Handle channel deletion
  const handleDeleteChannel = useCallback(
    async (channelId) => {
      if (!window.confirm('Are you sure you want to delete this channel?')) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/notification-channels/${channelId}`, {
          method: 'DELETE',
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to delete channel');
        }

        setSuccess('Channel deleted successfully');
        await fetchData();
      } catch (err) {
        setError(err.message);
        console.error('Error deleting channel:', err);
      } finally {
        setLoading(false);
      }
    },
    [fetchData],
  );

  // Handle channel test
  const handleTestChannel = useCallback(async (channelId) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/notification-channels/${channelId}/test`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Test failed');
      }

      setSuccess('Test notification sent successfully');
    } catch (err) {
      setError(`Test failed: ${err.message}`);
      console.error('Error testing channel:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle channel toggle
  const handleToggleChannel = useCallback(
    async (channelId, currentStatus) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/notification-channels/${channelId}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            isActive: !currentStatus,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update channel');
        }

        await fetchData();
      } catch (err) {
        setError(err.message);
        console.error('Error updating channel:', err);
      } finally {
        setLoading(false);
      }
    },
    [fetchData],
  );

  // Handle subscription toggle
  const handleToggleSubscription = useCallback(
    async (eventType, channelId) => {
      const existing = subscriptions.find(
        (sub) => sub.eventType === eventType && sub.channelId === channelId,
      );

      setLoading(true);
      setError(null);

      try {
        if (existing) {
          // Delete subscription
          const response = await fetch(`/api/notification-subscriptions/${existing.id}`, {
            method: 'DELETE',
            credentials: 'include',
          });

          if (!response.ok) {
            throw new Error('Failed to delete subscription');
          }
        } else {
          // Create subscription
          const response = await fetch('/api/notification-subscriptions', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId,
              channelId,
              eventType,
              scopeType: 'board',
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to create subscription');
          }
        }

        await fetchData();
      } catch (err) {
        setError(err.message);
        console.error('Error toggling subscription:', err);
      } finally {
        setLoading(false);
      }
    },
    [subscriptions, userId, fetchData],
  );

  return (
    <div className={styles.wrapper}>
      <Header as="h3">
        <Icon name="bell" />
        Notification Channels
      </Header>

      {error && (
        <Message negative onDismiss={() => setError(null)}>
          <Message.Header>Error</Message.Header>
          <p>{error}</p>
        </Message>
      )}

      {success && (
        <Message positive onDismiss={() => setSuccess(null)}>
          <Message.Header>Success</Message.Header>
          <p>{success}</p>
        </Message>
      )}

      {/* Add Channel Form */}
      {showAddForm ? (
        <Segment>
          <Header as="h4">Add New Channel</Header>
          <Form>
            <Form.Field>
              <label>Service Type</label>
              <Dropdown
                selection
                options={SERVICE_TYPES}
                value={newChannel.serviceType}
                onChange={(e, { value }) =>
                  setNewChannel({ ...newChannel, serviceType: value })
                }
              />
            </Form.Field>

            <Form.Field>
              <label>URL</label>
              <Input
                placeholder="https://hooks.slack.com/services/..."
                value={newChannel.url}
                onChange={(e) => setNewChannel({ ...newChannel, url: e.target.value })}
              />
            </Form.Field>

            <Form.Field>
              <label>Format</label>
              <Dropdown
                selection
                options={FORMAT_OPTIONS}
                value={newChannel.format}
                onChange={(e, { value }) => setNewChannel({ ...newChannel, format: value })}
              />
            </Form.Field>

            <Form.Field>
              <Checkbox
                label="Active"
                checked={newChannel.isActive}
                onChange={(e, { checked }) =>
                  setNewChannel({ ...newChannel, isActive: checked })
                }
              />
            </Form.Field>

            <Button primary onClick={handleCreateChannel} loading={loading}>
              Create Channel
            </Button>
            <Button onClick={() => setShowAddForm(false)} disabled={loading}>
              Cancel
            </Button>
          </Form>
        </Segment>
      ) : (
        <Button primary icon labelPosition="left" onClick={() => setShowAddForm(true)}>
          <Icon name="plus" />
          Add Channel
        </Button>
      )}

      {/* Channels List */}
      {channels.length > 0 && (
        <Segment className={styles.channelsSegment}>
          <Header as="h4">Active Channels</Header>
          <Table celled>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell width={2}>Type</Table.HeaderCell>
                <Table.HeaderCell width={6}>URL</Table.HeaderCell>
                <Table.HeaderCell width={2}>Format</Table.HeaderCell>
                <Table.HeaderCell width={2}>Status</Table.HeaderCell>
                <Table.HeaderCell width={4}>Actions</Table.HeaderCell>
              </Table.Row>
            </Table.Header>

            <Table.Body>
              {channels.map((channel) => (
                <Table.Row key={channel.id}>
                  <Table.Cell>
                    <Label color={channel.isActive ? 'green' : 'grey'}>
                      {channel.serviceType}
                    </Label>
                  </Table.Cell>
                  <Table.Cell className={styles.urlCell}>{channel.url}</Table.Cell>
                  <Table.Cell>{channel.format}</Table.Cell>
                  <Table.Cell>
                    {channel.isActive ? (
                      <Label color="green">Active</Label>
                    ) : (
                      <Label color="grey">Inactive</Label>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <Button
                      size="small"
                      icon
                      onClick={() => handleToggleChannel(channel.id, channel.isActive)}
                      disabled={loading}
                    >
                      <Icon name={channel.isActive ? 'pause' : 'play'} />
                    </Button>
                    <Button
                      size="small"
                      icon
                      onClick={() => handleTestChannel(channel.id)}
                      disabled={loading}
                    >
                      <Icon name="lightning" />
                    </Button>
                    <Button
                      size="small"
                      icon
                      negative
                      onClick={() => handleDeleteChannel(channel.id)}
                      disabled={loading}
                    >
                      <Icon name="trash" />
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </Segment>
      )}

      {/* Event Subscriptions */}
      {channels.length > 0 && (
        <Segment className={styles.subscriptionsSegment}>
          <Header as="h4">Event Subscriptions</Header>
          <p>Select which events you want to receive notifications for:</p>

          <Table celled structured>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Event</Table.HeaderCell>
                {channels.map((channel) => (
                  <Table.HeaderCell key={channel.id} textAlign="center">
                    {channel.serviceType}
                  </Table.HeaderCell>
                ))}
              </Table.Row>
            </Table.Header>

            <Table.Body>
              {NOTIFICATION_EVENTS.map((event) => (
                <Table.Row key={event.key}>
                  <Table.Cell>
                    <Icon name={event.icon} />
                    {event.text}
                  </Table.Cell>
                  {channels.map((channel) => {
                    const isSubscribed = subscriptions.some(
                      (sub) => sub.eventType === event.key && sub.channelId === channel.id,
                    );
                    return (
                      <Table.Cell key={channel.id} textAlign="center">
                        <Checkbox
                          checked={isSubscribed}
                          onChange={() => handleToggleSubscription(event.key, channel.id)}
                          disabled={loading || !channel.isActive}
                        />
                      </Table.Cell>
                    );
                  })}
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </Segment>
      )}

      {channels.length === 0 && !showAddForm && (
        <Message info>
          <Message.Header>No Channels Configured</Message.Header>
          <p>Click "Add Channel" to create your first notification channel.</p>
        </Message>
      )}
    </div>
  );
});

NotificationChannelsSettings.propTypes = {
  userId: PropTypes.string.isRequired,
};

export default NotificationChannelsSettings;
