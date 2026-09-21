param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$BackupFile,

    [string]$TargetDatabase = "prospectordb",

    [switch]$Clean,

    [switch]$Force
)

$ErrorActionPreference = 'Stop'
$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

if (-not (Test-Path $BackupFile)) {
    throw "Arquivo de backup não encontrado: $BackupFile"
}

$fileItem = Get-Item $BackupFile
if ($fileItem.Length -eq 0) {
    throw "O arquivo de backup está vazio: $BackupFile"
}

Write-Host "Arquivo de backup selecionado: $($fileItem.FullName)"
Write-Host "Tamanho: $([math]::Round($fileItem.Length / 1KB, 2)) KB"
Write-Host "Banco de destino: $TargetDatabase"

if (-not $Force -and $TargetDatabase -eq "prospectordb") {
    $confirm = Read-Host "ATENÇÃO: A restauração sobrescreverá o banco local 'prospectordb'. Deseja continuar? (S/N)"
    if ($confirm -notmatch '^[sSyY]') {
        Write-Host "Operação de restauração cancelada pelo usuário."
        exit 0
    }
}

$containerRunning = docker ps --filter "name=birthhub_postgres" --filter "status=running" --format "{{.Names}}"
if (-not ($containerRunning -match 'birthhub_postgres')) {
    throw "Container Docker birthhub_postgres não está em execução."
}

if ($Clean) {
    Write-Host "Recriando banco limpo '$TargetDatabase'..."
    docker exec birthhub_postgres psql -U prospector -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$TargetDatabase' AND pid <> pg_backend_pid();" | Out-Null
    docker exec birthhub_postgres psql -U prospector -d postgres -c "DROP DATABASE IF EXISTS $TargetDatabase;" | Out-Null
    docker exec birthhub_postgres psql -U prospector -d postgres -c "CREATE DATABASE $TargetDatabase OWNER prospector;" | Out-Null
}

Write-Host "Restaurando banco de dados local '$TargetDatabase'..."

Get-Content $BackupFile -Raw | docker exec -i birthhub_postgres psql -v ON_ERROR_STOP=1 -U prospector -d $TargetDatabase
if ($LASTEXITCODE -ne 0) {
    throw "Falha durante o restore do PostgreSQL (exit code: $LASTEXITCODE)."
}

$stopwatch.Stop()
$durationSec = [math]::Round($stopwatch.Elapsed.TotalSeconds, 2)

Write-Host ""
Write-Host "✅ RESTAURAÇÃO LOCAL CONCLUÍDA COM SUCESSO" -ForegroundColor Green
Write-Host "Banco restaurado: $TargetDatabase"
Write-Host "Duração: $durationSec s"
Write-Host ""

