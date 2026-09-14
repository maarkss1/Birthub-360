# PROTOCOLO DE EVIDÊNCIA

Uma afirmação sem evidência é uma opinião. Este protocolo define o que conta como prova.

## TIPOS ACEITOS

| Tipo | Formato exigido | Serve para provar |
|---|---|---|
| Código | `caminho/arquivo.ts:123` + trecho relevante | existência e forma de uma implementação |
| Comando | comando completo + saída + código de saída | build, lint, teste, varredura |
| Teste | nome do teste + arquivo + resultado | comportamento sob condição específica |
| Consulta | SQL completo + resultado (com dado mascarado) | estado dos dados |
| Traço | id de correlação + trecho | fluxo distribuído ponta a ponta |
| Captura de tela | imagem + descrição do que observar | comportamento visual e de interface |
| Migration | nome do arquivo + efeito + reversão | mudança de schema |

## O QUE NÃO É EVIDÊNCIA

- "implementei X" sem apontar onde;
- "os testes passam" sem dizer quais e sem a saída;
- captura de tela de código-fonte no lugar de execução;
- resultado de um mock apresentado como comportamento do sistema;
- documentação escrita na mesma onda citada como prova da mesma onda;
- afirmação sobre produção obtida a partir de ambiente local.

## REGRAS DE REDAÇÃO

1. Toda evidência deve ser reproduzível por outra pessoa, com o comando ou o caminho exato.
2. Mascare dado pessoal e segredo antes de colar qualquer saída.
3. Se você não conseguiu verificar algo, escreva **NÃO VERIFICADO** e explique o impedimento. Isso é uma resposta válida.
4. Separe sempre:
   - **FATO** — observado diretamente.
   - **EVIDÊNCIA** — como qualquer um observa o mesmo.
   - **INFERÊNCIA** — o que você conclui, e com que grau de confiança.
   - **RECOMENDAÇÃO** — o que deveria ser feito.
   - **AÇÃO** — o que você efetivamente fez.
5. Nunca apresente inferência com a linguagem de fato.

## TESTE DE NEGAÇÃO

Um teste que nunca falhou não prova nada. Para cada teste relevante criado na onda, quebre o comportamento de propósito uma vez e confirme que o teste falha. Registre isso no relatório.
