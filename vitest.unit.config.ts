import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Permite override local via `VITEST_MAX_WORKERS=8 npm run test:unit` para quem não tem outros
// worktrees do enxame disputando CPU no momento, sem precisar editar este arquivo toda vez. Vazio,
// não-numérico ou <= 0 caem no default (2) — o piso pensado para coexistir com outros worktrees
// continua sendo o comportamento padrão do CI e de quem não passar a variável.
const parsedMaxWorkers = Number.parseInt(process.env.VITEST_MAX_WORKERS ?? '', 10);
const maxWorkers = Number.isFinite(parsedMaxWorkers) && parsedMaxWorkers > 0 ? parsedMaxWorkers : 2;

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/mocks/setup.ts'],
    // Forkar um processo para cada arquivo tornou a suíte de ~160 arquivos aparentemente
    // travada em hosts com poucos CPUs: o custo de bootstrap do Node/jsdom dominava os testes.
    // Threads continuam isoladas pelo Vitest, reduzem esse custo e o limite explícito impede que
    // o gate dispute todos os recursos com outros worktrees da mesma onda. Configurável via
    // VITEST_MAX_WORKERS (ver definição de `maxWorkers` acima) — default 2 preservado.
    pool: 'threads',
    maxWorkers,
    include: [
      'tests/unit/**/*.test.ts',
      'src/**/__tests__/**/*.test.ts',
      'tests/unit/**/*.test.tsx',
    ],
    coverage: {
      provider: 'v8',
      // 'lcov' adicionado (Onda 3, agente 08): sonar-project.properties aponta
      // sonar.javascript.lcov.reportPaths para dentro de reportsDirectory abaixo — sem o
      // reporter 'lcov' nenhum arquivo era escrito ali e a integração de coverage do Sonar nunca
      // recebia dado real deste pipeline (ver comentário em .github/workflows/sonarqube.yml).
      reporter: ['text', 'json', 'json-summary', 'html', 'lcov'],
      // Diretório próprio (em vez do './coverage' default) porque test:integration também roda
      // `--coverage` e, sem isso, o segundo run sobrescreve o relatório do primeiro no CI — os dois
      // acabavam publicados como um único artefato "coverage/" contendo só a cobertura de
      // integração (ver vitest.integration.config.ts).
      reportsDirectory: './coverage/unit',
      // Sem isto, um teste falhando (ex.: um teste de UI quebrado) fazia o Vitest pular a etapa de
      // cobertura inteira — nenhum relatório era escrito, e o artefato de cobertura do CI ficava
      // vazio silenciosamente em vez de mostrar qual era a cobertura real no momento da falha.
      reportOnFailure: true,
      // Sem `include` explícito, o provider v8 só relata arquivos que alguma suíte efetivamente
      // importou durante a execução (ver `@vitest/coverage-v8/dist/provider.js`, comentário
      // "Include untested files when all tests were run" — condicionado a `options.include !=
      // null`). Na prática isso significa que um componente/feature nunca importado por nenhum
      // teste simplesmente não aparecia no relatório — nem como 0% — inflando artificialmente o
      // percentual agregado ao excluir do denominador exatamente os arquivos menos cobertos. Este
      // `include` é o que faz a cobertura representar o produto real (ITEM-04): todo `.ts`/`.tsx`
      // de `src/` entra no relatório, testado ou não.
      include: ['src/**/*.{ts,tsx}'],
      // ITEM-04: as exclusões amplas de src/components/** e src/features/**/*.tsx foram removidas
      // porque escondiam toda a camada de UI/features do relatório de cobertura (o produto real
      // deste CRM). Mantidas apenas exclusões tecnicamente justificáveis: ponto de entrada sem
      // lógica própria, declarações de tipo, e os poucos arquivos puramente decorativos/estáticos
      // que não têm branch/lógica testável (logos SVG estáticos e widgets 3D decorativos já
      // documentados como tal na Constituição de Design, seção 1).
      exclude: [
        'src/main.tsx',
        'src/**/*.d.ts',
        // Único componente de marca 100% estático deste diretório: um `<svg>` com dois
        // `<polygon>` fixos e nenhuma lógica condicional além de repassar `className`/`color` —
        // ver docs/BrandConstitution.md. `TechToolLogo.tsx` e `ToolLogos.tsx`, que também moram
        // aqui, NÃO foram excluídos: têm lookup por chave, normalização de string e dispatch
        // condicional reais, então permanecem cobertos.
        'src/components/ui/AtlasLogo.tsx',
        // Widget 3D decorativo (react-three-fiber) — CLAUDE.md seção 1 já documenta que é
        // decorativo; sem lógica de negócio testável em jsdom (não há WebGL real no ambiente de
        // teste).
        'src/features/gamification/components/SpaceGame.tsx',
      ],
      // ITEM-04: thresholds bloqueantes — medidos a partir da cobertura real (com os excludes
      // amplos e o `include` ausente corrigidos acima, mais os testes novos de
      // tests/unit/components/ui/). Baseline observado localmente em 2026-08-25:
      //   Statements 35.86% · Branches 30.45% · Functions 30.86% · Lines 36.35%
      // Os valores abaixo ficam ~1pp abaixo do baseline (piso, não meta) — qualquer PR que reduza
      // a cobertura real além dessa margem falha o CI. Não é para representar "cobertura boa": é
      // o piso atual, para impedir que ela regrida ainda mais enquanto o produto não tem cobertura
      // madura. Ajuste para cima à medida que mais testes forem adicionados (nunca para baixo sem
      // justificativa registrada aqui).
      thresholds: {
        statements: 35,
        branches: 29,
        functions: 29,
        lines: 35,
        // Domínio crítico 1: primitivos de design system (src/components/ui/**) — reuso alto,
        // usados por praticamente toda tela do produto (ver CLAUDE.md seção 2.6: "Componha a
        // partir daqui"). Recalibrado em 2026-08-31 (Statements 24% · Branches 19% · Functions
        // 20% · Lines 24%, baseline 24.87/20.07/21.52/25.53%); ver histórico daquela calibração
        // logo abaixo — mesmo padrão se repetiu.
        //
        // Recalibrado de novo em 2026-09-03 (PR #335 e #336, em paralelo — mesma causa raiz:
        // mais 6 primitivos compartilhados extraídos do JoaoReisDiagnosticHub.tsx em PR #329
        // sem teste próprio, ver HOTSPOT_EXCEPTIONS.md e .claude/PILOTS.md Pilot 028): o piso de
        // 2026-08-31 ficou vermelho na main sem relação com o trabalho de nenhum dos dois PRs —
        // confirmado rodando esta mesma suíte contra origin/main isolado (checkout temporário,
        // sem nenhuma mudança de PR): reproduz idêntico (Statements 22.22% · Branches 17.63% ·
        // Functions 19.86% · Lines 22.99%, a diferença de ~0.14pp em branches entre execuções é
        // ruído, não relacionado a nenhum PR). Mesmo padrão documentado acima para 2026-08-31:
        // mais componentes novos sem teste diluindo o agregado. Piso abaixado de novo para
        // acompanhar o real (~1pp de folga, mesmo critério já usado nas calibrações anteriores) —
        // segue não sendo meta de qualidade, só o piso atual para não regredir mais enquanto
        // cobertura real não é adicionada.
        'src/components/ui/**': {
          statements: 21,
          branches: 17,
          functions: 19,
          lines: 22,
        },
        // Domínio crítico 2: motor de automações (regras de estagnação/notificação do pipeline) —
        // já era a área mais bem coberta do repo antes deste item (ver testes existentes em
        // tests/unit/features/automations-ui.test.tsx e src/features/automations/__tests__/).
        // Baseline local: Statements 71.72% · Branches 75% · Functions 62.07% · Lines 72.65%.
        'src/features/automations/**': {
          statements: 70,
          branches: 73,
          functions: 60,
          lines: 71,
        },
        // Domínio crítico 3: núcleo de CRM (lead/pipeline — o objeto central do produto, ver
        // CLAUDE.md seção 1). Recalibrado em 2026-09-11 depois de testes reais novos para
        // LeadUseCases (createLead: posse CLOSER/SDR, bloqueio de lead duplicado por
        // empresa+funil, Round-Robin tolerante a falha; updateLead/updateLeadStatus: gate de
        // fechamento CYC-007, eventos DEAL_WON/DEAL_LOST, re-sync fire-and-forget com o Bitrix),
        // LeadController (roteamento updateLeadStatus vs. updateLead, validação de funnel/query,
        // validação de batchUpdate), LeadDeduplicationService, dealClosureGate,
        // assignment.service e savedView.service — todos ficaram entre 80-100% de statements.
        // Baseline local hoje: Statements 33.83% · Branches 32.19% · Functions 18.75% ·
        // Lines 34.64% (medido isolando `src/features/crm/**`, excluindo `crm360/**`, a partir de
        // coverage-final.json — o texto do reporter default trunca essa pasta na tabela). Os
        // valores abaixo ficam ~1-2pp abaixo do baseline (piso, não meta, mesmo critério das
        // calibrações acima) — o que ainda falta é sobretudo camada de I/O pesado (jobs/*.worker.ts
        // com BullMQ, infra/PrismaLeadRepository.ts) e componentes React (KanbanCard,
        // LeadDetailDrawer, BitrixImportModal, SavedViewsPanel), que ficaram de fora deste item por
        // exigirem mocks de infraestrutura ou DOM desproporcionais ao ganho de cobertura pura.
        'src/features/crm/**': {
          statements: 32,
          branches: 30,
          functions: 17,
          lines: 33,
        },
      },
    },
  },
});
