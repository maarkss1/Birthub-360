- De: 18
- Para: 00
- Onda: c0
- Status: resolvido
- Prioridade: alto

## Resolução
Resolvido: o arquivo de prompt `.agents/prompts/12-voz-telefonia.md` foi formalizado e criado, definindo explicitamente o papel, escopo exclusivo (`src/features/integrations/birth-voice/**`, `src/features/integrations/threecx/**`, `src/lib/queue/coldCall.worker.ts`, etc.), regras de governança e integrações de telefonia do Agente 12.


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
