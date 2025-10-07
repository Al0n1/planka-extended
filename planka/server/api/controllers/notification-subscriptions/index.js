module.exports = {
  'GET /api/notification-subscriptions': {
    action: 'notification-subscriptions/index',
    swagger: {
      summary: 'Get notification subscriptions for current user',
      tags: ['Notification Subscriptions'],
    },
  },
  'GET /api/notification-subscriptions/:id': {
    action: 'notification-subscriptions/show',
    swagger: {
      summary: 'Get a specific notification subscription',
      tags: ['Notification Subscriptions'],
    },
  },
  'POST /api/notification-subscriptions': {
    action: 'notification-subscriptions/create',
    swagger: {
      summary: 'Create a new notification subscription',
      tags: ['Notification Subscriptions'],
    },
  },
  'PATCH /api/notification-subscriptions/:id': {
    action: 'notification-subscriptions/update',
    swagger: {
      summary: 'Update a notification subscription',
      tags: ['Notification Subscriptions'],
    },
  },
  'DELETE /api/notification-subscriptions/:id': {
    action: 'notification-subscriptions/delete',
    swagger: {
      summary: 'Delete a notification subscription',
      tags: ['Notification Subscriptions'],
    },
  },
};
