#!/bin/bash
# Скрипт для восстановления базы данных из резервной копии (Linux/Ubuntu)

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

BACKUP_FILE="$1"

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║         Восстановление базы данных Planka                 ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Если файл не указан, показываем список доступных бэкапов
if [ -z "$BACKUP_FILE" ]; then
    echo -e "${YELLOW}Доступные резервные копии:${NC}"
    echo ""
    
    BACKUPS=(./backups/planka_backup_*.sql.gz)
    
    if [ ! -e "${BACKUPS[0]}" ]; then
        echo -e "${RED}✗ Резервные копии не найдены в директории ./backups/${NC}"
        echo ""
        echo -e "${YELLOW}Создайте резервную копию с помощью:${NC}"
        echo "  ./scripts/backup-database.sh"
        echo ""
        exit 1
    fi
    
    i=1
    for backup in ./backups/planka_backup_*.sql.gz; do
        if [ -f "$backup" ]; then
            SIZE=$(du -h "$backup" | cut -f1)
            DATE=$(stat -c %y "$backup" | cut -d' ' -f1,2 | cut -d'.' -f1)
            echo "  [$i] $(basename "$backup")"
            echo "      Размер: $SIZE | Создан: $DATE"
            echo ""
            ((i++))
        fi
    done
    
    echo -e "${YELLOW}Использование:${NC}"
    echo "  ./scripts/restore-database.sh <путь_к_файлу>"
    echo ""
    echo -e "${YELLOW}Пример:${NC}"
    echo "  ./scripts/restore-database.sh ./backups/planka_backup_20251006_120000.sql.gz"
    echo ""
    exit 0
fi

# Проверяем существование файла
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}✗ Ошибка: Файл '$BACKUP_FILE' не найден${NC}"
    echo ""
    exit 1
fi

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

# Получаем имя контейнера PostgreSQL
echo -e "${YELLOW}Поиск контейнера PostgreSQL...${NC}"

# Ищем контейнер PostgreSQL по имени или образу
POSTGRES_CONTAINER=$(docker ps --filter "ancestor=postgres:16-alpine" --format "{{.ID}}" | head -n 1)

# Если не нашли по образу, попробуем по имени
if [ -z "$POSTGRES_CONTAINER" ]; then
    POSTGRES_CONTAINER=$(docker ps --filter "name=postgres" --format "{{.ID}}" | head -n 1)
fi

# Если всё ещё не нашли, попробуем по имени planka-postgres
if [ -z "$POSTGRES_CONTAINER" ]; then
    POSTGRES_CONTAINER=$(docker ps --filter "name=planka-postgres" --format "{{.ID}}" | head -n 1)
fi

if [ -z "$POSTGRES_CONTAINER" ]; then
    echo ""
    echo -e "${RED}✗ Ошибка: PostgreSQL контейнер не найден${NC}"
    echo ""
    echo -e "${YELLOW}Убедитесь что:${NC}"
    echo -e "${YELLOW}  1. Docker запущен${NC}"
    echo -e "${YELLOW}  2. Контейнеры Planka запущены${NC}"
    echo ""
    echo -e "${CYAN}Доступные контейнеры:${NC}"
    docker ps --format "table {{.ID}}\t{{.Image}}\t{{.Names}}"
    echo ""
    exit 1
fi

# Получаем имя контейнера для отображения
CONTAINER_NAME=$(docker ps --filter "id=$POSTGRES_CONTAINER" --format "{{.Names}}")

echo -e "${GREEN}✓ Контейнер найден: $CONTAINER_NAME ($POSTGRES_CONTAINER)${NC}"
echo ""

# Предупреждение
echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║                         ВНИМАНИЕ!                          ║${NC}"
echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Это действие:${NC}"
echo "  • Удалит все текущие данные в базе данных"
echo "  • Восстановит данные из резервной копии"
echo "  • Перезапустит приложение"
echo ""
echo -e "${CYAN}Файл бэкапа:${NC}"
echo "  Файл:    $(basename "$BACKUP_FILE")"
echo "  Размер:  $BACKUP_SIZE"
echo "  Создан:  $(stat -c %y "$BACKUP_FILE" | cut -d' ' -f1,2 | cut -d'.' -f1)"
echo ""

# Запрашиваем подтверждение
read -p "Продолжить восстановление? (yes/no): " confirmation

if [ "$confirmation" != "yes" ]; then
    echo ""
    echo -e "${YELLOW}Операция отменена${NC}"
    echo ""
    exit 0
fi

echo ""
echo -e "${YELLOW}Начинаем процесс восстановления...${NC}"
echo ""

# Останавливаем сервер приложения
echo -e "${CYAN}[1/5] Останавливаем сервер приложения...${NC}"

# Ищем контейнер Planka (сервер)
PLANKA_CONTAINER=$(docker ps --filter "ancestor=ghcr.io/plankanban/planka" --format "{{.ID}}" | head -n 1)
if [ -z "$PLANKA_CONTAINER" ]; then
    PLANKA_CONTAINER=$(docker ps --filter "name=planka" --format "{{.ID}}" | head -n 1)
fi

if [ -n "$PLANKA_CONTAINER" ]; then
    docker stop "$PLANKA_CONTAINER" >/dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Сервер остановлен${NC}"
    else
        echo -e "${YELLOW}⚠ Предупреждение: Не удалось остановить сервер${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Сервер приложения не найден (возможно уже остановлен)${NC}"
fi
echo ""

# Удаляем существующую базу данных
echo -e "${CYAN}[2/5] Удаляем существующую базу данных...${NC}"
docker exec "$POSTGRES_CONTAINER" psql -U postgres -c "DROP DATABASE IF EXISTS planka;" >/dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ База данных удалена${NC}"
else
    echo -e "${RED}✗ Ошибка при удалении базы данных${NC}"
    exit 1
fi
echo ""

# Создаем новую базу данных
echo -e "${CYAN}[3/5] Создаем новую базу данных...${NC}"
docker exec "$POSTGRES_CONTAINER" psql -U postgres -c "CREATE DATABASE planka;" >/dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ База данных создана${NC}"
else
    echo -e "${RED}✗ Ошибка при создании базы данных${NC}"
    exit 1
fi
echo ""

# Восстанавливаем данные из бэкапа
echo -e "${CYAN}[4/5] Восстанавливаем данные из бэкапа...${NC}"
echo "    (это может занять несколько минут)"

# Проверяем, сжат файл или нет
if [[ "$BACKUP_FILE" == *.gz ]]; then
    gunzip -c "$BACKUP_FILE" | docker exec -i "$POSTGRES_CONTAINER" psql -U postgres -d planka >/dev/null 2>&1
else
    cat "$BACKUP_FILE" | docker exec -i "$POSTGRES_CONTAINER" psql -U postgres -d planka >/dev/null 2>&1
fi

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Данные успешно восстановлены${NC}"
else
    echo -e "${RED}✗ Ошибка при восстановлении данных${NC}"
    echo ""
    echo -e "${RED}База данных может быть в нестабильном состоянии!${NC}"
    echo -e "${YELLOW}Рекомендуется повторить восстановление${NC}"
    exit 1
fi
echo ""

# Запускаем приложение
echo -e "${CYAN}[5/5] Запускаем приложение...${NC}"

if [ -n "$PLANKA_CONTAINER" ]; then
    docker start "$PLANKA_CONTAINER" >/dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Приложение запущено${NC}"
    else
        echo -e "${YELLOW}⚠ Предупреждение: Проблема при запуске приложения${NC}"
        echo -e "${YELLOW}Попробуйте запустить вручную: docker start $PLANKA_CONTAINER${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Контейнер приложения не найден. Возможно нужно запустить через docker-compose.${NC}"
fi
echo ""

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         База данных успешно восстановлена!                ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}Проверьте работу приложения:${NC}"
echo "  1. Откройте Planka в браузере"
echo "  2. Войдите в систему"
echo "  3. Проверьте что данные восстановлены"
echo ""

echo -e "${YELLOW}Для просмотра логов используйте:${NC}"
echo "  docker logs -f <container_name>"
echo "  или: docker logs -f $CONTAINER_NAME"
echo ""
