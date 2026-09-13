/**
 * Política de acesso ao login/cadastro.
 *
 * Até 09/2026 esta política restringia o cadastro a e-mails dos domínios
 * corporativos das duas marcas então existentes (@atlasgr.com.br,
 * @totaltrac.com.br) — fazia sentido quando a plataforma servia só essas duas
 * empresas. Com o rebranding para Birth Hub 360º (marca única, ICP "qualquer
 * empresa com área comercial que queira automatizar ponta a ponta" — ver
 * docs/BrandConstitution.md e src/config/brand.ts), manter esse allowlist
 * bloquearia o próprio público-alvo do produto de se cadastrar. Removida por
 * pedido explícito do usuário.
 *
 * O isolamento real entre organizações nunca dependeu disto — é aplicado no
 * backend por `organizationId`/RLS (ver src/lib/tenant-prisma.ts). Esta
 * política só decidia QUEM pode criar conta, não separação de dado nenhuma.
 */

export function normalizeLoginEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Mesmo padrão já usado em src/features/prospecting/services/email-verification.service.ts —
// validação de formato, não de domínio autorizado.
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Verifica só se o e-mail tem formato válido — não há mais restrição por
 * domínio corporativo. O nome do símbolo foi mantido (em vez de renomear para
 * `isValidLoginEmail`) para não precisar tocar todos os pontos de chamada
 * (login, cadastro, reset de senha, middleware de sessão, convite de equipe);
 * o contrato (`string | null | undefined -> boolean`) continua o mesmo.
 */
export function isAuthorizedLoginEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return false;
  return EMAIL_FORMAT.test(normalizeLoginEmail(email));
}
