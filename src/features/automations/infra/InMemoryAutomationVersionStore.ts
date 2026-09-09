import { randomUUID } from 'node:crypto';
import type {
  AutomationVersionInput,
  AutomationVersionRecord,
  AutomationVersionStore,
} from '../domain/AutomationVersion';

/**
 * Implementação em memória de `AutomationVersionStore` — mantida hoje só para testes.
 *
 * Nasceu como PROTÓTIPO (Onda 42 — dossiê CPI DEC-14, opção A) enquanto `AutomationVersion` ainda
 * não existia em `prisma/schema.prisma`. **Atualizado (auditoria de release-readiness): o model já
 * foi criado e `automation-versioning.service.ts` já usa `PrismaAutomationVersionStore` em
 * produção** — esta classe não é mais a implementação em uso real, só o fake usado pelos testes
 * unitários da feature. Mesmo padrão já resolvido antes para `InMemoryForecastSnapshotStore.ts` →
 * `PrismaForecastSnapshotStore.ts` (Onda 39).
 */
export class InMemoryAutomationVersionStore implements AutomationVersionStore {
  private records: AutomationVersionRecord[] = [];

  async record(input: AutomationVersionInput): Promise<void> {
    // Append-only — nunca sobrescreve um snapshot existente.
    this.records.push({ ...input, id: randomUUID(), createdAt: new Date() });
  }

  async listByAutomation(
    organizationId: string,
    automationId: string,
    limit = 100,
  ): Promise<AutomationVersionRecord[]> {
    // Duas edições podem cair no mesmo milissegundo (ex.: testes, ou automação de import em
    // lote) — `createdAt` sozinho empataria. `.reverse()` antes do sort estável garante que, em
    // caso de empate exato de timestamp, a inserção mais recente continua vencendo (Array.sort
    // é estável desde ES2019: um empate preserva a ordem relativa de entrada, que já é
    // "mais recente primeiro" depois do reverse).
    return this.records
      .filter((r) => r.organizationId === organizationId && r.automationId === automationId)
      .slice()
      .reverse()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }
}
