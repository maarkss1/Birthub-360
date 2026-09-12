- De: 18
- Para: 00
- Onda: c0
- Status: aberto
- Prioridade: normal

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
