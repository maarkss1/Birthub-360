param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$BackupFile,

    [switch]$Force
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $BackupFile)) {
    throw "Arquivo de backup não encontrado: $BackupFile"
}

$fileItem = Get-Item $BackupFile
if ($fileItem.Length -eq 0) {
    throw "O arquivo de backup está vazio: $BackupFile"
}

Write-Host "Arquivo de backup selecionado: $($fileItem.FullName)"
Write-Host "Tamanho: $([math]::Round($fileItem.Length / 1KB, 2)) KB"

if (-not $Force) {
    $confirm = Read-Host "ATENÇÃO: A restauração sobrescreverá o banco local 'prospectordb'. Deseja continuar? (S/N)"
    if ($confirm -notmatch '^[sSyY]') {
        Write-Host "Operação de restauração cancelada pelo usuário."
        exit 0
    }
}

Write-Host "Restaurando banco de dados local prospectordb..."

$containerRunning = docker ps --filter "name=birthhub_postgres" --filter "status=running" --format "{{.Names}}"
if ($containerRunning -match 'birthhub_postgres') {
    Write-Host "Executando restauração via container Docker birthhub_postgres..."
    Get-Content $BackupFile -Raw | docker exec -i birthhub_postgres psql -U prospector -d prospectordb
} elseif (Get-Command psql -ErrorAction SilentlyContinue) {
    Write-Host "Executando psql local..."
    Get-Content $BackupFile -Raw | & psql -h localhost -p 5434 -U prospector -d prospectordb
} else {
    throw "Nem o container birthhub_postgres está ativo, nem psql está instalado no PATH local."
}

Write-Host ""
Write-Host "✅ RESTAURAÇÃO LOCAL CONCLUÍDA COM SUCESSO" -ForegroundColor Green
Write-Host ""
