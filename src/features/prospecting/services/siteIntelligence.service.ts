import type { SiteIntelligence } from '../domain/prospectTypes.js';
import { normalizeCompanyDomain } from '../utils/domain.js';
import {
  buildProviderCacheKey,
  withProviderCache,
} from './providerCache.js';

const SITE_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 dias

interface ScrapeOptions {
  timeoutMs?: number;
  forceRefresh?: boolean;
}

/**
 * Heurística de extração de proposta de valor e produtos a partir de texto limpo/markdown.
 */
function extractInsightsFromMarkdown(
  markdown: string,
  metaDescription?: string | null,
): {
  valueProposition: string | null;
  productsAndServices: string[];
  technologies: string[];
} {
  const lines = markdown
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 20 && !l.startsWith('!') && !l.startsWith('['));

  // Proposta de valor: primeiro parágrafo de texto relevante ou meta-description
  let valueProposition: string | null = metaDescription?.trim() || null;
  if (!valueProposition && lines.length > 0) {
    valueProposition = lines.find((l) => !l.startsWith('#') && l.length > 30) || lines[0] || null;
  }

  // Identificação de palavras-chave de produtos/serviços
  const productsAndServices: string[] = [];
  const techKeywords = [
    'React', 'Vue', 'Next.js', 'Angular', 'Node.js', 'Python', 'Django', 'FastAPI',
    'PostgreSQL', 'MySQL', 'MongoDB', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP',
    'Shopify', 'VTEX', 'WordPress', 'WooCommerce', 'Magento', 'HubSpot', 'Salesforce',
    'Bitrix24', 'Zendesk', 'Stripe', 'Pagar.me', 'Mercado Pago', 'RD Station',
  ];

  const detectedTechs: string[] = [];
  const lowerMarkdown = markdown.toLowerCase();

  for (const tech of techKeywords) {
    if (lowerMarkdown.includes(tech.toLowerCase())) {
      detectedTechs.push(tech);
    }
  }

  // Busca tópicos em listas que indiquem produtos ou soluções
  const listItems = markdown
    .split('\n')
    .filter((l) => l.startsWith('- ') || l.startsWith('* '))
    .map((l) => l.replace(/^[-*]\s+/, '').trim())
    .filter((l) => l.length > 5 && l.length < 80);

  if (listItems.length > 0) {
    productsAndServices.push(...listItems.slice(0, 5));
  }

  return {
    valueProposition: valueProposition ? valueProposition.slice(0, 500) : null,
    productsAndServices: productsAndServices.slice(0, 6),
    technologies: detectedTechs.slice(0, 10),
  };
}

/**
 * Consulta a API do Firecrawl (se configurado ou self-hosted).
 */
async function scrapeWithFirecrawl(
  targetUrl: string,
  apiKey?: string,
  firecrawlBaseUrl = 'http://127.0.0.1:3002',
  timeoutMs = 10_000,
): Promise<{ title?: string; description?: string; markdown?: string } | null> {
  const url = `${firecrawlBaseUrl.replace(/\/$/, '')}/v1/scrape`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        url: targetUrl,
        formats: ['markdown'],
        onlyMainContent: true,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      return null;
    }

    const json = (await res.json()) as {
      success?: boolean;
      data?: {
        metadata?: { title?: string; description?: string };
        markdown?: string;
      };
    };

    if (!json.success && !json.data) return null;

    return {
      title: json.data?.metadata?.title,
      description: json.data?.metadata?.description,
      markdown: json.data?.markdown,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Consulta a API do Crawl4AI (se configurado).
 */
async function scrapeWithCrawl4Ai(
  targetUrl: string,
  crawl4aiBaseUrl = 'http://127.0.0.1:11235',
  timeoutMs = 10_000,
): Promise<{ title?: string; description?: string; markdown?: string } | null> {
  const url = `${crawl4aiBaseUrl.replace(/\/$/, '')}/crawl`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        urls: [targetUrl],
        priority: 10,
      }),
      signal: controller.signal,
    });

    if (!res.ok) return null;

    const json = (await res.json()) as {
      results?: Array<{
        markdown?: string;
        metadata?: { title?: string; description?: string };
      }>;
    };

    const first = json.results?.[0];
    if (!first) return null;

    return {
      title: first.metadata?.title,
      description: first.metadata?.description,
      markdown: first.markdown,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fallback simples e seguro: requisição HTTP direta com extração de metadados HTML.
 */
async function scrapeWithHtmlFallback(
  targetUrl: string,
  timeoutMs = 6_000,
): Promise<{ title?: string; description?: string; markdown?: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BirthubBot/1.0; +https://birthub360.com)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
    });

    if (!res.ok) return null;
    const html = await res.text();

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const descMatch =
      html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i) ||
      html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);

    const title = titleMatch?.[1]?.trim() || undefined;
    const description = descMatch?.[1]?.trim() || undefined;

    // Extrai texto simples retirando tags
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const textContent = (bodyMatch ? bodyMatch[1] : html)
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      title,
      description,
      markdown: textContent.slice(0, 4_000),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Enriquecimento de Inteligência de Site (Web Scraping & RAG para SDR).
 * Tenta Firecrawl -> Crawl4AI -> Fallback com cache persistente.
 */
export async function fetchSiteIntelligence(
  domainOrUrl: string,
  options: ScrapeOptions = {},
): Promise<SiteIntelligence | null> {
  const domain = normalizeCompanyDomain(domainOrUrl);
  if (!domain) return null;

  const targetUrl = domainOrUrl.includes('://') ? domainOrUrl : `https://${domain}`;
  const cacheKey = buildProviderCacheKey('site_intel', 'scrape', { domain });

  return withProviderCache<SiteIntelligence | null>(
    cacheKey,
    async () => {
      const timeoutMs = options.timeoutMs ?? 10_000;
      const firecrawlUrl = process.env.FIRECRAWL_URL;
      const firecrawlKey = process.env.FIRECRAWL_API_KEY;
      const crawl4aiUrl = process.env.CRAWL4AI_URL;

      let scraped: { title?: string; description?: string; markdown?: string } | null = null;
      let source: 'firecrawl' | 'crawl4ai' | 'scraper' = 'scraper';

      // 1. Tenta Firecrawl se configurado ou se URL explícita informada
      if (firecrawlUrl || firecrawlKey) {
        scraped = await scrapeWithFirecrawl(targetUrl, firecrawlKey, firecrawlUrl, timeoutMs);
        if (scraped) source = 'firecrawl';
      }

      // 2. Tenta Crawl4AI se Firecrawl não retornou e Crawl4AI estiver configurado
      if (!scraped && crawl4aiUrl) {
        scraped = await scrapeWithCrawl4Ai(targetUrl, crawl4aiUrl, timeoutMs);
        if (scraped) source = 'crawl4ai';
      }

      // 3. Fallback nativo
      if (!scraped) {
        scraped = await scrapeWithHtmlFallback(targetUrl, Math.min(timeoutMs, 6_000));
        source = 'scraper';
      }

      if (!scraped) {
        return null;
      }

      const insights = extractInsightsFromMarkdown(scraped.markdown || '', scraped.description);

      return {
        url: targetUrl,
        domain,
        title: scraped.title || null,
        description: scraped.description || null,
        valueProposition: insights.valueProposition,
        productsAndServices: insights.productsAndServices,
        technologies: insights.technologies,
        targetAudience: null,
        rawSummary: scraped.markdown ? scraped.markdown.slice(0, 1_000) : null,
        scrapedAt: new Date().toISOString(),
        source,
      };
    },
    {
      ttlSeconds: SITE_CACHE_TTL_SECONDS,
      shouldCache: (val) => val !== null,
    },
  );
}
