# Security P0 Gates

## Webhook Replay

timestamp + HMAC/signature + nonce/idempotency + stale/duplicate tests.

## CSRF

Dedicated token + strict Origin/Referer + session binding, sem quebrar bearer/webhooks.

## BullBoard

Isolation na origem dos dados.

Role gate não é equivalente a tenant isolation.

## Git History / PII

Decisão humana obrigatória.

Processo:

backup → full history scan → decision → rewrite if approved → rotate credentials → validate clean clone → controlled force-push → communication.

## Customer URLs

Eliminar vazamentos cross-tenant por hardcoding.

## OPA

Não basta declarar policy. Deve existir caminho de enforcement verificável.

## Security Guide

Atualizar 4 → 5 roles.
