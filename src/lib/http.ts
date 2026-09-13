export class HttpTimeoutError extends Error {
  constructor(public readonly timeoutMs: number) {
    super(`A requisição externa excedeu ${timeoutMs}ms`);
    this.name = 'HttpTimeoutError';
  }
}

/**
 * Lançado por `fetchWithTimeout` quando `allowedHosts` é informado e o host resolvido da URL não
 * está na lista — ver comentário de `allowedHosts` abaixo para o que isso protege.
 */
export class DisallowedHostError extends Error {
  constructor(public readonly host: string) {
    super(`Host não permitido para esta chamada: ${host}`);
    this.name = 'DisallowedHostError';
  }
}

/**
 * `fetchWithTimeout` é o cliente HTTP genérico para provedores externos de destino FIXO/hardcoded
 * no próprio código (Apollo, Hunter, GitHub, Google, YouTube, BrasilAPI, Nominatim, GDELT etc.) —
 * URL de usuário/tenant (webhook Bitrix24, PABX 3CX) nunca deve passar por aqui; esses usam
 * `safeFetch`/`assertSafeExternalUrl` (src/shared/security/urlGuard.ts), que valida contra IP
 * privado/reservado e faz pinning de DNS, algo que quebraria os provedores auto-hospedáveis
 * legítimos abaixo (Meilisearch/SearXNG/Voicebox rodam em endereço privado/loopback de propósito).
 *
 * `allowedHosts` é o único host (ou lista) para o qual esta chamada pode resolver — a query
 * string de vários desses provedores carrega texto de busca vindo de um request do usuário (nome
 * de empresa, domínio etc.), e sem essa checagem o CodeQL (`js/request-forgery`) não tem como
 * provar que esse texto nunca poderia mover o destino real da chamada, mesmo quando o host de
 * fato é sempre a constante hardcoded no arquivo de origem. Obrigatório (não opcional): a
 * proteção só vale alguma coisa se for impossível esquecer de passá-la num call site novo. Para
 * um provedor com host dinâmico controlado pelo operador (env var), não pelo usuário — ex.:
 * SearXNG, Meilisearch, Voicebox — passe uma lista derivada da própria env var (ex.:
 * `[new URL(searxngUrl).hostname]`), não uma constante fixa. Todo valor de `allowedHosts` neste
 * repositório já é minúsculo (literal ou vindo de `URL#hostname`, que o WHATWG URL Standard
 * sempre normaliza pra minúsculo) — por isso a comparação abaixo não precisa (e não deve, pro
 * CodeQL reconhecer o barrier) fazer `.toLowerCase()` nos dois lados dentro de um `.some()`.
 *
 * Nunca aceita `Request` como entrada (nenhum call site real precisa disso hoje — todos passam
 * uma URL simples): o sink de `fetch()` sempre recebe o mesmo objeto `URL` já parseado e conferido
 * contra `allowedHosts` (`url` abaixo), nunca o `input` original — sem ramo condicional que
 * reintroduza o valor não validado na chamada real, senão o CodeQL não consegue provar que o valor
 * que chega no sink é o mesmo que passou pela checagem.
 */
export async function fetchWithTimeout(
  input: string | URL,
  init: RequestInit = {},
  timeoutMs = 10_000,
  allowedHosts: readonly string[],
): Promise<Response> {
  const url = new URL(input);
  if (!allowedHosts.includes(url.hostname)) {
    throw new DisallowedHostError(url.hostname);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const signal = init.signal
    ? AbortSignal.any([init.signal, controller.signal])
    : controller.signal;

  try {
    return await fetch(url, { ...init, signal });
  } catch (error) {
    if (controller.signal.aborted) throw new HttpTimeoutError(timeoutMs);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Aplica um timeout a qualquer Promise que não aceite AbortSignal (ex: chamadas de SDKs de
 * terceiros que fazem fetch internamente sem expor essa opção). Diferente de fetchWithTimeout,
 * isto não cancela a operação original — só para de esperar por ela, para o chamador poder tratar
 * como falha em vez de travar indefinidamente.
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new HttpTimeoutError(timeoutMs)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
