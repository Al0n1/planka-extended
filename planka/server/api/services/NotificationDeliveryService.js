/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * NotificationDeliveryService.js
 *
 * @description :: Service responsible for delivering notifications to users
 *                 Handles queuing and actual delivery through various channels
 */

const { execFile } = require('child_process');
const util = require('util');
const notificationQueue = require('./notification-queue');

const promisifyExecFile = util.promisify(execFile);

class NotificationDeliveryService {
  constructor() {
    // Legacy in-memory queue for backward compatibility
    this.deliveryQueue = [];
  }

  /**
   * Queue a notification event for delivery
   * @param {object} event - Notification event to deliver
   * @returns {Promise<void>}
   */
  async queue(event) {
    sails.log.debug('[NotificationDeliveryService] Queuing event for delivery', {
      type: event.type,
      boardId: event.boardId,
    });

    try {
      // Add to Redis queue
      await notificationQueue.add(event);
    } catch (error) {
      sails.log.error('[NotificationDeliveryService] Failed to queue event:', error);
      // Fallback to in-memory queue
      this.deliveryQueue.push({
        event,
        queuedAt: new Date(),
        status: 'queued',
      });
    }
  }

  /**
   * Process next item in delivery queue (legacy method for backward compatibility)
   * @returns {Promise<void>}
   */
  async processNext() {
    if (this.deliveryQueue.length === 0) {
      return;
    }

    const item = this.deliveryQueue.shift();

    try {
      await this.dispatch(item.event);
    } catch (error) {
      sails.log.error('[NotificationDeliveryService] Failed to process event', error);
    }
  }

  /**
   * Dispatch notification event to eligible subscribers
   * Main entry point for notification delivery
   * @param {object} event - The notification event
   * @param {object} options - Additional options (jobId, retryCount)
   * @returns {Promise<object>}
   */
  async dispatch(event, options = {}) {
    sails.log.debug('[NotificationDeliveryService] Dispatching event', {
      type: event.type,
      jobId: options.jobId,
    });

    const startTime = Date.now();
    const result = {
      eventType: event.type,
      totalSubscribers: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      deliveries: [],
    };

    try {
      // Get eligible subscribers for this event
      const subscribers = await this.getEligibleSubscribers(event);
      result.totalSubscribers = subscribers.length;

      if (subscribers.length === 0) {
        sails.log.debug('[NotificationDeliveryService] No eligible subscribers found');
        return result;
      }

      // Deliver to each subscriber
      for (const subscriber of subscribers) {
        try {
          await this.deliverToSubscriber(event, subscriber, options);
          result.successful += 1;
          result.deliveries.push({
            userId: subscriber.userId,
            channelId: subscriber.channelId,
            status: 'success',
          });
        } catch (error) {
          result.failed += 1;
          result.deliveries.push({
            userId: subscriber.userId,
            channelId: subscriber.channelId,
            status: 'failed',
            error: error.message,
          });
        }
      }

      const duration = Date.now() - startTime;
      sails.log.info('[NotificationDeliveryService] Event dispatched', {
        eventType: event.type,
        subscribers: result.totalSubscribers,
        successful: result.successful,
        failed: result.failed,
        duration,
      });

      return result;
    } catch (error) {
      sails.log.error('[NotificationDeliveryService] Error dispatching event:', error);
      throw error;
    }
  }

  /**
   * Get eligible subscribers for an event
   * Filters based on subscriptions, channels, membership, and scope
   * @param {object} event - The notification event
   * @returns {Promise<Array>}
   */
  async getEligibleSubscribers(event) {
    const { type, boardId, projectId, actorId } = event;

    sails.log.debug('[NotificationDeliveryService] Finding eligible subscribers', {
      eventType: type,
      boardId,
      projectId,
    });

    // Get subscriptions for this event type
    const subscriptions = await UserNotificationSubscription.find({
      eventType: type,
      isEnabled: true,
      or: [
        { boardId }, // Board-specific
        { projectId }, // Project-specific
        { boardId: null, projectId: null }, // Global
      ],
    });

    if (subscriptions.length === 0) {
      return [];
    }

    const subscribers = [];

    for (const subscription of subscriptions) {
      // Skip if user is the actor (don't notify yourself)
      if (subscription.userId === actorId) {
        continue;
      }

      // Check membership
      const isMember = await this.checkMembership(subscription.userId, boardId, projectId);
      if (!isMember) {
        continue;
      }

      // Get active channels for this user
      const channels = await UserNotificationChannel.find({
        userId: subscription.userId,
        isActive: true,
      });

      if (channels.length === 0) {
        continue;
      }

      // Add each channel as a separate subscriber
      for (const channel of channels) {
        subscribers.push({
          userId: subscription.userId,
          channelId: channel.id,
          serviceUrl: channel.serviceUrl,
          serviceType: channel.serviceType,
          format: channel.format,
        });
      }
    }

    return subscribers;
  }

  /**
   * Check if user is a member of the board or project
   * @param {string} userId - User ID
   * @param {string} boardId - Board ID
   * @param {string} projectId - Project ID
   * @returns {Promise<boolean>}
   */
  async checkMembership(userId, boardId, projectId) {
    // Check board membership
    if (boardId) {
      const boardMembership = await BoardMembership.findOne({
        userId,
        boardId,
      });

      if (boardMembership) {
        return true;
      }
    }

    // Check project membership (managers)
    if (projectId) {
      const projectManager = await ProjectManager.findOne({
        userId,
        projectId,
      });

      if (projectManager) {
        return true;
      }
    }

    return false;
  }

  /**
   * Deliver notification to a subscriber
   * @param {object} event - The notification event
   * @param {object} subscriber - Subscriber information with channel details
   * @param {object} options - Delivery options (jobId, retryCount)
   * @returns {Promise<void>}
   */
  async deliverToSubscriber(event, subscriber, options = {}) {
    const logEntry = {
      channelId: subscriber.channelId,
      eventType: event.type,
      status: 'pending',
      eventPayload: event,
      attemptCount: 1,
      jobId: options.jobId || null,
      retryCount: options.retryCount || 0,
    };

    try {
      // Build notification message
      const message = await this.buildMessage(event);

      // Send via appropriate channel
      await this.sendViaChannel(subscriber, message);

      // Log success
      logEntry.status = 'success';
      await NotificationDeliveryLog.create(logEntry);

      sails.log.info('[NotificationDeliveryService] Successfully delivered notification', {
        channelId: subscriber.channelId,
        eventType: event.type,
      });
    } catch (error) {
      // Log failure
      logEntry.status = 'failed';
      logEntry.errorMessage = error.message;
      await NotificationDeliveryLog.create(logEntry);

      sails.log.error('[NotificationDeliveryService] Failed to deliver notification', {
        channelId: subscriber.channelId,
        eventType: event.type,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Build notification message from event
   * @param {object} event - The notification event
   * @returns {Promise<object>}
   */
  async buildMessage(event) {
    // Get necessary data for message building
    const { type, boardId, cardId, actorId, payload } = event;

    // Fetch related entities
    const board = await Board.findOne({ id: boardId });
    const card = cardId ? await Card.findOne({ id: cardId }) : null;
    const actor = await User.findOne({ id: actorId });

    if (!board || !actor) {
      throw new Error('Required entities not found for message building');
    }

    // Build title and body
    const t = sails.helpers.utils.makeTranslator();
    const title = this.buildTitle(type, t);
    const bodyByFormat = this.buildBodyByFormat(type, board, card, payload, actor, t);

    return {
      title,
      bodyByFormat,
    };
  }

  /**
   * Build message title
   * @param {string} eventType - Type of event
   * @param {function} t - Translation function
   * @returns {string}
   */
  buildTitle(eventType, t) {
    const titleMap = {
      'card.created': t('Card Created'),
      'card.moved': t('Card Moved'),
      'card.updated': t('Card Updated'),
      'card.deleted': t('Card Deleted'),
      'comment.created': t('Comment Added'),
      'task.created': t('Task Created'),
      'task.completed': t('Task Completed'),
      'attachment.added': t('Attachment Added'),
      'dueDate.approaching': t('Due Date Approaching'),
      'dueDate.passed': t('Due Date Passed'),
      'user.assigned': t('You Were Assigned'),
      'user.unassigned': t('You Were Unassigned'),
    };

    return titleMap[eventType] || t('Notification');
  }

  /**
   * Build message body in different formats
   * @param {string} eventType - Type of event
   * @param {object} board - Board object
   * @param {object} card - Card object
   * @param {object} payload - Event payload
   * @param {object} actor - Actor user object
   * @param {function} t - Translation function
   * @returns {object}
   */
  buildBodyByFormat(eventType, board, card, payload, actor, t) {
    const escapeMarkdown = require('escape-markdown');
    const escapeHtml = require('escape-html');

    const cardLink = card ? `${sails.config.custom.baseUrl}/cards/${card.id}` : '';
    const markdownCardLink = card ? `[${escapeMarkdown(card.name)}](${cardLink})` : '';
    const htmlCardLink = card
      ? `<a href="${cardLink}">${escapeHtml(card.name)}</a>`
      : '';

    switch (eventType) {
      case 'card.created': {
        const listName = payload.listName || 'Unknown List';
        return {
          text: t('%s created %s in %s on %s', actor.name, card.name, listName, board.name),
          markdown: t(
            '%s created %s in %s on %s',
            escapeMarkdown(actor.name),
            markdownCardLink,
            `**${escapeMarkdown(listName)}**`,
            escapeMarkdown(board.name),
          ),
          html: t(
            '%s created %s in %s on %s',
            escapeHtml(actor.name),
            htmlCardLink,
            `<b>${escapeHtml(listName)}</b>`,
            escapeHtml(board.name),
          ),
        };
      }
      case 'card.moved': {
        const fromListName = payload.fromListName || 'Unknown List';
        const toListName = payload.toListName || 'Unknown List';
        return {
          text: t(
            '%s moved %s from %s to %s on %s',
            actor.name,
            card.name,
            fromListName,
            toListName,
            board.name,
          ),
          markdown: t(
            '%s moved %s from %s to %s on %s',
            escapeMarkdown(actor.name),
            markdownCardLink,
            `**${escapeMarkdown(fromListName)}**`,
            `**${escapeMarkdown(toListName)}**`,
            escapeMarkdown(board.name),
          ),
          html: t(
            '%s moved %s from %s to %s on %s',
            escapeHtml(actor.name),
            htmlCardLink,
            `<b>${escapeHtml(fromListName)}</b>`,
            `<b>${escapeHtml(toListName)}</b>`,
            escapeHtml(board.name),
          ),
        };
      }
      case 'comment.created': {
        const commentText = payload.commentText
          ? payload.commentText.substring(0, 100)
          : '';
        return {
          text: t('%s commented on %s: %s', actor.name, card.name, commentText),
          markdown: t(
            '%s commented on %s: %s',
            escapeMarkdown(actor.name),
            markdownCardLink,
            escapeMarkdown(commentText),
          ),
          html: t(
            '%s commented on %s: %s',
            escapeHtml(actor.name),
            htmlCardLink,
            escapeHtml(commentText),
          ),
        };
      }
      case 'user.assigned': {
        return {
          text: t('%s assigned you to %s on %s', actor.name, card.name, board.name),
          markdown: t(
            '%s assigned you to %s on %s',
            escapeMarkdown(actor.name),
            markdownCardLink,
            escapeMarkdown(board.name),
          ),
          html: t(
            '%s assigned you to %s on %s',
            escapeHtml(actor.name),
            htmlCardLink,
            escapeHtml(board.name),
          ),
        };
      }
      case 'dueDate.approaching': {
        const dueDate = payload.dueDate || 'soon';
        return {
          text: t('Due date approaching for %s: %s', card.name, dueDate),
          markdown: t(
            'Due date approaching for %s: %s',
            markdownCardLink,
            escapeMarkdown(dueDate),
          ),
          html: t(
            'Due date approaching for %s: %s',
            htmlCardLink,
            escapeHtml(dueDate),
          ),
        };
      }
      case 'dueDate.passed': {
        return {
          text: t('Due date passed for %s on %s', card.name, board.name),
          markdown: t(
            'Due date passed for %s on %s',
            markdownCardLink,
            escapeMarkdown(board.name),
          ),
          html: t(
            'Due date passed for %s on %s',
            htmlCardLink,
            escapeHtml(board.name),
          ),
        };
      }
      case 'task.created': {
        const taskName = payload.taskName || 'New task';
        return {
          text: t('%s added task "%s" to %s', actor.name, taskName, card.name),
          markdown: t(
            '%s added task "%s" to %s',
            escapeMarkdown(actor.name),
            escapeMarkdown(taskName),
            markdownCardLink,
          ),
          html: t(
            '%s added task "%s" to %s',
            escapeHtml(actor.name),
            escapeHtml(taskName),
            htmlCardLink,
          ),
        };
      }
      case 'task.completed': {
        const taskName = payload.taskName || 'Task';
        return {
          text: t('%s completed task "%s" on %s', actor.name, taskName, card.name),
          markdown: t(
            '%s completed task "%s" on %s',
            escapeMarkdown(actor.name),
            escapeMarkdown(taskName),
            markdownCardLink,
          ),
          html: t(
            '%s completed task "%s" on %s',
            escapeHtml(actor.name),
            escapeHtml(taskName),
            htmlCardLink,
          ),
        };
      }
      case 'attachment.added': {
        const fileName = payload.fileName || 'file';
        return {
          text: t('%s added attachment "%s" to %s', actor.name, fileName, card.name),
          markdown: t(
            '%s added attachment "%s" to %s',
            escapeMarkdown(actor.name),
            escapeMarkdown(fileName),
            markdownCardLink,
          ),
          html: t(
            '%s added attachment "%s" to %s',
            escapeHtml(actor.name),
            escapeHtml(fileName),
            htmlCardLink,
          ),
        };
      }
      default:
        return {
          text: t('Notification from %s', board.name),
          markdown: t('Notification from %s', escapeMarkdown(board.name)),
          html: t('Notification from %s', escapeHtml(board.name)),
        };
    }
  }

  /**
   * Send notification via specific channel
   * @param {object} subscriber - Subscriber with channel information
   * @param {object} message - Message with title and bodyByFormat
   * @returns {Promise<void>}
   */
  async sendViaChannel(subscriber, message) {
    const { serviceType, serviceUrl, format } = subscriber;
    const { title, bodyByFormat } = message;

    if (serviceType === 'apprise') {
      // Use existing Apprise Python script
      await this.sendViaApprise(serviceUrl, format, title, bodyByFormat);
    } else {
      throw new Error(`Unsupported service type: ${serviceType}`);
    }
  }

  /**
   * Send notification via Apprise
   * @param {string} url - Apprise service URL
   * @param {string} format - Message format (text, markdown, html)
   * @param {string} title - Notification title
   * @param {object} bodyByFormat - Body in different formats
   * @returns {Promise<void>}
   */
  async sendViaApprise(url, format, title, bodyByFormat) {
    const services = [{ url, format }];
    
    return promisifyExecFile(`${sails.config.appPath}/.venv/bin/python3`, [
      `${sails.config.appPath}/utils/send_notifications.py`,
      JSON.stringify(services),
      title,
      JSON.stringify(bodyByFormat),
    ]);
  }

  /**
   * Get queue status
   * @returns {object}
   */
  getQueueStatus() {
    return {
      queueLength: this.deliveryQueue.length,
      items: this.deliveryQueue.map((item) => ({
        type: item.event.type,
        status: item.status,
        queuedAt: item.queuedAt,
      })),
    };
  }
}

// Create singleton instance
const notificationDeliveryService = new NotificationDeliveryService();

module.exports = notificationDeliveryService;
