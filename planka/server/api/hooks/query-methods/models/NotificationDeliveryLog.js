/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const defaultFind = (criteria) => NotificationDeliveryLog.find(criteria).sort([{ createdAt: 'DESC' }]);

/* Query methods */

const createOne = (values) => NotificationDeliveryLog.create({ ...values }).fetch();

const getByChannelId = (channelId, limit = 100) =>
  NotificationDeliveryLog.find({
    channelId,
  })
    .sort([{ createdAt: 'DESC' }])
    .limit(limit);

const getByEventType = (eventType, limit = 100) =>
  NotificationDeliveryLog.find({
    eventType,
  })
    .sort([{ createdAt: 'DESC' }])
    .limit(limit);

const getByStatus = (status, limit = 100) =>
  NotificationDeliveryLog.find({
    status,
  })
    .sort([{ createdAt: 'DESC' }])
    .limit(limit);

const getRecentFailures = (limit = 50) =>
  NotificationDeliveryLog.find({
    status: 'failed',
  })
    .sort([{ createdAt: 'DESC' }])
    .limit(limit);

const getOneById = (id) => NotificationDeliveryLog.findOne(id);

// eslint-disable-next-line no-underscore-dangle
const delete_ = (criteria) => NotificationDeliveryLog.destroy(criteria).fetch();

const deleteOlderThan = (date) =>
  NotificationDeliveryLog.destroy({
    createdAt: { '<': date },
  }).fetch();

module.exports = {
  createOne,
  getByChannelId,
  getByEventType,
  getByStatus,
  getRecentFailures,
  getOneById,
  delete: delete_,
  deleteOlderThan,
};
