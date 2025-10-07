/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    boardId: {
      type: 'string',
    },
    projectId: {
      type: 'string',
    },
    scopeType: {
      type: 'string',
      isIn: ['board', 'project', 'global'],
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const criteria = { userId: currentUser.id };

    if (inputs.boardId) {
      criteria.boardId = inputs.boardId;
    }
    if (inputs.projectId) {
      criteria.projectId = inputs.projectId;
    }
    if (inputs.scopeType) {
      criteria.scopeType = inputs.scopeType;
    }

    // Get all notification subscriptions for the current user
    const subscriptions = await UserNotificationSubscription.find(criteria).sort('createdAt ASC');

    return {
      items: subscriptions,
    };
  },
};
