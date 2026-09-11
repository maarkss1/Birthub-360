- De: 18
- Para: 00
- Onda: c0
- Status: resolvido
- Prioridade: alto

## Problema
O Agente 12 (Voz e Telefonia / Birthub Voices) está declarado em `/AGENTS.md` (estrutura oficial,
linha ~30) mas não tem arquivo de prompt em `.agents/prompts/` nem é citado em
`.agents/README.md`. Na prática, voz/telefonia (Birthub Voices/Bland, 3CX, cold call, webhooks de
resultado) é tratada dentro do escopo dos Agentes 06 e 07 — dois donos parciais, nenhum dono
formal. Achado original de `.agents/completion/02-mapa-plataforma.md` §5.2 ("Agente 12 fantasma"),
confirmado ainda válido nesta rodada.

## Arquivo(s) envolvido(s)
`.agents/prompts/` (ausência de `12-voz-telefonia.md`), `AGENTS.md`.

## Alteração necessária
Decisão do Coordenador: (a) criar `.agents/prompts/12-voz-telefonia.md` formalizando o Agente 12
antes da Onda C2 — que já lista "12 Voz/Telefonia" como participante e presume que ele existe —,
ou (b) atualizar `AGENTS.md` para remover a menção ao Agente 12 e formalizar a divisão 06/07 como
definitiva.

## Teste esperado
Não aplicável (decisão de governança, não código).

## Contexto adicional
Capacidades envolvidas: BT-031 (Birthub Voices/Bland) e BT-032 (3CX) em
`docs/architecture/BRAIN_TRUTH_MAP.md` §2.4. Sem essa decisão, a Onda C2 corre o risco de disparar
um "Agente 12" que não tem prompt oficial para ler.

## Resolução

Confirmado no HEAD atual de `main` (item ACH-18-04 do relatório de auditoria, Agente 18/Fase 3):
a opção (a) da seção "Alteração necessária" foi tomada — o Agente 12 foi formalizado antes da
Onda C2, não removido.

- `.agents/prompts/12-voz-telefonia.md` existe e define o papel do Agente 12 ("Voz e Telefonia —
  Birthub Voices / Bland / 3CX"): discagem autônoma, política de ligação, webhooks de resultado,
  supressão de contato e integração 3CX. O próprio arquivo documenta a origem do gap ("declarado
  desde a primeira revisão de `/AGENTS.md`, mas nunca teve prompt; tratado em pedaços pelos
  Agentes 06 e 07") — mesmo achado deste handoff.
- `.agents/README.md` lista `prompts/12-voz-telefonia.md` na tabela de arquivos (junto aos demais
  agentes 00-18), corrigindo a lacuna de citação apontada no "Problema" original.
- `AGENTS.md` continua listando "12 — Voz e Telefonia (Birthub Voices)" na estrutura oficial —
  agora com prompt real por trás, não mais um "agente fantasma".

Nenhuma alteração de código foi necessária; esta é uma confirmação de documentação já resolvida em
onda anterior à Fase 3 da auditoria.

Status: resolvido.
