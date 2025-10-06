#!/bin/bash
# Скрипт для проверки статуса Docker контейнеров Planka

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║              Статус контейнеров Planka                     ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Проверяем запущен ли Docker
if ! docker ps >/dev/null 2>&1; then
    echo -e "${RED}✗ Docker не запущен или недоступен${NC}"
    echo ""
    exit 1
fi

echo -e "${YELLOW}Проверка контейнеров...${NC}"
echo ""

# Получаем статус контейнеров
if ! docker-compose ps 2>/dev/null; then
    echo -e "${RED}✗ Ошибка при получении статуса контейнеров${NC}"
    echo "Убедитесь что вы находитесь в директории с docker-compose.yml"
    echo ""
    exit 1
fi

echo ""

# Проверяем каждый контейнер отдельно
DB_CONTAINER=$(docker-compose ps -q db 2>/dev/null)
SERVER_CONTAINER=$(docker-compose ps -q server 2>/dev/null)

echo -e "${CYAN}Детальная информация:${NC}"
echo ""

if [ -n "$DB_CONTAINER" ]; then
    echo -e "${GREEN}✓ База данных (PostgreSQL):${NC}"
    DB_STATUS=$(docker inspect "$DB_CONTAINER" --format='{{.State.Status}}' 2>/dev/null)
    echo "    Статус: $DB_STATUS"
    
    if [ "$DB_STATUS" = "running" ]; then
        # Проверяем подключение к БД
        if docker exec "$DB_CONTAINER" pg_isready -U postgres >/dev/null 2>&1; then
            echo -e "    ${GREEN}База данных доступна${NC}"
        else
            echo -e "    ${YELLOW}⚠ База данных не отвечает${NC}"
        fi
    fi
else
    echo -e "${RED}✗ База данных (PostgreSQL): не найдена${NC}"
fi
echo ""

if [ -n "$SERVER_CONTAINER" ]; then
    echo -e "${GREEN}✓ Сервер приложения:${NC}"
    SERVER_STATUS=$(docker inspect "$SERVER_CONTAINER" --format='{{.State.Status}}' 2>/dev/null)
    echo "    Статус: $SERVER_STATUS"
else
    echo -e "${RED}✗ Сервер приложения: не найден${NC}"
fi
echo ""

# Показываем использование ресурсов
echo -e "${CYAN}Использование ресурсов:${NC}"
echo ""
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
echo ""

# Показываем последние логи
echo -e "${CYAN}Последние записи в логах (сервер):${NC}"
echo ""
if [ -n "$SERVER_CONTAINER" ]; then
    docker logs --tail 10 "$SERVER_CONTAINER" 2>&1
else
    echo "Контейнер сервера не найден"
fi
echo ""

# Полезные команды
echo -e "${YELLOW}Полезные команды:${NC}"
echo "  Просмотр логов:      docker-compose logs -f"
echo "  Перезапуск:          docker-compose restart"
echo "  Остановка:           docker-compose down"
echo "  Запуск:              docker-compose up -d"
echo "  Пересборка:          docker-compose up --build -d"
echo ""
