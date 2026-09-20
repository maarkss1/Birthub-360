#!/bin/bash
set -e

# Carrega variáveis do .env se existir
if [ -f .env ]; then
  export $(cat .env | grep -v '#' | awk '/=/ {print $1}')
fi

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="$BACKUP_DIR/prospectordb_backup_$TIMESTAMP.sql"

mkdir -p "$BACKUP_DIR"

echo "Creating backup at $FILENAME..."

# Executa pg_dump local ou via container birthhub_postgres se o binário local não existir
if command -v pg_dump >/dev/null 2>&1; then
  PGPASSWORD=$POSTGRES_PASSWORD pg_dump -h localhost -p ${POSTGRES_PORT:-5434} -U ${POSTGRES_USER:-prospector} ${POSTGRES_DB:-prospectordb} --clean --if-exists --no-owner --no-privileges > "$FILENAME"
elif docker ps --format '{{.Names}}' | grep -q '^birthhub_postgres$'; then
  echo "pg_dump local não encontrado. Executando via container birthhub_postgres..."
  docker exec birthhub_postgres pg_dump -U ${POSTGRES_USER:-prospector} -d ${POSTGRES_DB:-prospectordb} --clean --if-exists --no-owner --no-privileges > "$FILENAME"
else
  echo "Erro: pg_dump não encontrado no PATH e container birthhub_postgres não está ativo."
  exit 1
fi

echo "Backup completed successfully at $FILENAME."

# Política de retenção >= 14 dias
echo "Aplicando política de retenção (>= 14 dias)..."
find "$BACKUP_DIR" -name "*.sql" -type f -mtime +14 -exec rm -f {} + 2>/dev/null || true
echo "Retenção concluída."
