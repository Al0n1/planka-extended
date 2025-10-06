#!/bin/bash
# Скрипт для просмотра структуры базы данных

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

TABLE="$1"

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║           Структура базы данных Planka                    ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Получаем контейнер PostgreSQL
POSTGRES_CONTAINER=$(docker-compose ps -q db 2>/dev/null)

if [ -z "$POSTGRES_CONTAINER" ]; then
    echo -e "${RED}✗ PostgreSQL контейнер не найден${NC}"
    echo ""
    exit 1
fi

if [ -z "$TABLE" ]; then
    # Показываем список всех таблиц
    echo -e "${YELLOW}Список таблиц в базе данных:${NC}"
    echo ""
    
    QUERY="SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"
    docker exec "$POSTGRES_CONTAINER" psql -U postgres -d planka -c "$QUERY"
    
    echo ""
    echo -e "${YELLOW}Для просмотра структуры конкретной таблицы:${NC}"
    echo "  ./scripts/view-database.sh <имя_таблицы>"
    echo ""
    echo -e "${YELLOW}Примеры:${NC}"
    echo "  ./scripts/view-database.sh custom_field"
    echo "  ./scripts/view-database.sh custom_field_value"
    echo ""
    
else
    # Показываем структуру конкретной таблицы
    echo -e "${YELLOW}Структура таблицы '$TABLE':${NC}"
    echo ""
    
    docker exec "$POSTGRES_CONTAINER" psql -U postgres -d planka -c "\\d $TABLE"
    
    echo ""
    echo -e "${YELLOW}Количество записей:${NC}"
    COUNT_QUERY="SELECT COUNT(*) as count FROM $TABLE;"
    docker exec "$POSTGRES_CONTAINER" psql -U postgres -d planka -c "$COUNT_QUERY"
    
    echo ""
    echo -e "${YELLOW}Первые 5 записей:${NC}"
    SELECT_QUERY="SELECT * FROM $TABLE LIMIT 5;"
    docker exec "$POSTGRES_CONTAINER" psql -U postgres -d planka -c "$SELECT_QUERY"
    
    echo ""
fi
