/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    values: {
      type: 'ref',
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
    requestId: {
      type: 'string',
    },
    request: {
      type: 'ref',
    },
  },

  async fn(inputs) {
    const { values } = inputs;

    const attachment = await Attachment.qm.createOne({
      ...values,
      cardId: values.card.id,
      creatorUserId: values.creatorUser.id,
    });

    sails.sockets.broadcast(
      `board:${inputs.board.id}`,
      'attachmentCreate',
      {
        item: sails.helpers.attachments.presentOne(attachment),
        requestId: inputs.requestId,
      },
      inputs.request,
    );

    const webhooks = await Webhook.qm.getAll();

    sails.helpers.utils.sendWebhooks.with({
      webhooks,
      event: Webhook.Events.ATTACHMENT_CREATE,
      buildData: () => ({
        item: sails.helpers.attachments.presentOne(attachment),
        included: {
          projects: [inputs.project],
          boards: [inputs.board],
          lists: [inputs.list],
          cards: [values.card],
        },
      }),
      user: values.creatorUser,
    });

    // Emit attachment.added notification event
    try {
      await sails.services.notificationeventbus.emitNotificationEvent('attachment.added', {
        actorId: values.creatorUser.id,
        boardId: inputs.board.id,
        projectId: inputs.project.id,
        cardId: values.card.id,
        attachmentId: attachment.id,
        card: {
          id: values.card.id,
          name: values.card.name,
        },
        attachment: {
          id: attachment.id,
          name: attachment.name,
          type: attachment.type,
        },
      });
    } catch (err) {
      sails.log.error('[attachments/create-one] Failed to emit attachment.added event:', err);
    }

    if (!values.card.coverAttachmentId) {
      if (attachment.type === Attachment.Types.FILE && attachment.data.image) {
        await sails.helpers.cards.updateOne.with({
          webhooks,
          record: values.card,
          values: {
            coverAttachmentId: attachment.id,
          },
          project: inputs.project,
          board: inputs.board,
          list: inputs.list,
          actorUser: values.creatorUser,
        });
      }
    }

    return attachment;
  },
};
