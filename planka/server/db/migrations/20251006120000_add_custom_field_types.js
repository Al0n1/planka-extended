/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports.up = async (knex) => {
  // Добавляем поле type со значением по умолчанию 'text' для совместимости
  await knex.schema.alterTable('custom_field', (table) => {
    table.string('type', 50).notNullable().defaultTo('text');
    table.jsonb('config').nullable().comment('Additional configuration for field types (e.g., dropdown options)');
  });

  // Обновляем все существующие поля, устанавливая им тип 'text'
  await knex('custom_field').update({ type: 'text' });

  console.log('✓ Migration: Added type and config columns to custom_field table');
};

module.exports.down = async (knex) => {
  await knex.schema.alterTable('custom_field', (table) => {
    table.dropColumn('type');
    table.dropColumn('config');
  });

  console.log('✓ Migration: Removed type and config columns from custom_field table');
};
