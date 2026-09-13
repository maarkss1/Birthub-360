import { ActivityUseCases } from '../../features/activities/application/ActivityUseCases';
import { PrismaActivityRepository } from '../../features/activities/infra/PrismaActivityRepository';
import { ActivityController } from '../../features/activities/presentation/ActivityController';
import { AnalyticsUseCases } from '../../features/analytics/application/AnalyticsUseCases';
import { PrismaAnalyticsRepository } from '../../features/analytics/infra/PrismaAnalyticsRepository';
import { AnalyticsController } from '../../features/analytics/presentation/AnalyticsController';
// Onda 43 (Agente 13, Célula Comercial): registrados aqui — não importados diretamente por
// src/features/intelligence/** — porque `no-cross-feature-imports` (dependency-cruiser) proíbe uma
// feature de importar internals de outra. Este é o composition root (src/shared/), o único lugar
// isento dessa regra; os agentes novos resolvem esses serviços via `container.resolve<T>(name)`
// com um tipo estrutural local (mesmo padrão já usado por commercialIntelligence.routes.ts para
// `CommercialIntelligenceController`), nunca via import direto do outro domínio.
import { ChurnPredictionService } from '../../features/analytics/services/churn-prediction.service';
import { AutomationUseCases } from '../../features/automations/application/AutomationUseCases';
import { PrismaAutomationRepository } from '../../features/automations/infra/PrismaAutomationRepository';
import { AutomationController } from '../../features/automations/presentation/AutomationController';
import { UsageUseCases } from '../../features/billing/application/UsageUseCases';
import { PrismaUsageRepository } from '../../features/billing/infra/PrismaUsageRepository';
import { UsageController } from '../../features/billing/presentation/UsageController';
import { BugReportUseCases } from '../../features/bug-reports/application/BugReportUseCases';
import { PrismaBugReportRepository } from '../../features/bug-reports/infra/PrismaBugReportRepository';
import { BugReportController } from '../../features/bug-reports/presentation/BugReportController';
// ACH-17-02 (onda-43, handoff 13→17): motor real por trás do Agente Contratos & Assinatura da
// Célula Comercial (src/features/intelligence/agents/contractSignature.agent.ts) — mesmo motivo do
// comentário acima: `intelligence/**` não pode importar `cadence/**` diretamente
// (no-cross-feature-imports), então a rota resolve este repositório via container com um tipo
// estrutural local (mesmo padrão de `ChurnPredictionService`/`CommercialIntelligenceAiService`).
import { prismaSignatureRequestRepository } from '../../features/cadence/infra/PrismaSignatureRequestRepository.js';
import { MeetingSynthesisService } from '../../features/chatbook/services/meeting-synthesis.service';
import { CommercialIntelligenceUseCases } from '../../features/commercial-intelligence/application/CommercialIntelligenceUseCases';
import { currentPeriod } from '../../features/commercial-intelligence/application/CommercialIntelligenceUseCases.js';
import { CommercialIntelligenceAiService } from '../../features/commercial-intelligence/infra/CommercialIntelligenceAiService';
import { PrismaCommercialIntelligenceRepository } from '../../features/commercial-intelligence/infra/PrismaCommercialIntelligenceRepository';
import { PrismaForecastSnapshotStore } from '../../features/commercial-intelligence/infra/PrismaForecastSnapshotStore';
import { CommercialIntelligenceController } from '../../features/commercial-intelligence/presentation/CommercialIntelligenceController';
import { CompanyUseCases } from '../../features/companies/application/CompanyUseCases';
import { PrismaCompanyRepository } from '../../features/companies/infra/PrismaCompanyRepository';
import { CompanyController } from '../../features/companies/presentation/CompanyController';
import { ContactUseCases } from '../../features/contacts/application/ContactUseCases';
import { PrismaContactRepository } from '../../features/contacts/infra/PrismaContactRepository';
import { ContactController } from '../../features/contacts/presentation/ContactController';
import { CopilotoBitrixWritebackUseCases } from '../../features/copiloto-ia/application/CopilotoBitrixWritebackUseCases';
import { CopilotoIaUseCases } from '../../features/copiloto-ia/application/CopilotoIaUseCases';
import { CopilotoVoiceIngestionAdapter } from '../../features/copiloto-ia/infra/CopilotoVoiceIngestionAdapter';
import { PrismaCopilotoIaRepository } from '../../features/copiloto-ia/infra/PrismaCopilotoIaRepository';
import { CopilotoIaController } from '../../features/copiloto-ia/presentation/CopilotoIaController';
import { LeadUseCases } from '../../features/crm/application/LeadUseCases';
import { PrismaLeadRepository } from '../../features/crm/infra/PrismaLeadRepository';
import { LeadController } from '../../features/crm/presentation/LeadController';
import { Crm360UseCases } from '../../features/crm360/application/Crm360UseCases';
import { PrismaCrm360Repository } from '../../features/crm360/infra/PrismaCrm360Repository';
import { Crm360Controller } from '../../features/crm360/presentation/Crm360Controller';
import { FeatureFlagsUseCases } from '../../features/feature-flags/application/FeatureFlagsUseCases';
import { PrismaFeatureFlagRepository } from '../../features/feature-flags/infra/PrismaFeatureFlagRepository';
import { FeatureFlagsController } from '../../features/feature-flags/presentation/FeatureFlagsController';
import { BitrixLeadWritebackAdapter } from '../../features/integrations/bitrix/infra/BitrixLeadWritebackAdapter';
import { testBitrixConnection } from '../../features/integrations/bitrix/service/connections.js';
// Meeting Hub (Google Meet no agendamento público) — mesmo motivo do comentário da Onda 43 acima:
// `src/features/calendar/routes/booking.routes.ts` não pode importar
// `integrations/google/google.service.ts` diretamente (no-cross-feature-imports). Registrado aqui
// e resolvido via `container.resolve<GoogleCalendarServiceContract>('GoogleCalendarService')` com
// o tipo estrutural local já usado por `agent.routes.ts`.
import { createCalendarEvent } from '../../features/integrations/google/google.service.js';
import { CloserAgent } from '../../features/intelligence/agents/closer.agent.js';
import { SDRQualificationAgent } from '../../features/intelligence/agents/sdrQualification.agent.js';
// Agent Runtime Genérico (PROMPT 4) — mesmo motivo do comentário da Onda 43 acima:
// `src/features/job-roles/**` (dono do CapabilityAuthorizationService/AgentRuntime) não pode
// importar `knowledge`/`intelligence/agents`/`integrations/bitrix` diretamente. Registrados aqui e
// resolvidos via `container.resolve<T>(name)` em `toolExecutors.ts`, com tipos estruturais locais.
import { searchService } from '../../features/knowledge/search.service.js';
// Use Cases
import { NoteUseCases } from '../../features/notes/application/NoteUseCases';
// Repositories
import { PrismaNoteRepository } from '../../features/notes/infra/PrismaNoteRepository';
// Controllers
import { NoteController } from '../../features/notes/presentation/NoteController';
import { ObjectionMatrixUseCases } from '../../features/playbook/objection-matrix/application/ObjectionMatrixUseCases';
import { PrismaObjectionMatrixRepository } from '../../features/playbook/objection-matrix/infra/PrismaObjectionMatrixRepository';
import { ObjectionMatrixController } from '../../features/playbook/objection-matrix/presentation/ObjectionMatrixController';
import { QualificationMatrixUseCases } from '../../features/playbook/qualification-matrix/application/QualificationMatrixUseCases';
import { PrismaQualificationMatrixRepository } from '../../features/playbook/qualification-matrix/infra/PrismaQualificationMatrixRepository';
import { QualificationMatrixController } from '../../features/playbook/qualification-matrix/presentation/QualificationMatrixController';
import { InMemoryEventBus } from '../infra/events/InMemoryEventBus.js';
import { container } from './container.js';

export function setupDI() {
  // 1. Shared
  const eventBus = new InMemoryEventBus();
  container.register('EventBus', eventBus);

  // 2. Repositories
  const noteRepository = new PrismaNoteRepository();
  const activityRepository = new PrismaActivityRepository();
  const contactRepository = new PrismaContactRepository();
  const companyRepository = new PrismaCompanyRepository();
  const leadRepository = new PrismaLeadRepository();
  const automationRepository = new PrismaAutomationRepository();
  const analyticsRepository = new PrismaAnalyticsRepository();
  const commercialIntelligenceRepository = new PrismaCommercialIntelligenceRepository();
  const crm360Repository = new PrismaCrm360Repository();
  const qualificationMatrixRepository = new PrismaQualificationMatrixRepository();
  const objectionMatrixRepository = new PrismaObjectionMatrixRepository();
  const bugReportRepository = new PrismaBugReportRepository();
  const usageRepository = new PrismaUsageRepository();
  const featureFlagRepository = new PrismaFeatureFlagRepository();
  const copilotoIaRepository = new PrismaCopilotoIaRepository();
  // Porta de composição entre features (copiloto-ia -> integrations/bitrix), ver
  // src/shared/contracts/bitrixWriteback.contract.ts — este arquivo é a única "raiz de composição"
  // com licença de conhecer as duas features ao mesmo tempo.
  const bitrixLeadWritebackAdapter = new BitrixLeadWritebackAdapter();
  // Porta de composição na direção oposta (integrations/birth-voice -> copiloto-ia), Onda 7 item 2
  // — ver src/shared/contracts/copilotoVoiceIngestion.contract.ts. Reaproveita o MESMO
  // MeetingSynthesisService de chatbook já usado pelo worker de transcrição (worker.ts/
  // src/bootstrap/workers.ts) — não duplica a integração.
  const copilotoVoiceIngestionAdapter = new CopilotoVoiceIngestionAdapter(
    new MeetingSynthesisService(),
  );

  container.register('NoteRepository', noteRepository);
  container.register('ActivityRepository', activityRepository);
  container.register('ContactRepository', contactRepository);
  container.register('CompanyRepository', companyRepository);
  container.register('LeadRepository', leadRepository);
  container.register('AutomationRepository', automationRepository);
  container.register('AnalyticsRepository', analyticsRepository);
  container.register('CommercialIntelligenceRepository', commercialIntelligenceRepository);
  container.register('Crm360Repository', crm360Repository);
  container.register('QualificationMatrixRepository', qualificationMatrixRepository);
  container.register('ObjectionMatrixRepository', objectionMatrixRepository);
  container.register('BugReportRepository', bugReportRepository);
  container.register('UsageRepository', usageRepository);
  container.register('FeatureFlagRepository', featureFlagRepository);
  container.register('CopilotoIaRepository', copilotoIaRepository);
  container.register('CopilotoVoiceIngestionPort', copilotoVoiceIngestionAdapter);

  // 3. Use Cases
  const noteUseCases = new NoteUseCases(noteRepository);
  const activityUseCases = new ActivityUseCases(activityRepository);
  const contactUseCases = new ContactUseCases(contactRepository);
  const companyUseCases = new CompanyUseCases(companyRepository);
  const leadUseCases = new LeadUseCases(leadRepository);
  const automationUseCases = new AutomationUseCases(automationRepository);
  const analyticsUseCases = new AnalyticsUseCases(analyticsRepository);
  // Store real de snapshots (model ForecastSnapshot) — sem ele, o erro histórico do Forecast e o
  // pilar "Confiabilidade de Forecast" do Health Score nunca teriam dado em produção.
  const commercialIntelligenceUseCases = new CommercialIntelligenceUseCases(
    commercialIntelligenceRepository,
    new PrismaForecastSnapshotStore(),
  );
  const commercialIntelligenceAiService = new CommercialIntelligenceAiService(
    commercialIntelligenceUseCases,
  );
  // Onda 43: motor real por trás do Agente Churn & Retenção da Célula Comercial
  // (src/features/intelligence/agents/churnRetention.agent.ts) — resolvido via container, nunca
  // importado diretamente por `intelligence/**` (ver comentário no import acima).
  const churnPredictionService = new ChurnPredictionService();
  const crm360UseCases = new Crm360UseCases(crm360Repository);
  const qualificationMatrixUseCases = new QualificationMatrixUseCases(
    qualificationMatrixRepository,
  );
  const objectionMatrixUseCases = new ObjectionMatrixUseCases(objectionMatrixRepository);
  const bugReportUseCases = new BugReportUseCases(bugReportRepository);
  const usageUseCases = new UsageUseCases(usageRepository);
  const featureFlagsUseCases = new FeatureFlagsUseCases(featureFlagRepository);
  const copilotoIaUseCases = new CopilotoIaUseCases(copilotoIaRepository);
  const copilotoBitrixWritebackUseCases = new CopilotoBitrixWritebackUseCases(
    copilotoIaRepository,
    bitrixLeadWritebackAdapter,
  );

  container.register('NoteUseCases', noteUseCases);
  container.register('ActivityUseCases', activityUseCases);
  container.register('ContactUseCases', contactUseCases);
  container.register('CompanyUseCases', companyUseCases);
  container.register('LeadUseCases', leadUseCases);
  container.register('AutomationUseCases', automationUseCases);
  container.register('AnalyticsUseCases', analyticsUseCases);
  container.register('CommercialIntelligenceUseCases', commercialIntelligenceUseCases);
  container.register('CommercialIntelligenceAiService', commercialIntelligenceAiService);
  container.register('CommercialIntelligencePeriod', { currentPeriod });
  container.register('ChurnPredictionService', churnPredictionService);
  container.register('SignatureRequestRepositoryPort', prismaSignatureRequestRepository);
  container.register('GoogleCalendarService', { createCalendarEvent });
  // Agent Runtime Genérico (PROMPT 4) — executores reais por trás de `toolExecutors.ts`
  // (job-roles). `MeetingSynthesisService`/`SDRQualificationAgent`/`CloserAgent` não têm
  // dependência própria (mesmo padrão de instanciação already usado em supervisor.agent.ts —
  // `new SDRQualificationAgent()`/`new CloserAgent()` a cada chamada), então uma única instância
  // registrada no boot é suficiente (nenhum estado por-requisição é guardado na própria classe —
  // tenant/sessão vêm por parâmetro/async-context em cada `run`).
  container.register('KnowledgeSearchService', searchService);
  container.register('MeetingSynthesisService', new MeetingSynthesisService());
  container.register('SDRQualificationAgent', new SDRQualificationAgent());
  container.register('CloserAgent', new CloserAgent());
  container.register('BitrixLeadWritebackAdapter', bitrixLeadWritebackAdapter);
  container.register('BitrixConnectionOps', { testBitrixConnection });
  container.register('Crm360UseCases', crm360UseCases);
  container.register('QualificationMatrixUseCases', qualificationMatrixUseCases);
  container.register('ObjectionMatrixUseCases', objectionMatrixUseCases);
  container.register('BugReportUseCases', bugReportUseCases);
  container.register('UsageUseCases', usageUseCases);
  container.register('FeatureFlagsUseCases', featureFlagsUseCases);
  container.register('CopilotoIaUseCases', copilotoIaUseCases);
  container.register('CopilotoBitrixWritebackUseCases', copilotoBitrixWritebackUseCases);

  // 4. Controllers
  container.register('NoteController', new NoteController(noteUseCases));
  container.register('ActivityController', new ActivityController(activityUseCases));
  container.register('ContactController', new ContactController(contactUseCases));
  container.register('CompanyController', new CompanyController(companyUseCases));
  container.register('LeadController', new LeadController(leadUseCases));
  container.register('AutomationController', new AutomationController(automationUseCases));
  container.register('AnalyticsController', new AnalyticsController(analyticsUseCases));
  container.register(
    'CommercialIntelligenceController',
    new CommercialIntelligenceController(
      commercialIntelligenceUseCases,
      commercialIntelligenceAiService,
    ),
  );
  container.register('Crm360Controller', new Crm360Controller(crm360UseCases));
  container.register(
    'QualificationMatrixController',
    new QualificationMatrixController(qualificationMatrixUseCases),
  );
  container.register(
    'ObjectionMatrixController',
    new ObjectionMatrixController(objectionMatrixUseCases),
  );
  container.register('BugReportController', new BugReportController(bugReportUseCases));
  container.register('UsageController', new UsageController(usageUseCases));
  container.register('FeatureFlagsController', new FeatureFlagsController(featureFlagsUseCases));
  container.register(
    'CopilotoIaController',
    new CopilotoIaController(copilotoIaUseCases, copilotoBitrixWritebackUseCases),
  );
}
