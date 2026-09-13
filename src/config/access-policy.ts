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
//
// CodeQL (achado real, PR #454): a versão anterior era um único regex
// `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` — "polynomial regular expression used on
// uncontrolled data" (ReDoS). O segmento do meio (`[^\s@]+`) aceita `.`, então
// para uma entrada maliciosa sem `@` ou sem um `.` válido no fim (ex.:
// `!@!.!.!.!.!.!.!...`) o motor de regex tenta todas as formas de dividir
// esse trecho entre o `[^\s@]+` do meio e o `\.[^\s@]+$` final — custo
// exponencial no tamanho da entrada, rodando sobre um campo de e-mail vindo
// direto do usuário (login/cadastro) sem limite de tamanho antes desta
// checagem. Reescrito sem regex ambíguo: cada checagem abaixo é aplicada à
// string inteira de uma vez (sem precisar "voltar atrás" pra casar outro
// literal na mesma região), então não há ambiguidade pra explorar.
const NO_WHITESPACE_OR_AT = /^[^\s@]+$/;

/**
 * Verifica só se o e-mail tem formato válido — não há mais restrição por
 * domínio corporativo. O nome do símbolo foi mantido (em vez de renomear para
 * `isValidLoginEmail`) para não precisar tocar todos os pontos de chamada
 * (login, cadastro, reset de senha, middleware de sessão, convite de equipe);
 * o contrato (`string | null | undefined -> boolean`) continua o mesmo.
 */
export function isAuthorizedLoginEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return false;
  const normalized = normalizeLoginEmail(email);

  const atIndex = normalized.indexOf('@');
  if (atIndex <= 0 || normalized.indexOf('@', atIndex + 1) !== -1) return false;

  const local = normalized.slice(0, atIndex);
  const domain = normalized.slice(atIndex + 1);
  if (!NO_WHITESPACE_OR_AT.test(local) || !NO_WHITESPACE_OR_AT.test(domain)) return false;

  const dotIndex = domain.lastIndexOf('.');
  return dotIndex > 0 && dotIndex < domain.length - 1;
}
