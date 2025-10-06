# Quick Start Guide для реализации Custom Field Types

## Подготовка (День 0)

### 1. Создайте резервную копию

```powershell
cd d:\Работать\MY\planka-extended\planka
.\scripts\backup-database.ps1
```

### 2. Создайте ветку разработки

```bash
git checkout -b feature/custom-field-types
git push -u origin feature/custom-field-types
```

### 3. Проверьте статус системы

```powershell
.\scripts\check-status.ps1
```

---

## Реализация Backend (Дни 1-2)

### День 1: База данных и модели

#### Шаг 1: Создайте миграцию

Файл: `planka/server/db/migrations/20251006120000_add_custom_field_types.js`

```javascript
module.exports.up = async (knex) => {
  await knex.schema.alterTable('custom_field', (table) => {
    table.string('type', 50).notNullable().defaultTo('text');
    table.jsonb('config').nullable();
  });
  await knex('custom_field').update({ type: 'text' });
};

module.exports.down = async (knex) => {
  await knex.schema.alterTable('custom_field', (table) => {
    table.dropColumn('type');
    table.dropColumn('config');
  });
};
```

#### Шаг 2: Обновите модель

Файл: `planka/server/api/models/CustomField.js`

Добавьте в `attributes`:

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

#### Шаг 3: Добавьте константы

Файл: `planka/server/constants.js`

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

#### Шаг 4: Протестируйте миграцию

```powershell
# Пересоберите и запустите
docker-compose down
docker-compose up --build -d

# Проверьте логи
docker-compose logs -f server

# Проверьте структуру таблицы
.\scripts\view-database.ps1 custom_field
```

### День 2: API и валидация

#### Шаг 1: Обновите контроллеры

В файлах:
- `planka/server/api/controllers/custom-fields/create-in-base-custom-field-group.js`
- `planka/server/api/controllers/custom-fields/create-in-custom-field-group.js`
- `planka/server/api/controllers/custom-fields/update.js`

Добавьте в `inputs`:

```javascript
type: {
  type: 'string',
  isIn: ['text', 'checklist', 'dropdown', 'number', 'date', 'checkbox', 'url', 'email'],
  defaultsTo: 'text',
},
config: {
  type: 'json',
},
```

#### Шаг 2: Создайте хелпер валидации

Файл: `planka/server/api/helpers/custom-field-values/validate-content.js`

См. полный код в IMPLEMENTATION_PLAN.md, раздел 2.3

#### Шаг 3: Протестируйте API

Используйте Postman или curl для тестирования:

```bash
# Создать поле с типом checklist
POST /base-custom-field-groups/:id/custom-fields
{
  "position": 65536,
  "name": "My Checklist",
  "type": "checklist",
  "showOnFrontOfCard": false
}
```

---

## Реализация Frontend (Дни 3-4)

### День 3: Константы и редактор полей

#### Шаг 1: Создайте константы

Файл: `planka/client/src/constants/CustomFieldTypes.js`

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
  // ... и т.д.
};
```

#### Шаг 2: Добавьте локализацию

В файлах `planka/client/src/locales/*/core.js`:

```javascript
common: {
  text: 'Text',
  checklist: 'Checklist',
  dropdown: 'Dropdown',
  // ... и т.д.
}
```

#### Шаг 3: Обновите редактор полей

Файл: `planka/client/src/components/custom-field-groups/CustomFieldGroupStep/CustomFieldEditor.jsx`

Добавьте выбор типа поля (см. полный код в IMPLEMENTATION_PLAN.md, раздел 4.1)

### День 4: Компоненты отображения

#### Шаг 1: Создайте ChecklistField

Файл: `planka/client/src/components/custom-fields/CustomField/ChecklistField.jsx`

См. полный код в IMPLEMENTATION_PLAN.md, раздел 5.1

#### Шаг 2: Создайте стили

Файл: `planka/client/src/components/custom-fields/CustomField/ChecklistField.module.scss`

См. полный код в IMPLEMENTATION_PLAN.md, раздел 5.1

#### Шаг 3: Обновите CustomField.jsx

Добавьте условный рендеринг для разных типов полей (см. раздел 5.3)

#### Шаг 4: Пересоберите frontend

```powershell
docker-compose down
docker-compose up --build -d
```

---

## Тестирование (День 5)

### Автоматические тесты

```powershell
# В контейнере сервера
docker exec planka_server_1 npm test

# Проверьте результаты
```

### Ручное тестирование

**Чек-лист:**

1. [ ] Откройте Planka в браузере
2. [ ] Откройте настройки проекта
3. [ ] Создайте группу кастомных полей
4. [ ] Добавьте поле типа "Checklist"
5. [ ] Откройте карточку
6. [ ] Добавьте элементы в чеклист
7. [ ] Отметьте элементы как выполненные
8. [ ] Проверьте прогресс-бар
9. [ ] Обновите страницу - данные сохранились?
10. [ ] Создайте другие типы полей
11. [ ] Проверьте каждый тип
12. [ ] Проверьте showOnFrontOfCard
13. [ ] Проверьте права доступа

---

## Деплой в продакшн

### Подготовка

```powershell
# 1. Финальный бэкап
.\scripts\backup-database.ps1

# 2. Коммит и тег
git add .
git commit -m "feat: Add typed custom fields with checklist support"
git tag -a v2.1.0 -m "Add typed custom fields"
git push origin feature/custom-field-types --tags

# 3. Создайте Pull Request на GitHub
```

### Деплой

```powershell
# 1. Переключитесь на master
git checkout master
git pull origin master
git merge feature/custom-field-types

# 2. Остановите сервисы
docker-compose down

# 3. Пересоберите
docker-compose build

# 4. Запустите
docker-compose up -d

# 5. Следите за логами
docker-compose logs -f
```

### Мониторинг

```powershell
# Проверка статуса
.\scripts\check-status.ps1

# Просмотр логов в реальном времени
docker-compose logs -f server

# Проверка базы данных
.\scripts\view-database.ps1 custom_field
```

---

## Откат при проблемах

### Быстрый откат

```powershell
# 1. Остановите новую версию
docker-compose down

# 2. Вернитесь к предыдущей версии
git checkout <previous-version-tag>

# 3. Восстановите базу
.\scripts\restore-database.ps1 .\backups\planka_backup_YYYYMMDD_HHMMSS.sql

# 4. Запустите старую версию
docker-compose up -d
```

---

## Полезные команды

### Docker

```powershell
# Статус контейнеров
docker-compose ps

# Логи
docker-compose logs -f
docker-compose logs -f server
docker-compose logs -f db

# Перезапуск
docker-compose restart
docker-compose restart server

# Полная пересборка
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Очистка
docker-compose down -v  # Удалит volumes!
docker system prune -a  # Очистка неиспользуемых образов
```

### База данных

```powershell
# Подключение к БД
docker exec -it planka_db_1 psql -U postgres -d planka

# Бэкап
.\scripts\backup-database.ps1

# Восстановление
.\scripts\restore-database.ps1 <файл>

# Просмотр структуры
.\scripts\view-database.ps1 custom_field

# Список таблиц
.\scripts\view-database.ps1
```

### Git

```bash
# Создать ветку
git checkout -b feature/custom-field-types

# Коммит
git add .
git commit -m "feat: Add custom field types"

# Пуш
git push origin feature/custom-field-types

# Тег
git tag -a v2.1.0 -m "Add typed custom fields"
git push --tags

# Откат коммита
git reset --hard HEAD~1

# Откат к версии
git checkout v2.0.0
```

---

## Контакты и поддержка

При возникновении проблем:

1. Проверьте логи: `docker-compose logs -f`
2. Проверьте статус: `.\scripts\check-status.ps1`
3. Проверьте структуру БД: `.\scripts\view-database.ps1`
4. Создайте issue на GitHub с описанием проблемы и логами

---

## Чек-лист прогресса

### Backend
- [ ] Миграция создана
- [ ] Модель обновлена
- [ ] Константы добавлены
- [ ] Контроллеры обновлены
- [ ] Валидация реализована
- [ ] Тесты написаны

### Frontend
- [ ] Константы созданы
- [ ] Локализация добавлена
- [ ] Редактор полей обновлен
- [ ] ChecklistField создан
- [ ] CustomField обновлен
- [ ] Стили добавлены

### Тестирование
- [ ] Unit тесты проходят
- [ ] API протестировано
- [ ] UI протестировано
- [ ] Миграция протестирована

### Deployment
- [ ] Бэкап создан
- [ ] Код в master
- [ ] Деплой выполнен
- [ ] Мониторинг настроен
- [ ] Документация обновлена

---

**Удачи в реализации! 🚀**
