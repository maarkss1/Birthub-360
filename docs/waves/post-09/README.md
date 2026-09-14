# BIRTH HUB 360 — Ondas Pós-09 (v2.0)

Pacote de prompts de execução para evolução do Birth Hub 360, organizado em 34 ondas e 8 trilhas.

## Estrutura

```
00_MASTER_INDEX.md          mapa das ondas, trilhas e ordem recomendada
01_ORQUESTRADOR_MESTRE.md   como supervisionar a execução
02_CONTRATO_NUCLEO.md       regras inegociáveis (reproduzidas em cada onda)
03_PROTOCOLO_EVIDENCIA.md   o que conta como prova
04_ANTIPADROES_DO_AGENTE.md falhas recorrentes a evitar
05_DEFINITION_OF_DONE.md    critérios que valem para todas as ondas
06_STACK_E_COMANDOS.md      stack real do repositório e comandos
07_MATRIZ_DE_STATUS.md      acompanhamento do progresso
ondas/                      34 arquivos, um por onda (autocontidos)
templates/                  discovery, relatório e ADR
waves.json                  manifesto legível por máquina
tools/                      fonte de dados e gerador
```

## Como usar

**Execução de uma onda (Claude Code, Cursor ou equivalente):**
1. Abra o repositório na raiz.
2. Cole o conteúdo de `ondas/ONDA_X_*.md` como instrução.
3. Exija a Fase 1 (discovery) antes de qualquer edição.
4. Ao final, atualize `07_MATRIZ_DE_STATUS.md`.

**Supervisão de várias ondas:** use `01_ORQUESTRADOR_MESTRE.md` como prompt do supervisor e deixe que ele escolha a próxima onda elegível pelo grafo de dependências.

Cada arquivo de onda é autocontido: contém o contrato núcleo, o método e os critérios. Isso é proposital — um arquivo colado isoladamente não perde regra.

## Como alterar

Não edite os arquivos em `ondas/` à mão: eles são gerados.

```bash
# edite tools/ondas_data.py e depois:
python3 tools/gerar_ondas.py
```

Uma correção de regra no gerador se propaga para as 34 ondas.

## Diferenças em relação à versão 1

| Item | v1 | v2 |
|---|---|---|
| Ondas | 26 | 34 (8 novas: AC, AF, AA, AB, AG, AD, AE, AH) |
| Critérios de aceite | 3 frases genéricas por onda | 5 a 8 afirmações falsificáveis com evidência exigida |
| Dependências | fila linear única | grafo com depende de / habilita |
| Fora de escopo | ausente | declarado por onda |
| Disciplina do executor | ausente | proibição explícita de enfraquecer gates, testes e controles |
| Condições de parada | ausente | definidas |
| Comandos | genéricos | específicos da stack do repositório |
| Manutenção | 28 arquivos duplicados | fonte única com gerador |
| Métricas | ausentes | por onda, com exigência de medir baseline |
| Armadilhas | ausentes | por onda |
