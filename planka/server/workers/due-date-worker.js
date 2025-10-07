/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * due-date-worker.js
 *
 * @description :: Scheduler for checking card due dates and emitting notifications
 *                 Runs every 30 minutes to find cards with approaching or passed due dates
 */

const cron = require('node-cron');
const Sails = require('sails').constructor;

const CHECK_INTERVAL = '*/30 * * * *'; // Every 30 minutes
const APPROACHING_THRESHOLD_HOURS = 24; // Notify 24 hours before due date

class DueDateWorker {
  constructor() {
    this.isRunning = false;
    this.cronJob = null;
    this.sails = null;
  }

  async initialize() {
    // Initialize Sails in production mode
    this.sails = new Sails();
    
    return new Promise((resolve, reject) => {
      this.sails.load({
        hooks: {
          grunt: false,
          sockets: false,
          pubsub: false,
        },
        log: {
          level: process.env.LOG_LEVEL || 'info',
        },
      }, (err) => {
        if (err) {
          console.error('[DueDateWorker] Failed to initialize Sails:', err);
          reject(err);
        } else {
          console.log('[DueDateWorker] Sails initialized successfully');
          resolve();
        }
      });
    });
  }

  async start() {
    console.log('[DueDateWorker] Starting due date scheduler...');
    
    // Run immediately on start
    await this.checkDueDates();

    // Schedule recurring checks
    this.cronJob = cron.schedule(CHECK_INTERVAL, async () => {
      if (!this.isRunning) {
        await this.checkDueDates();
      }
    });

    console.log(`[DueDateWorker] Scheduler started. Running every 30 minutes.`);
  }

  async checkDueDates() {
    this.isRunning = true;
    const startTime = Date.now();
    
    try {
      console.log('[DueDateWorker] Checking for due dates...');

      const now = new Date();
      const approachingThreshold = new Date(now.getTime() + APPROACHING_THRESHOLD_HOURS * 60 * 60 * 1000);

      // Find cards with due dates
      const cards = await Card.find({
        where: {
          dueDate: { '!=': null },
          isDueCompleted: false,
        },
      }).populate('list');

      if (!cards || cards.length === 0) {
        console.log('[DueDateWorker] No cards with pending due dates found.');
        return;
      }

      console.log(`[DueDateWorker] Found ${cards.length} cards with due dates to check.`);

      let approachingCount = 0;
      let passedCount = 0;

      // Check each card and emit events
      for (const card of cards) {
        const dueDate = new Date(card.dueDate);
        
        // Check if due date has passed
        if (dueDate < now) {
          await this.emitDueDateEvent('dueDate.passed', card);
          passedCount++;
        } 
        // Check if due date is approaching (within 24 hours)
        else if (dueDate <= approachingThreshold) {
          await this.emitDueDateEvent('dueDate.approaching', card);
          approachingCount++;
        }
      }

      const duration = Date.now() - startTime;
      console.log(
        `[DueDateWorker] Check completed in ${duration}ms. ` +
        `Approaching: ${approachingCount}, Passed: ${passedCount}`
      );

    } catch (error) {
      console.error('[DueDateWorker] Error during due date check:', error);
      sails.log.error('[DueDateWorker] Error details:', error.stack);
    } finally {
      this.isRunning = false;
    }
  }

  async emitDueDateEvent(eventType, card) {
    try {
      // Get board and project information
      const list = await List.findOne({ id: card.listId }).populate('board');
      if (!list || !list.board) {
        console.warn(`[DueDateWorker] Card ${card.id} has no valid list/board, skipping.`);
        return;
      }

      const board = list.board;
      const project = await Project.findOne({ id: board.projectId });
      
      if (!project) {
        console.warn(`[DueDateWorker] Card ${card.id} has no valid project, skipping.`);
        return;
      }

      // Get card members to use as potential actors
      const cardMembers = await CardMembership.find({ cardId: card.id });
      const actorId = cardMembers.length > 0 ? cardMembers[0].userId : null;

      // If no card members, use board members
      let finalActorId = actorId;
      if (!finalActorId) {
        const boardMembers = await BoardMembership.find({ boardId: board.id });
        finalActorId = boardMembers.length > 0 ? boardMembers[0].userId : null;
      }

      // Skip if we can't find any actor (shouldn't happen in normal cases)
      if (!finalActorId) {
        console.warn(`[DueDateWorker] No actor found for card ${card.id}, skipping.`);
        return;
      }

      const payload = {
        actorId: finalActorId,
        boardId: board.id,
        projectId: project.id,
        cardId: card.id,
        card: {
          id: card.id,
          name: card.name,
          dueDate: card.dueDate,
          position: card.position,
        },
        list: {
          id: list.id,
          name: list.name,
        },
        board: {
          id: board.id,
          name: board.name,
        },
        project: {
          id: project.id,
          name: project.name,
        },
      };

      // Emit the notification event
      await sails.services.notificationeventbus.emitNotificationEvent(eventType, payload);

      console.log(`[DueDateWorker] Emitted ${eventType} for card "${card.name}" (${card.id})`);

    } catch (error) {
      console.error(`[DueDateWorker] Error emitting event for card ${card.id}:`, error);
      sails.log.error('[DueDateWorker] Error details:', error.stack);
    }
  }

  async stop() {
    console.log('[DueDateWorker] Stopping due date scheduler...');
    
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }

    if (this.sails) {
      await new Promise((resolve) => {
        this.sails.lower(resolve);
      });
    }

    console.log('[DueDateWorker] Scheduler stopped.');
  }
}

// Main execution
if (require.main === module) {
  const worker = new DueDateWorker();

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n[DueDateWorker] Received SIGINT, shutting down...');
    await worker.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n[DueDateWorker] Received SIGTERM, shutting down...');
    await worker.stop();
    process.exit(0);
  });

  // Start the worker
  (async () => {
    try {
      await worker.initialize();
      await worker.start();
    } catch (error) {
      console.error('[DueDateWorker] Fatal error:', error);
      process.exit(1);
    }
  })();
}

module.exports = DueDateWorker;
