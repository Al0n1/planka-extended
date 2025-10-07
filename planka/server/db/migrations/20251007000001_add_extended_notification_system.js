/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

exports.up = (knex) =>
  knex.schema
    .createTable('user_notification_channel', (table) => {
      /* Columns */

      table.bigInteger('id').primary().defaultTo(knex.raw("next_id('user_notification_channel_id_seq'::regclass)"));
      table.bigInteger('user_id').notNullable();
      table.text('service_type').notNullable().defaultTo('apprise');
      table.text('service_url').notNullable();
      table.text('format').notNullable().defaultTo('markdown');
      table.boolean('is_active').notNullable().defaultTo(true);
      table.timestamp('created_at', { useTz: false });
      table.timestamp('updated_at', { useTz: false });

      /* Indexes */

      table.index('user_id');
    })
    .createTable('user_notification_subscription', (table) => {
      /* Columns */

      table.bigInteger('id').primary().defaultTo(knex.raw("next_id('user_notification_subscription_id_seq'::regclass)"));
      table.bigInteger('user_id').notNullable();
      table.bigInteger('project_id');
      table.bigInteger('board_id');
      table.text('event_type').notNullable();
      table.boolean('is_enabled').notNullable().defaultTo(true);
      table.timestamp('created_at', { useTz: false });
      table.timestamp('updated_at', { useTz: false });

      /* Indexes */

      table.index('user_id');
      table.index('project_id');
      table.index('board_id');
      table.index('event_type');
    })
    .createTable('notification_delivery_log', (table) => {
      /* Columns */

      table.bigInteger('id').primary().defaultTo(knex.raw("next_id('notification_delivery_log_id_seq'::regclass)"));
      table.bigInteger('channel_id');
      table.text('event_type').notNullable();
      table.text('status').notNullable();
      table.text('error_message');
      table.jsonb('event_payload');
      table.integer('attempt_count').notNullable().defaultTo(1);
      table.timestamp('created_at', { useTz: false });
      table.timestamp('updated_at', { useTz: false });

      /* Indexes */

      table.index('channel_id');
      table.index('event_type');
      table.index('status');
      table.index('created_at');
    });

exports.down = (knex) =>
  knex.schema
    .dropTable('notification_delivery_log')
    .dropTable('user_notification_subscription')
    .dropTable('user_notification_channel');
