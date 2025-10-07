/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * NotificationDeliveryLog.js
 *
 * @description :: Model for logging notification delivery attempts and results
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

const DeliveryStatus = {
  SUCCESS: 'success',
  FAILED: 'failed',
  PENDING: 'pending',
  RETRY: 'retry',
};

module.exports = {
  DeliveryStatus,

  attributes: {
    //  ╔═╗╦═╗╦╔╦╗╦╔╦╗╦╦  ╦╔═╗╔═╗
    //  ╠═╝╠╦╝║║║║║ ║ ║╚╗╔╝║╣ ╚═╗
    //  ╩  ╩╚═╩╩ ╩╩ ╩ ╩ ╚╝ ╚═╝╚═╝

    eventType: {
      type: 'string',
      required: true,
    },
    status: {
      type: 'string',
      isIn: Object.values(DeliveryStatus),
      required: true,
    },
    errorMessage: {
      type: 'string',
      allowNull: true,
      columnType: 'text',
    },
    eventPayload: {
      type: 'json',
      columnType: 'jsonb',
    },
    attemptCount: {
      type: 'number',
      defaultsTo: 1,
    },
    jobId: {
      type: 'string',
      allowNull: true,
    },
    retryCount: {
      type: 'number',
      defaultsTo: 0,
    },

    //  ╔═╗╔╦╗╔╗ ╔═╗╔╦╗╔═╗
    //  ║╣ ║║║╠╩╗║╣  ║║╚═╗
    //  ╚═╝╩ ╩╚═╝╚═╝═╩╝╚═╝

    //  ╔═╗╔═╗╔═╗╔═╗╔═╗╦╔═╗╔╦╗╦╔═╗╔╗╔╔═╗
    //  ╠═╣╚═╗╚═╗║ ║║  ║╠═╣ ║ ║║ ║║║║╚═╗
    //  ╩ ╩╚═╝╚═╝╚═╝╚═╝╩╩ ╩ ╩ ╩╚═╝╝╚╝╚═╝

    channelId: {
      model: 'UserNotificationChannel',
      allowNull: true,
      columnName: 'channel_id',
    },
  },

  tableName: 'notification_delivery_log',
};
