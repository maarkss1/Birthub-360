# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Duas audiências para este documento específico (o Strategy Playbook), distintas da base de usuários do produto Birth Hub 360 em si:
- **Autor/dono do documento**: Marcelo do Nascimento (Coordenador Comercial), que usa o playbook internamente como fonte canônica de marca/produto/mercado.
- **Futuros compradores** (público-alvo desta peça): tomadores de decisão de operações comerciais B2B avaliando o Birth Hub 360 — Diretor Comercial, CEO, Gerente Comercial, RevOps — em fase de descoberta/avaliação, que precisam ser convencidos pela força da história de marca e produto, não apenas informados por uma referência técnica.

## Product Purpose

O produto real (Birth Hub 360) é uma central de comando comercial B2B com IA agentic nativa: CRM, prospecção, roleplay de vendas, automações e cinco agentes de IA com papel definido (SDR/BDR/Closer/CRM/Ops) operando sob política de autonomia auditável. Ver detalhamento completo em `docs/strategy/birth-hub-360-strategy.json` (fonte estruturada, já validada).

Esta peça (o Playbook) existe para contar a história de marca e produto de forma persuasiva e envolvente para futuros compradores — não é uma tela do produto, é uma peça de comunicação estratégica em formato de livro digital.

## Positioning

O ativo mais diferenciado do produto real, que deve ancorar a narrativa: governança de automação de IA implementada em código (modos supervised/full, ledger de auditoria por decisão, critério honesto de "negócio ganho" que exige evidência verificável) — não apenas "CRM com IA", mas uma "central de execução comercial autônoma e auditável".

## Operating Context

Este documento é aberto diretamente no navegador (arquivo HTML autocontido, sem servidor), tipicamente compartilhado com prospects/investidores/parceiros para leitura — não é uma tela de uso diário repetido como o CRM real.

## Capabilities and Constraints

- Deve funcionar 100% offline/local (arquivo único, sem dependência obrigatória de servidor).
- **Idioma: 100% português brasileiro** — nenhum termo estrutural, rótulo de navegação, badge ou nome de framework em inglês solto (correção explícita pedida pelo usuário: "porque esta tudo em ingles?"). Termos técnicos amplamente usados em português comercial (ex.: ICP, CRM, SDR, BDR, KPI) podem permanecer, mas headers de seção, filtros e rótulos de UI devem estar em português.
- Formato: **livro digital, navegado página por página** ("se fosse um livro, abrindo página por página") — não é mais um dashboard de scroll único. Precisa de transição de página, numeração de página, e forma de pular para uma página específica.
- Conteúdo: contar "uma história forte e poderosa da marca e da ferramenta", "envolvendo os futuros compradores" — tom persuasivo/narrativo nos capítulos de abertura, com o conteúdo de referência detalhado (personas completas, matriz de objeções, dicionário de métricas, ICP scoring) preservado como capítulos de apêndice no final do mesmo livro (decisão confirmada pelo usuário: opção híbrida).
- Toda alegação de fato sobre o produto deve continuar rastreável a `docs/strategy/birth-hub-360-strategy.json` — nenhum cliente, receita, market share ou benchmark inventado (regra anti-alucinação já estabelecida e validada nesta mesma sessão).
- Este documento não é uma tela do produto Birth Hub 360 (CRM), então as regras de densidade de informação do CLAUDE.md do repositório (pensadas para uso diário repetido) não se aplicam da mesma forma — aqui cabe composição mais editorial/expressiva, com a ressalva de manter acessibilidade e evitar clichês de "AI slop" genérico.

## Brand Commitments

Marca única: **Birth Hub 360º**. Tagline: "Sua central de comando inteligente: integrando dados, potencializando decisões e acelerando a execução." Pilares: Inteligência, Conexão, Execução.

Paleta oficial (fonte: `src/config/brand.ts`, `identidade-visual/birthhub360/`): Antique Gold `#D4AF37` (primária, cor CLARA — nunca texto branco sobre ela), Deep Iris `#5B21B6`, Orbit Blue `#0065D2`, Obsidian `#0B132B`, Snow White `#F8FAFC`. Único gradiente multicolorido autorizado: a "órbita 360º" (ouro → íris → azul), reservado a halos/bordas/indicadores/hero sections.

Tipografia oficial do produto: **Bodoni Moda** (display, H1-H3) + **Inter** (interface/corpo). O usuário compartilhou um catálogo visual de referência (`code.html`/`code (2).html` no Desktop) usando Cinzel/Sora/Outfit/Space Grotesk e uma paleta estendida (neon pink/cyan, gold-100...700, obsidian-800...950) como inspiração de "magia"/sofisticação visual (halo prismático cósmico, texto metálico 3D, glass cards) — a **direção estética** (emblema orbital, texto com gradiente metálico, glass-morphism) é bem-vinda e deve ser adotada, mas os **tokens de cor e fonte reais da marca têm precedência** sobre os inventados na referência (ex.: usar o gradiente ouro→íris→azul real, não um arco-íris neon; usar Bodoni Moda, não Cinzel).

Crédito institucional: "Desenvolvido pelo Coordenador Comercial Marcelo do Nascimento". Canais: Suporte (16) 98181-8458, Comercial (16) 2132-3790.

## Evidence on Hand

Toda a base factual sobre o produto (módulos reais, integrações, arquitetura de governança de IA, ICP/personas/objeções propostos com status de evidência) já está consolidada em `docs/strategy/birth-hub-360-strategy.json`, produzida nesta mesma sessão a partir de leitura direta do código-fonte (não é hipótese não verificada — ver o próprio arquivo para o selo de evidência por afirmação: CONFIRMED/HYPOTHESIS/RECOMMENDATION/TO_VALIDATE/OPEN_QUESTION).

Nenhum cliente, case, receita ou benchmark de mercado real existe — não inventar.

## Product Principles

1. A história vem primeiro; a referência técnica vem depois, no mesmo livro (apêndice), nunca é cortada.
2. Nenhuma alegação de produto sem lastro no JSON/código-fonte real — sedução narrativa não é licença para inventar fato.
3. Magia visual tem limite: usar o vocabulário estético real da marca (ouro→íris→azul, Bodoni Moda, halo orbital) em vez de inventar paleta/fonte novas, mesmo quando a inspiração externa usa outras.
4. Todo rótulo estrutural visível ao leitor é em português.
5. O leitor (futuro comprador) deve terminar o livro entendendo claramente: o que é, por que existe, para quem é, por que confiar, e qual é o próximo passo.
