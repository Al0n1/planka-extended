/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    values: {
      type: 'json',
      required: true,
    },
    project: {
      type: 'ref',
      required: true,
    },
    board: {
      type: 'ref',
      required: true,
    },
    list: {
      type: 'ref',
      required: true,
    },
    card: {
      type: 'ref',
      required: true,
    },
    actorUser: {
      type: 'ref',
      required: true,
    },
    request: {
      type: 'ref',
    },
  },

  exists: {
    linkedCardOrNameMustBeInValues: {},
  },

  async fn(inputs) {
    const { values } = inputs;

    if (!values.linkedCard && !values.name) {
      throw 'linkedCardOrNameMustBeInValues';
    }

    const tasks = await Task.qm.getByTaskListId(values.taskList.id);

    const { position, repositions } = sails.helpers.utils.insertToPositionables(
      values.position,
      tasks,
    );

    // eslint-disable-next-line no-restricted-syntax
    for (const reposition of repositions) {
      // eslint-disable-next-line no-await-in-loop
      await Task.qm.updateOne(
        {
          id: reposition.record.id,
          taskListId: reposition.record.taskListId,
        },
        {
          position: reposition.position,
        },
      );

      sails.sockets.broadcast(`board:${inputs.board.id}`, 'taskUpdate', {
        item: {
          id: reposition.record.id,
          position: reposition.position,
        },
      });

      // TODO: send webhooks
    }

    if (values.linkedCard) {
      Object.assign(values, {
        linkedCardId: values.linkedCard.id,
        name: values.linkedCard.name,
      });

      if (values.linkedCard.isClosed) {
        values.isCompleted = true;
      }
    }

    const task = await Task.qm.createOne({
      ...values,
      position,
      taskListId: values.taskList.id,
    });

    sails.sockets.broadcast(
      `board:${inputs.board.id}`,
      'taskCreate',
      {
        item: task,
      },
      inputs.request,
    );

    const webhooks = await Webhook.qm.getAll();

    sails.helpers.utils.sendWebhooks.with({
      webhooks,
      event: Webhook.Events.TASK_CREATE,
      buildData: () => ({
        item: task,
        included: {
          projects: [inputs.project],
          boards: [inputs.board],
          lists: [inputs.list],
          cards: [inputs.card],
          taskLists: [values.taskList],
        },
      }),
      user: inputs.actorUser,
    });

    // Emit task.created notification event
    try {
      await sails.services.notificationeventbus.emitNotificationEvent('task.created', {
        actorId: inputs.actorUser.id,
        boardId: inputs.board.id,
        projectId: inputs.project.id,
        cardId: inputs.card.id,
        taskId: task.id,
        card: {
          id: inputs.card.id,
          name: inputs.card.name,
        },
        task: {
          id: task.id,
          name: task.name,
          isCompleted: task.isCompleted,
        },
      });
    } catch (err) {
      sails.log.error('[tasks/create-one] Failed to emit task.created event:', err);
    }

    return task;
  },
};
