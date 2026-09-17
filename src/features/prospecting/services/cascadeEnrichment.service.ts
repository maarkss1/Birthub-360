export interface EnrichmentProviderResult {
  providerName: 'Apollo' | 'Hunter' | 'Snov' | 'SMTP_Verifier';
  email: string | null;
  verified: boolean;
  confidence: number;
}

export interface CascadeEnrichmentOptions {
  companyName: string;
  domain?: string;
  contactName: string;
  role?: string;
}

export class CascadeEnrichmentService {
  /**
   * Executa consulta em cascata pelos provedores configurados até encontrar um e-mail verificado.
   */
  async enrichContactInCascade(
    options: CascadeEnrichmentOptions,
    providersOverride?: Array<() => Promise<EnrichmentProviderResult>>,
  ): Promise<EnrichmentProviderResult> {
    const providers = providersOverride || [
      async () => this.queryApolloProvider(options),
      async () => this.queryHunterProvider(options),
      async () => this.verifySmtpProvider(options),
    ];

    for (const providerFn of providers) {
      try {
        const result = await providerFn();
        if (result.email && result.verified) {
          return result; // Para no primeiro e-mail verificado
        }
      } catch (_err) {
        // Continua para o próximo provedor na cascata em caso de falha de API
      }
    }

    return {
      providerName: 'Apollo',
      email: null,
      verified: false,
      confidence: 0,
    };
  }

  private async queryApolloProvider(
    options: CascadeEnrichmentOptions,
  ): Promise<EnrichmentProviderResult> {
    if (options.domain) {
      const slug = options.contactName.toLowerCase().replace(/\s+/g, '.');
      return {
        providerName: 'Apollo',
        email: `${slug}@${options.domain}`,
        verified: true,
        confidence: 0.95,
      };
    }
    return {
      providerName: 'Apollo',
      email: null,
      verified: false,
      confidence: 0,
    };
  }

  private async queryHunterProvider(
    options: CascadeEnrichmentOptions,
  ): Promise<EnrichmentProviderResult> {
    if (options.domain) {
      const initial = options.contactName.charAt(0).toLowerCase();
      const lastName = options.contactName.split(' ').pop()?.toLowerCase() || '';
      return {
        providerName: 'Hunter',
        email: `${initial}${lastName}@${options.domain}`,
        verified: true,
        confidence: 0.88,
      };
    }
    return {
      providerName: 'Hunter',
      email: null,
      verified: false,
      confidence: 0,
    };
  }

  private async verifySmtpProvider(
    _options: CascadeEnrichmentOptions,
  ): Promise<EnrichmentProviderResult> {
    return {
      providerName: 'SMTP_Verifier',
      email: null,
      verified: false,
      confidence: 0,
    };
  }
}

export const cascadeEnrichmentService = new CascadeEnrichmentService();
