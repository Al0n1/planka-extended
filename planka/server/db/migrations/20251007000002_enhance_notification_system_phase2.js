/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

exports.up = (knex) =>
  knex.schema
    .alterTable('user_notification_subscription', (table) => {
      table.text('scope_type').notNullable().defaultTo('board');
      table.index(['event_type', 'user_id', 'scope_type']);
    })
    .alterTable('notification_delivery_log', (table) => {
      table.text('job_id');
      table.integer('retry_count').notNullable().defaultTo(0);
      table.index('job_id');
    });

exports.down = (knex) =>
  knex.schema
    .alterTable('user_notification_subscription', (table) => {
      table.dropIndex(['event_type', 'user_id', 'scope_type']);
      table.dropColumn('scope_type');
    })
    .alterTable('notification_delivery_log', (table) => {
      table.dropIndex('job_id');
      table.dropColumn('job_id');
      table.dropColumn('retry_count');
    });
