# Planka Extended - Документация по кастомным полям

## 📚 Обзор документации

Этот репозиторий содержит полную документацию по реализации типизированных кастомных полей в Planka, включая тип "checklist".

### Документы

1. **[CUSTOM_FIELDS_ANALYSIS.md](./CUSTOM_FIELDS_ANALYSIS.md)** - Подробный анализ текущей системы кастомных полей
2. **[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)** - Детальный план реализации (Вариант 2)
3. **[QUICK_START.md](./QUICK_START.md)** - Краткое руководство по быстрому старту
4. **[scripts/README.md](./scripts/README.md)** - Документация по скриптам управления

### Скрипты

В директории `scripts/` находятся полезные PowerShell скрипты для работы с Planka в Docker:

- **backup-database.ps1** - Создание резервной копии базы данных
- **restore-database.ps1** - Восстановление из резервной копии
- **check-status.ps1** - Проверка статуса контейнеров
- **view-database.ps1** - Просмотр структуры базы данных

## 🚀 Быстрый старт

### 1. Создайте резервную копию

```powershell
cd planka
.\scripts\backup-database.ps1
```

### 2. Изучите документацию

- Начните с [CUSTOM_FIELDS_ANALYSIS.md](./CUSTOM_FIELDS_ANALYSIS.md) для понимания текущей архитектуры
- Изучите [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) для детального плана
- Используйте [QUICK_START.md](./QUICK_START.md) как справочник при реализации

### 3. Начните реализацию

Следуйте этапам из IMPLEMENTATION_PLAN.md:

1. **Этап 0** - Подготовка и бэкап (1-2 часа)
2. **Этап 1** - Backend: База данных (3-4 часа)
3. **Этап 2** - Backend: API и валидация (4-5 часов)
4. **Этап 3-5** - Frontend (11-15 часов)
5. **Этап 6** - Тестирование (4-6 часов)
6. **Этап 7** - Документация (2-3 часа)
7. **Этап 8** - Deployment (1-2 часа)

**Общее время:** 26-37 часов (3-5 рабочих дней)

## 📊 Что будет реализовано

### Новые типы полей

1. **Text** - Простое текстовое поле (уже существует)
2. **Checklist** ✨ - Список задач с прогресс-баром
3. **Dropdown** - Выпадающий список
4. **Number** - Числовое поле
5. **Date** - Выбор даты
6. **Checkbox** - Флажок да/нет
7. **URL** - Поле для веб-адресов
8. **Email** - Поле для email

### Особенности Checklist

- ✅ Добавление/удаление элементов
- ✅ Отметка выполненных элементов
- ✅ Прогресс-бар выполнения
- ✅ Редактирование текста элементов
- ✅ Сохранение в JSON формате

## 🏗️ Архитектура решения

### Backend

```
server/
├── db/
│   └── migrations/
│       └── 20251006120000_add_custom_field_types.js
├── api/
│   ├── models/
│   │   └── CustomField.js (+ type, config)
│   ├── controllers/
│   │   └── custom-fields/ (обновлены)
│   └── helpers/
│       └── custom-field-values/
│           └── validate-content.js (новый)
└── constants.js (+ CustomFieldTypes)
```

### Frontend

```
client/src/
├── constants/
│   └── CustomFieldTypes.js (новый)
├── components/
│   ├── custom-field-groups/
│   │   └── CustomFieldGroupStep/
│   │       ├── CustomFieldEditor.jsx (обновлен)
│   │       └── DropdownConfigEditor.jsx (новый)
│   └── custom-fields/
│       └── CustomField/
│           ├── ChecklistField.jsx (новый)
│           ├── DropdownField.jsx (новый)
│           ├── NumberField.jsx (новый)
│           ├── DateField.jsx (новый)
│           └── ... другие типы
└── locales/ (обновлены)
```

## 🔧 Требования

- Docker Desktop
- PowerShell 5.1+
- Git
- Node.js (для разработки)
- PostgreSQL (в Docker)

## 📝 Структура базы данных

После миграции таблица `custom_field` будет содержать:

```sql
CREATE TABLE custom_field (
  id BIGINT PRIMARY KEY,
  base_custom_field_group_id BIGINT,
  custom_field_group_id BIGINT,
  position DOUBLE PRECISION NOT NULL,
  name TEXT NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'text',  -- НОВОЕ
  config JSONB,                               -- НОВОЕ
  show_on_front_of_card BOOLEAN NOT NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## 🎯 Цели проекта

1. ✅ Добавить поддержку типизированных полей
2. ✅ Реализовать тип "checklist" с полным функционалом
3. ✅ Обеспечить обратную совместимость
4. ✅ Создать расширяемую архитектуру для новых типов
5. ✅ Предоставить инструменты для бэкапа и восстановления
6. ✅ Документировать весь процесс

## 🛡️ Безопасность

### Бэкапы

- Создавайте бэкап перед каждым значительным изменением
- Храните бэкапы в нескольких местах
- Регулярно тестируйте восстановление

### Откат изменений

Полная процедура отката описана в [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md#план-отката-rollback-plan).

Быстрый откат:

```powershell
# 1. Остановить новую версию
docker-compose down

# 2. Вернуться к предыдущей версии
git checkout <previous-version-tag>

# 3. Восстановить базу
.\scripts\restore-database.ps1 .\backups\planka_backup_YYYYMMDD_HHMMSS.sql

# 4. Запустить
docker-compose up -d
```

## 📈 Прогресс реализации

### Этап подготовки

- [x] Анализ текущей системы
- [x] Создание детального плана
- [x] Разработка скриптов для бэкапа
- [x] Документирование процесса

### Этапы реализации

- [ ] Backend: База данных и миграции
- [ ] Backend: API и валидация
- [ ] Frontend: Константы и типы
- [ ] Frontend: Редактор полей
- [ ] Frontend: Компоненты отображения
- [ ] Тестирование
- [ ] Документация API
- [ ] Deployment

## 📖 Дополнительные ресурсы

### Внутренние документы

- [CUSTOM_FIELDS_ANALYSIS.md](./CUSTOM_FIELDS_ANALYSIS.md) - Анализ системы
- [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) - План реализации
- [QUICK_START.md](./QUICK_START.md) - Краткое руководство
- [scripts/README.md](./scripts/README.md) - Документация скриптов

### Внешние ссылки

- [Официальный репозиторий Planka](https://github.com/plankanban/planka)
- [Docker Documentation](https://docs.docker.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [React Documentation](https://react.dev/)

## 🤝 Вклад в проект

1. Создайте ветку для вашей функции: `git checkout -b feature/custom-field-types`
2. Следуйте плану реализации из документации
3. Пишите тесты для нового функционала
4. Обновите документацию
5. Создайте Pull Request с подробным описанием

## 📞 Поддержка

При возникновении проблем:

1. Проверьте логи: `docker-compose logs -f`
2. Используйте скрипт проверки: `.\scripts\check-status.ps1`
3. Изучите раздел "Устранение неполадок" в документации
4. Создайте issue с описанием проблемы и логами

## 📄 Лицензия

Этот проект следует лицензии оригинального Planka.
См. [LICENSE.md](./planka/LICENSE.md) для деталей.

## ✨ Авторы

- **Анализ и планирование**: Planka Extended Team
- **Оригинальный Planka**: [PLANKA Software GmbH](https://planka.app/)

---

**Версия документации:** 1.0.0  
**Дата:** 2025-10-06  

**Статус:** 📝 Планирование завершено, готов к реализации
