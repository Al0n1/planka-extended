/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * notification-worker.js
 *
 * @description :: Worker process for handling notification delivery queue
 *                 Runs continuously to process queued notification events
 */

const NotificationDeliveryService = require('../api/services/NotificationDeliveryService');

class NotificationWorker {
  constructor() {
    this.isRunning = false;
    this.processingInterval = null;
    this.intervalMs = 5000; // Process queue every 5 seconds
  }

  /**
   * Start the worker
   */
  start() {
    if (this.isRunning) {
      sails.log.warn('[NotificationWorker] Worker already running');
      return;
    }

    this.isRunning = true;
    global.notificationWorkerReady = true;

    sails.log.info('[NotificationWorker] Starting notification worker');

    // Process queue periodically
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, this.intervalMs);

    // Initial processing
    this.processQueue();
  }

  /**
   * Stop the worker
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    sails.log.info('[NotificationWorker] Stopping notification worker');

    this.isRunning = false;
    global.notificationWorkerReady = false;

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  /**
   * Process the notification queue
   */
  async processQueue() {
    if (!this.isRunning) {
      return;
    }

    try {
      const status = NotificationDeliveryService.getQueueStatus();

      if (status.queueLength > 0) {
        sails.log.debug('[NotificationWorker] Processing queue', {
          queueLength: status.queueLength,
        });

        // Process items one by one
        while (status.queueLength > 0 && this.isRunning) {
          await NotificationDeliveryService.processNext();
          // Small delay between items to prevent overwhelming the system
          await this.sleep(100);
        }
      }
    } catch (error) {
      sails.log.error('[NotificationWorker] Error processing queue', error);
    }
  }

  /**
   * Sleep helper
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get worker status
   * @returns {object}
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      queueStatus: NotificationDeliveryService.getQueueStatus(),
    };
  }
}

// Create singleton instance
const notificationWorker = new NotificationWorker();

module.exports = notificationWorker;
