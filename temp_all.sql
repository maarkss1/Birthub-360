-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('Ativo', 'Inativo', 'Em análise');

-- CreateEnum
CREATE TYPE "MarketIntelligenceDatasetStatus" AS ENUM ('PENDING', 'PROCESSING', 'VALIDATING', 'READY', 'FAILED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MarketIntelligenceIcpTier" AS ENUM ('MUITO_ALTO', 'ALTO', 'MEDIO', 'BAIXO', 'FORA_DO_ICP');

-- CreateEnum
CREATE TYPE "MarketIntelligenceDataOrigin" AS ENUM ('OBSERVED', 'DERIVED', 'ESTIMATED', 'SIMULATED', 'NOT_AVAILABLE');

-- CreateEnum
CREATE TYPE "ContactStatus" AS ENUM ('Ativo', 'Inativo');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('Lead Recebido', 'Cadência Iniciada', 'Qualificação (SDR)', 'Reunião Agendada', 'Lead Desqualificado', 'Convertido em Oportunidade', 'Nova Oportunidade', 'Proposta Enviada', 'Call/Visita Agendada', 'Piloto VTECH', 'Piloto Atlas Profile', 'Piloto Atlas Profile - Concluído', 'Piloto Atlas Profile - Cancelado', 'Piloto Logística', 'Piloto Logístico - Concluído', 'Piloto Logístico - Cancelado', 'Negócios Perdidos', 'Negócios Ganhos');

-- CreateEnum
CREATE TYPE "LeadFunnel" AS ENUM ('Lead', 'Negocio');

-- CreateEnum
CREATE TYPE "LeadTemperature" AS ENUM ('Frio', 'Morno', 'Quente');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('Ligação', 'WhatsApp', 'E-mail', 'Reunião', 'Follow-up', 'Visita', 'Tarefa');

-- CreateEnum
CREATE TYPE "ActivityStatus" AS ENUM ('Pendente', 'Em andamento', 'Concluída', 'Cancelada');

-- CreateEnum
CREATE TYPE "CrmPipelineEntity" AS ENUM ('Lead', 'Negocio', 'SmartProcess');

-- CreateEnum
CREATE TYPE "CrmProductType" AS ENUM ('Produto', 'Servico');

-- CreateEnum
CREATE TYPE "CrmDocumentType" AS ENUM ('Orcamento', 'Proposta', 'Fatura', 'Contrato');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'GESTOR', 'CLOSER', 'SDR', 'VISUALIZADOR');

-- CreateEnum
CREATE TYPE "CrmDocumentStatus" AS ENUM ('Rascunho', 'Enviado', 'Visualizado', 'Aceito', 'Recusado', 'Vencido', 'Pago', 'Cancelado');

-- CreateEnum
CREATE TYPE "IntelligenceEvidenceType" AS ENUM ('FACT', 'INFERENCE', 'RECOMMENDATION', 'ESTIMATE', 'UNKNOWN', 'CONFLICT');

-- CreateEnum
CREATE TYPE "IntelligenceSnapshotStatus" AS ENUM ('Complete', 'Partial', 'Failed', 'Stale');

-- CreateEnum
CREATE TYPE "AccountSignalStatus" AS ENUM ('Active', 'Dismissed', 'Expired');

-- CreateEnum
CREATE TYPE "DecisionMakerStatus" AS ENUM ('Active', 'Inactive', 'Unverified');

-- CreateEnum
CREATE TYPE "AccountRecommendationStatus" AS ENUM ('Pending', 'Approved', 'Executed', 'Dismissed', 'Superseded', 'Failed');

-- CreateEnum
CREATE TYPE "EconomicRelationshipStatus" AS ENUM ('Verified', 'Inferred', 'Rejected', 'Inactive');

-- CreateEnum
CREATE TYPE "AgentMemoryStatus" AS ENUM ('Completed', 'Failed');

-- CreateEnum
CREATE TYPE "ReportSource" AS ENUM ('ON_DEMAND', 'DAILY_AUTO', 'WEEKLY_WIN_LOSS_AUTO', 'WIN_LOSS_ON_DEMAND');

-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('Info', 'Sucesso', 'Alerta', 'Erro');

-- CreateEnum
CREATE TYPE "AutomationTrigger" AS ENUM ('Lead criado', 'Lead mudou de status', 'Atividade concluída', 'Lead estagnado');

-- CreateEnum
CREATE TYPE "AutomationAction" AS ENUM ('Notificar equipe', 'Criar atividade', 'Ligar via SDR de Voz');

-- CreateEnum
CREATE TYPE "CopilotoConversationSource" AS ENUM ('MEET', 'CALL', 'WHATSAPP', 'MANUAL', 'OTHER');

-- CreateEnum
CREATE TYPE "CopilotoConversationStatus" AS ENUM ('SCHEDULED', 'CAPTURING', 'PROCESSING', 'READY', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CopilotoConsentStatus" AS ENUM ('PENDING', 'GRANTED', 'DECLINED', 'NOT_REQUIRED');

-- CreateEnum
CREATE TYPE "CopilotoCrmEntityType" AS ENUM ('LEAD', 'COMPANY', 'CONTACT');

-- CreateEnum
CREATE TYPE "CopilotoSuggestionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WRITTEN_BACK', 'FAILED');

-- CreateEnum
CREATE TYPE "BitrixExtractionStatus" AS ENUM ('queued', 'running', 'completed', 'completed_partial', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "OptOutScope" AS ENUM ('Email', 'WhatsApp', 'Voice', 'Global');

-- CreateEnum
CREATE TYPE "AIPendingActionOutcome" AS ENUM ('UNMEASURED', 'POSITIVE', 'NEGATIVE', 'NEUTRAL');

-- CreateEnum
CREATE TYPE "CadenceChannel" AS ENUM ('Email', 'WhatsApp', 'Voice');

-- CreateEnum
CREATE TYPE "CadenceRunStatus" AS ENUM ('Active', 'Paused', 'Stopped', 'Completed', 'Failed');

-- CreateEnum
CREATE TYPE "CadenceStopReason" AS ENUM ('OptOut', 'LeadReply', 'Completed', 'ManualStop', 'PolicyGuardrail');

-- CreateEnum
CREATE TYPE "CadenceTouchResult" AS ENUM ('Sent', 'Failed', 'Skipped');

-- CreateEnum
CREATE TYPE "ConfirmationEvidenceType" AS ENUM ('LeadCalendarReply', 'LeadSchedulingLinkClick', 'ManualVerified');

-- CreateEnum
CREATE TYPE "SignatureRequestStatus" AS ENUM ('Created', 'Sent', 'Viewed', 'Signed', 'Declined', 'Expired', 'Cancelled');

-- CreateEnum
CREATE TYPE "DealClosureEventType" AS ENUM ('SignatureCompleted', 'PaymentConfirmed', 'ManualCrmConfirmation');

-- CreateEnum
CREATE TYPE "AgentDefinitionStatus" AS ENUM ('CATALOG_ONLY', 'PROMPT_READY', 'SERVICE_WRAPPER', 'WORKFLOW_READY', 'PRODUCTION_READY', 'SOURCE_REQUIRED', 'DUPLICATE_ALIAS', 'BLOCKED', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "AgentVersionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "AgentAccessLevel" AS ENUM ('DISCOVER', 'READ', 'EXECUTE', 'REQUEST');

-- CreateEnum
CREATE TYPE "CapabilityRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "CapabilityActionType" AS ENUM ('READ', 'WRITE', 'EXECUTE', 'ADMIN');

-- CreateEnum
CREATE TYPE "AgentExecutionStatus" AS ENUM ('PENDING', 'AUTHORIZING', 'RUNNING', 'SUCCEEDED', 'DENIED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AccessRequestCategory" AS ENUM ('READ_CONSULTA', 'HANDOFF_OPERACIONAL', 'DEAL_CHANGES', 'FORECAST_META', 'DESCONTO_PRECO', 'CONTRATO', 'FINANCEIRO', 'ASSINATURA', 'BITRIX_CONFIG');

-- CreateEnum
CREATE TYPE "AccessRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'EXPIRED', 'REVOKED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApprovalDecisionOutcome" AS ENUM ('APPROVED', 'DENIED');

-- CreateEnum
CREATE TYPE "HandoffStatus" AS ENUM ('CREATED', 'AUTHORIZING', 'QUEUED', 'ACCEPTED', 'RUNNING', 'COMPLETED', 'DENIED', 'FAILED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "HandoffPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "MemoryScope" AS ENUM ('AGENT', 'ROLE', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "MemoryCategory" AS ENUM ('PRICING', 'DISCOUNT', 'FORECAST_RULE', 'CONTRACT', 'FINANCE', 'COMPLIANCE', 'WRITE_AUTOMATION', 'CAPABILITY', 'OPERATIONAL');

-- CreateEnum
CREATE TYPE "MemoryStatus" AS ENUM ('PROPOSED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUPERSEDED', 'ROLLED_BACK');

-- CreateEnum
CREATE TYPE "AgentBuildProposalStatus" AS ENUM ('DRAFT', 'GAP_NOT_CONFIRMED', 'UNDER_REVIEW', 'APPROVED_FOR_DEVELOPMENT', 'REJECTED');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "tradeName" TEXT NOT NULL,
    "cnpj" TEXT,
    "stateRegistration" TEXT,
    "segment" TEXT,
    "cnae" TEXT,
    "size" TEXT,
    "employeeCount" INTEGER,
    "estimatedRevenue" DOUBLE PRECISION,
    "website" TEXT,
    "linkedin" TEXT,
    "instagram" TEXT,
    "twitter" TEXT,
    "facebook" TEXT,
    "phones" TEXT[],
    "emails" TEXT[],
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "status" "CompanyStatus" NOT NULL DEFAULT 'Ativo',
    "tags" TEXT[],
    "observations" TEXT,
    "customFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "situacaoCadastral" TEXT,
    "naturezaJuridica" TEXT,
    "capitalSocial" DOUBLE PRECISION,
    "dataAbertura" TIMESTAMP(3),
    "qsa" JSONB,
    "enrichmentStatus" TEXT NOT NULL DEFAULT 'Pendente',
    "enrichmentSource" TEXT,
    "enrichedAt" TIMESTAMP(3),
    "googleRating" DOUBLE PRECISION,
    "googleReviewsCount" INTEGER,
    "businessHours" JSONB,
    "technologies" TEXT[],
    "keywords" TEXT[],
    "logoUrl" TEXT,
    "apolloOrgId" TEXT,
    "newsMentions" JSONB,
    "profileEmbedding" vector(768),
    "lookalikeScore" DOUBLE PRECISION,
    "lookalikeTopMatches" JSONB,
    "organizationId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "deleteReason" TEXT,
    "bitrixCompanyId" TEXT,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketIntelligenceDataset" (
    "id" TEXT NOT NULL,
    "dataset" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceVersion" TEXT,
    "sourceUrl" TEXT,
    "status" "MarketIntelligenceDatasetStatus" NOT NULL DEFAULT 'PENDING',
    "publicationSlot" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "recordsRead" BIGINT NOT NULL DEFAULT 0,
    "recordsImported" BIGINT NOT NULL DEFAULT 0,
    "recordsRejected" BIGINT NOT NULL DEFAULT 0,
    "recordsActive" BIGINT NOT NULL DEFAULT 0,
    "hash" TEXT NOT NULL,
    "pipelineVersion" TEXT NOT NULL,
    "outputManifest" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketIntelligenceDataset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketIntelligenceCompany" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "cnpjBasico" TEXT NOT NULL,
    "cnpjOrdem" TEXT NOT NULL,
    "cnpjDv" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "razaoSocialSearch" TEXT NOT NULL,
    "nomeFantasia" TEXT,
    "nomeFantasiaSearch" TEXT,
    "matrizFilial" TEXT,
    "situacaoCadastralCodigo" TEXT,
    "situacaoCadastral" TEXT,
    "dataSituacaoCadastral" DATE,
    "motivoSituacaoCodigo" TEXT,
    "motivoSituacaoCadastral" TEXT,
    "dataInicioAtividade" DATE,
    "cnaePrincipal" TEXT,
    "cnaePrincipalDescricao" TEXT,
    "cnaesSecundarios" JSONB,
    "naturezaJuridicaCodigo" TEXT,
    "naturezaJuridica" TEXT,
    "porteCodigo" TEXT,
    "porte" TEXT,
    "capitalSocial" DECIMAL(20,2),
    "qualificacaoResponsavelCodigo" TEXT,
    "qualificacaoResponsavel" TEXT,
    "enteFederativoResponsavel" TEXT,
    "opcaoSimples" TEXT,
    "dataOpcaoSimples" DATE,
    "dataExclusaoSimples" DATE,
    "opcaoMei" TEXT,
    "dataOpcaoMei" DATE,
    "dataExclusaoMei" DATE,
    "tipoLogradouro" TEXT,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cep" TEXT,
    "municipioCodigoReceita" TEXT,
    "municipioIbge" TEXT,
    "municipioNome" TEXT,
    "municipioNomeSearch" TEXT,
    "uf" TEXT,
    "ddd1" TEXT,
    "telefone1" TEXT,
    "ddd2" TEXT,
    "telefone2" TEXT,
    "dddFax" TEXT,
    "fax" TEXT,
    "email" TEXT,
    "icpTier" "MarketIntelligenceIcpTier",
    "icpScore" INTEGER,
    "icpReasons" JSONB,
    "icpTaxonomyVersion" TEXT,
    "icpCalculatedAt" TIMESTAMP(3),
    "hasRntrc" BOOLEAN,
    "rntrcStatus" TEXT,
    "rntrcType" TEXT,
    "rntrcNumber" TEXT,
    "rntrcSource" TEXT,
    "rntrcUpdatedAt" TIMESTAMP(3),
    "dataOrigin" "MarketIntelligenceDataOrigin" NOT NULL DEFAULT 'OBSERVED',
    "competencia" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketIntelligenceCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketIntelligenceMunicipalityMapping" (
    "id" TEXT NOT NULL,
    "receitaCode" TEXT NOT NULL,
    "receitaName" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "ibgeCode" TEXT NOT NULL,
    "ibgeName" TEXT NOT NULL,
    "region" TEXT,
    "mappingMethod" TEXT NOT NULL,
    "sourceVersion" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketIntelligenceMunicipalityMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnrichmentLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "rawData" JSONB,
    "dataOrigin" TEXT,
    "appliedToCompany" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnrichmentLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "department" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "emailIndex" TEXT,
    "emailDomainIndex" TEXT,
    "phoneIndex" TEXT,
    "phoneLast8Index" TEXT,
    "phoneLast9Index" TEXT,
    "whatsappIndex" TEXT,
    "whatsappLast8Index" TEXT,
    "whatsappLast9Index" TEXT,
    "linkedin" TEXT,
    "birthDate" TIMESTAMP(3),
    "observations" TEXT,
    "status" "ContactStatus" NOT NULL DEFAULT 'Ativo',
    "source" TEXT,
    "seniority" TEXT,
    "emailStatus" TEXT,
    "aiProcessingConsent" BOOLEAN,
    "customFields" JSONB,
    "companyId" TEXT NOT NULL,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "deleteReason" TEXT,
    "bitrixContactId" TEXT,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'Lead Recebido',
    "source" TEXT,
    "channel" TEXT,
    "temperature" "LeadTemperature",
    "score" INTEGER,
    "owner" TEXT,
    "lastInteraction" TIMESTAMP(3),
    "nextAction" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "pic" TEXT,
    "qualification" JSONB,
    "title" TEXT,
    "amount" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "probability" INTEGER,
    "expectedCloseAt" TIMESTAMP(3),
    "customFields" JSONB,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "funnel" "LeadFunnel" NOT NULL DEFAULT 'Lead',
    "resumeDate" TIMESTAMP(3),
    "cadenceStage" TEXT,
    "lossReason" TEXT,
    "dealPackage" TEXT,
    "dealStatus" TEXT,
    "relationshipLevel" TEXT,
    "commissionPercent" TEXT,
    "partnerBroker" TEXT,
    "qualificationValidatedByAM" BOOLEAN,
    "bitrixLeadId" TEXT,
    "bitrixDealId" TEXT,
    "bitrixStageLabel" TEXT,
    "contractSignedDate" TIMESTAMP(3),
    "bitrixSyncStatus" TEXT,
    "bitrixSyncError" TEXT,
    "bitrixSyncedAt" TIMESTAMP(3),
    "companyId" TEXT,
    "contactId" TEXT,
    "savedSearchId" TEXT,
    "pipelineId" TEXT,
    "pipelineStageId" TEXT,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "deleteReason" TEXT,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "owner" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT,
    "status" "ActivityStatus" NOT NULL DEFAULT 'Pendente',
    "observations" TEXT,
    "leadId" TEXT NOT NULL,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "deleteReason" TEXT,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimelineEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "leadId" TEXT,
    "companyId" TEXT,
    "contactId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "leadId" TEXT,
    "companyId" TEXT,
    "contactId" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "objectKey" TEXT NOT NULL,
    "uploadedBy" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "deleteReason" TEXT,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "actorId" TEXT,
    "tenantId" TEXT,
    "ipAddress" TEXT,
    "details" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'VISUALIZADOR',
    "bitrixUserId" INTEGER,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "monthlyAiBudgetUsd" DOUBLE PRECISION,
    "monthlyProspectingBudgetUsd" DOUBLE PRECISION,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialGoal" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "metric" TEXT NOT NULL DEFAULT 'NEW_MRR',
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommercialGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadStageHistory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "pipelineId" TEXT,
    "stageId" TEXT,
    "stageName" TEXT NOT NULL,
    "probability" INTEGER,
    "isWon" BOOLEAN NOT NULL DEFAULT false,
    "isLost" BOOLEAN NOT NULL DEFAULT false,
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exitedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadStageHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForecastSnapshot" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rulesVersion" TEXT NOT NULL,
    "commitAmount" DECIMAL(14,2) NOT NULL,
    "bestCaseAmount" DECIMAL(14,2) NOT NULL,
    "forecastAmount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',

    CONSTRAINT "ForecastSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadFieldChange" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "previousValue" TEXT,
    "newValue" TEXT,
    "changedBy" TEXT,
    "source" TEXT NOT NULL DEFAULT 'crm',
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadFieldChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedView" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "funnel" TEXT NOT NULL,
    "filters" JSONB NOT NULL DEFAULT '{}',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountIntelligenceSnapshot" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "summary" TEXT NOT NULL,
    "structuredFacts" JSONB NOT NULL,
    "sourceStatus" JSONB NOT NULL,
    "status" "IntelligenceSnapshotStatus" NOT NULL DEFAULT 'Partial',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountIntelligenceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountSignal" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "snapshotId" TEXT,
    "type" TEXT NOT NULL,
    "taxonomyVersion" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveAt" TIMESTAMP(3),
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL,
    "evidenceType" "IntelligenceEvidenceType" NOT NULL,
    "status" "AccountSignalStatus" NOT NULL DEFAULT 'Active',
    "dedupeKey" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecisionMaker" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "snapshotId" TEXT,
    "buyingRole" TEXT NOT NULL,
    "department" TEXT,
    "seniority" TEXT,
    "roleEvidenceType" "IntelligenceEvidenceType" NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "confidence" DOUBLE PRECISION NOT NULL,
    "status" "DecisionMakerStatus" NOT NULL DEFAULT 'Unverified',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DecisionMaker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntelligenceEvidence" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "snapshotId" TEXT,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT,
    "factKey" TEXT NOT NULL,
    "value" JSONB,
    "valueHash" TEXT,
    "reference" TEXT,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confidence" DOUBLE PRECISION,
    "evidenceType" "IntelligenceEvidenceType" NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntelligenceEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountScore" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "fit" INTEGER NOT NULL,
    "timing" INTEGER NOT NULL,
    "intent" INTEGER NOT NULL,
    "relationship" INTEGER NOT NULL,
    "positiveReasons" TEXT[],
    "negativeReasons" TEXT[],
    "calculation" JSONB NOT NULL,
    "scoreVersion" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountRecommendation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "accountScoreId" TEXT,
    "actionType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "expectedImpact" TEXT,
    "status" "AccountRecommendationStatus" NOT NULL DEFAULT 'Pending',
    "recommendationVersion" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "generatedBy" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "executedAt" TIMESTAMP(3),
    "externalRef" TEXT,
    "idempotencyKey" TEXT,
    "statusReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EconomicRelationship" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sourceCompanyId" TEXT NOT NULL,
    "targetCompanyId" TEXT NOT NULL,
    "snapshotId" TEXT,
    "relationType" TEXT NOT NULL,
    "status" "EconomicRelationshipStatus" NOT NULL DEFAULT 'Inferred',
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EconomicRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectRejection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tradeName" TEXT NOT NULL,
    "website" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProspectRejection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmPipeline" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "entity" "CrmPipelineEntity" NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "deleteReason" TEXT,

    CONSTRAINT "CrmPipeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmPipelineStage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#64748b',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "probability" INTEGER NOT NULL DEFAULT 0,
    "leadStatus" "LeadStatus",
    "isWon" BOOLEAN NOT NULL DEFAULT false,
    "isLost" BOOLEAN NOT NULL DEFAULT false,
    "tunnelTargetStageId" TEXT,
    "automation" JSONB,
    "pipelineId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmPipelineStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sku" TEXT,
    "type" "CrmProductType" NOT NULL DEFAULT 'Servico',
    "category" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'un',
    "price" DOUBLE PRECISION NOT NULL,
    "cost" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "taxPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "stockQuantity" DOUBLE PRECISION,
    "customFields" JSONB,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "deleteReason" TEXT,

    CONSTRAINT "CrmProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmDealItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "discountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "leadId" TEXT NOT NULL,
    "productId" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "deleteReason" TEXT,

    CONSTRAINT "CrmDealItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmCommercialDocument" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "type" "CrmDocumentType" NOT NULL,
    "status" "CrmDocumentStatus" NOT NULL DEFAULT 'Rascunho',
    "title" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lineItems" JSONB NOT NULL,
    "notes" TEXT,
    "terms" TEXT,
    "publicToken" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "firstViewedAt" TIMESTAMP(3),
    "lastViewedAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "leadId" TEXT,
    "companyId" TEXT,
    "contactId" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "deleteReason" TEXT,
    "stripeConnectionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "paymentReconciledAt" TIMESTAMP(3),

    CONSTRAINT "CrmCommercialDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prompt" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[],
    "variables" JSONB NOT NULL,
    "history" JSONB NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "metadata" JSONB,
    "content" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'text',
    "sourceName" TEXT,
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentChunk" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL DEFAULT 0,
    "vector" vector(768),

    CONSTRAINT "DocumentChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentMemory" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "agentType" TEXT NOT NULL,
    "messages" JSONB NOT NULL,
    "status" "AgentMemoryStatus" NOT NULL DEFAULT 'Completed',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT,

    CONSTRAINT "AgentMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AILog" (
    "id" TEXT NOT NULL,
    "tokens" INTEGER NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "model" TEXT NOT NULL,
    "promptId" TEXT,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AILog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIGuardrailEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIGuardrailEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metrics" JSONB NOT NULL,
    "source" "ReportSource" NOT NULL DEFAULT 'ON_DEMAND',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistantMessage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssistantMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleplaySession" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "personaLabel" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "transcript" JSONB NOT NULL,
    "turnEvaluations" JSONB NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "clarityScore" INTEGER NOT NULL,
    "objectionHandlingScore" INTEGER NOT NULL,
    "closingScore" INTEGER NOT NULL,
    "strengths" JSONB NOT NULL,
    "improvements" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoleplaySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualificationMatrixItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "segment" TEXT NOT NULL,
    "persona" TEXT NOT NULL,
    "framework" TEXT NOT NULL,
    "questionCategory" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "idealAnswer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QualificationMatrixItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObjectionMatrixItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "segment" TEXT NOT NULL,
    "persona" TEXT NOT NULL,
    "objectionTitle" TEXT NOT NULL,
    "objectionText" TEXT NOT NULL,
    "responseScript" TEXT NOT NULL,
    "keyDifferentiator" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ObjectionMatrixItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "kind" "NotificationKind" NOT NULL DEFAULT 'Info',
    "entity" TEXT,
    "entityId" TEXT,
    "readAt" TIMESTAMP(3),
    "userId" TEXT,
    "automationId" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Automation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "trigger" "AutomationTrigger" NOT NULL,
    "conditions" JSONB,
    "action" "AutomationAction" NOT NULL,
    "actionConfig" JSONB NOT NULL,
    "lastRunAt" TIMESTAMP(3),
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Automation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationVersion" (
    "id" TEXT NOT NULL,
    "automationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "trigger" "AutomationTrigger" NOT NULL,
    "conditions" JSONB,
    "action" "AutomationAction" NOT NULL,
    "actionConfig" JSONB NOT NULL,
    "editedByUserId" TEXT,
    "editedByEmail" TEXT,
    "changeReason" TEXT NOT NULL DEFAULT 'update',
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallSuppression" (
    "id" TEXT NOT NULL,
    "phoneE164" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "reason" TEXT,
    "leadId" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallSuppression_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppMessage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "waMessageId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "phoneE164" TEXT NOT NULL,
    "body" TEXT,
    "contactId" TEXT,
    "leadId" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationSignal" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'whatsapp',
    "messageCount" INTEGER NOT NULL,
    "intent" TEXT,
    "urgency" TEXT,
    "objections" TEXT[],
    "budgetMentioned" BOOLEAN NOT NULL DEFAULT false,
    "nextStep" TEXT,
    "summary" TEXT,
    "confidence" DOUBLE PRECISION,
    "rawModelOutput" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CopilotoConversation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "source" "CopilotoConversationSource" NOT NULL,
    "status" "CopilotoConversationStatus" NOT NULL DEFAULT 'SCHEDULED',
    "title" TEXT,
    "externalMeetingId" TEXT,
    "leadId" TEXT,
    "companyId" TEXT,
    "contactId" TEXT,
    "consentStatus" "CopilotoConsentStatus" NOT NULL DEFAULT 'PENDING',
    "createdBy" TEXT,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "audioObjectKey" TEXT,
    "audioMimeType" TEXT,
    "audioSizeBytes" INTEGER,
    "audioDurationMs" INTEGER,
    "transcriptionStartedAt" TIMESTAMP(3),
    "transcriptionCompletedAt" TIMESTAMP(3),
    "transcriptionError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "deleteReason" TEXT,

    CONSTRAINT "CopilotoConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CopilotoTranscriptSegment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "speakerLabel" TEXT,
    "startMs" INTEGER NOT NULL,
    "endMs" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CopilotoTranscriptSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CopilotoInsight" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "valueJson" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION,
    "evidenceSegmentIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CopilotoInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CopilotoCrmFieldSuggestion" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "entityType" "CopilotoCrmEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "fieldCode" TEXT NOT NULL,
    "previousValue" TEXT,
    "suggestedValue" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "status" "CopilotoSuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "writebackAt" TIMESTAMP(3),
    "writebackError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CopilotoCrmFieldSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CopilotoBitrixFieldMapping" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "entityType" "CopilotoCrmEntityType" NOT NULL,
    "semanticField" TEXT NOT NULL,
    "bitrixFieldCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CopilotoBitrixFieldMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CopilotoDealHealthSnapshot" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "factorsJson" JSONB NOT NULL,
    "forecastProbabilityAi" INTEGER,
    "forecastReasons" TEXT[],
    "churnRiskScore" INTEGER,
    "churnFactorsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CopilotoDealHealthSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CopilotoCoachingEvaluation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "rubricJson" JSONB NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CopilotoCoachingEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CopilotoConsentRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "textVersion" TEXT NOT NULL,
    "actorId" TEXT,
    "grantedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CopilotoConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleWorkspaceConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleWorkspaceConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BitrixConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Bitrix24',
    "webhookUrl" TEXT NOT NULL,
    "lastImportedAt" TIMESTAMP(3),
    "webhookSecret" TEXT,
    "inboundEventsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BitrixConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BitrixSyncRule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'deal',
    "categoryId" TEXT,
    "stageId" TEXT,
    "assignedById" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "lastImportedCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BitrixSyncRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BitrixSyncLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "connectionId" TEXT,
    "direction" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "leadId" TEXT,
    "bitrixRecordId" TEXT,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "correlationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BitrixSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BitrixExtractionRun" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "connectionId" TEXT,
    "requestedBy" TEXT,
    "entities" TEXT[],
    "fields" JSONB NOT NULL,
    "filters" JSONB NOT NULL,
    "status" "BitrixExtractionStatus" NOT NULL DEFAULT 'queued',
    "schemaVersion" TEXT,
    "progress" JSONB,
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "countByEntity" JSONB,
    "errorMessage" TEXT,
    "correlationId" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "files" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "purgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BitrixExtractionRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreeCXConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '3CX',
    "pbxUrl" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "apiKey" TEXT,
    "apiSecret" TEXT,
    "autoDialEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThreeCXConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceHubConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Birth Voices Hub',
    "baseUrl" TEXT NOT NULL,
    "apiKey" TEXT,
    "agentId" TEXT,
    "webhookSecret" TEXT,
    "scriptPersonaName" TEXT,
    "scriptCompanyDescription" TEXT,
    "scriptOfferText" TEXT,
    "scriptClosingLine" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoiceHubConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlackConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Slack',
    "webhookUrl" TEXT,
    "botToken" TEXT,
    "defaultChannel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlackConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Stripe',
    "secretKey" TEXT NOT NULL,
    "webhookSecret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StripeConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OmieConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Omie',
    "appKey" TEXT NOT NULL,
    "appSecret" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OmieConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceCallLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "providerCallId" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT,
    "transcript" TEXT,
    "recordingUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoiceCallLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptOutRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "scope" "OptOutScope" NOT NULL,
    "leadId" TEXT,
    "email" TEXT,
    "phoneE164" TEXT,
    "originChannel" TEXT NOT NULL,
    "reason" TEXT,
    "evidence" TEXT,
    "requestedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OptOutRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ColdCallRun" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "scanned" INTEGER NOT NULL,
    "called" INTEGER NOT NULL,
    "skippedMaxAttempts" INTEGER NOT NULL DEFAULT 0,
    "skippedCooldown" INTEGER NOT NULL DEFAULT 0,
    "skippedNoPhone" INTEGER NOT NULL DEFAULT 0,
    "skippedSuppressed" INTEGER NOT NULL DEFAULT 0,
    "skippedError" INTEGER NOT NULL DEFAULT 0,
    "haltedBy" TEXT,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ColdCallRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIPendingAction" (
    "id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "agentRole" TEXT,
    "riskLevel" TEXT NOT NULL DEFAULT 'medium',
    "confidence" DOUBLE PRECISION,
    "idempotencyKey" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "discardedAt" TIMESTAMP(3),
    "discardedBy" TEXT,
    "executed" BOOLEAN NOT NULL DEFAULT false,
    "executedAt" TIMESTAMP(3),
    "executionError" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "outcomeStatus" "AIPendingActionOutcome" NOT NULL DEFAULT 'UNMEASURED',
    "outcome" JSONB,
    "outcomeNotes" TEXT,
    "outcomeMeasuredAt" TIMESTAMP(3),
    "outcomeMeasuredBy" TEXT,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIPendingAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiEngineSetting" (
    "id" TEXT NOT NULL,
    "toolKey" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiEngineSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prospect" (
    "id" TEXT NOT NULL,
    "cnpj" TEXT,
    "companyName" TEXT NOT NULL,
    "fantasyName" TEXT,
    "confidenceScore" INTEGER NOT NULL DEFAULT 0,
    "enrichedData" JSONB,
    "intelligence" JSONB,
    "leadScore" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "bitrixId" TEXT,
    "companyId" TEXT,
    "leadId" TEXT,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prospect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationFeatureFlag" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "featureFlagId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "updatedByUserId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationFeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleAccessGrant" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "grantedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModuleAccessGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MesaTratamentoTreatment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MesaTratamentoTreatment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PomodoroSession" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "cycleNumber" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PomodoroSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyPlanClosing" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "referenceDate" TEXT NOT NULL,
    "totalItems" INTEGER NOT NULL,
    "completedItems" INTEGER NOT NULL,
    "pendingItems" INTEGER NOT NULL,
    "completionRate" INTEGER NOT NULL,
    "userComment" TEXT NOT NULL,
    "nextDayGoals" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyPlanClosing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BugReport" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "userEmail" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "context" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BugReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadenceSequence" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "touches" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CadenceSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadenceRun" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "sequenceId" TEXT NOT NULL,
    "status" "CadenceRunStatus" NOT NULL DEFAULT 'Active',
    "currentTouchOrder" INTEGER NOT NULL DEFAULT 1,
    "stopReason" "CadenceStopReason",
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastTouchAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "stoppedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CadenceRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadenceTouchAttempt" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "cadenceRunId" TEXT NOT NULL,
    "touchOrder" INTEGER NOT NULL,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "channel" "CadenceChannel" NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "result" "CadenceTouchResult" NOT NULL,
    "skipReason" TEXT,
    "error" TEXT,
    "providerMessageId" TEXT,

    CONSTRAINT "CadenceTouchAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailMessage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "providerMessageId" TEXT NOT NULL,
    "inReplyTo" TEXT,
    "direction" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT,
    "leadId" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadenceCalendarEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "cadenceRunId" TEXT,
    "googleEventId" TEXT,
    "meetUrl" TEXT,
    "iCalUID" TEXT,
    "confirmationEvidenceType" "ConfirmationEvidenceType" NOT NULL,
    "confirmationEvidenceRef" TEXT NOT NULL,
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3) NOT NULL,
    "ownerUserId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CadenceCalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmCommercialDocumentVersion" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changedBy" TEXT,
    "changeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmCommercialDocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmDocumentSignatureRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerRequestId" TEXT,
    "status" "SignatureRequestStatus" NOT NULL DEFAULT 'Created',
    "signerEmail" TEXT NOT NULL,
    "signerName" TEXT,
    "requestedBy" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "evidenceRef" TEXT,
    "rawWebhookPayload" JSONB,

    CONSTRAINT "CrmDocumentSignatureRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealClosureEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" "DealClosureEventType" NOT NULL,
    "evidenceRef" TEXT NOT NULL,
    "triggeredBy" TEXT NOT NULL,
    "previousStatus" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealClosureEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreeCXCallEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "connectionId" TEXT,
    "extension" TEXT,
    "callId" TEXT,
    "eventType" TEXT NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThreeCXCallEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicBookingLink" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "durationMin" INTEGER NOT NULL DEFAULT 30,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicBookingLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "criteria" JSONB NOT NULL,
    "schedule" TEXT,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "leadsDiscovered" INTEGER NOT NULL DEFAULT 0,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectingSearchExecution" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "savedSearchId" TEXT,
    "criteria" JSONB NOT NULL,
    "providerMode" TEXT NOT NULL,
    "providersCalled" JSONB NOT NULL,
    "totalResults" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProspectingSearchExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRole" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "department" TEXT,
    "level" INTEGER,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserJobRole" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobRoleId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,

    CONSTRAINT "UserJobRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "domain" TEXT,
    "primaryJobRoleId" TEXT,
    "status" "AgentDefinitionStatus" NOT NULL DEFAULT 'CATALOG_ONLY',
    "risk" TEXT,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentVersion" (
    "id" TEXT NOT NULL,
    "agentDefinitionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "systemPrompt" TEXT,
    "configuration" JSONB,
    "status" "AgentVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "activatedAt" TIMESTAMP(3),
    "deprecatedAt" TIMESTAMP(3),

    CONSTRAINT "AgentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleAgentGrant" (
    "id" TEXT NOT NULL,
    "jobRoleId" TEXT NOT NULL,
    "agentDefinitionId" TEXT NOT NULL,
    "accessLevel" "AgentAccessLevel" NOT NULL DEFAULT 'EXECUTE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoleAgentGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapabilityDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "domain" TEXT,
    "riskLevel" "CapabilityRiskLevel" NOT NULL DEFAULT 'LOW',
    "actionType" "CapabilityActionType" NOT NULL,
    "isReadOnly" BOOLEAN NOT NULL DEFAULT false,
    "requiresApprovalByDefault" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapabilityDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentCapabilityGrant" (
    "id" TEXT NOT NULL,
    "agentDefinitionId" TEXT NOT NULL,
    "capabilityDefinitionId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentCapabilityGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleCapabilityGrant" (
    "id" TEXT NOT NULL,
    "jobRoleId" TEXT NOT NULL,
    "capabilityDefinitionId" TEXT NOT NULL,
    "accessLevel" "AgentAccessLevel" NOT NULL DEFAULT 'EXECUTE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoleCapabilityGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentExecution" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "jobRoleCode" TEXT,
    "agentDefinitionId" TEXT,
    "agentVersionId" TEXT,
    "agentCode" TEXT NOT NULL,
    "capabilityCode" TEXT NOT NULL,
    "mission" TEXT,
    "status" "AgentExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "policyDecision" JSONB,
    "summary" TEXT,
    "facts" JSONB,
    "metrics" JSONB,
    "evidence" JSONB,
    "risks" JSONB,
    "recommendations" JSONB,
    "nextActions" JSONB,
    "missingData" JSONB,
    "toolCalls" JSONB,
    "confidence" DOUBLE PRECISION,
    "errorMessage" TEXT,
    "correlationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AgentExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "requesterRole" TEXT NOT NULL,
    "requesterJobRoleCode" TEXT,
    "capabilityDefinitionId" TEXT NOT NULL,
    "category" "AccessRequestCategory" NOT NULL,
    "resource" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "AccessRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalDecision" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "accessRequestId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "approverRole" TEXT NOT NULL,
    "outcome" "ApprovalDecisionOutcome" NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "notes" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemporaryCapabilityGrant" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "accessRequestId" TEXT NOT NULL,
    "granteeId" TEXT NOT NULL,
    "capabilityDefinitionId" TEXT NOT NULL,
    "resource" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "revokedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemporaryCapabilityGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentHandoffMessage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "fromAgent" TEXT NOT NULL,
    "fromRole" TEXT NOT NULL,
    "toAgent" TEXT NOT NULL,
    "toRole" TEXT NOT NULL,
    "requestType" TEXT NOT NULL,
    "requestedCapability" TEXT NOT NULL,
    "resourceScope" JSONB,
    "knownFacts" JSONB NOT NULL DEFAULT '[]',
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "risks" JSONB NOT NULL DEFAULT '[]',
    "authorizationContext" JSONB,
    "priority" "HandoffPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "HandoffStatus" NOT NULL DEFAULT 'CREATED',
    "response" JSONB,
    "confidence" DOUBLE PRECISION,
    "errorMessage" TEXT,
    "idempotencyKey" TEXT,
    "parentHandoffId" TEXT,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "executionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "AgentHandoffMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningCandidate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sourceExecutionId" TEXT NOT NULL,
    "agentCode" TEXT NOT NULL,
    "jobRoleCode" TEXT,
    "targetScope" "MemoryScope" NOT NULL,
    "topic" TEXT NOT NULL,
    "category" "MemoryCategory" NOT NULL,
    "proposedContent" JSONB NOT NULL,
    "reflection" JSONB NOT NULL,
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "sanitization" JSONB,
    "status" "MemoryStatus" NOT NULL DEFAULT 'PROPOSED',
    "deciderId" TEXT,
    "deciderRole" TEXT,
    "decisionNotes" TEXT,
    "decidedAt" TIMESTAMP(3),
    "resultingMemoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentMemoryRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "agentCode" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "category" "MemoryCategory" NOT NULL,
    "content" JSONB NOT NULL,
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "MemoryStatus" NOT NULL DEFAULT 'APPROVED',
    "sourceCandidateId" TEXT NOT NULL,
    "supersedesId" TEXT,
    "supersededById" TEXT,
    "rolledBackBy" TEXT,
    "rolledBackAt" TIMESTAMP(3),
    "rolledBackReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentMemoryRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleMemoryRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "jobRoleCode" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "category" "MemoryCategory" NOT NULL,
    "content" JSONB NOT NULL,
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "MemoryStatus" NOT NULL DEFAULT 'APPROVED',
    "sourceCandidateId" TEXT NOT NULL,
    "supersedesId" TEXT,
    "supersededById" TEXT,
    "rolledBackBy" TEXT,
    "rolledBackAt" TIMESTAMP(3),
    "rolledBackReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleMemoryRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMemoryRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "category" "MemoryCategory" NOT NULL,
    "content" JSONB NOT NULL,
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "MemoryStatus" NOT NULL DEFAULT 'APPROVED',
    "sourceCandidateId" TEXT NOT NULL,
    "supersedesId" TEXT,
    "supersededById" TEXT,
    "rolledBackBy" TEXT,
    "rolledBackAt" TIMESTAMP(3),
    "rolledBackReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationMemoryRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentBuildProposal" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "requestedByRole" TEXT NOT NULL,
    "need" TEXT NOT NULL,
    "targetJobRoleCode" TEXT,
    "gapAnalysis" JSONB NOT NULL,
    "agentSpec" JSONB,
    "capabilitySpec" JSONB,
    "toolBindingSpec" JSONB,
    "promptSpec" JSONB,
    "testsSpec" JSONB,
    "riskReview" JSONB,
    "status" "AgentBuildProposalStatus" NOT NULL DEFAULT 'DRAFT',
    "reviewedBy" TEXT,
    "reviewedByRole" TEXT,
    "reviewNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentBuildProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialMission" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "accountName" TEXT NOT NULL,
    "cnpj" TEXT,
    "segment" TEXT,
    "fleetSize" INTEGER,
    "estimatedRevenue" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "currentCadenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommercialMission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NextBestActionRecommendation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "channel" TEXT,
    "objective" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "recommendedMessage" TEXT,
    "evidence" JSONB,
    "confidence" DOUBLE PRECISION NOT NULL,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scheduledFor" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),
    "actorId" TEXT,
    "feedbackReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NextBestActionRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialMissionEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommercialMissionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionScore" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "icpScore" DOUBLE PRECISION NOT NULL,
    "fitScore" DOUBLE PRECISION NOT NULL,
    "intentScore" DOUBLE PRECISION NOT NULL,
    "opportunityScore" DOUBLE PRECISION NOT NULL,
    "evidence" JSONB,

    CONSTRAINT "MissionScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionAgentTrace" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "trace" JSONB NOT NULL,

    CONSTRAINT "MissionAgentTrace_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Company_organizationId_idx" ON "Company"("organizationId");

-- CreateIndex
CREATE INDEX "Company_cnpj_idx" ON "Company"("cnpj");

-- CreateIndex
CREATE INDEX "Company_legalName_idx" ON "Company"("legalName");

-- CreateIndex
CREATE INDEX "Company_tradeName_idx" ON "Company"("tradeName");

-- CreateIndex
CREATE INDEX "Company_bitrixCompanyId_idx" ON "Company"("bitrixCompanyId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_id_organizationId_key" ON "Company"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_organizationId_cnpj_key" ON "Company"("organizationId", "cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "MarketIntelligenceDataset_publicationSlot_key" ON "MarketIntelligenceDataset"("publicationSlot");

-- CreateIndex
CREATE INDEX "MarketIntelligenceDataset_dataset_status_competencia_idx" ON "MarketIntelligenceDataset"("dataset", "status", "competencia");

-- CreateIndex
CREATE INDEX "MarketIntelligenceDataset_competencia_idx" ON "MarketIntelligenceDataset"("competencia");

-- CreateIndex
CREATE UNIQUE INDEX "MarketIntelligenceDataset_dataset_competencia_hash_key" ON "MarketIntelligenceDataset"("dataset", "competencia", "hash");

-- CreateIndex
CREATE INDEX "MarketIntelligenceCompany_datasetId_cnpjBasico_idx" ON "MarketIntelligenceCompany"("datasetId", "cnpjBasico");

-- CreateIndex
CREATE INDEX "MarketIntelligenceCompany_datasetId_cnaePrincipal_uf_idx" ON "MarketIntelligenceCompany"("datasetId", "cnaePrincipal", "uf");

-- CreateIndex
CREATE INDEX "MarketIntelligenceCompany_datasetId_uf_municipioIbge_idx" ON "MarketIntelligenceCompany"("datasetId", "uf", "municipioIbge");

-- CreateIndex
CREATE INDEX "MarketIntelligenceCompany_datasetId_uf_situacaoCadastral_idx" ON "MarketIntelligenceCompany"("datasetId", "uf", "situacaoCadastral");

-- CreateIndex
CREATE INDEX "MarketIntelligenceCompany_datasetId_municipioIbge_situacaoC_idx" ON "MarketIntelligenceCompany"("datasetId", "municipioIbge", "situacaoCadastral");

-- CreateIndex
CREATE INDEX "MarketIntelligenceCompany_datasetId_municipioIbge_icpTier_idx" ON "MarketIntelligenceCompany"("datasetId", "municipioIbge", "icpTier");

-- CreateIndex
CREATE INDEX "MarketIntelligenceCompany_datasetId_municipioNomeSearch_idx" ON "MarketIntelligenceCompany"("datasetId", "municipioNomeSearch");

-- CreateIndex
CREATE INDEX "MarketIntelligenceCompany_datasetId_matrizFilial_idx" ON "MarketIntelligenceCompany"("datasetId", "matrizFilial");

-- CreateIndex
CREATE INDEX "MarketIntelligenceCompany_datasetId_hasRntrc_idx" ON "MarketIntelligenceCompany"("datasetId", "hasRntrc");

-- CreateIndex
CREATE INDEX "MarketIntelligenceCompany_datasetId_icpScore_idx" ON "MarketIntelligenceCompany"("datasetId", "icpScore");

-- CreateIndex
CREATE INDEX "MarketIntelligenceCompany_datasetId_capitalSocial_idx" ON "MarketIntelligenceCompany"("datasetId", "capitalSocial");

-- CreateIndex
CREATE INDEX "MarketIntelligenceCompany_competencia_idx" ON "MarketIntelligenceCompany"("competencia");

-- CreateIndex
CREATE UNIQUE INDEX "MarketIntelligenceCompany_datasetId_cnpj_key" ON "MarketIntelligenceCompany"("datasetId", "cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "MarketIntelligenceMunicipalityMapping_receitaCode_key" ON "MarketIntelligenceMunicipalityMapping"("receitaCode");

-- CreateIndex
CREATE INDEX "MarketIntelligenceMunicipalityMapping_ibgeCode_idx" ON "MarketIntelligenceMunicipalityMapping"("ibgeCode");

-- CreateIndex
CREATE INDEX "MarketIntelligenceMunicipalityMapping_uf_ibgeName_idx" ON "MarketIntelligenceMunicipalityMapping"("uf", "ibgeName");

-- CreateIndex
CREATE INDEX "EnrichmentLog_companyId_createdAt_idx" ON "EnrichmentLog"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "Contact_organizationId_idx" ON "Contact"("organizationId");

-- CreateIndex
CREATE INDEX "Contact_name_idx" ON "Contact"("name");

-- CreateIndex
CREATE INDEX "Contact_role_idx" ON "Contact"("role");

-- CreateIndex
CREATE INDEX "Contact_bitrixContactId_idx" ON "Contact"("bitrixContactId");

-- CreateIndex
CREATE INDEX "Contact_emailIndex_idx" ON "Contact"("emailIndex");

-- CreateIndex
CREATE INDEX "Contact_emailDomainIndex_idx" ON "Contact"("emailDomainIndex");

-- CreateIndex
CREATE INDEX "Contact_phoneIndex_idx" ON "Contact"("phoneIndex");

-- CreateIndex
CREATE INDEX "Contact_phoneLast8Index_idx" ON "Contact"("phoneLast8Index");

-- CreateIndex
CREATE INDEX "Contact_phoneLast9Index_idx" ON "Contact"("phoneLast9Index");

-- CreateIndex
CREATE INDEX "Contact_whatsappIndex_idx" ON "Contact"("whatsappIndex");

-- CreateIndex
CREATE INDEX "Contact_whatsappLast8Index_idx" ON "Contact"("whatsappLast8Index");

-- CreateIndex
CREATE INDEX "Contact_whatsappLast9Index_idx" ON "Contact"("whatsappLast9Index");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_id_companyId_organizationId_key" ON "Contact"("id", "companyId", "organizationId");

-- CreateIndex
CREATE INDEX "Lead_organizationId_idx" ON "Lead"("organizationId");

-- CreateIndex
CREATE INDEX "Lead_organizationId_status_idx" ON "Lead"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Lead_organizationId_funnel_idx" ON "Lead"("organizationId", "funnel");

-- CreateIndex
CREATE INDEX "Lead_organizationId_pipelineId_pipelineStageId_idx" ON "Lead"("organizationId", "pipelineId", "pipelineStageId");

-- CreateIndex
CREATE INDEX "Lead_bitrixLeadId_idx" ON "Lead"("bitrixLeadId");

-- CreateIndex
CREATE INDEX "Lead_bitrixDealId_idx" ON "Lead"("bitrixDealId");

-- CreateIndex
CREATE INDEX "Lead_savedSearchId_idx" ON "Lead"("savedSearchId");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_organizationId_bitrixLeadId_key" ON "Lead"("organizationId", "bitrixLeadId");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_organizationId_bitrixDealId_key" ON "Lead"("organizationId", "bitrixDealId");

-- CreateIndex
CREATE INDEX "Activity_organizationId_idx" ON "Activity"("organizationId");

-- CreateIndex
CREATE INDEX "Note_leadId_idx" ON "Note"("leadId");

-- CreateIndex
CREATE INDEX "Note_companyId_idx" ON "Note"("companyId");

-- CreateIndex
CREATE INDEX "Note_contactId_idx" ON "Note"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "Attachment_objectKey_key" ON "Attachment"("objectKey");

-- CreateIndex
CREATE INDEX "Attachment_organizationId_idx" ON "Attachment"("organizationId");

-- CreateIndex
CREATE INDEX "Attachment_leadId_idx" ON "Attachment"("leadId");

-- CreateIndex
CREATE INDEX "Attachment_companyId_idx" ON "Attachment"("companyId");

-- CreateIndex
CREATE INDEX "Attachment_contactId_idx" ON "Attachment"("contactId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_entity_action_idx" ON "AuditLog"("tenantId", "entity", "action");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_timestamp_idx" ON "AuditLog"("actorId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_organizationId_idx" ON "user"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_name_key" ON "Organization"("name");

-- CreateIndex
CREATE INDEX "CommercialGoal_organizationId_period_idx" ON "CommercialGoal"("organizationId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialGoal_organizationId_period_metric_key" ON "CommercialGoal"("organizationId", "period", "metric");

-- CreateIndex
CREATE INDEX "LeadStageHistory_organizationId_leadId_enteredAt_idx" ON "LeadStageHistory"("organizationId", "leadId", "enteredAt");

-- CreateIndex
CREATE INDEX "LeadStageHistory_organizationId_stageId_idx" ON "LeadStageHistory"("organizationId", "stageId");

-- CreateIndex
CREATE INDEX "LeadStageHistory_leadId_exitedAt_idx" ON "LeadStageHistory"("leadId", "exitedAt");

-- CreateIndex
CREATE INDEX "ForecastSnapshot_organizationId_period_idx" ON "ForecastSnapshot"("organizationId", "period");

-- CreateIndex
CREATE INDEX "ForecastSnapshot_organizationId_period_snapshotAt_idx" ON "ForecastSnapshot"("organizationId", "period", "snapshotAt");

-- CreateIndex
CREATE INDEX "LeadFieldChange_organizationId_field_changedAt_idx" ON "LeadFieldChange"("organizationId", "field", "changedAt");

-- CreateIndex
CREATE INDEX "LeadFieldChange_organizationId_leadId_field_idx" ON "LeadFieldChange"("organizationId", "leadId", "field");

-- CreateIndex
CREATE INDEX "LeadFieldChange_leadId_changedAt_idx" ON "LeadFieldChange"("leadId", "changedAt");

-- CreateIndex
CREATE INDEX "SavedView_organizationId_userId_idx" ON "SavedView"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedView_userId_name_key" ON "SavedView"("userId", "name");

-- CreateIndex
CREATE INDEX "AccountIntelligenceSnapshot_organizationId_companyId_genera_idx" ON "AccountIntelligenceSnapshot"("organizationId", "companyId", "generatedAt" DESC);

-- CreateIndex
CREATE INDEX "AccountIntelligenceSnapshot_organizationId_companyId_status_idx" ON "AccountIntelligenceSnapshot"("organizationId", "companyId", "status");

-- CreateIndex
CREATE INDEX "AccountIntelligenceSnapshot_organizationId_expiresAt_idx" ON "AccountIntelligenceSnapshot"("organizationId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AccountIntelligenceSnapshot_organizationId_companyId_versio_key" ON "AccountIntelligenceSnapshot"("organizationId", "companyId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "AccountIntelligenceSnapshot_id_organizationId_companyId_key" ON "AccountIntelligenceSnapshot"("id", "organizationId", "companyId");

-- CreateIndex
CREATE INDEX "AccountSignal_organizationId_companyId_detectedAt_idx" ON "AccountSignal"("organizationId", "companyId", "detectedAt" DESC);

-- CreateIndex
CREATE INDEX "AccountSignal_organizationId_companyId_type_status_idx" ON "AccountSignal"("organizationId", "companyId", "type", "status");

-- CreateIndex
CREATE INDEX "AccountSignal_organizationId_status_lastSeenAt_idx" ON "AccountSignal"("organizationId", "status", "lastSeenAt" DESC);

-- CreateIndex
CREATE INDEX "AccountSignal_snapshotId_idx" ON "AccountSignal"("snapshotId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountSignal_organizationId_companyId_dedupeKey_key" ON "AccountSignal"("organizationId", "companyId", "dedupeKey");

-- CreateIndex
CREATE INDEX "DecisionMaker_organizationId_companyId_status_idx" ON "DecisionMaker"("organizationId", "companyId", "status");

-- CreateIndex
CREATE INDEX "DecisionMaker_organizationId_companyId_buyingRole_idx" ON "DecisionMaker"("organizationId", "companyId", "buyingRole");

-- CreateIndex
CREATE INDEX "DecisionMaker_snapshotId_idx" ON "DecisionMaker"("snapshotId");

-- CreateIndex
CREATE UNIQUE INDEX "DecisionMaker_organizationId_companyId_contactId_key" ON "DecisionMaker"("organizationId", "companyId", "contactId");

-- CreateIndex
CREATE INDEX "IntelligenceEvidence_organizationId_companyId_collectedAt_idx" ON "IntelligenceEvidence"("organizationId", "companyId", "collectedAt" DESC);

-- CreateIndex
CREATE INDEX "IntelligenceEvidence_organizationId_companyId_evidenceType_idx" ON "IntelligenceEvidence"("organizationId", "companyId", "evidenceType");

-- CreateIndex
CREATE INDEX "IntelligenceEvidence_organizationId_subjectType_subjectId_idx" ON "IntelligenceEvidence"("organizationId", "subjectType", "subjectId");

-- CreateIndex
CREATE INDEX "IntelligenceEvidence_snapshotId_idx" ON "IntelligenceEvidence"("snapshotId");

-- CreateIndex
CREATE UNIQUE INDEX "IntelligenceEvidence_organizationId_companyId_dedupeKey_key" ON "IntelligenceEvidence"("organizationId", "companyId", "dedupeKey");

-- CreateIndex
CREATE INDEX "AccountScore_organizationId_companyId_calculatedAt_idx" ON "AccountScore"("organizationId", "companyId", "calculatedAt" DESC);

-- CreateIndex
CREATE INDEX "AccountScore_organizationId_total_calculatedAt_idx" ON "AccountScore"("organizationId", "total" DESC, "calculatedAt" DESC);

-- CreateIndex
CREATE INDEX "AccountScore_snapshotId_idx" ON "AccountScore"("snapshotId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountScore_organizationId_companyId_scoreVersion_inputHas_key" ON "AccountScore"("organizationId", "companyId", "scoreVersion", "inputHash");

-- CreateIndex
CREATE UNIQUE INDEX "AccountScore_id_organizationId_companyId_key" ON "AccountScore"("id", "organizationId", "companyId");

-- CreateIndex
CREATE INDEX "AccountRecommendation_organizationId_companyId_idempotencyKey_u" ON "AccountRecommendation"("organizationId", "companyId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "AccountRecommendation_organizationId_companyId_status_gener_idx" ON "AccountRecommendation"("organizationId", "companyId", "status", "generatedAt" DESC);

-- CreateIndex
CREATE INDEX "AccountRecommendation_organizationId_status_priority_idx" ON "AccountRecommendation"("organizationId", "status", "priority");

-- CreateIndex
CREATE INDEX "AccountRecommendation_snapshotId_idx" ON "AccountRecommendation"("snapshotId");

-- CreateIndex
CREATE INDEX "AccountRecommendation_accountScoreId_idx" ON "AccountRecommendation"("accountScoreId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountRecommendation_organizationId_companyId_actionType_i_key" ON "AccountRecommendation"("organizationId", "companyId", "actionType", "inputHash");

-- CreateIndex
CREATE INDEX "EconomicRelationship_organizationId_sourceCompanyId_status_idx" ON "EconomicRelationship"("organizationId", "sourceCompanyId", "status");

-- CreateIndex
CREATE INDEX "EconomicRelationship_organizationId_targetCompanyId_status_idx" ON "EconomicRelationship"("organizationId", "targetCompanyId", "status");

-- CreateIndex
CREATE INDEX "EconomicRelationship_organizationId_relationType_detectedAt_idx" ON "EconomicRelationship"("organizationId", "relationType", "detectedAt" DESC);

-- CreateIndex
CREATE INDEX "EconomicRelationship_snapshotId_idx" ON "EconomicRelationship"("snapshotId");

-- CreateIndex
CREATE UNIQUE INDEX "EconomicRelationship_organizationId_dedupeKey_key" ON "EconomicRelationship"("organizationId", "dedupeKey");

-- CreateIndex
CREATE INDEX "ProspectRejection_organizationId_idx" ON "ProspectRejection"("organizationId");

-- CreateIndex
CREATE INDEX "CrmPipeline_organizationId_entity_active_idx" ON "CrmPipeline"("organizationId", "entity", "active");

-- CreateIndex
CREATE UNIQUE INDEX "CrmPipeline_organizationId_name_key" ON "CrmPipeline"("organizationId", "name");

-- CreateIndex
CREATE INDEX "CrmPipelineStage_pipelineId_sortOrder_idx" ON "CrmPipelineStage"("pipelineId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CrmPipelineStage_pipelineId_code_key" ON "CrmPipelineStage"("pipelineId", "code");

-- CreateIndex
CREATE INDEX "CrmProduct_organizationId_active_name_idx" ON "CrmProduct"("organizationId", "active", "name");

-- CreateIndex
CREATE UNIQUE INDEX "CrmProduct_organizationId_sku_key" ON "CrmProduct"("organizationId", "sku");

-- CreateIndex
CREATE INDEX "CrmDealItem_organizationId_leadId_sortOrder_idx" ON "CrmDealItem"("organizationId", "leadId", "sortOrder");

-- CreateIndex
CREATE INDEX "CrmDealItem_productId_idx" ON "CrmDealItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "CrmCommercialDocument_publicToken_key" ON "CrmCommercialDocument"("publicToken");

-- CreateIndex
CREATE INDEX "CrmCommercialDocument_organizationId_type_status_idx" ON "CrmCommercialDocument"("organizationId", "type", "status");

-- CreateIndex
CREATE INDEX "CrmCommercialDocument_leadId_idx" ON "CrmCommercialDocument"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "CrmCommercialDocument_organizationId_number_key" ON "CrmCommercialDocument"("organizationId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "CrmCommercialDocument_organizationId_stripePaymentIntentId_key" ON "CrmCommercialDocument"("organizationId", "stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE INDEX "Prompt_organizationId_category_idx" ON "Prompt"("organizationId", "category");

-- CreateIndex
CREATE INDEX "Document_organizationId_createdAt_idx" ON "Document"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentChunk_documentId_idx" ON "DocumentChunk"("documentId");

-- CreateIndex
CREATE INDEX "AgentMemory_organizationId_idx" ON "AgentMemory"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentMemory_sessionId_agentType_organizationId_key" ON "AgentMemory"("sessionId", "agentType", "organizationId");

-- CreateIndex
CREATE INDEX "AILog_organizationId_createdAt_idx" ON "AILog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "AIGuardrailEvent_organizationId_type_createdAt_idx" ON "AIGuardrailEvent"("organizationId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "Report_organizationId_createdAt_idx" ON "Report"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "Report_organizationId_source_createdAt_idx" ON "Report"("organizationId", "source", "createdAt");

-- CreateIndex
CREATE INDEX "AssistantMessage_organizationId_userId_brand_createdAt_idx" ON "AssistantMessage"("organizationId", "userId", "brand", "createdAt");

-- CreateIndex
CREATE INDEX "RoleplaySession_organizationId_userId_createdAt_idx" ON "RoleplaySession"("organizationId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "QualificationMatrixItem_organizationId_brand_idx" ON "QualificationMatrixItem"("organizationId", "brand");

-- CreateIndex
CREATE INDEX "ObjectionMatrixItem_organizationId_brand_idx" ON "ObjectionMatrixItem"("organizationId", "brand");

-- CreateIndex
CREATE INDEX "Notification_organizationId_readAt_createdAt_idx" ON "Notification"("organizationId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "Automation_organizationId_enabled_idx" ON "Automation"("organizationId", "enabled");

-- CreateIndex
CREATE INDEX "AutomationVersion_automationId_createdAt_idx" ON "AutomationVersion"("automationId", "createdAt");

-- CreateIndex
CREATE INDEX "AutomationVersion_organizationId_idx" ON "AutomationVersion"("organizationId");

-- CreateIndex
CREATE INDEX "CallSuppression_organizationId_idx" ON "CallSuppression"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "CallSuppression_organizationId_phoneE164_key" ON "CallSuppression"("organizationId", "phoneE164");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_organizationId_phoneE164_idx" ON "WhatsAppMessage"("organizationId", "phoneE164");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_leadId_idx" ON "WhatsAppMessage"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppMessage_organizationId_waMessageId_key" ON "WhatsAppMessage"("organizationId", "waMessageId");

-- CreateIndex
CREATE INDEX "ConversationSignal_organizationId_leadId_createdAt_idx" ON "ConversationSignal"("organizationId", "leadId", "createdAt");

-- CreateIndex
CREATE INDEX "CopilotoConversation_organizationId_status_idx" ON "CopilotoConversation"("organizationId", "status");

-- CreateIndex
CREATE INDEX "CopilotoConversation_organizationId_createdAt_idx" ON "CopilotoConversation"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "CopilotoConversation_leadId_idx" ON "CopilotoConversation"("leadId");

-- CreateIndex
CREATE INDEX "CopilotoConversation_companyId_idx" ON "CopilotoConversation"("companyId");

-- CreateIndex
CREATE INDEX "CopilotoConversation_contactId_idx" ON "CopilotoConversation"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "CopilotoConversation_organizationId_externalMeetingId_key" ON "CopilotoConversation"("organizationId", "externalMeetingId");

-- CreateIndex
CREATE INDEX "CopilotoTranscriptSegment_organizationId_idx" ON "CopilotoTranscriptSegment"("organizationId");

-- CreateIndex
CREATE INDEX "CopilotoTranscriptSegment_conversationId_startMs_idx" ON "CopilotoTranscriptSegment"("conversationId", "startMs");

-- CreateIndex
CREATE INDEX "CopilotoInsight_organizationId_idx" ON "CopilotoInsight"("organizationId");

-- CreateIndex
CREATE INDEX "CopilotoInsight_conversationId_type_idx" ON "CopilotoInsight"("conversationId", "type");

-- CreateIndex
CREATE INDEX "CopilotoCrmFieldSuggestion_organizationId_status_idx" ON "CopilotoCrmFieldSuggestion"("organizationId", "status");

-- CreateIndex
CREATE INDEX "CopilotoCrmFieldSuggestion_conversationId_idx" ON "CopilotoCrmFieldSuggestion"("conversationId");

-- CreateIndex
CREATE INDEX "CopilotoCrmFieldSuggestion_organizationId_entityType_entity_idx" ON "CopilotoCrmFieldSuggestion"("organizationId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "CopilotoBitrixFieldMapping_organizationId_idx" ON "CopilotoBitrixFieldMapping"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "CopilotoBitrixFieldMapping_organizationId_entityType_semant_key" ON "CopilotoBitrixFieldMapping"("organizationId", "entityType", "semanticField");

-- CreateIndex
CREATE INDEX "CopilotoDealHealthSnapshot_organizationId_leadId_createdAt_idx" ON "CopilotoDealHealthSnapshot"("organizationId", "leadId", "createdAt");

-- CreateIndex
CREATE INDEX "CopilotoDealHealthSnapshot_leadId_idx" ON "CopilotoDealHealthSnapshot"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "CopilotoCoachingEvaluation_conversationId_key" ON "CopilotoCoachingEvaluation"("conversationId");

-- CreateIndex
CREATE INDEX "CopilotoCoachingEvaluation_organizationId_createdAt_idx" ON "CopilotoCoachingEvaluation"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "CopilotoConsentRecord_organizationId_idx" ON "CopilotoConsentRecord"("organizationId");

-- CreateIndex
CREATE INDEX "CopilotoConsentRecord_conversationId_idx" ON "CopilotoConsentRecord"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleWorkspaceConnection_organizationId_key" ON "GoogleWorkspaceConnection"("organizationId");

-- CreateIndex
CREATE INDEX "BitrixConnection_organizationId_idx" ON "BitrixConnection"("organizationId");

-- CreateIndex
CREATE INDEX "BitrixSyncRule_organizationId_idx" ON "BitrixSyncRule"("organizationId");

-- CreateIndex
CREATE INDEX "BitrixSyncRule_connectionId_idx" ON "BitrixSyncRule"("connectionId");

-- CreateIndex
CREATE INDEX "BitrixSyncRule_active_idx" ON "BitrixSyncRule"("active");

-- CreateIndex
CREATE INDEX "BitrixSyncLog_organizationId_createdAt_idx" ON "BitrixSyncLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "BitrixSyncLog_leadId_idx" ON "BitrixSyncLog"("leadId");

-- CreateIndex
CREATE INDEX "BitrixSyncLog_connectionId_createdAt_idx" ON "BitrixSyncLog"("connectionId", "createdAt");

-- CreateIndex
CREATE INDEX "BitrixExtractionRun_organizationId_createdAt_idx" ON "BitrixExtractionRun"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "BitrixExtractionRun_connectionId_idx" ON "BitrixExtractionRun"("connectionId");

-- CreateIndex
CREATE INDEX "BitrixExtractionRun_status_idx" ON "BitrixExtractionRun"("status");

-- CreateIndex
CREATE INDEX "BitrixExtractionRun_organizationId_purgedAt_idx" ON "BitrixExtractionRun"("organizationId", "purgedAt");

-- CreateIndex
CREATE INDEX "ThreeCXConnection_organizationId_idx" ON "ThreeCXConnection"("organizationId");

-- CreateIndex
CREATE INDEX "VoiceHubConnection_organizationId_idx" ON "VoiceHubConnection"("organizationId");

-- CreateIndex
CREATE INDEX "SlackConnection_organizationId_idx" ON "SlackConnection"("organizationId");

-- CreateIndex
CREATE INDEX "StripeConnection_organizationId_idx" ON "StripeConnection"("organizationId");

-- CreateIndex
CREATE INDEX "OmieConnection_organizationId_idx" ON "OmieConnection"("organizationId");

-- CreateIndex
CREATE INDEX "VoiceCallLog_organizationId_createdAt_idx" ON "VoiceCallLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "VoiceCallLog_organizationId_leadId_idx" ON "VoiceCallLog"("organizationId", "leadId");

-- CreateIndex
CREATE UNIQUE INDEX "VoiceCallLog_organizationId_providerCallId_key" ON "VoiceCallLog"("organizationId", "providerCallId");

-- CreateIndex
CREATE INDEX "OptOutRecord_organizationId_leadId_idx" ON "OptOutRecord"("organizationId", "leadId");

-- CreateIndex
CREATE INDEX "OptOutRecord_organizationId_phoneE164_idx" ON "OptOutRecord"("organizationId", "phoneE164");

-- CreateIndex
CREATE INDEX "OptOutRecord_organizationId_email_idx" ON "OptOutRecord"("organizationId", "email");

-- CreateIndex
CREATE INDEX "ColdCallRun_organizationId_runAt_idx" ON "ColdCallRun"("organizationId", "runAt");

-- CreateIndex
CREATE INDEX "AIPendingAction_organizationId_approved_idx" ON "AIPendingAction"("organizationId", "approved");

-- CreateIndex
CREATE INDEX "AIPendingAction_autonomy_queue_idx" ON "AIPendingAction"("organizationId", "discardedAt", "approved", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AIPendingAction_organizationId_idempotencyKey_key" ON "AIPendingAction"("organizationId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "AiEngineSetting_toolKey_key" ON "AiEngineSetting"("toolKey");

-- CreateIndex
CREATE INDEX "Prospect_organizationId_idx" ON "Prospect"("organizationId");

-- CreateIndex
CREATE INDEX "Prospect_status_idx" ON "Prospect"("status");

-- CreateIndex
CREATE INDEX "Prospect_companyId_idx" ON "Prospect"("companyId");

-- CreateIndex
CREATE INDEX "Prospect_leadId_idx" ON "Prospect"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "Prospect_organizationId_cnpj_key" ON "Prospect"("organizationId", "cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_key_key" ON "FeatureFlag"("key");

-- CreateIndex
CREATE INDEX "OrganizationFeatureFlag_organizationId_idx" ON "OrganizationFeatureFlag"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationFeatureFlag_organizationId_featureFlagId_key" ON "OrganizationFeatureFlag"("organizationId", "featureFlagId");

-- CreateIndex
CREATE INDEX "ModuleAccessGrant_organizationId_idx" ON "ModuleAccessGrant"("organizationId");

-- CreateIndex
CREATE INDEX "ModuleAccessGrant_userId_idx" ON "ModuleAccessGrant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleAccessGrant_userId_moduleKey_key" ON "ModuleAccessGrant"("userId", "moduleKey");

-- CreateIndex
CREATE INDEX "MesaTratamentoTreatment_organizationId_userId_createdAt_idx" ON "MesaTratamentoTreatment"("organizationId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "MesaTratamentoTreatment_leadId_idx" ON "MesaTratamentoTreatment"("leadId");

-- CreateIndex
CREATE INDEX "PomodoroSession_organizationId_userId_createdAt_idx" ON "PomodoroSession"("organizationId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "DailyPlanClosing_organizationId_userId_idx" ON "DailyPlanClosing"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyPlanClosing_userId_referenceDate_key" ON "DailyPlanClosing"("userId", "referenceDate");

-- CreateIndex
CREATE INDEX "BugReport_organizationId_status_idx" ON "BugReport"("organizationId", "status");

-- CreateIndex
CREATE INDEX "BugReport_organizationId_createdAt_idx" ON "BugReport"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "CadenceSequence_organizationId_active_idx" ON "CadenceSequence"("organizationId", "active");

-- CreateIndex
CREATE INDEX "CadenceRun_organizationId_status_idx" ON "CadenceRun"("organizationId", "status");

-- CreateIndex
CREATE INDEX "CadenceRun_leadId_active_unique" ON "CadenceRun"("leadId");

-- CreateIndex
CREATE INDEX "CadenceTouchAttempt_organizationId_idx" ON "CadenceTouchAttempt"("organizationId");

-- CreateIndex
CREATE INDEX "CadenceTouchAttempt_cadenceRunId_idx" ON "CadenceTouchAttempt"("cadenceRunId");

-- CreateIndex
CREATE INDEX "EmailMessage_leadId_idx" ON "EmailMessage"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailMessage_organizationId_providerMessageId_key" ON "EmailMessage"("organizationId", "providerMessageId");

-- CreateIndex
CREATE INDEX "CadenceCalendarEvent_leadId_idx" ON "CadenceCalendarEvent"("leadId");

-- CreateIndex
CREATE INDEX "CadenceCalendarEvent_organizationId_idx" ON "CadenceCalendarEvent"("organizationId");

-- CreateIndex
CREATE INDEX "CrmCommercialDocumentVersion_organizationId_idx" ON "CrmCommercialDocumentVersion"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "CrmCommercialDocumentVersion_documentId_versionNumber_key" ON "CrmCommercialDocumentVersion"("documentId", "versionNumber");

-- CreateIndex
CREATE INDEX "CrmDocumentSignatureRequest_documentId_idx" ON "CrmDocumentSignatureRequest"("documentId");

-- CreateIndex
CREATE INDEX "CrmDocumentSignatureRequest_organizationId_idx" ON "CrmDocumentSignatureRequest"("organizationId");

-- CreateIndex
CREATE INDEX "DealClosureEvent_leadId_idx" ON "DealClosureEvent"("leadId");

-- CreateIndex
CREATE INDEX "DealClosureEvent_organizationId_idx" ON "DealClosureEvent"("organizationId");

-- CreateIndex
CREATE INDEX "ThreeCXCallEvent_organizationId_createdAt_idx" ON "ThreeCXCallEvent"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ThreeCXCallEvent_organizationId_callId_eventType_key" ON "ThreeCXCallEvent"("organizationId", "callId", "eventType");

-- CreateIndex
CREATE UNIQUE INDEX "PublicBookingLink_slug_key" ON "PublicBookingLink"("slug");

-- CreateIndex
CREATE INDEX "PublicBookingLink_organizationId_userId_idx" ON "PublicBookingLink"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "PublicBookingLink_slug_idx" ON "PublicBookingLink"("slug");

-- CreateIndex
CREATE INDEX "SavedSearch_organizationId_idx" ON "SavedSearch"("organizationId");

-- CreateIndex
CREATE INDEX "ProspectingSearchExecution_organizationId_startedAt_idx" ON "ProspectingSearchExecution"("organizationId", "startedAt");

-- CreateIndex
CREATE INDEX "ProspectingSearchExecution_savedSearchId_idx" ON "ProspectingSearchExecution"("savedSearchId");

-- CreateIndex
CREATE UNIQUE INDEX "JobRole_code_key" ON "JobRole"("code");

-- CreateIndex
CREATE INDEX "JobRole_isActive_idx" ON "JobRole"("isActive");

-- CreateIndex
CREATE INDEX "UserJobRole_organizationId_idx" ON "UserJobRole"("organizationId");

-- CreateIndex
CREATE INDEX "UserJobRole_one_active_primary_per_user" ON "UserJobRole"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserJobRole_userId_jobRoleId_key" ON "UserJobRole"("userId", "jobRoleId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentDefinition_code_key" ON "AgentDefinition"("code");

-- CreateIndex
CREATE INDEX "AgentDefinition_isActive_idx" ON "AgentDefinition"("isActive");

-- CreateIndex
CREATE INDEX "AgentDefinition_primaryJobRoleId_idx" ON "AgentDefinition"("primaryJobRoleId");

-- CreateIndex
CREATE INDEX "AgentVersion_agentDefinitionId_status_idx" ON "AgentVersion"("agentDefinitionId", "status");

-- CreateIndex
CREATE INDEX "AgentVersion_one_active_per_agent" ON "AgentVersion"("agentDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentVersion_agentDefinitionId_version_key" ON "AgentVersion"("agentDefinitionId", "version");

-- CreateIndex
CREATE INDEX "RoleAgentGrant_agentDefinitionId_idx" ON "RoleAgentGrant"("agentDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "RoleAgentGrant_jobRoleId_agentDefinitionId_key" ON "RoleAgentGrant"("jobRoleId", "agentDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "CapabilityDefinition_code_key" ON "CapabilityDefinition"("code");

-- CreateIndex
CREATE INDEX "CapabilityDefinition_isActive_idx" ON "CapabilityDefinition"("isActive");

-- CreateIndex
CREATE INDEX "CapabilityDefinition_domain_idx" ON "CapabilityDefinition"("domain");

-- CreateIndex
CREATE INDEX "AgentCapabilityGrant_capabilityDefinitionId_idx" ON "AgentCapabilityGrant"("capabilityDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentCapabilityGrant_agentDefinitionId_capabilityDefinition_key" ON "AgentCapabilityGrant"("agentDefinitionId", "capabilityDefinitionId");

-- CreateIndex
CREATE INDEX "RoleCapabilityGrant_capabilityDefinitionId_idx" ON "RoleCapabilityGrant"("capabilityDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "RoleCapabilityGrant_jobRoleId_capabilityDefinitionId_key" ON "RoleCapabilityGrant"("jobRoleId", "capabilityDefinitionId");

-- CreateIndex
CREATE INDEX "AgentExecution_organizationId_createdAt_idx" ON "AgentExecution"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentExecution_agentDefinitionId_idx" ON "AgentExecution"("agentDefinitionId");

-- CreateIndex
CREATE INDEX "AgentExecution_organizationId_status_idx" ON "AgentExecution"("organizationId", "status");

-- CreateIndex
CREATE INDEX "AccessRequest_organizationId_status_idx" ON "AccessRequest"("organizationId", "status");

-- CreateIndex
CREATE INDEX "AccessRequest_requesterId_idx" ON "AccessRequest"("requesterId");

-- CreateIndex
CREATE INDEX "AccessRequest_capabilityDefinitionId_idx" ON "AccessRequest"("capabilityDefinitionId");

-- CreateIndex
CREATE INDEX "ApprovalDecision_accessRequestId_idx" ON "ApprovalDecision"("accessRequestId");

-- CreateIndex
CREATE INDEX "ApprovalDecision_organizationId_idx" ON "ApprovalDecision"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "TemporaryCapabilityGrant_accessRequestId_key" ON "TemporaryCapabilityGrant"("accessRequestId");

-- CreateIndex
CREATE INDEX "TemporaryCapabilityGrant_organizationId_granteeId_capabilit_idx" ON "TemporaryCapabilityGrant"("organizationId", "granteeId", "capabilityDefinitionId");

-- CreateIndex
CREATE INDEX "TemporaryCapabilityGrant_expiresAt_idx" ON "TemporaryCapabilityGrant"("expiresAt");

-- CreateIndex
CREATE INDEX "AgentHandoffMessage_organizationId_conversationId_idx" ON "AgentHandoffMessage"("organizationId", "conversationId");

-- CreateIndex
CREATE INDEX "AgentHandoffMessage_organizationId_missionId_idx" ON "AgentHandoffMessage"("organizationId", "missionId");

-- CreateIndex
CREATE INDEX "AgentHandoffMessage_organizationId_status_idx" ON "AgentHandoffMessage"("organizationId", "status");

-- CreateIndex
CREATE INDEX "AgentHandoffMessage_parentHandoffId_idx" ON "AgentHandoffMessage"("parentHandoffId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentHandoffMessage_organizationId_idempotencyKey_key" ON "AgentHandoffMessage"("organizationId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "LearningCandidate_organizationId_status_idx" ON "LearningCandidate"("organizationId", "status");

-- CreateIndex
CREATE INDEX "LearningCandidate_organizationId_targetScope_topic_idx" ON "LearningCandidate"("organizationId", "targetScope", "topic");

-- CreateIndex
CREATE INDEX "LearningCandidate_sourceExecutionId_idx" ON "LearningCandidate"("sourceExecutionId");

-- CreateIndex
CREATE INDEX "AgentMemoryRecord_organizationId_agentCode_status_topic_idx" ON "AgentMemoryRecord"("organizationId", "agentCode", "status", "topic");

-- CreateIndex
CREATE UNIQUE INDEX "AgentMemoryRecord_organizationId_agentCode_topic_version_key" ON "AgentMemoryRecord"("organizationId", "agentCode", "topic", "version");

-- CreateIndex
CREATE INDEX "RoleMemoryRecord_organizationId_jobRoleCode_status_topic_idx" ON "RoleMemoryRecord"("organizationId", "jobRoleCode", "status", "topic");

-- CreateIndex
CREATE UNIQUE INDEX "RoleMemoryRecord_organizationId_jobRoleCode_topic_version_key" ON "RoleMemoryRecord"("organizationId", "jobRoleCode", "topic", "version");

-- CreateIndex
CREATE INDEX "OrganizationMemoryRecord_organizationId_status_topic_idx" ON "OrganizationMemoryRecord"("organizationId", "status", "topic");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMemoryRecord_organizationId_topic_version_key" ON "OrganizationMemoryRecord"("organizationId", "topic", "version");

-- CreateIndex
CREATE INDEX "AgentBuildProposal_organizationId_status_idx" ON "AgentBuildProposal"("organizationId", "status");

-- CreateIndex
CREATE INDEX "AgentBuildProposal_organizationId_createdAt_idx" ON "AgentBuildProposal"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "CommercialMission_organizationId_status_idx" ON "CommercialMission"("organizationId", "status");

-- CreateIndex
CREATE INDEX "NextBestActionRecommendation_missionId_status_idx" ON "NextBestActionRecommendation"("missionId", "status");

-- CreateIndex
CREATE INDEX "NextBestActionRecommendation_organizationId_status_idx" ON "NextBestActionRecommendation"("organizationId", "status");

-- CreateIndex
CREATE INDEX "CommercialMissionEvent_missionId_createdAt_idx" ON "CommercialMissionEvent"("missionId", "createdAt");

-- CreateIndex
CREATE INDEX "CommercialMissionEvent_organizationId_eventType_idx" ON "CommercialMissionEvent"("organizationId", "eventType");

-- CreateIndex
CREATE UNIQUE INDEX "MissionScore_missionId_key" ON "MissionScore"("missionId");

-- CreateIndex
CREATE INDEX "MissionScore_organizationId_idx" ON "MissionScore"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "MissionAgentTrace_missionId_key" ON "MissionAgentTrace"("missionId");

-- CreateIndex
CREATE INDEX "MissionAgentTrace_organizationId_idx" ON "MissionAgentTrace"("organizationId");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketIntelligenceCompany" ADD CONSTRAINT "MarketIntelligenceCompany_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "MarketIntelligenceDataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrichmentLog" ADD CONSTRAINT "EnrichmentLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_savedSearchId_fkey" FOREIGN KEY ("savedSearchId") REFERENCES "SavedSearch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "CrmPipeline"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_pipelineStageId_fkey" FOREIGN KEY ("pipelineStageId") REFERENCES "CrmPipelineStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialGoal" ADD CONSTRAINT "CommercialGoal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadStageHistory" ADD CONSTRAINT "LeadStageHistory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadStageHistory" ADD CONSTRAINT "LeadStageHistory_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForecastSnapshot" ADD CONSTRAINT "ForecastSnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadFieldChange" ADD CONSTRAINT "LeadFieldChange_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadFieldChange" ADD CONSTRAINT "LeadFieldChange_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedView" ADD CONSTRAINT "SavedView_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedView" ADD CONSTRAINT "SavedView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountIntelligenceSnapshot" ADD CONSTRAINT "AccountIntelligenceSnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountIntelligenceSnapshot" ADD CONSTRAINT "AccountIntelligenceSnapshot_companyId_organizationId_fkey" FOREIGN KEY ("companyId", "organizationId") REFERENCES "Company"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountSignal" ADD CONSTRAINT "AccountSignal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountSignal" ADD CONSTRAINT "AccountSignal_companyId_organizationId_fkey" FOREIGN KEY ("companyId", "organizationId") REFERENCES "Company"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountSignal" ADD CONSTRAINT "AccountSignal_snapshotId_organizationId_companyId_fkey" FOREIGN KEY ("snapshotId", "organizationId", "companyId") REFERENCES "AccountIntelligenceSnapshot"("id", "organizationId", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionMaker" ADD CONSTRAINT "DecisionMaker_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionMaker" ADD CONSTRAINT "DecisionMaker_companyId_organizationId_fkey" FOREIGN KEY ("companyId", "organizationId") REFERENCES "Company"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionMaker" ADD CONSTRAINT "DecisionMaker_contactId_companyId_organizationId_fkey" FOREIGN KEY ("contactId", "companyId", "organizationId") REFERENCES "Contact"("id", "companyId", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionMaker" ADD CONSTRAINT "DecisionMaker_snapshotId_organizationId_companyId_fkey" FOREIGN KEY ("snapshotId", "organizationId", "companyId") REFERENCES "AccountIntelligenceSnapshot"("id", "organizationId", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntelligenceEvidence" ADD CONSTRAINT "IntelligenceEvidence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntelligenceEvidence" ADD CONSTRAINT "IntelligenceEvidence_companyId_organizationId_fkey" FOREIGN KEY ("companyId", "organizationId") REFERENCES "Company"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntelligenceEvidence" ADD CONSTRAINT "IntelligenceEvidence_snapshotId_organizationId_companyId_fkey" FOREIGN KEY ("snapshotId", "organizationId", "companyId") REFERENCES "AccountIntelligenceSnapshot"("id", "organizationId", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountScore" ADD CONSTRAINT "AccountScore_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountScore" ADD CONSTRAINT "AccountScore_companyId_organizationId_fkey" FOREIGN KEY ("companyId", "organizationId") REFERENCES "Company"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountScore" ADD CONSTRAINT "AccountScore_snapshotId_organizationId_companyId_fkey" FOREIGN KEY ("snapshotId", "organizationId", "companyId") REFERENCES "AccountIntelligenceSnapshot"("id", "organizationId", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountRecommendation" ADD CONSTRAINT "AccountRecommendation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountRecommendation" ADD CONSTRAINT "AccountRecommendation_companyId_organizationId_fkey" FOREIGN KEY ("companyId", "organizationId") REFERENCES "Company"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountRecommendation" ADD CONSTRAINT "AccountRecommendation_snapshotId_organizationId_companyId_fkey" FOREIGN KEY ("snapshotId", "organizationId", "companyId") REFERENCES "AccountIntelligenceSnapshot"("id", "organizationId", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountRecommendation" ADD CONSTRAINT "AccountRecommendation_accountScoreId_organizationId_compan_fkey" FOREIGN KEY ("accountScoreId", "organizationId", "companyId") REFERENCES "AccountScore"("id", "organizationId", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EconomicRelationship" ADD CONSTRAINT "EconomicRelationship_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EconomicRelationship" ADD CONSTRAINT "EconomicRelationship_sourceCompanyId_organizationId_fkey" FOREIGN KEY ("sourceCompanyId", "organizationId") REFERENCES "Company"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EconomicRelationship" ADD CONSTRAINT "EconomicRelationship_targetCompanyId_organizationId_fkey" FOREIGN KEY ("targetCompanyId", "organizationId") REFERENCES "Company"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EconomicRelationship" ADD CONSTRAINT "EconomicRelationship_snapshotId_organizationId_sourceCompa_fkey" FOREIGN KEY ("snapshotId", "organizationId", "sourceCompanyId") REFERENCES "AccountIntelligenceSnapshot"("id", "organizationId", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectRejection" ADD CONSTRAINT "ProspectRejection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmPipeline" ADD CONSTRAINT "CrmPipeline_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmPipelineStage" ADD CONSTRAINT "CrmPipelineStage_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "CrmPipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmProduct" ADD CONSTRAINT "CrmProduct_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmDealItem" ADD CONSTRAINT "CrmDealItem_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmDealItem" ADD CONSTRAINT "CrmDealItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "CrmProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmDealItem" ADD CONSTRAINT "CrmDealItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmCommercialDocument" ADD CONSTRAINT "CrmCommercialDocument_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmCommercialDocument" ADD CONSTRAINT "CrmCommercialDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmCommercialDocument" ADD CONSTRAINT "CrmCommercialDocument_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmCommercialDocument" ADD CONSTRAINT "CrmCommercialDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmCommercialDocument" ADD CONSTRAINT "CrmCommercialDocument_stripeConnectionId_fkey" FOREIGN KEY ("stripeConnectionId") REFERENCES "StripeConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prompt" ADD CONSTRAINT "Prompt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentChunk" ADD CONSTRAINT "DocumentChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentMemory" ADD CONSTRAINT "AgentMemory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AILog" ADD CONSTRAINT "AILog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIGuardrailEvent" ADD CONSTRAINT "AIGuardrailEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantMessage" ADD CONSTRAINT "AssistantMessage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantMessage" ADD CONSTRAINT "AssistantMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleplaySession" ADD CONSTRAINT "RoleplaySession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleplaySession" ADD CONSTRAINT "RoleplaySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualificationMatrixItem" ADD CONSTRAINT "QualificationMatrixItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObjectionMatrixItem" ADD CONSTRAINT "ObjectionMatrixItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "Automation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Automation" ADD CONSTRAINT "Automation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationVersion" ADD CONSTRAINT "AutomationVersion_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "Automation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationVersion" ADD CONSTRAINT "AutomationVersion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallSuppression" ADD CONSTRAINT "CallSuppression_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationSignal" ADD CONSTRAINT "ConversationSignal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationSignal" ADD CONSTRAINT "ConversationSignal_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CopilotoConversation" ADD CONSTRAINT "CopilotoConversation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CopilotoConversation" ADD CONSTRAINT "CopilotoConversation_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CopilotoConversation" ADD CONSTRAINT "CopilotoConversation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CopilotoConversation" ADD CONSTRAINT "CopilotoConversation_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CopilotoTranscriptSegment" ADD CONSTRAINT "CopilotoTranscriptSegment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CopilotoTranscriptSegment" ADD CONSTRAINT "CopilotoTranscriptSegment_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "CopilotoConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CopilotoInsight" ADD CONSTRAINT "CopilotoInsight_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CopilotoInsight" ADD CONSTRAINT "CopilotoInsight_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "CopilotoConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CopilotoCrmFieldSuggestion" ADD CONSTRAINT "CopilotoCrmFieldSuggestion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CopilotoCrmFieldSuggestion" ADD CONSTRAINT "CopilotoCrmFieldSuggestion_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "CopilotoConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CopilotoBitrixFieldMapping" ADD CONSTRAINT "CopilotoBitrixFieldMapping_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CopilotoDealHealthSnapshot" ADD CONSTRAINT "CopilotoDealHealthSnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CopilotoDealHealthSnapshot" ADD CONSTRAINT "CopilotoDealHealthSnapshot_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CopilotoCoachingEvaluation" ADD CONSTRAINT "CopilotoCoachingEvaluation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CopilotoCoachingEvaluation" ADD CONSTRAINT "CopilotoCoachingEvaluation_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "CopilotoConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CopilotoConsentRecord" ADD CONSTRAINT "CopilotoConsentRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CopilotoConsentRecord" ADD CONSTRAINT "CopilotoConsentRecord_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "CopilotoConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleWorkspaceConnection" ADD CONSTRAINT "GoogleWorkspaceConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BitrixConnection" ADD CONSTRAINT "BitrixConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BitrixSyncRule" ADD CONSTRAINT "BitrixSyncRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BitrixSyncRule" ADD CONSTRAINT "BitrixSyncRule_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "BitrixConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BitrixSyncLog" ADD CONSTRAINT "BitrixSyncLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BitrixSyncLog" ADD CONSTRAINT "BitrixSyncLog_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "BitrixConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BitrixExtractionRun" ADD CONSTRAINT "BitrixExtractionRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BitrixExtractionRun" ADD CONSTRAINT "BitrixExtractionRun_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "BitrixConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreeCXConnection" ADD CONSTRAINT "ThreeCXConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceHubConnection" ADD CONSTRAINT "VoiceHubConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlackConnection" ADD CONSTRAINT "SlackConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StripeConnection" ADD CONSTRAINT "StripeConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OmieConnection" ADD CONSTRAINT "OmieConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceCallLog" ADD CONSTRAINT "VoiceCallLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptOutRecord" ADD CONSTRAINT "OptOutRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptOutRecord" ADD CONSTRAINT "OptOutRecord_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColdCallRun" ADD CONSTRAINT "ColdCallRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIPendingAction" ADD CONSTRAINT "AIPendingAction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationFeatureFlag" ADD CONSTRAINT "OrganizationFeatureFlag_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationFeatureFlag" ADD CONSTRAINT "OrganizationFeatureFlag_featureFlagId_fkey" FOREIGN KEY ("featureFlagId") REFERENCES "FeatureFlag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleAccessGrant" ADD CONSTRAINT "ModuleAccessGrant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleAccessGrant" ADD CONSTRAINT "ModuleAccessGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MesaTratamentoTreatment" ADD CONSTRAINT "MesaTratamentoTreatment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MesaTratamentoTreatment" ADD CONSTRAINT "MesaTratamentoTreatment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MesaTratamentoTreatment" ADD CONSTRAINT "MesaTratamentoTreatment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PomodoroSession" ADD CONSTRAINT "PomodoroSession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PomodoroSession" ADD CONSTRAINT "PomodoroSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyPlanClosing" ADD CONSTRAINT "DailyPlanClosing_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyPlanClosing" ADD CONSTRAINT "DailyPlanClosing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BugReport" ADD CONSTRAINT "BugReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenceSequence" ADD CONSTRAINT "CadenceSequence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenceRun" ADD CONSTRAINT "CadenceRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenceRun" ADD CONSTRAINT "CadenceRun_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenceRun" ADD CONSTRAINT "CadenceRun_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "CadenceSequence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenceTouchAttempt" ADD CONSTRAINT "CadenceTouchAttempt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenceTouchAttempt" ADD CONSTRAINT "CadenceTouchAttempt_cadenceRunId_fkey" FOREIGN KEY ("cadenceRunId") REFERENCES "CadenceRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenceCalendarEvent" ADD CONSTRAINT "CadenceCalendarEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenceCalendarEvent" ADD CONSTRAINT "CadenceCalendarEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenceCalendarEvent" ADD CONSTRAINT "CadenceCalendarEvent_cadenceRunId_fkey" FOREIGN KEY ("cadenceRunId") REFERENCES "CadenceRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmCommercialDocumentVersion" ADD CONSTRAINT "CrmCommercialDocumentVersion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmCommercialDocumentVersion" ADD CONSTRAINT "CrmCommercialDocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "CrmCommercialDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmDocumentSignatureRequest" ADD CONSTRAINT "CrmDocumentSignatureRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmDocumentSignatureRequest" ADD CONSTRAINT "CrmDocumentSignatureRequest_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "CrmCommercialDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealClosureEvent" ADD CONSTRAINT "DealClosureEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealClosureEvent" ADD CONSTRAINT "DealClosureEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreeCXCallEvent" ADD CONSTRAINT "ThreeCXCallEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicBookingLink" ADD CONSTRAINT "PublicBookingLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicBookingLink" ADD CONSTRAINT "PublicBookingLink_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedSearch" ADD CONSTRAINT "SavedSearch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectingSearchExecution" ADD CONSTRAINT "ProspectingSearchExecution_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectingSearchExecution" ADD CONSTRAINT "ProspectingSearchExecution_savedSearchId_fkey" FOREIGN KEY ("savedSearchId") REFERENCES "SavedSearch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserJobRole" ADD CONSTRAINT "UserJobRole_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserJobRole" ADD CONSTRAINT "UserJobRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserJobRole" ADD CONSTRAINT "UserJobRole_jobRoleId_fkey" FOREIGN KEY ("jobRoleId") REFERENCES "JobRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentDefinition" ADD CONSTRAINT "AgentDefinition_primaryJobRoleId_fkey" FOREIGN KEY ("primaryJobRoleId") REFERENCES "JobRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentVersion" ADD CONSTRAINT "AgentVersion_agentDefinitionId_fkey" FOREIGN KEY ("agentDefinitionId") REFERENCES "AgentDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleAgentGrant" ADD CONSTRAINT "RoleAgentGrant_jobRoleId_fkey" FOREIGN KEY ("jobRoleId") REFERENCES "JobRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleAgentGrant" ADD CONSTRAINT "RoleAgentGrant_agentDefinitionId_fkey" FOREIGN KEY ("agentDefinitionId") REFERENCES "AgentDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentCapabilityGrant" ADD CONSTRAINT "AgentCapabilityGrant_agentDefinitionId_fkey" FOREIGN KEY ("agentDefinitionId") REFERENCES "AgentDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentCapabilityGrant" ADD CONSTRAINT "AgentCapabilityGrant_capabilityDefinitionId_fkey" FOREIGN KEY ("capabilityDefinitionId") REFERENCES "CapabilityDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleCapabilityGrant" ADD CONSTRAINT "RoleCapabilityGrant_jobRoleId_fkey" FOREIGN KEY ("jobRoleId") REFERENCES "JobRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleCapabilityGrant" ADD CONSTRAINT "RoleCapabilityGrant_capabilityDefinitionId_fkey" FOREIGN KEY ("capabilityDefinitionId") REFERENCES "CapabilityDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentExecution" ADD CONSTRAINT "AgentExecution_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentExecution" ADD CONSTRAINT "AgentExecution_agentDefinitionId_fkey" FOREIGN KEY ("agentDefinitionId") REFERENCES "AgentDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentExecution" ADD CONSTRAINT "AgentExecution_agentVersionId_fkey" FOREIGN KEY ("agentVersionId") REFERENCES "AgentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_capabilityDefinitionId_fkey" FOREIGN KEY ("capabilityDefinitionId") REFERENCES "CapabilityDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalDecision" ADD CONSTRAINT "ApprovalDecision_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalDecision" ADD CONSTRAINT "ApprovalDecision_accessRequestId_fkey" FOREIGN KEY ("accessRequestId") REFERENCES "AccessRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemporaryCapabilityGrant" ADD CONSTRAINT "TemporaryCapabilityGrant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemporaryCapabilityGrant" ADD CONSTRAINT "TemporaryCapabilityGrant_accessRequestId_fkey" FOREIGN KEY ("accessRequestId") REFERENCES "AccessRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemporaryCapabilityGrant" ADD CONSTRAINT "TemporaryCapabilityGrant_capabilityDefinitionId_fkey" FOREIGN KEY ("capabilityDefinitionId") REFERENCES "CapabilityDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentHandoffMessage" ADD CONSTRAINT "AgentHandoffMessage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentHandoffMessage" ADD CONSTRAINT "AgentHandoffMessage_parentHandoffId_fkey" FOREIGN KEY ("parentHandoffId") REFERENCES "AgentHandoffMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningCandidate" ADD CONSTRAINT "LearningCandidate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentMemoryRecord" ADD CONSTRAINT "AgentMemoryRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleMemoryRecord" ADD CONSTRAINT "RoleMemoryRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMemoryRecord" ADD CONSTRAINT "OrganizationMemoryRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentBuildProposal" ADD CONSTRAINT "AgentBuildProposal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialMission" ADD CONSTRAINT "CommercialMission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NextBestActionRecommendation" ADD CONSTRAINT "NextBestActionRecommendation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NextBestActionRecommendation" ADD CONSTRAINT "NextBestActionRecommendation_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "CommercialMission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialMissionEvent" ADD CONSTRAINT "CommercialMissionEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialMissionEvent" ADD CONSTRAINT "CommercialMissionEvent_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "CommercialMission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionScore" ADD CONSTRAINT "MissionScore_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionScore" ADD CONSTRAINT "MissionScore_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "CommercialMission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionAgentTrace" ADD CONSTRAINT "MissionAgentTrace_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionAgentTrace" ADD CONSTRAINT "MissionAgentTrace_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "CommercialMission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

