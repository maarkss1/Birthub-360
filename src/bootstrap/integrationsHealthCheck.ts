import { logger } from '../lib/logger';

// Débito conhecido (ver docs/audits/repository-debt-audit): GROQ_API_KEY, OPENAI_API_KEY,
// TAVILY_API_KEY, SERPER_API_KEY e as chaves de storage de objetos (STORAGE_ACCESS_KEY_ID/
// STORAGE_SECRET_ACCESS_KEY) não fazem parte do schema fail-fast de src/config/env.ts — cada
// consumidor lê `process.env` diretamente (groq.provider.ts, openai.provider.ts,
// marketResearchTool.ts, src/lib/storage/index.ts) e só descobre a ausência da chave na primeira
// chamada real, em runtime, não no boot. Diferente dos segredos críticos (BETTER_AUTH_SECRET,
// CREDENTIALS_ENCRYPTION_KEY, PII_BLIND_INDEX_KEY), nenhuma dessas integrações é obrigatória para
// a aplicação subir — cada uma tem um caminho de "inerte"/fallback já documentado no próprio
// consumidor — então esta checagem nunca chama `process.exit`: ela só torna a ausência visível no
// log de boot, em vez de silenciosa até o primeiro uso.
interface SecondaryIntegrationGroup {
  /** Nome curto usado no log — identifica o que fica indisponível, não a variável em si. */
  label: string;
  /** Basta UMA destas variáveis estar presente para o grupo ser considerado configurado. */
  anyOf: string[];
}

const SECONDARY_INTEGRATION_GROUPS: SecondaryIntegrationGroup[] = [
  {
    label: 'Motor de IA (chat/qualificação de leads)',
    anyOf: ['GROQ_API_KEY', 'OPENAI_API_KEY'],
  },
  {
    label: 'Pesquisa de mercado (marketResearchTool)',
    anyOf: ['TAVILY_API_KEY', 'SERPER_API_KEY'],
  },
  {
    label: 'Storage de objetos (upload/download de anexos)',
    anyOf: [
      'STORAGE_ACCESS_KEY_ID',
      'STORAGE_SECRET_ACCESS_KEY',
      'MINIO_ACCESS_KEY',
      'MINIO_SECRET_KEY',
    ],
  },
];

/**
 * Loga um aviso único no boot para cada integração secundária sem nenhuma credencial configurada.
 * Não bloqueia a inicialização (nunca chama `process.exit`) — cada integração listada já tem seu
 * próprio comportamento de fallback/erro explícito em runtime; isto só antecipa a visibilidade
 * para o momento do deploy em vez do primeiro uso em produção.
 */
export function warnUnconfiguredSecondaryIntegrations(): void {
  const unconfigured = SECONDARY_INTEGRATION_GROUPS.filter(
    (group) => !group.anyOf.some((key) => Boolean(process.env[key]?.trim())),
  ).map((group) => group.label);

  if (unconfigured.length > 0) {
    logger.warn(
      { unconfigured },
      `⚠️  Integrações secundárias sem credencial configurada (indisponíveis até primeiro uso, não bloqueiam a subida): ${unconfigured.join(', ')}`,
    );
  }
}
