# Анализ кастомных полей в Planka

## Текущая реализация

### Архитектура

Система кастомных полей в Planka организована следующим образом:

#### 1. **Модели данных**

- **`BaseCustomFieldGroup`** - базовая группа полей на уровне проекта (шаблоны)
- **`CustomFieldGroup`** - группа полей на уровне доски или карточки (экземпляры)
- **`CustomField`** - определение поля (название, настройки)
- **`CustomFieldValue`** - значение поля для конкретной карточки

#### 2. **Структура базы данных**

```sql
-- Базовая группа полей (шаблон на уровне проекта)
CREATE TABLE base_custom_field_group (
  id BIGINT PRIMARY KEY,
  project_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Группа полей (экземпляр на доске/карточке)
CREATE TABLE custom_field_group (
  id BIGINT PRIMARY KEY,
  board_id BIGINT,
  card_id BIGINT,
  base_custom_field_group_id BIGINT,
  position DOUBLE PRECISION NOT NULL,
  name TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Определение поля
CREATE TABLE custom_field (
  id BIGINT PRIMARY KEY,
  base_custom_field_group_id BIGINT,
  custom_field_group_id BIGINT,
  position DOUBLE PRECISION NOT NULL,
  name TEXT NOT NULL,
  show_on_front_of_card BOOLEAN NOT NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Значение поля для карточки
CREATE TABLE custom_field_value (
  id BIGINT PRIMARY KEY,
  card_id BIGINT NOT NULL,
  custom_field_group_id BIGINT NOT NULL,
  custom_field_id BIGINT NOT NULL,
  content TEXT NOT NULL,  -- Важно: хранится как TEXT
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(card_id, custom_field_group_id, custom_field_id)
);
```

#### 3. **Текущие ограничения**

**Проблема:** В текущей реализации НЕТ поля `type` в таблице `custom_field`. Все поля обрабатываются одинаково как простой текст.

**Значения хранятся:**
- В поле `content` (TEXT) в таблице `custom_field_value`
- Без типизации - все значения сохраняются как строки

**Frontend:**
- Компонент `ValueField.jsx` использует простой `<Input>` для всех полей
- Максимальная длина: 512 символов
- Нет дифференциации по типам полей

## Возможность добавления типа Checklist

### Вариант 1: Минимальные изменения (JSON в TEXT)

**Подход:** Хранить JSON-структуру в существующем поле `content`

**Преимущества:**
- ✅ Не требует изменения схемы БД
- ✅ Совместимо с текущей архитектурой
- ✅ Быстрая реализация

**Недостатки:**
- ❌ Нет строгой типизации на уровне БД
- ❌ Сложнее валидация
- ❌ Все поля остаются одинаковыми

**Пример структуры:**
```json
{
  "items": [
    {"id": "1", "text": "Задача 1", "checked": true},
    {"id": "2", "text": "Задача 2", "checked": false}
  ]
}
```

### Вариант 2: Добавление поля type (Рекомендуется)

**Подход:** Добавить поле `type` в таблицу `custom_field` для типизации полей

**Преимущества:**
- ✅ Правильная архитектура
- ✅ Расширяемость для других типов (dropdown, date, number, checkbox и т.д.)
- ✅ Явная валидация на уровне БД и API
- ✅ Разные UI компоненты для разных типов

**Недостатки:**
- ❌ Требует миграцию БД
- ❌ Изменения в API и валидации
- ❌ Больше работы по реализации

#### Необходимые изменения:

##### 1. **Миграция БД**

```javascript
// server/db/migrations/YYYYMMDDHHMMSS_add_custom_field_type.js
exports.up = async (knex) => {
  await knex.schema.alterTable('custom_field', (table) => {
    table.string('type', 50).notNullable().defaultTo('text');
    table.jsonb('config').nullable(); // Для дополнительных настроек (например, опции dropdown)
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('custom_field', (table) => {
    table.dropColumn('type');
    table.dropColumn('config');
  });
};
```

##### 2. **Модель CustomField.js**

```javascript
module.exports = {
  attributes: {
    position: {
      type: 'number',
      required: true,
    },
    name: {
      type: 'string',
      required: true,
    },
    type: {
      type: 'string',
      isIn: ['text', 'checklist', 'dropdown', 'number', 'date', 'checkbox'],
      defaultsTo: 'text',
      required: true,
    },
    config: {
      type: 'json',
      columnType: 'jsonb',
    },
    showOnFrontOfCard: {
      type: 'boolean',
      defaultsTo: false,
      columnName: 'show_on_front_of_card',
    },
    // ... associations
  },
};
```

##### 3. **API Controller изменения**

```javascript
// server/api/controllers/custom-fields/create-in-base-custom-field-group.js
module.exports = {
  inputs: {
    // ... existing
    type: {
      type: 'string',
      isIn: ['text', 'checklist', 'dropdown', 'number', 'date', 'checkbox'],
      defaultsTo: 'text',
    },
    config: {
      type: 'json',
    },
  },
  // ...
};
```

##### 4. **Frontend компоненты**

**CustomFieldEditor.jsx** - добавить выбор типа:
```jsx
<Select
  name="type"
  value={data.type}
  options={[
    { value: 'text', label: 'Text' },
    { value: 'checklist', label: 'Checklist' },
    { value: 'dropdown', label: 'Dropdown' },
    { value: 'number', label: 'Number' },
    { value: 'date', label: 'Date' },
    { value: 'checkbox', label: 'Checkbox' },
  ]}
  onChange={onFieldChange}
/>
```

**CustomField.jsx** - условный рендеринг:
```jsx
const renderValueField = () => {
  switch (customField.type) {
    case 'checklist':
      return <ChecklistField ... />;
    case 'dropdown':
      return <DropdownField ... />;
    case 'number':
      return <NumberField ... />;
    case 'date':
      return <DateField ... />;
    case 'checkbox':
      return <CheckboxField ... />;
    default:
      return <ValueField ... />;
  }
};
```

**Новый компонент ChecklistField.jsx:**
```jsx
import React, { useCallback, useState } from 'react';
import { Checkbox, List, Button, Input } from 'semantic-ui-react';

const ChecklistField = ({ defaultValue, onUpdate, ...props }) => {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(defaultValue || '{"items":[]}').items;
    } catch {
      return [];
    }
  });
  const [newItemText, setNewItemText] = useState('');

  const handleToggle = useCallback((itemId) => {
    const updatedItems = items.map(item =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    setItems(updatedItems);
    onUpdate(JSON.stringify({ items: updatedItems }));
  }, [items, onUpdate]);

  const handleAdd = useCallback(() => {
    if (!newItemText.trim()) return;
    const newItem = {
      id: Date.now().toString(),
      text: newItemText,
      checked: false
    };
    const updatedItems = [...items, newItem];
    setItems(updatedItems);
    onUpdate(JSON.stringify({ items: updatedItems }));
    setNewItemText('');
  }, [items, newItemText, onUpdate]);

  const handleDelete = useCallback((itemId) => {
    const updatedItems = items.filter(item => item.id !== itemId);
    setItems(updatedItems);
    onUpdate(JSON.stringify({ items: updatedItems }));
  }, [items, onUpdate]);

  return (
    <div>
      <List>
        {items.map(item => (
          <List.Item key={item.id}>
            <Checkbox
              label={item.text}
              checked={item.checked}
              onChange={() => handleToggle(item.id)}
            />
            <Button
              icon="trash"
              size="mini"
              onClick={() => handleDelete(item.id)}
            />
          </List.Item>
        ))}
      </List>
      <Input
        fluid
        placeholder="Add item..."
        value={newItemText}
        onChange={(e) => setNewItemText(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
        action={
          <Button icon="plus" onClick={handleAdd} />
        }
      />
    </div>
  );
};

export default ChecklistField;
```

##### 5. **Константы и типы**

```javascript
// client/src/constants/CustomFieldTypes.js
export const CustomFieldTypes = {
  TEXT: 'text',
  CHECKLIST: 'checklist',
  DROPDOWN: 'dropdown',
  NUMBER: 'number',
  DATE: 'date',
  CHECKBOX: 'checkbox',
};

export const CustomFieldTypeLabels = {
  [CustomFieldTypes.TEXT]: 'Text',
  [CustomFieldTypes.CHECKLIST]: 'Checklist',
  [CustomFieldTypes.DROPDOWN]: 'Dropdown',
  [CustomFieldTypes.NUMBER]: 'Number',
  [CustomFieldTypes.DATE]: 'Date',
  [CustomFieldTypes.CHECKBOX]: 'Checkbox',
};
```

### Вариант 3: Интеграция с Task Lists (Альтернатива)

**Подход:** Использовать существующую систему Task Lists вместо создания нового типа поля

**Преимущества:**
- ✅ Функционал уже реализован
- ✅ Нет необходимости в изменениях

**Недостатки:**
- ❌ Task Lists не являются частью Custom Fields
- ❌ Разная концепция (встроенная функция vs кастомное поле)

## Рекомендации

### Для быстрой реализации:
**Используйте Вариант 1** - храните JSON в существующем поле `content`. Это позволит быстро добавить функционал checklist без изменения схемы БД.

### Для правильной архитектуры:
**Используйте Вариант 2** - добавьте поле `type` в модель. Это правильное решение, которое позволит в будущем легко добавлять другие типы полей.

## План реализации Варианта 2 (Рекомендуемый)

### Этап 1: Backend (База данных и API)
1. Создать миграцию для добавления полей `type` и `config`
2. Обновить модель `CustomField.js`
3. Обновить контроллеры `create-in-base-custom-field-group.js`, `create-in-custom-field-group.js`, `update.js`
4. Добавить валидацию для разных типов полей
5. Создать хелперы для работы с JSON-значениями чеклиста

### Этап 2: Frontend (UI компоненты)
1. Добавить константы типов полей
2. Обновить `CustomFieldEditor.jsx` для выбора типа
3. Создать компонент `ChecklistField.jsx`
4. Обновить `CustomField.jsx` для условного рендеринга
5. Добавить стили для чеклиста
6. Добавить локализацию

### Этап 3: Тестирование
1. Проверить создание полей разных типов
2. Проверить сохранение и загрузку значений
3. Проверить миграцию существующих данных
4. Проверить UI на разных экранах

## Структура данных для Checklist

### В БД (поле content):
```json
{
  "items": [
    {
      "id": "unique-id-1",
      "text": "Первая задача",
      "checked": true
    },
    {
      "id": "unique-id-2", 
      "text": "Вторая задача",
      "checked": false
    }
  ]
}
```

### Альтернатива с дополнительными возможностями:
```json
{
  "items": [
    {
      "id": "unique-id-1",
      "text": "Первая задача",
      "checked": true,
      "position": 65536,
      "createdAt": "2025-10-06T12:00:00Z"
    }
  ],
  "settings": {
    "showProgress": true,
    "hideCompleted": false
  }
}
```

## Выводы

1. **Текущая система** не поддерживает типы полей - все поля текстовые
2. **Для добавления checklist** нужно либо:
   - Хранить JSON в существующем поле (быстро, но не расширяемо)
   - Добавить систему типов полей (правильно, расширяемо)
3. **Рекомендуется** вариант 2 с добавлением поля `type`
4. Это также откроет возможности для других типов: dropdown, date, number, checkbox и т.д.
