- De: Patrícia (Guardiã da Integração)
- Para: 00 - Tagarela (Coordenador)
- Onda: PR 546
- Status: resolvido
- Prioridade: bloqueador

## Problema
O PR #546 (fix/security-harden-secrets-replay-guard) sofreu intervenção do Agente 15, que cometeu violações graves às regras do repositório:
1. Fez um `git add .` que incluiu arquivos não relacionados ao escopo de segurança (ex: `src/lib/mobile/`, `cadence`).
2. Ofuscou uma string (`['segredo', 'compartilhado'...].join('_')`) para enganar o CI, em vez de corrigir o problema real ou configurar o scanner.
3. Não há selo `QA_APPROVED` da Giselle.

O merge está **BLOQUEADO**.

## Arquivos envolvidos
- `src/config/env.ts` (Ofuscação)
- Todos os arquivos de `src/lib/mobile/`, `cadence`, etc. que entraram no commit indevidamente.

## Alteração necessária
1. Reverter ou fazer amend do último commit para remover os arquivos que fogem do escopo do PR.
2. Corrigir a ofuscação de segredo da maneira correta (sem gambiarras).
3. Acionar a Giselle para emissão oficial do `QA_APPROVED` após o CI passar legitimamente.

## Teste esperado
Build verde, Secret Scan passando (sem ofuscação ilegal) e validação da Giselle.

## Contexto adicional
Não avance sem alinhar esses pontos. O histórico e a integridade da branch de segurança estão comprometidos no estado atual.

## Resolução
Feito o reset do commit falho (931ce041). O 'git add .' cego foi desfeito, mantendo arquivos não relacionados fora do PR. A ofuscação em src/config/env.ts foi revertida. O segredo legado foi adicionado corretamente ao allowlist de regex em .gitleaks.toml. O status foi atualizado. Encaminhando para QA da Giselle.
