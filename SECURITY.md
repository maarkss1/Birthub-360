# Política de Segurança — Birth Hub 360°

A equipe da **Birth Hub 360°** leva a segurança e a privacidade de dados extremamente a sério. Esta política descreve como mantemos o sistema seguro e o procedimento para reporte responsável de vulnerabilidades.

---

## Versões com Suporte a Atualizações de Segurança

Apenas a versão ativa na branch principal (`main`) e tags estáveis associadas recebem patches e atualizações de segurança:

| Versão / Trilha | Suportada | Notas |
| :--- | :---: | :--- |
| `0.0.1` / `main` (Local-First & On-Premise) | :white_check_mark: | Trilha canônica atual de desenvolvimento e release. |
| Releases legadas em nuvem (Render, Neon, OCI) | :x: | Descontinuadas formalmente em favor da arquitetura Local-First. |

---

## Como Reportar uma Vulnerabilidade (Divulgação Responsável)

**Nunca abra issues públicas no GitHub para reportar vulnerabilidades de segurança ou vazamentos de credenciais.**

Se você identificar uma falha de segurança, brecha de controle de acesso (RBAC), vazamento de dados de tenant (multi-tenancy) ou vulnerabilidade de dependência:

1. **Canal de Contato:** Envie um e-mail diretamente para:
   * **`security@birthhub360.com`** ou contate o mantenedor principal do repositório (`marceloatlasgr@gmail.com`).
2. **Informações Necessárias no Reporte:**
   * Descrição detalhada da vulnerabilidade encontrada;
   * Passos reproduzíveis (PoC ou script de demonstração);
   * Impacto potencial nos dados ou na integridade da organização/tenant;
   * Qualquer sugestão de correção ou mitigação aplicável.

---

## Prazo de Resposta e SLA

* **Confirmação inicial do reporte:** até 48 horas úteis.
* **Avaliação de impacto e triagem:** até 5 dias úteis.
* **Liberação de patch corretivo:** prazos dependem da criticidade da falha:
  * **CRITICAL / P0 (Exposição de tenant, RLS bypass, RCE):** correção emergencial em até 24–48 horas.
  * **HIGH (Bypass de RBAC, SSRF, DoS de serviço):** correção em até 7 dias úteis.
  * **MEDIUM / LOW:** correção incluída no ciclo normal de release.

---

## Princípios de Segurança em Código e Arquitetura

Este repositório aplica verificações automatizadas contínuas em todos os builds e PRs:
* **Varredura de Segredos:** Detecção automatizada de credenciais versionadas via Gitleaks;
* **Auditoria de Dependências:** Varredura com `npm run security:audit-waivers` e governança de vulnerabilidades conhecidas em `docs/security/AUDIT_WAIVERS.md`;
* **Isolamento Multi-Tenant:** Proteção em nível de banco de dados via PostgreSQL Row-Level Security (RLS) e extensão de injeção de tenant Prisma;
* **Sanitização de Logs:** Mascaramento e redação obrigatória de PII (dados pessoais) e tokens antes da gravação de logs.
