import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

// ACH-16-02: o Scheduler Autônomo do LDR Fase 5 (accountIntelligenceScheduler.worker.ts) estava
// registrado só em src/bootstrap/workers.ts (o registry embutido, desligado por padrão via
// ENABLE_EMBEDDED_WORKERS) — worker.ts, o "caminho padrão de processamento" segundo env.ts, nunca
// o importava. Na topologia real de produção (worker.ts como processo dedicado), nenhum processo
// executava esse scheduler, e o AccountIntelligenceSnapshot nunca era atualizado sozinho.
//
// worker.ts é um script de bootstrap sem exports (ver comentário em
// tests/integration/run002e-worker-startup-fails-visibly.test.ts) — não dá pra importar e mockar
// como um módulo comum. Este teste faz uma checagem estática do código-fonte real de worker.ts:
// se alguém remover o import, a criação do worker, o agendamento do scheduler ou o registro em
// `registeredWorkers`, o teste falha. (O teste de paridade mais amplo — comparando TODO *.worker.ts
// que exporta createXWorker contra os imports reais de worker.ts — é ACH-16-05, fora do escopo
// deste item.)

const WORKER_ENTRYPOINT_PATH = resolve(process.cwd(), 'worker.ts');

function readWorkerEntrypointSource(): string {
    return readFileSync(WORKER_ENTRYPOINT_PATH, 'utf8');
}

describe('worker.ts — registro do Scheduler Autônomo do LDR (account-intelligence-scheduler)', () => {
    it('importa createAccountIntelligenceSchedulerWorker e accountIntelligenceSchedulerQueue do módulo correto', () => {
        const source = readWorkerEntrypointSource();

        expect(source).toMatch(
            /import\s*\{[^}]*createAccountIntelligenceSchedulerWorker[^}]*\}\s*from\s*['"]\.\/src\/features\/market-intelligence\/jobs\/accountIntelligenceScheduler\.worker\.js['"]/,
        );
        expect(source).toMatch(
            /import\s*\{[^}]*accountIntelligenceSchedulerQueue[^}]*\}\s*from\s*['"]\.\/src\/features\/market-intelligence\/jobs\/accountIntelligenceScheduler\.worker\.js['"]/,
        );
    });

    it('cria a instância do worker dentro de startWorkerProcess()', () => {
        const source = readWorkerEntrypointSource();

        expect(source).toMatch(/const\s+accountIntelligenceSchedulerWorker\s*=\s*createAccountIntelligenceSchedulerWorker\(\)/);
    });

    it('agenda o job "daily-ldr-scheduler" via upsertJobScheduler', () => {
        const source = readWorkerEntrypointSource();

        expect(source).toMatch(/accountIntelligenceSchedulerQueue\s*\.\s*upsertJobScheduler\s*\(\s*['"]daily-ldr-scheduler['"]/);
    });

    it('registra o worker em registeredWorkers (métricas + shutdown gracioso)', () => {
        const source = readWorkerEntrypointSource();

        expect(source).toMatch(
            /\{\s*name:\s*['"]account-intelligence-scheduler['"]\s*,\s*worker:\s*accountIntelligenceSchedulerWorker\s*\}/,
        );
    });
});
