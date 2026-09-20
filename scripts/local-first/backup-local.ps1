param(
    [string]$TargetDir = ""
)

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
if ([string]::IsNullOrWhiteSpace($TargetDir)) {
    $backupDir = Join-Path $repoRoot 'backups'
} else {
    $backupDir = $TargetDir
}
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$dumpFile = "prospectordb_local_$timestamp.sql"
$dumpPath = Join-Path $backupDir $dumpFile

Write-Host "Iniciando backup do PostgreSQL Local-First (Birth Hub 360°)..."

# Testa se o container Docker birthhub_postgres está ativo
$containerRunning = docker ps --filter "name=birthhub_postgres" --filter "status=running" --format "{{.Names}}"
if ($containerRunning -match 'birthhub_postgres') {
    Write-Host "Executando pg_dump via container birthhub_postgres..."
    docker exec birthhub_postgres pg_dump -U prospector -d prospectordb --clean --if-exists > $dumpPath
} elseif (Get-Command pg_dump -ErrorAction SilentlyContinue) {
    Write-Host "Executando pg_dump local..."
    & pg_dump -h localhost -p 5434 -U prospector -d prospectordb --clean --if-exists > $dumpPath
} else {
    throw "Nem o container birthhub_postgres está ativo, nem pg_dump está instalado no PATH local."
}

if (-not (Test-Path $dumpPath) -or (Get-Item $dumpPath).Length -eq 0) {
    throw "Falha ao gerar o arquivo de backup em $dumpPath."
}

$sizeKb = [math]::Round((Get-Item $dumpPath).Length / 1KB, 2)
$hash = (Get-FileHash -Algorithm SHA256 -Path $dumpPath).Hash

Write-Host ""
Write-Host "✅ BACKUP LOCAL CONCLUÍDO COM SUCESSO" -ForegroundColor Green
Write-Host "Arquivo: $dumpPath"
Write-Host "Tamanho: $sizeKb KB"
Write-Host "SHA-256: $hash"
Write-Host ""
