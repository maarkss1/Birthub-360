import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import { getDatabase, executeQuery, getStats, saveDatabase, logActivity, checkExplorerSqlSafety } from './db';
import { checkOllamaConnection, generateCopiesWithEngine, chatWithLLaMA3, enrichLeadWithPublicNewsAndScripts } from './ai';
import { resolveAndEnrichCnpjForLead, fetchCnpjPublicData, formatCnpj, type CnpjData } from './cnpj';
import { parseSearchIntent, validateSearchIntent } from './searchIntent';
import { buildRequirementsFromSearchIntent, evaluateRequirements } from './requirementEngine';
import { planSearch } from './queryPlanner';
import { buildFunnelSummary } from './progressiveSearch';
import { providerRegistry } from './providerRegistry';
import { buildCompanyKey, canonicalizeDomain, normalizeCompanyName, findDuplicate, type CompanyKey } from './entityResolution';
import { buildCnpjEvidence, buildDecisionMakerEvidence, saveFieldEvidence, getFieldEvidence } from './evidence';
import { computeLeadScores } from './scoring';
import { detectSignalsForLead } from './signals';
import {
  startSearchRun,
  attachSearchPlan,
  recordStep,
  recordProviderCall,
  recordCandidateDecision,
  finishSearchRun,
  getSearchRun,
  getObservabilitySummary
} from './observability';
import { buildFeedbackSummary, type FeedbackMessageRecord, type FeedbackLeadRecord } from './feedbackLoop';
import { searchPlaces } from './search/providers/googlePlaces.provider';
import { enrichOrganization, searchAndMatchPeople } from './search/providers/apollo.provider';
import { domainSearch as hunterDomainSearch, verifyEmail as hunterVerifyEmail, complementDecisionMakerEmail as complementDecisionMakerEmailWithHunter } from './search/providers/hunter.provider';
import { exportLead } from './search/providers/bitrix.provider';
import { checkBitrixDuplicate, resolveBitrixWebhookForCompany, generateExportIdempotencyKey } from './services/bitrix';
import { checkExportEligibility, type ExportPolicy } from './exportEligibility';
import { rateLimit } from './middleware/rateLimit';
import {
  withCache, withRetry, withCircuitBreaker, withProviderRetry, withProviderCircuitBreaker,
  hasFreshCacheEntry, CACHE_TTL_MS, createBudgetTracker, hasEnrichmentBudget, isBudgetExhausted,
  recordApiCall, recordEnrichment, parseSearchBudget, getCircuitState
} from './resilience';
import { isValidCnpjFormat, isValidEmailFormat, isValidPhoneFormat, isUrlSafeForOutboundWebhook, isWithinMaxLength, maskWebhookUrl } from './validators';
import {
  attachUser, requireAuth, requireAdmin, requireManager,
  createSessionToken, buildSessionCookie, buildLogoutCookie
} from './auth';
import { type Lead, AIConfig, type DecisionMaker } from '../src/types';

// Só valida um campo quando ele está sendo de fato alterado para um valor novo —
// nunca quando é reenviado sem mudança (o botão "Salvar" manda o lead inteiro de
// volta), senão um dado legado imperfeito de um lead antigo travaria qualquer
// edição futura nele, mesmo em campos que a pessoa nem tocou.
function validateChangedLeadFields(
  incoming: { cnpj?: string; phone?: string; corporate_email?: string; decision_maker_email?: string },
  current: { cnpj?: string; phone?: string; corporate_email?: string; decision_maker_email?: string }
): string[] {
  const errors: string[] = [];
  const changed = (key: keyof typeof incoming) => incoming[key] !== undefined && incoming[key] !== current[key];

  if (changed('cnpj') && incoming.cnpj && !isValidCnpjFormat(incoming.cnpj)) {
    errors.push('CNPJ com formato ou dígito verificador inválido.');
  }
  if (changed('phone') && incoming.phone && !isValidPhoneFormat(incoming.phone)) {
    errors.push('Telefone precisa ter entre 10 e 13 dígitos.');
  }
  if (changed('corporate_email') && incoming.corporate_email && !isValidEmailFormat(incoming.corporate_email)) {
    errors.push('E-mail corporativo com formato inválido.');
  }
  if (changed('decision_maker_email') && incoming.decision_maker_email && !isValidEmailFormat(incoming.decision_maker_email)) {
    errors.push('E-mail do decisor com formato inválido.');
  }
  return errors;
}

// Tetos por IP para rotas que chamam APIs pagas/externas (Apollo, Google Places,
// Groq, Gemini, Bitrix24, Hunter) — protege contra custo/abuso, não é autenticação.
const heavyAiLimiter = rateLimit({ windowMs: 60_000, max: 20, message: 'Muitas chamadas de IA/enriquecimento em 1 minuto. Aguarde um instante.' });
const integrationLimiter = rateLimit({ windowMs: 60_000, max: 30, message: 'Muitas chamadas a integrações externas em 1 minuto. Aguarde um instante.' });

export const apiRouter = Router();

// Auth & RBAC (CPI follow-up): popula req.user a partir do cookie de sessão
// assinado em TODA requisição desta API, sem bloquear nenhuma — rotas que
// continuam públicas (login, health, etc.) simplesmente seguem com
// req.user undefined; rotas sensíveis usam requireAuth/requireAdmin abaixo.
apiRouter.use(attachUser);

// --- Senhas: hash com scrypt (sem dependência externa). Contas antigas com
// senha em texto puro continuam funcionando e são migradas silenciosamente
// para hash no primeiro login bem-sucedido. ---
const SCRYPT_PREFIX = 'scrypt$';

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${SCRYPT_PREFIX}${salt}$${hash}`;
}

function verifyHashedPassword(password: string, stored: string): boolean {
  const parts = stored.slice(SCRYPT_PREFIX.length).split('$');
  const [salt, hashHex] = parts;
  if (!salt || !hashHex) return false;
  const hashBuffer = Buffer.from(hashHex, 'hex');
  const candidate = crypto.scryptSync(password, salt, 64);
  return candidate.length === hashBuffer.length && crypto.timingSafeEqual(candidate, hashBuffer);
}

// Usuários são cadastrados manualmente (via SQL Explorer, não há tela de cadastro),
// então o campo 'company' no banco vem digitado à mão e varia: 'AtlasGR', 'Atlas GR',
// 'TotalTrac', 'total trac', com espaços/maiúsculas inconsistentes. O front só entende
// os literais exatos 'atlas'/'totaltrac' — qualquer variação travava o login de todo
// usuário 'user' daquela marca com "conta pertence a outra empresa", mesmo com a senha certa.
function normalizeCompany(value: unknown): 'atlas' | 'totaltrac' | null {
  const v = String(value ?? '').trim().toLowerCase();
  if (!v) return null;
  if (v.includes('total')) return 'totaltrac';
  if (v.includes('atlas')) return 'atlas';
  return null;
}

// SQLite guarda tags/qsa/dossiê/e-mails/telefones como texto JSON. O client (LeadCard)
// espera arrays/objetos reais, então todo endpoint que devolve leads precisa passar por aqui.
export function formatLeadRow(leadObj: any, messages: any[] = []): any {
  const copies: any = {};
  let lastEngineUsed: string | null = null;
  messages.forEach((msgObj: any) => {
    if (msgObj.channel) {
      copies[msgObj.channel] = msgObj.content;
    }
    if (msgObj.engine_used) {
      lastEngineUsed = msgObj.engine_used;
    }
  });

  let tags: string[] = [];
  try {
    if (typeof leadObj.tags === 'string') {
      tags = JSON.parse(leadObj.tags);
    } else if (Array.isArray(leadObj.tags)) {
      tags = leadObj.tags;
    }
  } catch (e) {
    tags = [];
  }

  let newsDossier = null;
  try {
    if (leadObj.news_dossier && typeof leadObj.news_dossier === 'string') {
      newsDossier = JSON.parse(leadObj.news_dossier);
    } else if (leadObj.news_dossier) {
      newsDossier = leadObj.news_dossier;
    }
  } catch (e) {
    newsDossier = null;
  }

  let dmEmails: string[] = [];
  try {
    if (leadObj.decision_maker_emails) {
      dmEmails = typeof leadObj.decision_maker_emails === 'string' ? JSON.parse(leadObj.decision_maker_emails) : leadObj.decision_maker_emails;
    }
  } catch (e) {
    dmEmails = leadObj.decision_maker_email ? [leadObj.decision_maker_email] : [];
  }
  if (dmEmails.length === 0 && leadObj.decision_maker_email) {
    dmEmails = [leadObj.decision_maker_email];
  }

  let dmPhones: string[] = [];
  try {
    if (leadObj.decision_maker_phones) {
      dmPhones = typeof leadObj.decision_maker_phones === 'string' ? JSON.parse(leadObj.decision_maker_phones) : leadObj.decision_maker_phones;
    }
  } catch (e) {
    dmPhones = leadObj.decision_maker_phone ? [leadObj.decision_maker_phone] : [];
  }
  if (dmPhones.length === 0 && leadObj.decision_maker_phone) {
    dmPhones = [leadObj.decision_maker_phone];
  }

  let qsa: any[] = [];
  try {
    if (leadObj.qsa && typeof leadObj.qsa === 'string') {
      qsa = JSON.parse(leadObj.qsa);
    } else if (Array.isArray(leadObj.qsa)) {
      qsa = leadObj.qsa;
    }
  } catch (e) {
    qsa = [];
  }

  leadObj.tags = tags;
  leadObj.qsa = qsa;
  leadObj.stage = leadObj.stage || 'prospecto';
  leadObj.copies = copies;
  leadObj.engine_used = lastEngineUsed;
  leadObj.copies_generated = Object.values(copies).some((c: any) => typeof c === 'string' && c.trim().length > 10);
  leadObj.messages = messages;
  leadObj.news_dossier = newsDossier;
  leadObj.is_enriched = Boolean(leadObj.is_enriched || newsDossier);
  leadObj.decision_maker_emails = dmEmails;
  leadObj.decision_maker_phones = dmPhones;

  leadObj.decision_makers = leadObj.decision_maker_name ? [{
    name: leadObj.decision_maker_name,
    title: leadObj.decision_maker_title || 'Decisor',
    email: leadObj.decision_maker_email || dmEmails[0] || '',
    emails: dmEmails,
    phone: leadObj.decision_maker_phone || dmPhones[0] || leadObj.phone || '',
    phones: dmPhones,
    linkedin: leadObj.decision_maker_linkedin || ''
  }] : [];

  return leadObj;
}

// Previsibilidade: um roteiro já marcado como 'sent' (efetivamente usado com o
// cliente) não é sobrescrito silenciosamente ao regenerar — precisa de force=true
// explícito. Quando sobrescreve, guarda a versão anterior em message_versions para
// nunca perder o que já foi enviado.
async function upsertMessageWithVersioning(
  db: any,
  params: { msgId: string; campaignId: string; leadId: string; channel: string; content: string; engineUsed?: string; force?: boolean }
): Promise<{ content: string; skipped: boolean }> {
  const { msgId, campaignId, leadId, channel, content, engineUsed, force } = params;

  let existing: { content: string; status: string } | null = null;
  try {
    const existingRes = await db.exec(`SELECT content, status FROM messages WHERE id = ?`, [msgId]);
    if (existingRes.length > 0 && existingRes[0].values.length > 0) {
      existing = { content: existingRes[0].values[0][0], status: existingRes[0].values[0][1] };
    }
  } catch (err) {
    existing = null;
  }

  if (existing && existing.status === 'sent' && !force) {
    return { content: existing.content, skipped: true };
  }

  if (existing && existing.content && existing.content.trim().length > 10 && existing.content !== content) {
    try {
      await db.run(
        `INSERT INTO message_versions (message_id, lead_id, channel, content, engine_used) VALUES (?, ?, ?, ?, ?)`,
        [msgId, leadId, channel, existing.content, null]
      );
    } catch (err) {
      console.error('Falha ao versionar mensagem anterior:', err);
    }
  }

  try {
    await db.run(`
      INSERT INTO messages (id, campaign_id, lead_id, channel, role, content, status, engine_used, created_at)
      VALUES (?, ?, ?, ?, 'assistant', ?, 'reviewed', ?, ?)
      ON CONFLICT(id) DO UPDATE SET content = excluded.content, status = 'reviewed', engine_used = excluded.engine_used
    `, [msgId, campaignId, leadId, channel, content, engineUsed || null, new Date().toISOString()]);
  } catch (err) {
    await db.run(`UPDATE messages SET content = ?, status = 'reviewed', engine_used = ? WHERE id = ?`, [content, engineUsed || null, msgId]);
  }

  return { content, skipped: false };
}

// 1. Health check & DB Stats
apiRouter.get('/health', async (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Wave 4 (CPI) - Provider Registry: expõe o catálogo real de providers, suas
// capacidades declaradas e status de configuração/saúde - nenhum provider
// "some" do catálogo, incluindo os ainda não migrados a adapter formal.
apiRouter.get('/providers/health', async (req: Request, res: Response) => {
  try {
    const snapshot = await Promise.all(providerRegistry.map(async p => ({
      name: p.name,
      capabilities: p.capabilities,
      configured: p.configured(),
      health: await p.health()
    })));
    res.json({ providers: snapshot });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Wave 10 (CPI) - Observabilidade: "por que esta empresa apareceu (ou não
// apareceu) NESTA busca?" - devolve o SearchRun completo (pedido original,
// SearchIntent, SearchPlan, passos do pipeline, chamadas a provider e a
// decisão registrada para cada candidato). Armazenamento em memória por
// processo (ver server/observability.ts) - um Search-ID de uma busca antiga
// ou de outra instância do servidor pode não estar mais disponível.
apiRouter.get('/search-runs/:searchId', async (req: Request, res: Response) => {
  const { searchId } = req.params;
  const run = getSearchRun(searchId);
  if (!run) {
    return res.status(404).json({
      error: 'Search-ID não encontrado. Buscas são retidas em memória por processo (últimas 200) - pode ter expirado, ter sido de outra instância do servidor, ou nunca ter existido.',
      searchId
    });
  }
  res.json(run);
});

// Wave 10 (CPI) - Observabilidade: painel agregado - buscas executadas, taxa
// de sucesso, providers mais chamados, taxa de erro por provider e motivos
// de descarte mais comuns. Calculado só a partir do que foi de fato
// registrado nesta instância do processo desde que ela subiu - nunca uma
// métrica estimada (custo/cache ficam `null`: dependem da Wave 9).
apiRouter.get('/observability/summary', async (req: Request, res: Response) => {
  res.json(getObservabilitySummary());
});

apiRouter.get('/db/stats', async (req: Request, res: Response) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Botão "Reportar problema" (presente em toda tela, inclusive login): grava o
// relato para revisão posterior. Nunca deve travar o uso do app por causa de
// um erro ao registrar o próprio erro — por isso segue com sucesso genérico
// para o usuário mesmo que o log em si falhe, só reportando no servidor.
const errorReportLimiter = rateLimit({ windowMs: 60_000, max: 10, message: 'Muitos reportes em 1 minuto. Aguarde um instante.' });

apiRouter.post('/error-reports', errorReportLimiter, async (req: Request, res: Response) => {
  const { message, page, userId, userEmail, userAgent } = req.body;
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Descreva o problema antes de enviar.' });
  }
  console.error(`[REPORTE DE ERRO] página=${page || 'desconhecida'} usuário=${userEmail || userId || 'anônimo'}: ${message}`);
  try {
    const db = await getDatabase();
    await db.run(
      `INSERT INTO error_reports (user_id, user_email, page, message, user_agent) VALUES (?, ?, ?, ?, ?)`,
      [userId || null, userEmail || null, page || null, message.trim(), userAgent || null]
    );
    saveDatabase();
  } catch (err) {
    console.error('Falha ao persistir error_report (log acima já registrou o relato):', err);
  }
  res.json({ success: true });
});

// Lista os reportes para revisão (mais recentes primeiro) — sem isso, a única forma
// de ver o que foi reportado seria consultar o Postgres diretamente.
apiRouter.get('/error-reports', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const limit = Math.min(Math.max(1, Number(req.query.limit) || 50), 200);
    const result = await db.exec(`SELECT * FROM error_reports ORDER BY created_at DESC LIMIT ?`, [limit]);
    if (result.length === 0) return res.json([]);
    const cols = result[0].columns;
    const reports = result[0].values.map(row => {
      const obj: any = {};
      cols.forEach((col, idx) => { obj[col] = row[idx]; });
      return obj;
    });
    res.json(reports);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Raw SQL Execution for Explorer
// Wave 11 (CPI) - Security Hardening: esta rota alimenta o SQL Explorer
// (DatabaseExplorerTab.tsx) e roda direto contra o Postgres de produção.
// checkExplorerSqlSafety bloqueia qualquer coisa que não seja leitura -
// recusa DROP/TRUNCATE/ALTER/DELETE/GRANT/REVOKE/INSERT/UPDATE/CREATE (mesmo
// dentro de um WITH) com HTTP 403 explícito, antes de o SQL sequer chegar em
// executeQuery. Auth & RBAC (CPI follow-up): além disso, a rota agora exige
// sessão válida com role === 'admin' — mesmo um SELECT de leitura pura contra
// o Postgres de produção não deve ficar acessível a qualquer um com a URL.
apiRouter.post('/db/query', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { sql } = req.body;
    if (!sql || typeof sql !== 'string') {
      return res.status(400).json({ error: 'SQL query é obrigatória.' });
    }
    const safety = checkExplorerSqlSafety(sql);
    if (!safety.allowed) {
      return res.status(403).json({ error: safety.reason });
    }
    const result = await executeQuery(sql);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Authentication & Users
apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password, company } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }
    // E-mail é comparado sem distinguir maiúsculas/minúsculas nem espaços nas pontas —
    // digitado no celular ou preenchido automaticamente, é comum vir com casing diferente
    // do que foi cadastrado manualmente no banco (ex.: "Nome@AtlasGR.com.br" vs "nome@atlasgr.com.br").
    const normalizedEmail = String(email).trim().toLowerCase();
    const db = await getDatabase();
    const result = await db.exec(`SELECT id, email, name, role, company, password FROM users WHERE LOWER(TRIM(email)) = ?`, [normalizedEmail]);
    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const row = result[0].values[0];
    // .trim() protege contra espaços residuais de cadastro manual/migração de banco,
    // que fariam até uma senha em texto puro correta nunca bater com '==='.
    const storedPassword = String(row[5] || '').trim();
    const isHashed = storedPassword.startsWith(SCRYPT_PREFIX);
    const passwordMatches = isHashed ? verifyHashedPassword(password, storedPassword) : storedPassword === password;

    if (!passwordMatches) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const user = {
      id: row[0],
      email: row[1],
      name: row[2],
      role: row[3],
      company: normalizeCompany(row[4]) ?? row[4]
    };

    // Conta antiga com senha em texto puro: migra para hash agora que a senha foi confirmada,
    // sem exigir nenhuma ação manual do usuário.
    if (!isHashed) {
      try {
        await db.run(`UPDATE users SET password = ? WHERE id = ?`, [hashPassword(password), user.id]);
      } catch (err) {
        console.error('Falha ao migrar senha para hash:', err);
      }
    }

    // Contas 'user' são exclusivas da própria marca: uma conta AtlasGR não pode entrar
    // selecionando TotalTrac, e vice-versa. Admins gerenciam as duas marcas, então ficam de fora dessa checagem.
    // A comparação é feita nos valores normalizados (não no texto cru do banco) porque o
    // cadastro é manual via SQL Explorer e varia em maiúsculas/espaços/apelidos da marca;
    // se não der para reconhecer a empresa cadastrada, não bloqueia por dado malformado.
    if (user.role !== 'admin' && company) {
      const requestedCompany = normalizeCompany(company);
      const userCompany = normalizeCompany(row[4]);
      if (requestedCompany && userCompany && requestedCompany !== userCompany) {
        return res.status(403).json({ error: 'Esta conta pertence a outra empresa. Selecione a marca correta para entrar.' });
      }
    }

    // Auth & RBAC (CPI follow-up): emite o cookie de sessão assinado (httpOnly +
    // SameSite=Strict + Secure em produção) só depois de senha conferida e da
    // checagem de marca acima — nunca contém a senha nem o hash, só
    // id/role/company (ver server/auth.ts). O corpo da resposta continua
    // devolvendo `user` no mesmo formato de antes, para não quebrar o front.
    const token = createSessionToken({ id: String(user.id), role: String(user.role), company: (user.company as string) ?? null });
    res.setHeader('Set-Cookie', buildSessionCookie(token));
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Auth & RBAC (CPI follow-up): limpa o cookie de sessão. Idempotente e sem
// exigir sessão válida — chamar /auth/logout sem estar logado (cookie já
// ausente/expirado) não é um erro, só um no-op seguro.
apiRouter.post('/auth/logout', async (req: Request, res: Response) => {
  res.setHeader('Set-Cookie', buildLogoutCookie());
  res.json({ success: true });
});

// Auth & RBAC (CPI follow-up): permite ao front confirmar se a sessão do
// cookie ainda é válida (ex: ao recarregar a página) sem repetir login nem
// tocar no banco — só reflete o que o middleware attachUser já decodificou.
apiRouter.get('/auth/me', async (req: Request, res: Response) => {
  res.json({ user: req.user ?? null });
});

apiRouter.get('/users', requireAuth, async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const result = await db.exec(`SELECT id, email, name, role FROM users`);
    if (result.length === 0) return res.json([]);
    const users = result[0].values.map(row => ({
      id: row[0],
      email: row[1],
      name: row[2],
      role: row[3]
    }));
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Campaigns API
// Paginado (limit/offset opcionais) para não carregar a tabela inteira conforme a
// base cresce; sem os parâmetros, mantém um teto razoável em vez de "tudo".
apiRouter.get('/campaigns', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const limit = Math.min(Math.max(1, Number(req.query.limit) || 50), 200);
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const result = await db.exec(`
      SELECT c.*,
        (SELECT COUNT(*) FROM leads l WHERE l.campaign_id = c.id) as leads_count,
        (SELECT COUNT(*) FROM messages m WHERE m.campaign_id = c.id) as messages_count
      FROM campaigns c
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    if (result.length === 0) {
      return res.json([]);
    }

    const cols = result[0].columns;
    const campaigns = result[0].values.map(row => {
      const obj: any = {};
      cols.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return obj;
    });

    res.json(campaigns);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get Leads assigned to a specific user (limit/offset opcionais; teto alto por
// padrão porque a tela do vendedor precisa da carteira inteira dele para o Kanban)
apiRouter.get('/users/:userId/leads', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const db = await getDatabase();
    const limit = Math.min(Math.max(1, Number(req.query.limit) || 500), 2000);
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const leadsRes = await db.exec(`SELECT * FROM leads WHERE assigned_to = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`, [userId, limit, offset]);
    const leads: any[] = [];
    if (leadsRes.length > 0) {
      const lCols = leadsRes[0].columns;
      for (const row of leadsRes[0].values) {
        const leadObj: any = {};
        lCols.forEach((col, idx) => {
          leadObj[col] = row[idx];
        });

        const msgRes = await db.exec(`SELECT * FROM messages WHERE lead_id = ? ORDER BY created_at ASC`, [leadObj.id]);
        const messages: any[] = [];
        if (msgRes.length > 0) {
          const mCols = msgRes[0].columns;
          msgRes[0].values.forEach(mRow => {
            const msgObj: any = {};
            mCols.forEach((col, idx) => {
              msgObj[col] = mRow[idx];
            });
            messages.push(msgObj);
          });
        }

        leads.push(formatLeadRow(leadObj, messages));
      }
    }
    res.json(leads);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Distribuição: leads atribuídos, agrupados por vendedor (para o painel do admin)
// Distribuição agrupada por marca: Kauê e Jonathan (company='totaltrac') só aparecem
// no grupo Total Trac, João (company='atlas') só no grupo Atlas — a separação vem do
// cadastro do vendedor, não de nome hardcoded em lugar nenhum do código.
apiRouter.get('/leads/distribution', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();

    // 'gestor' não é vendedor (não entra no rodízio de leads em /api/prospect) — só
    // role='user' representa um vendedor de verdade nessa visão de distribuição.
    const usersRes = await db.exec(`SELECT id, email, name, role, company FROM users WHERE role = 'user' ORDER BY name ASC`);
    const sellers: any[] = (usersRes[0]?.values || []).map(row => ({
      id: row[0], email: row[1], name: row[2], role: row[3], company: row[4] || 'totaltrac'
    }));

    const groups: Record<'atlas' | 'totaltrac', { sellers: any[]; totalLeads: number }> = {
      atlas: { sellers: [], totalLeads: 0 },
      totaltrac: { sellers: [], totalLeads: 0 }
    };

    // Lista limitada a 200 por vendedor (renderização), mas totalLeads vem de um
    // COUNT(*) à parte — nunca subestimar o total mostrado ao gestor por causa do limite.
    for (const seller of sellers) {
      const countRes = await db.exec(`SELECT COUNT(*) FROM leads WHERE assigned_to = ?`, [seller.id]);
      const totalLeadsForSeller = Number(countRes[0]?.values[0]?.[0]) || 0;

      const leadsRes = await db.exec(
        `SELECT id, name, segment, company_type, stage, domain, created_at FROM leads WHERE assigned_to = ? ORDER BY created_at DESC LIMIT 200`,
        [seller.id]
      );
      const leads: any[] = [];
      if (leadsRes.length > 0) {
        const cols = leadsRes[0].columns;
        leadsRes[0].values.forEach(row => {
          const obj: any = {};
          cols.forEach((col, idx) => { obj[col] = row[idx]; });
          obj.stage = obj.stage || 'prospecto';
          leads.push(obj);
        });
      }
      const groupKey: 'atlas' | 'totaltrac' = seller.company === 'atlas' ? 'atlas' : 'totaltrac';
      groups[groupKey].sellers.push({ user: seller, leads, totalLeads: totalLeadsForSeller });
      groups[groupKey].totalLeads += totalLeadsForSeller;
    }

    res.json(groups);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/campaigns/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getDatabase();
    
    const campRes = await db.exec(`SELECT * FROM campaigns WHERE id = ?`, [id]);
    if (campRes.length === 0 || campRes[0].values.length === 0) {
      return res.status(404).json({ error: 'Campanha não encontrada.' });
    }

    const campCols = campRes[0].columns;
    const campObj: any = {};
    campCols.forEach((col, idx) => {
      campObj[col] = campRes[0].values[0][idx];
    });

    // Get leads
    const leadsRes = await db.exec(`SELECT * FROM leads WHERE campaign_id = ? ORDER BY created_at ASC`, [id]);
    const leads: any[] = [];
    if (leadsRes.length > 0) {
      const lCols = leadsRes[0].columns;
      for (const row of leadsRes[0].values) {
        const leadObj: any = {};
        lCols.forEach((col, idx) => {
          leadObj[col] = row[idx];
        });

        // Get messages for this lead
        const msgRes = await db.exec(`SELECT * FROM messages WHERE lead_id = ? ORDER BY created_at ASC`, [leadObj.id]);
        const messages: any[] = [];
        if (msgRes.length > 0) {
          const mCols = msgRes[0].columns;
          msgRes[0].values.forEach(mRow => {
            const msgObj: any = {};
            mCols.forEach((col, idx) => {
              msgObj[col] = mRow[idx];
            });
            messages.push(msgObj);
          });
        }

        leads.push(formatLeadRow(leadObj, messages));
      }
    }

    campObj.leads = leads;
    res.json(campObj);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update Lead Stage directly
apiRouter.put('/leads/:id/stage', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { stage, userId, lossReason, winReason } = req.body;
    if (!stage) {
      return res.status(400).json({ error: 'Stage é obrigatório' });
    }
    const db = await getDatabase();
    const beforeRes = await db.exec(`SELECT stage FROM leads WHERE id = ?`, [id]);
    const previousStage = beforeRes[0]?.values[0]?.[0] ?? null;

    // loss_reason/win_reason só são tocados quando informados — uma chamada
    // que muda só o estágio (sem motivo) não deve apagar um motivo já
    // registrado. win_reason (Wave 13/CPI) é a contraparte simétrica de
    // loss_reason para quando o lead vai para "ganho".
    if (lossReason !== undefined && winReason !== undefined) {
      await db.run(`UPDATE leads SET stage = ?, loss_reason = ?, win_reason = ? WHERE id = ?`, [stage, lossReason, winReason, id]);
    } else if (lossReason !== undefined) {
      await db.run(`UPDATE leads SET stage = ?, loss_reason = ? WHERE id = ?`, [stage, lossReason, id]);
    } else if (winReason !== undefined) {
      await db.run(`UPDATE leads SET stage = ?, win_reason = ? WHERE id = ?`, [stage, winReason, id]);
    } else {
      await db.run(`UPDATE leads SET stage = ? WHERE id = ?`, [stage, id]);
    }
    if (previousStage !== stage) {
      const reasonNote = lossReason ? ` (motivo: ${lossReason})` : winReason ? ` (motivo: ${winReason})` : '';
      await logActivity(db, {
        leadId: id,
        userId,
        action: 'stage_changed',
        fromValue: previousStage,
        toValue: `${stage}${reasonNote}`
      });
    }
    saveDatabase();
    res.json({ success: true, stage, leadId: id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update Lead Tags directly
apiRouter.put('/leads/:id/tags', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tags, userId } = req.body;
    if (!Array.isArray(tags)) {
      return res.status(400).json({ error: 'Tags deve ser um array de strings' });
    }
    const db = await getDatabase();
    const beforeRes = await db.exec(`SELECT tags FROM leads WHERE id = ?`, [id]);
    const previousTags = beforeRes[0]?.values[0]?.[0] ?? null;
    const tagsJson = JSON.stringify(tags);

    await db.run(`UPDATE leads SET tags = ? WHERE id = ?`, [tagsJson, id]);
    if (previousTags !== tagsJson) {
      await logActivity(db, { leadId: id, userId, action: 'tags_changed', fromValue: previousTags, toValue: tagsJson });
    }
    saveDatabase();
    res.json({ success: true, tags, leadId: id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update Lead General Info
apiRouter.put('/leads/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      stage,
      tags,
      decision_maker_name,
      decision_maker_title,
      decision_maker_email,
      decision_maker_linkedin,
      cnpj,
      phone,
      corporate_email,
      website,
      address,
      userId
    } = req.body;

    const db = await getDatabase();

    const currentRes = await db.exec(`SELECT cnpj, phone, corporate_email, decision_maker_email FROM leads WHERE id = ?`, [id]);
    const currentRow = currentRes[0]?.values[0] || [];
    const validationErrors = validateChangedLeadFields(
      { cnpj, phone, corporate_email, decision_maker_email },
      { cnpj: currentRow[0], phone: currentRow[1], corporate_email: currentRow[2], decision_maker_email: currentRow[3] }
    );
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors.join(' ') });
    }

    if (stage !== undefined) {
      const beforeRes = await db.exec(`SELECT stage FROM leads WHERE id = ?`, [id]);
      const previousStage = beforeRes[0]?.values[0]?.[0] ?? null;
      await db.run(`UPDATE leads SET stage = ? WHERE id = ?`, [stage, id]);
      if (previousStage !== stage) {
        await logActivity(db, { leadId: id, userId, action: 'stage_changed', fromValue: previousStage, toValue: stage });
      }
    }
    if (tags !== undefined) {
      await db.run(`UPDATE leads SET tags = ? WHERE id = ?`, [JSON.stringify(tags), id]);
    }
    if (decision_maker_name !== undefined) {
      await db.run(`UPDATE leads SET decision_maker_name = ? WHERE id = ?`, [decision_maker_name, id]);
    }
    if (decision_maker_title !== undefined) {
      await db.run(`UPDATE leads SET decision_maker_title = ? WHERE id = ?`, [decision_maker_title, id]);
    }
    if (decision_maker_email !== undefined) {
      await db.run(`UPDATE leads SET decision_maker_email = ? WHERE id = ?`, [decision_maker_email, id]);
    }
    if (decision_maker_linkedin !== undefined) {
      await db.run(`UPDATE leads SET decision_maker_linkedin = ? WHERE id = ?`, [decision_maker_linkedin, id]);
    }
    if (cnpj !== undefined) {
      await db.run(`UPDATE leads SET cnpj = ? WHERE id = ?`, [cnpj, id]);
    }
    if (phone !== undefined) {
      await db.run(`UPDATE leads SET phone = ? WHERE id = ?`, [phone, id]);
    }
    if (corporate_email !== undefined) {
      await db.run(`UPDATE leads SET corporate_email = ? WHERE id = ?`, [corporate_email, id]);
    }
    if (website !== undefined) {
      await db.run(`UPDATE leads SET website = ? WHERE id = ?`, [website, id]);
    }
    if (address !== undefined) {
      await db.run(`UPDATE leads SET address = ? WHERE id = ?`, [address, id]);
    }
    saveDatabase();
    res.json({ success: true, leadId: id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Save Lead Comprehensive Edits directly
apiRouter.post('/leads/:id/save', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const leadData = req.body;

    const db = await getDatabase();

    const currentRes = await db.exec(`SELECT cnpj, phone, corporate_email, decision_maker_email FROM leads WHERE id = ?`, [id]);
    const currentRow = currentRes[0]?.values[0] || [];
    const validationErrors = validateChangedLeadFields(
      { cnpj: leadData.cnpj, phone: leadData.phone, corporate_email: leadData.corporate_email, decision_maker_email: leadData.decision_maker_email },
      { cnpj: currentRow[0], phone: currentRow[1], corporate_email: currentRow[2], decision_maker_email: currentRow[3] }
    );
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors.join(' ') });
    }

    const userId = leadData.userId;

    if (leadData.stage) {
      const beforeRes = await db.exec(`SELECT stage FROM leads WHERE id = ?`, [id]);
      const previousStage = beforeRes[0]?.values[0]?.[0] ?? null;
      // win_reason (Wave 13/CPI) é a contraparte simétrica de loss_reason.
      if (leadData.lossReason !== undefined && leadData.winReason !== undefined) {
        await db.run(`UPDATE leads SET stage = ?, loss_reason = ?, win_reason = ? WHERE id = ?`, [leadData.stage, leadData.lossReason, leadData.winReason, id]);
      } else if (leadData.lossReason !== undefined) {
        await db.run(`UPDATE leads SET stage = ?, loss_reason = ? WHERE id = ?`, [leadData.stage, leadData.lossReason, id]);
      } else if (leadData.winReason !== undefined) {
        await db.run(`UPDATE leads SET stage = ?, win_reason = ? WHERE id = ?`, [leadData.stage, leadData.winReason, id]);
      } else {
        await db.run(`UPDATE leads SET stage = ? WHERE id = ?`, [leadData.stage, id]);
      }
      if (previousStage !== leadData.stage) {
        const reasonNote = leadData.lossReason ? ` (motivo: ${leadData.lossReason})` : leadData.winReason ? ` (motivo: ${leadData.winReason})` : '';
        await logActivity(db, {
          leadId: id,
          userId,
          action: 'stage_changed',
          fromValue: previousStage,
          toValue: `${leadData.stage}${reasonNote}`
        });
      }
    }
    if (leadData.tags) {
      await db.run(`UPDATE leads SET tags = ? WHERE id = ?`, [JSON.stringify(leadData.tags), id]);
    }
    if (leadData.cnpj) {
      await db.run(`UPDATE leads SET cnpj = ? WHERE id = ?`, [leadData.cnpj, id]);
    }
    if (leadData.phone) {
      await db.run(`UPDATE leads SET phone = ? WHERE id = ?`, [leadData.phone, id]);
    }
    if (leadData.corporate_email) {
      await db.run(`UPDATE leads SET corporate_email = ? WHERE id = ?`, [leadData.corporate_email, id]);
    }
    if (leadData.website) {
      await db.run(`UPDATE leads SET website = ? WHERE id = ?`, [leadData.website, id]);
    }
    if (leadData.address) {
      await db.run(`UPDATE leads SET address = ? WHERE id = ?`, [leadData.address, id]);
    }
    if (leadData.decision_maker_name) {
      await db.run(`UPDATE leads SET decision_maker_name = ? WHERE id = ?`, [leadData.decision_maker_name, id]);
    }
    if (leadData.decision_maker_title) {
      await db.run(`UPDATE leads SET decision_maker_title = ? WHERE id = ?`, [leadData.decision_maker_title, id]);
    }
    if (leadData.decision_maker_email) {
      await db.run(`UPDATE leads SET decision_maker_email = ? WHERE id = ?`, [leadData.decision_maker_email, id]);
    }
    if (leadData.decision_maker_linkedin) {
      await db.run(`UPDATE leads SET decision_maker_linkedin = ? WHERE id = ?`, [leadData.decision_maker_linkedin, id]);
    }
    if (leadData.company_linkedin !== undefined) {
      await db.run(`UPDATE leads SET company_linkedin = ? WHERE id = ?`, [leadData.company_linkedin, id]);
    }
    if (leadData.assigned_to !== undefined) {
      const beforeRes = await db.exec(`SELECT assigned_to FROM leads WHERE id = ?`, [id]);
      const previousAssignee = beforeRes[0]?.values[0]?.[0] ?? null;
      await db.run(`UPDATE leads SET assigned_to = ? WHERE id = ?`, [leadData.assigned_to, id]);
      if (previousAssignee !== leadData.assigned_to) {
        await logActivity(db, { leadId: id, userId, action: 'reassigned', fromValue: previousAssignee, toValue: leadData.assigned_to });
      }
    }
    if (leadData.activity_notes !== undefined) {
      await db.run(`UPDATE leads SET activity_notes = ? WHERE id = ?`, [leadData.activity_notes, id]);
    }
    if (leadData.activity_context !== undefined) {
      await db.run(`UPDATE leads SET activity_context = ? WHERE id = ?`, [leadData.activity_context, id]);
    }
    
    // Save updated copies if sent
    if (leadData.copies) {
      const channels = ['cold_call', 'cold_email', 'whatsapp', 'linkedin', 'objection_matrix', 'qualification_matrix', 'ice_breaker'] as const;
      for (const ch of channels) {
        if (leadData.copies[ch]) {
          const msgId = `msg-${id}-${ch}`;
          try {
            await db.run(`UPDATE messages SET content = ? WHERE id = ?`, [leadData.copies[ch], msgId]);
          } catch(e) {}
        }
      }
    }
    
    saveDatabase();
    res.json({ success: true, message: 'Dados do lead salvos com sucesso!' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Second Stage: News & Public Sources Enrichment with Script Generation
apiRouter.post('/leads/:id/enrich-news', heavyAiLimiter, requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { pitch, aiConfig, tone, force } = req.body;
    const db = await getDatabase();

    const leadRes = await db.exec(`SELECT * FROM leads WHERE id = ?`, [id]);
    if (leadRes.length === 0 || leadRes[0].values.length === 0) {
      return res.status(404).json({ error: 'Lead não encontrado.' });
    }

    const cols = leadRes[0].columns;
    const rawLead: any = {};
    cols.forEach((col, idx) => {
      rawLead[col] = leadRes[0].values[0][idx];
    });

    let dmEmails: string[] = [];
    try {
      if (rawLead.decision_maker_emails) {
        dmEmails = JSON.parse(rawLead.decision_maker_emails);
      }
    } catch(e) {
      dmEmails = [rawLead.decision_maker_email];
    }
    if (dmEmails.length === 0 && rawLead.decision_maker_email) {
      dmEmails = [rawLead.decision_maker_email];
    }

    let dmPhones: string[] = [];
    try {
      if (rawLead.decision_maker_phones) {
        dmPhones = JSON.parse(rawLead.decision_maker_phones);
      }
    } catch(e) {
      dmPhones = [rawLead.decision_maker_phone || rawLead.phone].filter(Boolean);
    }
    if (dmPhones.length === 0 && (rawLead.decision_maker_phone || rawLead.phone)) {
      dmPhones = [rawLead.decision_maker_phone || rawLead.phone];
    }

    const lead: Lead = {
      ...rawLead,
      decision_makers: rawLead.decision_maker_name ? [{
        name: rawLead.decision_maker_name,
        title: rawLead.decision_maker_title || '',
        email: rawLead.decision_maker_email || dmEmails[0] || '',
        emails: dmEmails,
        phone: rawLead.decision_maker_phone || dmPhones[0] || '',
        phones: dmPhones,
        linkedin: rawLead.decision_maker_linkedin || ''
      }] : []
    };
    
    const defaultPitch = pitch || 'A Atlas conecta pessoas e tecnologia gerando valores com segurança e inteligência logística.';
    // IA & Guardrails (CPI follow-up): evidência já confirmada deste lead
    // (Wave 6) alimenta o LeadEvidenceContext do prompt - ver server/ai.ts.
    const storedEvidence = await getFieldEvidence(db, 'lead', id);
    const enrichedData = await enrichLeadWithPublicNewsAndScripts(
      lead,
      defaultPitch,
      aiConfig || { provider: 'ollama', ollamaUrl: 'http://localhost:11434', ollamaModel: 'llama3' },
      tone,
      storedEvidence
    );
    
    const newsDossierJson = JSON.stringify(enrichedData.news_dossier);
    await db.run(`UPDATE leads SET news_dossier = ?, is_enriched = 1 WHERE id = ?`, [newsDossierJson, id]);

    // Grava cada roteiro com versionamento: se já existir um marcado 'sent', não é
    // sobrescrito sem force=true — e a versão anterior nunca é perdida.
    const channels = ['cold_call', 'cold_email', 'whatsapp', 'linkedin', 'objection_matrix', 'qualification_matrix', 'ice_breaker'] as const;
    const finalCopies: Record<string, string> = {};
    let anySkipped = false;
    for (const ch of channels) {
      const msgId = `msg-${id}-${ch}`;
      const { content, skipped } = await upsertMessageWithVersioning(db, {
        msgId,
        campaignId: rawLead.campaign_id || 'camp-default',
        leadId: id,
        channel: ch,
        content: enrichedData.copies[ch] || '',
        engineUsed: enrichedData.engineUsed,
        force: Boolean(force)
      });
      finalCopies[ch] = content;
      if (skipped) anySkipped = true;
    }

    saveDatabase();

    res.json({
      success: true,
      leadId: id,
      news_dossier: enrichedData.news_dossier,
      copies: finalCopies,
      engineUsed: enrichedData.engineUsed,
      personalization_level: enrichedData.personalization_level,
      skippedSentMessages: anySkipped,
      message: anySkipped
        ? `Lead "${lead.name}" enriquecido — algum roteiro já marcado como "enviado" foi preservado (use force para sobrescrever).`
        : `Lead "${lead.name}" enriquecido com sucesso com notícias públicas e novos roteiros!`
    });
  } catch (err: any) {
    console.error('Erro no enriquecimento de notícias:', err);
    res.status(500).json({ error: err.message || 'Falha ao enriquecer lead com notícias.' });
  }
});

// Dedicated On-Demand AI Copy Generation (Runs only when user requests)
apiRouter.post('/leads/:id/generate-copies', heavyAiLimiter, requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { pitch, aiConfig, tone, force } = req.body;
    const db = await getDatabase();

    const leadRes = await db.exec(`SELECT * FROM leads WHERE id = ?`, [id]);
    if (leadRes.length === 0 || leadRes[0].values.length === 0) {
      return res.status(404).json({ error: 'Lead não encontrado.' });
    }

    const cols = leadRes[0].columns;
    const rawLead: any = {};
    cols.forEach((col, idx) => {
      rawLead[col] = leadRes[0].values[0][idx];
    });

    let dmEmails: string[] = [];
    try {
      if (rawLead.decision_maker_emails) {
        dmEmails = JSON.parse(rawLead.decision_maker_emails);
      }
    } catch(e) {
      dmEmails = [rawLead.decision_maker_email];
    }

    let dmPhones: string[] = [];
    try {
      if (rawLead.decision_maker_phones) {
        dmPhones = JSON.parse(rawLead.decision_maker_phones);
      }
    } catch(e) {
      dmPhones = [rawLead.decision_maker_phone || rawLead.phone].filter(Boolean);
    }

    // Sem decisor real cadastrado, o campo fica vazio - nunca preenchemos com um
    // nome/cargo de decisor inventado só para ter algo para a IA escrever.
    const mainDm: DecisionMaker = {
      name: rawLead.decision_maker_name || '',
      title: rawLead.decision_maker_title || '',
      email: rawLead.decision_maker_email || dmEmails[0] || '',
      emails: dmEmails,
      phone: rawLead.decision_maker_phone || dmPhones[0] || rawLead.phone || '',
      phones: dmPhones,
      linkedin: rawLead.decision_maker_linkedin || ''
    };

    const lead: Lead = {
      ...rawLead,
      decision_makers: [mainDm]
    };

    const defaultPitch = pitch || 'A Atlas conecta pessoas e tecnologia gerando valores com segurança e inteligência logística.';
    // IA & Guardrails (CPI follow-up): evidência já confirmada deste lead
    // (Wave 6) alimenta o LeadEvidenceContext do prompt - ver server/ai.ts.
    const storedEvidence = await getFieldEvidence(db, 'lead', id);
    const { copies, engineUsed, personalization_level } = await generateCopiesWithEngine(
      lead,
      defaultPitch,
      aiConfig || { provider: 'ollama', ollamaUrl: 'http://localhost:11434', ollamaModel: 'llama3' },
      mainDm,
      storedEvidence
    );

    // Grava cada roteiro com versionamento (mesma regra do enrich-news: roteiro
    // marcado 'sent' só é sobrescrito com force=true).
    const channels = ['cold_call', 'cold_email', 'whatsapp', 'linkedin', 'objection_matrix', 'qualification_matrix', 'ice_breaker'] as const;
    const finalCopies: Record<string, string> = {};
    let anySkipped = false;
    for (const ch of channels) {
      const msgId = `msg-${id}-${ch}`;
      const result = await upsertMessageWithVersioning(db, {
        msgId,
        campaignId: rawLead.campaign_id || 'camp-default',
        leadId: id,
        channel: ch,
        content: copies[ch] || '',
        engineUsed,
        force: Boolean(force)
      });
      finalCopies[ch] = result.content;
      if (result.skipped) anySkipped = true;
    }

    saveDatabase();

    res.json({
      success: true,
      leadId: id,
      copies: finalCopies,
      engineUsed,
      personalization_level,
      skippedSentMessages: anySkipped,
      message: anySkipped
        ? `Roteiros gerados — algum já marcado como "enviado" foi preservado (use force para sobrescrever).`
        : `Roteiros comerciais gerados com sucesso para ${rawLead.name}!`
    });
  } catch (err: any) {
    console.error('Erro na geração de copys sob demanda:', err);
    res.status(500).json({ error: err.message || 'Falha ao gerar roteiros comerciais.' });
  }
});

// Aprendizado contínuo: o vendedor marca se usou o roteiro como veio, editou antes
// de usar, ou nem usou. Isso não re-treina nada sozinho, mas é o dado que falta
// para, no futuro, saber quais prompts/motores realmente convertem.
const VALID_COPY_FEEDBACK = ['used_as_is', 'edited', 'not_used'] as const;
apiRouter.post('/leads/:id/copies/:channel/feedback', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id, channel } = req.params;
    const { feedback } = req.body;
    if (!VALID_COPY_FEEDBACK.includes(feedback)) {
      return res.status(400).json({ error: `feedback deve ser um de: ${VALID_COPY_FEEDBACK.join(', ')}` });
    }
    const db = await getDatabase();
    const msgId = `msg-${id}-${channel}`;
    await db.run(`UPDATE messages SET feedback = ? WHERE id = ?`, [feedback, msgId]);
    saveDatabase();
    res.json({ success: true, leadId: id, channel, feedback });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Falha ao registrar feedback do roteiro.' });
  }
});

// --- Tarefas por lead --------------------------------------------------------
// Compromisso que o próprio vendedor cria (data + descrição livre), diferente de
// next_action (recomendação automática recalculada a cada leitura, nunca persistida).
const VALID_TASK_STATUS = ['pending', 'done', 'cancelled'] as const;

function mapRows(result: { columns: string[]; values: any[][] }[]): any[] {
  if (result.length === 0) return [];
  const cols = result[0].columns;
  return result[0].values.map(row => {
    const obj: any = {};
    cols.forEach((col, idx) => { obj[col] = row[idx]; });
    return obj;
  });
}

// Criar tarefa para um lead
apiRouter.post('/leads/:id/tasks', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { description, dueDate, userId } = req.body;
    if (typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ error: 'Descrição da tarefa é obrigatória.' });
    }
    if (!isWithinMaxLength(description, 500)) {
      return res.status(400).json({ error: 'Descrição da tarefa é longa demais (máx. 500 caracteres).' });
    }
    const db = await getDatabase();
    const leadRes = await db.exec(`SELECT id FROM leads WHERE id = ?`, [id]);
    if (leadRes.length === 0 || leadRes[0].values.length === 0) {
      return res.status(404).json({ error: 'Lead não encontrado.' });
    }
    const insertRes = await db.exec(
      `INSERT INTO tasks (lead_id, user_id, description, due_date, status) VALUES (?, ?, ?, ?, 'pending') RETURNING *`,
      [id, userId || null, description.trim(), dueDate || null]
    );
    const task = mapRows(insertRes)[0];
    await logActivity(db, { leadId: id, userId, action: 'task_created', toValue: description.trim() });
    saveDatabase();
    res.status(201).json(task);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Falha ao criar tarefa.' });
  }
});

// Listar tarefas de um lead (mais recentes / pendentes primeiro)
apiRouter.get('/leads/:id/tasks', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getDatabase();
    const result = await db.exec(
      `SELECT * FROM tasks WHERE lead_id = ?
       ORDER BY (status = 'pending') DESC, due_date ASC NULLS LAST, created_at DESC`,
      [id]
    );
    res.json(mapRows(result));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Atualizar tarefa (status, descrição ou data) — nunca DELETE: histórico de tarefas
// fica preservado mesmo quando canceladas, mesma filosofia usada para os leads.
apiRouter.put('/tasks/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, description, dueDate, userId } = req.body;

    const sets: string[] = [];
    const params: any[] = [];

    if (status !== undefined) {
      if (!VALID_TASK_STATUS.includes(status)) {
        return res.status(400).json({ error: `status deve ser um de: ${VALID_TASK_STATUS.join(', ')}` });
      }
      sets.push('status = ?');
      params.push(status);
      sets.push('completed_at = ?');
      params.push(status === 'done' ? new Date().toISOString() : null);
    }
    if (description !== undefined) {
      if (typeof description !== 'string' || !description.trim()) {
        return res.status(400).json({ error: 'Descrição da tarefa não pode ficar vazia.' });
      }
      if (!isWithinMaxLength(description, 500)) {
        return res.status(400).json({ error: 'Descrição da tarefa é longa demais (máx. 500 caracteres).' });
      }
      sets.push('description = ?');
      params.push(description.trim());
    }
    if (dueDate !== undefined) {
      sets.push('due_date = ?');
      params.push(dueDate || null);
    }
    if (sets.length === 0) {
      return res.status(400).json({ error: 'Nada para atualizar.' });
    }

    const db = await getDatabase();
    const beforeRes = await db.exec(`SELECT lead_id, status FROM tasks WHERE id = ?`, [id]);
    if (beforeRes.length === 0 || beforeRes[0].values.length === 0) {
      return res.status(404).json({ error: 'Tarefa não encontrada.' });
    }
    const [leadId, previousStatus] = beforeRes[0].values[0];

    params.push(id);
    await db.run(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`, params);
    if (status !== undefined && status !== previousStatus) {
      await logActivity(db, { leadId, userId, action: 'task_status_changed', fromValue: previousStatus, toValue: status });
    }
    saveDatabase();

    const afterRes = await db.exec(`SELECT * FROM tasks WHERE id = ?`, [id]);
    res.json(mapRows(afterRes)[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Falha ao atualizar tarefa.' });
  }
});

// Painel do vendedor: todas as suas tarefas, de todos os leads, consolidadas
// (para a tela de acompanhamento — atrasadas, de hoje, próximas, concluídas).
apiRouter.get('/users/:userId/tasks', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const db = await getDatabase();
    const result = await db.exec(
      `SELECT t.*, l.name AS lead_name, l.company AS lead_company
       FROM tasks t
       JOIN leads l ON l.id = t.lead_id
       WHERE t.user_id = ?
       ORDER BY (t.status = 'pending') DESC, t.due_date ASC NULLS LAST, t.created_at DESC`,
      [userId]
    );
    res.json(mapRows(result));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Painel gerencial: tarefas de TODOS os vendedores, agrupáveis por vendedor no
// front — restrito a admin/gestor (um vendedor comum só vê as próprias em /users/:userId/tasks).
apiRouter.get('/tasks', requireManager, async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const result = await db.exec(
      `SELECT t.*, l.name AS lead_name, l.company AS lead_company, u.name AS user_name
       FROM tasks t
       JOIN leads l ON l.id = t.lead_id
       LEFT JOIN users u ON u.id = t.user_id
       WHERE t.status != 'cancelled'
       ORDER BY (t.status = 'pending') DESC, t.due_date ASC NULLS LAST, t.created_at DESC`
    );
    res.json(mapRows(result));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Dedicated Public CNPJ Lookup (BrasilAPI / Minha Receita)
apiRouter.get('/cnpj/:cnpj', async (req: Request, res: Response) => {
  try {
    const { cnpj } = req.params;
    const data = await fetchCnpjPublicData(cnpj);
    if (!data) {
      return res.status(404).json({ error: 'CNPJ não localizado na base pública ou inválido.' });
    }
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Refresh / Update CNPJ for a Lead
apiRouter.post('/leads/:id/cnpj-refresh', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { cnpj } = req.body;
    const db = await getDatabase();
    
    const leadRes = await db.exec(`SELECT * FROM leads WHERE id = ?`, [id]);
    if (leadRes.length === 0 || leadRes[0].values.length === 0) {
      return res.status(404).json({ error: 'Lead não encontrado.' });
    }

    const cols = leadRes[0].columns;
    const currentLead: any = {};
    cols.forEach((col, idx) => {
      currentLead[col] = leadRes[0].values[0][idx];
    });

    const targetCnpj = cnpj || currentLead.cnpj;
    const cnpjData = await resolveAndEnrichCnpjForLead({
      name: currentLead.name,
      domain: currentLead.domain,
      cnpj: targetCnpj,
      address: currentLead.address
    });

    await db.run(`
      UPDATE leads 
      SET cnpj = ?, razao_social = ?, situacao_cadastral = ?, cnae_fiscal = ?, cnae_fiscal_descricao = ?, capital_social = ?, qsa = ?
      WHERE id = ?
    `, [
      cnpjData.cnpj,
      cnpjData.razao_social,
      cnpjData.situacao_cadastral,
      cnpjData.cnae_fiscal,
      cnpjData.cnae_fiscal_descricao,
      cnpjData.capital_social,
      JSON.stringify(cnpjData.qsa || []),
      id
    ]);

    saveDatabase();

    res.json({
      success: true,
      leadId: id,
      cnpjData,
      message: `CNPJ ${cnpjData.cnpj} atualizado com dados oficiais da Receita Federal!`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Wave 6 (CPI) - Evidence & Provenance: "por que este resultado apareceu?" -
// de onde cada campo do lead veio, quando foi obtido e com que confiança.
apiRouter.get('/leads/:id/evidence', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getDatabase();
    const evidence = await getFieldEvidence(db, 'lead', id);
    res.json({ leadId: id, evidence });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Wave 13 (CPI) - Feedback Loop: agregados honestos e determinísticos sobre
// feedback de roteiro (messages.feedback), motivo de perda/ganho
// (leads.loss_reason/win_reason) e taxa de conversão por segmento/marca.
// Nunca ajusta score/prompt sozinho - ver comentário de topo em
// server/feedbackLoop.ts para a decisão de design completa. Quando não há
// dado suficiente para uma seção, ela vem com `insufficientData: true` em
// vez de uma estatística inventada.
apiRouter.get('/feedback/summary', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();

    const messagesRes = await db.exec(`SELECT channel, feedback FROM messages`);
    const messages: FeedbackMessageRecord[] = messagesRes.length > 0
      ? messagesRes[0].values.map(row => ({ channel: row[0] as string | null, feedback: row[1] as string | null }))
      : [];

    const leadsRes = await db.exec(`SELECT stage, loss_reason, win_reason, segment, company FROM leads`);
    const leads: FeedbackLeadRecord[] = leadsRes.length > 0
      ? leadsRes[0].values.map(row => ({
          stage: row[0] as string | null,
          loss_reason: row[1] as string | null,
          win_reason: row[2] as string | null,
          segment: row[3] as string | null,
          company: row[4] as string | null
        }))
      : [];

    const summary = buildFeedbackSummary(messages, leads);
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Falha ao calcular resumo de feedback.' });
  }
});

// Wave 9 (CPI) - Cost/Cache/Resiliência: composição de cache+retry+circuit
// breaker (server/resilience.ts) para a consulta de CNPJ oficial. Diferente dos
// adapters da Wave 4 (Google Places/Apollo), resolveAndEnrichCnpjForLead (Wave 0)
// não expõe um status de provider explícito - BrasilAPI e Minha Receita já são
// tentadas em sequência internamente, e uma falha total de rede vs. um CNPJ
// genuinamente não localizado produzem o mesmo formato de retorno por design da
// Wave 0 (nenhum dos dois pode virar um cadastro fabricado). Por isso o sinal de
// retry aqui é aproximado: havia um CNPJ para consultar (cnpj_raw preenchido) mas
// nenhuma fonte pública confirmou o cadastro - como as duas fontes são gratuitas,
// o custo de tentar de novo é só latência.
function isCnpjLookupIncomplete(result: CnpjData): boolean {
  return Boolean(result.cnpj_raw) && !result.razao_social;
}

function buildCnpjCacheKey(lead: { name: string; domain?: string; cnpj?: string }): string {
  const cnpjDigits = (lead.cnpj || '').replace(/\D/g, '');
  if (cnpjDigits.length >= 14) return `cnpj:${cnpjDigits}`;
  if (lead.domain) return `cnpj:domain:${lead.domain.toLowerCase()}`;
  return `cnpj:name:${lead.name.toLowerCase()}`;
}

export async function resolveCnpjWithResilience(
  lead: { name: string; domain?: string; cnpj?: string; address?: string },
  cacheKey: string,
  // Wave 10 (CPI) - Observabilidade: só dispara em cache miss (a única situação em
  // que resolveAndEnrichCnpjForLead de fato roda e faz uma chamada real).
  onProviderCall?: (info: any) => void
): Promise<CnpjData> {
  return withCache<CnpjData>(
    cacheKey,
    result => (result.razao_social ? CACHE_TTL_MS.LONG_CADASTRAL : CACHE_TTL_MS.SHORT_SIGNAL),
    async () => {
      const { result } = await withCircuitBreaker<CnpjData>(
        'cnpj_receita_federal',
        () => withRetry(() => resolveAndEnrichCnpjForLead(lead, onProviderCall), isCnpjLookupIncomplete, { maxRetries: 2, baseDelayMs: 150, maxDelayMs: 1000 }),
        () => ({}), // circuito aberto: CNPJ fica desconhecido (nunca fabricado), sem tentar de novo
        isCnpjLookupIncomplete
      );
      return result;
    }
  );
}

function cleanDomainForCache(url?: string): string {
  if (!url) return '';
  return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase();
}

// 5. Prospecting Pipeline (1. Places/Directory -> 2. CNPJ API Oficial -> 3. Apollo Decisores -> Salva no SQLite)
apiRouter.post('/prospect', heavyAiLimiter, requireAuth, async (req: Request, res: Response) => {
  // Wave 10 (CPI) - Observabilidade: declarado fora do try para ficar acessível
  // também no catch (uma falha a meio da execução ainda precisa marcar o
  // SearchRun como "failed" sob o mesmo Search-ID, em vez de sumir sem rastro).
  let searchId: string = '';
  try {
    const { pitch, aiConfig, googleApiKey, apolloApiKey, hunterApiKey, company: bodyCompany, bitrixWebhook } = req.body;

    // Auth & RBAC (CPI follow-up) - escopo por marca: para uma sessão não-admin, a
    // marca vem SEMPRE da sessão (req.user.company), nunca do corpo da requisição -
    // sem isso, um vendedor autenticado da Total Trac poderia mandar company:'atlas'
    // no body e gerar/atribuir leads no pool errado. Admin continua podendo escolher
    // a marca livremente (mesmo padrão de "admin gerencia as duas marcas" já usado
    // no login, ver normalizeCompany acima). Sem sessão, requireAuth já bloqueou a
    // rota antes de chegar aqui.
    const company = (req.user && req.user.role !== 'admin' && req.user.company)
      ? req.user.company
      : bodyCompany;

    // Wave 9 (CPI) - Cost/Cache/Resiliência: orçamento por execução de busca.
    // Aceita um `budget` opcional no corpo da requisição (maxApiCalls/
    // maxPaidCredits/maxEnrichments, mesmos nomes do exemplo do pacote CPI);
    // campos ausentes/inválidos caem no default. Quando o orçamento de
    // enriquecimento acabar, o pipeline para de chamar a Apollo (paga) - os
    // leads restantes ficam sem decisor (decision_makers: [], estado válido
    // desde a Wave 0), nunca com um decisor inventado "para aproveitar" o lead.
    const budgetTracker = createBudgetTracker(parseSearchBudget(req.body.budget));

    // Wave 1 (CPI) - Search Intent: monta e valida a representação estruturada do
    // pedido ANTES de chamar qualquer provider. A UI envia os filtros individualmente
    // (segment, region, city, radiusKm, companyType, employeeCount, annualRevenue,
    // decisionMakerRole) em vez de compactar tudo numa única string de busca.
    const searchIntent = parseSearchIntent(req.body);

    // Wave 10 (CPI) - Observabilidade: Search-ID gerado no início da execução,
    // antes de qualquer chamada a provider - toda a busca (mesmo uma que falha
    // na validação) fica auditável sob este mesmo identificador. Ver
    // GET /api/search-runs/:searchId ("por que esta empresa apareceu?").
    const searchRun = startSearchRun({
      request: {
        query: req.body?.query,
        segment: searchIntent.segment,
        region: searchIntent.location.state,
        city: searchIntent.location.city,
        companyType: searchIntent.companyType,
        employeeCount: searchIntent.employeeCount,
        annualRevenue: searchIntent.annualRevenue,
        decisionMakerRole: searchIntent.decisionMakerRole,
        company: company === 'atlas' ? 'atlas' : 'totaltrac',
        limit: searchIntent.targetCount
      },
      searchIntent
    });
    searchId = searchRun.searchId;
    const finishIntentStep = recordStep(searchId, 'search_intent_validated');

    const validation = validateSearchIntent(searchIntent);
    if (!validation.valid) {
      finishIntentStep({ status: 'error', detail: validation.errors.join(' ') });
      finishSearchRun(searchId, 'failed', validation.errors.join(' '));
      return res.status(400).json({ error: validation.errors.join(' '), searchIntentErrors: validation.errors, searchId });
    }
    finishIntentStep({ status: 'ok' });

    const { segment, companyType, employeeCount, annualRevenue, decisionMakerRole, decisionMakerTitles } = searchIntent;
    const region = searchIntent.location.state;
    const city = searchIntent.location.city;

    // Marca (Atlas ou Total Trac) de quem está prospectando: decide para qual pool
    // de vendedores o lead cai e qual Bitrix ele é conferido/enviado — nunca mais
    // um vendedor fixo no código, e nunca mais leads da Atlas indo para o Total Trac.
    const effectiveCompany: 'atlas' | 'totaltrac' = company === 'atlas' ? 'atlas' : 'totaltrac';

    const effectiveGoogleKey = (googleApiKey || process.env.GOOGLE_PLACES_API_KEY || '').trim();
    const effectiveApolloKey = (apolloApiKey || process.env.APOLLO_API_KEY || '').trim();
    const effectiveHunterKey = (hunterApiKey || process.env.HUNTER_API_KEY || '').trim();

    const searchQuery = searchIntent.freeTextQuery;
    const effectiveLimit = searchIntent.targetCount;
    const campaignId = `camp-${Date.now()}`;
    const now = new Date().toISOString();
    const db = await getDatabase();

    // Wave 5 (CPI) - Entity Resolution & Dedup: empresas já prospectadas não devem
    // reaparecer em novas buscas. CNPJ (chave forte) tem prioridade sobre domínio
    // (chave forte canonicalizada), que tem prioridade sobre nome normalizado
    // (chave fraca) - nunca o contrário.
    const existingLeadsRes = await db.exec(`SELECT id, domain, name, cnpj FROM leads`);
    const existingCompanyKeys: Array<{ key: CompanyKey; entry: { id: string; domain: string; name: string } }> = [];
    const excludeDomains = new Set<string>();
    const excludeNames = new Set<string>();
    if (existingLeadsRes.length > 0 && existingLeadsRes[0].values) {
      for (const row of existingLeadsRes[0].values) {
        const id = row[0] as string;
        const domain = (row[1] as string) || '';
        const name = (row[2] as string) || '';
        const cnpj = (row[3] as string) || '';
        const key = buildCompanyKey({ cnpj, domain, name });
        existingCompanyKeys.push({ key, entry: { id, domain, name } });
        if (key.domain) excludeDomains.add(key.domain);
        if (key.normalizedName) excludeNames.add(key.normalizedName);
      }
    }

    // 1. Places: Search leads (Google Places API or Brazilian Logistics Directory)
    const finishDiscoveryStep = recordStep(searchId, 'discovery');
    const rawLeads = await findLeads({
      query: searchQuery,
      limit: effectiveLimit,
      googleApiKey: effectiveGoogleKey,
      excludeDomains,
      excludeNames,
      onProviderCall: (log) => recordProviderCall(searchId, log as any),
      onCandidateDiscarded: (log) => recordCandidateDecision(searchId, {
        name: log.name,
        domain: log.domain,
        decision: 'discarded',
        reasonCode: log.reasonCode,
        reason: log.reason
      })
    });
    finishDiscoveryStep({ status: 'ok', detail: `${rawLeads.length} candidato(s) novo(s) após pré-filtro de duplicidade.` });

    if (rawLeads.length === 0) {
      finishSearchRun(searchId, 'completed');
      if (!effectiveGoogleKey) {
        return res.status(503).json({
          error: 'Provedor de descoberta de empresas (Google Places) não está configurado. Configure a API key para buscar leads reais.',
          provider: 'google_places',
          providerConfigured: false,
          searchId
        });
      }
      return res.status(404).json({ error: 'Nenhum lead novo encontrado para os critérios informados (empresas já prospectadas foram excluídas). Tente outros filtros.', searchId });
    }

    // Insert Campaign record in SQLite
    const defaultPitch = pitch || 'A Atlas conecta pessoas e tecnologia gerando valores com segurança, inteligência logística e gestão de risco rodoviário.';
    const providerName = aiConfig?.provider || 'ollama';
    const modelName = providerName === 'ollama' ? (aiConfig?.ollamaModel || 'llama3') : (providerName === 'groq' ? (aiConfig?.groqModel || 'llama-3.3-70b-versatile') : 'gemini-3.7-flash');

    await db.run(`
      INSERT INTO campaigns (id, title, segment, pitch, provider, model, leads_count, company, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      campaignId,
      `Prospecção: ${searchQuery}`,
      segment || searchQuery,
      defaultPitch,
      providerName,
      modelName,
      rawLeads.length,
      effectiveCompany,
      now
    ]);


    const enrichedLeads: Lead[] = [];

    // Wave 2 (CPI) - Requirement Engine: classifica cada critério do SearchIntent
    // (HARD_FILTER/SOFT_FILTER/ENRICHMENT) uma única vez; cada lead é avaliado
    // abaixo contra o que foi de fato observado para ELE, nunca contra o pedido.
    const requirements = buildRequirementsFromSearchIntent(searchIntent);

    // Wave 3 (CPI) - Query Planner: decide qual provider (se algum) consegue
    // provar cada requisito, e marca explicitamente como "unsupported"/
    // "requires_enrichment" o que nenhum provider integrado hoje confirma -
    // em vez de deixar isso silenciosamente como "unknown" sem explicação.
    const searchPlan = planSearch(requirements, {
      googlePlacesConfigured: Boolean(effectiveGoogleKey),
      apolloConfigured: Boolean(effectiveApolloKey)
    });
    attachSearchPlan(searchId, searchPlan);
    recordStep(searchId, 'query_planned')({
      status: 'ok',
      detail: `${searchPlan.steps.length} etapa(s) planejada(s), ${searchPlan.unsupportedCriteria.length} critério(s) sem provider capaz nesta execução.`
    });

    // Pool de vendedores dinâmico: qualquer vendedor ativo cadastrado com a marca
    // certa entra no rodízio automaticamente — não depende mais de IDs fixos no código.
    const sellersRes = await db.exec(
      `SELECT id FROM users WHERE role = 'user' AND company = ? AND active IS DISTINCT FROM false`,
      [effectiveCompany]
    );
    const sellerIds: string[] = (sellersRes[0]?.values || []).map((row: any) => row[0] as string);

    const sdrLoads: Record<string, number> = {};
    sellerIds.forEach(id => { sdrLoads[id] = 0; });

    if (sellerIds.length > 0) {
      const placeholders = sellerIds.map(() => '?').join(',');
      const activeLeadsRes = await db.exec(
        `SELECT assigned_to, COUNT(*) as count FROM leads WHERE assigned_to IN (${placeholders}) AND stage IN ('prospecto', 'contatado', 'negociacao') GROUP BY assigned_to`,
        sellerIds
      );
      (activeLeadsRes[0]?.values || []).forEach((row: any) => {
        if (row[0] && sdrLoads[row[0] as string] !== undefined) {
          sdrLoads[row[0] as string] = Number(row[1]) || 0;
        }
      });
    } else {
      console.warn(`Nenhum vendedor ativo cadastrado para a marca "${effectiveCompany}" — leads serão salvos sem atribuição automática.`);
    }

    function pickSeller(): string | null {
      if (sellerIds.length === 0) return null;
      return sellerIds.reduce((best, id) => (sdrLoads[id] < sdrLoads[best] ? id : best), sellerIds[0]);
    }

    // Webhook do Bitrix desta marca, para conferir duplicidade (cliente já existente)
    // antes de gravar o lead — usa o override explícito da tela, se houver, senão o
    // webhook padrão da marca.
    const effectiveBitrixWebhook = (bitrixWebhook || resolveBitrixWebhookForCompany(effectiveCompany)).replace(/\/$/, '');

    // Wave 5 (CPI) - Entity Resolution & Dedup: leads pulados por serem a mesma
    // empresa de um registro já existente (detectado só após resolver o CNPJ
    // oficial - nome/domínio podiam divergir o suficiente para passar pelo
    // pré-filtro acima, mas o CNPJ, chave forte, não mente). existingCompanyKeys
    // também recebe o CNPJ recém-confirmado a cada volta do loop, para não
    // duplicar dentro da própria leva de resultados do Places.
    const duplicatesSkipped: Array<{ name: string; matchedBy: string; existingLeadId: string }> = [];

    // Wave 10 (CPI) - Observabilidade: um único passo cobre CNPJ+Apollo+Bitrix
    // por lead - as três fontes rodam intercaladas por candidato, não em fases
    // globais separadas; cada chamada real a cada uma já vira seu próprio
    // ProviderCallLog acima/abaixo.
    const finishEnrichmentStep = recordStep(searchId, 'enrichment_loop');

    for (let i = 0; i < rawLeads.length; i++) {
      const leadItem = rawLeads[i];
      const leadId = `lead-${Date.now()}-${i}`;

      // 2. Consulta Gratuita na API de CNPJ (BrasilAPI / Minha Receita / Receita Federal)
      // Wave 9 (CPI) - Cost/Cache/Resiliência: mesma empresa em buscas diferentes não
      // paga o preço de rede de novo dentro do TTL (cache), falhas transitórias das
      // fontes públicas ganham novas tentativas com backoff+jitter (retry), e um
      // circuit breaker por provider evita insistir se as fontes públicas estiverem
      // fora do ar (ver resolveCnpjWithResilience). Gratuita: só é gated pelo teto
      // total de chamadas do orçamento (maxApiCalls), não pelo de enriquecimentos.
      let cnpjInfo: CnpjData;
      if (budgetTracker.used.apiCalls < budgetTracker.budget.maxApiCalls) {
        const cnpjCacheKey = buildCnpjCacheKey({ name: leadItem.name, domain: leadItem.domain, cnpj: leadItem.cnpj });
        const cnpjWasCached = hasFreshCacheEntry(cnpjCacheKey);
        cnpjInfo = await resolveCnpjWithResilience(
          {
            name: leadItem.name,
            domain: leadItem.domain,
            cnpj: leadItem.cnpj,
            address: leadItem.address
          },
          cnpjCacheKey,
          (info) => recordProviderCall(searchId, {
            provider: 'cnpj_receita_federal',
            operation: 'lookup_cnpj',
            status: info.status,
            latencyMs: info.latencyMs,
            source: info.source,
            leadName: leadItem.name
          })
        );
        if (!cnpjWasCached) recordApiCall(budgetTracker);
      } else {
        // Orçamento de chamadas de API esgotado nesta execução: o CNPJ fica
        // desconhecido para os leads restantes - nunca fabricado.
        cnpjInfo = {};
      }

      // Wave 5 (CPI) - Entity Resolution & Dedup: o pré-filtro por domínio/nome
      // já rodou antes do CNPJ ser conhecido; agora que temos o CNPJ oficial
      // (chave forte), checamos de novo - evita duplicar quando o Places devolve
      // a mesma empresa com nome/domínio ligeiramente diferentes de um lead já
      // salvo (matriz vs. filial, "Jamef" vs. "Jamef Transportes Ltda", etc.), e
      // também evita duplicar dentro da própria leva de resultados do Places.
      let candidateKey: CompanyKey | null = null;
      if (cnpjInfo.cnpj) {
        candidateKey = buildCompanyKey({ cnpj: cnpjInfo.cnpj, domain: leadItem.domain, name: leadItem.name });
        const duplicate = findDuplicate(candidateKey, existingCompanyKeys);
        if (duplicate && duplicate.matchedBy === 'cnpj') {
          duplicatesSkipped.push({ name: leadItem.name, matchedBy: duplicate.matchedBy, existingLeadId: duplicate.entry.id });
          console.info(`CNPJ ${cnpjInfo.cnpj} já existe na base — "${leadItem.name}" não foi duplicado.`);
          recordCandidateDecision(searchId, {
            name: leadItem.name,
            domain: leadItem.domain,
            cnpj: cnpjInfo.cnpj,
            decision: 'discarded',
            reasonCode: 'duplicate_cnpj',
            reason: `Mesmo CNPJ oficial (${cnpjInfo.cnpj}) de um lead já existente na base (id ${duplicate.entry.id}), mesmo com nome/domínio diferentes.`,
            matchedExistingLeadId: duplicate.entry.id
          });
          continue;
        }
        existingCompanyKeys.push({ key: candidateKey, entry: { id: leadId, domain: leadItem.domain || '', name: leadItem.name } });
      }

      const assignedSdr = pickSeller();
      if (assignedSdr) sdrLoads[assignedSdr]++;

      // 3. Apollo Enrichment (Decisores Reais e Perfil de LinkedIn)
      // Wave 9 (CPI) - Cost/Cache/Resiliência: a Apollo é paga - gated pelo
      // orçamento de enriquecimento (maxEnrichments/maxApiCalls/maxPaidCredits).
      // Sem orçamento restante, o lead segue sem decisor (decision_makers: [],
      // estado válido desde a Wave 0) em vez de parar a prospecção inteira ou
      // inventar um decisor. Resultado cacheado por domínio+cargo(s) pedido(s)
      // (evita pagar de novo pela mesma empresa em buscas diferentes dentro do
      // TTL) - retry/circuit breaker por provider já acontecem dentro de
      // enrichLeadWithApollo. Wave 10 (CPI) - Observabilidade: o callback só
      // dispara em cache miss (única situação em que enrichLeadWithApollo roda
      // e faz uma chamada real). decisionMakerTitles (filtro multi-cargo do
      // combobox "Decisor Alvo") entra na chave de cache para não devolver um
      // resultado cacheado com outro conjunto de cargos.
      let apolloResult: { decisionMakers: DecisionMaker[]; companyLinkedin?: string };
      if (hasEnrichmentBudget(budgetTracker)) {
        const apolloTitlesKeyPart = decisionMakerTitles && decisionMakerTitles.length > 0
          ? [...decisionMakerTitles].sort().join(',')
          : '';
        const apolloCacheKey = `apollo:${(cleanDomainForCache(leadItem.domain) || leadItem.name.toLowerCase())}:${decisionMakerRole || ''}:${apolloTitlesKeyPart}`;
        const apolloWasCached = hasFreshCacheEntry(apolloCacheKey);
        apolloResult = await withCache(
          apolloCacheKey,
          (r: { decisionMakers: DecisionMaker[]; companyLinkedin?: string }) =>
            r.decisionMakers.length > 0 ? CACHE_TTL_MS.MEDIUM_CONTACT : CACHE_TTL_MS.SHORT_SIGNAL,
          () => enrichLeadWithApollo(
            leadItem.domain,
            leadItem.name,
            effectiveApolloKey,
            decisionMakerRole,
            decisionMakerTitles,
            (log) => recordProviderCall(searchId, { ...log, leadName: leadItem.name } as any)
          )
        );
        if (!apolloWasCached) recordEnrichment(budgetTracker, { apiCalls: 2, paidCredits: 2 });
      } else {
        apolloResult = { decisionMakers: [], companyLinkedin: leadItem.company_linkedin || '' };
      }
      const decisionMakers = apolloResult.decisionMakers;
      const companyLinkedin = apolloResult.companyLinkedin || leadItem.company_linkedin || '';

      // Sem match real via Apollo, o decisor permanece desconhecido - não inventamos
      // nome, cargo, e-mail, telefone ou LinkedIn para preencher a lacuna.
      let mainDm: DecisionMaker | undefined = decisionMakers[0];

      // Wave 9 (CPI) - Fallback real Apollo -> Hunter (exemplo do próprio pacote
      // CPI: Apollo busca a pessoa, Hunter só complementa/verifica o e-mail).
      // Caso A: Apollo encontrou um decisor real mas sem e-mail - Hunter tenta
      // confirmar um e-mail real daquela pessoa no domínio da empresa. Caso B:
      // Apollo não encontrou ninguém, mas a Receita Federal (QSA) já confirmou
      // um sócio real - só promovemos esse sócio a decisor quando o Hunter
      // confirma uma correspondência real de e-mail para o NOME dele (nunca "o
      // primeiro e-mail do domínio"); sem essa confirmação, o decisor permanece
      // desconhecido, como antes da Wave 9.
      if (effectiveHunterKey && leadItem.domain) {
        if (mainDm && !mainDm.email) {
          const foundEmail = await complementDecisionMakerEmailWithHunter(mainDm, leadItem.domain, effectiveHunterKey);
          if (foundEmail) {
            mainDm = { ...mainDm, email: foundEmail, emails: [...(mainDm.emails || []), foundEmail] };
            decisionMakers[0] = mainDm;
          }
        } else if (!mainDm && cnpjInfo.qsa && cnpjInfo.qsa.length > 0) {
          const socio = cnpjInfo.qsa[0];
          const foundEmail = await complementDecisionMakerEmailWithHunter({ name: socio.nome_socio }, leadItem.domain, effectiveHunterKey);
          if (foundEmail) {
            mainDm = {
              name: socio.nome_socio,
              title: socio.qualificacao_socio || '',
              email: foundEmail,
              emails: [foundEmail],
              linkedin: ''
            };
            decisionMakers.push(mainDm);
          }
        }
      }

      // Wave 2 (CPI) - Requirement Engine: avalia cada requisito contra o que foi
      // OBSERVADO para este lead (CNAE/UF/município oficiais da Receita Federal,
      // cargo do decisor real via Apollo) - nunca contra o valor apenas pedido.
      const requirementEvaluations = evaluateRequirements(
        requirements,
        {
          segment: cnpjInfo.cnae_fiscal_descricao,
          region: cnpjInfo.uf,
          city: cnpjInfo.municipio,
          companyType: undefined, // nenhum provider atual confirma isto
          employeeCount: undefined, // nenhum provider atual confirma isto
          annualRevenue: undefined, // nenhum provider atual confirma isto
          decisionMakerRole: mainDm?.title
        },
        {
          segment: 'cnpj_receita_federal',
          region: 'cnpj_receita_federal',
          city: 'cnpj_receita_federal',
          decisionMakerRole: 'apollo'
        }
      );

      // Wave 6 (CPI) - Evidence & Provenance: monta aqui (antes do lead ser
      // gravado) porque a Wave 8 (Scoring), logo abaixo, também precisa
      // dessas evidências para o Data Quality Score - reaproveitado depois
      // para saveFieldEvidence, sem recalcular.
      const evidences = [
        ...buildCnpjEvidence(cnpjInfo),
        ...(mainDm ? buildDecisionMakerEvidence(mainDm, 'apollo') : [])
      ];

      // Wave 13 (CPI) - Signals & Intent: única fonte honesta hoje é o CNPJ
      // oficial já resolvido acima (cnpjInfo) - detecta no máximo o sinal
      // `nova_operacao` a partir de data_inicio_atividade real; nunca inventa
      // os demais tipos da lista do pacote sem um provider real por trás
      // (ver server/signals.ts).
      const signals = detectSignalsForLead({ name: leadItem.name }, { cnpjData: cnpjInfo });

      // Wave 8 (CPI) - Scoring: separa aderência ao ICP pedido (fit, a partir
      // do Requirement Engine acima), propensão temporal (intent - a partir
      // dos sinais reais acima; honestamente `null` quando nenhum sinal
      // ativo existe para o lead) e confiabilidade do dado (dataQuality, a
      // partir das evidências acima). Pesos por marca (atlas/totaltrac) -
      // nunca esconde os 3 scores individuais atrás do final (ver
      // server/scoring.ts).
      const leadScores = computeLeadScores({
        requirementEvaluations,
        evidences,
        signals,
        company: effectiveCompany
      });

      const situacaoAtiva = (cnpjInfo.situacao_cadastral || '').toUpperCase() === 'ATIVA';
      const tags = [segment ? `Busca: ${segment}` : undefined, 'Novo Lead', situacaoAtiva ? 'CNPJ Ativo' : undefined]
        .filter((t): t is string => Boolean(t));

      // 4. Bitrix24: essa empresa já é cliente ou já está prospectada por lá? Checagem
      // best-effort — se o Bitrix não estiver configurado ou não responder, o lead é
      // salvo normalmente como "unchecked" em vez de travar a prospecção.
      const bitrixCheck = await checkBitrixDuplicate(effectiveBitrixWebhook, {
        phone: leadItem.phone,
        email: mainDm?.email
      });

      const completeLead: Lead = {
        ...leadItem,
        id: leadId,
        campaign_id: campaignId,
        // Wave 10 (CPI) - Observabilidade: liga este lead à busca que o gerou -
        // "por que esta empresa apareceu?" (GET /api/search-runs/:searchId).
        search_id: searchId,
        cnpj: cnpjInfo.cnpj,
        razao_social: cnpjInfo.razao_social,
        nome_fantasia: cnpjInfo.nome_fantasia || leadItem.name,
        situacao_cadastral: cnpjInfo.situacao_cadastral,
        cnae_fiscal: cnpjInfo.cnae_fiscal,
        cnae_fiscal_descricao: cnpjInfo.cnae_fiscal_descricao,
        capital_social: cnpjInfo.capital_social,
        natureza_juridica: cnpjInfo.natureza_juridica,
        porte: cnpjInfo.porte,
        qsa: cnpjInfo.qsa,
        cnpj_consultado: true,
        company_linkedin: companyLinkedin,
        decision_makers: decisionMakers,
        decision_maker_name: mainDm?.name,
        decision_maker_title: mainDm?.title,
        decision_maker_email: mainDm?.email,
        decision_maker_emails: mainDm?.emails,
        decision_maker_phone: mainDm?.phone,
        decision_maker_phones: mainDm?.phones,
        decision_maker_linkedin: mainDm?.linkedin,
        stage: 'prospecto',
        tags,
        // Wave 2 (CPI) - Requirement Engine: por critério pedido, mostra o que foi
        // observado (ou "desconhecido") e se corresponde - não persistido no banco
        // (schema não versionado neste repo, ver docs/CPI_BACKLOG.md), só na resposta.
        requirement_evaluations: requirementEvaluations,
        // Wave 8 (CPI) - Scoring: fit/intent/dataQuality + final, sempre com
        // os 3 individuais visíveis (nunca só o final) - não persistido no
        // banco pelo mesmo motivo do requirement_evaluations acima.
        scores: leadScores,
        // Copys não são geradas no 1º momento: geradas sob demanda
        copies: {
          cold_call: '',
          cold_email: '',
          whatsapp: '',
          linkedin: ''
        },
        copies_generated: false,
        created_at: now
      };
      (completeLead as any).company = effectiveCompany;
      (completeLead as any).bitrix_check_status = bitrixCheck.status;
      (completeLead as any).bitrix_check_detail = bitrixCheck.detail;

      // is_estimated: true quando a consulta oficial de CNPJ NÃO confirmou situação
      // cadastral, CNAE ou capital social. Desde a Wave 0 (anti-fabricação), esses
      // campos ficam genuinamente vazios/ausentes quando não confirmados — nunca
      // preenchidos com um placeholder plausível — então este flag sinaliza "dado
      // cadastral não confirmado pela Receita Federal", não "valor de preenchimento".
      const isEstimated = !cnpjInfo.situacao_cadastral || !cnpjInfo.cnae_fiscal || !cnpjInfo.capital_social;
      (completeLead as any).is_estimated = isEstimated;

      // 4. Salvar Lead no Postgres com dados completos de Places, CNPJ, Apollo e Bitrix.
      // Campos não confirmados por uma fonte real vão vazios ('') em vez de um
      // valor plausível inventado.
      await db.run(`
        INSERT INTO leads (
          id, campaign_id, name, cnpj, razao_social, situacao_cadastral, cnae_fiscal, cnae_fiscal_descricao, capital_social, qsa,
          address, phone, corporate_email, website, domain, company_linkedin,
          rating, total_ratings, segment, company_type, employee_count, annual_revenue,
          decision_maker_name, decision_maker_title, decision_maker_email, decision_maker_emails,
          decision_maker_phone, decision_maker_phones, decision_maker_linkedin, stage, tags, assigned_to,
          company, bitrix_check_status, bitrix_check_detail, bitrix_checked_at, is_estimated, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        leadId,
        campaignId,
        completeLead.name,
        completeLead.cnpj || '',
        completeLead.razao_social || '',
        completeLead.situacao_cadastral || '',
        completeLead.cnae_fiscal || '',
        completeLead.cnae_fiscal_descricao || '',
        completeLead.capital_social || '',
        JSON.stringify(completeLead.qsa || []),
        completeLead.address || '',
        completeLead.phone || '',
        completeLead.corporate_email || '',
        completeLead.website || '',
        completeLead.domain,
        completeLead.company_linkedin || '',
        Number(completeLead.rating) || 0,
        completeLead.total_ratings || 0,
        // Testes de Integração e E2E (CPI follow-up) - Anti-Fabricação: NUNCA usar
        // segment/companyType/employeeCount/annualRevenue (o FILTRO pedido pelo
        // usuário, desestruturado de searchIntent acima) como fallback aqui. Isso
        // gravaria o critério de busca no banco como se fosse um atributo OBSERVADO
        // da empresa - exatamente a fabricação sutil que a Wave 2 (Requirement
        // Engine) já eliminou em findLeads/completeLead (ver comentário "Wave 2" na
        // montagem de completeLead acima) e que a Wave 2 documenta explicitamente:
        // o segmento pedido só deve aparecer como tag "Busca: <segmento>", nunca
        // como fato do lead. completeLead nunca define estes 4 campos (nenhum
        // provider integrado hoje confirma segmento/tipo/porte/faturamento por
        // empresa - ver providerRegistry), então ficam '' (desconhecido) em vez de
        // herdar o filtro.
        completeLead.segment || '',
        completeLead.company_type || '',
        completeLead.employee_count || '',
        completeLead.annual_revenue || '',
        mainDm?.name || '',
        mainDm?.title || '',
        mainDm?.email || '',
        JSON.stringify(mainDm?.emails || []),
        mainDm?.phone || '',
        JSON.stringify(mainDm?.phones || []),
        mainDm?.linkedin || '',
        'prospecto',
        JSON.stringify(completeLead.tags || []),
        assignedSdr,
        effectiveCompany,
        bitrixCheck.status,
        bitrixCheck.detail,
        bitrixCheck.status === 'unchecked' ? null : now,
        isEstimated,
        now
      ]);

      // Wave 6 (CPI) - Evidence & Provenance: registra de onde cada campo
      // relevante veio, quando foi obtido e com que confiança/status - para a
      // UI (futura) responder "por que este resultado apareceu?" (ver
      // GET /leads/:id/evidence). Nunca bloqueia a gravação do lead: uma falha
      // ao persistir evidência é só um aviso no log. (`evidences` já foi
      // montado acima, antes do Fit/Data Quality Score da Wave 8.)
      if (evidences.length > 0) {
        try {
          await saveFieldEvidence(db, 'lead', leadId, evidences);
        } catch (err) {
          console.warn(`[field_evidence] Falha ao salvar evidências do lead ${leadId}:`, err);
        }
      }

      enrichedLeads.push(completeLead);

      // Wave 10 (CPI) - Observabilidade: candidato incluído no resultado final.
      // O pipeline hoje não exclui automaticamente por HARD_FILTER não
      // confirmado (ver Wave 2/CPI_BACKLOG.md - shouldExcludeLead existe, mas
      // não é chamado aqui; mudar isso é decisão de comportamento fora do
      // escopo desta wave), mas a discrepância fica visível em
      // unmatchedHardFilters - "por que apareceu mesmo sem confirmar X".
      const unmatchedHardFilters = requirementEvaluations
        .filter(e => e.type === 'HARD_FILTER' && e.status === 'unmatched')
        .map(e => e.criterion);
      recordCandidateDecision(searchId, {
        name: leadItem.name,
        domain: leadItem.domain,
        cnpj: cnpjInfo.cnpj,
        decision: 'included',
        reasonCode: 'included',
        reason: 'Passou pela checagem de duplicidade (Wave 5) e foi incluído no resultado final.',
        leadId,
        unmatchedHardFilters: unmatchedHardFilters.length > 0 ? unmatchedHardFilters : undefined
      });
    }
    finishEnrichmentStep({ status: 'ok', detail: `${enrichedLeads.length} lead(s) enriquecido(s) e incluído(s).` });

    const finishPersistenceStep = recordStep(searchId, 'persistence');
    saveDatabase();
    finishPersistenceStep({ status: 'ok' });

    const duplicateNote = duplicatesSkipped.length > 0
      ? ` (${duplicatesSkipped.length} ${duplicatesSkipped.length === 1 ? 'empresa já estava' : 'empresas já estavam'} na base pelo CNPJ e não ${duplicatesSkipped.length === 1 ? 'foi duplicada' : 'foram duplicadas'})`
      : '';

    // Wave 7 (CPI) - Progressive Search: funil explícito (quantos candidatos
    // entraram/saíram de cada etapa e por quê) e o motivo pelo qual a busca
    // parou onde parou - construído só com contagens já calculadas acima
    // (rawLeads.length, duplicatesSkipped.length, enrichedLeads.length), sem
    // nenhuma chamada extra. Ver server/progressiveSearch.ts para o porquê do
    // escopo (sem paginação real do Places nesta wave).
    const decisionMakersConfirmedCount = enrichedLeads.filter(l => Boolean(l.decision_maker_name)).length;
    const funnelSummary = buildFunnelSummary({
      targetCount: effectiveLimit,
      discoveryProviderConfigured: Boolean(effectiveGoogleKey),
      discoveredCount: rawLeads.length,
      duplicatesSkippedCount: duplicatesSkipped.length,
      finalCount: enrichedLeads.length,
      decisionMakersConfirmedCount
    });

    // Wave 10 (CPI) - Observabilidade: fecha o SearchRun com sucesso - o
    // resumo (candidatos/incluídos/descartados) é calculado a partir do que
    // foi de fato registrado ao longo do pipeline acima.
    finishSearchRun(searchId, 'completed');

    res.json({
      success: true,
      campaignId,
      // Wave 10 (CPI) - Observabilidade: identifica esta execução para
      // GET /api/search-runs/:searchId - "por que esta empresa apareceu?".
      searchId,
      leads: enrichedLeads,
      // Wave 3 (CPI) - Query Planner: mesmo plano vale para toda a busca (não
      // depende do lead individual, só dos requisitos pedidos e dos providers
      // configurados nesta execução).
      searchPlan,
      // Wave 5 (CPI) - Entity Resolution & Dedup: leads que o Places devolveu mas
      // que já existiam na base sob outro nome/domínio (mesmo CNPJ oficial) -
      // descartados silenciosamente antes desta wave, agora visíveis na resposta.
      duplicatesSkipped,
      skippedDuplicateCnpjCount: duplicatesSkipped.length,
      // Wave 7 (CPI) - Progressive Search.
      funnelSummary,
      stopReason: funnelSummary.stopReason,
      // Corrige diretamente a violação "primeiros N como se fossem os melhores N"
      // (pacote CPI, doc 11): fica explícito na resposta que esta lista NÃO tem
      // ranking por adequação - é a ordem em que o provider de descoberta devolveu
      // os resultados, filtrada por duplicidade. Scoring/ranking real é a Wave 8.
      rankingApplied: false,
      rankingNote: 'Resultados na ordem de descoberta, não há ranking por adequação ainda (ver Wave 8 - Scoring).',
      // Wave 9 (CPI) - Cost/Cache/Resiliência: quanto do orçamento desta execução
      // foi consumido (chamadas de API, créditos pagos estimados, enriquecimentos
      // Apollo) e se ele se esgotou antes de todos os leads serem enriquecidos -
      // leads restantes ficam com decision_makers: [] em vez de a prospecção
      // falhar ou inventar um decisor.
      budget: {
        limits: budgetTracker.budget,
        used: budgetTracker.used
      },
      budgetExhausted: isBudgetExhausted(budgetTracker),
      callsUsed: budgetTracker.used.apiCalls,
      // Estado atual do circuit breaker por provider (fechado = normal; aberto =
      // falhas consecutivas recentes fizeram o pipeline parar de tentar aquele
      // provider por um cooldown, sem gastar tempo/créditos em novas chamadas).
      providerCircuits: {
        cnpj_receita_federal: getCircuitState('cnpj_receita_federal'),
        apollo: getCircuitState('apollo')
      },
      message: `${enrichedLeads.length} empresas prospectadas com Places, CNPJ Oficial e Decisores Apollo salvos com sucesso no SQLite!${duplicateNote}`
    });
  } catch (err: any) {
    console.error('Erro na prospecção:', err);
    // Wave 10 (CPI) - Observabilidade: mesmo uma falha a meio do pipeline
    // fecha o SearchRun (status "failed") em vez de deixá-lo "running" para
    // sempre - o Search-ID gerado no início continua consultável.
    if (searchId) finishSearchRun(searchId, 'failed', err.message || 'Falha no processamento da prospecção.');
    res.status(500).json({ error: err.message || 'Falha no processamento da prospecção.', searchId: searchId || undefined });
  }
});

// 6. Ollama Status Check
apiRouter.post('/ollama/status', async (req: Request, res: Response) => {
  const { url = 'http://localhost:11434', model = 'llama3' } = req.body;
  const status = await checkOllamaConnection(url, model);
  res.json(status);
});

// 7. Chat with LLaMA3 / Interactive Assistant
apiRouter.post('/chat', heavyAiLimiter, requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId, message, aiConfig } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Mensagem não informada.' });
    }

    const db = await getDatabase();
    const effectiveSessionId = sessionId || `session-${Date.now()}`;
    const now = new Date().toISOString();

    // Ensure session exists
    const sessCheck = await db.exec(`SELECT id FROM chat_sessions WHERE id = ?`, [effectiveSessionId]);
    if (sessCheck.length === 0 || sessCheck[0].values.length === 0) {
      const modelTitle = aiConfig?.provider === 'ollama' ? (aiConfig.ollamaModel || 'llama3') : (aiConfig?.groqModel || 'gemini-3.7');
      await db.run(`
        INSERT INTO chat_sessions (id, title, model, created_at)
        VALUES (?, ?, ?, ?)
      `, [effectiveSessionId, `Conversa ${modelTitle} (${new Date().toLocaleDateString('pt-BR')})`, modelTitle, now]);
    }

    // Save user message to SQLite
    const userMsgId = `cmsg-u-${Date.now()}`;
    await db.run(`
      INSERT INTO chat_messages (id, session_id, role, content, model, created_at)
      VALUES (?, ?, 'user', ?, ?, ?)
    `, [userMsgId, effectiveSessionId, message, aiConfig?.ollamaModel || 'llama3', now]);

    // Fetch conversation history from SQLite
    const histRes = await db.exec(`SELECT role, content FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC`, [effectiveSessionId]);
    const history: { role: string; content: string }[] = [];
    if (histRes.length > 0) {
      histRes[0].values.forEach(row => {
        history.push({ role: row[0] as string, content: row[1] as string });
      });
    }

    // Call AI Engine (LLaMA3 Ollama / Groq / Gemini)
    const result = await chatWithLLaMA3(history.slice(-8, -1), message, aiConfig || { provider: 'ollama', ollamaUrl: 'http://localhost:11434', ollamaModel: 'llama3' });

    // Save assistant response to SQLite
    const botMsgId = `cmsg-a-${Date.now()}`;
    await db.run(`
      INSERT INTO chat_messages (id, session_id, role, content, model, tokens, created_at)
      VALUES (?, ?, 'assistant', ?, ?, ?, ?)
    `, [botMsgId, effectiveSessionId, result.text, result.modelUsed, result.tokensEstimated, new Date().toISOString()]);

    saveDatabase();

    res.json({
      sessionId: effectiveSessionId,
      reply: result.text,
      modelUsed: result.modelUsed,
      tokensEstimated: result.tokensEstimated,
      userMessageId: userMsgId,
      assistantMessageId: botMsgId
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Chat Sessions & Messages List
apiRouter.get('/chat/sessions', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const result = await db.exec(`
      SELECT s.*, 
        (SELECT COUNT(*) FROM chat_messages m WHERE m.session_id = s.id) as messages_count,
        (SELECT content FROM chat_messages m WHERE m.session_id = s.id ORDER BY m.created_at DESC LIMIT 1) as last_message
      FROM chat_sessions s
      ORDER BY s.created_at DESC
    `);
    
    if (result.length === 0) return res.json([]);
    const cols = result[0].columns;
    const sessions = result[0].values.map(row => {
      const obj: any = {};
      cols.forEach((col, idx) => { obj[col] = row[idx]; });
      return obj;
    });
    res.json(sessions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/chat/sessions/:id/messages', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getDatabase();
    const result = await db.exec(`SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC`, [id]);
    
    if (result.length === 0) return res.json([]);
    const cols = result[0].columns;
    const messages = result[0].values.map(row => {
      const obj: any = {};
      cols.forEach((col, idx) => { obj[col] = row[idx]; });
      return obj;
    });
    res.json(messages);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Wave 12 (CPI) — política de elegibilidade padrão desta instalação. 'lenient'
// (avisa mas não bloqueia CNPJ/e-mail não confirmados) é o default operacional
// atual porque nem a verificação de e-mail (Hunter) nem a Wave 0 (remoção do
// fallback determinístico de CNPJ em server/cnpj.ts) estão totalmente integradas
// neste branch ainda — travar tudo em 'strict' hoje bloquearia praticamente
// qualquer exportação legítima. Duplicidade de Cliente/Contato (existing_client)
// bloqueia sempre, independente desta variável — ver server/exportEligibility.ts.
function getBitrixExportPolicy(): ExportPolicy {
  return process.env.BITRIX_EXPORT_POLICY === 'strict' ? 'strict' : 'lenient';
}

// Wave 12 (CPI) — resume, a partir dos campos já presentes no lead, de onde vieram
// os dados e quando foram confirmados pela última vez. Nunca inventa uma fonte:
// quando o pipeline não sabe, devolve 'Não confirmada'/null explicitamente.
function summarizeVerification(lead: any): { primarySource: string; lastVerifiedAt: string | null } {
  if (lead.cnpj_consultado === true && lead.is_estimated !== true) {
    return {
      primarySource: 'Receita Federal (consulta pública de CNPJ)',
      lastVerifiedAt: lead.created_at || null
    };
  }
  if (lead.cnpj_consultado === true && lead.is_estimated === true) {
    return {
      primarySource: 'Consulta de CNPJ sem confirmação completa (dados fiscais estimados)',
      lastVerifiedAt: lead.created_at || null
    };
  }
  return { primarySource: 'Não confirmada (CNPJ não consultado)', lastVerifiedAt: null };
}

// Wave 12 (CPI) — Scores (Wave 8) e Search-ID (Wave 10) ainda podem não existir
// neste lead se aquelas waves não tiverem sido mescladas ainda: todo acesso abaixo
// é opcional/defensivo, nunca assume presença nem inventa um valor no lugar.
function extractScoresAndSearchContext(lead: any): {
  fitScore?: number | string;
  intentScore?: number | string;
  dataQualityScore?: number | string;
  adherenceReason: string;
  searchId?: string;
} {
  const scores = lead.scores || {};
  const fitScore = scores.fit ?? scores.fitScore ?? lead.fit_score;
  const intentScore = scores.intent ?? scores.intentScore ?? lead.intent_score;
  const dataQualityScore = scores.dataQuality ?? scores.data_quality ?? lead.data_quality_score;

  const requirementEvaluations = lead.requirement_evaluations;
  let adherenceReason = '';
  if (Array.isArray(requirementEvaluations) && requirementEvaluations.length > 0) {
    adherenceReason = requirementEvaluations
      .map((r: any) => (typeof r === 'string' ? r : r?.reason || r?.description || r?.label || ''))
      .filter(Boolean)
      .join('; ');
  } else if (typeof lead.adherence_reason === 'string' && lead.adherence_reason) {
    adherenceReason = lead.adherence_reason;
  }

  const searchId = lead.search_id || lead.searchId;

  return { fitScore, intentScore, dataQualityScore, adherenceReason, searchId };
}

// 9. Integration: Bitrix24 CRM Lead/Deal Export
apiRouter.post('/integrations/bitrix24/send-lead', integrationLimiter, requireAuth, async (req: Request, res: Response) => {
  const db = await getDatabase();
  const { webhookUrl, lead, customComments, force } = req.body || {};

  try {
    const effectiveWebhook = (webhookUrl || resolveBitrixWebhookForCompany(lead?.company) || process.env.BITRIX_TOTALTRAC_WEBHOOK || '').replace(/\/$/, '');

    if (!lead || !lead.name) {
      return res.status(400).json({ error: 'Dados do lead são obrigatórios.' });
    }

    // Wave 11 (CPI) - SSRF: o webhook pode vir direto do body da requisição
    // (webhookUrl) — nunca chamamos fetch() para um destino do usuário sem
    // antes garantir que não é localhost/IP privado/link-local.
    const webhookSafety = isUrlSafeForOutboundWebhook(effectiveWebhook);
    if (!webhookSafety.safe) {
      return res.status(400).json({ error: `Webhook do Bitrix24 rejeitado: ${webhookSafety.reason}` });
    }

    if (customComments !== undefined && !isWithinMaxLength(String(customComments))) {
      return res.status(400).json({ error: 'Notas adicionais excedem o tamanho máximo permitido.' });
    }

    // --- Wave 12: elegibilidade — nunca exporta dado sintético/fabricado, nem
    // dado não confirmado sob política 'strict', nem lead já cliente no Bitrix.
    const policy = getBitrixExportPolicy();
    const eligibility = checkExportEligibility(lead, policy);
    if (!eligibility.eligible) {
      if (lead.id) {
        await db.run(
          `UPDATE leads SET bitrix_export_status = ?, bitrix_export_error = ? WHERE id = ?`,
          ['blocked', eligibility.reasons.join(' | '), lead.id]
        ).catch(e => console.error('Falha ao gravar bitrix_export_status=blocked:', e));
      }
      return res.status(409).json({
        success: false,
        blocked: true,
        error: 'Lead não elegível para exportação ao Bitrix24.',
        reasons: eligibility.reasons,
        warnings: eligibility.warnings
      });
    }

    // --- Wave 12: idempotência — mesmo lead + mesmo webhook nunca cria um
    // segundo Lead/Deal no Bitrix, a menos que force=true seja passado de propósito.
    const idempotencyKey = generateExportIdempotencyKey(lead.id || '', effectiveWebhook);
    if (!force && lead.id) {
      try {
        const prior = await db.exec(
          `SELECT bitrix_lead_id, created_at FROM bitrix_export_log WHERE idempotency_key = ? AND status = 'success' ORDER BY created_at DESC LIMIT 1`,
          [idempotencyKey]
        );
        if (prior.length > 0 && prior[0].values.length > 0) {
          const [priorBitrixLeadId, priorCreatedAt] = prior[0].values[0];
          return res.json({
            success: true,
            idempotent: true,
            leadId: priorBitrixLeadId,
            message: `Lead "${lead.name}" já havia sido exportado para o Bitrix24 (Lead #${priorBitrixLeadId}, em ${priorCreatedAt}). Envie novamente com "force" para reprocessar de propósito.`,
            target: effectiveWebhook.includes('totaltrac') ? 'Total Trac' : 'AtlasGR',
            warnings: eligibility.warnings
          });
        }
      } catch (err) {
        console.error('Falha ao checar idempotência de exportação Bitrix24 (seguindo com o envio):', err);
      }
    }

    const dmName = lead.decision_maker_name || (lead.decision_makers && lead.decision_makers[0]?.name) || 'Decisor';
    const dmTitle = lead.decision_maker_title || (lead.decision_makers && lead.decision_makers[0]?.title) || 'Liderança';
    const dmEmail = lead.decision_maker_email || (lead.decision_makers && lead.decision_makers[0]?.email) || '';
    const dmPhone = lead.phone || '';

    const { primarySource, lastVerifiedAt } = summarizeVerification(lead);
    const { fitScore, intentScore, dataQualityScore, adherenceReason, searchId } = extractScoresAndSearchContext(lead);

    // Construct rich text comments
    let comments = `=== PROSPECÇÃO ATLAS OUTBOUND AI ===\n`;
    comments += `Empresa: ${lead.name}\n`;
    comments += `Decisor: ${dmName} (${dmTitle})\n`;
    comments += `Endereço: ${lead.address || 'N/A'}\n`;
    comments += `Website: ${lead.website || 'N/A'}\n`;
    comments += `Avaliação Google: ${lead.rating || 'N/A'} (${lead.total_ratings || 0} avaliações)\n`;
    if (lead.is_estimated) {
      comments += `⚠ ATENÇÃO: situação cadastral/CNAE/capital social não confirmados na Receita Federal — dados fiscais abaixo são estimados.\n`;
    }
    comments += `\n--- QUALIFICAÇÃO (Wave 12) ---\n`;
    comments += `Fonte principal: ${primarySource}\n`;
    comments += `Última verificação: ${lastVerifiedAt || 'Nunca verificado'}\n`;
    if (searchId) comments += `Search-ID: ${searchId}\n`;
    if (fitScore !== undefined || intentScore !== undefined || dataQualityScore !== undefined) {
      comments += `Scores — Fit: ${fitScore ?? 'N/A'} | Intent: ${intentScore ?? 'N/A'} | Data Quality: ${dataQualityScore ?? 'N/A'}\n`;
    }
    if (adherenceReason) comments += `Motivo de aderência: ${adherenceReason}\n`;
    if (eligibility.warnings.length > 0) {
      comments += `Ressalvas de elegibilidade (política: ${policy}): ${eligibility.warnings.join(' | ')}\n`;
    }
    comments += `\n`;

    if (lead.copies) {
      comments += `--- ROTEIRO COLD CALL ---\n${lead.copies.cold_call || ''}\n\n`;
      comments += `--- COLD EMAIL ---\n${lead.copies.cold_email || ''}\n\n`;
      comments += `--- WHATSAPP ---\n${lead.copies.whatsapp || ''}\n\n`;
      comments += `--- LINKEDIN ---\n${lead.copies.linkedin || ''}\n\n`;
      if (lead.copies.followup_strategy) {
        comments += `--- ESTRATÉGIA DE FOLLOW-UP ---\n${lead.copies.followup_strategy}\n`;
      }
    }

    if (customComments) {
      comments += `\nNotas Adicionais: ${customComments}\n`;
    }

    const payload = {
      fields: {
        TITLE: `[Atlas] ${lead.name} - ${dmName}`,
        NAME: dmName.split(' ')[0] || 'Decisor',
        LAST_NAME: dmName.split(' ').slice(1).join(' ') || '',
        POST: dmTitle,
        COMPANY_TITLE: lead.name,
        ADDRESS: lead.address || '',
        SOURCE_ID: 'OUTBOUND_ATLAS',
        STATUS_ID: 'NEW',
        OPENED: 'Y',
        COMMENTS: comments,
        PHONE: dmPhone ? [{ VALUE: dmPhone, VALUE_TYPE: 'WORK' }] : [],
        EMAIL: dmEmail ? [{ VALUE: dmEmail, VALUE_TYPE: 'WORK' }] : [],
        WEB: lead.website ? [{ VALUE: lead.website, VALUE_TYPE: 'WORK' }] : []
      },
      params: { REGISTER_SONET_EVENT: 'Y' }
    };

    // Wave 4 (CPI, follow-up) - a chamada HTTP real (timeout, SSRF, 429/5xx,
    // retry) agora vive no adapter formal (server/search/providers/bitrix.
    // provider.ts, capacidade "crm_export") - esta rota só cuida de
    // elegibilidade/idempotência/log, que são regra de negócio, não integração.
    const exportResult = await exportLead(effectiveWebhook, payload.fields);

    if (exportResult.status === 'ok' && exportResult.data) {
      const bitrixLeadId = exportResult.data.bitrixLeadId;
      if (lead.id) {
        await db.run(
          `INSERT INTO bitrix_export_log (lead_id, idempotency_key, status, bitrix_lead_id) VALUES (?, ?, 'success', ?)`,
          [lead.id, idempotencyKey, bitrixLeadId]
        ).catch(e => console.error('Falha ao gravar bitrix_export_log:', e));
        await db.run(
          `UPDATE leads SET bitrix_export_status = 'exported', bitrix_export_error = NULL, bitrix_exported_at = NOW() WHERE id = ?`,
          [lead.id]
        ).catch(e => console.error('Falha ao gravar bitrix_export_status=exported:', e));
      }
      saveDatabase();
      return res.json({
        success: true,
        leadId: bitrixLeadId,
        message: `Lead #${bitrixLeadId} "${lead.name}" exportado com sucesso para o Bitrix24!`,
        target: effectiveWebhook.includes('totaltrac') ? 'Total Trac' : 'AtlasGR',
        warnings: eligibility.warnings
      });
    }

    // timeout/rate_limited/error/not_configured: nunca tratado como sucesso -
    // status explícito do adapter, nunca um "provavelmente foi" fabricado.
    const errMsg = exportResult.errorMessage || 'Erro retornado pela API do Bitrix24.';
    if (lead.id) {
      await db.run(
        `INSERT INTO bitrix_export_log (lead_id, idempotency_key, status, error) VALUES (?, ?, 'error', ?)`,
        [lead.id, idempotencyKey, errMsg]
      ).catch(e => console.error('Falha ao gravar bitrix_export_log:', e));
      await db.run(
        `UPDATE leads SET bitrix_export_status = 'error', bitrix_export_error = ? WHERE id = ?`,
        [errMsg, lead.id]
      ).catch(e => console.error('Falha ao gravar bitrix_export_status=error:', e));
    }
    saveDatabase();
    const httpStatus = exportResult.status === 'rate_limited'
      ? 429
      : (exportResult.status === 'timeout' || (exportResult.httpStatus !== undefined && exportResult.httpStatus >= 500))
        ? 502
        : 400;
    return res.status(httpStatus).json({
      success: false,
      error: errMsg,
      providerStatus: exportResult.status
    });
  } catch (err: any) {
    // Nunca logar a URL do webhook em texto puro: o token de autenticação do
    // Bitrix24 vem embutido no path da URL (ver maskWebhookUrl).
    console.error('Erro na integração Bitrix24:', err.message || err, '| webhook:', maskWebhookUrl(req.body?.webhookUrl));
    if (lead?.id) {
      await db.run(
        `UPDATE leads SET bitrix_export_status = 'error', bitrix_export_error = ? WHERE id = ?`,
        [err.message || 'Falha ao conectar com o Bitrix24.', lead.id]
      ).catch(e => console.error('Falha ao gravar bitrix_export_status=error:', e));
    }
    res.status(500).json({ success: false, error: err.message || 'Falha ao conectar com o Bitrix24.' });
  }
});

// 9b. Bitrix24: conferir manualmente se um lead específico já é cliente/já está na base
// (para leads antigos, salvos antes desta checagem existir, ou cujo primeiro check falhou).
apiRouter.post('/leads/:id/bitrix-check', integrationLimiter, requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { webhookUrl } = req.body;
    const db = await getDatabase();

    const leadRes = await db.exec(`SELECT * FROM leads WHERE id = ?`, [id]);
    if (leadRes.length === 0 || leadRes[0].values.length === 0) {
      return res.status(404).json({ error: 'Lead não encontrado.' });
    }
    const cols = leadRes[0].columns;
    const rawLead: any = {};
    cols.forEach((col, idx) => { rawLead[col] = leadRes[0].values[0][idx]; });

    const effectiveWebhook = (webhookUrl || resolveBitrixWebhookForCompany(rawLead.company)).replace(/\/$/, '');
    // Wave 11 (CPI) - SSRF: mesma checagem de destino do send-lead. checkBitrixDuplicate
    // também valida por conta própria (defesa em profundidade), mas checar aqui devolve
    // um erro explícito ao usuário em vez de um 'unchecked' silencioso.
    if (effectiveWebhook) {
      const webhookSafety = isUrlSafeForOutboundWebhook(effectiveWebhook);
      if (!webhookSafety.safe) {
        return res.status(400).json({ error: `Webhook do Bitrix24 rejeitado: ${webhookSafety.reason}` });
      }
    }
    const result = await checkBitrixDuplicate(effectiveWebhook, {
      phone: rawLead.phone,
      email: rawLead.decision_maker_email || rawLead.corporate_email
    });

    await db.run(
      `UPDATE leads SET bitrix_check_status = ?, bitrix_check_detail = ?, bitrix_checked_at = ? WHERE id = ?`,
      [result.status, result.detail, result.status === 'unchecked' ? null : new Date().toISOString(), id]
    );
    saveDatabase();

    res.json({ success: true, leadId: id, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Falha ao consultar o Bitrix24.' });
  }
});

// 10. Integration: Hunter.io Email Verification & Domain Search
// Wave 4 (CPI, follow-up) - a chamada HTTP real agora vive no adapter formal
// (server/search/providers/hunter.provider.ts), com timeout/429/5xx/status
// explícito - a rota só traduz o ProviderResult para o formato já consumido
// pelo frontend (ver src/components/LeadCard.tsx).
apiRouter.post('/integrations/hunter/verify', integrationLimiter, requireAuth, async (req: Request, res: Response) => {
  try {
    const { email, apiKey } = req.body;
    const effectiveKey = (apiKey || process.env.HUNTER_API_KEY || '').trim();

    if (!email) {
      return res.status(400).json({ error: 'E-mail para verificação é obrigatório.' });
    }

    const result = await hunterVerifyEmail(email, effectiveKey);

    if (result.status === 'ok' && result.data) {
      res.json({
        success: true,
        email: result.data.email,
        status: result.data.status, // valid, invalid, accept_all, disposable, etc.
        score: result.data.score,
        domain: result.data.domain,
        sources_count: result.data.sourcesCount,
        result: result.data.result,
        message: `E-mail verificado via Hunter.io: status ${result.data.status} (Score ${result.data.score}/100)`
      });
    } else {
      // Hunter.io indisponível, sem chave configurada, rate-limited ou erro: a
      // verificação real não aconteceu, então o status é 'unknown' - nunca
      // simulamos um score de confiança nem afirmamos que o domínio corporativo
      // foi verificado.
      res.json({
        success: false,
        email,
        status: 'unknown',
        score: 0,
        domain: email.split('@')[1] || '',
        message: 'Verificação via Hunter.io indisponível (chave não configurada ou serviço fora do ar). Nenhuma verificação real foi realizada.',
        isSimulated: true,
        providerStatus: result.status
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/integrations/hunter/domain-search', integrationLimiter, requireAuth, async (req: Request, res: Response) => {
  try {
    const { domain, apiKey } = req.body;
    const effectiveKey = (apiKey || process.env.HUNTER_API_KEY || '').trim();

    if (!domain) {
      return res.status(400).json({ error: 'Domínio é obrigatório.' });
    }

    const result = await hunterDomainSearch(domain, effectiveKey);

    if (result.status === 'ok' && result.data) {
      res.json({
        success: true,
        domain,
        organization: result.data.organization,
        emails: result.data.emails.map(e => ({
          value: e.email,
          type: e.type,
          confidence: e.confidence,
          first_name: e.firstName,
          last_name: e.lastName,
          position: e.position
        }))
      });
    } else {
      // Hunter.io indisponível, sem chave configurada, sem match ou erro: nenhum e-mail é inventado.
      res.json({
        success: false,
        domain,
        emails: [],
        message: 'Busca de e-mails via Hunter.io indisponível (chave não configurada ou serviço fora do ar).',
        providerStatus: result.status
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 11. Integration: Bland AI Conversational Voice Call
apiRouter.post('/integrations/bland/call', requireAuth, async (req: Request, res: Response) => {
  try {
    const { phoneNumber, script, companyName, decisionMakerName, apiKey } = req.body;
    const effectiveKey = (apiKey || process.env.BLAND_AI_API_KEY || '').trim();

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Número de telefone é obrigatório para disparo da chamada.' });
    }

    if (script !== undefined && !isWithinMaxLength(String(script))) {
      return res.status(400).json({ error: 'Roteiro de chamada excede o tamanho máximo permitido.' });
    }

    const promptTask = `Você é a assistente de voz IA da Atlas Inteligência e Segurança Logística.
Você está ligando para ${decisionMakerName || 'o decisor'} na empresa ${companyName || 'alvo'}.
Objetivo da chamada: Apresentar de forma cordial e objetiva a solução Atlas para gestão de risco de transporte e solicitar 10 minutos de reunião com nosso consultor sênior.
Roteiro base: "${script || 'Olá, estou entrando em contato em nome da Atlas para compartilhar nossos avanços em segurança e inteligência de frotas rodoviárias.'}"
Fale com voz natural, cordial, em Português Brasileiro (PT-BR), aguarde a resposta do interlocutor e trate objeções com profissionalismo.`;

    const response = await fetch('https://api.bland.ai/v1/calls', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authorization': effectiveKey
      },
      body: JSON.stringify({
        phone_number: phoneNumber,
        task: promptTask,
        voice: 'maya',
        reduce_latency: true,
        record: true,
        wait_for_greeting: true,
        language: 'pt'
      })
    });

    const data = await response.json() as any;

    if (response.ok && data.status === 'success') {
      res.json({
        success: true,
        call_id: data.call_id,
        status: 'queued',
        message: `Chamada de voz IA agendada para ${phoneNumber} com sucesso via Bland AI! (Call ID: ${data.call_id})`,
        phone_number: phoneNumber
      });
    } else {
      // A chamada real via Bland AI falhou (sem chave configurada, saldo/limite ou
      // erro da API): nunca reportamos sucesso para uma ligação que não aconteceu.
      res.status(502).json({
        success: false,
        status: 'error',
        error: data.message || data.error || 'Falha ao disparar a chamada via Bland AI (chave não configurada ou serviço indisponível).',
        phone_number: phoneNumber
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Helper: Lead Finder (Google Places API)
// REGRA ANTI-FABRICAÇÃO: quando nenhum provider real está configurado, ou a busca
// não retorna resultados, a função devolve uma lista vazia. Nenhuma empresa,
// CNPJ, decisor ou avaliação é inventado para preencher a lacuna.
export async function findLeads(opts: {
  query: string;
  limit: number;
  googleApiKey?: string;
  excludeDomains?: Set<string>;
  excludeNames?: Set<string>;
  // Wave 10 (CPI) - Observabilidade: hooks opcionais para auditar a busca
  // inteira sob um Search-ID (ver server/observability.ts). Nunca alteram o
  // resultado retornado - só observam o que já aconteceu.
  onProviderCall?: (log: { provider: string; operation: string; status: string; latencyMs?: number; httpStatus?: number; source?: string; errorMessage?: string }) => void;
  onCandidateDiscarded?: (log: { name: string; domain?: string; reasonCode: 'duplicate_pre_cnpj_domain_or_name' | 'exceeds_requested_limit'; reason: string }) => void;
}): Promise<Lead[]> {
  const { query, limit, googleApiKey } = opts;
  const excludeDomains = opts.excludeDomains || new Set<string>();
  const excludeNames = opts.excludeNames || new Set<string>();

  // Clean up the conversational UI query to a strict Google Places query
  // Example UI query: "Transportadora e Logística (Operador Logístico 3PL) em Cajamar - SP com 501 a 1.000 colaboradores"
  const placesQuery = query
    .replace(/\(.*?\)/g, '') // Remove company type in parens
    .replace(/com\s.*?colaboradores/gi, '') // Remove employee count
    .replace(/\s+/g, ' ')
    .trim();

  // Wave 4 (CPI) - Provider Adapter: a chamada HTTP ao Google Places (timeout,
  // 429/5xx, latência) é responsabilidade do adapter, não desta função.
  const result = await searchPlaces(placesQuery, limit, googleApiKey);

  // Wave 10 (CPI) - Observabilidade: toda chamada real a um provider vira um
  // ProviderCallLog, reaproveitando o ProviderResult (status/latencyMs/source)
  // que o adapter já devolve - nunca um valor recalculado ou estimado aqui.
  opts.onProviderCall?.({
    provider: 'google_places',
    operation: 'text_search',
    status: result.status,
    latencyMs: result.latencyMs,
    httpStatus: result.httpStatus,
    source: result.source,
    errorMessage: result.errorMessage
  });

  if (result.status !== 'ok') {
    if (result.status === 'error' || result.status === 'timeout' || result.status === 'rate_limited') {
      console.warn(`[google_places] ${result.status}: ${result.errorMessage || result.httpStatus}`);
    }
    // not_configured / not_found / error / timeout / rate_limited: em todos os
    // casos, nenhum lead é inventado para preencher a lacuna.
    return [];
  }

  const mapped = result.data!.map((p, idx) => {
    const domain = cleanDomain(p.website) || `${slugify(p.name || 'empresa')}.com.br`;

    return {
      id: `place-${idx}`,
      name: p.name || 'Empresa não identificada',
      // CNPJ é resolvido a partir de fonte oficial na etapa seguinte do pipeline
      // (resolveAndEnrichCnpjForLead); nunca gerado aqui.
      address: p.address,
      phone: p.phone,
      website: p.website,
      domain: domain,
      rating: p.rating,
      total_ratings: p.totalRatings,
      // Wave 2 (CPI) - Requirement Engine: segment/company_type/employee_count/
      // annual_revenue NÃO são copiados do filtro de busca para o lead aqui.
      // O Places não observa nenhum desses atributos para uma empresa
      // específica; copiá-los do filtro do usuário seria fabricar um "fato"
      // observado a partir de um critério apenas solicitado. Esses campos só
      // recebem valor real quando um provider realmente os confirma (ex: CNAE
      // oficial da Receita Federal). O que o usuário pediu fica só no
      // SearchIntent/RequirementEvaluations do lead (ver /prospect).
      decision_makers: []
    };
  });

  // Wave 5 (CPI) - Entity Resolution & Dedup: mesma normalização usada para
  // montar excludeDomains/excludeNames (ver /prospect), para a comparação bater.
  const fresh = mapped.filter((lead: any) => {
    const domain = canonicalizeDomain(lead.domain);
    const name = normalizeCompanyName(lead.name);
    const isDuplicate = (domain && excludeDomains.has(domain)) || (name && excludeNames.has(name));
    if (isDuplicate) {
      opts.onCandidateDiscarded?.({
        name: lead.name,
        domain: lead.domain,
        reasonCode: 'duplicate_pre_cnpj_domain_or_name',
        reason: 'Domínio ou nome normalizado já pertence a um lead existente na base (checagem prévia à resolução de CNPJ oficial).'
      });
    }
    return !isDuplicate;
  });

  // Todos os resultados retornados já haviam sido prospectados nesta base -
  // ou nenhum resultado passou do slice(0, limit); nenhum lead é inventado
  // para completar a quantidade pedida.
  const withinLimit = fresh.slice(0, limit);
  fresh.slice(limit).forEach((lead: any) => {
    opts.onCandidateDiscarded?.({
      name: lead.name,
      domain: lead.domain,
      reasonCode: 'exceeds_requested_limit',
      reason: `O Google Places devolveu mais candidatos novos do que o limite pedido (${limit}); os excedentes não foram processados.`
    });
  });
  return withinLimit;
}

function normalizeLinkedInUrl(url?: string): string {
  if (!url) return '';
  let clean = url.trim();
  if (!clean) return '';
  if (clean.startsWith('http://')) {
    clean = 'https://' + clean.slice(7);
  }
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = 'https://' + clean;
  }
  clean = clean.replace('https://linkedin.com', 'https://www.linkedin.com');
  return clean;
}

const APOLLO_PREFERRED_TITLES = ['CEO', 'Founder', 'Owner', 'Presidente', 'Diretor', 'Gerente', 'Head', 'Sócio', 'VP', 'Operações', 'Logística', 'Comercial'];

export async function enrichLeadWithApollo(
  domain: string,
  companyName: string,
  apiKey?: string,
  preferredRole?: string,
  preferredTitles?: string[],
  // Wave 10 (CPI) - Observabilidade: hook opcional, ver findLeads acima.
  onProviderCall?: (log: { provider: string; operation: string; status: string; latencyMs?: number; httpStatus?: number; source?: string; errorMessage?: string }) => void
): Promise<{ decisionMakers: DecisionMaker[]; companyLinkedin?: string }> {
  const cleanDom = cleanDomain(domain);

  // Wave 4 (CPI) - Provider Adapter: as chamadas HTTP à Apollo (timeout, 429/5xx,
  // latência) são responsabilidade do adapter, não desta função.
  // Wave 9 (CPI) - Cost/Cache/Resiliência: falhas transitórias (timeout/429/5xx)
  // ganham algumas tentativas extras com backoff+jitter antes de desistir
  // (withProviderRetry nunca tenta de novo 'not_found'/'not_configured', que são
  // estados definitivos). Um circuit breaker por provider ("apollo") evita
  // insistir num provider claramente fora do ar - nunca inventa dado, só evita
  // gastar tempo/créditos numa chamada que provavelmente vai falhar de novo.
  const orgResult = await withProviderCircuitBreaker('apollo', () =>
    withProviderRetry(() => enrichOrganization(cleanDom, apiKey))
  );
  onProviderCall?.({
    provider: 'apollo',
    operation: 'organization_enrich',
    status: orgResult.status,
    latencyMs: orgResult.latencyMs,
    httpStatus: orgResult.httpStatus,
    source: orgResult.source,
    errorMessage: orgResult.errorMessage
  });
  const companyLinkedin = orgResult.status === 'ok' ? normalizeLinkedInUrl(orgResult.data!.linkedinUrl) : '';

  if (orgResult.status === 'error' || orgResult.status === 'timeout' || orgResult.status === 'rate_limited') {
    console.warn(`[apollo:organization/enrich] ${orgResult.status}: ${orgResult.errorMessage || orgResult.httpStatus}`);
  }

  // Cargo(s) marcados no combobox "Decisor Alvo" (múltipla escolha) restringem a
  // busca de pessoas do Apollo; sem nenhum marcado, cai na lista genérica ampla.
  const titlesToSearch = preferredTitles && preferredTitles.length > 0 ? preferredTitles : APOLLO_PREFERRED_TITLES;
  const peopleResult = await withProviderCircuitBreaker('apollo', () =>
    withProviderRetry(() => searchAndMatchPeople(cleanDom, companyName, titlesToSearch, apiKey))
  );
  onProviderCall?.({
    provider: 'apollo',
    operation: 'people_search',
    status: peopleResult.status,
    latencyMs: peopleResult.latencyMs,
    httpStatus: peopleResult.httpStatus,
    source: peopleResult.source,
    errorMessage: peopleResult.errorMessage
  });

  if (peopleResult.status === 'ok') {
    const dms: DecisionMaker[] = peopleResult.data!.map(p => ({
      name: p.name,
      title: p.title || preferredRole || '',
      email: p.email,
      emails: p.email ? [p.email] : [],
      phone: p.phone,
      phones: p.phone ? [p.phone] : [],
      linkedin: p.linkedinUrl ? normalizeLinkedInUrl(p.linkedinUrl) : ''
    }));

    if (dms.length > 0) {
      return { decisionMakers: dms, companyLinkedin };
    }
  } else if (peopleResult.status === 'error' || peopleResult.status === 'timeout' || peopleResult.status === 'rate_limited') {
    console.warn(`[apollo:people_search] ${peopleResult.status}: ${peopleResult.errorMessage || peopleResult.httpStatus}`);
  }

  // Sem match real via Apollo (ou sem chave configurada): o decisor permanece
  // desconhecido. Nenhum nome, e-mail, telefone ou LinkedIn é inventado.
  return { decisionMakers: [], companyLinkedin };
}

// Wave 9 (CPI) - Fallback real Apollo -> Hunter: o adapter formal
// (server/search/providers/hunter.provider.ts, follow-up do CPI) agora traz
// hunterDomainSearch/complementDecisionMakerEmailWithHunter, importados no
// topo deste arquivo - nada foi removido de comportamento, só extraído.

function cleanDomain(url: string): string {
  if (!url) return '';
  return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
}

function slugify(text: string): string {
  return text.toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}
