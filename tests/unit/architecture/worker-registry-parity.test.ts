import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Paridade de registro de workers (worker.ts vs src/bootstrap/workers.ts)', () => {
  it('garante que todos os workers criados no repo estejam registrados em worker.ts e bootstrap/workers.ts', () => {
    const workerTsContent = fs.readFileSync(path.resolve(process.cwd(), 'worker.ts'), 'utf-8');
    const bootstrapWorkersContent = fs.readFileSync(
      path.resolve(process.cwd(), 'src/bootstrap/workers.ts'),
      'utf-8'
    );

    const expectedWorkers = [
      'createLeadsWorker',
      'createAgentWorker',
      'createEnrichmentWorker',
      'createEnrichmentCascadeWorker',
      'createSearchWorker',
      'createWhatsAppSignalWorker',
      'createBitrixSyncWorker',
      'createFollowUpWorker',
      'createExecutiveSummaryWorker',
      'createDeduplicationWorker',
      'createWinLossAnalysisWorker',
      'createWeeklyPdfReportWorker',
      'createAutoAnonymizeWorker',
      'createColdLeadsScannerWorker',
      'createStagnationScannerWorker',
      'createAccountIntelligenceSchedulerWorker',
      'createForecastSnapshotWorker',
      'createCopilotoTranscriptionWorker',
    ];

    for (const workerFn of expectedWorkers) {
      expect(workerTsContent).toContain(workerFn);
      expect(bootstrapWorkersContent).toContain(workerFn);
    }
  });
});
