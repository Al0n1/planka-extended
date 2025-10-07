/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * notification-queue.js
 *
 * @description :: Redis-backed persistent queue for notifications using BullMQ
 *                 Provides reliable message delivery with retry and backoff
 */

const { Queue } = require('bullmq');
const Redis = require('ioredis');

class NotificationQueue {
  constructor() {
    this.queue = null;
    this.connection = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the notification queue
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      // Get Redis configuration from sails.config or environment
      const redisUrl =
        sails.config.custom.notificationRedisUrl ||
        process.env.NOTIFICATION_REDIS_URL ||
        process.env.REDIS_URL ||
        'redis://localhost:6379';

      sails.log.info('[NotificationQueue] Connecting to Redis:', redisUrl.replace(/:[^:@]+@/, ':***@'));

      // Create Redis connection
      this.connection = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      // Handle connection events
      this.connection.on('connect', () => {
        sails.log.info('[NotificationQueue] Redis connected');
      });

      this.connection.on('error', (error) => {
        sails.log.error('[NotificationQueue] Redis connection error:', error);
      });

      // Create BullMQ queue
      this.queue = new Queue('notifications', {
        connection: this.connection,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 10000, // Start with 10 seconds
          },
          removeOnComplete: {
            age: 3600, // Keep completed jobs for 1 hour
            count: 1000, // Keep last 1000 completed jobs
          },
          removeOnFail: {
            age: 86400, // Keep failed jobs for 24 hours
          },
        },
      });

      this.isInitialized = true;
      sails.log.info('[NotificationQueue] Notification queue initialized');
    } catch (error) {
      sails.log.error('[NotificationQueue] Failed to initialize queue:', error);
      throw error;
    }
  }

  /**
   * Add a notification event to the queue
   * @param {object} event - The notification event
   * @param {object} options - Job options (priority, delay, etc.)
   * @returns {Promise<object>} The created job
   */
  async add(event, options = {}) {
    if (!this.isInitialized) {
      throw new Error('NotificationQueue not initialized');
    }

    try {
      // Determine priority based on event type
      const priority = this.getPriority(event.type);

      const jobOptions = {
        priority,
        ...options,
      };

      // Add job to queue
      const job = await this.queue.add(
        'deliver-notification',
        {
          event,
          queuedAt: new Date().toISOString(),
        },
        jobOptions,
      );

      sails.log.debug('[NotificationQueue] Job added to queue', {
        jobId: job.id,
        eventType: event.type,
        priority,
      });

      return job;
    } catch (error) {
      sails.log.error('[NotificationQueue] Failed to add job to queue:', error);
      throw error;
    }
  }

  /**
   * Get priority for event type
   * @param {string} eventType - The event type
   * @returns {number} Priority (1 = highest, 10 = lowest)
   */
  getPriority(eventType) {
    // High priority events
    const highPriorityEvents = [
      'dueDate.passed',
      'dueDate.approaching',
      'user.assigned',
    ];

    // Medium priority events
    const mediumPriorityEvents = [
      'comment.created',
      'card.moved',
    ];

    if (highPriorityEvents.includes(eventType)) {
      return 1; // High priority
    }

    if (mediumPriorityEvents.includes(eventType)) {
      return 5; // Medium priority
    }

    return 10; // Normal/low priority
  }

  /**
   * Get queue statistics
   * @returns {Promise<object>} Queue statistics
   */
  async getStats() {
    if (!this.isInitialized) {
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      };
    }

    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.queue.getWaitingCount(),
        this.queue.getActiveCount(),
        this.queue.getCompletedCount(),
        this.queue.getFailedCount(),
        this.queue.getDelayedCount(),
      ]);

      return {
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + delayed,
      };
    } catch (error) {
      sails.log.error('[NotificationQueue] Failed to get queue stats:', error);
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        error: error.message,
      };
    }
  }

  /**
   * Get failed jobs
   * @param {number} start - Start index
   * @param {number} end - End index
   * @returns {Promise<Array>} Failed jobs
   */
  async getFailedJobs(start = 0, end = 10) {
    if (!this.isInitialized) {
      return [];
    }

    try {
      return await this.queue.getFailed(start, end);
    } catch (error) {
      sails.log.error('[NotificationQueue] Failed to get failed jobs:', error);
      return [];
    }
  }

  /**
   * Retry a failed job
   * @param {string} jobId - The job ID
   * @returns {Promise<void>}
   */
  async retryJob(jobId) {
    if (!this.isInitialized) {
      throw new Error('NotificationQueue not initialized');
    }

    try {
      const job = await this.queue.getJob(jobId);
      if (job) {
        await job.retry();
        sails.log.info('[NotificationQueue] Job retried:', jobId);
      }
    } catch (error) {
      sails.log.error('[NotificationQueue] Failed to retry job:', error);
      throw error;
    }
  }

  /**
   * Close the queue and connections
   * @returns {Promise<void>}
   */
  async close() {
    if (!this.isInitialized) {
      return;
    }

    try {
      await this.queue.close();
      await this.connection.quit();
      this.isInitialized = false;
      sails.log.info('[NotificationQueue] Queue closed');
    } catch (error) {
      sails.log.error('[NotificationQueue] Error closing queue:', error);
    }
  }

  /**
   * Pause the queue
   * @returns {Promise<void>}
   */
  async pause() {
    if (!this.isInitialized) {
      return;
    }

    await this.queue.pause();
    sails.log.info('[NotificationQueue] Queue paused');
  }

  /**
   * Resume the queue
   * @returns {Promise<void>}
   */
  async resume() {
    if (!this.isInitialized) {
      return;
    }

    await this.queue.resume();
    sails.log.info('[NotificationQueue] Queue resumed');
  }
}

// Create singleton instance
const notificationQueue = new NotificationQueue();

module.exports = notificationQueue;
