# Baseline técnico derivado da Master System Specification

Fonte principal: BIRTH-HUB-360-MASTER-SYSTEM-SPECIFICATION, gerada em 2026-09-23 a partir de auditoria direta do repositório.

Fatos reportados pela especificação:

- ~40 rotas de app;
- ~50 routers montados;
- 437 operações de API documentadas;
- 27 filas;
- 7 processos worker;
- 117 models;
- RLS auditada sem gap conhecido no snapshot citado;
- PII criptografada com blind index;
- 323 arquivos de testes automatizados;
- cobertura unit reportada em snapshot: 63,08% statements, 54,79% branches, 62,66% functions, 64,28% lines;
- gateway de IA com fallback de 3 provedores;
- RAG real;
- swarm de agentes parcial;
- quatro interfaces de IA duplicadas;
- 101 violações arquiteturais permitidas/conhecidas;
- Bitrix24 como conector mais maduro;
- Novu como integração órfã/morta no snapshot;
- retry inconsistente entre conectores;
- operação 100% local-first na decisão registrada;
- sistema de governança de IA amplo;
- documentação interna extensa.

### Segurança aberta citada

- replay de webhook;
- CSRF explícito;
- visibilidade cross-tenant do BullBoard.

### Dívida/duplicidade citada

- AtlasLogo orphan;
- 16 testes de Birth Voices sem fonte correspondente;
- placeholders antigos de Reports/Roleplay/Settings/Team;
- quatro interfaces de IA;
- Novu sem chamada real e com variável de ambiente divergente.

### Regra de evidência

Os números acima são baseline documental. A implementação deve revalidar qualquer número que possa ter mudado antes de usá-lo como gate de release.
