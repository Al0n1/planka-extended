/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { EventTypes } = require('../../models/UserNotificationSubscription');

module.exports = {
  inputs: {
    eventType: {
      type: 'string',
      isIn: Object.values(EventTypes),
      required: true,
    },
    scopeType: {
      type: 'string',
      isIn: ['board', 'project', 'global'],
      defaultsTo: 'board',
    },
    boardId: {
      type: 'string',
    },
    projectId: {
      type: 'string',
    },
    isEnabled: {
      type: 'boolean',
      defaultsTo: true,
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    // Validate scope parameters
    if (inputs.scopeType === 'board' && !inputs.boardId) {
      throw {
        message: 'boardId is required for board scope',
        code: 'invalidScope',
      };
    }
    if (inputs.scopeType === 'project' && !inputs.projectId) {
      throw {
        message: 'projectId is required for project scope',
        code: 'invalidScope',
      };
    }

    // Check if subscription already exists
    const existing = await UserNotificationSubscription.findOne({
      userId: currentUser.id,
      eventType: inputs.eventType,
      scopeType: inputs.scopeType,
      boardId: inputs.boardId || null,
      projectId: inputs.projectId || null,
    });

    if (existing) {
      throw {
        message: 'Subscription already exists for this event and scope',
        code: 'duplicateSubscription',
      };
    }

    // Create new notification subscription
    const subscription = await UserNotificationSubscription.create({
      userId: currentUser.id,
      eventType: inputs.eventType,
      scopeType: inputs.scopeType,
      boardId: inputs.boardId || null,
      projectId: inputs.projectId || null,
      isEnabled: inputs.isEnabled,
    }).fetch();

    sails.log.info('[NotificationSubscriptions] Subscription created', {
      subscriptionId: subscription.id,
      userId: currentUser.id,
      eventType: subscription.eventType,
      scopeType: subscription.scopeType,
    });

    return {
      item: subscription,
    };
  },
};
