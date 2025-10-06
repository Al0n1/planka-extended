# Скрипт для просмотра структуры базы данных

param(
    [Parameter(Mandatory=$false)]
    [string]$Table
)

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║           Структура базы данных Planka                    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Получаем контейнер PostgreSQL
$postgresContainer = docker-compose ps -q db 2>$null

if ([string]::IsNullOrEmpty($postgresContainer)) {
    Write-Host "✗ PostgreSQL контейнер не найден" -ForegroundColor Red
    Write-Host ""
    exit 1
}

if ([string]::IsNullOrEmpty($Table)) {
    # Показываем список всех таблиц
    Write-Host "Список таблиц в базе данных:" -ForegroundColor Yellow
    Write-Host ""
    
    $query = "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"
    docker exec $postgresContainer psql -U postgres -d planka -c $query
    
    Write-Host ""
    Write-Host "Для просмотра структуры конкретной таблицы:" -ForegroundColor Yellow
    Write-Host "  .\scripts\view-database.ps1 <имя_таблицы>" -ForegroundColor White
    Write-Host ""
    Write-Host "Примеры:" -ForegroundColor Yellow
    Write-Host "  .\scripts\view-database.ps1 custom_field" -ForegroundColor White
    Write-Host "  .\scripts\view-database.ps1 custom_field_value" -ForegroundColor White
    Write-Host ""
    
} else {
    # Показываем структуру конкретной таблицы
    Write-Host "Структура таблицы '$Table':" -ForegroundColor Yellow
    Write-Host ""
    
    docker exec $postgresContainer psql -U postgres -d planka -c "\d $Table"
    
    Write-Host ""
    Write-Host "Количество записей:" -ForegroundColor Yellow
    $countQuery = "SELECT COUNT(*) as count FROM $Table;"
    docker exec $postgresContainer psql -U postgres -d planka -c $countQuery
    
    Write-Host ""
    Write-Host "Первые 5 записей:" -ForegroundColor Yellow
    $selectQuery = "SELECT * FROM $Table LIMIT 5;"
    docker exec $postgresContainer psql -U postgres -d planka -c $selectQuery
    
    Write-Host ""
}
