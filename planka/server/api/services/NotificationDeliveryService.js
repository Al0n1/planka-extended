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

const promisifyExecFile = util.promisify(execFile);

class NotificationDeliveryService {
  constructor() {
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

    // Add to queue
    this.deliveryQueue.push({
      event,
      queuedAt: new Date(),
      status: 'queued',
    });

    // Process immediately if worker is available
    // Otherwise it will be picked up by the worker
    if (global.notificationWorkerReady) {
      setImmediate(() => this.processNext());
    }
  }

  /**
   * Process next item in delivery queue
   * @returns {Promise<void>}
   */
  async processNext() {
    if (this.deliveryQueue.length === 0) {
      return;
    }

    const item = this.deliveryQueue.shift();
    
    try {
      await this.processEvent(item.event);
    } catch (error) {
      sails.log.error('[NotificationDeliveryService] Failed to process event', error);
      // Re-queue with retry logic could be added here
    }
  }

  /**
   * Process a notification event
   * @param {object} event - The notification event
   * @returns {Promise<void>}
   */
  async processEvent(event) {
    sails.log.debug('[NotificationDeliveryService] Processing event', event.type);

    // Get subscribers for this event
    const subscribers = await this.getSubscribers(event);

    if (subscribers.length === 0) {
      sails.log.debug('[NotificationDeliveryService] No subscribers found for event');
      return;
    }

    // Get notification channels for subscribers
    const deliveryPromises = subscribers.map((subscriber) =>
      this.deliverToSubscriber(event, subscriber),
    );

    await Promise.allSettled(deliveryPromises);
  }

  /**
   * Get subscribers for an event
   * @param {object} event - The notification event
   * @returns {Promise<Array>}
   */
  async getSubscribers(event) {
    // For now, maintain backward compatibility with existing NotificationService
    // This will be enhanced in future iterations with UserNotificationSubscription
    
    const { boardId } = event;
    
    if (!boardId) {
      return [];
    }

    // Get legacy notification services
    const notificationServices = await NotificationService.qm.getByBoardId(boardId);

    return notificationServices.map((service) => ({
      channelId: service.id,
      userId: service.userId,
      serviceUrl: service.url,
      format: service.format,
      serviceType: 'apprise', // Legacy services use Apprise
    }));
  }

  /**
   * Deliver notification to a subscriber
   * @param {object} event - The notification event
   * @param {object} subscriber - Subscriber information with channel details
   * @returns {Promise<void>}
   */
  async deliverToSubscriber(event, subscriber) {
    const logEntry = {
      channelId: subscriber.channelId,
      eventType: event.type,
      status: 'pending',
      eventPayload: event,
      attemptCount: 1,
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
      'comment.created': t('Comment Added'),
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
