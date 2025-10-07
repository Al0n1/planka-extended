/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * UserNotificationSubscription.js
 *
 * @description :: Model for storing user notification subscriptions to specific events
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

const EventTypes = {
  // Card events
  CARD_CREATED: 'card.created',
  CARD_MOVED: 'card.moved',
  CARD_UPDATED: 'card.updated',
  CARD_DELETED: 'card.deleted',
  
  // Comment events
  COMMENT_CREATED: 'comment.created',
  
  // Task events
  TASK_CREATED: 'task.created',
  TASK_COMPLETED: 'task.completed',
  
  // Attachment events
  ATTACHMENT_ADDED: 'attachment.added',
  
  // Due date events
  DUE_DATE_APPROACHING: 'dueDate.approaching',
  DUE_DATE_PASSED: 'dueDate.passed',
  
  // Assignment events
  USER_ASSIGNED: 'user.assigned',
  USER_UNASSIGNED: 'user.unassigned',
};

module.exports = {
  EventTypes,

  attributes: {
    //  ╔═╗╦═╗╦╔╦╗╦╔╦╗╦╦  ╦╔═╗╔═╗
    //  ╠═╝╠╦╝║║║║║ ║ ║╚╗╔╝║╣ ╚═╗
    //  ╩  ╩╚═╩╩ ╩╩ ╩ ╩ ╚╝ ╚═╝╚═╝

    eventType: {
      type: 'string',
      required: true,
      isIn: Object.values(EventTypes),
    },
    isEnabled: {
      type: 'boolean',
      defaultsTo: true,
    },
    scopeType: {
      type: 'string',
      isIn: ['board', 'project', 'global'],
      defaultsTo: 'board',
    },

    //  ╔═╗╔╦╗╔╗ ╔═╗╔╦╗╔═╗
    //  ║╣ ║║║╠╩╗║╣  ║║╚═╗
    //  ╚═╝╩ ╩╚═╝╚═╝═╩╝╚═╝

    //  ╔═╗╔═╗╔═╗╔═╗╔═╗╦╔═╗╔╦╗╦╔═╗╔╗╔╔═╗
    //  ╠═╣╚═╗╚═╗║ ║║  ║╠═╣ ║ ║║ ║║║║╚═╗
    //  ╩ ╩╚═╝╚═╝╚═╝╚═╝╩╩ ╩ ╩ ╩╚═╝╝╚╝╚═╝

    userId: {
      model: 'User',
      required: true,
      columnName: 'user_id',
    },
    projectId: {
      model: 'Project',
      allowNull: true,
      columnName: 'project_id',
    },
    boardId: {
      model: 'Board',
      allowNull: true,
      columnName: 'board_id',
    },
  },

  tableName: 'user_notification_subscription',
};
