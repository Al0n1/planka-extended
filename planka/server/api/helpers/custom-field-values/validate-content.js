/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    type: {
      type: 'string',
      required: true,
    },
    content: {
      type: 'string',
      required: true,
    },
    config: {
      type: 'json',
    },
  },

  async fn(inputs, exits) {
    const { type, content, config } = inputs;

    try {
      switch (type) {
        case 'text':
        case 'url':
        case 'email':
          // Простая валидация строки
          if (typeof content !== 'string' || content.length > 5000) {
            return exits.error('Invalid text content');
          }
          break;

        case 'checklist':
          // Валидация JSON структуры чеклиста
          const checklist = JSON.parse(content);
          if (!checklist.items || !Array.isArray(checklist.items)) {
            return exits.error('Invalid checklist structure');
          }
          // Проверяем каждый элемент
          for (const item of checklist.items) {
            if (!item.id || !item.text || typeof item.checked !== 'boolean') {
              return exits.error('Invalid checklist item structure');
            }
          }
          break;

        case 'dropdown':
          // Проверяем что значение есть в config.options
          if (!config || !config.options || !Array.isArray(config.options)) {
            return exits.error('Dropdown config missing options');
          }
          if (!config.options.includes(content)) {
            return exits.error('Value not in dropdown options');
          }
          break;

        case 'number':
          const num = parseFloat(content);
          if (isNaN(num)) {
            return exits.error('Invalid number');
          }
          break;

        case 'date':
          const date = new Date(content);
          if (isNaN(date.getTime())) {
            return exits.error('Invalid date');
          }
          break;

        case 'checkbox':
          if (content !== 'true' && content !== 'false') {
            return exits.error('Invalid checkbox value');
          }
          break;

        default:
          return exits.error('Unknown field type');
      }

      return exits.success(true);
    } catch (error) {
      return exits.error(error.message);
    }
  },
};
