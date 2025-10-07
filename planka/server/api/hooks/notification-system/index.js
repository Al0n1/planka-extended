/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * notification-system hook
 *
 * @description :: Initializes the notification system with Redis queue and worker
 */

module.exports = function defineNotificationSystemHook(sails) {
  return {
    /**
     * Runs when this Sails app loads/lifts.
     */
    async initialize() {
      sails.log.info('Initializing custom hook (`notification-system`)');

      try {
        // Initialize notification queue
        const notificationQueue = require('../../services/notification-queue');
        await notificationQueue.initialize();

        // Start notification worker
        const notificationWorker = require('../../../workers/notification-worker');
        await notificationWorker.start();

        sails.log.info('[notification-system] Notification system initialized successfully');

        // Handle graceful shutdown
        const gracefulShutdown = async () => {
          sails.log.info('[notification-system] Shutting down notification system...');

          try {
            await notificationWorker.stop();
            await notificationQueue.close();
            sails.log.info('[notification-system] Notification system shut down successfully');
          } catch (error) {
            sails.log.error('[notification-system] Error during shutdown:', error);
          }
        };

        // Register shutdown handlers
        process.on('SIGTERM', gracefulShutdown);
        process.on('SIGINT', gracefulShutdown);

        // Store references globally for access by other parts of the app
        sails.notificationQueue = notificationQueue;
        sails.notificationWorker = notificationWorker;
      } catch (error) {
        sails.log.error('[notification-system] Failed to initialize notification system:', error);
        // Don't throw - allow app to start even if notification system fails
        // This provides graceful degradation
      }
    },

    /**
     * Runs when this Sails app is lowered
     */
    async teardown() {
      sails.log.info('[notification-system] Tearing down notification system');

      try {
        if (sails.notificationWorker) {
          await sails.notificationWorker.stop();
        }
        if (sails.notificationQueue) {
          await sails.notificationQueue.close();
        }
      } catch (error) {
        sails.log.error('[notification-system] Error during teardown:', error);
      }
    },
  };
};
