export const AUTHORIZED_LOGIN_EMAILS = [
  'marcelo.nascimento@atlasgr.com.br',
  'joao.reis@atlasgr.com.br',
] as const;

export const AUTHORIZED_LOGIN_DOMAINS = ['atlasgr.com.br', 'totaltrac.com.br'] as const;

export function normalizeLoginEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isAuthorizedLoginEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return false;
  const normalized = normalizeLoginEmail(email);

  // Verifica se o e-mail exato está na lista de e-mails autorizados
  if (AUTHORIZED_LOGIN_EMAILS.some((authorizedEmail) => normalized === authorizedEmail)) {
    return true;
  }

  // Verifica se o domínio do e-mail é de um dos domínios corporativos da Birth Hub 360
  const domain = normalized.split('@')[1];
  if (domain && AUTHORIZED_LOGIN_DOMAINS.some((allowedDomain) => domain === allowedDomain)) {
    return true;
  }

  return false;
}

/**
 * Deriva do e-mail a QUAL OPERAÇÃO a conta pertence.
 *
 * Chamava-se `getTenantFromEmail` de quando a plataforma tinha duas marcas e a
 * marca visual coincidia com a operação. A identidade do produto é única agora
 * (Birth Hub 360, ver src/config/brand.ts) — o que esta função decide continua
 * existindo e é outra coisa: qual organização criar no primeiro cadastro
 * (src/lib/auth.ts) e qual playbook comercial abrir por padrão
 * (src/config/playbooks.ts).
 *
 * O isolamento real entre operações NÃO depende disto: é aplicado no backend
 * por `organizationId` (src/lib/tenant-prisma.ts). Aqui é só o padrão inicial.
 */
export function getTenantFromEmail(email: string): 'atlasgr' | 'totaltrac' {
  const normalized = normalizeLoginEmail(email);
  if (normalized.includes('totaltrac') || normalized.includes('totaltrack')) {
    return 'totaltrac';
  }
  return 'atlasgr';
}
