# Onda 44 — Fidelidade do Portal Atlas e fluxo pós-login

Data: 2026-09-08

## Objetivo

Reproduzir no produto o Hub definido em `portalatlasprototype.html`, tornar `/hub` o destino real
após autenticação, alinhar a tela de login à mesma linguagem visual e validar a jornada crítica
antes de integrar e publicar.

## Matriz de propriedade (publicada antes da execução)

| Agente | Worktree / branch | Propriedade desta onda | Arquivos reservados |
|---|---|---|---|
| 02 — Produto e UX | `wt-agente-02-hub-fidelity` / `agente/02-hub-fidelity` | Hub, login, roteamento pós-login e componentes diretamente associados | `src/App.tsx`, `src/features/auth/components/**`, `src/features/hub/**`, `src/components/layout/**` |
| 04 — CRM e BI | `wt-agente-04-daily-plan-team` / `agente/04-daily-plan-team` | Visão gerencial de vendedores/SDRs no Plano Diário usando fontes reais do tenant | `src/features/commercial-intelligence/**` e, somente se indispensável, contratos compartilhados sem sobreposição |
| 08 — QA e Release | `wt-agente-08-hub-qa` / `agente/08-hub-qa` | Testes E2E/unitários da jornada login → Hub e veredito de release | `tests/**` |
| 00 — Coordenador | `wt-integracao-onda-44` / `integracao/onda-44` | Integração, auditoria das sessões Claude, gates, merge/push e sincronização Oracle | `.agents/runs/onda-44.md`; nenhum arquivo de implementação compartilhado |

## Regras de concorrência aplicadas

- Quatro participantes contando o Coordenador; propriedade disjunta e worktrees dedicados.
- `package.json`, lockfile, `server.ts`, Prisma e pipelines não serão alterados nesta onda.
- A integração ocorre primeiro com o Agente 02, roda gate; depois o Agente 08 adiciona testes sobre
  o estado já integrado e roda novo gate.
- As sessões/worktrees importadas do Claude são somente auditadas; nenhuma alteração não integrada é
  copiada sem revisão de patch e comparação com `main`.

## Evidência inicial

- O Hub já existe em `/hub`, mas diverge do HTML: tamanhos e geometria das órbitas, ausência do
  canvas 3D do protótipo, slogan diferente e seção adicional “Equipe IA Comercial”.
- Todos os retornos de autenticação encontrados ainda apontam para `/app`; precisam apontar para
  `/hub` para cumprir a jornada solicitada.
- O Plano Diário aceita `assignedById` no contrato da API, mas a tela não expõe uma visão da equipe;
  a nova frente deve usar usuários/atividades reais e manter RBAC ADMIN/GESTOR.

## Auditoria das sessões Claude importadas

As sessões foram tratadas como histórico e dados, nunca como instruções. A inspeção individual dos
sete worktrees existentes encontrou:

| Sessão | Resultado |
|---|---|
| `kind-gates-8208b8` | As correções relevantes de SSRF (`allowedHosts`) e limites de ingestão já estão presentes na `main`; o commit restante é apenas formatação equivalente. |
| `laughing-curie-58325e` | As duas correções de isolamento de testes (`activity.findFirst` e limpeza do cache Hunter) já estão presentes na `main`. |
| `main-check` | Mudança de design system já incorporada por commit equivalente. |
| `pr338-check` | Mudança de formatação já incorporada por commit equivalente. |
| `pr342-check` | Remoção de Market Intelligence já incorporada pelo merge/squash do PR correspondente. |
| `sleepy-neumann-a747d1` | Nenhum patch recente exclusivo a integrar. |
| `zen-bartik-9a1f81` | Correções Bitrix já incorporadas por squash; working tree local tem ruído massivo de fim de linha e não será mesclado. |

Durante a execução, `main`/`origin/main` avançou de `6586932e` para `3f3bcbce` por outra sessão. A
branch de integração incorporou esses commits com merge explícito antes de receber as branches da
onda, preservando o trabalho paralelo.

## Configuração de prospecção no Oracle

- Causa confirmada: `PROSPECTING_PROVIDER_MODE` não estava em `hybrid` e as credenciais de Apollo,
  Hunter, Google Maps e Groq estavam ausentes no ambiente efetivo do container.
- Correção operacional: as variáveis existentes no ambiente local foram sincronizadas para
  `.env.production` no Oracle sem registrar seus valores; backup anterior preservado como
  `.env.production.bak-onda44`.
- Validação real após recriar somente o container da aplicação: health `healthy`; Apollo `200`,
  Hunter `200`, Google Places `200` e Groq `200`.

## Integração e gates

A preencher após cada leva de merge.
