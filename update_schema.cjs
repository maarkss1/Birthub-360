const fs = require('fs');

const voicesHubSchemaPath = 'C:\\Github\\BIRTH-VOICES-HUB\\prisma\\schema.prisma';
const birthub360SchemaPath = 'C:\\Github\\Birthub-360\\prisma\\schema.prisma';

let voicesHubContent = fs.readFileSync(voicesHubSchemaPath, 'utf-8');
let birthub360Content = fs.readFileSync(birthub360SchemaPath, 'utf-8');

// Models to extract from Voices Hub (skip Session and AuditLog)
const modelsToExtract = [
  'Workflow', 'WorkflowVersion', 'Agent', 'CallLog', 'Metric', 'Setting',
  'TenantAiConsent', 'AtlasGRCallResult', 'APIKey', 'TenantWebhookEndpoint',
  'Integration', 'Plan', 'Wallet', 'Transaction'
];

let appendedModels = '';

for (const modelName of modelsToExtract) {
  const modelRegex = new RegExp(`model\\s+${modelName}\\s+\\{[\\s\\S]*?\\n\\}`, 'g');
  const match = voicesHubContent.match(modelRegex);
  if (match) {
    let modelText = match[0];
    
    // Rename models
    if (modelName === 'TenantAiConsent') modelText = modelText.replace(/model TenantAiConsent/g, 'model OrganizationAiConsent');
    if (modelName === 'TenantWebhookEndpoint') modelText = modelText.replace(/model TenantWebhookEndpoint/g, 'model OrganizationWebhookEndpoint');
    
    // Replace Tenant relation with Organization relation
    modelText = modelText.replace(/tenantId/g, 'organizationId');
    modelText = modelText.replace(/tenant\s+Tenant/g, 'organization Organization');
    modelText = modelText.replace(/tenant\s+Tenant\?/g, 'organization Organization?');
    
    appendedModels += `\n${modelText}\n`;
  }
}

// Add AgentSession manually based on Session
appendedModels += `
model AgentSession {
  id             String       @id @default(uuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  userId         String?
  user           User?        @relation(fields: [userId], references: [id], onDelete: SetNull)
  agentId        String?
  channel        String
  status         String       @default("active")
  metadata       Json         @default("{}")

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  @@index([organizationId])
  @@index([userId])
}
`;

// Add dialer models
appendedModels += `
model Campaign {
  id             String       @id @default(uuid())
  name           String
  status         String
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  callAttempts CallAttempt[]

  @@index([organizationId])
}

model CallAttempt {
  id         String   @id @default(uuid())
  campaignId String
  campaign   Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  leadId     String?
  agentDn    String?
  status     String
  duration   Int?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([campaignId])
  @@index([leadId])
}

model DncList {
  id             String       @id @default(uuid())
  phone          String
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  createdAt      DateTime     @default(now())

  @@unique([organizationId, phone])
  @@index([organizationId])
}
`;

// Append to birthub 360 schema
birthub360Content += appendedModels;

// Relations to add
const orgRelations = `
  workflows                  Workflow[]
  callLogs                   CallLog[]
  metrics                    Metric[]
  agentSessions              AgentSession[]
  agents                     Agent[]
  settings                   Setting[]
  aiConsent                  OrganizationAiConsent?
  atlasGRCallResults         AtlasGRCallResult[]
  wallet                     Wallet?
  transactions               Transaction[]
  apiKeys                    APIKey[]
  webhookEndpoints           OrganizationWebhookEndpoint[]
  campaigns                  Campaign[]
  dncLists                   DncList[]
`;

const userRelations = `
  agentSessions              AgentSession[]
  createdApiKeys             APIKey[]
`;

// Simple injection before the last closing brace of the models
birthub360Content = birthub360Content.replace(/(model Organization\s+\{[\s\S]*?)(\})/, `$1${orgRelations}\n$2`);
birthub360Content = birthub360Content.replace(/(model User\s+\{[\s\S]*?)(\})/, `$1${userRelations}\n$2`);

fs.writeFileSync(birthub360SchemaPath, birthub360Content);

console.log("Schema updated.");
