# EVIDÊNCIA DE EXECUÇÃO — PROMPT 08: STRIPE, IDEMPOTÊNCIA E RECONCILIAÇÃO

**Data:** 2026-09-20  
**Objetivo:** Fechar INTEGRATION-001 e o estado condicional/HIGH de reconciliação incompleta (BILLING-003 / Finding 04).  
**Veredito:** **INTEGRATION-001 RESOLVIDO | BILLING-003 RECONCILIAÇÃO ASSISTIDA OPERACIONAL (PASS)**  

---

## 1. Mapeamento do Fluxo Transacional e Idempotência (INTEGRATION-001)

### 1.1. Criação de Cobranças (`createStripeCharge`)
- **Arquivo:** `src/features/integrations/stripe/stripe.service.ts:344-358`
- **Estratégia de Idempotência:**
  - O campo `idempotencyKey` é obrigatório na interface `StripeChargeInput`.
  - Se ausente ou vazio, lança `AppError(400)` imediatamente com instrução clara para geração de UUID determinístico por tentativa.
  - Validação de tamanho: máximo 255 caracteres (limite oficial da Stripe para o cabeçalho `Idempotency-Key`).
  - O valor é propagado diretamente no header `Idempotency-Key` em chamadas para `https://api.stripe.com/v1/payment_intents`.
  - Em retentativas automáticas (`retryWithBackoff`), o mesmo `idempotencyKey` é reenviado, garantindo que timeouts ou oscilações de rede nunca criem cobranças duplicadas.
- **Evidência de Testes:**
  - `tests/unit/features/integrations/stripe/stripe.service.test.ts` (17 testes aprovados).
  - Cobre: obrigatoriedade da chave, validação de limites, reenvio em retentativas com backoff (500/503), e tratamento de falhas definitivas.

---

## 2. Webhook de Entrada (`stripe.webhook.ts`)

- **Arquivo:** `src/features/integrations/stripe/stripe.webhook.ts`
- **Montagem Pré-Parser:**
  - Montado em `src/bootstrap/webhooks.ts` com `express.raw({ type: '*/*' })` antes do `express.json()` global, preservando os bytes crus (`Buffer`) necessários para a validação HMAC.
- **Validação Criptográfica de Assinatura:**
  - Função `isValidStripeSignature` em `stripe.helpers.ts` valida o header `stripe-signature` (`t=timestamp,v1=hash`).
  - Utiliza `crypto.timingSafeEqual` para mitigar ataques de timing.
  - Janela de tolerância estrita de 300 segundos contra ataques de replay temporal.
  - Segredo de webhook recuperado por tenant (`StripeConnection.webhookSecret`), cifrado em repouso com AES-256-GCM (`secretFields.ts`).
- **Proteção contra Entregas Duplicadas (Replay Guard):**
  - Utiliza `claimWebhookDelivery('stripe', fingerprint)` com fingerprint estável derivado de `(connectionId, event.id)`.
  - Re-entregas da Stripe com o mesmo event ID são identificadas e respondidas imediatamente com `{ outcome: 'duplicate-delivery' }`, sem reprocessamento.
- **Evidência de Testes:**
  - `tests/unit/features/integrations/stripe/stripe.webhook.test.ts` (7 testes aprovados).

---

## 3. Decisão de Release e Conciliação Financeira (BILLING-003)

### 3.1. Reconciliação Síncrona Assistida (AO VIVO)
- **Endpoint:** `POST /api/crm/documents/:id/reconcile-stripe-payment`
- **Implementação:** `PrismaCrm360Repository.reconcileFaturaStripePayment` (`src/features/crm360/infra/PrismaCrm360Repository.ts:983-1090`)
- **Regras Rígidas de Negócio:**
  1. **Trava de Transição Direta:** A rota padrão de atualização de status do CRM (`PUT /api/crm/documents/:id/status`) **proíbe explicitamente** mover uma Fatura para `Pago` sem passar pelo fluxo de reconciliação (lança `AppError 400`).
  2. **Verificação Ao Vivo:** Consulta diretamente a API da Stripe (`getStripeCharge`) via `StripeChargePort`.
  3. **Verificação de Status:** Rejeita qualquer cobrança cujo status não seja `succeeded`.
  4. **Conferência de Centavos:** Compara o valor em centavos da cobrança com o total do documento (tolerância máxima de 1 centavo para arredondamento).
  5. **Conferência de Moeda:** Exige igualdade estrita de moeda (`BRL`, `USD`, etc.).
  6. **Imutabilidade / Unicidade:** Impede que um `paymentIntentId` seja reutilizado para pagar mais de uma fatura (`constraint unique (organizationId, stripePaymentIntentId)`).
  7. **Deal Closure & Auditoria:** Dispara `ensureDealClosureAllowed` e registra log em `AuditService`.
- **Evidência de Testes:**
  - `tests/unit/features/crm360/infra/PrismaCrm360Repository.reconciliation.test.ts` (14 testes aprovados cobrindo todos os caminhos felizes e negativos).

### 3.2. Contenção para o Release 1 (Modo 100% Local-First)
- Webhooks de entrada registram os eventos autenticados (`outcome: 'logged'`) para auditoria e rastreabilidade.
- Para evitar criação ou alteração autônoma acidental de faturas por webhooks de terceiros sem pedido prévio formalizado, a conciliação no Release 1 é **assistida**: a operadora/closer confirma o pagamento via botão "Reconciliar Pagamento Stripe" na Fatura do CRM, que dispara a validação em tempo real contra a Stripe.

---

## 4. Resumo de Cobertura de Testes

| Arquivo de Teste | Quantidade de Testes | Status |
|---|---|---|
| `stripe.service.test.ts` | 17 | **PASS** |
| `stripe.webhook.test.ts` | 7 | **PASS** |
| `stripe.helpers.test.ts` | 6 | **PASS** |
| `PrismaCrm360Repository.reconciliation.test.ts` | 14 | **PASS** |
| `PrismaCrm360Repository.test.ts` | 4 | **PASS** |
| **Total** | **48 testes** | **100% PASS** |
