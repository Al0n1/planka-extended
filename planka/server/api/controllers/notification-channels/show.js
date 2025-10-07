/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

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
