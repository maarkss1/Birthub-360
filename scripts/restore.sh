#!/bin/bash
set -e

# Carrega variáveis do .env se existir
if [ -f .env ]; then
  export $(cat .env | grep -v '#' | awk '/=/ {print $1}')
fi

if [ -z "$1" ]; then
  echo "Usage: $0 <backup_file.sql>"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "Restoring from $BACKUP_FILE..."

# Executa psql local ou via container birthhub_postgres se o binário local não existir
if command -v psql >/dev/null 2>&1; then
  PGPASSWORD=$POSTGRES_PASSWORD psql -h localhost -p ${POSTGRES_PORT:-5434} -U ${POSTGRES_USER:-prospector} -d ${POSTGRES_DB:-prospectordb} < "$BACKUP_FILE"
elif docker ps --format '{{.Names}}' | grep -q '^birthhub_postgres$'; then
  echo "psql local não encontrado. Executando via container birthhub_postgres..."
  docker exec -i birthhub_postgres psql -U ${POSTGRES_USER:-prospector} -d ${POSTGRES_DB:-prospectordb} < "$BACKUP_FILE"
else
  echo "Erro: psql não encontrado no PATH e container birthhub_postgres não está ativo."
  exit 1
fi

echo "Restore completed successfully from $BACKUP_FILE."
