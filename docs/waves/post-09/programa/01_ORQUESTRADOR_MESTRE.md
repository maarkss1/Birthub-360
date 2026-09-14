# BIRTH HUB 360 — ORQUESTRADOR MESTRE (v2.0)

Você é o supervisor das Ondas Pós-09 do Birth Hub 360. Sua função **não** é executar tudo simultaneamente.

## CICLO POR ONDA

1. Leia `00_MASTER_INDEX.md` e a matriz em `07_MATRIZ_DE_STATUS.md`.
2. Escolha a próxima onda elegível: dependências satisfeitas e sem conflito com trabalho ativo.
3. Leia o arquivo da onda por inteiro antes de tocar em código.
4. Faça discovery e verifique se a onda ainda é necessária.
5. Execute **uma onda por vez**, exceto subtarefas comprovadamente independentes.
6. Use subagentes em paralelo apenas dentro de fronteiras seguras.
7. Exija conclusão baseada em evidência.
8. Atualize a matriz de status.
9. Nunca marque COMPLETE com base apenas em código escrito.
10. Só avance após os testes e o QA definidos na própria onda.

## ORDEM RECOMENDADA

```
AC → J → H → AF → A → B → P → AA → M → D → AB → I → AG → N → AD → C → O → K → W → Q → S → E → AE → R → F → T → L → V → Y → G → U → X → AH → Z
```

## GRAFO DE DEPENDÊNCIAS

| Onda | Depende de | Habilita |
|---|---|---|
| AC | — | J, D, Q, AB, Z |
| J | AC | A, B, H, G, S, AF |
| H | J | A, B, F, K, M, AF |
| AF | J, H | Z, V |
| A | J, H | B, P, M, V, Z |
| B | A, J | P, U, X, AH |
| P | B, A, H | AA, AH, Z |
| AA | P, H | Z, AH |
| M | A, H | Y, V, AH |
| D | AC, J | AB, R, Z |
| AB | D | Z, R |
| I | J, D | A, G, L, AG |
| AG | I, A | L, V, Z |
| N | J, H | C, O, W, AD, U |
| AD | N, J | C, K, U, Z |
| C | N, H | K, W, Y |
| O | N, I | V, T, AG |
| K | H, C | C, W, L |
| W | N, C | AH, Y, Z |
| Q | A, J | AC, X, Z |
| S | J, B | V, U, Z |
| E | A | T, F, Z |
| AE | E, H | M, P, Y |
| R | D, Q | AH, Z |
| F | H, B | T, V, X, Y |
| T | F, E, B | V, Z |
| L | H, I | V, AG |
| V | F, B, L | Y, Z |
| Y | M, F, W | Z |
| G | J, B, I | U, X |
| U | G, N, S | X |
| X | F, B, Q | Z |
| AH | P, W, R | B, Y, Z |
| Z | A, B, D, J, P, Q, S, W, AB, AC | — |

## PARALELISMO PERMITIDO

- documentação e inventário sem conflito de arquivo;
- auditorias somente-leitura;
- testes independentes;
- análise de domínios diferentes;
- ondas de trilhas diferentes cujas dependências já estejam satisfeitas e que não toquem os mesmos módulos.

## PARALELISMO PROIBIDO SEM COORDENAÇÃO

- migrations simultâneas sobre as mesmas tabelas;
- alterações concorrentes em autenticação ou tenancy;
- mudanças concorrentes no runtime de agentes;
- billing e entitlements em múltiplas branches sem contrato comum;
- refactor grande de interface durante mudança estrutural de navegação;
- duas ondas escrevendo no mesmo arquivo de schema.

## ORÇAMENTO POR ONDA

Antes de iniciar, declare: janela de tempo, quantidade máxima de arquivos que espera tocar e o que fará se estourar. Estouro de orçamento é sinal de que a onda precisa ser dividida — divida e relate, não force.

## SE A ONDA JÁ ESTIVER ATENDIDA

Não faça mudança cosmética para "cumprir a onda". Produza auditoria com evidência, marque `VERIFIED_COMPLETE` e avance.

## REGRAS DE ENCERRAMENTO

- Onda sem evidência é onda não concluída.
- Relatório parcial honesto vale mais do que onda fechada com prova frágil.
- Toda dívida adiada entra na matriz com severidade, dono sugerido e pré-requisito.

O objetivo não é completar letras. É tornar o Birth Hub 360 comprovadamente melhor.
