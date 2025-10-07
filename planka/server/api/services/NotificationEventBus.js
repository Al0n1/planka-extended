/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * NotificationEventBus.js
 *
 * @description :: Central event bus for notification system
 *                 Decouples event generation from notification delivery
 */

const EventEmitter = require('events');

class NotificationEventBus extends EventEmitter {
  constructor() {
    super();
    this.eventQueue = [];
  }

  /**
   * Emit a notification event
   * @param {string} eventType - Type of event (e.g., 'card.created')
   * @param {object} payload - Event payload containing all necessary data
   * @returns {Promise<void>}
   */
  async emitNotificationEvent(eventType, payload) {
    const event = {
      type: eventType,
      timestamp: new Date().toISOString(),
      ...payload,
    };

    // Validate required fields
    if (!event.actorId) {
      throw new Error('actorId is required in notification event payload');
    }

    if (!event.boardId) {
      throw new Error('boardId is required in notification event payload');
    }

    sails.log.debug(`[NotificationEventBus] Emitting event: ${eventType}`, event);

    // Emit to listeners
    this.emit('notification', event);

    // Queue for async processing
    try {
      await this.queueEvent(event);
    } catch (error) {
      sails.log.error(`[NotificationEventBus] Failed to queue event: ${eventType}`, error);
      throw error;
    }
  }

  /**
   * Queue event for async processing
   * @param {object} event - The notification event
   * @returns {Promise<void>}
   */
  async queueEvent(event) {
    // Queue the event for worker processing
    if (sails.helpers.notifications && sails.helpers.notifications.queueDelivery) {
      await sails.helpers.notifications.queueDelivery(event);
    } else {
      // Fallback: store in memory queue if worker not ready
      sails.log.warn(
        '[NotificationEventBus] Notification worker not available, using memory queue',
      );
      this.eventQueue.push(event);
    }
  }

  /**
   * Get queued events (for debugging/monitoring)
   * @returns {Array}
   */
  getQueuedEvents() {
    return [...this.eventQueue];
  }

  /**
   * Clear event queue
   */
  clearQueue() {
    this.eventQueue = [];
  }
}

// Create singleton instance
const notificationEventBus = new NotificationEventBus();

module.exports = notificationEventBus;
