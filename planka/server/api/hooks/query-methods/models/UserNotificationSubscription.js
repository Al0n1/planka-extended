/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const defaultFind = (criteria) => UserNotificationSubscription.find(criteria).sort('id');

/* Query methods */

const createOne = (values) => UserNotificationSubscription.create({ ...values }).fetch();

const getByUserId = (userId) =>
  defaultFind({
    userId,
  });

const getEnabledByUserId = (userId) =>
  defaultFind({
    userId,
    isEnabled: true,
  });

const getByUserIdAndBoardId = (userId, boardId) =>
  defaultFind({
    userId,
    boardId,
  });

const getByUserIdAndProjectId = (userId, projectId) =>
  defaultFind({
    userId,
    projectId,
  });

const getByEventType = (eventType) =>
  defaultFind({
    eventType,
    isEnabled: true,
  });

const getOneById = (id) => UserNotificationSubscription.findOne(id);

const updateOne = (criteria, values) =>
  UserNotificationSubscription.updateOne(criteria).set({ ...values });

// eslint-disable-next-line no-underscore-dangle
const delete_ = (criteria) => UserNotificationSubscription.destroy(criteria).fetch();

const deleteOne = (criteria) => UserNotificationSubscription.destroyOne(criteria);

module.exports = {
  createOne,
  getByUserId,
  getEnabledByUserId,
  getByUserIdAndBoardId,
  getByUserIdAndProjectId,
  getByEventType,
  getOneById,
  updateOne,
  deleteOne,
  delete: delete_,
};
