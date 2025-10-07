/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const NotificationDeliveryService = require('../../services/NotificationDeliveryService');

module.exports = {
  inputs: {
    id: {
      type: 'string',
      required: true,
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const channel = await UserNotificationChannel.findOne({
      id: inputs.id,
      userId: currentUser.id,
    });

    if (!channel) {
      throw 'notificationChannelNotFound';
    }

    try {
      // Build a test notification message
      const testMessage = {
        title: 'Test Notification from Planka',
        bodyByFormat: {
          text: `This is a test notification sent at ${new Date().toISOString()}`,
          markdown: `**This is a test notification** sent at ${new Date().toISOString()}`,
          html: `<strong>This is a test notification</strong> sent at ${new Date().toISOString()}`,
        },
      };

      // Send via channel
      await NotificationDeliveryService.sendViaChannel(
        {
          serviceType: channel.serviceType,
          serviceUrl: channel.serviceUrl,
          format: channel.format,
        },
        testMessage,
      );

      // Log success
      await NotificationDeliveryLog.create({
        channelId: channel.id,
        eventType: 'test.notification',
        status: 'success',
        eventPayload: { test: true },
        attemptCount: 1,
      });

      return {
        success: true,
        message: 'Test notification sent successfully',
      };
    } catch (error) {
      // Log failure
      await NotificationDeliveryLog.create({
        channelId: channel.id,
        eventType: 'test.notification',
        status: 'failed',
        errorMessage: error.message,
        eventPayload: { test: true },
        attemptCount: 1,
      });

      throw {
        message: `Failed to send test notification: ${error.message}`,
        code: 'testNotificationFailed',
      };
    }
  },
};
