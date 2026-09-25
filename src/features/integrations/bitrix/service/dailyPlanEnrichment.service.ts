import { logger } from '../../../../lib/logger.js';
import { callBitrix } from './client.js';

/**
 * Resolução de contato/empresa reais por trás de atividades e tarefas do Bitrix24 — extraído de
 * dailyPlan.service.ts (ver check-hotspots.ts / HOTSPOT_EXCEPTIONS.md) porque é uma preocupação
 * distinta de montar o plano ao vivo: dado um vínculo CRM (`OWNER_ID`/`UF_CRM_TASK`), busca quem é
 * o decisor/empresa de verdade por trás dele.
 */

export type CrmEntityType = 'lead' | 'deal' | 'contact' | 'company';

export interface CrmEnrichedInfo {
  contactName?: string;
  companyName?: string;
  phone?: string;
  email?: string;
}

/** `OWNER_TYPE_ID` de `crm.activity.list` (crm.enum.ownertype): 1 = lead, 2 = negócio, 3 = contato, 4 = empresa. */
export function crmEntityTypeFromOwnerTypeId(ownerTypeId?: string | number): CrmEntityType | null {
  switch (String(ownerTypeId ?? '')) {
    case '1':
      return 'lead';
    case '2':
      return 'deal';
    case '3':
      return 'contact';
    case '4':
      return 'company';
    default:
      return null;
  }
}

/** Vínculo CRM de uma tarefa (`UF_CRM_TASK`), ex.: "CO_123" empresa, "C_123" contato, "D_123" negócio, "L_123" lead. */
export function crmEntityFromTaskLink(link: string): { type: CrmEntityType; id: string } | null {
  const match = /^(CO|C|D|L)_(\d+)$/.exec(link);
  if (!match) return null;
  const [, prefix, id] = match;
  const type: CrmEntityType | null =
    prefix === 'CO' ? 'company' : prefix === 'C' ? 'contact' : prefix === 'D' ? 'deal' : 'lead';
  return { type, id };
}

/** Limite de comandos por chamada `batch` do Bitrix24 (imposto pela própria API). */
const BITRIX_BATCH_CHUNK = 50;

/** Executa comandos `metodo?param=valor` via `batch` do Bitrix24, em blocos de até 50. */
async function callBitrixBatch(
  webhookUrl: string,
  commands: Record<string, string>,
): Promise<Record<string, unknown>> {
  const entries = Object.entries(commands);
  const out: Record<string, unknown> = {};
  for (let i = 0; i < entries.length; i += BITRIX_BATCH_CHUNK) {
    const chunk = Object.fromEntries(entries.slice(i, i + BITRIX_BATCH_CHUNK));
    try {
      const payload = await callBitrix<{ result?: { result?: Record<string, unknown> } }>(
        webhookUrl,
        'batch',
        { halt: 0, cmd: chunk },
      );
      Object.assign(out, payload?.result?.result || {});
    } catch (err) {
      logger.warn(
        { err },
        '[daily-plan] Falha ao resolver lote de contato/empresa/negócio do Bitrix24',
      );
    }
  }
  return out;
}

/**
 * Resolve nome do decisor, empresa, telefone e e-mail para um conjunto de referências CRM
 * (lead/negócio/contato/empresa) vindas de atividades e tarefas do Bitrix24, usando `batch` para
 * não gerar uma chamada HTTP por item — o Plano Diário pode trazer até `MAX_BITRIX_ACTIVITIES` +
 * `MAX_BITRIX_TASKS` itens numa única carga de tela. Negócio só devolve `CONTACT_ID`/`COMPANY_ID`
 * (mesmo padrão de `deals.ts`), então esses vínculos são resolvidos numa segunda leva.
 */
export async function resolveCrmEnrichment(
  webhookUrl: string,
  refs: Array<{ type: CrmEntityType; id: string }>,
): Promise<Map<string, CrmEnrichedInfo>> {
  const result = new Map<string, CrmEnrichedInfo>();
  const uniqueRefs = new Map<string, { type: CrmEntityType; id: string }>();
  for (const ref of refs) {
    if (ref.id) uniqueRefs.set(`${ref.type}:${ref.id}`, ref);
  }
  if (uniqueRefs.size === 0) return result;

  const methodByType: Record<CrmEntityType, string> = {
    lead: 'crm.lead.get',
    deal: 'crm.deal.get',
    contact: 'crm.contact.get',
    company: 'crm.company.get',
  };
  const commands: Record<string, string> = {};
  for (const [key, ref] of uniqueRefs) {
    commands[key] = `${methodByType[ref.type]}?id=${encodeURIComponent(ref.id)}`;
  }
  const raw = await callBitrixBatch(webhookUrl, commands);

  const secondaryRefs: Array<{ type: CrmEntityType; id: string }> = [];
  const dealLinks = new Map<string, { contactId?: string; companyId?: string; title?: string }>();

  for (const [key, ref] of uniqueRefs) {
    const entity = raw[key] as Record<string, unknown> | undefined;
    if (!entity) continue;

    if (ref.type === 'contact') {
      const phones = entity.PHONE as Array<{ VALUE?: string }> | undefined;
      const emails = entity.EMAIL as Array<{ VALUE?: string }> | undefined;
      result.set(key, {
        contactName: [entity.NAME, entity.LAST_NAME].filter(Boolean).join(' ') || undefined,
        phone: phones?.[0]?.VALUE,
        email: emails?.[0]?.VALUE,
      });
    } else if (ref.type === 'company') {
      const phones = entity.PHONE as Array<{ VALUE?: string }> | undefined;
      const emails = entity.EMAIL as Array<{ VALUE?: string }> | undefined;
      result.set(key, {
        companyName: (entity.TITLE as string) || undefined,
        phone: phones?.[0]?.VALUE,
        email: emails?.[0]?.VALUE,
      });
    } else if (ref.type === 'lead') {
      const phones = entity.PHONE as Array<{ VALUE?: string }> | undefined;
      const emails = entity.EMAIL as Array<{ VALUE?: string }> | undefined;
      result.set(key, {
        contactName:
          [entity.NAME, entity.LAST_NAME].filter(Boolean).join(' ') ||
          (entity.TITLE as string) ||
          undefined,
        companyName: (entity.COMPANY_TITLE as string) || undefined,
        phone: phones?.[0]?.VALUE,
        email: emails?.[0]?.VALUE,
      });
    } else if (ref.type === 'deal') {
      const contactId = entity.CONTACT_ID ? String(entity.CONTACT_ID) : undefined;
      const companyId = entity.COMPANY_ID ? String(entity.COMPANY_ID) : undefined;
      dealLinks.set(key, { contactId, companyId, title: entity.TITLE as string | undefined });
      if (contactId) secondaryRefs.push({ type: 'contact', id: contactId });
      if (companyId) secondaryRefs.push({ type: 'company', id: companyId });
    }
  }

  if (secondaryRefs.length > 0) {
    const secondary = await resolveCrmEnrichment(webhookUrl, secondaryRefs);
    for (const [key, link] of dealLinks) {
      const contactInfo = link.contactId ? secondary.get(`contact:${link.contactId}`) : undefined;
      const companyInfo = link.companyId ? secondary.get(`company:${link.companyId}`) : undefined;
      result.set(key, {
        contactName: contactInfo?.contactName,
        companyName: companyInfo?.companyName || link.title,
        phone: contactInfo?.phone || companyInfo?.phone,
        email: contactInfo?.email || companyInfo?.email,
      });
    }
  }

  return result;
}
