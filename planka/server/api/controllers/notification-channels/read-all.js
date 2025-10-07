/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {},

  async fn() {
    const { currentUser } = this.req;

    // Get all notification channels for the current user
    const channels = await UserNotificationChannel.find({
      userId: currentUser.id,
    }).sort('createdAt ASC');

    return {
      items: channels.map((channel) => ({
        id: channel.id,
        serviceType: channel.serviceType,
        format: channel.format,
        isActive: channel.isActive,
        createdAt: channel.createdAt,
        updatedAt: channel.updatedAt,
        // Don't expose serviceUrl for security
      })),
    };
  },
};
