# Scripts для управления Planka на Ubuntu Server

Этот набор скриптов упрощает работу с Planka в Docker окружении на Ubuntu Server.

## Доступные скрипты

### 🔄 backup-database.sh

Создает резервную копию базы данных PostgreSQL.

**Использование:**
```bash
./scripts/backup-database.sh
```

**Что делает:**
- Создает дамп базы данных PostgreSQL
- Сжимает бэкап с помощью gzip
- Сохраняет в директорию `./backups/`
- Показывает размер и информацию о бэкапе
- Отображает список всех доступных бэкапов

**Результат:**
- Файл: `./backups/planka_backup_YYYYMMDD_HHMMSS.sql.gz`

---

### ♻️ restore-database.sh

Восстанавливает базу данных из резервной копии.

**Использование:**
```bash
# Показать список доступных бэкапов
./scripts/restore-database.sh

# Восстановить из конкретного файла
./scripts/restore-database.sh ./backups/planka_backup_20251006_120000.sql.gz
```

**Что делает:**
- Останавливает сервер приложения
- Удаляет существующую базу данных
- Создает новую базу данных
- Восстанавливает данные из бэкапа (поддерживает .gz)
- Запускает приложение

**⚠️ ВНИМАНИЕ:** Это действие удалит все текущие данные!

---

### 📊 check-status.sh

Проверяет статус Docker контейнеров Planka.

**Использование:**
```bash
./scripts/check-status.sh
```

**Что показывает:**
- Статус всех контейнеров
- Доступность базы данных
- Использование ресурсов (CPU, память)
- Последние записи в логах
- Полезные команды для управления

---

### 🔍 view-database.sh

Просматривает структуру и содержимое базы данных.

**Использование:**
```bash
# Показать список всех таблиц
./scripts/view-database.sh

# Показать структуру конкретной таблицы
./scripts/view-database.sh custom_field

# Другие примеры
./scripts/view-database.sh custom_field_value
./scripts/view-database.sh card
./scripts/view-database.sh board
```

**Что показывает:**
- Список всех таблиц (без параметров)
- Структуру таблицы
- Количество записей
- Первые 5 записей (примеры данных)

---

## Типичные сценарии использования

### 📦 Перед обновлением системы

```bash
# 1. Подключитесь к серверу
ssh user@your-ubuntu-server
cd /path/to/planka

# 2. Проверьте статус
./scripts/check-status.sh

# 3. Создайте бэкап
./scripts/backup-database.sh

# 4. Выполните обновление
docker-compose down
docker-compose up --build -d

# 5. Проверьте статус после обновления
./scripts/check-status.sh
```

### 🔧 При разработке и тестировании

```bash
# 1. Создайте бэкап текущего состояния
./scripts/backup-database.sh

# 2. Выполните изменения и тестирование
# ... ваши изменения ...

# 3. Если что-то пошло не так - откатитесь
./scripts/restore-database.sh ./backups/planka_backup_YYYYMMDD_HHMMSS.sql.gz

# 4. Проверьте структуру БД
./scripts/view-database.sh custom_field
```

### 🚀 Миграция между серверами

```bash
# На старом сервере:
./scripts/backup-database.sh
# Скачайте файл из ./backups/ на локальную машину

# Загрузите на новый сервер:
scp backups/planka_backup_20251006_120000.sql.gz user@new-server:/path/to/planka/backups/

# На новом сервере:
ssh user@new-server
cd /path/to/planka
./scripts/restore-database.sh ./backups/planka_backup_20251006_120000.sql.gz
```

### 🐛 Отладка проблем

```bash
# 1. Проверьте статус системы
./scripts/check-status.sh

# 2. Посмотрите структуру проблемной таблицы
./scripts/view-database.sh custom_field

# 3. Проверьте логи в реальном времени
docker-compose logs -f server
```

---

## Требования

- **Ubuntu Server** 20.04 LTS или выше
- **Bash** 4.0 или выше
- **Docker** установлен и запущен
- **docker-compose** доступен
- Вы должны находиться в директории с `docker-compose.yml`

---

## Установка прав на выполнение

После клонирования репозитория дайте права на выполнение всем скриптам:

```bash
chmod +x scripts/*.sh
```

---

## Расположение файлов

```
planka/
├── docker-compose.yml
├── scripts/
│   ├── backup-database.ps1      # Создание бэкапа
│   ├── restore-database.ps1     # Восстановление из бэкапа
│   ├── check-status.ps1         # Проверка статуса
│   └── view-database.ps1        # Просмотр БД
└── backups/                     # Директория для бэкапов (создается автоматически)
    ├── planka_backup_20251006_120000.sql
    └── planka_backup_20251006_140000.sql
```

---

## Устранение неполадок

### Ошибка: "PostgreSQL контейнер не найден"

**Решение:**
```powershell
# Проверьте что Docker запущен
docker ps

# Проверьте что вы в правильной директории
cd d:\Работать\MY\planka-extended\planka

# Запустите контейнеры
docker-compose up -d

# Проверьте статус
.\scripts\check-status.ps1
```

### Ошибка при выполнении скрипта

**Решение:**
```powershell
# Разрешите выполнение скриптов
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Или запустите через PowerShell явно
powershell -ExecutionPolicy Bypass -File .\scripts\backup-database.ps1
```

### Контейнеры не запускаются после восстановления

**Решение:**
```powershell
# Проверьте логи
docker-compose logs -f

# Попробуйте перезапустить
docker-compose down
docker-compose up -d

# Если проблема сохраняется, восстановите более старый бэкап
.\scripts\restore-database.ps1 .\backups\<предыдущий_бэкап>.sql
```

---

## Автоматизация бэкапов

### Планировщик задач Windows

Создайте задачу в планировщике Windows для автоматического создания бэкапов:

1. Откройте **Планировщик заданий**
2. Создайте новое задание
3. Укажите триггер (например, ежедневно в 2:00)
4. Действие: Запустить программу
   - Программа: `powershell.exe`
   - Аргументы: `-ExecutionPolicy Bypass -File "d:\Работать\MY\planka-extended\planka\scripts\backup-database.ps1"`
   - Начать в: `d:\Работать\MY\planka-extended\planka`

### Очистка старых бэкапов

Добавьте в конец скрипта `backup-database.ps1`:

```powershell
# Удаление бэкапов старше 7 дней
Get-ChildItem "$backupDir\planka_backup_*.sql" | 
    Where-Object { $_.CreationTime -lt (Get-Date).AddDays(-7) } | 
    Remove-Item -Force
```

---

## Дополнительные команды

### Подключение к базе данных

```powershell
# Интерактивная консоль PostgreSQL
docker exec -it planka_db_1 psql -U postgres -d planka
```

### Выполнение SQL запроса

```powershell
# Одиночный запрос
docker exec planka_db_1 psql -U postgres -d planka -c "SELECT COUNT(*) FROM custom_field;"
```

### Экспорт в CSV

```powershell
# Экспорт таблицы в CSV
docker exec planka_db_1 psql -U postgres -d planka -c "COPY custom_field TO STDOUT WITH CSV HEADER" > custom_field.csv
```

---

## Безопасность

### Рекомендации:

1. **Храните бэкапы в безопасном месте**
   - Не храните только в одной директории
   - Используйте внешние хранилища (Dropbox, Google Drive и т.д.)

2. **Шифруйте важные бэкапы**
   ```powershell
   # Пример шифрования с помощью 7-Zip
   7z a -p -mhe=on backup_encrypted.7z .\backups\planka_backup_20251006_120000.sql
   ```

3. **Регулярно проверяйте возможность восстановления**
   - Периодически тестируйте восстановление из бэкапа
   - Убедитесь что процесс работает корректно

4. **Ограничьте доступ к скриптам**
   - Только администраторы должны иметь доступ
   - Храните пароли от БД в безопасном месте

---

## Поддержка

При возникновении проблем:

1. Проверьте логи Docker: `docker-compose logs -f`
2. Проверьте статус: `.\scripts\check-status.ps1`
3. Создайте issue на GitHub с описанием проблемы

---

**Версия:** 1.0.0  
**Дата:** 2025-10-06  
**Автор:** Planka Extended Team
