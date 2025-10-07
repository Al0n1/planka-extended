/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * due-date-worker.test.js
 *
 * Unit tests for DueDateWorker
 */

const { expect } = require('chai');
const sinon = require('sinon');

describe('DueDateWorker', () => {
  let DueDateWorker;
  let worker;
  let findStub;
  let emitStub;

  before(() => {
    // Mock global Card model
    global.Card = {
      find: sinon.stub(),
    };

    global.List = {
      findOne: sinon.stub(),
    };

    global.Project = {
      findOne: sinon.stub(),
    };

    global.CardMembership = {
      find: sinon.stub(),
    };

    global.BoardMembership = {
      find: sinon.stub(),
    };

    global.sails = {
      log: {
        debug: sinon.stub(),
        error: sinon.stub(),
        info: sinon.stub(),
      },
      services: {
        notificationeventbus: {
          emitNotificationEvent: sinon.stub().resolves(),
        },
      },
    };

    global.console = {
      log: sinon.stub(),
      error: sinon.stub(),
      warn: sinon.stub(),
    };
  });

  beforeEach(() => {
    // Reset all stubs
    global.Card.find.resetHistory();
    global.List.findOne.resetHistory();
    global.Project.findOne.resetHistory();
    global.CardMembership.find.resetHistory();
    global.BoardMembership.find.resetHistory();
    global.sails.services.notificationeventbus.emitNotificationEvent.resetHistory();

    // Load worker
    DueDateWorker = require('../../workers/due-date-worker');
    worker = new DueDateWorker();
  });

  describe('checkDueDates', () => {
    it('should find cards with approaching due dates', async () => {
      const now = new Date();
      const approachingDate = new Date(now.getTime() + 12 * 60 * 60 * 1000); // 12 hours from now

      const mockCard = {
        id: 'card123',
        name: 'Test Card',
        dueDate: approachingDate,
        isDueCompleted: false,
        listId: 'list123',
      };

      const mockList = {
        id: 'list123',
        name: 'Test List',
        boardId: 'board123',
        board: {
          id: 'board123',
          name: 'Test Board',
          projectId: 'project123',
        },
      };

      const mockProject = {
        id: 'project123',
        name: 'Test Project',
      };

      global.Card.find.resolves([mockCard]);
      global.List.findOne.resolves(mockList);
      global.Project.findOne.resolves(mockProject);
      global.CardMembership.find.resolves([{ userId: 'user123' }]);

      await worker.checkDueDates();

      expect(global.Card.find.calledOnce).to.be.true;
      expect(global.sails.services.notificationeventbus.emitNotificationEvent.called).to.be.true;
    });

    it('should find cards with passed due dates', async () => {
      const now = new Date();
      const passedDate = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago

      const mockCard = {
        id: 'card123',
        name: 'Overdue Card',
        dueDate: passedDate,
        isDueCompleted: false,
        listId: 'list123',
      };

      const mockList = {
        id: 'list123',
        name: 'Test List',
        boardId: 'board123',
        board: {
          id: 'board123',
          name: 'Test Board',
          projectId: 'project123',
        },
      };

      const mockProject = {
        id: 'project123',
        name: 'Test Project',
      };

      global.Card.find.resolves([mockCard]);
      global.List.findOne.resolves(mockList);
      global.Project.findOne.resolves(mockProject);
      global.CardMembership.find.resolves([{ userId: 'user123' }]);

      await worker.checkDueDates();

      expect(global.Card.find.calledOnce).to.be.true;
      expect(global.sails.services.notificationeventbus.emitNotificationEvent.called).to.be.true;
    });

    it('should handle cards with no due dates', async () => {
      global.Card.find.resolves([]);

      await worker.checkDueDates();

      expect(global.Card.find.calledOnce).to.be.true;
      expect(global.sails.services.notificationeventbus.emitNotificationEvent.called).to.be.false;
    });
  });
});
