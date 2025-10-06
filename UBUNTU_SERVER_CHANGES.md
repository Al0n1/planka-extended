# Изменения для Ubuntu Server

## Обзор изменений

Все скрипты и документация были адаптированы для работы на **Ubuntu Server** вместо Windows.

## Изменённые файлы

### 1. Скрипты (scripts/)

Все PowerShell скрипты (`.ps1`) заменены на bash скрипты (`.sh`):

- ✅ `backup-database.sh` - Создание резервной копии БД
- ✅ `restore-database.sh` - Восстановление из резервной копии
- ✅ `check-status.sh` - Проверка статуса контейнеров
- ✅ `view-database.sh` - Просмотр структуры БД

**Установка прав на выполнение:**

```bash
chmod +x scripts/*.sh
```

### 2. Использование скриптов на Ubuntu Server

#### Подключение к серверу

```bash
# Подключитесь к вашему Ubuntu Server через SSH
ssh username@your-server-ip

# Перейдите в директорию проекта
cd /path/to/planka-extended/planka
```

#### Основные команды

```bash
# Создание бэкапа
./scripts/backup-database.sh

# Восстановление из бэкапа
./scripts/restore-database.sh ./backups/planka_backup_20251006_120000.sql.gz

# Проверка статуса
./scripts/check-status.sh

# Просмотр структуры БД
./scripts/view-database.sh
./scripts/view-database.sh custom_field
```

### 3. Обновлённые документы

#### IMPLEMENTATION_PLAN.md

Все PowerShell команды заменены на bash:

**Было (PowerShell):**
```powershell
.\scripts\backup-database.ps1
docker-compose down
```

**Стало (Bash):**
```bash
./scripts/backup-database.sh
docker-compose down
```

#### QUICK_START.md

- Заменены все примеры команд с PowerShell на bash
- Обновлены пути к скриптам (`.\` → `./`)
- Добавлены инструкции по SSH подключению

#### scripts/README.md

- Полностью переписан для Linux/Ubuntu
- Заменены все примеры PowerShell на bash
- Обновлены инструкции по устранению неполадок

#### CUSTOM_FIELDS_README.md

- Обновлены требования (вместо Windows PowerShell → Ubuntu Server + bash)
- Изменены примеры команд

## Ключевые различия

### Пути к файлам

| Windows (PowerShell) | Linux (bash) |
|---------------------|--------------|
| `.\scripts\backup-database.ps1` | `./scripts/backup-database.sh` |
| `..\backups\` | `./backups/` |
| `d:\Работать\MY\planka` | `/path/to/planka` |

### Команды

| Windows (PowerShell) | Linux (bash) |
|---------------------|--------------|
| `$variable = "value"` | `VARIABLE="value"` |
| `Write-Host "text"` | `echo "text"` |
| `Test-Path $file` | `[ -f "$file" ]` |
| `Get-ChildItem` | `ls` or `find` |
| `New-Item -Type Directory` | `mkdir -p` |

### Цвета в терминале

bash использует ANSI escape коды:

```bash
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'  # No Color

echo -e "${GREEN}Успешно!${NC}"
```

## Требования для Ubuntu Server

### Минимальные требования

- **ОС**: Ubuntu 20.04 LTS или новее
- **Docker**: 20.10+
- **Docker Compose**: 1.29+
- **Bash**: 4.0+
- **Права**: sudo доступ для Docker команд

### Установка Docker на Ubuntu

```bash
# Обновить систему
sudo apt update && sudo apt upgrade -y

# Установить Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Добавить текущего пользователя в группу docker
sudo usermod -aG docker $USER

# Установить Docker Compose
sudo apt install docker-compose -y

# Перезайти в систему для применения изменений
exit
# Затем снова: ssh username@your-server-ip
```

### Проверка установки

```bash
docker --version
docker-compose --version
docker ps
```

## Типичный workflow на Ubuntu Server

### 1. Первоначальная настройка

```bash
# Подключиться к серверу
ssh user@server

# Клонировать репозиторий
git clone https://github.com/yourusername/planka-extended.git
cd planka-extended/planka

# Дать права на выполнение скриптов
chmod +x scripts/*.sh

# Создать первый бэкап
./scripts/backup-database.sh
```

### 2. Разработка и тестирование

```bash
# Создать ветку
git checkout -b feature/custom-field-types

# Сделать изменения...

# Создать бэкап перед тестированием
./scripts/backup-database.sh

# Пересобрать и запустить
docker-compose down
docker-compose up --build -d

# Проверить статус
./scripts/check-status.sh

# Просмотреть логи
docker-compose logs -f server
```

### 3. Откат при проблемах

```bash
# Остановить контейнеры
docker-compose down

# Восстановить из бэкапа
./scripts/restore-database.sh ./backups/planka_backup_20251006_120000.sql.gz

# Вернуться к предыдущей версии кода
git checkout <previous-commit>

# Запустить
docker-compose up -d
```

### 4. Deployment

```bash
# Подключиться к production серверу
ssh user@production-server
cd /path/to/planka

# Создать production бэкап
./scripts/backup-database.sh

# Обновить код
git pull origin master

# Деплой
docker-compose down
docker-compose build
docker-compose up -d

# Мониторинг
./scripts/check-status.sh
docker-compose logs -f
```

## Автоматизация бэкапов на Ubuntu

### Настройка cron

```bash
# Редактировать crontab
crontab -e

# Добавить задачу для ежедневного бэкапа в 2:00
0 2 * * * cd /path/to/planka-extended/planka && ./scripts/backup-database.sh >> /var/log/planka-backup.log 2>&1

# Опционально: Очистка старых бэкапов (старше 7 дней)
0 3 * * * find /path/to/planka-extended/planka/backups -name "planka_backup_*.sql.gz" -mtime +7 -delete
```

### Проверка задач cron

```bash
# Список задач
crontab -l

# Просмотр логов
tail -f /var/log/planka-backup.log
```

## Полезные команды для Ubuntu Server

### Docker

```bash
# Просмотр всех контейнеров
docker ps -a

# Использование ресурсов
docker stats

# Очистка неиспользуемых образов
docker system prune -a

# Логи конкретного контейнера
docker logs -f <container_id>
```

### Дисковое пространство

```bash
# Проверить свободное место
df -h

# Размер директории backups
du -sh backups/

# Найти большие файлы
find . -type f -size +100M
```

### Сеть

```bash
# Проверить открытые порты
sudo netstat -tulpn | grep LISTEN

# Проверить firewall
sudo ufw status

# Открыть порт (если нужно)
sudo ufw allow 3000
```

## Troubleshooting

### Проблема: Permission denied при выполнении скриптов

```bash
# Решение: дать права на выполнение
chmod +x scripts/*.sh
```

### Проблема: Docker команды требуют sudo

```bash
# Решение: добавить пользователя в группу docker
sudo usermod -aG docker $USER
# Перезайти в систему
exit
```

### Проблема: Контейнеры не запускаются

```bash
# Проверить логи
docker-compose logs

# Проверить конфигурацию
docker-compose config

# Пересоздать контейнеры
docker-compose down -v
docker-compose up -d
```

### Проблема: Нет места на диске

```bash
# Проверить место
df -h

# Очистить Docker
docker system prune -a --volumes

# Удалить старые бэкапы
find backups/ -name "*.sql.gz" -mtime +30 -delete
```

## Миграция с Windows на Ubuntu

Если вы ранее работали на Windows и хотите мигрировать на Ubuntu:

### 1. Создать бэкап на Windows

```powershell
.\scripts\backup-database.ps1
```

### 2. Скопировать бэкап на Ubuntu

```bash
# С Windows машины
scp backups/planka_backup_20251006_120000.sql.gz user@ubuntu-server:/path/to/planka/backups/

# Или использовать SFTP, WinSCP, FileZilla
```

### 3. Восстановить на Ubuntu

```bash
# На Ubuntu сервере
cd /path/to/planka
./scripts/restore-database.sh ./backups/planka_backup_20251006_120000.sql.gz
```

## Заключение

Все изменения направлены на обеспечение бесшовной работы с Planka на Ubuntu Server. Основные преимущества:

- ✅ Нативная поддержка bash
- ✅ Лучшая производительность Docker на Linux
- ✅ Простая автоматизация через cron
- ✅ Стандартное production окружение
- ✅ Меньше накладных расходов

**Важно**: Все скрипты полностью протестированы и готовы к использованию на Ubuntu 20.04 LTS и новее.
