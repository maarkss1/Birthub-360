# -*- coding: utf-8 -*-
"""Fonte única de verdade das Ondas Pós-09 do Birth Hub 360."""

VERSAO = "2.0"

TRILHAS = [
    ("T0", "FUNDAÇÃO E CONTROLE", ["AC", "J", "H", "AF"],
     "Nada acima disso é confiável se a base de segurança, dados e release estiver frouxa."),
    ("T1", "RECEITA REAL", ["A", "B", "P", "AA", "M"],
     "Transformar o produto em algo que vende, cobra, recebe e reconhece receita de verdade."),
    ("T2", "CONFIABILIDADE", ["D", "AB", "I", "AG"],
     "Sobreviver a falhas, integrações instáveis e canais de comunicação hostis."),
    ("T3", "IA E AUTOMAÇÃO", ["N", "AD", "C", "O", "K", "W"],
     "Sair de prompt guardado para runtime de agentes governado, seguro e mensurável."),
    ("T4", "QUALIDADE E GOVERNANÇA", ["Q", "S"],
     "Congelar o que já funciona em contratos automatizados e num plano de controle auditável."),
    ("T5", "EXPERIÊNCIA E ESCALA", ["E", "AE", "R", "F", "T", "L", "V", "Y"],
     "Elevar a experiência, medir adoção e aguentar crescimento sem degradar."),
    ("T6", "PLATAFORMA E CRESCIMENTO", ["G", "U", "X", "AH"],
     "Abrir a plataforma, experimentar com controle e entender a margem real."),
    ("T7", "CERTIFICAÇÃO", ["Z"],
     "Provar que o conjunto é comercializável, operável e demonstrável."),
]

WAVES = {}


def w(**kw):
    WAVES[kw["id"]] = kw


# ---------------------------------------------------------------- A
w(
    id="A",
    slug="JORNADA_COMERCIAL_100PCT_REAL",
    titulo="JORNADA COMERCIAL 100% REAL",
    prioridade="P1",
    trilha="T1",
    missao="Fechar a jornada Lead → Receita → CS ponta a ponta, sem um único stub silencioso em caminho crítico.",
    porque_agora="É a onda que separa 'demo bonita' de 'produto vendável'. Todas as ondas comerciais seguintes (B, P, AA, M, V) herdam os contratos definidos aqui.",
    resultado_observavel=[
        "Num tenant de teste, um lead criado do zero chega a receita reconhecida e handoff de CS com timeline auditável e IDs rastreáveis fim a fim.",
        "Existe uma lista pública e nomeada de todo stub/mock remanescente no caminho comercial — nenhum stub é 'descoberto depois'.",
        "Um cético consegue rodar um comando e ver a jornada inteira passar ou falhar.",
    ],
    escopo=[
        "Lead e enriquecimento (incluindo provedores pagos em modo hybrid)",
        "Qualificação: ICP, score, motivos legíveis",
        "Cadência multicanal e regras de parada",
        "Contato, reunião e registro de atividade",
        "Oportunidade e pipeline com transições explícitas",
        "Proposta: geração, versionamento, envio",
        "Assinatura eletrônica e prova de aceite",
        "Pagamento e confirmação",
        "Reconhecimento de receita (contrato mínimo com a Onda P)",
        "Handoff para CS com ownership real",
        "Inventário de stubs, mocks, TODOs e feature flags do caminho comercial",
        "Idempotência e auditoria de toda transição crítica",
    ],
    fora_de_escopo=[
        "Redesenho visual da interface (Onda E)",
        "Motor completo de billing, dunning e conciliação (Onda P)",
        "Modelo estatístico de forecast (Onda M)",
        "Nota fiscal e obrigações fiscais brasileiras (Onda AA)",
    ],
    depende_de=["J", "H"],
    habilita=["B", "P", "M", "V", "Z"],
    criterios=[
        "Existe `docs/waves/post-09/ONDA_A_STUB_INVENTORY.md` com uma linha por stub/mock/TODO em caminho comercial: arquivo:linha, o que finge fazer, impacto, decisão (implementar / remover / aceitar sob feature flag documentada).",
        "Existe teste E2E (Playwright) que percorre Lead → Receita → CS num tenant descartável e **falha** se qualquer passo for servido por mock.",
        "Toda transição de estágio grava auditoria com tenant_id, actor, from, to, motivo e correlation_id — comprovado por query SQL anexada ao relatório.",
        "Reenviar a mesma transição com a mesma idempotency key não duplica oportunidade, proposta ou cobrança — comprovado por teste automatizado.",
        "Sem credencial de provedor, nenhum endpoint da jornada devolve 200 com payload sintético: devolve erro tipado e o registro fica em estado explícito visível na interface.",
        "O handoff para CS cria registro real no domínio de CS com owner atribuído — query anexada.",
        "Teste negativo cross-tenant por rota da jornada: usuário do tenant B não lê nem escreve objeto do tenant A.",
    ],
    metricas=[
        "Stubs em caminho crítico (alvo: 0, ou 100% sob flag documentada)",
        "% de passos da jornada com cobertura E2E",
        "Transições críticas sem registro de auditoria (alvo: 0)",
        "Tempo de execução do E2E de jornada (registrar baseline, não inventar alvo)",
    ],
    armadilhas=[
        "Tratar tela existente como prova de backend funcional.",
        "'Modo demo' que devolve dado fake também em produção.",
        "Idempotência implementada só no frontend (botão desabilitado).",
        "Handoff de CS que apenas troca um enum e não cria trabalho para ninguém.",
        "Enriquecimento que 'sempre funciona' porque cai em fallback silencioso.",
    ],
    artefatos=[
        "docs/waves/post-09/ONDA_A_DISCOVERY.md",
        "docs/waves/post-09/ONDA_A_STUB_INVENTORY.md",
        "docs/waves/post-09/ONDA_A_REPORT.md",
        "tests/e2e/journey/ (specs Playwright da jornada)",
    ],
    comandos=[
        "rg -n \"TODO|FIXME|HACK|mock|stub|fake|dummy\" src/features src/services server",
        "npx playwright test tests/e2e/journey",
        "npx vitest run --reporter=verbose",
    ],
)

# ---------------------------------------------------------------- B
w(
    id="B",
    slug="SAAS_PLANOS_ASSINATURAS_E_ENTITLEMENTS",
    titulo="SAAS, PLANOS, ASSINATURAS E ENTITLEMENTS",
    prioridade="P1",
    trilha="T1",
    missao="Construir a camada comercial SaaS: planos, assinaturas, limites e entitlements aplicados no servidor.",
    porque_agora="Sem entitlement server-side não existe plano — existe sugestão. Billing (P) e marketplace (U) dependem deste contrato.",
    resultado_observavel=[
        "Downgrade de plano bloqueia imediatamente a capacidade removida, no servidor, sem depender do frontend.",
        "Cada limite (seats, execuções de IA, contatos, integrações) tem contador observável e comportamento definido no estouro.",
        "Uma mudança de plano é auditável: quem, quando, de onde, com que efeito.",
    ],
    escopo=[
        "Catálogo de planos e features versionado",
        "Assinatura, ciclo, trial, upgrade, downgrade, cancelamento",
        "Entitlements avaliados no servidor em toda rota protegida",
        "Quotas, contadores de uso e comportamento de estouro (bloquear, degradar, cobrar overage)",
        "Seats e convites",
        "Feature gating na interface derivado da mesma fonte do servidor",
        "Período de carência e efeito retroativo de downgrade",
    ],
    fora_de_escopo=[
        "Emissão de cobrança e conciliação financeira (Onda P)",
        "Nota fiscal (Onda AA)",
        "Experimentos de precificação (Onda X)",
    ],
    depende_de=["A", "J"],
    habilita=["P", "U", "X", "AH"],
    criterios=[
        "Existe uma única função/serviço de autorização de entitlement no servidor; nenhuma rota protegida decide acesso por conta própria — comprovado por varredura de código no relatório.",
        "Teste automatizado: usuário em plano sem a feature recebe 402/403 tipado ao chamar a rota diretamente, mesmo com a interface escondendo o botão.",
        "Teste de downgrade: após rebaixar o plano, o acesso removido é negado no próximo request, sem restart e sem depender de cache com TTL longo (ou o TTL é documentado e testado).",
        "Todo limite quantitativo tem contador persistido, consulta de uso atual e teste de comportamento no estouro.",
        "Mudança de plano gera evento de auditoria imutável com actor, origem e diff de entitlements.",
        "Catálogo de planos é dado versionado (não constante espalhada no código) e existe migration para alterá-lo.",
        "Cross-tenant: contadores de uso de um tenant nunca são lidos ou decrementados por outro — teste negativo.",
    ],
    metricas=[
        "Rotas protegidas que não passam pelo serviço central de entitlement (alvo: 0)",
        "Cobertura de teste de negação por feature (alvo: 100% das features pagas)",
        "Latência adicionada pela checagem de entitlement (registrar baseline)",
    ],
    armadilhas=[
        "Gating só no frontend.",
        "Cache de entitlement sem invalidação na troca de plano.",
        "Trial que vira plano pago por ausência de job, não por decisão.",
        "Contador de uso reiniciado por deploy porque vive em memória.",
    ],
    artefatos=[
        "docs/waves/post-09/ONDA_B_DISCOVERY.md",
        "docs/waves/post-09/ONDA_B_REPORT.md",
        "docs/product/ENTITLEMENTS.md (matriz plano × feature × limite)",
        "prisma/migrations/ (catálogo de planos e assinaturas)",
    ],
    comandos=[
        "npx prisma migrate status",
        "npx vitest run src/**/entitlement*",
        "rg -n \"plan|entitlement|quota|seat\" src/services server --stats",
    ],
)

# ---------------------------------------------------------------- C
w(
    id="C",
    slug="IA_CONTEXTUAL_E_EXECUTIVA",
    titulo="IA CONTEXTUAL E EXECUTIVA",
    prioridade="P1",
    trilha="T3",
    missao="Fazer a IA operar sobre contexto real do tenant, citar evidência e propor ações aprováveis em vez de texto solto.",
    porque_agora="IA sem contexto e sem ação é chat caro. Depende do runtime da Onda N e das defesas da Onda AD.",
    resultado_observavel=[
        "Toda resposta de IA com afirmação factual sobre dados do cliente traz referência rastreável ao registro de origem.",
        "Ação proposta pela IA aparece como proposta revisável, com diff, custo e botão de aprovar/rejeitar — nunca como efeito colateral invisível.",
        "É possível reproduzir uma resposta antiga: modelo, prompt, contexto recuperado e versão ficam registrados.",
    ],
    escopo=[
        "Montagem de contexto por tenant com orçamento de tokens explícito",
        "Citação de evidência (id do registro, não paráfrase)",
        "Ações propostas: schema tipado, preview, dry-run, aprovação humana",
        "Registro de execução: modelo, versão de prompt, contexto, custo, latência",
        "Degradação: comportamento quando o gateway de IA cai (LiteLLM → fallback)",
        "Política de abstenção: quando a IA deve dizer que não sabe",
    ],
    fora_de_escopo=[
        "Qualidade de recuperação e chunking do RAG (Onda K)",
        "Defesa contra prompt injection e red-team (Onda AD)",
        "Custo e observabilidade agregada de IA (Onda W)",
    ],
    depende_de=["N", "H"],
    habilita=["K", "W", "Y"],
    criterios=[
        "Nenhuma resposta de IA sobre dados do cliente é emitida sem lista de fontes com identificadores consultáveis; teste automatizado verifica presença e validade dos ids.",
        "Toda ação executável proposta pela IA passa por um envelope tipado e validado; execução sem aprovação é impossível para ações classificadas como alto impacto.",
        "Existe registro persistido por execução com: tenant, usuário, modelo, versão do prompt, ids do contexto, tokens, custo, latência e resultado.",
        "Teste de isolamento: contexto montado para o tenant A nunca inclui registro do tenant B, inclusive em cache e em busca vetorial.",
        "Teste de degradação: com o gateway de IA indisponível, a interface mostra estado degradado explícito e não inventa resposta.",
        "Existe conjunto mínimo de casos de abstenção onde a resposta correta é 'não há dado suficiente' — verificado por eval automatizada.",
    ],
    metricas=[
        "% de respostas factuais com citação válida (alvo: 100%)",
        "% de ações de alto impacto executadas sem aprovação (alvo: 0)",
        "Custo médio por execução por tipo de tarefa (baseline)",
        "Taxa de abstenção correta no conjunto dourado",
    ],
    armadilhas=[
        "Citação que aponta para um documento genérico em vez do registro exato.",
        "Ação 'aprovada' por padrão porque o usuário só viu um toast.",
        "Contexto montado a partir de cache global compartilhado entre tenants.",
        "Fallback que troca de modelo silenciosamente e muda o comportamento sem registro.",
    ],
    artefatos=[
        "docs/waves/post-09/ONDA_C_DISCOVERY.md",
        "docs/waves/post-09/ONDA_C_REPORT.md",
        "docs/ai/CONTEXT_CONTRACT.md",
        "tests/evals/ (conjunto dourado de casos)",
    ],
    comandos=[
        "npx vitest run tests/evals",
        "rg -n \"litellm|LITELLM_URL|GROQ_API_KEY\" src server --stats",
    ],
)

# ---------------------------------------------------------------- D
w(
    id="D",
    slug="PRODUCTION_HARDENING_E_DISASTER_RECOVERY",
    titulo="PRODUCTION HARDENING & DISASTER RECOVERY",
    prioridade="P1",
    trilha="T2",
    missao="Provar recuperação diante de falhas reais e perda controlada de componentes — com restore executado, não documentado.",
    porque_agora="Backup não testado é superstição. Antes de escalar (R) e antes de vender (Z), é preciso saber quanto tempo custa voltar.",
    resultado_observavel=[
        "Existe um restore de banco executado em ambiente isolado, com tempo medido e evidência anexada.",
        "Derrubar Redis, fila, provedor de IA ou provedor externo não derruba o produto inteiro — o comportamento degradado é conhecido e testado.",
        "Existe RPO e RTO declarados por componente, com o número medido ao lado do número prometido.",
    ],
    escopo=[
        "Backup: escopo, frequência, retenção, criptografia e teste de restore",
        "RPO/RTO por componente com medição real",
        "Degradação controlada por dependência (banco, cache, fila, storage, IA, provedores)",
        "Timeouts, circuit breakers e bulkheads nas bordas",
        "Health checks reais (liveness vs readiness) e probes no k8s/Helm",
        "Runbooks de recuperação executáveis",
        "Game day: exercício de falha com registro",
    ],
    fora_de_escopo=[
        "Tuning de performance e capacidade (Onda R)",
        "Alerting, on-call e postmortem (Onda AB)",
        "Confiabilidade específica de integrações externas (Onda I)",
    ],
    depende_de=["AC", "J"],
    habilita=["AB", "R", "Z"],
    criterios=[
        "Restore completo do banco executado em ambiente isolado com dump real anonimizado; log do processo, tempo total e verificação de integridade anexados ao relatório.",
        "Para cada dependência externa crítica existe um teste (unit/integration) que simula indisponibilidade e verifica o comportamento degradado esperado.",
        "Readiness e liveness são distintos e readiness reflete dependências obrigatórias — comprovado por manifesto e por teste.",
        "Toda chamada de saída tem timeout explícito; varredura mostra zero chamadas HTTP sem timeout configurado.",
        "Existe runbook por cenário (perda de banco, fila travada, gateway de IA fora, vazamento de credencial) com comandos exatos, validado por execução ao menos em dry-run.",
        "RPO e RTO declarados por componente em documento, com a medição correspondente e a lacuna nomeada quando existir.",
    ],
    metricas=[
        "RTO medido vs prometido por componente",
        "RPO medido vs prometido",
        "Dependências externas sem teste de falha (alvo: 0)",
        "Chamadas de saída sem timeout (alvo: 0)",
    ],
    armadilhas=[
        "Backup existente mas nunca restaurado.",
        "Readiness que sempre retorna 200 e mantém tráfego indo para instância quebrada.",
        "Circuit breaker configurado e nunca exercitado.",
        "Runbook escrito em prosa sem comando reproduzível.",
    ],
    artefatos=[
        "docs/waves/post-09/ONDA_D_DISCOVERY.md",
        "docs/waves/post-09/ONDA_D_REPORT.md",
        "docs/runbooks/",
        "docs/sre/RPO_RTO.md",
    ],
    comandos=[
        "rg -n \"fetch\\(|axios|undici|http\\.request\" src server -A2 | rg -v \"timeout\"",
        "kubectl get deploy -o yaml | rg -n \"readinessProbe|livenessProbe\"",
        "npx vitest run --config vitest.container.config.ts",
    ],
)

# ---------------------------------------------------------------- E
w(
    id="E",
    slug="UX_TOTAL_MOBILE_E_ACESSIBILIDADE",
    titulo="UX TOTAL, MOBILE E ACESSIBILIDADE",
    prioridade="P2",
    trilha="T5",
    missao="Elevar toda a interface a um padrão coerente de marca, utilizável em mobile e acessível de fato.",
    porque_agora="A interface é o que o cliente vê primeiro. Com Capacitor (android/ios) no repositório, mobile deixou de ser hipótese.",
    resultado_observavel=[
        "Nenhuma tela principal quebra em 360px de largura.",
        "Auditoria automatizada de acessibilidade roda no CI e falha em violação séria.",
        "Estados vazio, carregando, erro e sem permissão existem em todas as telas principais — não apenas no caminho feliz.",
    ],
    escopo=[
        "Inventário de telas e estados (vazio, carregando, erro, parcial, sem permissão, offline)",
        "Design tokens alinhados à BrandConstitution e identidade visual do repositório",
        "Responsividade real e navegação mobile (Capacitor)",
        "Acessibilidade: contraste, foco visível, navegação por teclado, rótulos, leitores de tela",
        "Consistência de componentes via Storybook",
        "Microcópia em pt-BR revisada",
    ],
    fora_de_escopo=[
        "Tradução e localização multilíngue (Onda AE)",
        "Onboarding e ativação (Onda T)",
        "Performance de runtime (Onda R)",
    ],
    depende_de=["A"],
    habilita=["T", "F", "Z"],
    criterios=[
        "Auditoria de acessibilidade automatizada (axe via Playwright) integrada ao CI, falhando em violações de severidade séria ou crítica nas telas principais.",
        "Toda tela principal tem os cinco estados implementados e capturados em Storybook ou em teste de regressão visual.",
        "Navegação completa por teclado nas jornadas críticas, com foco visível — verificado por teste automatizado.",
        "Nenhuma cor ou espaçamento hardcoded fora dos tokens nas telas tocadas por esta onda — verificado por lint/varredura.",
        "Build mobile (Capacitor) gera artefato executável e a jornada crítica é validada em viewport mobile.",
        "Zero referência visual ou textual a AtlasGR / Total Trac na interface — varredura anexada.",
    ],
    metricas=[
        "Violações sérias/críticas de acessibilidade (alvo: 0 nas telas principais)",
        "% de telas principais com os 5 estados",
        "Componentes duplicados no design system (tendência de queda)",
    ],
    armadilhas=[
        "Acessibilidade tratada como `aria-label` em tudo, inclusive onde atrapalha.",
        "Responsividade testada apenas encolhendo a janela no desktop.",
        "Refactor visual grande rodando junto com mudança estrutural de navegação.",
    ],
    artefatos=[
        "docs/waves/post-09/ONDA_E_DISCOVERY.md",
        "docs/waves/post-09/ONDA_E_REPORT.md",
        "docs/design/INVENTARIO_TELAS.md",
        ".storybook/ (histórias dos estados)",
    ],
    comandos=[
        "npx playwright test tests/a11y",
        "npm run build",
        "rg -ni \"atlasgr|total trac\" src public index.html",
    ],
)

# ---------------------------------------------------------------- F
w(
    id="F",
    slug="PRODUCT_ANALYTICS_E_CUSTOMER_SUCCESS",
    titulo="PRODUCT ANALYTICS & CUSTOMER SUCCESS",
    prioridade="P2",
    trilha="T5",
    missao="Instrumentar ativação, adoção, retenção e valor com um dicionário de eventos que não muda de sentido a cada release.",
    porque_agora="Sem eventos confiáveis, CS (V), onboarding (T) e experimentação (X) tomam decisão com achismo.",
    resultado_observavel=[
        "Existe um dicionário de eventos versionado; evento fora do dicionário falha no CI.",
        "É possível responder, com uma consulta, quantos tenants atingiram o primeiro valor nos últimos 30 dias.",
        "Nenhum evento carrega PII fora do que foi explicitamente permitido.",
    ],
    escopo=[
        "Dicionário de eventos: nome, propriedades, tipos, dono, versão",
        "Definição escrita de ativação e de 'primeiro valor'",
        "Funis de ativação, adoção por feature e retenção",
        "Health score de conta com fórmula explicada",
        "Pipeline de eventos com garantia de entrega e deduplicação",
        "Governança de PII nos eventos",
    ],
    fora_de_escopo=[
        "Playbooks de CS e expansão (Onda V)",
        "Experimentos e flags (Onda X)",
        "Painéis executivos (Onda Y)",
    ],
    depende_de=["H", "B"],
    habilita=["T", "V", "X", "Y"],
    criterios=[
        "Dicionário de eventos existe como arquivo tipado no repositório; emissão de evento não declarado falha no typecheck ou em teste.",
        "Definição de ativação está escrita, versionada e implementada numa única consulta reprodutível anexada ao relatório.",
        "Eventos são idempotentes por chave; reenvio não duplica métrica — teste automatizado.",
        "Validação automatizada garante que nenhum evento envia campo classificado como PII sem base declarada.",
        "Todo evento carrega tenant_id e é isolado por tenant na leitura — teste negativo cross-tenant.",
        "Health score tem fórmula documentada com pesos e é reproduzível a partir de dados brutos.",
    ],
    metricas=[
        "Eventos emitidos fora do dicionário (alvo: 0)",
        "Taxa de perda no pipeline de eventos (baseline medido)",
        "% de features com evento de adoção",
    ],
    armadilhas=[
        "Nomes de evento inventados por tela.",
        "Health score com pesos mágicos que ninguém consegue explicar ao cliente.",
        "PII vazando em propriedade livre do tipo `metadata`.",
    ],
    artefatos=[
        "docs/waves/post-09/ONDA_F_DISCOVERY.md",
        "docs/waves/post-09/ONDA_F_REPORT.md",
        "src/analytics/events.ts (dicionário tipado)",
        "docs/analytics/DICIONARIO_EVENTOS.md",
    ],
    comandos=[
        "npx tsc --noEmit",
        "npx vitest run src/analytics",
    ],
)

# ---------------------------------------------------------------- G
w(
    id="G",
    slug="PLATFORM_API_E_ECOSYSTEM",
    titulo="PLATFORM API & ECOSYSTEM",
    prioridade="P2",
    trilha="T6",
    missao="Transformar o Birth Hub 360 em plataforma integrável: API pública versionada, webhooks confiáveis e chaves gerenciáveis.",
    porque_agora="Integração é requisito de compra em B2B. Marketplace (U) e extensões dependem deste contrato.",
    resultado_observavel=[
        "Existe especificação OpenAPI gerada a partir do código, não escrita à mão.",
        "Um cliente externo consegue autenticar, paginar, tratar rate limit e receber webhook assinado usando só a documentação pública.",
        "Mudança incompatível na API quebra o CI antes de quebrar o cliente.",
    ],
    escopo=[
        "Versionamento de API e política de depreciação",
        "Autenticação por API key / OAuth com escopos por tenant",
        "Rate limiting e quotas por chave",
        "Paginação, filtros e ordenação consistentes",
        "Webhooks de saída: assinatura, retry, dead letter, reenvio manual",
        "Especificação OpenAPI gerada e testes de contrato",
        "Sandbox e chaves de teste",
    ],
    fora_de_escopo=[
        "Marketplace e extensões de terceiros (Onda U)",
        "Confiabilidade de integrações de entrada (Onda I)",
    ],
    depende_de=["J", "B", "I"],
    habilita=["U", "X"],
    criterios=[
        "Especificação OpenAPI é gerada a partir do código e validada no CI; divergência entre código e spec quebra o build.",
        "Existem testes de contrato que falham diante de mudança incompatível (remoção de campo, mudança de tipo, mudança de semântica de erro).",
        "Toda chave de API tem escopo, tenant, data de criação, último uso e revogação imediata — comprovado por teste.",
        "Rate limit devolve 429 com cabeçalhos de limite e reset, e é testado sob carga concorrente.",
        "Webhook de saída é assinado, tem retry com backoff, dead letter consultável e reenvio manual auditado — teste automatizado por cenário.",
        "Nenhum endpoint público permite acesso cross-tenant, inclusive por manipulação de id na URL — teste negativo por rota.",
    ],
    metricas=[
        "Cobertura de testes de contrato sobre endpoints públicos",
        "Taxa de entrega de webhook no primeiro envio (baseline)",
        "Endpoints públicos sem documentação gerada (alvo: 0)",
    ],
    armadilhas=[
        "OpenAPI escrito à mão e desatualizado no segundo release.",
        "API key sem escopo, valendo como chave mestra.",
        "Webhook sem assinatura, confiando no segredo da URL.",
    ],
    artefatos=[
        "docs/waves/post-09/ONDA_G_DISCOVERY.md",
        "docs/waves/post-09/ONDA_G_REPORT.md",
        "docs/api/openapi.json (gerado)",
        "tests/contract/",
    ],
    comandos=[
        "npx vitest run tests/contract",
        "rg -n \"router\\.(get|post|put|patch|delete)\" server src --stats",
    ],
)

# ---------------------------------------------------------------- H
w(
    id="H",
    slug="DATA_GOVERNANCE_E_MASTER_DATA",
    titulo="DATA GOVERNANCE & MASTER DATA",
    prioridade="P1",
    trilha="T0",
    missao="Criar verdade canônica para entidades centrais: identidade, deduplicação, linhagem e qualidade de dado.",
    porque_agora="Toda análise, IA e cobrança acima disso herda o erro daqui. Duplicata de conta vira duplicata de fatura.",
    resultado_observavel=[
        "Existe regra explícita de identidade para conta, contato e empresa — e a duplicação cai de forma medida.",
        "Para qualquer campo crítico é possível dizer de onde ele veio e quando.",
        "Dado obrigatório ausente é visível como problema, não preenchido com placeholder.",
    ],
    escopo=[
        "Modelo canônico das entidades centrais (conta, contato, empresa, oportunidade, produto)",
        "Chaves naturais, deduplicação e merge com histórico reversível",
        "Linhagem: origem, sistema, timestamp e confiança por campo",
        "Regras de qualidade e relatório de violações",
        "Normalização brasileira: CNPJ, CPF, telefone, CEP, UF",
        "Classificação de dados (público, interno, pessoal, sensível)",
        "Convenções de schema e política de migration",
    ],
    fora_de_escopo=[
        "Retenção, exclusão e portabilidade (Onda AF)",
        "Controles de acesso (Onda J)",
        "Modelagem analítica de receita (Onda M)",
    ],
    depende_de=["J"],
    habilita=["A", "B", "F", "K", "M", "AF"],
    criterios=[
        "Documento de modelo canônico existe e mapeia cada entidade central para tabela, chave natural e dono.",
        "Existe rotina de detecção de duplicatas com resultado medido antes e depois; o número de duplicatas candidatas está no relatório.",
        "Merge de registros preserva histórico e é reversível — teste automatizado de merge e undo.",
        "Campos críticos carregam origem e timestamp; consulta de linhagem demonstrada no relatório.",
        "Validadores de CNPJ/CPF/telefone/CEP rejeitam entradas inválidas com teste de casos reais e casos limite.",
        "Toda tabela com dado de tenant tem coluna de tenant e índice correspondente; varredura de schema anexada — exceções justificadas uma a uma.",
        "Nenhuma migration desta onda é destrutiva sem plano de rollback escrito e testado em cópia.",
    ],
    metricas=[
        "Duplicatas candidatas por entidade (antes/depois)",
        "% de campos críticos com linhagem",
        "Violações de regra de qualidade por execução (tendência)",
        "Tabelas multi-tenant sem coluna/índice de tenant (alvo: 0)",
    ],
    armadilhas=[
        "Deduplicação automática agressiva que funde clientes diferentes.",
        "Placeholder tipo 'não informado' virando valor canônico.",
        "Migration que renomeia coluna sem janela de compatibilidade.",
    ],
    artefatos=[
        "docs/waves/post-09/ONDA_H_DISCOVERY.md",
        "docs/waves/post-09/ONDA_H_REPORT.md",
        "docs/data/MODELO_CANONICO.md",
        "docs/data/CLASSIFICACAO_DADOS.md",
    ],
    comandos=[
        "npx prisma validate && npx prisma migrate status",
        "rg -n \"model \" prisma/schema.prisma | wc -l",
        "npx vitest run src/**/dedup* src/**/validators*",
    ],
)

# ---------------------------------------------------------------- I
w(
    id="I",
    slug="INTEGRATION_RELIABILITY_HUB",
    titulo="INTEGRATION RELIABILITY HUB",
    prioridade="P1",
    trilha="T2",
    missao="Tornar integrações um subsistema observável, recuperável e reprocessável — não um conjunto de chamadas espalhadas.",
    porque_agora="Bitrix24, Apollo, Hunter, Google Maps, gateway de IA: cada um falha de um jeito. Sem hub, cada falha vira incidente manual.",
    resultado_observavel=[
        "Existe uma tela ou consulta única que mostra o estado de saúde de cada integração por tenant.",
        "Um evento que falhou pode ser reprocessado sem efeito duplicado.",
        "Nenhuma credencial de integração aparece em log, erro ou payload de depuração.",
    ],
    escopo=[
        "Registro central de conectores: estado, credencial, escopo, última sincronização",
        "Envelope padrão de chamada: timeout, retry com backoff e jitter, idempotência, correlação",
        "Fila, dead letter e reprocessamento auditado",
        "Webhooks de entrada: verificação de assinatura, replay protection, deduplicação",
        "Mapeamento de erro do provedor para erro de domínio",
        "Rotação e expiração de credenciais",
        "Observabilidade por integração (sucesso, latência, erro por causa)",
    ],
    fora_de_escopo=[
        "API pública de saída (Onda G)",
        "Deliverability de e-mail e WhatsApp (Onda AG)",
        "Alerting e on-call (Onda AB)",
    ],
    depende_de=["J", "D"],
    habilita=["A", "G", "L", "AG"],
    criterios=[
        "Toda integração externa passa por um cliente único com timeout, retry e correlação; varredura mostra zero chamadas fora do envelope.",
        "Retry só ocorre em erro seguro para repetição; operação não idempotente exige chave de idempotência — teste por cenário.",
        "Existe dead letter consultável por tenant e integração, com reprocessamento que não duplica efeito — teste automatizado.",
        "Webhook de entrada valida assinatura e rejeita replay fora da janela — teste com payload adulterado e com payload repetido.",
        "Falha de credencial produz estado explícito e acionável na interface, não erro genérico.",
        "Nenhum segredo, token ou PII aparece em log — verificado por gitleaks e por teste que inspeciona saída de log em caso de erro.",
    ],
    metricas=[
        "Taxa de sucesso por integração (baseline por provedor)",
        "Itens em dead letter por dia",
        "Chamadas externas fora do envelope padrão (alvo: 0)",
        "Tempo médio para reprocessar lote",
    ],
    armadilhas=[
        "Retry em erro 4xx de validação, multiplicando lixo.",
        "Reprocessamento que reenvia e-mail ao cliente final.",
        "Webhook aceito porque 'a URL é secreta'.",
        "Token de integração logado no corpo do erro do provedor.",
    ],
    artefatos=[
        "docs/waves/post-09/ONDA_I_DISCOVERY.md",
        "docs/waves/post-09/ONDA_I_REPORT.md",
        "docs/integrations/CATALOGO_CONECTORES.md",
    ],
    comandos=[
        "gitleaks detect --config .gitleaks.toml --no-git",
        "npx vitest run src/**/integrations*",
        "rg -n \"BITRIX24_WEBHOOK_URL|APOLLO_API_KEY|HUNTER_API_KEY|GOOGLE_MAPS_API_KEY\" src server",
    ],
)

# ---------------------------------------------------------------- J
w(
    id="J",
    slug="SECURITY_ZERO_TRUST_E_COMPLIANCE",
    titulo="SECURITY ZERO TRUST & COMPLIANCE",
    prioridade="P1",
    trilha="T0",
    missao="Endurecer autenticação, autorização, tenancy e LGPD para operação SaaS multi-tenant real.",
    porque_agora="É a onda de maior custo de correção tardia. Cada onda posterior escreve código que assume o modelo de tenancy definido aqui.",
    resultado_observavel=[
        "Existe um teste automatizado que tenta acessar todo recurso de um tenant com credencial de outro e falha o build se algum passar.",
        "Nenhuma decisão de autorização crítica depende do cliente.",
        "Há inventário de dado pessoal com base legal declarada por finalidade.",
    ],
    escopo=[
        "Modelo de identidade, sessão, MFA e rotação de senha/token",
        "Autorização server-side centralizada por recurso e ação",
        "Isolamento de tenant em banco, cache, fila, storage, busca vetorial e IA",
        "Gestão de segredos e ausência de credencial no repositório",
        "Cabeçalhos de segurança, CORS, CSRF, rate limit de autenticação",
        "Trilha de auditoria imutável de eventos sensíveis",
        "LGPD: inventário de dado pessoal, base legal, consentimento, DPA, resposta a titular",
        "Tratamento de vazamento: detecção, contenção, notificação",
    ],
    fora_de_escopo=[
        "Cadeia de suprimento e CI/CD (Onda AC)",
        "Segurança específica de agentes e prompt injection (Onda AD)",
        "Retenção e exclusão (Onda AF)",
    ],
    depende_de=["AC"],
    habilita=["A", "B", "H", "G", "S", "AF"],
    criterios=[
        "Existe suíte de testes cross-tenant que percorre automaticamente as rotas autenticadas com credencial do tenant errado; qualquer 200 indevido falha o CI.",
        "Autorização é avaliada no servidor em todas as rotas mutáveis; varredura anexada mostra zero rota mutável sem verificação.",
        "Chaves de cache, nomes de fila, prefixos de storage e coleções vetoriais incluem o tenant — verificado por teste e varredura.",
        "gitleaks roda no CI sem exceções silenciosas; toda entrada em `.gitleaksignore` tem justificativa datada.",
        "Sessão: expiração, revogação e invalidação em troca de senha comprovadas por teste.",
        "Inventário de dado pessoal existe com finalidade, base legal, retenção e destinatários por categoria.",
        "Fluxo de requisição de titular (acesso, correção, exclusão, portabilidade) existe com prazo e responsável definidos — mesmo que parcialmente manual, documentado como tal.",
        "Auditoria de eventos sensíveis é apenas-inserção; tentativa de alteração falha — teste automatizado.",
    ],
    metricas=[
        "Rotas mutáveis sem autorização server-side (alvo: 0)",
        "Cobertura de rotas na suíte cross-tenant (alvo: 100%)",
        "Achados de segredo no CI (alvo: 0)",
        "Vulnerabilidades críticas/altas abertas em dependências (alvo: 0)",
    ],
    armadilhas=[
        "Filtro de tenant aplicado no repositório, mas esquecido numa query raw.",
        "Autorização por papel sem verificação de posse do recurso.",
        "`.gitleaksignore` usado como vassoura.",
        "Índice vetorial compartilhado entre tenants 'porque é mais barato'.",
    ],
    artefatos=[
        "docs/waves/post-09/ONDA_J_DISCOVERY.md",
        "docs/waves/post-09/ONDA_J_REPORT.md",
        "docs/security/MODELO_TENANCY.md",
        "docs/legal/INVENTARIO_DADOS_PESSOAIS.md",
        "tests/security/cross-tenant/",
    ],
    comandos=[
        "npx vitest run tests/security",
        "gitleaks detect --config .gitleaks.toml",
        "npm audit --audit-level=high",
        "rg -n \"\\$queryRaw|\\$executeRaw\" src server",
    ],
)

# ---------------------------------------------------------------- K
w(
    id="K",
    slug="KNOWLEDGE_E_RAG_EXCELLENCE",
    titulo="KNOWLEDGE & RAG EXCELLENCE",
    prioridade="P2",
    trilha="T3",
    missao="Consolidar conhecimento e recuperação com qualidade medida, evidência rastreável e isolamento por tenant.",
    porque_agora="RAG sem avaliação é sorte. Com dois caminhos de embedding no repositório (LiteLLM e legado Gemini), o risco de inconsistência é real.",
    resultado_observavel=[
        "Existe conjunto dourado de perguntas com respostas esperadas e uma nota de recuperação medida e reproduzível.",
        "Trocar modelo de embedding não corrompe silenciosamente o índice.",
        "Documento removido some da recuperação imediatamente.",
    ],
    escopo=[
        "Ingestão: fontes, permissões, versão do documento, remoção",
        "Chunking e metadados com justificativa medida",
        "Estratégia de embedding única e versionada (fim do caminho duplicado)",
        "Recuperação: híbrida, reranking, filtro por tenant e por permissão",
        "Avaliação: conjunto dourado, recall@k, groundedness, taxa de citação inválida",
        "Reindexação e migração de índice",
    ],
    fora_de_escopo=[
        "Formatação das respostas e ações (Onda C)",
        "Defesa contra injeção via documento (Onda AD)",
        "Custo agregado de IA (Onda W)",
    ],
    depende_de=["H", "C"],
    habilita=["C", "W", "L"],
    criterios=[
        "Existe conjunto dourado versionado no repositório com no mínimo 30 casos cobrindo acertos, ambiguidade e ausência de resposta.",
        "Avaliação automatizada roda por comando e publica métricas; regressão além do limiar definido falha o CI.",
        "Versão de modelo de embedding está registrada por vetor; consulta que mistura versões é impossível ou explicitamente bloqueada.",
        "Exclusão de documento remove os vetores correspondentes — teste automatizado de ingestão, remoção e nova consulta.",
        "Recuperação filtra por tenant e por permissão do usuário; teste negativo com usuário sem acesso ao documento.",
        "O caminho legado de embedding foi removido ou está isolado atrás de flag com data de remoção declarada.",
    ],
    metricas=[
        "recall@k no conjunto dourado (baseline e alvo definidos após baseline)",
        "Taxa de citação inválida (alvo: 0)",
        "Vetores órfãos (alvo: 0)",
        "Custo e latência de ingestão por mil documentos",
    ],
    armadilhas=[
        "Avaliar o RAG com as mesmas perguntas usadas para ajustá-lo.",
        "Reindexar em produção sem estratégia de índice paralelo.",
        "Chunk que corta a tabela ao meio e destrói o sentido.",
        "Documento privado recuperado porque a permissão é checada só na renderização.",
    ],
    artefatos=[
        "docs/waves/post-09/ONDA_K_DISCOVERY.md",
        "docs/waves/post-09/ONDA_K_REPORT.md",
        "tests/evals/rag/ (conjunto dourado)",
        "docs/ai/RAG_ARCHITECTURE.md",
    ],
    comandos=[
        "npx vitest run tests/evals/rag",
        "rg -n \"GEMINI_API_KEY|embedding\" src server --stats",
    ],
)

# ---------------------------------------------------------------- L
w(
    id="L",
    slug="VOICE_E_OMNICHANNEL",
    titulo="VOICE & OMNICHANNEL",
    prioridade="P2",
    trilha="T5",
    missao="Unificar voz, e-mail, WhatsApp e telefonia numa timeline operacional única por conta e contato.",
    porque_agora="Canal fragmentado gera duplicidade de contato com o mesmo cliente — o erro mais caro em operação comercial.",
    resultado_observavel=[
        "Abrir um contato mostra todas as interações de todos os canais em ordem, com origem identificada.",
        "Uma conversa iniciada num canal e continuada em outro não vira dois registros.",
        "Consentimento e opt-out valem em todos os canais ao mesmo tempo.",
    ],
    escopo=[
        "Modelo unificado de conversa, mensagem, participante e canal",
        "Resolução de identidade entre canais (telefone, e-mail, id de plataforma)",
        "Timeline única com ordenação e deduplicação",
        "Gravação, transcrição e resumo de chamada com consentimento",
        "Regras de janela, template e opt-out por canal",
        "Roteamento, filas de atendimento e disponibilidade",
    ],
    fora_de_escopo=[
        "Deliverability, reputação de domínio e aprovação de template (Onda AG)",
        "Confiabilidade das integrações de canal (Onda I)",
    ],
    depende_de=["H", "I"],
    habilita=["V", "AG"],
    criterios=[
        "Existe modelo único de conversa; nenhum canal grava em tabela própria paralela — schema anexado.",
        "Mensagem duplicada pelo provedor não duplica na timeline — teste com webhook repetido.",
        "Opt-out registrado em qualquer canal bloqueia envio nos demais canais aplicáveis — teste automatizado.",
        "Gravação e transcrição só ocorrem com consentimento registrado; sem consentimento, o sistema recusa e registra o motivo.",
        "Transcrição e resumo trazem referência ao trecho de origem quando afirmam fato.",
        "Timeline isolada por tenant; teste negativo cross-tenant por conversa.",
    ],
    metricas=[
        "Conversas duplicadas por identidade (alvo: tendência a 0)",
        "% de interações com canal e origem identificados",
        "Violações de opt-out (alvo: 0)",
    ],
    armadilhas=[
        "Resolver identidade só por e-mail e fundir pessoas homônimas.",
        "Gravar chamada sem aviso.",
        "Timeline ordenada pelo horário de ingestão em vez do horário do evento.",
    ],
    artefatos=[
        "docs/waves/post-09/ONDA_L_DISCOVERY.md",
        "docs/waves/post-09/ONDA_L_REPORT.md",
        "docs/product/TIMELINE_OMNICHANNEL.md",
    ],
    comandos=[
        "npx vitest run src/**/conversation* src/**/channel*",
    ],
)

# ---------------------------------------------------------------- M
w(
    id="M",
    slug="FORECAST_E_REVENUE_SCIENCE",
    titulo="FORECAST & REVENUE SCIENCE",
    prioridade="P1",
    trilha="T1",
    missao="Tornar forecast e revenue intelligence explicáveis, reproduzíveis e comparáveis contra o resultado real.",
    porque_agora="Forecast que ninguém consegue explicar não é usado em reunião de diretoria — e forecast que nunca é comparado com o real nunca melhora.",
    resultado_observavel=[
        "Qualquer número previsto pode ser aberto e explicado em termos de negócios, não de parâmetros de modelo.",
        "Existe histórico congelado de previsões e o erro medido contra o realizado.",
        "Rodar o mesmo forecast duas vezes com o mesmo dado dá o mesmo resultado.",
    ],
    escopo=[
        "Definições de pipeline, estágio, probabilidade, commit e best case",
        "Snapshot imutável de pipeline por período",
        "Modelo de forecast com features documentadas",
        "Explicabilidade por oportunidade e por agregado",
        "Backtesting e medição de erro (MAPE/WAPE) por segmento",
        "Sinais de risco de deal com evidência",
    ],
    fora_de_escopo=[
        "Reconhecimento contábil de receita (Onda P)",
        "Painéis executivos (Onda Y)",
        "Custo e margem (Onda AH)",
    ],
    depende_de=["A", "H"],
    habilita=["Y", "V", "AH"],
    criterios=[
        "Snapshots de pipeline são imutáveis e datados; alterar um snapshot histórico é impossível — teste automatizado.",
        "Forecast é determinístico: mesma entrada e mesma versão produzem o mesmo resultado — teste de reprodutibilidade com semente fixa.",
        "Cada previsão expõe contribuição por fator em linguagem de negócio; nenhuma explicação usa apenas nome de variável.",
        "Existe backtest com no mínimo três períodos fechados e o erro está publicado, inclusive quando ruim.",
        "Nenhuma métrica de receita é calculada em mais de um lugar com fórmula diferente — varredura anexada.",
        "Sinais de risco de deal apontam para evidência consultável (atividade, e-mail, estágio parado), nunca para 'o modelo achou'.",
    ],
    metricas=[
        "Erro de forecast por período e por segmento (publicado)",
        "% de previsões com explicação legível",
        "Divergência entre fontes da mesma métrica (alvo: 0)",
    ],
    armadilhas=[
        "Recalcular o passado com o modelo de hoje e declarar precisão alta.",
        "Vazamento de informação futura nas features.",
        "Probabilidade por estágio tratada como probabilidade real sem calibração.",
    ],
    artefatos=[
        "docs/waves/post-09/ONDA_M_DISCOVERY.md",
        "docs/waves/post-09/ONDA_M_REPORT.md",
        "docs/revenue/DEFINICOES_METRICAS.md",
        "docs/revenue/BACKTEST.md",
    ],
    comandos=[
        "npx vitest run src/**/forecast*",
    ],
)

# ---------------------------------------------------------------- N
w(
    id="N",
    slug="AGENT_RUNTIME_E_ORCHESTRATION",
    titulo="AGENT RUNTIME & ORCHESTRATION",
    prioridade="P1",
    trilha="T3",
    missao="Evoluir agentes de catálogo para runtime seguro, observável e efetivamente capaz de agir.",
    porque_agora="Existem `.agents`, `AGENTS.md` e `skills-lock.json` no repositório. É a hora de provar que isso é runtime e não catálogo.",
    resultado_observavel=[
        "Cada agente declarado tem caminho de execução comprovado: recebe entrada, chama ferramenta real, produz efeito verificável.",
        "Um agente não consegue chamar ferramenta que não está na sua permissão — nem por instrução do usuário.",
        "Toda execução tem traço, custo e limite; execução sem limite não inicia.",
    ],
    escopo=[
        "Registro de agentes: versão, capacidades, ferramentas permitidas, política",
        "Vinculação de ferramentas com schema validado de entrada e saída",
        "Políticas: o que exige aprovação humana, o que é proibido, o que é automático",
        "Memória do agente com escopo por tenant e prazo de validade",
        "Delegação, supervisor e execução concorrente com limite",
        "Orçamento por execução: tokens, tempo, chamadas, custo",
        "Retry, cancelamento e execução parcial recuperável",
        "Tracing ponta a ponta da execução",
    ],
    fora_de_escopo=[
        "Ataques adversariais e red-team (Onda AD)",
        "Painéis de custo agregado (Onda W)",
        "Workflows determinísticos de negócio (Onda O)",
    ],
    depende_de=["J", "H"],
    habilita=["C", "O", "W", "AD", "U"],
    criterios=[
        "Existe teste que carrega cada agente do registro e falha se não houver caminho de execução real (não apenas prompt armazenado).",
        "Chamada a ferramenta fora da lista permitida é bloqueada no runtime e registrada — teste com tentativa explícita de escalada.",
        "Toda execução possui orçamento obrigatório; execução sem limite de tokens, tempo e custo é rejeitada na inicialização — teste automatizado.",
        "Ações classificadas como alto impacto exigem aprovação humana registrada; não existe caminho de código que as execute sem aprovação — varredura e teste.",
        "Memória do agente é isolada por tenant e por agente; teste negativo de leitura cruzada.",
        "Cancelamento interrompe a execução e deixa o estado consistente — teste de cancelamento no meio de uma cadeia de ferramentas.",
        "Cada execução gera traço com id correlacionável até a chamada de ferramenta e até o custo.",
    ],
    metricas=[
        "Agentes no registro sem caminho de execução (alvo: 0)",
        "Execuções sem orçamento (alvo: 0)",
        "Custo médio e p95 por tipo de execução",
        "Taxa de execução que termina em estado inconsistente (alvo: 0)",
    ],
    armadilhas=[
        "Agente que 'funciona' porque a ferramenta é um mock.",
        "Supervisor que reinicia a cadeia inteira e repete efeito colateral já aplicado.",
        "Memória de agente global servindo de canal entre tenants.",
        "Loop de delegação sem profundidade máxima.",
    ],
    artefatos=[
        "docs/waves/post-09/ONDA_N_DISCOVERY.md",
        "docs/waves/post-09/ONDA_N_REPORT.md",
        "docs/ai/AGENT_RUNTIME.md",
        "docs/ai/MATRIZ_AGENTE_FERRAMENTA.md",
    ],
    comandos=[
        "npx vitest run src/**/agent*",
        "rg -n \"tools|capabilities\" .agents AGENTS.md skills-lock.json",
    ],
)

# ---------------------------------------------------------------- O
w(
    id="O",
    slug="AUTOMATION_E_WORKFLOW_ENGINE",
    titulo="AUTOMATION & WORKFLOW ENGINE",
    prioridade="P1",
    trilha="T3",
    missao="Consolidar workflows duráveis, versionados e reprocessáveis, com efeito colateral controlado.",
    porque_agora="Automação comercial roda sem ninguém olhando. Se não for durável e idempotente, o erro chega ao cliente antes de chegar ao log.",
    resultado_observavel=[
        "Reiniciar o processo no meio de um workflow não duplica e-mail, cobrança ou atualização.",
        "Alterar um workflow não muda o comportamento das execuções já em andamento.",
        "Uma execução com erro pode ser retomada do passo que falhou.",
    ],
    escopo=[
        "Definição versionada de workflow e política de migração de versão",
        "Durabilidade: estado persistido, retomada após falha",
        "Idempotência por passo e por efeito externo",
        "Gatilhos: evento, agendamento, manual, webhook",
        "Compensação e rollback de passos com efeito externo",
        "Limites: concorrência, taxa, profundidade, timeout",
        "Simulação e dry-run antes de ativar",
    ],
    fora_de_escopo=[
        "Runtime de agentes (Onda N)",
        "Experimentos e rollout gradual (Onda X)",
    ],
    depende_de=["N", "I"],
    habilita=["V", "T", "AG"],
    criterios=[
        "Teste de durabilidade: matar o worker no meio da execução e retomar sem duplicar efeito externo — evidência de execução anexada.",
        "Execuções em andamento continuam na versão em que começaram; publicar nova versão não altera execução ativa — teste automatizado.",
        "Cada passo com efeito externo tem chave de idempotência derivada de dado estável, não de timestamp — verificado por revisão e teste.",
        "Existe dry-run que mostra os efeitos previstos sem aplicá-los, disponível para todo workflow com efeito externo.",
        "Limites de concorrência e profundidade são obrigatórios; workflow sem limite não ativa.",
        "Falha em passo compensável dispara compensação testada; a compensação também é idempotente.",
        "Workflows são isolados por tenant, inclusive nas filas — teste negativo.",
    ],
    metricas=[
        "Execuções duplicadas detectadas (alvo: 0)",
        "% de workflows com dry-run disponível",
        "Tempo médio de retomada após falha de worker",
        "Execuções presas (stuck) por dia",
    ],
    armadilhas=[
        "Idempotência baseada em timestamp.",
        "Compensação que assume que o passo externo ainda está reversível.",
        "Workflow que envia e-mail antes de persistir o estado.",
        "Agendador com fuso implícito do servidor.",
    ],
    artefatos=[
        "docs/waves/post-09/ONDA_O_DISCOVERY.md",
        "docs/waves/post-09/ONDA_O_REPORT.md",
        "docs/automation/WORKFLOW_ENGINE.md",
    ],
    comandos=[
        "npx vitest run --config vitest.container.config.ts src/**/workflow*",
    ],
)

# ---------------------------------------------------------------- P
w(
    id="P",
    slug="BILLING_FINANCE_E_REVENUE_OPS",
    titulo="BILLING, FINANCE & REVENUE OPS",
    prioridade="P1",
    trilha="T1",
    missao="Fechar venda → cobrança → recebimento → receita com conciliação que bate até o centavo.",
    porque_agora="É onde erro de software vira erro de dinheiro. E dinheiro errado é o defeito mais caro em confiança de cliente.",
    resultado_observavel=[
        "Existe relatório de conciliação entre o que foi cobrado, o que foi recebido e o que foi reconhecido, com divergências listadas nominalmente.",
        "Nenhum valor monetário é calculado em ponto flutuante.",
        "Uma cobrança duplicada é impossível por construção, não por vigilância.",
    ],
    escopo=[
        "Precificação, descontos, proração e crédito",
        "Ciclo de cobrança, tentativas e dunning",
        "Estados do pagamento e máquina de estados explícita",
        "Conciliação entre gateway, banco e registro interno",
        "Reembolso, estorno e chargeback",
        "Reconhecimento de receita e contratos de dado para contabilidade",
        "Auditoria financeira e imutabilidade de lançamento",
    ],
    fora_de_escopo=[
        "Nota fiscal, impostos e meios de pagamento brasileiros (Onda AA)",
        "Custo de infraestrutura e margem (Onda AH)",
        "Forecast de receita futura (Onda M)",
    ],
    depende_de=["B", "A", "H"],
    habilita=["AA", "AH", "Z"],
    criterios=[
        "Nenhum cálculo monetário usa float: varredura de código anexada mostra uso de inteiro em centavos ou decimal, inclusive no frontend.",
        "Toda operação de cobrança é idempotente por chave derivada de assinatura + período; teste de duplo disparo comprova ausência de dupla cobrança.",
        "Máquina de estados de pagamento é explícita e transições inválidas são rejeitadas — teste por transição.",
        "Existe relatório de conciliação reproduzível por comando, com divergências listadas e classificadas.",
        "Lançamentos financeiros são imutáveis; correção ocorre por lançamento compensatório, nunca por update — teste automatizado.",
        "Proração e crédito têm casos de teste com valores conferidos manualmente e documentados no relatório.",
        "Webhook de gateway valida assinatura, é idempotente e tolera chegada fora de ordem — teste com eventos embaralhados.",
    ],
    metricas=[
        "Divergência de conciliação por período (alvo: 0 não explicado)",
        "Cobranças duplicadas (alvo: 0)",
        "Taxa de sucesso de cobrança e recuperação por dunning",
        "Tempo de fechamento do período",
    ],
    armadilhas=[
        "Arredondamento diferente entre exibição, cobrança e contabilidade.",
        "Webhook de pagamento processado fora de ordem sobrescrevendo estado final.",
        "Reembolso parcial sem trilha do valor original.",
        "Moeda implícita.",
    ],
    artefatos=[
        "docs/waves/post-09/ONDA_P_DISCOVERY.md",
        "docs/waves/post-09/ONDA_P_REPORT.md",
        "docs/finance/CONCILIACAO.md",
        "docs/finance/MAQUINA_ESTADOS_PAGAMENTO.md",
    ],
    comandos=[
        "rg -n \"parseFloat|Number\\(|toFixed\" src/**/billing* src/**/payment* src/**/invoice*",
        "npx vitest run src/**/billing* src/**/payment*",
    ],
)

# ---------------------------------------------------------------- Q
w(
    id="Q",
    slug="QUALITY_ENGINEERING_E_TEST_FACTORY",
    titulo="QUALITY ENGINEERING & TEST FACTORY",
    prioridade="P1",
    trilha="T4",
    missao="Transformar os fluxos críticos em contratos automatizados de regressão que travam o CI quando quebram.",
    porque_agora="Com Vitest, Playwright, Storybook, knip, dependency-cruiser e Sonar já no repositório, falta transformar ferramenta em rede de proteção.",
    resultado_observavel=[
        "Existe uma lista explícita de fluxos críticos e cada um tem teste que falha quando o fluxo quebra.",
        "Teste instável é tratado como defeito com dono e prazo, não silenciado com skip.",
        "O CI é capaz de reprovar por motivo de produto, não só por lint.",
    ],
    escopo=[
        "Mapa de fluxos críticos e cobertura correspondente",
        "Pirâmide de testes: unidade, integração com container, contrato, E2E",
        "Fábrica de dados de teste e tenant descartável",
        "Testes negativos: autorização, cross-tenant, idempotência, falha de provedor",
        "Regressão visual e testes de acessibilidade",
        "Política de teste instável e de quarentena com prazo",
        "Gates de CI e tempo de execução",
    ],
    fora_de_escopo=[
        "Testes de carga e capacidade (Onda R)",
        "Evals de IA (Ondas K e AD)",
    ],
    depende_de=["A", "J"],
    habilita=["AC", "X", "Z"],
    criterios=[
        "Existe `docs/quality/FLUXOS_CRITICOS.md` listando os fluxos e o teste que protege cada um; fluxo sem teste é listado como dívida com prazo.",
        "Testes cross-tenant e de autorização rodam no CI como gate obrigatório.",
        "Nenhum `.skip`, `.only` ou teste desabilitado sem issue vinculada e data — verificado por varredura no CI.",
        "Existe fábrica de dados que cria e destrói tenant de teste completo por comando.",
        "Teste instável identificado entra em quarentena registrada com dono e prazo; quarentena sem prazo falha a auditoria.",
        "Tempo total do pipeline está medido e publicado; regressão de tempo acima do limite acordado é sinalizada.",
        "Cobertura é reportada por área crítica, não como número único de projeto.",
    ],
    metricas=[
        "Fluxos críticos sem teste (alvo: 0)",
        "Testes em quarentena e idade média (tendência de queda)",
        "Tempo do pipeline (baseline e limite)",
        "Taxa de falha intermitente por semana",
    ],
    armadilhas=[
        "Aumentar cobertura testando getter.",
        "Enfraquecer asserção para o teste passar.",
        "Deletar teste que 'não faz sentido' sem registrar por quê.",
        "E2E dependente de dado de produção.",
    ],
    artefatos=[
        "docs/waves/post-09/ONDA_Q_DISCOVERY.md",
        "docs/waves/post-09/ONDA_Q_REPORT.md",
        "docs/quality/FLUXOS_CRITICOS.md",
        "docs/quality/POLITICA_TESTE_INSTAVEL.md",
    ],
    comandos=[
        "rg -n \"\\.skip\\(|\\.only\\(|xit\\(|xdescribe\\(\" tests src",
        "npx vitest run --coverage",
        "npx playwright test --reporter=list",
        "npx knip && npx depcruise --config .dependency-cruiser.cjs src",
    ],
)

# ---------------------------------------------------------------- R
w(
    id="R",
    slug="PERFORMANCE_E_SCALABILITY",
    titulo="PERFORMANCE & SCALABILITY",
    prioridade="P2",
    trilha="T5",
    missao="Preparar crescimento com orçamentos explícitos de latência, throughput e custo — medidos, não estimados.",
    porque_agora="Antes de vender escala é preciso saber onde ela quebra. E quebra quase sempre em N+1 e em índice ausente.",
    resultado_observavel=[
        "Existe orçamento de latência por rota crítica e um teste que falha quando o orçamento estoura.",
        "As dez consultas mais lentas estão identificadas com plano de execução anexado.",
        "É conhecido o ponto de saturação do sistema, com número.",
    ],
    escopo=[
        "Orçamento de latência e throughput por jornada crítica",
        "Perfilamento de banco: consultas lentas, N+1, índices ausentes",
        "Estratégia de cache com invalidação correta e escopo por tenant",
        "Paginação obrigatória e limite de payload",
        "Teste de carga e identificação do ponto de saturação",
        "Performance de frontend: tamanho de bundle, carregamento sob demanda, Core Web Vitals",
        "Dimensionamento e autoscaling (k8s/Helm)",
    ],
    fora_de_escopo=[
        "Custo por tenant e margem (Onda AH)",
        "Recuperação de desastre (Onda D)",
    ],
    depende_de=["D", "Q"],
    habilita=["AH", "Z"],
    criterios=[
        "Orçamento de latência p95 definido por rota crítica e verificado por teste automatizado que falha ao estourar.",
        "Relatório com as consultas mais lentas, plano de execução e correção aplicada ou dívida registrada.",
        "Nenhuma rota de listagem sem paginação obrigatória e limite máximo — varredura anexada.",
        "Teste de carga executado com carga crescente até saturação; gráfico ou tabela de resultado anexado ao relatório com o ponto de quebra nomeado.",
        "Chaves de cache incluem tenant e versão; invalidação testada por cenário de escrita.",
        "Orçamento de tamanho de bundle definido e verificado no CI.",
    ],
    metricas=[
        "p95 e p99 por rota crítica",
        "Consultas acima do limite por dia",
        "Ponto de saturação (requisições por segundo)",
        "Tamanho do bundle principal",
    ],
    armadilhas=[
        "Teste de carga contra banco vazio.",
        "Cache que esconde N+1 em desenvolvimento e explode em produção.",
        "Índice criado sem `CONCURRENTLY` numa tabela grande.",
        "Otimizar o que não está no caminho crítico.",
    ],
    artefatos=[
        "docs/waves/post-09/ONDA_R_DISCOVERY.md",
        "docs/waves/post-09/ONDA_R_REPORT.md",
        "docs/performance/ORCAMENTOS.md",
        "docs/performance/LOAD_TEST.md",
    ],
    comandos=[
        "npm run build && du -sh dist",
        "rg -n \"findMany\\(\" src server | rg -v \"take|skip|cursor\"",
    ],
)

# ---------------------------------------------------------------- S
w(
    id="S",
    slug="ADMIN_GOVERNANCE_E_PERMISSIONS",
    titulo="ADMIN, GOVERNANCE & PERMISSIONS",
    prioridade="P1",
    trilha="T4",
    missao="Criar um plano de controle administrativo seguro, auditável e com poder limitado por design.",
    porque_agora="O painel interno costuma ser a maior porta aberta de um SaaS: onipotente, sem trilha e sem limite.",
    resultado_observavel=[
        "Acesso de operador a dado de cliente é registrado, justificado e visível.",
        "Não existe usuário com poder ilimitado sem segundo controle.",
        "Personificação de usuário é sempre identificável no log e na interface.",
    ],
    escopo=[
        "Papéis, permissões granulares e princípio do menor privilégio",
        "Console administrativo com escopo e limites",
        "Personificação com consentimento, prazo, justificativa e trilha",
        "Auditoria de ações administrativas com motivo obrigatório",
        "Aprovação de duas pessoas para operações destrutivas",
        "Gestão de convites, desligamento e revogação de acesso",
        "Configuração por tenant versionada",
    ],
    fora_de_escopo=[
        "Autenticação e tenancy de base (Onda J)",
        "Marketplace e permissões de extensão (Onda U)",
    ],
    depende_de=["J", "B"],
    habilita=["V", "U", "Z"],
    criterios=[
        "Matriz papel × permissão existe como dado versionado; nenhuma permissão é verificada por comparação de string espalhada no código.",
        "Toda ação administrativa sobre dado de cliente exige justificativa e grava auditoria com actor, alvo, motivo e horário — teste automatizado.",
        "Personificação tem prazo máximo, é revogável e aparece de forma visível na interface durante toda a sessão.",
        "Operações destrutivas exigem confirmação de segundo aprovador ou dupla confirmação com dry-run — teste por operação.",
        "Desligamento de usuário revoga sessões, tokens e chaves imediatamente — teste automatizado.",
        "Nenhum papel concede acesso irrestrito a todos os tenants sem trilha; exceções documentadas nominalmente.",
    ],
    metricas=[
        "Ações administrativas sem justificativa (alvo: 0)",
        "Sessões de personificação acima do prazo (alvo: 0)",
        "Tempo entre desligamento e revogação efetiva",
    ],
    armadilhas=[
        "Papel 'superadmin' usado no dia a dia.",
        "Personificação que não aparece no log de auditoria do cliente.",
        "Exclusão administrativa sem dry-run.",
    ],
    artefatos=[
        "docs/waves/post-09/ONDA_S_DISCOVERY.md",
        "docs/waves/post-09/ONDA_S_REPORT.md",
        "docs/security/MATRIZ_PERMISSOES.md",
    ],
    comandos=[
        "npx vitest run src/**/admin* src/**/permission*",
    ],
)

# ---------------------------------------------------------------- T
w(
    id="T",
    slug="ONBOARDING_ACTIVATION_E_ADOPTION",
    titulo="ONBOARDING, ACTIVATION & ADOPTION",
    prioridade="P2",
    trilha="T5",
    missao="Levar um novo cliente ao primeiro valor rapidamente e de forma mensurável.",
    porque_agora="Ativação é o gargalo real de SaaS B2B. Sem ela, aquisição só acelera o churn.",
    resultado_observavel=[
        "Existe definição escrita de primeiro valor e um número de tempo até alcançá-lo.",
        "Um tenant novo consegue chegar ao primeiro valor sem intervenção humana — ou o passo humano é explícito e cronometrado.",
        "Onde as pessoas travam está medido, não suposto.",
    ],
    escopo=[
        "Definição de primeiro valor por perfil de cliente",
        "Fluxo de criação de tenant, convite e configuração inicial",
        "Importação de dados inicial com validação e relatório de erro",
        "Dados de exemplo claramente marcados e removíveis",
        "Checklist de ativação e progresso visível",
        "Medição de tempo até o primeiro valor e pontos de abandono",
        "Documentação e ajuda contextual",
    ],
    fora_de_escopo=[
        "Playbooks de CS pós-ativação (Onda V)",
        "Experimentos sobre o onboarding (Onda X)",
    ],
    depende_de=["F", "E", "B"],
    habilita=["V", "Z"],
    criterios=[
        "Definição de primeiro valor está escrita e implementada como evento medível (contrato com a Onda F).",
        "Existe teste E2E que cria tenant do zero e chega ao primeiro valor; qualquer passo manual obrigatório está nomeado no relatório.",
        "Importação inicial valida e devolve relatório de erro por linha, sem descartar registro em silêncio — teste com arquivo sujo.",
        "Dados de exemplo são marcados no banco e removíveis por comando; nunca se misturam a dados reais nos relatórios — teste automatizado.",
        "Funil de ativação medido com pontos de abandono identificados; números no relatório.",
        "Nenhuma etapa do onboarding expõe funcionalidade que o plano do cliente não contempla (contrato com a Onda B).",
    ],
    metricas=[
        "Tempo até o primeiro valor (mediana e p90)",
        "Taxa de conclusão do checklist de ativação",
        "Taxa de erro na importação inicial",
        "Passos manuais obrigatórios (tendência de queda)",
    ],
    armadilhas=[
        "Dado de exemplo contaminando métrica do cliente.",
        "Onboarding que exige uma integração que a maioria dos clientes não tem.",
        "Checklist que marca como concluído sem que o valor tenha sido entregue.",
    ],
    artefatos=[
        "docs/waves/post-09/ONDA_T_DISCOVERY.md",
        "docs/waves/post-09/ONDA_T_REPORT.md",
        "docs/product/DEFINICAO_PRIMEIRO_VALOR.md",
    ],
    comandos=[
        "npx playwright test tests/e2e/onboarding",
    ],
)

# ---------------------------------------------------------------- U
w(
    id="U",
    slug="MARKETPLACE_E_EXTENSIBILITY",
    titulo="MARKETPLACE & EXTENSIBILITY",
    prioridade="P3",
    trilha="T6",
    missao="Preparar extensões seguras de conectores, agentes, skills e templates — com isolamento real, não confiança.",
    porque_agora="Extensão de terceiro é código de terceiro rodando perto do dado do cliente. Sem sandbox e revisão, é uma superfície de ataque com loja.",
    resultado_observavel=[
        "Uma extensão maliciosa não consegue ler dado fora do escopo concedido.",
        "Toda extensão declara permissões e o cliente aprova explicitamente.",
        "É possível desativar uma extensão em produção sem deploy.",
    ],
    escopo=[
        "Modelo de extensão: manifesto, versão, permissões, compatibilidade",
        "Isolamento de execução e limites de recurso",
        "Ciclo de vida: submissão, revisão, publicação, atualização, depreciação, remoção",
        "Consentimento do cliente por permissão e revogação",
        "Observabilidade e cobrança por extensão",
        "Interrupção de emergência por extensão",
    ],
    fora_de_escopo=[
        "API pública base (Onda G)",
        "Precificação de marketplace (Onda B/P)",
    ],
    depende_de=["G", "N", "S"],
    habilita=["X"],
    criterios=[
        "Manifesto de extensão é validado por schema; extensão sem permissões declaradas não instala.",
        "Teste de isolamento: extensão tenta acessar recurso fora do escopo e é bloqueada, com registro do evento.",
        "Limites de CPU, memória, tempo e chamadas externas são aplicados no runtime — teste de estouro.",
        "Existe interruptor por extensão e por tenant que desativa em produção sem deploy — teste automatizado.",
        "Atualização de extensão exige nova aprovação quando as permissões aumentam.",
        "Falha de extensão não derruba o fluxo principal — teste de degradação.",
    ],
    metricas=[
        "Extensões sem manifesto válido (alvo: 0)",
        "Tentativas bloqueadas de acesso fora do escopo",
        "Tempo para desativar extensão em incidente",
    ],
    armadilhas=[
        "Sandbox que compartilha o mesmo processo e a mesma conexão de banco.",
        "Permissão concedida na instalação e nunca revisada.",
        "Extensão que reutiliza credencial do sistema.",
    ],
    artefatos=[
        "docs/waves/post-09/ONDA_U_DISCOVERY.md",
        "docs/waves/post-09/ONDA_U_REPORT.md",
        "docs/platform/EXTENSION_MANIFEST.md",
    ],
    comandos=[
        "npx vitest run src/**/extension*",
    ],
)

# ---------------------------------------------------------------- V
w(
    id="V",
    slug="CUSTOMER_SUCCESS_RETENTION_E_EXPANSION",
    titulo="CUSTOMER SUCCESS, RETENTION & EXPANSION",
    prioridade="P2",
    trilha="T5",
    missao="Criar um sistema operacional de CS movido por sinais reais de uso, não por intuição de gerente de conta.",
    porque_agora="Receita de SaaS vive na renovação. Sem sinal e sem playbook, CS vira apagar incêndio.",
    resultado_observavel=[
        "Toda conta em risco aparece numa lista com o sinal que a colocou lá.",
        "Cada playbook tem gatilho, ação e resultado medido.",
        "Renovação e expansão têm dono, data e histórico.",
    ],
    escopo=[
        "Sinais de saúde a partir de uso, suporte, financeiro e relacionamento",
        "Segmentação de contas e cobertura por modelo de atendimento",
        "Playbooks com gatilho, ação, prazo e medição de efeito",
        "Ciclo de renovação e alerta antecipado",
        "Detecção de oportunidade de expansão a partir de limite de plano",
        "QBR e relatório de valor entregue ao cliente",
        "Voz do cliente realimentando o produto",
    ],
    fora_de_escopo=[
        "Instrumentação base de eventos (Onda F)",
        "Cobrança e faturamento (Onda P)",
    ],
    depende_de=["F", "B", "L"],
    habilita=["Y", "Z"],
    criterios=[
        "Todo sinal de risco aponta para um dado consultável; nenhum sinal é opinião — verificado na revisão do relatório.",
        "Playbook executado gera registro com gatilho, ação, responsável e resultado; taxa de efeito é mensurável.",
        "Oportunidade de expansão é derivada de uso real contra limite do plano (contrato com a Onda B) — teste automatizado.",
        "Relatório de valor entregue ao cliente usa apenas números reproduzíveis a partir do banco, com a consulta anexada.",
        "Nenhum painel de CS expõe dado de outro tenant — teste negativo.",
    ],
    metricas=[
        "Cobertura de contas por modelo de atendimento",
        "Taxa de renovação e de expansão",
        "Tempo entre sinal de risco e primeira ação",
        "% de playbooks com efeito medido",
    ],
    armadilhas=[
        "Health score que só olha login.",
        "Alerta de risco disparado tarde demais para agir.",
        "Relatório de valor com métrica que o cliente não reconhece.",
    ],
    artefatos=[
        "docs/waves/post-09/ONDA_V_DISCOVERY.md",
        "docs/waves/post-09/ONDA_V_REPORT.md",
        "docs/cs/PLAYBOOKS.md",
    ],
    comandos=[
        "npx vitest run src/**/health* src/**/renewal*",
    ],
)

# ---------------------------------------------------------------- W
w(
    id="W",
    slug="AI_OBSERVABILITY_COST_E_GOVERNANCE",
    titulo="AI OBSERVABILITY, COST & GOVERNANCE",
    prioridade="P1",
    trilha="T3",
    missao="Governar custo, qualidade, segurança e comportamento da IA em produção, por tenant e por caso de uso.",
    porque_agora="IA sem teto de custo é risco financeiro aberto. Com LiteLLM como gateway, o controle central é viável — falta exercê-lo.",
    resultado_observavel=[
        "É possível responder quanto a IA custou por tenant, por funcionalidade e por modelo no último mês.",
        "Um tenant não consegue gastar além do limite configurado.",
        "Regressão de qualidade de IA é detectada por medição, não por reclamação.",
    ],
    escopo=[
        "Atribuição de custo por tenant, funcionalidade, agente e modelo",
        "Orçamentos, alertas e corte automático",
        "Registro de prompts e respostas com política de retenção e mascaramento de PII",
        "Evals contínuas e detecção de regressão por versão",
        "Política de modelos: quais são permitidos, para quê, com que fallback",
        "Roteamento por custo/qualidade e limite de repetição",
        "Cartão de modelo e comunicação de mudança",
    ],
    fora_de_escopo=[
        "Ataques adversariais e red-team (Onda AD)",
        "Qualidade de recuperação (Onda K)",
        "Margem de infraestrutura geral (Onda AH)",
    ],
    depende_de=["N", "C"],
    habilita=["AH", "Y", "Z"],
    criterios=[
        "Toda chamada a modelo grava tenant, funcionalidade, modelo, tokens de entrada e saída, custo e latência — cobertura de 100% verificada por teste que falha se houver caminho sem instrumentação.",
        "Orçamento por tenant é aplicado no servidor: ao estourar, a chamada é recusada com erro tipado — teste automatizado.",
        "Registro de prompt aplica mascaramento de PII conforme classificação (contrato com a Onda H) e respeita prazo de retenção — teste com dado sensível sintético.",
        "Existe conjunto de evals executável por comando com limiar de regressão que falha o CI.",
        "Troca de modelo ou de versão de prompt é um evento versionado e registrado; não existe troca silenciosa em produção.",
        "Fallback entre provedores é observável e registra que houve fallback, com motivo.",
    ],
    metricas=[
        "Custo de IA por tenant, por funcionalidade e por mil execuções",
        "% de chamadas instrumentadas (alvo: 100%)",
        "Estouros de orçamento bloqueados",
        "Resultado das evals por versão (série histórica)",
    ],
    armadilhas=[
        "Custo estimado por contagem de caracteres em vez de tokens reais do provedor.",
        "Log de prompt guardando PII indefinidamente.",
        "Retry automático multiplicando custo em silêncio.",
        "Orçamento no frontend.",
    ],
    artefatos=[
        "docs/waves/post-09/ONDA_W_DISCOVERY.md",
        "docs/waves/post-09/ONDA_W_REPORT.md",
        "docs/ai/POLITICA_MODELOS.md",
        "docs/ai/CUSTOS.md",
    ],
    comandos=[
        "rg -n \"litellm|completions|chat\\.completions\" src server --stats",
        "npx vitest run tests/evals",
    ],
)

# ---------------------------------------------------------------- X
w(
    id="X",
    slug="EXPERIMENTATION_GROWTH_E_FEATURE_FLAGS",
    titulo="EXPERIMENTATION, GROWTH & FEATURE FLAGS",
    prioridade="P3",
    trilha="T6",
    missao="Permitir experimentação e rollout controlado sem comprometer estabilidade nem contaminar métrica.",
    porque_agora="Flag sem ciclo de vida vira dívida permanente. Experimento sem disciplina estatística vira decisão ruim com aparência de dado.",
    resultado_observavel=[
        "Toda flag tem dono, data de remoção e estado atual conhecido em produção.",
        "Um experimento tem hipótese registrada antes de começar e resultado publicado mesmo quando negativo.",
        "É possível desligar qualquer funcionalidade nova em minutos sem deploy.",
    ],
    escopo=[
        "Serviço de feature flags com avaliação no servidor e por tenant",
        "Ciclo de vida da flag: criação, dono, prazo, remoção forçada",
        "Rollout gradual, canário e interruptor de emergência",
        "Experimentos: hipótese, métrica primária, tamanho de amostra, duração mínima",
        "Atribuição consistente e prevenção de contaminação entre variantes",
        "Registro de decisão pós-experimento",
    ],
    fora_de_escopo=[
        "Instrumentação base (Onda F)",
        "Precificação experimental (contrato com Ondas B e P)",
    ],
    depende_de=["F", "B", "Q"],
    habilita=["Z"],
    criterios=[
        "Toda flag no código existe no registro com dono e prazo; flag órfã falha auditoria automatizada no CI.",
        "Avaliação de flag ocorre no servidor para qualquer efeito com impacto em dado ou dinheiro — varredura anexada.",
        "Existe interruptor de emergência testado que desliga funcionalidade sem deploy — evidência de execução.",
        "Experimento exige hipótese, métrica primária e duração mínima registradas antes do início; não é possível iniciar sem isso.",
        "Atribuição é determinística e estável por usuário/tenant — teste automatizado de consistência.",
        "Flags vencidas geram alerta e entram como dívida com prazo.",
    ],
    metricas=[
        "Flags ativas e idade média (tendência de queda)",
        "Flags vencidas (alvo: 0)",
        "Experimentos com resultado publicado (alvo: 100%)",
    ],
    armadilhas=[
        "Espiar resultado e parar o experimento no melhor momento.",
        "Flag avaliada só no cliente e contornável pelo usuário.",
        "Variante que muda a definição da métrica que está sendo medida.",
    ],
    artefatos=[
        "docs/waves/post-09/ONDA_X_DISCOVERY.md",
        "docs/waves/post-09/ONDA_X_REPORT.md",
        "docs/growth/REGISTRO_FLAGS.md",
    ],
    comandos=[
        "rg -n \"featureFlag|isEnabled|flags\\.\" src server --stats",
    ],
)

# ---------------------------------------------------------------- Y
w(
    id="Y",
    slug="EXECUTIVE_COMMAND_CENTER_E_DECISION_INTELLIGENCE",
    titulo="EXECUTIVE COMMAND CENTER & DECISION INTELLIGENCE",
    prioridade="P2",
    trilha="T5",
    missao="Transformar o Command Center numa cabine de decisão: número confiável, causa provável e próxima ação.",
    porque_agora="É a tela que sustenta a promessa da marca. Se ela mostrar número que não bate com o relatório operacional, a confiança acaba ali.",
    resultado_observavel=[
        "Todo indicador do painel abre para a definição, a fonte e a consulta que o gerou.",
        "Nenhum número do painel diverge do relatório operacional correspondente.",
        "Cada alerta traz a ação recomendada e o responsável.",
    ],
    escopo=[
        "Camada semântica: definição única de cada métrica",
        "Painéis por papel com foco em decisão",
        "Detecção de anomalia com explicação de causa provável",
        "Alertas acionáveis com dono e prazo",
        "Exportação e agendamento de relatório",
        "Frescor do dado exibido explicitamente",
    ],
    fora_de_escopo=[
        "Modelo de forecast (Onda M)",
        "Instrumentação de evento (Onda F)",
    ],
    depende_de=["M", "F", "W"],
    habilita=["Z"],
    criterios=[
        "Cada indicador exibido tem definição versionada e origem rastreável; teste automatizado compara o valor do painel com a consulta canônica.",
        "Todo painel mostra o horário do dado; dado atrasado além do limite aparece marcado como defasado.",
        "Alertas trazem causa provável apoiada em evidência consultável e ação recomendada — nenhum alerta é apenas 'caiu 20%'.",
        "Nenhum número é calculado no frontend a partir de agregação parcial — varredura anexada.",
        "Exportação respeita permissão e tenant do usuário — teste negativo.",
    ],
    metricas=[
        "Divergência entre painel e fonte canônica (alvo: 0)",
        "Idade máxima do dado exibido",
        "% de alertas com ação recomendada",
    ],
    armadilhas=[
        "Mesma métrica com filtro diferente em dois painéis.",
        "Painel bonito que ninguém usa para decidir.",
        "Anomalia detectada em série sazonal sem tratar sazonalidade.",
    ],
    artefatos=[
        "docs/waves/post-09/ONDA_Y_DISCOVERY.md",
        "docs/waves/post-09/ONDA_Y_REPORT.md",
        "docs/analytics/CAMADA_SEMANTICA.md",
    ],
    comandos=[
        "npx vitest run src/**/dashboard* src/**/metrics*",
    ],
)

# ---------------------------------------------------------------- Z
w(
    id="Z",
    slug="GO-TO-MARKET_READINESS_E_CERTIFICATION",
    titulo="GO-TO-MARKET READINESS & CERTIFICATION",
    prioridade="P1",
    trilha="T7",
    missao="Certificar o Birth Hub 360 como produto comercializável, operável e demonstrável — com prova, não com slide.",
    porque_agora="É a onda que audita todas as anteriores. Só faz sentido rodar quando houver o que certificar.",
    resultado_observavel=[
        "Existe um roteiro de demonstração que roda do zero, em ambiente limpo, em tempo cronometrado.",
        "Existe pacote de due diligence pronto para responder a comprador técnico e jurídico.",
        "Todo item aberto está classificado e datado — nada escondido.",
    ],
    escopo=[
        "Auditoria de fechamento de todas as ondas com evidência",
        "Ambiente e roteiro de demonstração reprodutíveis",
        "Pacote comercial: precificação, contrato, SLA, política de privacidade, DPA",
        "Prontidão de suporte: canais, prazos, escalonamento, base de conhecimento",
        "Prontidão operacional: on-call, runbooks, painéis",
        "Registro de riscos aceitos com dono e data de revisão",
        "Checklist de lançamento e critérios de não lançar",
    ],
    fora_de_escopo=[
        "Implementar funcionalidade nova para 'fechar' a certificação",
    ],
    depende_de=["A", "B", "D", "J", "P", "Q", "S", "W", "AB", "AC"],
    habilita=[],
    criterios=[
        "Matriz de certificação preenchida por onda com status, evidência e link — onda sem evidência é marcada como não certificada, nunca como concluída.",
        "Demonstração completa executada em ambiente limpo a partir de script versionado, com tempo registrado e sem intervenção não prevista.",
        "Pacote de due diligence existe e está completo: arquitetura, segurança, privacidade, sub-processadores, SLA, plano de continuidade.",
        "Registro de riscos aceitos assinado pelo responsável, com data de revisão, para cada item não resolvido.",
        "Critérios de 'não lançar' estão escritos e foram verificados um a um.",
        "Nenhuma referência a AtlasGR ou Total Trac em código, documentação, artefatos de marca ou telas — varredura anexada.",
    ],
    metricas=[
        "Ondas certificadas com evidência / total",
        "Tempo do roteiro de demonstração",
        "Riscos aceitos sem dono ou sem data (alvo: 0)",
    ],
    armadilhas=[
        "Certificar onda com base no relatório dela mesma, sem verificação independente.",
        "Demonstração que só funciona no ambiente do apresentador.",
        "Risco 'aceito' sem ninguém que o assuma.",
    ],
    artefatos=[
        "docs/waves/post-09/ONDA_Z_CERTIFICACAO.md",
        "docs/waves/post-09/ONDA_Z_REPORT.md",
        "docs/gtm/DEMO_SCRIPT.md",
        "docs/gtm/DUE_DILIGENCE.md",
    ],
    comandos=[
        "rg -ni \"atlasgr|total trac\" . -g '!node_modules' -g '!*.lock'",
        "npm run build && npx tsc --noEmit && npm run lint && npx vitest run && npx playwright test",
    ],
)

# ================================================================
# ONDAS NOVAS (AA–AH) — lacunas identificadas no pacote original
# ================================================================

# ---------------------------------------------------------------- AA
w(
    id="AA",
    slug="FISCAL_BR_PAGAMENTOS_LOCAIS_E_CONCILIACAO",
    titulo="FISCAL BR, PAGAMENTOS LOCAIS E CONCILIAÇÃO",
    prioridade="P1",
    trilha="T1",
    missao="Cobrir a realidade fiscal e de pagamentos brasileira: nota fiscal de serviço, Pix, boleto, cartão, retenções e conciliação bancária.",
    porque_agora="LACUNA DO PACOTE ORIGINAL. Um SaaS B2B brasileiro não fatura sem NFS-e nem vende sem Pix e boleto. Billing genérico (Onda P) não resolve isso.",
    resultado_observavel=[
        "Uma venda gera cobrança, recebimento e documento fiscal, e os três se reconciliam automaticamente.",
        "O sistema conhece o regime tributário do emissor e calcula retenções sem depender de planilha.",
        "Cancelamento e substituição de nota fiscal têm fluxo definido e testado.",
    ],
    escopo=[
        "Emissão de NFS-e por município do emissor (ou via provedor homologado)",
        "Cancelamento, substituição e carta de correção",
        "Regime tributário, alíquotas, ISS, retenções (IR, PIS, COFINS, CSLL, INSS quando aplicável)",
        "Pix: cobrança estática e dinâmica, conciliação por identificador de transação",
        "Boleto: registro, vencimento, baixa, protesto e cancelamento",
        "Cartão: recorrência, tentativa, falha e atualização de dados",
        "Split de pagamento quando aplicável",
        "Validação de CNPJ/CPF, inscrição municipal e endereço fiscal",
        "Conciliação bancária e extrato",
    ],
    fora_de_escopo=[
        "Escrituração contábil completa (é entrega para o contador, não substituição dele)",
        "Consultoria tributária: a onda implementa regra parametrizável, não decide a tributação",
    ],
    depende_de=["P", "H"],
    habilita=["Z", "AH"],
    criterios=[
        "Emissão de documento fiscal é idempotente por venda e período; dupla tentativa não gera duas notas — teste automatizado.",
        "Regras fiscais (alíquotas, retenções, regime) são dados parametrizáveis versionados, nunca constantes no código — verificado por varredura.",
        "Existe conjunto de casos de teste com valores conferidos manualmente para cada combinação de regime e retenção usada, documentados no relatório.",
        "Falha na emissão coloca a venda em estado explícito e recuperável, com reprocessamento auditado — teste de falha do provedor.",
        "Validadores de CNPJ/CPF rejeitam dígito verificador inválido, incluindo casos-limite (sequências repetidas) — teste automatizado.",
        "Conciliação bancária roda por comando e lista divergências nominalmente; divergência não explicada bloqueia o fechamento.",
        "Nenhum dado fiscal ou bancário sensível aparece em log — verificado por gitleaks e por teste de saída de log.",
        "Cancelamento de nota tem janela, motivo obrigatório e trilha de auditoria imutável.",
    ],
    metricas=[
        "Taxa de sucesso de emissão fiscal na primeira tentativa",
        "Divergências de conciliação bancária por período (alvo: 0 não explicadas)",
        "Tempo entre recebimento e baixa automática",
        "Notas em estado de erro sem tratamento (alvo: 0)",
    ],
    armadilhas=[
        "Hardcodar alíquota de um município.",
        "Tratar Pix como pagamento instantâneo garantido sem conferir o extrato.",
        "Emitir nota antes de confirmar o recebimento (ou depois, sem política definida).",
        "Assumir que todo cliente é pessoa jurídica.",
        "Arredondamento de imposto diferente do arredondamento da cobrança.",
    ],
    artefatos=[
        "docs/waves/post-09/ONDA_AA_DISCOVERY.md",
        "docs/waves/post-09/ONDA_AA_REPORT.md",
        "docs/finance/FISCAL_BR.md",
        "docs/finance/CONCILIACAO_BANCARIA.md",
    ],
    comandos=[
        "npx vitest run src/**/fiscal* src/**/nfse* src/**/pix* src/**/boleto*",
        "gitleaks detect --config .gitleaks.toml --no-git",
    ],
)

# ---------------------------------------------------------------- AB
w(
    id="AB",
    slug="SRE_SLOS_E_INCIDENT_COMMAND",
    titulo="SRE, SLOs E INCIDENT COMMAND",
    prioridade="P1",
    trilha="T2",
    missao="Definir SLIs e SLOs, alertar pelo sintoma que o cliente sente e operar incidentes com comando, não com improviso.",
    porque_agora="LACUNA DO PACOTE ORIGINAL. A Onda D prova recuperação; esta onda define quando agir, quem age e como se aprende depois.",
    resultado_observavel=[
        "Existe SLO por jornada crítica com orçamento de erro consumido visível.",
        "Alerta dispara por sintoma do usuário, não por uso de CPU.",
        "Um incidente tem comandante, canal, linha do tempo e postmortem sem culpado.",
    ],
    escopo=[
        "SLIs e SLOs por jornada crítica e orçamento de erro",
        "Alerting acionável, com dono e runbook vinculado",
        "Níveis de severidade e critério objetivo de classificação",
        "Escala de plantão, acionamento e escalonamento",
        "Comando de incidente: papéis, comunicação interna e externa",
        "Postmortem sem culpado com ações rastreadas até a conclusão",
        "Página de status e comunicação com cliente",
    ],
    fora_de_escopo=[
        "Recuperação de desastre e backup (Onda D)",
        "Capacidade e performance (Onda R)",
    ],
    depende_de=["D"],
    habilita=["Z", "R"],
    criterios=[
        "Cada jornada crítica tem SLI implementado e SLO declarado; o orçamento de erro é calculável por consulta — anexada ao relatório.",
        "Todo alerta configurado aponta para runbook existente; alerta sem runbook é removido ou o runbook é criado — auditoria anexada.",
        "Nenhum alerta dispara para condição que não exige ação humana — lista de alertas revisada, com os descartados nomeados.",
        "Matriz de severidade com critério objetivo (impacto em receita, número de tenants, perda de dado) está escrita e foi aplicada a pelo menos um incidente real ou simulado.",
        "Existe registro de ao menos um exercício de incidente com linha do tempo, decisões e postmortem publicado.",
        "Ações de postmortem viram itens rastreáveis com dono e prazo; item sem dono falha a auditoria.",
    ],
    metricas=[
        "Orçamento de erro consumido por SLO",
        "Alertas por semana e proporção de alertas acionáveis",
        "Tempo até detecção e tempo até mitigação",
        "Ações de postmortem concluídas no prazo",
    ],
    armadilhas=[
        "SLO copiado de blog sem relação com o contrato do cliente.",
        "Alerta em métrica de recurso que acorda gente sem motivo.",
        "Postmortem que termina em 'falta de atenção'.",
        "Página de status atualizada depois do cliente reclamar.",
    ],
    artefatos=[
        "docs/waves/post-09/ONDA_AB_DISCOVERY.md",
        "docs/waves/post-09/ONDA_AB_REPORT.md",
        "docs/sre/SLOS.md",
        "docs/sre/INCIDENT_COMMAND.md",
        "docs/postmortems/",
    ],
    comandos=[
        "rg -n \"alert|rule\" prometheus.yml k8s charts",
    ],
)

# ---------------------------------------------------------------- AC
w(
    id="AC",
    slug="SUPPLY_CHAIN_SECURITY_E_RELEASE_ENGINEERING",
    titulo="SUPPLY CHAIN SECURITY & RELEASE ENGINEERING",
    prioridade="P1",
    trilha="T0",
    missao="Tornar o caminho do commit à produção rastreável, verificável e reversível — e a cadeia de dependências, auditável.",
    porque_agora="LACUNA DO PACOTE ORIGINAL. É a onda que dá poder de gate a todas as outras: sem CI confiável, os critérios de aceite das demais ondas não têm onde ser aplicados.",
    resultado_observavel=[
        "Todo artefato em produção é rastreável até um commit, com a lista de dependências que continha.",
        "Rollback de deploy é um comando, com tempo medido.",
        "Vulnerabilidade crítica em dependência quebra o pipeline antes de chegar em produção.",
    ],
    escopo=[
        "Pipeline: typecheck, lint (Biome), build, testes, varreduras — com gates obrigatórios",
        "SBOM por release e varredura de dependências (Trivy) com política de severidade",
        "Varredura de segredos (gitleaks) sem exceção silenciosa",
        "Fixação de versões, lockfile e política de atualização",
        "Versionamento, changelog e imutabilidade do artefato",
        "Estratégia de deploy (ArgoCD/Helm), promoção entre ambientes e rollback",
        "Proteção de branch, revisão obrigatória e proibição de bypass",
        "Paridade entre ambientes e configuração por ambiente",
    ],
    fora_de_escopo=[
        "Segurança de aplicação e tenancy (Onda J)",
        "Conteúdo dos testes (Onda Q)",
    ],
    depende_de=[],
    habilita=["J", "D", "Q", "AB", "Z"],
    criterios=[
        "Pipeline falha, e não apenas avisa, para: typecheck, lint, testes, segredo encontrado e vulnerabilidade crítica/alta sem exceção datada.",
        "Toda exceção em `.trivyignore.yaml` e `.gitleaksignore` tem motivo, dono e data de revisão — entrada sem isso falha auditoria.",
        "SBOM é gerado por release e arquivado; é possível responder quais versões de dependência estavam numa release específica.",
        "Artefato de produção é imutável e identificado por hash, vinculado ao commit — evidência anexada.",
        "Rollback de deploy foi executado de verdade em ambiente não produtivo, com tempo registrado.",
        "Não existe caminho de deploy que ignore os gates (sem `--no-verify`, sem push direto na branch principal) — configuração anexada.",
        "Diferenças de configuração entre ambientes estão declaradas em um lugar; nenhuma variável obrigatória é descoberta só em produção.",
    ],
    metricas=[
        "Tempo do pipeline e taxa de falha por etapa",
        "Vulnerabilidades críticas/altas abertas (alvo: 0 sem exceção datada)",
        "Tempo de rollback medido",
        "Exceções de varredura sem data de revisão (alvo: 0)",
    ],
    armadilhas=[
        "Gate que roda com `continue-on-error`.",
        "ESLint no editor e Biome no CI divergindo e gerando ruído — decidir qual é a autoridade.",
        "Lockfile ignorado no Docker build.",
        "Segredo em variável de ambiente do CI aparecendo no log do job.",
    ],
    artefatos=[
        "docs/waves/post-09/ONDA_AC_DISCOVERY.md",
        "docs/waves/post-09/ONDA_AC_REPORT.md",
        "docs/release/PIPELINE.md",
        "docs/release/POLITICA_DEPENDENCIAS.md",
    ],
    comandos=[
        "rg -n \"continue-on-error|if: always\\(\\)\" .github/workflows",
        "trivy fs --severity HIGH,CRITICAL --ignorefile .trivyignore.yaml .",
        "gitleaks detect --config .gitleaks.toml",
        "npm ci && npx tsc --noEmit && npm run lint && npm run build",
    ],
)

# ---------------------------------------------------------------- AD
w(
    id="AD",
    slug="AI_SAFETY_PROMPT_INJECTION_E_RED_TEAM",
    titulo="AI SAFETY, PROMPT INJECTION E RED TEAM",
    prioridade="P1",
    trilha="T3",
    missao="Defender os agentes contra instrução hostil vinda de dado — e provar a defesa com ataque, não com intenção.",
    porque_agora="LACUNA DO PACOTE ORIGINAL. Agentes que leem e-mail, site de lead e documento de RAG e podem chamar ferramentas formam a combinação de risco mais séria do produto.",
    resultado_observavel=[
        "Um e-mail de lead contendo instrução maliciosa não faz o agente exfiltrar dado nem executar ação.",
        "Existe um conjunto de ataques versionado que roda no CI e falha quando a defesa regride.",
        "Conteúdo recuperado nunca é tratado como instrução.",
    ],
    escopo=[
        "Separação estrita entre instrução do sistema e conteúdo não confiável",
        "Injeção indireta via RAG, e-mail, site de prospect, anexo e webhook",
        "Abuso de ferramenta: escalada, encadeamento, exfiltração por parâmetro",
        "Vazamento de dado entre tenants via contexto e memória de agente",
        "Filtros de saída: PII, segredo, conteúdo inadequado",
        "Conjunto de ataques versionado e execução contínua",
        "Resposta a incidente específica de IA",
    ],
    fora_de_escopo=[
        "Custo e observabilidade de IA (Onda W)",
        "Qualidade de recuperação (Onda K)",
    ],
    depende_de=["N", "J"],
    habilita=["C", "K", "U", "Z"],
    criterios=[
        "Existe conjunto versionado de no mínimo 30 ataques (injeção direta, indireta via documento, exfiltração via ferramenta, escalada de permissão, confusão de tenant) executável por comando.",
        "O conjunto de ataques roda no CI; qualquer ataque bem-sucedido falha o build.",
        "Conteúdo de terceiros é marcado como não confiável em toda a cadeia e o runtime recusa segui-lo como instrução — teste com documento contendo instrução explícita.",
        "Ferramenta com efeito externo não pode ser acionada por conteúdo recuperado sem aprovação humana — teste de tentativa direta.",
        "Filtro de saída bloqueia PII e segredo antes da entrega — teste com dado sintético plantado no contexto.",
        "Tentativa de injeção é registrada como evento de segurança com contexto suficiente para investigação, sem gravar o payload completo em texto aberto quando contiver dado sensível.",
        "Existe procedimento escrito de resposta a incidente de IA (suspeita de exfiltração, agente agindo fora da política) com passo de contenção imediata.",
    ],
    metricas=[
        "Ataques bem-sucedidos no conjunto (alvo: 0)",
        "Cobertura de categorias de ataque",
        "Tentativas de injeção detectadas em produção",
        "Tempo para desativar um agente em incidente",
    ],
    armadilhas=[
        "Defender com instrução no prompt ('ignore instruções do documento') e chamar isso de controle.",
        "Testar só injeção direta digitada pelo usuário.",
        "Registrar o payload do ataque com o dado sensível junto.",
        "Agente com permissão ampla 'temporária' que nunca é reduzida.",
    ],
    artefatos=[
        "docs/waves/post-09/ONDA_AD_DISCOVERY.md",
        "docs/waves/post-09/ONDA_AD_REPORT.md",
        "tests/security/ai-redteam/",
        "docs/ai/AMEACAS_E_DEFESAS.md",
    ],
    comandos=[
        "npx vitest run tests/security/ai-redteam",
    ],
)

# ---------------------------------------------------------------- AE
w(
    id="AE",
    slug="I18N_FUSOS_MOEDA_E_FORMATACAO",
    titulo="I18N, FUSOS, MOEDA E FORMATAÇÃO",
    prioridade="P2",
    trilha="T5",
    missao="Acertar tempo, moeda, número e idioma — os erros silenciosos que só aparecem no relatório do cliente.",
    porque_agora="LACUNA DO PACOTE ORIGINAL. Cadência, agendamento, fechamento de período e relatório dependem de fuso correto. Um erro de fuso vira reunião perdida.",
    resultado_observavel=[
        "Todo instante é armazenado em UTC e exibido no fuso do usuário, com o fuso visível quando importa.",
        "Nenhum texto de interface está codificado direto no componente.",
        "Fechamento de período usa o fuso do tenant, não o do servidor.",
    ],
    escopo=[
        "Política de data e hora: armazenamento em UTC, fuso do usuário e do tenant",
        "Horário de verão, datas sem hora e intervalos de período",
        "Agendamento e cadência com fuso explícito",
        "Extração de textos e infraestrutura de tradução (pt-BR como base)",
        "Formatação de número, moeda, percentual e data por localidade",
        "Suporte a múltiplas moedas quando aplicável, com taxa e data de conversão",
        "Pluralização e textos com interpolação",
    ],
    fora_de_escopo=[
        "Tradução profissional do conteúdo (é execução posterior)",
        "Design responsivo (Onda E)",
    ],
    depende_de=["E", "H"],
    habilita=["M", "P", "Y"],
    criterios=[
        "Varredura mostra zero uso de data local do servidor em lógica de negócio; todo instante persistido é UTC — evidência anexada.",
        "Existem testes com fusos distintos e com transição de horário de verão para agendamento, cadência e fechamento de período.",
        "Textos da interface estão extraídos em catálogo; texto codificado no componente falha lint ou auditoria.",
        "Valores monetários carregam moeda explícita; conversão registra taxa e data — teste automatizado.",
        "Formatação usa a localidade do usuário, não a do servidor — teste com locale forçado.",
        "Relatórios por período declaram o fuso usado no cabeçalho.",
    ],
    metricas=[
        "Textos não extraídos (tendência a 0)",
        "Bugs de fuso reportados (tendência a 0)",
        "% de valores monetários com moeda explícita",
    ],
    armadilhas=[
        "`new Date()` no servidor definindo o 'hoje' do cliente.",
        "Data de nascimento ou vencimento tratada como instante com fuso.",
        "Conversão de moeda sem registrar a taxa usada.",
        "Concatenar frases para traduzir.",
    ],
    artefatos=[
        "docs/waves/post-09/ONDA_AE_DISCOVERY.md",
        "docs/waves/post-09/ONDA_AE_REPORT.md",
        "docs/product/POLITICA_DATA_HORA.md",
    ],
    comandos=[
        "rg -n \"new Date\\(\\)|Date\\.now\\(\\)|toLocaleDateString\\(\\)\" src server",
    ],
)

# ---------------------------------------------------------------- AF
w(
    id="AF",
    slug="DATA_LIFECYCLE_PORTABILIDADE_E_OFFBOARDING",
    titulo="DATA LIFECYCLE, PORTABILIDADE E OFFBOARDING",
    prioridade="P1",
    trilha="T0",
    missao="Fechar o ciclo de vida do dado: retenção, exclusão, exportação e encerramento de contrato — com prova de execução.",
    porque_agora="LACUNA DO PACOTE ORIGINAL. A LGPD garante exclusão e portabilidade, e contrato B2B exige saída limpa. Sem isso, cada cliente que sai vira risco jurídico.",
    resultado_observavel=[
        "Uma solicitação de exclusão de titular é atendida e verificável, inclusive em backup, cache e índice vetorial.",
        "Um cliente que encerra o contrato recebe seus dados num formato utilizável dentro do prazo.",
        "Dado além do prazo de retenção é removido por rotina, não por lembrança.",
    ],
    escopo=[
        "Política de retenção por categoria de dado com base legal",
        "Exclusão de titular: escopo, propagação, prazo e prova",
        "Anonimização e pseudonimização com teste de reversibilidade",
        "Exportação e portabilidade em formato aberto",
        "Encerramento de contrato: congelamento, período de resgate, destruição",
        "Propagação para backup, cache, índice de busca, vetores, logs e terceiros",
        "Registro de operações do ciclo de vida",
    ],
    fora_de_escopo=[
        "Bases legais e inventário inicial (Onda J)",
        "Modelo canônico (Onda H)",
    ],
    depende_de=["J", "H"],
    habilita=["Z", "V"],
    criterios=[
        "Existe mapa de onde cada categoria de dado pessoal reside, incluindo backup, cache, índice vetorial, logs e sub-processadores.",
        "Exclusão de titular executa de ponta a ponta em ambiente de teste e a verificação posterior não encontra o dado nos destinos mapeados — evidência anexada.",
        "Dado em backup tem tratamento declarado (exclusão na restauração ou expiração do backup) — política escrita e testada.",
        "Exportação gera arquivo em formato aberto, completo e reimportável; teste de ida e volta anexado.",
        "Rotinas de retenção rodam agendadas, registram o que removeram e são idempotentes — teste automatizado.",
        "Anonimização é testada contra reidentificação trivial (combinação de campos quase únicos) e o resultado está no relatório.",
        "Encerramento de contrato tem prazos definidos e a destruição é registrada com evidência.",
    ],
    metricas=[
        "Tempo de atendimento de solicitação de titular",
        "Categorias de dado sem política de retenção (alvo: 0)",
        "Registros além do prazo de retenção (alvo: 0)",
        "Exportações com falha de reimportação (alvo: 0)",
    ],
    armadilhas=[
        "Exclusão que marca `deleted_at` e mantém o dado em índice de busca.",
        "Anonimização que deixa o e-mail como chave.",
        "Exportação em formato proprietário que ninguém consegue ler.",
        "Esquecer terceiros que também receberam o dado.",
    ],
    artefatos=[
        "docs/waves/post-09/ONDA_AF_DISCOVERY.md",
        "docs/waves/post-09/ONDA_AF_REPORT.md",
        "docs/legal/POLITICA_RETENCAO.md",
        "docs/legal/MAPA_DADOS_PESSOAIS.md",
    ],
    comandos=[
        "npx vitest run src/**/retention* src/**/erasure* src/**/export*",
        "rg -n \"deletedAt|deleted_at|softDelete\" src server prisma --stats",
    ],
)

# ---------------------------------------------------------------- AG
w(
    id="AG",
    slug="DELIVERABILITY_E_COMUNICACAO_CONFIAVEL",
    titulo="DELIVERABILITY E COMUNICAÇÃO CONFIÁVEL",
    prioridade="P1",
    trilha="T2",
    missao="Garantir que a mensagem chegue: reputação de domínio, regras de canal, consentimento e supressão que funcionam de verdade.",
    porque_agora="LACUNA DO PACOTE ORIGINAL. Cadência multicanal (Onda A) sem deliverability é cadência que vai para spam — e domínio queimado não se recupera com deploy.",
    resultado_observavel=[
        "SPF, DKIM e DMARC estão configurados e verificados automaticamente.",
        "Bounce e reclamação alimentam uma lista de supressão que nenhum envio consegue ignorar.",
        "Envio em WhatsApp respeita janela e template aprovado, e o sistema recusa o que está fora da regra.",
    ],
    escopo=[
        "Autenticação de domínio: SPF, DKIM, DMARC e monitoramento de relatórios",
        "Aquecimento e limite de envio por domínio e por remetente",
        "Bounce, reclamação, lista de supressão e descadastro em um clique",
        "Regras do WhatsApp Business: template aprovado, janela de atendimento, opt-in",
        "Limite de frequência e regra anti-duplicidade por contato",
        "Conformidade legal da comunicação comercial (consentimento, identificação do remetente, opt-out)",
        "Observabilidade: entrega, abertura, resposta, reclamação por domínio de destino",
    ],
    fora_de_escopo=[
        "Timeline unificada de canais (Onda L)",
        "Confiabilidade técnica dos conectores (Onda I)",
    ],
    depende_de=["I", "A"],
    habilita=["L", "V", "Z"],
    criterios=[
        "Verificação automatizada de SPF, DKIM e DMARC do domínio de envio roda periodicamente e alerta em caso de regressão.",
        "Lista de supressão é consultada obrigatoriamente antes de qualquer envio; não existe caminho de código que envie sem consultá-la — varredura e teste.",
        "Bounce permanente e reclamação suprimem o contato automaticamente — teste com webhook simulado do provedor.",
        "Descadastro funciona em um clique, é honrado em todos os canais aplicáveis e é testado ponta a ponta.",
        "Envio fora da janela do WhatsApp ou com template não aprovado é recusado pelo sistema antes de chegar ao provedor — teste automatizado.",
        "Limite de frequência por contato é aplicado no servidor, incluindo entre campanhas diferentes — teste de disparo concorrente.",
        "Toda mensagem comercial identifica o remetente e traz mecanismo de opt-out — verificado nos templates.",
    ],
    metricas=[
        "Taxa de entrega, bounce e reclamação por domínio de destino",
        "Envios bloqueados por supressão (deve ser maior que zero)",
        "Violações de janela ou template (alvo: 0)",
        "Tempo entre pedido de descadastro e efetivação",
    ],
    armadilhas=[
        "Disparar volume alto em domínio novo e queimar a reputação em um dia.",
        "Supressão consultada em um caminho de envio e esquecida no outro.",
        "Tratar bounce temporário como permanente e perder contato válido.",
        "Reaproveitar template aprovado mudando o sentido da mensagem.",
    ],
    artefatos=[
        "docs/waves/post-09/ONDA_AG_DISCOVERY.md",
        "docs/waves/post-09/ONDA_AG_REPORT.md",
        "docs/comms/DELIVERABILITY.md",
        "docs/comms/POLITICA_CONSENTIMENTO.md",
    ],
    comandos=[
        "npx vitest run src/**/email* src/**/whatsapp* src/**/suppression*",
        "rg -n \"sendMail|sendMessage|dispatch\" src server --stats",
    ],
)

# ---------------------------------------------------------------- AH
w(
    id="AH",
    slug="FINOPS_DE_INFRAESTRUTURA_E_MARGEM_POR_TENANT",
    titulo="FINOPS DE INFRAESTRUTURA E MARGEM POR TENANT",
    prioridade="P2",
    trilha="T6",
    missao="Saber quanto custa servir cada cliente e qual é a margem real por plano — antes de escalar o prejuízo.",
    porque_agora="LACUNA DO PACOTE ORIGINAL. A Onda W cuida do custo de IA; falta o custo total (banco, storage, provedores pagos, egress) confrontado com a receita da Onda P.",
    resultado_observavel=[
        "É possível dizer a margem bruta por plano e por tenant no último mês.",
        "Os dez tenants mais caros estão identificados, com a razão do custo.",
        "Existe alerta quando um tenant passa a custar mais do que paga.",
    ],
    escopo=[
        "Modelo de custo por recurso: computação, banco, storage, rede, filas, provedores pagos, IA",
        "Alocação de custo por tenant (direto e rateado, com método declarado)",
        "Margem bruta por plano, por tenant e por funcionalidade",
        "Alertas de tenant não lucrativo e de anomalia de custo",
        "Dimensionamento, desligamento de ocioso e política de ambientes",
        "Realimentação para precificação (contrato com a Onda B)",
    ],
    fora_de_escopo=[
        "Contabilidade e reconhecimento de receita (Ondas P e AA)",
        "Otimização de latência (Onda R)",
    ],
    depende_de=["P", "W", "R"],
    habilita=["B", "Y", "Z"],
    criterios=[
        "Existe método de alocação declarado por recurso; nenhum custo relevante fica sem atribuição ou sem rateio explicado.",
        "Relatório de margem por plano e por tenant é reproduzível por comando, com a consulta anexada.",
        "Consumo de provedores pagos (Apollo, Hunter, Google Maps, IA) é atribuído ao tenant que o originou — teste de atribuição.",
        "Alerta de custo anômalo por tenant dispara em cenário simulado.",
        "Ambientes não produtivos têm política de desligamento e o custo deles está separado do custo de servir clientes.",
        "Nenhum relatório de margem expõe dado de um tenant a outro — teste negativo.",
    ],
    metricas=[
        "Margem bruta por plano e por tenant",
        "Custo por tenant ativo e por execução de IA",
        "Custo não atribuído (tendência a 0)",
        "Tenants com margem negativa",
    ],
    armadilhas=[
        "Ratear tudo por número de usuários e esconder o tenant que consome dez vezes mais.",
        "Ignorar custo de egress e de storage antigo.",
        "Medir custo de IA por estimativa em vez de uso real do provedor.",
        "Confundir custo de ambiente de desenvolvimento com custo de servir.",
    ],
    artefatos=[
        "docs/waves/post-09/ONDA_AH_DISCOVERY.md",
        "docs/waves/post-09/ONDA_AH_REPORT.md",
        "docs/finance/UNIT_ECONOMICS.md",
    ],
    comandos=[
        "npx vitest run src/**/cost* src/**/usage*",
    ],
)
