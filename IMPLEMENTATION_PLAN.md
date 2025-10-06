# План реализации Custom Fields с типами (Вариант 2)

## Общая информация

**Цель:** Добавить поддержку типизированных кастомных полей в Planka, включая тип "checklist"

**Окружение:** Docker (docker-compose)

**База данных:** PostgreSQL в Docker контейнере

**Время реализации:** ~2-3 дня

---

## Этап 0: Подготовка и бэкап (1-2 часа)

### 0.1. Создание точки восстановления

#### Создать скрипт для бэкапа базы данных

**Файл:** `scripts/backup-database.sh`

```bash
#!/bin/bash
# Скрипт для создания резервной копии базы данных PostgreSQL

# Настройки
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./backups"
BACKUP_FILE="planka_backup_${TIMESTAMP}.sql"

# Создаем директорию для бэкапов если её нет
mkdir -p ${BACKUP_DIR}

# Получаем имя контейнера с PostgreSQL
POSTGRES_CONTAINER=$(docker-compose ps -q db)

if [ -z "$POSTGRES_CONTAINER" ]; then
    echo "Ошибка: PostgreSQL контейнер не найден"
    exit 1
fi

echo "Создание резервной копии базы данных..."
echo "Файл: ${BACKUP_DIR}/${BACKUP_FILE}"

# Создаем дамп базы данных
docker exec ${POSTGRES_CONTAINER} pg_dump -U postgres planka > "${BACKUP_DIR}/${BACKUP_FILE}"

if [ $? -eq 0 ]; then
    echo "✓ Резервная копия успешно создана: ${BACKUP_DIR}/${BACKUP_FILE}"
    
    # Создаем также архив
    gzip "${BACKUP_DIR}/${BACKUP_FILE}"
    echo "✓ Архив создан: ${BACKUP_DIR}/${BACKUP_FILE}.gz"
    
    # Показываем размер
    du -h "${BACKUP_DIR}/${BACKUP_FILE}.gz"
else
    echo "✗ Ошибка при создании резервной копии"
    exit 1
fi
```

**Файл для Windows PowerShell:** `scripts/backup-database.ps1`

```powershell
# Скрипт для создания резервной копии базы данных PostgreSQL (Windows)

# Настройки
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = ".\backups"
$backupFile = "planka_backup_$timestamp.sql"

# Создаем директорию для бэкапов
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}

Write-Host "Создание резервной копии базы данных..."
Write-Host "Файл: $backupDir\$backupFile"

# Получаем имя контейнера PostgreSQL
$postgresContainer = docker-compose ps -q db

if ([string]::IsNullOrEmpty($postgresContainer)) {
    Write-Host "Ошибка: PostgreSQL контейнер не найден" -ForegroundColor Red
    exit 1
}

# Создаем дамп базы данных
docker exec $postgresContainer pg_dump -U postgres planka > "$backupDir\$backupFile"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Резервная копия успешно создана: $backupDir\$backupFile" -ForegroundColor Green
    
    # Показываем размер файла
    $fileSize = (Get-Item "$backupDir\$backupFile").Length / 1MB
    Write-Host "Размер: $([math]::Round($fileSize, 2)) MB"
} else {
    Write-Host "✗ Ошибка при создании резервной копии" -ForegroundColor Red
    exit 1
}
```

#### Создать скрипт для восстановления

**Файл:** `scripts/restore-database.sh`

```bash
#!/bin/bash
# Скрипт для восстановления базы данных из резервной копии

if [ -z "$1" ]; then
    echo "Использование: ./restore-database.sh <путь_к_backup_файлу>"
    echo "Пример: ./restore-database.sh ./backups/planka_backup_20251006_120000.sql.gz"
    exit 1
fi

BACKUP_FILE=$1

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Ошибка: Файл $BACKUP_FILE не найден"
    exit 1
fi

# Получаем имя контейнера с PostgreSQL
POSTGRES_CONTAINER=$(docker-compose ps -q db)

if [ -z "$POSTGRES_CONTAINER" ]; then
    echo "Ошибка: PostgreSQL контейнер не найден"
    exit 1
fi

echo "⚠️  ВНИМАНИЕ: Это удалит текущую базу данных и восстановит из бэкапа!"
echo "Файл бэкапа: $BACKUP_FILE"
read -p "Продолжить? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Отменено"
    exit 0
fi

echo "Останавливаем приложение..."
docker-compose stop server

echo "Восстанавливаем базу данных..."

# Проверяем, архив это или нет
if [[ $BACKUP_FILE == *.gz ]]; then
    gunzip -c "$BACKUP_FILE" | docker exec -i ${POSTGRES_CONTAINER} psql -U postgres -d planka
else
    cat "$BACKUP_FILE" | docker exec -i ${POSTGRES_CONTAINER} psql -U postgres -d planka
fi

if [ $? -eq 0 ]; then
    echo "✓ База данных успешно восстановлена"
    echo "Запускаем приложение..."
    docker-compose up -d
else
    echo "✗ Ошибка при восстановлении базы данных"
    exit 1
fi
```

**Файл для Windows PowerShell:** `scripts/restore-database.ps1`

```powershell
# Скрипт для восстановления базы данных (Windows)

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile
)

if (-not (Test-Path $BackupFile)) {
    Write-Host "Ошибка: Файл $BackupFile не найден" -ForegroundColor Red
    exit 1
}

$postgresContainer = docker-compose ps -q db

if ([string]::IsNullOrEmpty($postgresContainer)) {
    Write-Host "Ошибка: PostgreSQL контейнер не найден" -ForegroundColor Red
    exit 1
}

Write-Host "⚠️  ВНИМАНИЕ: Это удалит текущую базу данных и восстановит из бэкапа!" -ForegroundColor Yellow
Write-Host "Файл бэкапа: $BackupFile"
$confirm = Read-Host "Продолжить? (yes/no)"

if ($confirm -ne "yes") {
    Write-Host "Отменено"
    exit 0
}

Write-Host "Останавливаем приложение..."
docker-compose stop server

Write-Host "Восстанавливаем базу данных..."

Get-Content $BackupFile | docker exec -i $postgresContainer psql -U postgres -d planka

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ База данных успешно восстановлена" -ForegroundColor Green
    Write-Host "Запускаем приложение..."
    docker-compose up -d
} else {
    Write-Host "✗ Ошибка при восстановлении базы данных" -ForegroundColor Red
    exit 1
}
```

### 0.2. Выполнить бэкап перед началом работ

```powershell
# Windows PowerShell
cd d:\Работать\MY\planka-extended\planka
.\scripts\backup-database.ps1

# Или для Linux/Mac
# chmod +x scripts/backup-database.sh
# ./scripts/backup-database.sh
```

### 0.3. Создать отдельную ветку для разработки

```bash
git checkout -b feature/custom-field-types
git push -u origin feature/custom-field-types
```

---

## Этап 1: Backend - База данных (3-4 часа)

### 1.1. Создать миграцию для добавления типов полей

**Файл:** `planka/server/db/migrations/20251006120000_add_custom_field_types.js`

```javascript
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
```

### 1.2. Обновить модель CustomField

**Файл:** `planka/server/api/models/CustomField.js`

Добавить атрибуты:

```javascript
type: {
  type: 'string',
  isIn: ['text', 'checklist', 'dropdown', 'number', 'date', 'checkbox', 'url', 'email'],
  defaultsTo: 'text',
  required: true,
},
config: {
  type: 'json',
  columnType: 'jsonb',
},
```

### 1.3. Создать константы типов полей

**Файл:** `planka/server/constants.js`

Добавить:

```javascript
module.exports.CustomFieldTypes = {
  TEXT: 'text',
  CHECKLIST: 'checklist',
  DROPDOWN: 'dropdown',
  NUMBER: 'number',
  DATE: 'date',
  CHECKBOX: 'checkbox',
  URL: 'url',
  EMAIL: 'email',
};
```

### 1.4. Тестирование миграции

```powershell
# Остановить контейнеры
docker-compose down

# Запустить с пересборкой (миграции выполнятся автоматически)
docker-compose up --build -d

# Проверить логи
docker-compose logs -f server

# Проверить структуру таблицы
docker exec -it planka_db_1 psql -U postgres -d planka -c "\d custom_field"
```

---

## Этап 2: Backend - API и валидация (4-5 часов)

### 2.1. Обновить контроллеры создания полей

**Файлы для обновления:**
- `planka/server/api/controllers/custom-fields/create-in-base-custom-field-group.js`
- `planka/server/api/controllers/custom-fields/create-in-custom-field-group.js`

Добавить в `inputs`:

```javascript
type: {
  type: 'string',
  isIn: ['text', 'checklist', 'dropdown', 'number', 'date', 'checkbox', 'url', 'email'],
  defaultsTo: 'text',
},
config: {
  type: 'json',
  custom: (value) => {
    // Валидация config в зависимости от типа
    return true;
  },
},
```

### 2.2. Обновить контроллер обновления полей

**Файл:** `planka/server/api/controllers/custom-fields/update.js`

Добавить те же inputs для type и config.

### 2.3. Создать хелпер для валидации значений

**Файл:** `planka/server/api/helpers/custom-field-values/validate-content.js`

```javascript
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

  fn(inputs, exits) {
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
```

### 2.4. Обновить контроллер custom-field-values

**Файл:** `planka/server/api/controllers/custom-field-values/update.js`

Добавить валидацию перед сохранением:

```javascript
// Получаем customField для проверки типа
const customField = await CustomField.findOne(inputs.customFieldId);

// Валидируем content согласно типу поля
const isValid = await sails.helpers.customFieldValues.validateContent.with({
  type: customField.type,
  content: inputs.content,
  config: customField.config,
});

if (!isValid) {
  throw 'INVALID_CONTENT';
}
```

### 2.5. Тестирование API

```powershell
# Тестовые запросы через curl или Postman
# 1. Создать текстовое поле (должно работать как раньше)
# 2. Создать поле типа checklist
# 3. Проверить валидацию
```

---

## Этап 3: Frontend - Константы и типы (2-3 часа)

### 3.1. Создать константы типов полей

**Файл:** `planka/client/src/constants/CustomFieldTypes.js`

```javascript
export const CustomFieldTypes = {
  TEXT: 'text',
  CHECKLIST: 'checklist',
  DROPDOWN: 'dropdown',
  NUMBER: 'number',
  DATE: 'date',
  CHECKBOX: 'checkbox',
  URL: 'url',
  EMAIL: 'email',
};

export const CustomFieldTypeLabels = {
  [CustomFieldTypes.TEXT]: 'common.text',
  [CustomFieldTypes.CHECKLIST]: 'common.checklist',
  [CustomFieldTypes.DROPDOWN]: 'common.dropdown',
  [CustomFieldTypes.NUMBER]: 'common.number',
  [CustomFieldTypes.DATE]: 'common.date',
  [CustomFieldTypes.CHECKBOX]: 'common.checkbox',
  [CustomFieldTypes.URL]: 'common.url',
  [CustomFieldTypes.EMAIL]: 'common.email',
};

export const CustomFieldTypeIcons = {
  [CustomFieldTypes.TEXT]: 'font',
  [CustomFieldTypes.CHECKLIST]: 'tasks',
  [CustomFieldTypes.DROPDOWN]: 'dropdown',
  [CustomFieldTypes.NUMBER]: 'hashtag',
  [CustomFieldTypes.DATE]: 'calendar',
  [CustomFieldTypes.CHECKBOX]: 'check square',
  [CustomFieldTypes.URL]: 'linkify',
  [CustomFieldTypes.EMAIL]: 'mail',
};
```

### 3.2. Добавить локализацию

**Файлы:** 
- `planka/client/src/locales/en/core.js`
- `planka/client/src/locales/ru/core.js`
- И другие локали

Добавить переводы:

```javascript
// English
common: {
  // ... existing
  text: 'Text',
  checklist: 'Checklist',
  dropdown: 'Dropdown',
  number: 'Number',
  date: 'Date',
  checkbox: 'Checkbox',
  url: 'URL',
  email: 'Email',
  fieldType: 'Field Type',
  selectFieldType: 'Select field type',
}

// Russian
common: {
  // ... existing
  text: 'Текст',
  checklist: 'Чеклист',
  dropdown: 'Выпадающий список',
  number: 'Число',
  date: 'Дата',
  checkbox: 'Флажок',
  url: 'URL',
  email: 'Email',
  fieldType: 'Тип поля',
  selectFieldType: 'Выберите тип поля',
}
```

### 3.3. Обновить Redux модели

**Файл:** `planka/client/src/models/CustomField.js`

Добавить поля `type` и `config` в модель.

---

## Этап 4: Frontend - Редактор полей (3-4 часа)

### 4.1. Обновить CustomFieldEditor для выбора типа

**Файл:** `planka/client/src/components/custom-field-groups/CustomFieldGroupStep/CustomFieldEditor.jsx`

Добавить выпадающий список для выбора типа поля:

```jsx
import { CustomFieldTypes, CustomFieldTypeLabels, CustomFieldTypeIcons } from '../../../constants/CustomFieldTypes';

// В компоненте добавить:
<div className={styles.text}>{t('common.fieldType')}</div>
<Dropdown
  fluid
  selection
  name="type"
  value={data.type || CustomFieldTypes.TEXT}
  options={Object.values(CustomFieldTypes).map(type => ({
    key: type,
    value: type,
    text: t(CustomFieldTypeLabels[type]),
    icon: CustomFieldTypeIcons[type],
  }))}
  onChange={(e, { value }) => onFieldChange(e, { name: 'type', value })}
  className={styles.field}
/>

{/* Условный рендеринг конфигурации для dropdown */}
{data.type === CustomFieldTypes.DROPDOWN && (
  <DropdownConfigEditor
    config={data.config}
    onChange={(config) => onFieldChange(null, { name: 'config', value: config })}
  />
)}
```

### 4.2. Создать компонент для настройки dropdown

**Файл:** `planka/client/src/components/custom-field-groups/CustomFieldGroupStep/DropdownConfigEditor.jsx`

```jsx
import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Button, Icon, List } from 'semantic-ui-react';
import { Input } from '../../../lib/custom-ui';

const DropdownConfigEditor = ({ config, onChange }) => {
  const options = config?.options || [];
  const [newOption, setNewOption] = useState('');

  const handleAddOption = useCallback(() => {
    if (!newOption.trim()) return;
    
    const updatedOptions = [...options, newOption.trim()];
    onChange({ ...config, options: updatedOptions });
    setNewOption('');
  }, [config, newOption, onChange, options]);

  const handleRemoveOption = useCallback((index) => {
    const updatedOptions = options.filter((_, i) => i !== index);
    onChange({ ...config, options: updatedOptions });
  }, [config, onChange, options]);

  return (
    <div>
      <div>Options:</div>
      <List>
        {options.map((option, index) => (
          <List.Item key={index}>
            {option}
            <Button
              icon
              size="mini"
              onClick={() => handleRemoveOption(index)}
            >
              <Icon name="trash" />
            </Button>
          </List.Item>
        ))}
      </List>
      <Input
        fluid
        placeholder="Add option..."
        value={newOption}
        onChange={(e) => setNewOption(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleAddOption()}
        action={
          <Button icon onClick={handleAddOption}>
            <Icon name="plus" />
          </Button>
        }
      />
    </div>
  );
};

DropdownConfigEditor.propTypes = {
  config: PropTypes.object,
  onChange: PropTypes.func.isRequired,
};

export default React.memo(DropdownConfigEditor);
```

---

## Этап 5: Frontend - Компоненты для отображения значений (6-8 часов)

### 5.1. Создать компонент ChecklistField

**Файл:** `planka/client/src/components/custom-fields/CustomField/ChecklistField.jsx`

```jsx
import React, { useCallback, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Checkbox, List, Button, Icon, Progress } from 'semantic-ui-react';
import { Input } from '../../../lib/custom-ui';
import { useTranslation } from 'react-i18next';

import styles from './ChecklistField.module.scss';

const ChecklistField = ({ defaultValue, onUpdate, disabled }) => {
  const [t] = useTranslation();
  
  const [items, setItems] = useState(() => {
    try {
      const parsed = JSON.parse(defaultValue || '{"items":[]}');
      return parsed.items || [];
    } catch {
      return [];
    }
  });
  
  const [newItemText, setNewItemText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');

  // Вычисляем прогресс
  const progress = useMemo(() => {
    if (items.length === 0) return 0;
    const checked = items.filter(item => item.checked).length;
    return Math.round((checked / items.length) * 100);
  }, [items]);

  const updateItems = useCallback((newItems) => {
    setItems(newItems);
    onUpdate(JSON.stringify({ items: newItems }));
  }, [onUpdate]);

  const handleToggle = useCallback((itemId) => {
    const updatedItems = items.map(item =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    updateItems(updatedItems);
  }, [items, updateItems]);

  const handleAdd = useCallback(() => {
    if (!newItemText.trim()) return;
    
    const newItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: newItemText.trim(),
      checked: false,
      createdAt: new Date().toISOString(),
    };
    
    updateItems([...items, newItem]);
    setNewItemText('');
  }, [items, newItemText, updateItems]);

  const handleDelete = useCallback((itemId) => {
    const updatedItems = items.filter(item => item.id !== itemId);
    updateItems(updatedItems);
  }, [items, updateItems]);

  const handleStartEdit = useCallback((item) => {
    setEditingId(item.id);
    setEditingText(item.text);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingText.trim()) {
      handleDelete(editingId);
    } else {
      const updatedItems = items.map(item =>
        item.id === editingId ? { ...item, text: editingText.trim() } : item
      );
      updateItems(updatedItems);
    }
    setEditingId(null);
    setEditingText('');
  }, [editingId, editingText, items, updateItems, handleDelete]);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditingText('');
  }, []);

  return (
    <div className={styles.wrapper}>
      {items.length > 0 && (
        <Progress
          percent={progress}
          size="tiny"
          className={styles.progress}
          color={progress === 100 ? 'green' : 'blue'}
        >
          {progress}% ({items.filter(i => i.checked).length}/{items.length})
        </Progress>
      )}
      
      <List className={styles.list}>
        {items.map(item => (
          <List.Item key={item.id} className={styles.item}>
            {editingId === item.id ? (
              <div className={styles.editMode}>
                <Input
                  fluid
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleSaveEdit();
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                  autoFocus
                />
                <Button.Group size="mini">
                  <Button icon positive onClick={handleSaveEdit}>
                    <Icon name="check" />
                  </Button>
                  <Button icon onClick={handleCancelEdit}>
                    <Icon name="times" />
                  </Button>
                </Button.Group>
              </div>
            ) : (
              <div className={styles.viewMode}>
                <Checkbox
                  label={item.text}
                  checked={item.checked}
                  onChange={() => handleToggle(item.id)}
                  disabled={disabled}
                  className={item.checked ? styles.checkedItem : ''}
                />
                {!disabled && (
                  <div className={styles.actions}>
                    <Button
                      icon
                      size="mini"
                      onClick={() => handleStartEdit(item)}
                      title={t('action.edit')}
                    >
                      <Icon name="pencil" />
                    </Button>
                    <Button
                      icon
                      size="mini"
                      onClick={() => handleDelete(item.id)}
                      title={t('action.delete')}
                    >
                      <Icon name="trash" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </List.Item>
        ))}
      </List>
      
      {!disabled && (
        <div className={styles.addItem}>
          <Input
            fluid
            placeholder={t('common.addItem')}
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
            action={
              <Button icon onClick={handleAdd} primary>
                <Icon name="plus" />
              </Button>
            }
          />
        </div>
      )}
    </div>
  );
};

ChecklistField.propTypes = {
  defaultValue: PropTypes.string,
  onUpdate: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

ChecklistField.defaultProps = {
  defaultValue: undefined,
  disabled: false,
};

export default ChecklistField;
```

**Файл стилей:** `planka/client/src/components/custom-fields/CustomField/ChecklistField.module.scss`

```scss
.wrapper {
  padding: 0.5rem 0;
}

.progress {
  margin-bottom: 1rem !important;
}

.list {
  list-style: none !important;
  padding: 0 !important;
  margin: 0 0 1rem 0 !important;
}

.item {
  padding: 0.5rem 0 !important;
  border-bottom: 1px solid #e0e0e0;
  
  &:last-child {
    border-bottom: none;
  }
}

.viewMode {
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  .actions {
    display: flex;
    gap: 0.25rem;
    opacity: 0;
    transition: opacity 0.2s;
  }
  
  &:hover .actions {
    opacity: 1;
  }
}

.editMode {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.checkedItem {
  label {
    text-decoration: line-through;
    opacity: 0.6;
  }
}

.addItem {
  margin-top: 1rem;
}
```

### 5.2. Создать другие компоненты для типов полей

**Файл:** `planka/client/src/components/custom-fields/CustomField/DropdownField.jsx`

```jsx
import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { Dropdown } from 'semantic-ui-react';

const DropdownField = ({ defaultValue, config, onUpdate, disabled }) => {
  const options = config?.options || [];
  
  const handleChange = useCallback((e, { value }) => {
    onUpdate(value);
  }, [onUpdate]);

  return (
    <Dropdown
      fluid
      selection
      value={defaultValue || ''}
      options={options.map(option => ({
        key: option,
        value: option,
        text: option,
      }))}
      onChange={handleChange}
      disabled={disabled}
      placeholder="Select value..."
      clearable
    />
  );
};

DropdownField.propTypes = {
  defaultValue: PropTypes.string,
  config: PropTypes.object,
  onUpdate: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default React.memo(DropdownField);
```

**Файл:** `planka/client/src/components/custom-fields/CustomField/NumberField.jsx`

```jsx
import React, { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { Input } from '../../../lib/custom-ui';

const NumberField = ({ defaultValue, onUpdate, disabled }) => {
  const [value, setValue] = useState(defaultValue || '');

  const handleChange = useCallback((e) => {
    const newValue = e.target.value;
    // Разрешаем только числа и точку/запятую
    if (newValue === '' || /^-?\d*[.,]?\d*$/.test(newValue)) {
      setValue(newValue);
    }
  }, []);

  const handleBlur = useCallback(() => {
    const numValue = value.replace(',', '.');
    if (numValue && !isNaN(parseFloat(numValue))) {
      onUpdate(numValue);
    } else if (value !== defaultValue) {
      setValue(defaultValue || '');
    }
  }, [value, defaultValue, onUpdate]);

  return (
    <Input
      fluid
      type="text"
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      disabled={disabled}
      placeholder="Enter number..."
    />
  );
};

NumberField.propTypes = {
  defaultValue: PropTypes.string,
  onUpdate: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default React.memo(NumberField);
```

**Создать аналогичные компоненты для:**
- `DateField.jsx` - с календарем
- `CheckboxField.jsx` - простой checkbox
- `URLField.jsx` - с валидацией URL
- `EmailField.jsx` - с валидацией email

### 5.3. Обновить CustomField.jsx для условного рендеринга

**Файл:** `planka/client/src/components/custom-fields/CustomField/CustomField.jsx`

```jsx
import { CustomFieldTypes } from '../../../constants/CustomFieldTypes';
import ChecklistField from './ChecklistField';
import DropdownField from './DropdownField';
import NumberField from './NumberField';
import DateField from './DateField';
import CheckboxField from './CheckboxField';
import URLField from './URLField';
import EmailField from './EmailField';

// В компоненте CustomField добавить функцию рендеринга:
const renderValueField = useCallback(() => {
  const fieldType = customField.type || CustomFieldTypes.TEXT;
  
  switch (fieldType) {
    case CustomFieldTypes.CHECKLIST:
      return (
        <ChecklistField
          defaultValue={customFieldValue?.content}
          disabled={!customField.isPersisted || !canEdit}
          onUpdate={handleValueUpdate}
        />
      );
      
    case CustomFieldTypes.DROPDOWN:
      return (
        <DropdownField
          defaultValue={customFieldValue?.content}
          config={customField.config}
          disabled={!customField.isPersisted || !canEdit}
          onUpdate={handleValueUpdate}
        />
      );
      
    case CustomFieldTypes.NUMBER:
      return (
        <NumberField
          defaultValue={customFieldValue?.content}
          disabled={!customField.isPersisted || !canEdit}
          onUpdate={handleValueUpdate}
        />
      );
      
    case CustomFieldTypes.DATE:
      return (
        <DateField
          defaultValue={customFieldValue?.content}
          disabled={!customField.isPersisted || !canEdit}
          onUpdate={handleValueUpdate}
        />
      );
      
    case CustomFieldTypes.CHECKBOX:
      return (
        <CheckboxField
          defaultValue={customFieldValue?.content}
          disabled={!customField.isPersisted || !canEdit}
          onUpdate={handleValueUpdate}
        />
      );
      
    case CustomFieldTypes.URL:
      return (
        <URLField
          defaultValue={customFieldValue?.content}
          disabled={!customField.isPersisted || !canEdit}
          onUpdate={handleValueUpdate}
        />
      );
      
    case CustomFieldTypes.EMAIL:
      return (
        <EmailField
          defaultValue={customFieldValue?.content}
          disabled={!customField.isPersisted || !canEdit}
          onUpdate={handleValueUpdate}
        />
      );
      
    case CustomFieldTypes.TEXT:
    default:
      return (
        <ValueField
          defaultValue={customFieldValue?.content}
          disabled={!customField.isPersisted || !canEdit}
          onUpdate={handleValueUpdate}
        />
      );
  }
}, [customField, customFieldValue, canEdit, handleValueUpdate]);

// Использовать в JSX:
{canEdit ? renderValueField() : (
  <div className={styles.value}>
    {customFieldValue ? customFieldValue.content : '\u00A0'}
  </div>
)}
```

---

## Этап 6: Тестирование и отладка (4-6 часов)

### 6.1. Unit тесты для валидации

**Файл:** `planka/server/test/unit/helpers/custom-field-values/validate-content.test.js`

```javascript
const assert = require('assert');
const validateContent = require('../../../../api/helpers/custom-field-values/validate-content');

describe('validateContent helper', () => {
  it('should validate text content', async () => {
    const result = await validateContent.with({
      type: 'text',
      content: 'Hello world',
    });
    assert.strictEqual(result, true);
  });

  it('should validate checklist content', async () => {
    const content = JSON.stringify({
      items: [
        { id: '1', text: 'Item 1', checked: true },
        { id: '2', text: 'Item 2', checked: false },
      ],
    });
    
    const result = await validateContent.with({
      type: 'checklist',
      content,
    });
    
    assert.strictEqual(result, true);
  });

  it('should reject invalid checklist content', async () => {
    try {
      await validateContent.with({
        type: 'checklist',
        content: 'invalid json',
      });
      assert.fail('Should have thrown an error');
    } catch (error) {
      assert.ok(error);
    }
  });
});
```

### 6.2. Интеграционное тестирование

**Тест-кейсы:**

1. **Создание поля с типом checklist:**
   - Создать проект
   - Создать base custom field group
   - Создать custom field с type='checklist'
   - Проверить что поле сохранилось с правильным типом

2. **Работа со значениями checklist:**
   - Создать карточку
   - Добавить значение в поле checklist
   - Изменить состояние элементов
   - Добавить новые элементы
   - Удалить элементы
   - Проверить сохранность данных после перезагрузки

3. **Миграция существующих данных:**
   - Убедиться что старые текстовые поля работают
   - Проверить что им присвоен type='text'

4. **Валидация:**
   - Попробовать создать поле с невалидным типом
   - Попробовать сохранить невалидное значение для checklist
   - Проверить валидацию dropdown с несуществующим значением

### 6.3. Тестирование в Docker окружении

```powershell
# Пересобрать и запустить
docker-compose down
docker-compose build
docker-compose up -d

# Проверить логи
docker-compose logs -f

# Проверить что миграции прошли успешно
docker-compose logs server | Select-String "migration"

# Проверить структуру БД
docker exec planka_db_1 psql -U postgres -d planka -c "\d custom_field"
```

### 6.4. Ручное тестирование UI

**Чек-лист:**

- [ ] Открыть настройки проекта
- [ ] Создать новую группу полей
- [ ] Добавить поле типа "Checklist"
- [ ] Настроить название и отображение
- [ ] Открыть карточку
- [ ] Проверить что поле checklist отображается
- [ ] Добавить несколько элементов в чеклист
- [ ] Отметить элементы как выполненные
- [ ] Проверить прогресс-бар
- [ ] Редактировать элементы
- [ ] Удалить элементы
- [ ] Обновить страницу - проверить сохранность
- [ ] Создать другие типы полей (dropdown, number, date)
- [ ] Проверить работу каждого типа
- [ ] Проверить отображение на фронте карточки (showOnFrontOfCard)
- [ ] Проверить копирование значений
- [ ] Проверить права доступа (editor vs viewer)

---

## Этап 7: Документация и финализация (2-3 часа)

### 7.1. Обновить документацию API (Swagger)

Обновить swagger комментарии в контроллерах с новыми полями type и config.

### 7.2. Создать руководство пользователя

**Файл:** `planka/docs/CUSTOM_FIELDS_GUIDE.md`

```markdown
# Руководство по кастомным полям

## Типы полей

### Text (Текст)
Простое текстовое поле для ввода строк.

### Checklist (Чеклист)
Список задач с возможностью отмечать выполненные элементы.
- Показывает прогресс выполнения
- Возможность добавлять/удалять элементы
- Редактирование текста элементов

### Dropdown (Выпадающий список)
Выбор значения из предопределенного списка опций.
- Настройка опций при создании поля
- Выбор одного значения из списка

### Number (Число)
Поле для ввода числовых значений.

### Date (Дата)
Выбор даты с помощью календаря.

### Checkbox (Флажок)
Простой флажок да/нет.

### URL
Поле для ввода веб-адресов с валидацией.

### Email
Поле для ввода email адресов с валидацией.

## Как создать кастомное поле

1. Откройте настройки проекта
2. Перейдите в раздел "Custom Fields"
3. Создайте группу полей или выберите существующую
4. Нажмите "Add Field"
5. Выберите тип поля
6. Настройте параметры (название, отображение на карточке)
7. Для dropdown - добавьте опции
8. Сохраните

## Использование полей в карточках

Кастомные поля отображаются в модальном окне карточки.
Если включена опция "Show on front of card", поле также отображается на превью карточки.
```

### 7.3. Changelog

**Файл:** `planka/CHANGELOG.md`

Добавить запись:

```markdown
## [2.x.x] - 2025-10-06

### Added
- Support for typed custom fields
- New custom field types:
  - Checklist - task list with progress tracking
  - Dropdown - select from predefined options
  - Number - numeric values
  - Date - date picker
  - Checkbox - boolean flag
  - URL - web address with validation
  - Email - email address with validation
- Field type selection in custom field editor
- Visual components for each field type
- Progress indicator for checklist fields
- Backend validation for field types
- Database migration for field types

### Changed
- Custom fields now have a `type` attribute (default: 'text')
- CustomField model updated with type and config fields
- API controllers updated to support field types
- Frontend components refactored for type-specific rendering

### Migration Notes
- Run database backup before upgrading
- Migration will automatically add 'type' column to custom_field table
- All existing fields will be set to type='text'
- No data loss expected
```

---

## Этап 8: Deployment (1-2 часа)

### 8.1. Подготовка к деплою

```powershell
# 1. Убедиться что все тесты проходят
npm test

# 2. Сделать финальный коммит
git add .
git commit -m "feat: Add typed custom fields with checklist support"

# 3. Создать тег версии
git tag -a v2.x.x -m "Add typed custom fields"
git push origin feature/custom-field-types --tags
```

### 8.2. Создать Pull Request

Создать PR в основную ветку с описанием:

```markdown
# Add Typed Custom Fields

## Overview
This PR adds support for typed custom fields, allowing users to create fields of different types including checklist, dropdown, number, date, checkbox, URL, and email.

## Changes
- Added `type` and `config` columns to `custom_field` table
- Updated API controllers for field type support
- Created type-specific UI components
- Added validation for different field types
- Implemented checklist component with progress tracking

## Migration
- Database migration included
- Backward compatible with existing text fields
- All existing fields automatically set to type='text'

## Testing
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Manual testing completed
- [ ] Docker build successful

## Screenshots
[Attach screenshots of checklist field in action]

## Breaking Changes
None - fully backward compatible
```

### 8.3. Деплой в продакшн

```powershell
# 1. Создать финальный бэкап продакшн базы
.\scripts\backup-database.ps1

# 2. Переключиться на production окружение
git checkout master
git pull origin master
git merge feature/custom-field-types

# 3. Остановить сервисы
docker-compose down

# 4. Пересобрать образы
docker-compose build

# 5. Запустить с миграциями
docker-compose up -d

# 6. Проверить логи
docker-compose logs -f server

# 7. Проверить что всё работает
# Открыть приложение в браузере и протестировать
```

### 8.4. Мониторинг после деплоя

```powershell
# Следить за логами первые 10-15 минут
docker-compose logs -f

# Проверить использование ресурсов
docker stats

# Проверить статус контейнеров
docker-compose ps
```

---

## План отката (Rollback Plan)

### В случае критических проблем:

#### Вариант 1: Откат через Docker (если контейнеры еще запущены)

```powershell
# 1. Остановить новую версию
docker-compose down

# 2. Переключиться на предыдущую версию кода
git checkout <previous-version-tag>

# 3. Восстановить базу данных
.\scripts\restore-database.ps1 .\backups\planka_backup_YYYYMMDD_HHMMSS.sql

# 4. Запустить старую версию
docker-compose up -d
```

#### Вариант 2: Откат только базы данных (если миграция прошла, но есть проблемы)

```powershell
# Восстановить базу из бэкапа
.\scripts\restore-database.ps1 .\backups\planka_backup_YYYYMMDD_HHMMSS.sql
```

#### Вариант 3: Откат миграции (если нужно удалить только новые колонки)

```sql
-- Подключиться к базе
docker exec -it planka_db_1 psql -U postgres -d planka

-- Выполнить откат миграции
ALTER TABLE custom_field DROP COLUMN type;
ALTER TABLE custom_field DROP COLUMN config;
```

---

## Чек-лист финальной проверки

### Перед началом реализации:
- [ ] Создан бэкап базы данных
- [ ] Создана ветка feature/custom-field-types
- [ ] Команда проинформирована о предстоящих изменениях

### Backend:
- [ ] Миграция создана и протестирована
- [ ] Модель CustomField обновлена
- [ ] Константы типов полей добавлены
- [ ] Контроллеры обновлены
- [ ] Валидация реализована
- [ ] Хелперы созданы
- [ ] Unit тесты написаны

### Frontend:
- [ ] Константы типов полей созданы
- [ ] Локализация добавлена
- [ ] CustomFieldEditor обновлен
- [ ] Компонент ChecklistField создан
- [ ] Остальные типы полей реализованы
- [ ] CustomField.jsx обновлен
- [ ] Стили добавлены

### Тестирование:
- [ ] Unit тесты проходят
- [ ] Интеграционные тесты проходят
- [ ] Ручное тестирование выполнено
- [ ] Тестирование в Docker окружении выполнено
- [ ] Проверена миграция существующих данных
- [ ] Проверена валидация

### Документация:
- [ ] API документация обновлена
- [ ] Руководство пользователя создано
- [ ] CHANGELOG обновлен
- [ ] README обновлен (если нужно)

### Deployment:
- [ ] Pull Request создан
- [ ] Code review выполнен
- [ ] Финальный бэкап создан
- [ ] Деплой выполнен
- [ ] Мониторинг настроен
- [ ] План отката готов

---

## Оценка времени

| Этап | Описание | Время |
|------|----------|-------|
| 0 | Подготовка и бэкап | 1-2 часа |
| 1 | Backend - База данных | 3-4 часа |
| 2 | Backend - API и валидация | 4-5 часов |
| 3 | Frontend - Константы и типы | 2-3 часа |
| 4 | Frontend - Редактор полей | 3-4 часа |
| 5 | Frontend - Компоненты значений | 6-8 часов |
| 6 | Тестирование и отладка | 4-6 часов |
| 7 | Документация | 2-3 часа |
| 8 | Deployment | 1-2 часа |
| **Итого** | | **26-37 часов** |

**Примерно 3-5 рабочих дней для одного разработчика**

---

## Риски и их митигация

| Риск | Вероятность | Воздействие | Митигация |
|------|-------------|-------------|-----------|
| Ошибка в миграции БД | Средняя | Высокое | Тестирование на копии БД, бэкап перед миграцией |
| Проблемы совместимости | Низкая | Среднее | Backward compatibility, тестирование старых полей |
| Баги в UI компонентах | Средняя | Среднее | Тщательное тестирование, постепенный rollout |
| Проблемы производительности | Низкая | Среднее | Мониторинг, оптимизация запросов |
| Потеря данных | Очень низкая | Критическое | Множественные бэкапы, тестирование восстановления |

---

## Поддержка после релиза

### Первая неделя:
- Ежедневный мониторинг логов
- Сбор обратной связи от пользователей
- Быстрое реагирование на баги

### Первый месяц:
- Мониторинг производительности
- Оптимизация на основе реального использования
- Документирование частых вопросов

### Долгосрочно:
- Добавление новых типов полей по запросам
- Улучшение UX на основе feedback
- Оптимизация работы с большими чеклистами
