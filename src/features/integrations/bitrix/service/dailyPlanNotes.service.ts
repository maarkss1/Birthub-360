import { logger } from '../../../../lib/logger.js';
import type { DailyPlanItemOrigin } from '../../../../shared/contracts/dailyPlan.contract.js';
import { callBitrix, getConnectionWebhookUrl } from './client.js';
import { getBitrixUsers } from './deals.js';
import { parseDate, resolvePlanConnection, toPlanDate, toPlanTime } from './dailyPlan.service.js';

/**
 * Histórico real de comentários do Bitrix24 para um item do Plano Diário — extraído de
 * dailyPlan.service.ts (ver check-hotspots.ts / HOTSPOT_EXCEPTIONS.md) porque é uma preocupação
 * distinta de montar o plano ao vivo: leitura sob demanda de comentários já existentes, não
 * construção do radar de itens.
 */

/** "DD/MM HH:MM" no fuso do time comercial, para formatar comentários vindos do Bitrix24. */
function formatBitrixCommentDate(value: string | undefined): string {
  const date = parseDate(value);
  if (!date) return '';
  return `${toPlanDate(date)?.split('-').reverse().join('/') ?? ''} ${toPlanTime(date) ?? ''}`.trim();
}

/**
 * Busca os comentários já existentes no Bitrix24 para um item do Plano Diário (histórico real,
 * não só o que a Central adicionou) — chamada sob demanda quando o usuário abre a gaveta de
 * observações de um item, nunca em lote no carregamento do plano (o plano pode trazer 500+ itens;
 * buscar comentário de cada um eagerly seria caro e lento — ver performance/SKILL.md).
 */
export async function fetchDailyPlanItemNotes(
  organizationId: string,
  itemType: DailyPlanItemOrigin,
  itemId: string,
  entityType?: string,
  entityId?: string,
): Promise<string[]> {
  if (itemType === 'LOCAL_ACTIVITY') return [];

  const connection = await resolvePlanConnection(organizationId);
  if (!connection) return [];

  const webhookUrl = await getConnectionWebhookUrl(organizationId, connection.id);
  const rawId = itemId.replace(/^(bitrix_task_|bitrix_act_|bitrix_lead_)/, '');

  try {
    if (itemType === 'BITRIX_TASK') {
      // task.commentitem.getlist não funciona nos portais já migrados para o "novo card de
      // tarefa" (usam im.dialog.messages.get para o chat) — falha silenciosa (array vazio) nesse
      // caso, o mesmo padrão de degradação já usado no resto de dailyPlan.service.ts.
      const payload = await callBitrix<{
        result?: Array<{ AUTHOR_NAME?: string; POST_MESSAGE?: string; POST_DATE?: string }>;
      }>(webhookUrl, 'task.commentitem.getlist', { TASKID: rawId });
      return (payload?.result || [])
        .filter((c) => c.POST_MESSAGE)
        .map(
          (c) =>
            `[${formatBitrixCommentDate(c.POST_DATE)}] ${c.AUTHOR_NAME || 'Bitrix24'}: ${c.POST_MESSAGE}`,
        );
    }

    // BITRIX_ACTIVITY / BITRIX_LEAD — timeline do lead/negócio/contato/empresa vinculado.
    const finalEntityType = entityType || (itemType === 'BITRIX_LEAD' ? 'lead' : undefined);
    const finalEntityId = entityId || rawId;
    if (!finalEntityType) return [];

    const [payload, users] = await Promise.all([
      callBitrix<{
        result?: Array<{ AUTHOR_ID?: string | number; COMMENT?: string; CREATED?: string }>;
      }>(webhookUrl, 'crm.timeline.comment.list', {
        filter: { ENTITY_ID: finalEntityId, ENTITY_TYPE: finalEntityType },
      }),
      getBitrixUsers(organizationId, connection.id),
    ]);
    const userNameById = new Map(users.map((u) => [u.id, u.name]));

    return (payload?.result || [])
      .filter((c) => c.COMMENT)
      .map((c) => {
        const authorName = userNameById.get(String(c.AUTHOR_ID ?? '')) || 'Bitrix24';
        return `[${formatBitrixCommentDate(c.CREATED)}] ${authorName}: ${c.COMMENT}`;
      });
  } catch (err) {
    logger.warn(
      { err, organizationId, itemType, itemId },
      '[daily-plan] Falha ao buscar comentários existentes do Bitrix24 para o item',
    );
    return [];
  }
}
