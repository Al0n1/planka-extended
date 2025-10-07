/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * notification-event-bus.test.js
 *
 * Unit tests for NotificationEventBus service
 */

const { expect } = require('chai');
const sinon = require('sinon');

describe('NotificationEventBus', () => {
  let NotificationEventBus;
  let eventBus;
  let queueStub;

  before(() => {
    // Mock sails global
    global.sails = {
      log: {
        debug: sinon.stub(),
        error: sinon.stub(),
        info: sinon.stub(),
      },
      services: {
        notificationqueue: {
          addJob: sinon.stub().resolves({ id: 'test-job-id' }),
        },
      },
    };
  });

  beforeEach(() => {
    // Reset stubs
    global.sails.log.debug.resetHistory();
    global.sails.log.error.resetHistory();
    global.sails.services.notificationqueue.addJob.resetHistory();

    // Load the service
    NotificationEventBus = require('../../api/services/NotificationEventBus');
    eventBus = new NotificationEventBus();
  });

  describe('emitNotificationEvent', () => {
    it('should emit event with required fields', async () => {
      const eventType = 'card.created';
      const payload = {
        actorId: 'user123',
        boardId: 'board123',
        cardId: 'card123',
      };

      await eventBus.emitNotificationEvent(eventType, payload);

      expect(global.sails.log.debug.calledOnce).to.be.true;
      expect(global.sails.services.notificationqueue.addJob.calledOnce).to.be.true;
    });

    it('should throw error if actorId is missing', async () => {
      const eventType = 'card.created';
      const payload = {
        boardId: 'board123',
        cardId: 'card123',
      };

      try {
        await eventBus.emitNotificationEvent(eventType, payload);
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err.message).to.include('actorId is required');
      }
    });

    it('should throw error if boardId is missing', async () => {
      const eventType = 'card.created';
      const payload = {
        actorId: 'user123',
        cardId: 'card123',
      };

      try {
        await eventBus.emitNotificationEvent(eventType, payload);
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err.message).to.include('boardId is required');
      }
    });

    it('should add timestamp to event', async () => {
      const eventType = 'card.created';
      const payload = {
        actorId: 'user123',
        boardId: 'board123',
        cardId: 'card123',
      };

      await eventBus.emitNotificationEvent(eventType, payload);

      const queueCall = global.sails.services.notificationqueue.addJob.getCall(0);
      expect(queueCall.args[0]).to.have.property('timestamp');
    });
  });
});
