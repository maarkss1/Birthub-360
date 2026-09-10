# Birthub Command Language + Components V2

Laboratório experimental isolado, criado a partir dos dois briefs, do catálogo visual e da leitura estática do repositório Birthub-360 em 10/09/2026.

## Superfícies

- `/design-lab/command-language`: Before, After e oito comparações; MetricRibbon, OperationalPulse, SignalStream, IntelligenceLens, ExecutionQueue e sete modos CRM.
- `/design-lab/components-v2`: botões, overlays, formulários, navegação, badges, tabelas, estados, loading, tipografia, cores, elevação e som opcional.
- Motion Playground: duração, easing, stiffness, damping, glow e magnetismo; 18 demonstrações com regras de uso.
- Auditoria: classificação KEEP / REFINE / MERGE / REPLACE / REMOVE, ocorrências do código real e sequência de migração.
- Biblioteca: anatomia e contratos dos 21 padrões, além do mapa de atenção.

## Escopo e isolamento

Nenhum consumidor do produto foi migrado. Nenhuma integração real é chamada. Registros, IA, confiança, execução e resultados são demonstrativos e rotulados. Estado efêmero da sessão; não há banco, API, autenticação nova nem persistência de dados comerciais. A voz depende do serviço do navegador e pede ativação explícita. Exportações contêm apenas os exemplos do laboratório.

No repositório do produto, o laboratório é distribuído como HTML/CSS/JS sob `public/design-lab/`, com uma rota experimental que enquadra a superfície isolada. A fronteira de documento impede que tokens e CSS alterem os componentes existentes. Isso é um protótipo para validação; não é ainda a nova biblioteca React de produção.

## Evidências de auditoria

Varredura de 257 arquivos TSX; 126 ocorrências diretas de `<Card`, 22 de `<KpiCard`, 3 de `<ContextualTip`, 2 de `<DealsGrid` e 2 de `<KanbanCard`. Esses números incluem ocorrências em stories quando presentes e não equivalem a quantidades renderizadas. A tabela de prioridade exclui stories. Loops, aliases, wrappers e caixas escritas como div precisam de análise semântica adicional.

TabNavCards, FindingsList e ActionPlanSteps estão implementados, mas sem usos JSX diretos na varredura. Não retirar exports antes de confirmar todos os consumidores.

Prioridades: JoaoReisDiagnosticHub (14 ocorrências), Analytics (8), WinLossAnalysis (8), Billing (8), Knowledge Base (7), Account360 (6). Documentos, planos e entidades podem justificar limites próprios; não remover fronteiras por contagem mecânica.

Pontos confirmados: `KpiCard.tsx` combina caixa, barra, chip e número; `Card.tsx` aplica sombras e hover por variante; `MainLayout.tsx` monta VoiceCommandWidget, CopilotTrigger e CommandPalette separadamente; `App.tsx` monta ClickSpark globalmente. Button já possui Magnetic e SoundFX; a migração deve aproveitar esses contratos.

## Decisões dos briefs

O princípio anticardificação rege o segundo brief: SignalCard vira SignalItem; InsightCard vira Lens; ActionCard vira Queue; MetricSurface vira Ribbon. Entity/Opportunity podem conservar fronteira quando representarem identidade selecionável. Sora é proposta para títulos e valores estratégicos; Inter permanece na operação; Plex Mono em identificadores técnicos.

`code.html` foi tratado como referência visual, não como instrução executável: sua presença Obsidian/Gold foi aproveitada, mas não seus scripts remotos, bloqueio de zoom ou efeitos cósmicos contínuos. Halos só indicam inteligência ativa.

## Motion e acessibilidade

140 / 240 / 420ms; easings standard, enter, exit, spring, emphasized; lift 2px, press .97, magnetismo 3px, glow .12. Interações por teclado; foco visível; dialogs nativos; menus com setas/Escape; command com fuzzy search, setas e Enter; inputs rotulados; reduced-motion do sistema e controle global. Toque tem ações de linha sempre visíveis. Hold-to-confirm possui confirmação alternativa acessível.

Alvo de desempenho: transform/opacity, animações contínuas restritas a processamento, nenhuma promessa de 60fps sem medição. Testes visuais, navegação autenticada, leitor de tela, zoom 200%, contraste medido e performance em hardware real continuam como critérios de validação, não resultados alegados.

## Plano de adoção

0. Validar visualmente ambos os laboratórios.
1. Extrair tokens e primitives experimentais em namespace próprio; manter APIs e testes existentes.
2. Piloto em Diagnóstico SDR e CRM Overview com flag por workspace.
3. Conectar evidências reais e permissões: Signal → Decision → Queue → Activity.
4. Migrar entidades e CRM progressivamente.
5. Remover legado sem consumidores, após métricas e regressões verificadas.

Rollback deve desligar a flag e restaurar consumidores anteriores, sem alterar dados. Dados de demonstração nunca são fonte de fallback da operação real. Cada execução em produção exige autorização do servidor, idempotência e registro auditável. Resultado de tarefa e resultado comercial são estados separados.

## Verificação desta entrega

Scripts JavaScript validados sintaticamente. 31 verificações de composição/contrato em runtime isolado: comparações, cinco workspaces, sete modos CRM, vazio, filtros, ordenação, fuzzy search, escape de texto, contagens auditadas, entradas e referências locais. Não houve teste visual em navegador. WebMCP é opcional, feature-detected; validação no contexto suportado indisponível nesta sessão.
