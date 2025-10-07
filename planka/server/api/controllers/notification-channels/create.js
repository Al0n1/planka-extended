/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { ServiceTypes, Formats } = require('../../models/UserNotificationChannel');

module.exports = {
  inputs: {
    serviceType: {
      type: 'string',
      isIn: Object.values(ServiceTypes),
      required: true,
    },
    serviceUrl: {
      type: 'string',
      required: true,
    },
    format: {
      type: 'string',
      isIn: Object.values(Formats),
      defaultsTo: Formats.MARKDOWN,
    },
    isActive: {
      type: 'boolean',
      defaultsTo: true,
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    // Create new notification channel
    const channel = await UserNotificationChannel.create({
      userId: currentUser.id,
      serviceType: inputs.serviceType,
      serviceUrl: inputs.serviceUrl,
      format: inputs.format,
      isActive: inputs.isActive,
    }).fetch();

    sails.log.info('[NotificationChannels] Channel created', {
      channelId: channel.id,
      userId: currentUser.id,
      serviceType: channel.serviceType,
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
