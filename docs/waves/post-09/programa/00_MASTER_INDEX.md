# BIRTH HUB 360 — MASTER INDEX — ONDAS PÓS-09 (v2.0)

34 ondas organizadas em 8 trilhas, com dependências declaradas e critérios de aceite falsificáveis.

## O QUE MUDOU NA v2

- **8 ondas novas** (AC, AF, AA, AB, AG, AD, AE, AH) cobrindo lacunas do pacote original: fiscal brasileiro, SRE/SLO, cadeia de suprimento e release, segurança de IA, internacionalização, ciclo de vida do dado, deliverability e FinOps.
- **Critérios de aceite falsificáveis**: cada onda tem afirmações que podem ser provadas falsas por um comando ou consulta, no lugar de frases como "bindings verificáveis".
- **Dependências explícitas por onda** (depende de / habilita), formando um grafo em vez de uma fila.
- **Fora de escopo declarado** por onda, para conter expansão silenciosa.
- **Disciplina do agente executor**: proibição explícita de enfraquecer testes, gates e controles para "fechar" a onda.
- **Condições de parada**: quando devolver relatório parcial em vez de continuar.
- **Comandos reais da stack do repositório** (Vite, Prisma, Biome, Vitest, Playwright, gitleaks, Trivy, knip, dependency-cruiser).
- **Fonte única**: os arquivos são gerados por `tools/gerar_ondas.py`; corrigir uma regra corrige as 34 ondas.

## ORDEM RECOMENDADA

```
AC → J → H → AF → A → B → P → AA → M → D → AB → I → AG → N → AD → C → O → K → W → Q → S → E → AE → R → F → T → L → V → Y → G → U → X → AH → Z
```

A ordem segue um princípio: **o que é mais caro corrigir tarde vem primeiro.** Tenancy, dados e pipeline de release são pressupostos de todo o resto; certificação vem por último porque audita as demais.

## MAPA DAS ONDAS

### T0 — FUNDAÇÃO E CONTROLE

*Nada acima disso é confiável se a base de segurança, dados e release estiver frouxa.*

| Onda | Título | Prio | Depende de |
|---|---|---|---|
| **AC** | [SUPPLY CHAIN SECURITY & RELEASE ENGINEERING](ondas/ONDA_AC_SUPPLY_CHAIN_SECURITY_E_RELEASE_ENGINEERING.md) | P1 | — |
| **J** | [SECURITY ZERO TRUST & COMPLIANCE](ondas/ONDA_J_SECURITY_ZERO_TRUST_E_COMPLIANCE.md) | P1 | AC |
| **H** | [DATA GOVERNANCE & MASTER DATA](ondas/ONDA_H_DATA_GOVERNANCE_E_MASTER_DATA.md) | P1 | J |
| **AF** | [DATA LIFECYCLE, PORTABILIDADE E OFFBOARDING](ondas/ONDA_AF_DATA_LIFECYCLE_PORTABILIDADE_E_OFFBOARDING.md) | P1 | J, H |

### T1 — RECEITA REAL

*Transformar o produto em algo que vende, cobra, recebe e reconhece receita de verdade.*

| Onda | Título | Prio | Depende de |
|---|---|---|---|
| **A** | [JORNADA COMERCIAL 100% REAL](ondas/ONDA_A_JORNADA_COMERCIAL_100PCT_REAL.md) | P1 | J, H |
| **B** | [SAAS, PLANOS, ASSINATURAS E ENTITLEMENTS](ondas/ONDA_B_SAAS_PLANOS_ASSINATURAS_E_ENTITLEMENTS.md) | P1 | A, J |
| **P** | [BILLING, FINANCE & REVENUE OPS](ondas/ONDA_P_BILLING_FINANCE_E_REVENUE_OPS.md) | P1 | B, A, H |
| **AA** | [FISCAL BR, PAGAMENTOS LOCAIS E CONCILIAÇÃO](ondas/ONDA_AA_FISCAL_BR_PAGAMENTOS_LOCAIS_E_CONCILIACAO.md) | P1 | P, H |
| **M** | [FORECAST & REVENUE SCIENCE](ondas/ONDA_M_FORECAST_E_REVENUE_SCIENCE.md) | P1 | A, H |

### T2 — CONFIABILIDADE

*Sobreviver a falhas, integrações instáveis e canais de comunicação hostis.*

| Onda | Título | Prio | Depende de |
|---|---|---|---|
| **D** | [PRODUCTION HARDENING & DISASTER RECOVERY](ondas/ONDA_D_PRODUCTION_HARDENING_E_DISASTER_RECOVERY.md) | P1 | AC, J |
| **AB** | [SRE, SLOs E INCIDENT COMMAND](ondas/ONDA_AB_SRE_SLOS_E_INCIDENT_COMMAND.md) | P1 | D |
| **I** | [INTEGRATION RELIABILITY HUB](ondas/ONDA_I_INTEGRATION_RELIABILITY_HUB.md) | P1 | J, D |
| **AG** | [DELIVERABILITY E COMUNICAÇÃO CONFIÁVEL](ondas/ONDA_AG_DELIVERABILITY_E_COMUNICACAO_CONFIAVEL.md) | P1 | I, A |

### T3 — IA E AUTOMAÇÃO

*Sair de prompt guardado para runtime de agentes governado, seguro e mensurável.*

| Onda | Título | Prio | Depende de |
|---|---|---|---|
| **N** | [AGENT RUNTIME & ORCHESTRATION](ondas/ONDA_N_AGENT_RUNTIME_E_ORCHESTRATION.md) | P1 | J, H |
| **AD** | [AI SAFETY, PROMPT INJECTION E RED TEAM](ondas/ONDA_AD_AI_SAFETY_PROMPT_INJECTION_E_RED_TEAM.md) | P1 | N, J |
| **C** | [IA CONTEXTUAL E EXECUTIVA](ondas/ONDA_C_IA_CONTEXTUAL_E_EXECUTIVA.md) | P1 | N, H |
| **O** | [AUTOMATION & WORKFLOW ENGINE](ondas/ONDA_O_AUTOMATION_E_WORKFLOW_ENGINE.md) | P1 | N, I |
| **K** | [KNOWLEDGE & RAG EXCELLENCE](ondas/ONDA_K_KNOWLEDGE_E_RAG_EXCELLENCE.md) | P2 | H, C |
| **W** | [AI OBSERVABILITY, COST & GOVERNANCE](ondas/ONDA_W_AI_OBSERVABILITY_COST_E_GOVERNANCE.md) | P1 | N, C |

### T4 — QUALIDADE E GOVERNANÇA

*Congelar o que já funciona em contratos automatizados e num plano de controle auditável.*

| Onda | Título | Prio | Depende de |
|---|---|---|---|
| **Q** | [QUALITY ENGINEERING & TEST FACTORY](ondas/ONDA_Q_QUALITY_ENGINEERING_E_TEST_FACTORY.md) | P1 | A, J |
| **S** | [ADMIN, GOVERNANCE & PERMISSIONS](ondas/ONDA_S_ADMIN_GOVERNANCE_E_PERMISSIONS.md) | P1 | J, B |

### T5 — EXPERIÊNCIA E ESCALA

*Elevar a experiência, medir adoção e aguentar crescimento sem degradar.*

| Onda | Título | Prio | Depende de |
|---|---|---|---|
| **E** | [UX TOTAL, MOBILE E ACESSIBILIDADE](ondas/ONDA_E_UX_TOTAL_MOBILE_E_ACESSIBILIDADE.md) | P2 | A |
| **AE** | [I18N, FUSOS, MOEDA E FORMATAÇÃO](ondas/ONDA_AE_I18N_FUSOS_MOEDA_E_FORMATACAO.md) | P2 | E, H |
| **R** | [PERFORMANCE & SCALABILITY](ondas/ONDA_R_PERFORMANCE_E_SCALABILITY.md) | P2 | D, Q |
| **F** | [PRODUCT ANALYTICS & CUSTOMER SUCCESS](ondas/ONDA_F_PRODUCT_ANALYTICS_E_CUSTOMER_SUCCESS.md) | P2 | H, B |
| **T** | [ONBOARDING, ACTIVATION & ADOPTION](ondas/ONDA_T_ONBOARDING_ACTIVATION_E_ADOPTION.md) | P2 | F, E, B |
| **L** | [VOICE & OMNICHANNEL](ondas/ONDA_L_VOICE_E_OMNICHANNEL.md) | P2 | H, I |
| **V** | [CUSTOMER SUCCESS, RETENTION & EXPANSION](ondas/ONDA_V_CUSTOMER_SUCCESS_RETENTION_E_EXPANSION.md) | P2 | F, B, L |
| **Y** | [EXECUTIVE COMMAND CENTER & DECISION INTELLIGENCE](ondas/ONDA_Y_EXECUTIVE_COMMAND_CENTER_E_DECISION_INTELLIGENCE.md) | P2 | M, F, W |

### T6 — PLATAFORMA E CRESCIMENTO

*Abrir a plataforma, experimentar com controle e entender a margem real.*

| Onda | Título | Prio | Depende de |
|---|---|---|---|
| **G** | [PLATFORM API & ECOSYSTEM](ondas/ONDA_G_PLATFORM_API_E_ECOSYSTEM.md) | P2 | J, B, I |
| **U** | [MARKETPLACE & EXTENSIBILITY](ondas/ONDA_U_MARKETPLACE_E_EXTENSIBILITY.md) | P3 | G, N, S |
| **X** | [EXPERIMENTATION, GROWTH & FEATURE FLAGS](ondas/ONDA_X_EXPERIMENTATION_GROWTH_E_FEATURE_FLAGS.md) | P3 | F, B, Q |
| **AH** | [FINOPS DE INFRAESTRUTURA E MARGEM POR TENANT](ondas/ONDA_AH_FINOPS_DE_INFRAESTRUTURA_E_MARGEM_POR_TENANT.md) | P2 | P, W, R |

### T7 — CERTIFICAÇÃO

*Provar que o conjunto é comercializável, operável e demonstrável.*

| Onda | Título | Prio | Depende de |
|---|---|---|---|
| **Z** | [GO-TO-MARKET READINESS & CERTIFICATION](ondas/ONDA_Z_GO-TO-MARKET_READINESS_E_CERTIFICATION.md) | P1 | A, B, D, J, P, Q, S, W, AB, AC |

## PRIORIDADES

- **P1** — crítico para produto, segurança, receita, runtime, qualidade ou operação.
- **P2** — maturidade, experiência, escala e inteligência.
- **P3** — expansão de ecossistema, crescimento e extensibilidade.

## REGRA DE EXECUÇÃO

Não rode as ondas cegamente em paralelo. Antes de cada uma: faça discovery do estado atual, confirme as dependências e verifique se a onda ainda é necessária. A Onda 9 contínua de expansão de agentes pode seguir em paralelo desde que não concorra com mudanças críticas de runtime.

Arquivos de apoio: `01_ORQUESTRADOR_MESTRE.md`, `02_CONTRATO_NUCLEO.md`, `03_PROTOCOLO_EVIDENCIA.md`, `04_ANTIPADROES_DO_AGENTE.md`, `05_DEFINITION_OF_DONE.md`, `06_STACK_E_COMANDOS.md`, `07_MATRIZ_DE_STATUS.md`.
