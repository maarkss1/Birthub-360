#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  # Usar .env.codespace como base se existir, senão usar .env.example
  if [ -f .env.codespace ]; then
    cp .env.codespace .env
    echo "Criado .env a partir de .env.codespace."
  else
    cp .env.example .env
    echo "Criado .env a partir de .env.example."
  fi
fi

# PLATFORM_OPERATOR_TOKEN exige >=16 chars quando definido (protege /admin/queues e /metrics),
# mas .env.example o deixa vazio de propósito (é um segredo, não pode ter valor real versionado).
# Sem isso o boot falha com "Too small: expected string to have >=16 characters".
if ! grep -qE "^PLATFORM_OPERATOR_TOKEN=.{16,}" .env; then
  TOKEN=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  sed -i "s/^PLATFORM_OPERATOR_TOKEN=.*/PLATFORM_OPERATOR_TOKEN=${TOKEN}/" .env
  echo "PLATFORM_OPERATOR_TOKEN gerado para este Codespace."
fi

npm install
npx prisma generate

cat <<'EOF'

Ambiente Codespace pronto.

NOTA: Este Codespace está configurado para usar serviços externos em vez de
serviços Docker Compose locais. Verifique o arquivo .env para configurar as
URLs dos serviços externos (DATABASE_URL, REDIS_URL, etc.).

As seguintes chaves de API do CHAVES.pdf já estão configuradas:
- Novu (notificações)
- Sentry (error tracking)
- PostHog (analytics)
- Apollo (prospecção)
- Groq (IA)
- Google Maps
- Ollama (IA local)

Para subir o servidor:
  npm run dev
EOF
