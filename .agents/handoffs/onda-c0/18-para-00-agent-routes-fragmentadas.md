- De: 18
- Para: 00
- Onda: c0
- Status: resolvido
- Prioridade: normal

## Resolução
Decisão do Coordenador (00):
Mantida a separação explícita das rotas em `src/bootstrap/routes.ts` (`/api/agents` para catálogo de cargos, `/api/agent-bus` para barramento de comunicação, `/api/role-supervisor` para governança de supervisão e `/api/agent` para execução de IA runtime). A compatibilidade retroativa e integridade de chamadas já em produção e deep links são prioritárias; nenhuma unificação breaking de endpoints é permitida sem introdução prévia de aliases com deprecation notice.


## Problema
Quatro prefixos de rota distintos cobrem o domínio de runtime de agentes (o Enxame): `/api/agent`,
`/api/agents`, `/api/agent-bus`, `/api/role-supervisor`. Todos no mesmo domínio conceitual
(`CORE.Agents` proposto em `BIRTHUB_PRODUCT_MODEL.md` §3), mas sem contrato único.

## Arquivo(s) envolvido(s)
`src/bootstrap/routes.ts` (mounts dos quatro prefixos).

## Alteração necessária
Não renomear/mesclar agora. Registrar como decisão de contrato a tomar na Onda C1, com dono
conjunto 07 (IA/Automações) + 13 (Enxame/Governança de Agentes de Runtime).

## Teste esperado
Não aplicável nesta etapa.

## Contexto adicional
Achado C0-API-3 em `docs/architecture/BRAIN_API_CONTRACT_MAP.md` §3. Consolidação eventual precisa
preservar compatibilidade de rota (regra do programa: "não remover rota pública/deep link sem
alias/deprecation").
