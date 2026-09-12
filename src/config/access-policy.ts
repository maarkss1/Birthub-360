/**
 * Política de acesso ao login/cadastro.
 *
 * O isolamento real entre organizações nunca dependeu disto — é aplicado no
 * backend por `organizationId`/RLS (ver src/lib/tenant-prisma.ts).
 */

export function normalizeLoginEmail(email: string): string {
  return email.trim().toLowerCase();
}

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isAuthorizedLoginEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return false;
  return EMAIL_FORMAT.test(normalizeLoginEmail(email));
}

/**
 * Deriva do e-mail um rótulo de segmento para exibição no cliente.
 * Após a unificação da marca, retorna um único tenant padrão.
 */
export function getTenantFromEmail(_email: string): 'birthub360' {
  return 'birthub360';
}
