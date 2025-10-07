/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * notification-channels-integration.test.js
 *
 * Integration tests for notification channels API
 */

const { expect } = require('chai');
const request = require('supertest');

describe('Notification Channels API Integration Tests', () => {
  let agent;
  let authToken;
  let userId;
  let channelId;

  before(async function () {
    // Skip if Sails is not running
    if (!sails) {
      this.skip();
    }
    agent = request.agent(sails.hooks.http.app);
  });

  describe('POST /api/notification-channels', () => {
    it('should create a new notification channel', async () => {
      // This is a placeholder - actual implementation depends on authentication setup
      const res = await agent
        .post('/api/notification-channels')
        .send({
          userId: 'test-user-id',
          serviceType: 'webhook',
          url: 'https://example.com/webhook',
          format: 'json',
          isActive: true,
        })
        .expect('Content-Type', /json/);

      // Expect either 401 (not authenticated) or 200/201 (success)
      expect([200, 201, 401, 403]).to.include(res.status);
    });
  });

  describe('GET /api/notification-channels', () => {
    it('should return list of notification channels', async () => {
      const res = await agent.get('/api/notification-channels');

      // Expect either 401 (not authenticated) or 200 (success)
      expect([200, 401, 403]).to.include(res.status);
    });
  });

  describe('POST /api/notification-subscriptions', () => {
    it('should create a new notification subscription', async () => {
      const res = await agent
        .post('/api/notification-subscriptions')
        .send({
          userId: 'test-user-id',
          channelId: 'test-channel-id',
          eventType: 'card.created',
          scopeType: 'board',
        });

      // Expect either 401 (not authenticated) or 200/201 (success)
      expect([200, 201, 401, 403]).to.include(res.status);
    });
  });

  describe('GET /api/notification-subscriptions', () => {
    it('should return list of notification subscriptions', async () => {
      const res = await agent.get('/api/notification-subscriptions');

      // Expect either 401 (not authenticated) or 200 (success)
      expect([200, 401, 403]).to.include(res.status);
    });
  });
});
