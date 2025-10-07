# Planka Extended

Проект Planka Extended является форком [Planka](https://github.com/plankanban/planka)  
Суть проекта в расширении функционала оригинального Planka. Например с помощью добавления кастомных полей карточки.

## 🆕 Новые возможности

### Расширенная система уведомлений (Phase 3) ✅

Полнофункциональная система уведомлений с:
- **10 типов событий**: создание карточки, перемещение, комментарии, назначение пользователей, дедлайны, задачи, вложения
- **UI управления**: полный интерфейс для настройки каналов и подписок
- **Scheduler дедлайнов**: автоматические уведомления о приближающихся и просроченных задачах
- **Поддержка каналов**: Webhook, Slack, Discord, Telegram, Email
- **Гибкая настройка**: подписка на конкретные события для каждого канала

#### Быстрый старт

1. **Установка зависимостей:**
   ```bash
   cd planka/server
   npm install
   ```

2. **Запуск scheduler дедлайнов:**
   ```bash
   # Development
   node server/workers/due-date-worker.js
   
   # Production (PM2)
   pm2 start server/workers/due-date-worker.js --name planka-due-date-worker
   ```

3. **Настройка в UI:**
   - Войдите в Planka
   - Настройки → Уведомления
   - Добавьте канал и подпишитесь на события

#### Документация

- [📚 Руководство разработчика](docs/NOTIFICATION_SYSTEM_DEV_NOTES.md)
- [🚀 Быстрый старт Phase 3](docs/PHASE3_QUICK_START.md)
- [📋 Отчёт Phase 3](docs/PHASE3_COMPLETION_REPORT.md)
- [📋 Отчёт Phase 2](docs/PHASE2_COMPLETION_REPORT.md)

### Другие возможности

