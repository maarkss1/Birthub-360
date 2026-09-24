// Wave 12 (CPI) — CRM/Operação: gate executado ANTES de qualquer envio ao Bitrix24.
//
// Este módulo NUNCA inventa dado. Ele só lê flags/campos que já existem no objeto
// Lead (produzidos por server/cnpj.ts e server/routes.ts em etapas anteriores do
// pipeline) e decide se aquele registro é seguro o bastante para chegar num
// vendedor/CRM como se fosse fato confirmado.
//
// IMPORTANTE — dependência da Wave 0: neste branch, server/cnpj.ts ainda contém um
// fallback determinístico (generateDeterministicCnpjProfile) que preenche
// situação cadastral / CNAE / capital social / QSA / telefone / e-mail com valores
// FIXOS e INVENTADOS quando as APIs públicas de CNPJ falham, e resolveAndEnrichCnpjForLead
// chega a fabricar o próprio número de CNPJ a partir de um hash do nome da empresa
// quando nenhum CNPJ é conhecido. Isso é exatamente o tipo de fabricação que a Wave 0
// deste roteiro existe para eliminar — mas a Wave 0 (branch `claude/leia-e-execute-lxpl2o`)
// não estava mesclada neste worktree no momento em que a Wave 12 foi implementada.
//
// Consequência prática: `lead.is_estimated` só fica `true` quando a Receita Federal
// devolve resposta SEM situação cadastral/CNAE/capital social — mas o fallback
// determinístico preenche todos esses campos com valores inventados, então
// `is_estimated` pode ler `false` mesmo para um registro 100% sintético. Este módulo
// não tem como fechar essa lacuna sozinho (não há, hoje, um flag "is_fabricated"
// no Lead). Trate `eligible: true` como "nenhum sinal de risco conhecido foi
// encontrado nos campos disponíveis", não como uma garantia criptográfica de que o
// dado é 100% real. Ver docs/CPI_BACKLOG.md, seção "Wave 12", riscos residuais —
// a lacuna fecha de verdade quando a Wave 0 for mesclada neste branch.

export type ExportPolicy = 'strict' | 'lenient';

// E-mails de decisor no pipeline hoje vêm de scraping/Apollo — nunca chegam
// "verified" por padrão. `email_verification_status` é um campo opcional,
// forward-compatible com o resultado do Hunter.io (server/routes.ts,
// '/integrations/hunter/verify') e com o verificationStatus da Wave 6 (Evidence),
// para quando qualquer uma dessas integrações passar a persistir o resultado no
// Lead. Enquanto isso não acontece, ausência do campo é tratada como "não verificado".
export type EmailVerificationStatus = 'valid' | 'invalid' | 'accept_all' | 'webmail' | 'disposable' | 'unknown' | string;

export interface ExportEligibilityLead {
  id?: string;
  cnpj?: string;
  // true quando server/cnpj.ts efetivamente consultou uma fonte (mesmo que o
  // resultado tenha vindo de fallback — ver aviso acima sobre a lacuna da Wave 0).
  cnpj_consultado?: boolean;
  // true quando situação cadastral/CNAE/capital social não vieram confirmados da
  // Receita Federal e foram preenchidos com placeholder (server/routes.ts).
  is_estimated?: boolean;
  bitrix_check_status?: 'existing_client' | 'existing_lead' | 'new' | 'unchecked' | string;
  decision_maker_email?: string;
  decision_maker_emails?: string[];
  email_verification_status?: EmailVerificationStatus;
}

export interface ExportEligibilityResult {
  eligible: boolean;
  policy: ExportPolicy;
  // Motivos que efetivamente tornaram o lead inelegível (respeitando a política).
  reasons: string[];
  // Todo alerta identificado, mesmo os que não bloqueiam sob a política atual —
  // útil para o frontend mostrar "exportado com ressalvas".
  warnings: string[];
}

const VERIFIED_EMAIL_STATUSES = new Set<string>(['valid']);

function isConfirmedCnpj(lead: ExportEligibilityLead): { confirmed: boolean; reason?: string } {
  const digits = (lead.cnpj || '').replace(/\D/g, '');
  const hasCnpj = digits.length === 14;

  if (!hasCnpj) {
    return { confirmed: false, reason: 'Lead sem CNPJ — nenhuma fonte oficial identificou a empresa.' };
  }
  if (lead.cnpj_consultado !== true) {
    return {
      confirmed: false,
      reason: 'CNPJ presente, porém nunca consultado em fonte oficial (cnpj_consultado=false) — origem não confirmada.'
    };
  }
  if (lead.is_estimated === true) {
    return {
      confirmed: false,
      reason: 'Situação cadastral/CNAE/capital social não confirmados na Receita Federal — dados fiscais estimados (is_estimated=true).'
    };
  }
  return { confirmed: true };
}

/**
 * Decide se um lead pode ser exportado ao Bitrix24.
 *
 * Política:
 * - 'strict'  (recomendado quando a verificação de CNPJ/e-mail estiver íntegra):
 *   qualquer sinal de dado não confirmado (CNPJ, e-mail do decisor) BLOQUEIA a
 *   exportação — os motivos aparecem em `reasons` e `eligible` fica `false`.
 * - 'lenient' (default operacional atual — ver server/routes.ts): os mesmos sinais
 *   viram apenas `warnings`, sem bloquear, para não travar o uso comercial
 *   enquanto Hunter/Evidence (Wave 6/8) não persistem verificação por lead.
 *
 * Uma condição, porém, NUNCA depende da política: lead já cadastrado como
 * Cliente/Contato existente no Bitrix (`bitrix_check_status === 'existing_client'`)
 * sempre bloqueia — evitar duplicidade de cadastro é uma regra de integridade de
 * dado no CRM, não uma questão de confiança/qualidade da informação.
 */
export function checkExportEligibility(
  lead: ExportEligibilityLead,
  policy: ExportPolicy = 'strict'
): ExportEligibilityResult {
  const reasons: string[] = [];
  const warnings: string[] = [];

  // Regra 1 — CNPJ oficial confirmado.
  const cnpjCheck = isConfirmedCnpj(lead);
  if (!cnpjCheck.confirmed && cnpjCheck.reason) {
    warnings.push(cnpjCheck.reason);
    if (policy === 'strict') reasons.push(cnpjCheck.reason);
  }

  // Regra 2 — e-mail do decisor verificado (quando existe e-mail para checar).
  const email = lead.decision_maker_email || (lead.decision_maker_emails && lead.decision_maker_emails[0]) || '';
  if (email) {
    const status = lead.email_verification_status || 'unverified';
    if (!VERIFIED_EMAIL_STATUSES.has(status)) {
      const msg = `E-mail do decisor (${email}) apenas inferido/não verificado (status: ${status}) e a política exige verificação.`;
      warnings.push(msg);
      if (policy === 'strict') reasons.push(msg);
    }
  }

  // Regra 3 — duplicidade: já é Cliente/Contato existente no Bitrix. Sempre bloqueia.
  if (lead.bitrix_check_status === 'existing_client') {
    const msg = 'Empresa já é Cliente/Contato existente no Bitrix24 — exportar de novo criaria duplicidade de cadastro.';
    warnings.push(msg);
    reasons.push(msg);
  } else if (lead.bitrix_check_status === 'existing_lead') {
    // Ainda não é cliente — pode ser legítimo reenviar para atualizar o Lead
    // existente, então isso fica só como aviso, não como bloqueio automático.
    warnings.push('Empresa já existe como Lead no Bitrix24 (ainda não convertida) — confirme antes de duplicar.');
  }

  return { eligible: reasons.length === 0, policy, reasons, warnings };
}
