#!/bin/bash
# Скрипт для создания резервной копии базы данных PostgreSQL (Linux/Ubuntu)

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Настройки
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="$SCRIPT_DIR/../backups"
BACKUP_FILE="planka_backup_${TIMESTAMP}.sql"

# Создаем директорию для бэкапов
if [ ! -d "$BACKUP_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
    echo -e "${GREEN}✓ Создана директория для бэкапов: $BACKUP_DIR${NC}"
fi

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║          Резервное копирование базы данных Planka          ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

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
echo -e "${YELLOW}Создание резервной копии...${NC}"
echo -e "${CYAN}Файл: $BACKUP_DIR/$BACKUP_FILE${NC}"
echo ""

# Создаем дамп базы данных
docker exec "$POSTGRES_CONTAINER" pg_dump -U postgres planka > "$BACKUP_DIR/$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Резервная копия успешно создана!${NC}"
    echo ""
    
    # Показываем размер файла
    FILE_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
    FILE_SIZE_MB=$(du -m "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
    
    echo -e "${CYAN}Информация о бэкапе:${NC}"
    echo "  Файл:    $BACKUP_FILE"
    echo "  Размер:  $FILE_SIZE ($FILE_SIZE_MB MB)"
    echo "  Путь:    $(readlink -f "$BACKUP_DIR/$BACKUP_FILE")"
    echo "  Создан:  $(date)"
    echo ""
    
    # Сжимаем бэкап
    echo -e "${YELLOW}Сжатие бэкапа...${NC}"
    gzip "$BACKUP_DIR/$BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        COMPRESSED_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE.gz" | cut -f1)
        echo -e "${GREEN}✓ Бэкап сжат: $COMPRESSED_SIZE${NC}"
        echo ""
    fi
    
    # Список всех бэкапов
    echo -e "${CYAN}Все доступные бэкапы:${NC}"
    echo ""
    ls -lh "$BACKUP_DIR"/planka_backup_*.sql.gz 2>/dev/null | awk '{print $9 "\t" $5 "\t" $6 " " $7 " " $8}' | column -t
    echo ""
    
    echo -e "${YELLOW}Для восстановления используйте:${NC}"
    echo "  ./scripts/restore-database.sh $BACKUP_DIR/$BACKUP_FILE.gz"
    echo ""
    
else
    echo ""
    echo -e "${RED}✗ Ошибка при создании резервной копии${NC}"
    echo ""
    exit 1
fi
