# ADR 005: Scoring preditivo de fit TREINADO (item 10 do roadmap de Inteligência de Dados & Enriquecimento) — adiado

## Status

Aceito

## Contexto

O roadmap de "Inteligência de Dados & Enriquecimento" pede, como item 10: "scoring preditivo de
fit treinado nos próprios clientes que converteram e nos que deram churn". Antes de implementar,
investigamos se isso é viável hoje, checando três pré-requisitos de qualquer modelo supervisionado
real: rótulo confiável de outcome (positivo E negativo), volume suficiente de exemplos rotulados, e
infraestrutura de treino/inferência.

Nenhum dos três está presente:

1. **Não existe rótulo de churn no schema.** `LeadStatus` (`prisma/schema.prisma`) só tem
   `Negocios_Ganhos` ("won") como estado funil-final positivo, além de dois cancelamentos
   específicos de piloto (`Piloto_Atlas_Profile_Cancelado`, `Piloto_Logistico_Cancelado`).
   `CompanyStatus` (`Ativo | Inativo | Em_analise`) é higiene de dado, não churn.
   `DealClosureEvent` registra COMO um negócio foi fechado como ganho, não um evento de
   cancelamento. O único campo relacionado a churn é
   `CopilotoDealHealthSnapshot.churnRiskScore`/`churnFactorsJson` — um risco ESTIMADO POR IA a
   partir de texto de conversa por oportunidade individual, não um rótulo ground-truth de "este
   cliente cancelou". Não há como montar um dataset positivo/negativo real hoje.
2. **Volume de exemplo provavelmente insuficiente mesmo só para "ganho".** Não há seed/fixture de
   produção neste repo para confirmar por query direta, mas a evidência circunstancial aponta pra
   N muito baixo: até 09/2026 o produto rodou com exatamente dois clientes nomeados (AtlasGR,
   TotalTrac) antes do ICP se ampliar (ver `.claude/CLAUDE.md`, seção 1) — provavelmente dígito
   único a dezena baixa de negócios "Negócios Ganhos" reais, e efetivamente zero churns
   rotulados.
3. **Nenhuma infraestrutura de ML existe no repo.** Sem `requirements.txt`, sem notebook, sem
   `scripts/ml/`, sem scikit-learn/xgboost/pandas/numpy em `package.json`. A única coisa "IA"
   relacionada a scoring hoje é uma chamada de embedding (`generateEmbedding`, usada por
   `lookalike-scoring.service.ts`), não um pipeline de treino/inferência de classificador.

O que já existe e É o estado da arte atual deste produto para "fit":

- **`AccountScore`** (`AccountIntelligenceSnapshot` → `fit/timing/intent/relationship`,
  `src/features/market-intelligence/domain/accountInsights.ts`) — heurística v1, versionada,
  documentada explicitamente como "nenhuma chamada a IA, nenhum valor fabricado".
- **`Company.lookalikeScore`** (`src/features/prospecting/services/lookalike-scoring.service.ts`)
  — NÃO é um modelo treinado: é similaridade de cosseno (pgvector, embedding de 768 dimensões)
  recalculada a cada chamada, comparando a empresa candidata contra as empresas do mesmo tenant
  cujo `Lead.status = 'Negócios Ganhos'` — com uma trava de cold-start explícita
  (`MIN_REFERENCE_COMPANIES = 3`: sem pelo menos 3 empresas de referência, retorna `null` em vez
  de inventar um score). Limitação já documentada no próprio arquivo: só empresas re-enriquecidas
  depois de ganhar entram no pool de comparação.

## Decisão

**Adiar a construção de um classificador treinado.** Treinar qualquer modelo supervisionado hoje
— sem rótulo de churn, com uma base de "ganhos" de tamanho provavelmente insuficiente pra
generalizar, e sem nenhuma infra de ML no repo — produziria um número com aparência de rigor
estatístico sem nenhuma sustentação real. Isso violaria diretamente o princípio já vigente no
código deste produto para todo o resto do enriquecimento: nenhum valor fabricado.

O item 10 permanece **pausado** até que pelo menos um dos dois pré-requisitos abaixo mude:

1. Volume real de "Negócios Ganhos" cresça o suficiente (dezenas a centenas, não unidades) para
   qualquer holdout/validação fazer sentido estatístico; e/ou
2. Um rótulo real de churn passe a existir no schema (ver "Trabalho futuro").

Enquanto isso, o caminho de "fit" deste produto continua sendo a heurística v1
(`AccountScore`) + o lookalike por embedding (`lookalikeScore`) — ambos já auditáveis e sem
fabricação de dado.

## Consequências

### Positivas

- Nenhum número fabricado é exposto ao vendedor como se fosse "fit calculado por IA treinada".
- Preserva a confiança no restante do enriquecimento, que já segue essa mesma disciplina.

### Negativas

- O item 10 do roadmap fica formalmente incompleto por tempo indeterminado.
- Times que leiam só o roadmap (sem este ADR) podem reabrir a investigação achando que é trabalho
  não iniciado — este documento existe pra evitar exatamente isso.

## Alternativas Consideradas

- _Treinar mesmo assim com poucos exemplos, aceitando o risco:_ rejeitado — um modelo treinado em
  ~10 exemplos positivos e zero negativos rotulados não generaliza; o resultado seria
  estatisticamente indistinguível de ruído, mas apresentado como "preditivo".
- _Simular/gerar dado de churn sintético para destravar o treino:_ rejeitado — dado fabricado
  treinando um modelo sobre dado fabricado é o oposto do princípio deste produto.
- _Melhorar só o `lookalikeScore` existente (cobrir empresas ganhas sem re-enriquecimento no pool
  de comparação) em vez de nada:_ considerado viável e de baixo risco, mas é uma melhoria de
  heurística existente, não o item 10 como pedido ("treinado") — se o produto quiser isso, é uma
  tarefa separada, menor, que pode ser feita a qualquer momento sem depender deste ADR.

## Trabalho futuro (pré-requisito, não parte desta decisão)

Se o produto quiser habilitar treino real no futuro, o primeiro passo é de schema/produto, não de
ML: decidir e modelar um evento de churn real (ex.: `CompanyStatus` ganhar um valor `Cancelado`
com `cancelledAt`/`cancelReason`, ou um novo model dedicado, espelhando como `DealClosureEvent` já
modela o fechamento positivo). Isso é uma decisão de dono de produto — não deve ser feito como
efeito colateral de nenhuma outra tarefa de enriquecimento.
