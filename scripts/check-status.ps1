# Скрипт для проверки статуса Docker контейнеров Planka

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║              Статус контейнеров Planka                     ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Проверяем запущен ли Docker
$dockerRunning = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Docker не запущен или недоступен" -ForegroundColor Red
    Write-Host ""
    exit 1
}

Write-Host "Проверка контейнеров..." -ForegroundColor Yellow
Write-Host ""

# Получаем статус контейнеров
$containers = docker-compose ps

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Ошибка при получении статуса контейнеров" -ForegroundColor Red
    Write-Host "Убедитесь что вы находитесь в директории с docker-compose.yml" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host $containers
Write-Host ""

# Проверяем каждый контейнер отдельно
$dbContainer = docker-compose ps -q db 2>$null
$serverContainer = docker-compose ps -q server 2>$null

Write-Host "Детальная информация:" -ForegroundColor Cyan
Write-Host ""

if (![string]::IsNullOrEmpty($dbContainer)) {
    Write-Host "✓ База данных (PostgreSQL):" -ForegroundColor Green
    $dbStatus = docker inspect $dbContainer --format='{{.State.Status}}' 2>$null
    Write-Host "    Статус: $dbStatus" -ForegroundColor White
    
    if ($dbStatus -eq "running") {
        # Проверяем подключение к БД
        $dbCheck = docker exec $dbContainer pg_isready -U postgres 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "    База данных доступна" -ForegroundColor Green
        } else {
            Write-Host "    ⚠ База данных не отвечает" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "✗ База данных (PostgreSQL): не найдена" -ForegroundColor Red
}
Write-Host ""

if (![string]::IsNullOrEmpty($serverContainer)) {
    Write-Host "✓ Сервер приложения:" -ForegroundColor Green
    $serverStatus = docker inspect $serverContainer --format='{{.State.Status}}' 2>$null
    Write-Host "    Статус: $serverStatus" -ForegroundColor White
} else {
    Write-Host "✗ Сервер приложения: не найден" -ForegroundColor Red
}
Write-Host ""

# Показываем использование ресурсов
Write-Host "Использование ресурсов:" -ForegroundColor Cyan
Write-Host ""
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
Write-Host ""

# Показываем последние логи
Write-Host "Последние записи в логах (сервер):" -ForegroundColor Cyan
Write-Host ""
if (![string]::IsNullOrEmpty($serverContainer)) {
    docker logs --tail 10 $serverContainer 2>&1
} else {
    Write-Host "Контейнер сервера не найден" -ForegroundColor Yellow
}
Write-Host ""

# Полезные команды
Write-Host "Полезные команды:" -ForegroundColor Yellow
Write-Host "  Просмотр логов:      docker-compose logs -f" -ForegroundColor White
Write-Host "  Перезапуск:          docker-compose restart" -ForegroundColor White
Write-Host "  Остановка:           docker-compose down" -ForegroundColor White
Write-Host "  Запуск:              docker-compose up -d" -ForegroundColor White
Write-Host "  Пересборка:          docker-compose up --build -d" -ForegroundColor White
Write-Host ""
