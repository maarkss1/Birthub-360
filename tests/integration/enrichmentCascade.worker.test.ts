import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { enrichmentCascadeQueue, createEnrichmentCascadeWorker } from '../../src/lib/queue/enrichmentCascade.worker.js';
import * as cascadeService from '../../src/features/prospecting/services/enrichmentCascade.service.js';
import { connection } from '../../src/lib/queue/redis.js';

describe('enrichmentCascadeWorker', () => {
    let worker: ReturnType<typeof createEnrichmentCascadeWorker>;

    beforeAll(() => {
        worker = createEnrichmentCascadeWorker();
    });

    afterAll(async () => {
        await worker.close();
        // Limpar a fila para não vazar para outros testes
        if (enrichmentCascadeQueue) {
            await enrichmentCascadeQueue.drain();
        }
    });

    it('enfileira um job, worker processa e chama runEnrichmentCascade', async () => {
        if (!enrichmentCascadeQueue) {
            throw new Error('enrichmentCascadeQueue não está inicializada (Redis desligado?)');
        }

        const runSpy = vi.spyOn(cascadeService, 'runEnrichmentCascade').mockResolvedValue({
            apolloEnriched: true,
            hunterEnriched: false,
            googlePlacesEnriched: true,
            contactsAdded: 1,
        });

        const companyId = 'test-company-123';
        const organizationId = 'test-org-123';

        // (1) enfileira um job real
        const job = await enrichmentCascadeQueue.add('test-job', {
            companyId,
            organizationId,
        });

        // (2) O worker sobe no beforeAll e processa...
        // (3) Aguarda processamento
        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Timeout aguardando worker')), 5000);
            
            worker.on('completed', (completedJob) => {
                if (completedJob.id === job.id) {
                    clearTimeout(timeout);
                    resolve();
                }
            });
            
            worker.on('failed', (failedJob, err) => {
                if (failedJob?.id === job.id) {
                    clearTimeout(timeout);
                    reject(err);
                }
            });
        });

        expect(runSpy).toHaveBeenCalledWith(organizationId, companyId, undefined);
    });
});
