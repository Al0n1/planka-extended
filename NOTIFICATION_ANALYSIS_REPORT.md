# Анализ системы уведомлений Planka

## 1. Обзор текущей реализации

### Как Planka реализует систему уведомлений Apprise «из коробки»

#### Формирование событий
- События генерируются при создании действий (actions) на картах в системе Planka.
- Основной код находится в `server/api/helpers/actions/create-one.js`.
- При создании action типа `CREATE_CARD` или `MOVE_CARD` (определены в `Action.EXTERNAL_NOTIFIABLE_TYPES`), система проверяет наличие настроенных notification services для доски.
- Если сервисы найдены, формируется и отправляется уведомление через Apprise.

#### Вызов Apprise и хранение параметров
- Параметры уведомлений хранятся в модели `NotificationService` (`server/api/models/NotificationService.js`).
- Модель содержит поля: `userId` (nullable), `boardId` (nullable), `url` (Apprise URL), `format` (text/markdown/html).
- Для отправки используется Python скрипт `server/utils/send_notifications.py`, который импортирует библиотеку `apprise` (версия 1.9.4 из `requirements.txt`).
- Скрипт создает экземпляр `apprise.Apprise()`, добавляет URL через `app.add(url)`, и отправляет уведомление через `app.notify(title=title, body=body, body_format=body_format)`.

#### Формирование контекста уведомления Apprise
- Контекст формируется в функциях `buildTitle` и `buildBodyByFormat` в `server/api/helpers/actions/create-one.js`.
- **Title**: Простая строка, например "Card Created" или "Card Moved" (переведенная).
- **Body**: Объект с тремя форматами (text, markdown, html), содержащий:
  - Кто: имя пользователя (`actorUser.name`)
  - Что: название карты (`card.name`) с ссылкой на карту (`${baseUrl}/cards/${card.id}`)
  - Когда: неявно через время отправки
  - Где: название доски (`board.name`), названия списков (для MOVE_CARD: from/to list names)
- Пример для CREATE_CARD: "%s created %s in %s on %s" (actor, card, list, board)

#### Доступные типы событий
- Только два типа действий поддерживают external notifications: `CREATE_CARD` и `MOVE_CARD` (из `Action.Types`).
- Внутренние уведомления поддерживают больше типов: `MOVE_CARD`, `ADD_MEMBER_TO_CARD` (из `INTERNAL_NOTIFIABLE_TYPES`).

#### Архитектурная структура
- Уровень генерации: Server-side, в helpers при создании actions.
- Передача: Синхронный вызов через `sails.helpers.utils.sendNotifications` -> `execFile` Python скрипт.
- Интеграция с Apprise: Через Python скрипт, без очередей или асинхронной обработки.

#### Места в коде
- Генерация событий: `server/api/helpers/actions/create-one.js` (строки ~199-207)
- Отправка: `server/api/helpers/utils/send-notifications.js` -> `server/utils/send_notifications.py`
- Модель данных: `server/api/models/NotificationService.js`
- Получение сервисов: `NotificationService.qm.getByBoardId(board.id)`

#### Архитектурная структура уведомлений Apprise

- **Уровень генерации**: Исключительно server-side. Уведомления формируются в Sails.js helpers при создании сущностей (actions, comments) на сервере. UI не участвует в генерации уведомлений Apprise.
- **Структура передачи**: Синхронный вызов через Sails.js helper (`sails.helpers.utils.sendNotifications`), который использует Node.js `child_process.execFile` для выполнения Python скрипта. Нет использования очередей (job queue), WebSocket или асинхронных задач. Передача происходит в том же потоке, что и основная операция (создание action/comment).
- **Точка интеграции с Apprise**: Python скрипт `server/utils/send_notifications.py`. Скрипт создает экземпляр `apprise.Apprise()`, добавляет URL сервиса и вызывает `app.notify()` для отправки уведомления. Интеграция происходит через библиотеку `apprise` версии 1.9.4.

Уведомления Apprise отправляются для:
- Actions типов `CREATE_CARD` и `MOVE_CARD` (если тип в `Action.EXTERNAL_NOTIFIABLE_TYPES`).
- Всех новых комментариев (comments), если настроены сервисы для доски.

## 3. Модель данных и безопасность

### Таблицы/коллекции, связанные с уведомлениями Apprise
Основная модель: `NotificationService` (`server/api/models/NotificationService.js`).
- Поля: `id`, `userId` (nullable), `boardId` (nullable), `url`, `format` (text/markdown/html), `createdAt`, `updatedAt`.
- Связанные модели:
  - `User` (`server/api/models/User.js`): пользователи системы.
  - `Board` (`server/api/models/Board.js`): доски, к которым привязаны сервисы.
  - `Project` (`server/api/models/Project.js`): проекты, содержащие доски.
  - `BoardMembership` (`server/api/models/BoardMembership.js`): членство пользователей в досках.
  - `ProjectManager` (`server/api/models/ProjectManager.js`): менеджеры проектов.

### Связи между пользователем, доской, проектом и уведомлениями Apprise
- `NotificationService.userId` -> `User.id`: сервисы могут быть привязаны к конкретному пользователю (личные настройки).
- `NotificationService.boardId` -> `Board.id`: сервисы привязаны к доске (глобальные для доски).
- `Board.projectId` -> `Project.id`: доски принадлежат проектам.
- `Project.ownerProjectManagerId` -> `ProjectManager.id`: проекты имеют владельца-менеджера.
- `ProjectManager.userId` -> `User.id`: менеджеры проектов - это пользователи.
- `BoardMembership.userId` -> `User.id`, `BoardMembership.boardId` -> `Board.id`: членство пользователей в досках.

Сервисы Apprise могут быть настроены на уровне пользователя или доски, но в коде используются только сервисы доски (`NotificationService.qm.getByBoardId(board.id)`).

### Способ хранения токенов/URL (безопасность, шифрование, ревокация)
- URL Apprise хранятся в plaintext в поле `url` модели `NotificationService` без шифрования.
- Безопасность: доступ к сервисам контролируется через членство в доске/проекте (см. задачу 4).
- Ревокация: удаление записи из `NotificationService` (через API контроллеры, например `notification-services/delete.js`).
- Нет маскирования в логах или дополнительной защиты (токены/URL видны в базе данных).

### Наличие и структура ролей
Роли пользователей:
- `User.role`: enum [`admin`, `projectOwner`, `boardUser`] - глобальные роли.
  - `admin`: администратор системы.
  - `projectOwner`: владелец проекта.
  - `boardUser`: обычный пользователь доски.
- `BoardMembership.role`: enum [`editor`, `viewer`] - роли в конкретной доске.
  - `editor`: может редактировать доску.
  - `viewer`: только просмотр.

Роли влияют на доступ к настройкам уведомлений (см. задачу 4).

## 4. Роли и границы доступа

### Может ли пользователь получать уведомления Apprise из чужих проектов
Apprise - это исходящие уведомления на внешние сервисы, не входящие. Пользователи не "получают" уведомления Apprise; вместо этого, сервисы Apprise настраиваются для отправки уведомлений о событиях в досках.

Пользователь не может настроить сервисы Apprise для чужих проектов/досок:
- Сервисы для доски (`boardId`) могут создавать/обновлять только project manager'ы проекта, к которому принадлежит доска.
- Сервисы для пользователя (`userId`) могут создавать/обновлять только сам пользователь.
- В коде отправки уведомлений используются только сервисы доски (`NotificationService.qm.getByBoardId(board.id)`), user сервисы игнорируются.

Таким образом, пользователь не имеет доступа к настройке Apprise для чужих проектов.

### Как проверяется членство в проекте/доске
- При настройке сервисов для доски: проверяется `sails.helpers.users.isProjectManager(currentUser.id, project.id)` - только project manager проекта может управлять сервисами доски.
- Членство в доске не проверяется напрямую для Apprise, поскольку сервисы глобальны для доски.
- Для отправки уведомлений: членство пользователя в доске проверяется неявно через доступ к действиям (actions/comments), но для Apprise это не требуется, так как сервисы уже авторизованы на уровне доски.

### Где проходит фильтрация по ролям
- В контроллерах `notification-services/create-in-board.js`, `update.js`, `delete.js`: проверка `isProjectManager` для board сервисов.
- В `create-in-user.js`: проверка `inputs.userId === currentUser.id` для user сервисов.
- Глобальные роли (`User.role`): `admin`, `projectOwner`, `boardUser` - влияют на `isProjectManager` (project manager - это пользователь с ролью в `ProjectManager`).
- Роли доски (`BoardMembership.role`): `editor`, `viewer` - не влияют на Apprise, так как сервисы управляются на уровне проекта.

## 5. Надёжность и фоновые задачи

### Используется ли очередь (job queue, worker)
Нет. Отправка уведомлений Apprise происходит синхронно в том же потоке, что и основная операция (создание action/comment). Используется `child_process.execFile` для вызова Python скрипта, без асинхронных очередей или фоновых воркеров.

### Есть ли retry, backoff, батчинг
Нет retry или backoff: если отправка Apprise fails, ошибка не обрабатывается, и нет повторных попыток.
Нет батчинга: уведомления отправляются по одному для каждого сервиса в цикле в Python скрипте.

### Как логируются ошибки Apprise
Ошибки Apprise не логируются. В `send-notifications.js` результат `execFile` возвращается без обработки. В вызывающем коде (например, `actions/create-one.js`) ошибки не перехватываются и не логируются. Python скрипт не имеет логирования ошибок.

### Какие метрики доступны
Нет встроенных метрик для уведомлений Apprise. Нет счетчиков отправленных уведомлений, ошибок или производительности.

## 6. Уровень изоляции и безопасности

### Где и как хранятся токены/ссылки на Apprise
Токены/URL Apprise хранятся в plaintext в поле `url` модели `NotificationService` в базе данных. Нет шифрования или хэширования. Доступ к данным контролируется через роли пользователей (только project manager может управлять сервисами доски).

### Как обрабатываются личные данные
В payload уведомлений Apprise передаются только публичные данные: имя пользователя (`actorUser.name`), название карты (`card.name`), название доски (`board.name`), ссылка на карту. Не передаются email, пароли или другие чувствительные данные. Личные данные пользователей (email) не включаются в уведомления.

### Есть ли маскирование логов
Нет маскирования логов. URL Apprise видны в базе данных в plaintext. В коде нет логирования URL или маскирования чувствительных данных в логах. Ошибки Apprise не логируются.

## 7. Нагрузочный профиль

### Сколько событий генерируется в среднем и при пиках
Точный количественный анализ невозможен без метрик или логов использования. Качественная оценка:
- **Средняя нагрузка**: Каждое создание/перемещение карты (action `CREATE_CARD`, `MOVE_CARD`) или комментария генерирует уведомление Apprise, если для доски настроены сервисы. В типичном проекте - десятки-сотни событий в день.
- **Пиковая нагрузка**: При активной работе команды (например, спринт в agile) - сотни событий в час. Каждый сервис получает отдельное уведомление, так что при 5 сервисах на доске - 5 уведомлений на событие.

### Возможные проблемы масштабирования
- **Синхронная отправка**: Уведомления отправляются в основном потоке Node.js, блокируя создание actions/comments. При медленных Apprise или большом количестве сервисов - замедление UI.
- **Отсутствие очередей**: Нет буферизации при пиках; все уведомления отправляются сразу, что может перегружать внешние сервисы или сеть.
- **Масштабирование по сервисам**: Python скрипт отправляет по одному сервису за раз; при 10+ сервисах на доске - последовательная отправка, увеличивая latency.
- **База данных**: Запрос `NotificationService.qm.getByBoardId` на каждое событие; при высокой частоте - нагрузка на DB.
- **Отсутствие лимитов**: Нет ограничений на количество сервисов на доску, что может привести к abuse.

## 8. UI и пользовательские настройки

### Где находится модуль настройки уведомлений Apprise
Модуль настройки находится в клиентской части:
- Для досок: `client/src/components/boards/BoardSettingsModal/NotificationsPane.jsx` - модальное окно настроек доски.
- Для пользователей: `client/src/components/users/UserSettingsModal/NotificationsPane.jsx` - модальное окно настроек пользователя.
- Основной компонент: `client/src/components/notification-services/NotificationServices/NotificationServices.jsx` - форма для добавления/удаления сервисов.

### Какие данные отправляются на сервер при добавлении Apprise URL
При добавлении сервиса отправляются:
- `url`: строка URL Apprise (максимум 512 символов, обязательное поле).
- `format`: формат уведомления (`text`, `markdown`, `html`; по умолчанию `markdown`).
- Для доски: `boardId` (из пути API `/boards/{boardId}/notification-services`).
- Для пользователя: `userId` (из пути API `/users/{userId}/notification-services`).

Данные отправляются через API POST запросы к `notification-services/create-in-board.js` или `create-in-user.js`.

### Можно ли расширить UI без полного рефакторинга
Да, UI можно расширить без полного рефакторинга:
- Компонент `NotificationServices.jsx` модульный: можно добавить новые поля в форму (например, дополнительные параметры для Apprise).
- Локализация поддерживает новые ключи (файлы в `client/src/locales/`).
- API контроллеры можно расширить новыми полями в моделях и контроллерах.
- Структура компонентов позволяет добавлять новые типы сервисов или каналов без изменения основного потока.

## 9. Тесты и документация

### Наличие unit/integration тестов для уведомлений Apprise
Тесты для уведомлений Apprise отсутствуют:
- Нет unit тестов для Python скрипта `server/utils/send_notifications.py`.
- Нет integration тестов для helpers `send-notifications.js` или `notification-services` контроллеров.
- В `server/test/integration/` нет тестов для notification services или send notifications.
- Тесты покрывают только базовые модели (например, `User.test.js`), но не функциональность Apprise.

### Документация по структуре событий и конфигурации Apprise
Документация ограничена:
- В README.md упоминается "Flexible Notifications: Get alerts through 100+ providers", но без деталей по Apprise.
- Swagger описания в моделях (`server/api/models/NotificationService.js`, `Action.js`) документируют поля и API эндпоинты.
- Нет отдельной документации по структуре событий (payload, типы actions), конфигурации Apprise или примерам URL.
- Локализация в `client/src/locales/` содержит ключ `plankaUsesAppriseToSendNotificationsToOver100PopularServices` с ссылкой на Apprise wiki.
- Отсутствует документация по кастомизации или расширению системы уведомлений.