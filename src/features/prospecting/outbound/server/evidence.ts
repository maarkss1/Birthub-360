// Wave 6 (CPI) — Evidence & Provenance: todo dado importante carrega
// evidência (de onde veio, quando foi obtido, com que confiança e status de
// verificação) - para a UI poder responder "por que este resultado apareceu?"
// e para nunca apresentar um valor sem saber se ele é confirmado, inferido
// ou desconhecido (mesma distinção da Wave 0/01_PROMPT_MESTRE_ORQUESTRADOR).

import type { DbHandle } from './db';

export type VerificationStatus = 'verified' | 'unverified' | 'inferred' | 'unknown' | 'conflicted';

export interface EvidenceRecord {
  field: string;
  value: unknown;
  provider: string;
  sourceReference?: string;
  retrievedAt: string;
  expiresAt?: string;
  confidence: number;
  verificationStatus: VerificationStatus;
}

// TTL por tipo de dado (Wave 6 pede "expiração por tipo de dado" - dados
// cadastrais oficiais mudam devagar; dados de contato/pessoa mudam mais rápido).
const TTL_DAYS_BY_FIELD: Record<string, number> = {
  razao_social: 90,
  situacao_cadastral: 30,
  cnae_fiscal_descricao: 90,
  capital_social: 90,
  decision_maker_name: 14,
  decision_maker_title: 14,
  decision_maker_email: 14,
  decision_maker_linkedin: 30,
  company_linkedin: 30
};
const DEFAULT_TTL_DAYS = 30;

function computeExpiresAt(field: string, retrievedAt: Date): string {
  const ttlDays = TTL_DAYS_BY_FIELD[field] ?? DEFAULT_TTL_DAYS;
  const expires = new Date(retrievedAt.getTime() + ttlDays * 24 * 60 * 60 * 1000);
  return expires.toISOString();
}

export function buildEvidence(params: {
  field: string;
  value: unknown;
  provider: string;
  sourceReference?: string;
  confidence: number;
  verificationStatus: VerificationStatus;
  retrievedAt?: Date;
}): EvidenceRecord {
  const retrievedAt = params.retrievedAt || new Date();
  return {
    field: params.field,
    value: params.value,
    provider: params.provider,
    sourceReference: params.sourceReference,
    retrievedAt: retrievedAt.toISOString(),
    expiresAt: computeExpiresAt(params.field, retrievedAt),
    confidence: params.confidence,
    verificationStatus: params.verificationStatus
  };
}

/**
 * Monta as evidências dos campos de CNPJ que uma fonte oficial (Receita
 * Federal via BrasilAPI/Minha Receita) confirmou para este lead. Só gera
 * evidência para campos que de fato vieram preenchidos - nunca para um
 * campo ausente (isso ficaria "unknown", que não é evidência nenhuma).
 */
export function buildCnpjEvidence(cnpjData: {
  razao_social?: string;
  situacao_cadastral?: string;
  cnae_fiscal_descricao?: string;
  capital_social?: string;
  source?: string;
}, retrievedAt?: Date): EvidenceRecord[] {
  const provider = cnpjData.source || 'cnpj_receita_federal';
  const fields: Array<[string, unknown]> = [
    ['razao_social', cnpjData.razao_social],
    ['situacao_cadastral', cnpjData.situacao_cadastral],
    ['cnae_fiscal_descricao', cnpjData.cnae_fiscal_descricao],
    ['capital_social', cnpjData.capital_social]
  ];

  return fields
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([field, value]) => buildEvidence({
      field,
      value,
      provider,
      confidence: 0.95, // fonte oficial (Receita Federal), mas não é o próprio CNPJ informado pelo usuário
      verificationStatus: 'verified',
      retrievedAt
    }));
}

/**
 * Monta as evidências do decisor encontrado via Apollo. Confiança mais baixa
 * que o CNPJ oficial: é uma fonte de terceiros sobre uma pessoa, não um
 * registro público oficial - por isso "unverified" (Apollo relatou, mas
 * ninguém confirmou o e-mail/telefone de fato funciona) em vez de "verified".
 */
export function buildDecisionMakerEvidence(dm: {
  name?: string;
  title?: string;
  email?: string;
  linkedin?: string;
}, provider: string, retrievedAt?: Date): EvidenceRecord[] {
  const fields: Array<[string, unknown]> = [
    ['decision_maker_name', dm.name],
    ['decision_maker_title', dm.title],
    ['decision_maker_email', dm.email],
    ['decision_maker_linkedin', dm.linkedin]
  ];

  return fields
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([field, value]) => buildEvidence({
      field,
      value,
      provider,
      confidence: 0.7,
      verificationStatus: 'unverified',
      retrievedAt
    }));
}

/**
 * Persiste as evidências de uma entidade (ex: um lead). Nunca falha
 * silenciosamente perdendo dado de negócio: se a tabela de evidências
 * não puder receber a escrita, o chamador decide se propaga o erro -
 * mas evidência nunca bloqueia a gravação do lead em si (ver /prospect).
 */
export async function saveFieldEvidence(db: DbHandle, entityType: string, entityId: string, evidences: EvidenceRecord[]): Promise<void> {
  for (const ev of evidences) {
    await db.run(`
      INSERT INTO field_evidence (
        entity_type, entity_id, field_name, value_json, provider,
        source_reference, retrieved_at, expires_at, confidence, verification_status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      entityType,
      entityId,
      ev.field,
      JSON.stringify(ev.value),
      ev.provider,
      ev.sourceReference || null,
      ev.retrievedAt,
      ev.expiresAt || null,
      ev.confidence,
      ev.verificationStatus
    ]);
  }
}

export interface StoredEvidence extends EvidenceRecord {
  id: number;
}

export async function getFieldEvidence(db: DbHandle, entityType: string, entityId: string): Promise<StoredEvidence[]> {
  const result = await db.exec(
    `SELECT id, field_name, value_json, provider, source_reference, retrieved_at, expires_at, confidence, verification_status
     FROM field_evidence WHERE entity_type = ? AND entity_id = ? ORDER BY retrieved_at DESC`,
    [entityType, entityId]
  );
  if (result.length === 0) return [];

  return result[0].values.map(row => {
    let value: unknown = null;
    try {
      value = row[2] ? JSON.parse(row[2] as string) : null;
    } catch {
      value = row[2];
    }
    return {
      id: row[0] as number,
      field: row[1] as string,
      value,
      provider: row[3] as string,
      sourceReference: (row[4] as string) || undefined,
      retrievedAt: row[5] as string,
      expiresAt: (row[6] as string) || undefined,
      confidence: row[7] as number,
      verificationStatus: row[8] as VerificationStatus
    };
  });
}
