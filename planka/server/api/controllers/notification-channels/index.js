module.exports = {
  'GET /api/notification-channels': {
    action: 'notification-channels/index',
    swagger: {
      summary: 'Get notification channels for current user',
      description: 'Returns all notification channels configured by the current user',
      tags: ['Notification Channels'],
    },
  },
  'GET /api/notification-channels/:id': {
    action: 'notification-channels/show',
    swagger: {
      summary: 'Get a specific notification channel',
      tags: ['Notification Channels'],
    },
  },
  'POST /api/notification-channels': {
    action: 'notification-channels/create',
    swagger: {
      summary: 'Create a new notification channel',
      tags: ['Notification Channels'],
    },
  },
  'PATCH /api/notification-channels/:id': {
    action: 'notification-channels/update',
    swagger: {
      summary: 'Update a notification channel',
      tags: ['Notification Channels'],
    },
  },
  'DELETE /api/notification-channels/:id': {
    action: 'notification-channels/delete',
    swagger: {
      summary: 'Delete a notification channel',
      tags: ['Notification Channels'],
    },
  },
  'POST /api/notification-channels/:id/test': {
    action: 'notification-channels/test',
    swagger: {
      summary: 'Send a test notification through this channel',
      tags: ['Notification Channels'],
    },
  },
};
