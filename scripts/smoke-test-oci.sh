#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Smoke Test / Health Check Gate - Birth Hub 360º
# Valida endpoints /health/live e /health/ready com retries controlados.
#
# REGRA SUPREMA:
# NO SMOKE PASS = NO DEPLOY SUCCESS
# ==============================================================================

TARGET_URL="${TARGET_URL:-http://127.0.0.1:3000}"
MAX_RETRIES="${MAX_RETRIES:-12}"
RETRY_INTERVAL="${RETRY_INTERVAL:-5}"

echo "========================================================"
echo "🩺 Executando Smoke Gate de Produção"
echo "Target URL:     ${TARGET_URL}"
echo "Max Retries:    ${MAX_RETRIES}"
echo "Retry Interval: ${RETRY_INTERVAL}s"
echo "========================================================"

HEALTH_LIVE_STATUS="FAIL"
HEALTH_READY_STATUS="FAIL"
SMOKE_TEST_STATUS="FAIL"

check_endpoint() {
    local name="$1"
    local endpoint="$2"
    local url="${TARGET_URL}${endpoint}"
    local attempt=1
    local success=0

    echo "== Testando ${name} (${endpoint}) =="

    while [ "$attempt" -le "$MAX_RETRIES" ]; do
        echo "⏳ Attempt ${attempt}/${MAX_RETRIES} -> GET ${url}"

        local response=""
        local http_code=""
        local body=""

        # Executa curl capturando body e http_code de forma limpa com quebra de linha garantida
        response=$(curl -sS -w "\nHTTP_STATUS:%{http_code}" --connect-timeout 5 --max-time 10 "$url" 2>/dev/null || true)

        if [ -n "$response" ]; then
            http_code=$(echo "$response" | grep "^HTTP_STATUS:" | tail -n 1 | cut -d: -f2 || true)
            body=$(echo "$response" | grep -v "^HTTP_STATUS:" || true)
        fi

        if [ "$http_code" = "200" ] && echo "$body" | grep -q '"status"[[:space:]]*:[[:space:]]*"ok"'; then
            echo "✅ ${name} PASS: HTTP 200 OK | Body: ${body}"
            success=1
            break
        else
            echo "⚠️  ${name} ainda indisponível (HTTP: '${http_code:-N/A}', Body: '${body:-N/A}'). Aguardando ${RETRY_INTERVAL}s..."
            if [ "$attempt" -lt "$MAX_RETRIES" ]; then
                sleep "$RETRY_INTERVAL"
            fi
        fi

        attempt=$((attempt + 1))
    done

    if [ "$success" -eq 1 ]; then
        return 0
    else
        echo "❌ ${name} FALHOU após ${MAX_RETRIES} tentativas."
        return 1
    fi
}

echo ""
if check_endpoint "HEALTH_LIVE" "/health/live"; then
    HEALTH_LIVE_STATUS="PASS"
else
    HEALTH_LIVE_STATUS="FAIL"
fi

echo ""
if check_endpoint "HEALTH_READY" "/health/ready"; then
    HEALTH_READY_STATUS="PASS"
else
    HEALTH_READY_STATUS="FAIL"
fi

echo ""
echo "== RESULTADOS DO SMOKE TEST =="
echo "HEALTH_LIVE=${HEALTH_LIVE_STATUS}"
echo "HEALTH_READY=${HEALTH_READY_STATUS}"

if [ "${HEALTH_LIVE_STATUS}" = "PASS" ] && [ "${HEALTH_READY_STATUS}" = "PASS" ]; then
    SMOKE_TEST_STATUS="PASS"
    echo "SMOKE_TEST=${SMOKE_TEST_STATUS}"
    echo "✅ SMOKE GATE APROVADO COM SUCESSO!"
    exit_code=0
else
    SMOKE_TEST_STATUS="FAIL"
    echo "SMOKE_TEST=${SMOKE_TEST_STATUS}"
    echo "::error::SMOKE GATE REPROVADO! Health checks /health/live e/ou /health/ready falharam."
    exit_code=1
fi

(exit $exit_code)
