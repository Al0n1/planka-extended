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
    isEnabled: {
      type: 'boolean',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    let subscription = await UserNotificationSubscription.findOne({
      id: inputs.id,
      userId: currentUser.id,
    });

    if (!subscription) {
      throw 'notificationSubscriptionNotFound';
    }

    // Update only provided fields
    const updates = {};
    if (inputs.isEnabled !== undefined) updates.isEnabled = inputs.isEnabled;

    subscription = await UserNotificationSubscription.updateOne({ id: inputs.id }).set(updates);

    sails.log.info('[NotificationSubscriptions] Subscription updated', {
      subscriptionId: subscription.id,
      userId: currentUser.id,
      isEnabled: subscription.isEnabled,
    });

    return {
      item: subscription,
    };
  },
};
