/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const defaultFind = (criteria) => UserNotificationChannel.find(criteria).sort('id');

/* Query methods */

const createOne = (values) => UserNotificationChannel.create({ ...values }).fetch();

const getByUserId = (userId) =>
  defaultFind({
    userId,
  });

const getActiveByUserId = (userId) =>
  defaultFind({
    userId,
    isActive: true,
  });

const getOneById = (id) => UserNotificationChannel.findOne(id);

const updateOne = (criteria, values) =>
  UserNotificationChannel.updateOne(criteria).set({ ...values });

// eslint-disable-next-line no-underscore-dangle
const delete_ = (criteria) => UserNotificationChannel.destroy(criteria).fetch();

const deleteOne = (criteria) => UserNotificationChannel.destroyOne(criteria);

module.exports = {
  createOne,
  getByUserId,
  getActiveByUserId,
  getOneById,
  updateOne,
  deleteOne,
  delete: delete_,
};
