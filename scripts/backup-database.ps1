# Скрипт для создания резервной копии базы данных PostgreSQL (Windows)

# Настройки
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = ".\backups"
$backupFile = "planka_backup_$timestamp.sql"

# Создаем директорию для бэкапов
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
    Write-Host "✓ Создана директория для бэкапов: $backupDir" -ForegroundColor Green
}

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          Резервное копирование базы данных Planka         ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "Поиск контейнера PostgreSQL..." -ForegroundColor Yellow

# Получаем имя контейнера PostgreSQL
$postgresContainer = docker-compose ps -q db 2>$null

if ([string]::IsNullOrEmpty($postgresContainer)) {
    Write-Host ""
    Write-Host "✗ Ошибка: PostgreSQL контейнер не найден" -ForegroundColor Red
    Write-Host ""
    Write-Host "Убедитесь что:" -ForegroundColor Yellow
    Write-Host "  1. Docker запущен" -ForegroundColor Yellow
    Write-Host "  2. Вы находитесь в директории с docker-compose.yml" -ForegroundColor Yellow
    Write-Host "  3. Контейнеры запущены (docker-compose up -d)" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "✓ Контейнер найден: $postgresContainer" -ForegroundColor Green
Write-Host ""
Write-Host "Создание резервной копии..." -ForegroundColor Yellow
Write-Host "Файл: $backupDir\$backupFile" -ForegroundColor Cyan
Write-Host ""

# Создаем дамп базы данных
$output = docker exec $postgresContainer pg_dump -U postgres planka 2>&1

if ($LASTEXITCODE -eq 0) {
    # Сохраняем в файл
    $output | Out-File -FilePath "$backupDir\$backupFile" -Encoding UTF8
    
    Write-Host "✓ Резервная копия успешно создана!" -ForegroundColor Green
    Write-Host ""
    
    # Показываем размер файла
    $fileInfo = Get-Item "$backupDir\$backupFile"
    $fileSizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
    
    Write-Host "Информация о бэкапе:" -ForegroundColor Cyan
    Write-Host "  Файл:    $($fileInfo.Name)" -ForegroundColor White
    Write-Host "  Размер:  $fileSizeMB MB" -ForegroundColor White
    Write-Host "  Путь:    $($fileInfo.FullName)" -ForegroundColor White
    Write-Host "  Создан:  $($fileInfo.CreationTime)" -ForegroundColor White
    Write-Host ""
    
    # Список всех бэкапов
    Write-Host "Все доступные бэкапы:" -ForegroundColor Cyan
    Get-ChildItem "$backupDir\planka_backup_*.sql" | 
        Sort-Object CreationTime -Descending | 
        Select-Object Name, @{Name="Size(MB)";Expression={[math]::Round($_.Length/1MB, 2)}}, CreationTime |
        Format-Table -AutoSize
    
    Write-Host "Для восстановления используйте:" -ForegroundColor Yellow
    Write-Host "  .\scripts\restore-database.ps1 '$backupDir\$backupFile'" -ForegroundColor White
    Write-Host ""
    
} else {
    Write-Host ""
    Write-Host "✗ Ошибка при создании резервной копии" -ForegroundColor Red
    Write-Host ""
    Write-Host "Вывод ошибки:" -ForegroundColor Yellow
    Write-Host $output -ForegroundColor Red
    Write-Host ""
    exit 1
}
