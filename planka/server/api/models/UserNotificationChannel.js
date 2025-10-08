/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * UserNotificationChannel.js
 *
 * @description :: Model for storing individual user notification delivery channels
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

const ServiceTypes = {
  APPRISE: 'apprise',
  EMAIL: 'email',
  SLACK: 'slack',
};

const Formats = {
  TEXT: 'text',
  MARKDOWN: 'markdown',
  HTML: 'html',
};

module.exports = {
  ServiceTypes,
  Formats,

  attributes: {
    //  ╔═╗╦═╗╦╔╦╗╦╔╦╗╦╦  ╦╔═╗╔═╗
    //  ╠═╝╠╦╝║║║║║ ║ ║╚╗╔╝║╣ ╚═╗
    //  ╩  ╩╚═╩╩ ╩╩ ╩ ╩ ╚╝ ╚═╝╚═╝

    serviceType: {
      type: 'string',
      isIn: Object.values(ServiceTypes),
      defaultsTo: ServiceTypes.APPRISE,
    },
    serviceUrl: {
      type: 'string',
      required: true,
      columnType: 'text',
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

    //  ╔═╗╔╦╗╔╗ ╔═╗╔╦╗╔═╗
    //  ║╣ ║║║╠╩╗║╣  ║║╚═╗
    //  ╚═╝╩ ╩╚═╝╚═╝═╩╝╚═╝

    //  ╔═╗╔═╗╔═╗╔═╗╔═╗╦╔═╗╔╦╗╦╔═╗╔╗╔╔═╗
    //  ╠═╣╚═╗╚═╗║ ║║  ║╠═╣ ║ ║║ ║║║║╚═╗
    //  ╩ ╩╚═╝╚═╝╚═╝╚═╝╩╩ ╩ ╩ ╩╚═╝╝╚╝╚═╝

    userId: {
      model: 'User',
      required: true,
      columnName: 'user_id',
    },
  },

  customToJSON() {
    return _.omit(this, ['serviceUrl']); // Hide sensitive data in API responses
  },

  // Placeholder for future encryption functionality
  encryptServiceUrl(url) {
    // TODO: Implement encryption in future iterations
    return url;
  },

  decryptServiceUrl(encryptedUrl) {
    // TODO: Implement decryption in future iterations
    return encryptedUrl;
  },

  tableName: 'user_notification_channel',
};
