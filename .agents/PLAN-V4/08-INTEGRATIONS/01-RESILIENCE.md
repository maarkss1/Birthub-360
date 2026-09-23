# Integration Resilience

## WhatsApp

Postgres:
- durable configuration.

Redis:
- active session;
- heartbeat;
- lock;
- retry coordination.

Objetivo:
failover sem depender de reconnect manual quando tecnicamente possível.

## Unified opt-out

Unificar:

- WhatsApp;
- voice;
- email;
- calls.

## 3CX / Birth Voices

- timeout;
- exponential backoff;
- jitter;
- max attempts;
- circuit breaker;
- error classification;
- idempotency.

## Bitrix24

Preservar circuit breaker e conector maduro existente, evitando duplicação.
