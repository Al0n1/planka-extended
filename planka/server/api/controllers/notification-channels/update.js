/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { ServiceTypes, Formats } = require('../../models/UserNotificationChannel');

module.exports = {
  inputs: {
    id: {
      type: 'string',
      required: true,
    },
    serviceType: {
      type: 'string',
      isIn: Object.values(ServiceTypes),
    },
    serviceUrl: {
      type: 'string',
    },
    format: {
      type: 'string',
      isIn: Object.values(Formats),
    },
    isActive: {
      type: 'boolean',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    let channel = await UserNotificationChannel.findOne({
      id: inputs.id,
      userId: currentUser.id,
    });

    if (!channel) {
      throw 'notificationChannelNotFound';
    }

    // Update only provided fields
    const updates = {};
    if (inputs.serviceType !== undefined) updates.serviceType = inputs.serviceType;
    if (inputs.serviceUrl !== undefined) updates.serviceUrl = inputs.serviceUrl;
    if (inputs.format !== undefined) updates.format = inputs.format;
    if (inputs.isActive !== undefined) updates.isActive = inputs.isActive;

    channel = await UserNotificationChannel.updateOne({ id: inputs.id }).set(updates);

    sails.log.info('[NotificationChannels] Channel updated', {
      channelId: channel.id,
      userId: currentUser.id,
    });

    return {
      item: {
        id: channel.id,
        serviceType: channel.serviceType,
        format: channel.format,
        isActive: channel.isActive,
        createdAt: channel.createdAt,
        updatedAt: channel.updatedAt,
      },
    };
  },
};
