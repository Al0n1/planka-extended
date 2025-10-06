# Скрипт для восстановления базы данных из резервной копии (Windows)

param(
    [Parameter(Mandatory=$false)]
    [string]$BackupFile
)

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         Восстановление базы данных Planka                 ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Если файл не указан, показываем список доступных бэкапов
if ([string]::IsNullOrEmpty($BackupFile)) {
    Write-Host "Доступные резервные копии:" -ForegroundColor Yellow
    Write-Host ""
    
    $backups = Get-ChildItem ".\backups\planka_backup_*.sql" -ErrorAction SilentlyContinue | 
        Sort-Object CreationTime -Descending
    
    if ($backups.Count -eq 0) {
        Write-Host "✗ Резервные копии не найдены в директории .\backups\" -ForegroundColor Red
        Write-Host ""
        Write-Host "Создайте резервную копию с помощью:" -ForegroundColor Yellow
        Write-Host "  .\scripts\backup-database.ps1" -ForegroundColor White
        Write-Host ""
        exit 1
    }
    
    for ($i = 0; $i -lt $backups.Count; $i++) {
        $backup = $backups[$i]
        $sizeMB = [math]::Round($backup.Length / 1MB, 2)
        Write-Host "  [$($i+1)] $($backup.Name)" -ForegroundColor White
        Write-Host "      Размер: $sizeMB MB | Создан: $($backup.CreationTime)" -ForegroundColor Gray
        Write-Host ""
    }
    
    Write-Host "Использование:" -ForegroundColor Yellow
    Write-Host "  .\scripts\restore-database.ps1 <путь_к_файлу>" -ForegroundColor White
    Write-Host ""
    Write-Host "Пример:" -ForegroundColor Yellow
    Write-Host "  .\scripts\restore-database.ps1 .\backups\planka_backup_20251006_120000.sql" -ForegroundColor White
    Write-Host ""
    exit 0
}

# Проверяем существование файла
if (-not (Test-Path $BackupFile)) {
    Write-Host "✗ Ошибка: Файл '$BackupFile' не найден" -ForegroundColor Red
    Write-Host ""
    exit 1
}

$backupInfo = Get-Item $BackupFile
$backupSizeMB = [math]::Round($backupInfo.Length / 1MB, 2)

# Получаем имя контейнера PostgreSQL
Write-Host "Поиск контейнера PostgreSQL..." -ForegroundColor Yellow
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

# Предупреждение
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Red
Write-Host "║                         ВНИМАНИЕ!                          ║" -ForegroundColor Red
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Red
Write-Host ""
Write-Host "Это действие:" -ForegroundColor Yellow
Write-Host "  • Удалит все текущие данные в базе данных" -ForegroundColor Yellow
Write-Host "  • Восстановит данные из резервной копии" -ForegroundColor Yellow
Write-Host "  • Перезапустит приложение" -ForegroundColor Yellow
Write-Host ""
Write-Host "Файл бэкапа:" -ForegroundColor Cyan
Write-Host "  Файл:    $($backupInfo.Name)" -ForegroundColor White
Write-Host "  Размер:  $backupSizeMB MB" -ForegroundColor White
Write-Host "  Создан:  $($backupInfo.CreationTime)" -ForegroundColor White
Write-Host ""

# Запрашиваем подтверждение
$confirmation = Read-Host "Продолжить восстановление? (yes/no)"

if ($confirmation -ne "yes") {
    Write-Host ""
    Write-Host "Операция отменена" -ForegroundColor Yellow
    Write-Host ""
    exit 0
}

Write-Host ""
Write-Host "Начинаем процесс восстановления..." -ForegroundColor Yellow
Write-Host ""

# Останавливаем сервер приложения
Write-Host "[1/5] Останавливаем сервер приложения..." -ForegroundColor Cyan
docker-compose stop server 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Сервер остановлен" -ForegroundColor Green
} else {
    Write-Host "⚠ Предупреждение: Не удалось остановить сервер" -ForegroundColor Yellow
}
Write-Host ""

# Удаляем существующую базу данных
Write-Host "[2/5] Удаляем существующую базу данных..." -ForegroundColor Cyan
$dropDb = docker exec $postgresContainer psql -U postgres -c "DROP DATABASE IF EXISTS planka;" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ База данных удалена" -ForegroundColor Green
} else {
    Write-Host "✗ Ошибка при удалении базы данных" -ForegroundColor Red
    Write-Host $dropDb -ForegroundColor Red
    exit 1
}
Write-Host ""

# Создаем новую базу данных
Write-Host "[3/5] Создаем новую базу данных..." -ForegroundColor Cyan
$createDb = docker exec $postgresContainer psql -U postgres -c "CREATE DATABASE planka;" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ База данных создана" -ForegroundColor Green
} else {
    Write-Host "✗ Ошибка при создании базы данных" -ForegroundColor Red
    Write-Host $createDb -ForegroundColor Red
    exit 1
}
Write-Host ""

# Восстанавливаем данные из бэкапа
Write-Host "[4/5] Восстанавливаем данные из бэкапа..." -ForegroundColor Cyan
Write-Host "    (это может занять несколько минут)" -ForegroundColor Gray

$restore = Get-Content $BackupFile | docker exec -i $postgresContainer psql -U postgres -d planka 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Данные успешно восстановлены" -ForegroundColor Green
} else {
    Write-Host "✗ Ошибка при восстановлении данных" -ForegroundColor Red
    Write-Host "Последние строки вывода:" -ForegroundColor Yellow
    $restore | Select-Object -Last 20 | ForEach-Object { Write-Host $_ -ForegroundColor Red }
    Write-Host ""
    Write-Host "База данных может быть в нестабильном состоянии!" -ForegroundColor Red
    Write-Host "Рекомендуется повторить восстановление" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Запускаем приложение
Write-Host "[5/5] Запускаем приложение..." -ForegroundColor Cyan
docker-compose up -d 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Приложение запущено" -ForegroundColor Green
} else {
    Write-Host "⚠ Предупреждение: Проблема при запуске приложения" -ForegroundColor Yellow
    Write-Host "Попробуйте запустить вручную: docker-compose up -d" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║         База данных успешно восстановлена!                ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Host "Проверьте работу приложения:" -ForegroundColor Yellow
Write-Host "  1. Откройте Planka в браузере" -ForegroundColor White
Write-Host "  2. Войдите в систему" -ForegroundColor White
Write-Host "  3. Проверьте что данные восстановлены" -ForegroundColor White
Write-Host ""

Write-Host "Для просмотра логов используйте:" -ForegroundColor Yellow
Write-Host "  docker-compose logs -f" -ForegroundColor White
Write-Host ""
