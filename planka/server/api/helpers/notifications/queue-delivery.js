/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * queue-delivery.js
 *
 * @description :: Helper to queue notification events for async delivery
 */

module.exports = {
  inputs: {
    event: {
      type: 'json',
      required: true,
      description: 'Notification event to queue for delivery',
    },
  },

  async fn(inputs) {
    const { event } = inputs;

    sails.log.debug('[notifications/queue-delivery] Queuing event', {
      type: event.type,
      boardId: event.boardId,
    });

    // Queue event in delivery service
    const NotificationDeliveryService = require('../../services/NotificationDeliveryService');
    await NotificationDeliveryService.queue(event);

    return {
      success: true,
      queuedAt: new Date(),
    };
  },
};
