/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * notification-worker.js
 *
 * @description :: Worker process for handling notification delivery queue
 *                 Uses BullMQ to process Redis-backed persistent queue
 */

const { Worker } = require('bullmq');
const Redis = require('ioredis');
const NotificationDeliveryService = require('../api/services/NotificationDeliveryService');

class NotificationWorker {
  constructor() {
    this.worker = null;
    this.connection = null;
    this.isRunning = false;
    this.concurrency = parseInt(process.env.QUEUE_CONCURRENCY, 10) || 5;
  }

  /**
   * Start the worker
   */
  async start() {
    if (this.isRunning) {
      sails.log.warn('[NotificationWorker] Worker already running');
      return;
    }

    try {
      // Get Redis configuration
      const redisUrl =
        sails.config.custom.notificationRedisUrl ||
        process.env.NOTIFICATION_REDIS_URL ||
        process.env.REDIS_URL ||
        'redis://localhost:6379';

      sails.log.info('[NotificationWorker] Connecting to Redis:', redisUrl.replace(/:[^:@]+@/, ':***@'));

      // Create Redis connection for worker
      this.connection = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      // Create BullMQ worker
      this.worker = new Worker(
        'notifications',
        async (job) => {
          return this.processJob(job);
        },
        {
          connection: this.connection,
          concurrency: this.concurrency,
          limiter: {
            max: 10, // Max 10 jobs
            duration: 1000, // per second
          },
        },
      );

      // Worker event handlers
      this.worker.on('completed', (job, result) => {
        sails.log.debug('[NotificationWorker] Job completed', {
          jobId: job.id,
          eventType: job.data.event.type,
          result,
        });
      });

      this.worker.on('failed', async (job, error) => {
        sails.log.error('[NotificationWorker] Job failed', {
          jobId: job.id,
          eventType: job?.data?.event?.type,
          error: error.message,
          attemptsMade: job?.attemptsMade,
          attemptsMax: job?.opts?.attempts,
        });

        // Log to database
        if (job?.data?.event) {
          await this.logFailure(job, error);
        }
      });

      this.worker.on('error', (error) => {
        sails.log.error('[NotificationWorker] Worker error:', error);
      });

      this.isRunning = true;
      global.notificationWorkerReady = true;

      sails.log.info('[NotificationWorker] Worker started', {
        concurrency: this.concurrency,
      });
    } catch (error) {
      sails.log.error('[NotificationWorker] Failed to start worker:', error);
      throw error;
    }
  }

  /**
   * Process a job from the queue
   * @param {object} job - BullMQ job
   * @returns {Promise<object>}
   */
  async processJob(job) {
    const { event } = job.data;

    sails.log.debug('[NotificationWorker] Processing job', {
      jobId: job.id,
      eventType: event.type,
      attemptsMade: job.attemptsMade,
    });

    try {
      // Process the event through NotificationDeliveryService
      const result = await NotificationDeliveryService.dispatch(event, {
        jobId: job.id,
        retryCount: job.attemptsMade,
      });

      return result;
    } catch (error) {
      sails.log.error('[NotificationWorker] Error processing job', {
        jobId: job.id,
        error: error.message,
      });
      throw error; // Re-throw to trigger BullMQ retry
    }
  }

  /**
   * Log job failure to database
   * @param {object} job - BullMQ job
   * @param {Error} error - Error that caused failure
   */
  async logFailure(job, error) {
    try {
      await NotificationDeliveryLog.create({
        eventType: job.data.event.type,
        status: 'failed',
        errorMessage: error.message,
        eventPayload: job.data.event,
        attemptCount: job.attemptsMade,
        jobId: job.id,
      });
    } catch (logError) {
      sails.log.error('[NotificationWorker] Failed to log failure:', logError);
    }
  }

  /**
   * Stop the worker
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    sails.log.info('[NotificationWorker] Stopping notification worker');

    this.isRunning = false;
    global.notificationWorkerReady = false;

    try {
      if (this.worker) {
        await this.worker.close();
        this.worker = null;
      }

      if (this.connection) {
        await this.connection.quit();
        this.connection = null;
      }

      sails.log.info('[NotificationWorker] Worker stopped');
    } catch (error) {
      sails.log.error('[NotificationWorker] Error stopping worker:', error);
    }
  }

  /**
   * Get worker status
   * @returns {object}
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      concurrency: this.concurrency,
    };
  }

  /**
   * Pause the worker
   */
  async pause() {
    if (this.worker) {
      await this.worker.pause();
      sails.log.info('[NotificationWorker] Worker paused');
    }
  }

  /**
   * Resume the worker
   */
  async resume() {
    if (this.worker) {
      await this.worker.resume();
      sails.log.info('[NotificationWorker] Worker resumed');
    }
  }
}

// Create singleton instance
const notificationWorker = new NotificationWorker();

module.exports = notificationWorker;
