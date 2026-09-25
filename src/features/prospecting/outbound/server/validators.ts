// Validações de formato — não fazem NENHUMA chamada externa (isso já existe via
// CNPJ público/Hunter). Servem só para recusar, na escrita, um valor que não tem
// como estar certo (poucos dígitos, sem @, dígito verificador de CNPJ inválido),
// em vez de gravar silenciosamente e descobrir o problema só na hora de discar
// ou mandar e-mail.

export function isValidCnpjFormat(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;

  const calcCheckDigit = (base: string): number => {
    const weights = base.length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = base.split('').reduce((acc, digit, idx) => acc + Number(digit) * weights[idx], 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const base12 = digits.slice(0, 12);
  const d1 = calcCheckDigit(base12);
  const d2 = calcCheckDigit(base12 + String(d1));
  return digits === base12 + String(d1) + String(d2);
}

export function isValidEmailFormat(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhoneFormat(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 13;
}

// --- Wave 11 (CPI) - Security Hardening --------------------------------------

// Teto genérico para campos de texto livre vindos do usuário (comentários,
// roteiros customizados) que não têm validação de formato — só protege contra
// abuso (ex: mandar megabytes de texto num campo de "notas adicionais").
export const MAX_FREE_TEXT_LENGTH = 5000;

export function isWithinMaxLength(value: string, max: number = MAX_FREE_TEXT_LENGTH): boolean {
  return typeof value === 'string' && value.length <= max;
}

export interface UrlSafetyResult {
  safe: boolean;
  reason?: string;
}

// SSRF: valida uma URL fornecida pelo usuário (webhook do Bitrix24 ou qualquer
// outro destino configurável) ANTES de qualquer fetch() do servidor para ela.
// Exige https e recusa qualquer host que resolva, por endereço literal, para
// localhost/loopback/faixas privadas/link-local — ou seja, qualquer lugar de
// onde o próprio backend (ou a rede interna dele) poderia ser alvo de um
// "webhook" que na verdade aponta pra dentro.
//
// Limitação conhecida: isto checa apenas o endereço IP literal presente na URL
// (ou nomes óbvios como "localhost"). Não resolve DNS do hostname, então não
// protege contra DNS rebinding (um domínio público que resolve para um IP
// privado só no momento do fetch). Ver riscos residuais no CPI_BACKLOG.md.
export function isUrlSafeForOutboundWebhook(rawUrl: string): UrlSafetyResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { safe: false, reason: 'URL de webhook vazia ou inválida.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { safe: false, reason: 'URL de webhook malformada.' };
  }

  if (parsed.protocol !== 'https:') {
    return { safe: false, reason: 'URL de webhook precisa usar https://.' };
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();

  if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost')) {
    return { safe: false, reason: 'URL de webhook não pode apontar para localhost.' };
  }

  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const octets = ipv4Match.slice(1).map(Number);
    if (octets.some(o => o > 255)) {
      return { safe: false, reason: 'URL de webhook com endereço IPv4 inválido.' };
    }
    const [a, b] = octets;
    const isPrivateOrReserved =
      a === 127 || // 127.0.0.0/8 - loopback
      a === 10 || // 10.0.0.0/8 - privado
      (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12 - privado
      (a === 192 && b === 168) || // 192.168.0.0/16 - privado
      (a === 169 && b === 254) || // 169.254.0.0/16 - link-local
      a === 0; // 0.0.0.0/8 - "esta rede"
    if (isPrivateOrReserved) {
      return { safe: false, reason: 'URL de webhook não pode apontar para um IP privado, de loopback ou link-local.' };
    }
    return { safe: true };
  }

  if (hostname.includes(':')) {
    // Literal IPv6.
    if (hostname === '::1' || hostname === '::') {
      return { safe: false, reason: 'URL de webhook não pode apontar para um endereço IPv6 de loopback/não especificado.' };
    }
    if (hostname.startsWith('fe80:') || hostname.startsWith('fc') || hostname.startsWith('fd')) {
      // fe80::/10 (link-local) e fc00::/7 (unique local, "IPv6 privado").
      return { safe: false, reason: 'URL de webhook não pode apontar para um endereço IPv6 privado/link-local.' };
    }
  }

  return { safe: true };
}

// Nunca imprimir um segredo (API key, senha, token embutido em URL de webhook)
// inteiro em log — só os últimos 4 caracteres, para permitir diferenciar
// valores em debug sem expor o segredo em si.
export function maskSecret(value: string | undefined | null): string {
  if (!value) return '(vazio)';
  const trimmed = String(value);
  if (trimmed.length <= 4) return '****';
  return `****${trimmed.slice(-4)}`;
}

// Webhooks do Bitrix24 embutem o token de autenticação diretamente no path da
// URL (ex: https://empresa.bitrix24.com/rest/1/TOKEN/) — mascara cada segmento
// do path para permitir logar "para onde foi tentado o envio" sem vazar o token.
export function maskWebhookUrl(rawUrl: string | undefined | null): string {
  if (!rawUrl) return '(vazio)';
  try {
    const parsed = new URL(rawUrl);
    const maskedPath = parsed.pathname
      .split('/')
      .filter(Boolean)
      .map(segment => (segment.length > 4 ? `${segment.slice(0, 2)}***${segment.slice(-2)}` : '***'))
      .join('/');
    return `${parsed.protocol}//${parsed.host}/${maskedPath}`;
  } catch {
    return '(url inválida)';
  }
}
