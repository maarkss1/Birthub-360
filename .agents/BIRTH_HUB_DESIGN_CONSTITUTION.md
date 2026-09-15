# Constituição Visual — Birth Hub 360°

**Status:** vigente para qualquer trabalho de interface  
**Marca:** Birth Hub 360°  
**Última revisão:** 2026-09-15

## 1. Autoridade e precedência

Esta constituição é o contrato superior dos agentes de interface. Em qualquer conflito, a ordem de autoridade é:

1. requisitos funcionais existentes da plataforma;
2. Brandbook oficial Birth Hub 360° e seus ativos-mestre;
3. Design System e tokens existentes no repositório;
4. arquitetura atual da aplicação;
5. skill Anthropic `frontend-design`;
6. skill Vercel `web-design-guidelines`.

As skills externas são consultoras. Elas não podem substituir arbitrariamente logotipo, identidade Birth Hub 360°, cores oficiais, tokens, Sora, Inter, iconografia oficial, identidade de motion, arquitetura funcional, navegação ou funcionalidades existentes.

Uma instrução humana explícita e atual prevalece sobre documentação histórica. Assim, para a próxima reforma visual, **Sora é a fonte oficial de títulos, identidade e labels importantes**, mesmo enquanto documentos antigos ainda citarem Bodoni Moda. Essa divergência deve ser corrigida documentalmente pelo dono da marca; não autoriza um agente visual a trocar a fonte.

## 2. Identidade

### Marca

**Birth Hub 360°**

### Conceito

Central inteligente que conecta dados, inteligência, decisões e execução.

### Princípios

- premium;
- executivo;
- tecnológico;
- sofisticado;
- inteligente;
- preciso;
- modular;
- proprietário;
- alta densidade informacional sem poluição;
- sensação de central de comando;
- evitar aparência de template SaaS genérico.

O produto é uma ferramenta operacional de uso recorrente. Clareza, velocidade de leitura, hierarquia, consistência e confiança têm precedência sobre decoração.

## 3. Tipografia oficial

- **Sora:** títulos, identidade, headings e labels importantes;
- **Inter:** interface, corpo, campos, tabelas e dados.

`frontend-design` e `web-design-guidelines` não têm autoridade para trocar essas famílias por preferência estética. Fontes devem permanecer self-hosted sempre que já houver ativos locais. Tipos auxiliares só podem existir com função comprovada, acessibilidade verificada e aprovação do Design System.

## 4. Marca, cor e ativos

- Os SVGs-mestre vivem em `identidade-visual/birthhub360/logos/`; componentes devem consumir as abstrações de marca existentes.
- Cores de produto devem vir dos tokens semânticos de `src/styles/globals.css`, nunca de novos hexadecimais isolados quando existir token equivalente.
- O gradiente orbital é assinatura controlada, não decoração genérica nem fundo de texto.
- Superfície de marca usa o token de conteúdo correspondente (`text-on-brand`); não presumir branco sobre ouro.
- É proibido distorcer, girar, recolorir ou acrescentar efeitos arbitrários ao logotipo.

## 5. Temas

### Dark

Deve possuir profundidade, contraste, iluminação controlada e superfícies hierárquicas. Glow, blur e movimento só existem quando comunicam foco, estado, profundidade ou relação entre dados.

### Light

Deve ser realmente claro, com superfícies, texto e bordas calibrados para esse contexto. **É proibido criar um light mode com fundo predominantemente escuro.**

Toda alteração visual futura deve ser avaliada nos dois temas e nos estados default, hover, focus-visible, active, disabled, loading, vazio e erro que se aplicarem.

## 6. Composição e densidade

- Telas operacionais devem priorizar leitura executiva, comparação e próxima ação.
- Densidade informacional é deliberada: agrupar, ordenar e revelar progressivamente; não remover informação para produzir vazio estético.
- Não usar hero centralizada, três cards simétricos, gradientes genéricos, glassmorphism ou animação infinita como resposta automática.
- Reusar primitivos em `src/components/ui/` e padrões em `src/components/layout/` antes de criar variantes.
- Novos tokens ou padrões reutilizáveis exigem validação contra o Design System existente.
- Ícones vêm da iconografia oficial já adotada; emoji não substitui ícone de interface.

## 7. Proteção funcional

Durante qualquer reforma visual é proibido alterar, sem necessidade funcional explícita e governança do dono correto:

- regras comerciais;
- RBAC, autenticação ou autorização;
- multi-tenancy;
- APIs, contratos, schemas, banco ou migrations;
- agentes, RAG ou automações;
- integrações ou webhooks;
- billing;
- regras de negócio;
- rotas ou estrutura de navegação;
- eventos ou analytics.

Visual não pode quebrar comportamento. Texto, controles e estados existentes devem ser classificados antes de qualquer remoção. Dados reais não podem ser substituídos por placeholders ou métricas fabricadas.

## 8. Acessibilidade, responsividade, motion e performance

- WCAG AA é piso, não acabamento opcional.
- Teclado, foco visível, nomes acessíveis, semântica e contraste devem sobreviver ao refinamento visual.
- A interface deve funcionar em desktop e em viewport móvel real (incluindo Capacitor/Android), respeitando safe areas e o breakpoint de navegação existente.
- Motion deve ser funcional, limitado e compatível com `prefers-reduced-motion`.
- Mudanças não podem introduzir renderização contínua, dependências ou mídia pesada sem orçamento e fallback apropriados.

## 9. Pipeline obrigatório das skills

As skills são executadas **sequencialmente**, nunca como dois editores concorrentes:

1. **Preparação:** ler esta constituição, o Brandbook vigente, os tokens, a tela vizinha e os requisitos funcionais.
2. **Criação/refinamento:** um único agente/editor aplica `frontend-design`, subordinado às autoridades das seções 1–8.
3. **Estabilização:** concluir a alteração e produzir diff estável; nenhum segundo agente edita os mesmos arquivos.
4. **Auditoria:** aplicar `web-design-guidelines` sobre o diff e a interface renderizada, em modo somente revisão.
5. **Remediação:** o dono original incorpora achados aceitos; o auditor não disputa autoria do mesmo arquivo em paralelo.
6. **Validação:** executar typecheck, lint, testes aplicáveis, build, acessibilidade e regressão visual em light/dark e desktop/mobile.

Se uma skill estiver ausente, sem origem verificável ou sem documentação legível, o estágio correspondente fica **bloqueado**. É proibido simular a skill, inventar comandos ou declarar a auditoria concluída.

## 10. Critério para decisões e exceções

Toda exceção visual deve registrar:

- objetivo da tela e tarefa do usuário;
- evidência de conteúdo/estado real;
- regra excepcionada;
- motivo pelo qual os tokens/componentes existentes não resolvem;
- impacto nos dois temas, mobile, acessibilidade e performance;
- validação executada.

Preferência estética isolada não é justificativa. Na dúvida, preservar o comportamento e escalar a decisão ao dono do domínio.
