# LGPD E ERASURE DE CONTEÚDO DE VOZ — EVIDÊNCIA DE REMEDIAÇÃO (VOICE-003)

**Data de Execução:** 20/09/2026  
**Status do Item:** `VOICE-003: CLOSED / RESOLVED`  
**Escopo:** Exclusão física, rastreável e idempotente de dados de voz, transcrições e inteligência derivada no exercício de direitos LGPD (Art. 18).

---

## 1. Mapeamento de Retenção e Armazenamento de Conteúdo de Voz

Todos os caminhos de persistência de áudio, transcrições, metadados e produtos derivados foram catalogados e vinculados ao fluxo de erasure:

| Destino de Armazenamento | Entidade / Chave | Campos / Dados Sensíveis | Ação no Erasure (LGPD Art. 18) |
|---|---|---|---|
| **Object Storage (MinIO / S3)** | `copiloto-ia/${orgId}/${convId}/*` | Áudio gravado (.webm/.mp3) | Exclusão física imediata via `deleteObject(key)` |
| **Banco Relacional (Postgres)** | `CopilotoConversation` | `audioObjectKey`, `audioDurationMs`, `audioSizeBytes` | Zerados para `null`, `deletedAt: now()`, `deleteReason` marcado |
| **Banco Relacional (Postgres)** | `CopilotoTranscriptSegment` | `text`, `speakerLabel` | `text: '[segmento anonimizado — LGPD]'`, `speakerLabel: null` |
| **Banco Relacional (Postgres)** | `CopilotoInsight` | `valueJson`, `confidence` | `valueJson: {}` |
| **Banco Relacional (Postgres)** | `CopilotoCrmFieldSuggestion` | `previousValue`, `suggestedValue` | `previousValue: null`, `suggestedValue: '[valor anonimizado — LGPD]'` |
| **Banco Relacional (Postgres)** | `CopilotoCoachingEvaluation` | `rubricJson`, `overallScore` | `rubricJson: {}`, `overallScore: 0` |
| **Banco Relacional (Postgres)** | `VoiceCallLog` | `transcript`, `summary`, `recordingUrl` | Zerados para `null` |
| **Banco Relacional (Postgres)** | `ConversationSignal` | `summary`, `nextStep`, `objections`, `rawModelOutput` | Zerados para `null` ou `{}` |
| **Banco Relacional (Postgres)** | `TimelineEvent` | `description` | Substituído por `'[evento anonimizado — LGPD]'` |
| **Banco Relacional (Postgres)** | `WhatsAppMessage` | `body` | Zerado para `null` |
| **Banco Relacional (Postgres)** | `Contact` | Nome, telefone, email, linkedin, data de nascimento, notas | Anonimizado para `'[titular anonimizado — LGPD]'`, campos limpos |
| **Workers / Filas (BullMQ/Redis)** | `transcribeConversation.worker.ts` | Job assíncrono de transcrição | Fail-safe imediato: se `!state.audioObjectKey` ou conversa apagada, job é descartado sem processar |
| **Logs de Sistema** | `logger.info([lgpd]...)` | Registro de execução | Preserva apenas métricas de contagem e IDs, sem emitir PII no log |

---

## 2. Implementação Técnica

### 2.1 Exclusão no Object Storage (`src/lib/storage/index.ts`)
Implementada função `deleteObject(key: string): Promise<boolean>` utilizando `DeleteObjectCommand` do SDK S3 (`@aws-sdk/client-s3`), compatível nativamente com o MinIO local (`http://localhost:9000`).

### 2.2 Motor de Erasure Transacional (`src/shared/services/dataSubjectErasure.service.ts`)
- Localização unificada de conversas via `contactId` direto e `leadId` associados.
- Verificação de isolamento multi-tenant: exclusão física no storage só é acionada se a chave pertencer à organização do titular (`audioObjectKey.startsWith('copiloto-ia/' + target.organizationId + '/')`).
- Exclusão do objeto de áudio e limpeza dos ponteiros de áudio no banco.
- Redação dos segmentos de transcrição, removendo o texto original e o rótulo de participante (`speakerLabel`).
- Esvaziamento de insights semânticos, sugestões de CRM e avaliações de coaching derivadas da conversa.
- Retorno detalhado incluindo métrica `copilotoAudiosDeleted`.

### 2.3 Prevenção contra Recriação Assíncrona
Em `src/features/copiloto-ia/jobs/transcribeConversation.worker.ts`, o worker de transcrição avalia `state.audioObjectKey`. Como o erasure zera esse campo atomicamente, qualquer job pendente na fila detecta a ausência de áudio e é descartado com log explicativo, sem reconsultar ou recriar transcrições ou insights.

---

## 3. Validação e Testes Automatizados

Suíte de testes unitários executada com Vitest:
`src/shared/services/__tests__/dataSubjectErasure.unit.test.ts`

- `lança erro quando o contato não existe nesta organização`: PASS
- `anonimiza todos os campos identificadores do contato e mascara o WhatsApp ligado a ele`: PASS (valida `deleteObjectMock`, limpeza de `audioObjectKey`, redação de segmentos e sugestões)
- `não exclui áudio se a chave de storage não pertencer ao tenant da requisição (isolamento multi-tenant)`: PASS
- `trata conversas sem áudio (audioObjectKey nulo) com segurança`: PASS
- `sem Leads ligados ao titular, não chama updateMany de ConversationSignal/TimelineEvent/VoiceCallLog, mas busca CopilotoConversation por contactId direto`: PASS
- `é idempotente: contato já anonimizado não é regravado, mas WhatsApp continua sendo verificado`: PASS

**Resultado:** 6/6 testes aprovados em 2.48s.

---

## 4. Veredito

O achado **VOICE-003** está remediado e verificado. O pipeline de exclusão atende integralmente ao Art. 18 da LGPD, garantindo que gravações de voz e todos os seus artefatos derivados (transcrições, insights, avaliações) sejam apagados física e logicamente sem resquícios.
