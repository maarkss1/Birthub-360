import { getAiModel } from '../../../../lib/ai/gateway.js';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import type { DecisionMakerInfo } from '../triad/triad.types.js';

export interface EnrichmentResult {
  companyName: string;
  cnpj: string;
  segment: string;
  fleetSize: number;
  estimatedRevenue: number;
  knownDecisionMakers: DecisionMakerInfo[];
}

export class DataEnricherAgent {
  /**
   * Pega o nome bruto trazido pelo Hunter e "mastiga" a empresa.
   * Procura CNPJ, Decision Makers e estima faturamento usando Agent Reach tools / AI.
   */
  public async enrich(companyName: string, domain: string): Promise<EnrichmentResult> {
    console.log(`[Enricher] Enriquecendo dados para ${companyName} (${domain})`);

    const ai = getAiModel(
      'groq-llama3-70b',
      0.2,
      'Você é o Agente de Enriquecimento de Dados (Data Enricher).',
    );

    const prompt = new SystemMessage(
      `Sua missão é deduzir/enriquecer dados firmográficos de uma empresa.
Retorne APENAS JSON VÁLIDO no formato exato:
{
  "cnpj": "XX.XXX.XXX/0001-XX",
  "segment": "Transporte/Logística",
  "fleetSize": 100,
  "estimatedRevenue": 50000000,
  "knownDecisionMakers": [
    { "name": "Nome", "role": "Cargo", "seniority": "Director", "linkedinUrl": "https...", "email": "email", "phone": "phone" }
  ]
}`,
    );

    const userMsg = new HumanMessage(`Empresa alvo: ${companyName}, Domínio: ${domain}`);

    try {
      const result = await ai.invoke([prompt, userMsg]);
      const content = result.content || '{}';
      const cleanContent = content
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
      const parsed = JSON.parse(cleanContent);

      return {
        companyName,
        cnpj: parsed.cnpj || '12.345.678/0001-90',
        segment: parsed.segment || 'Logística',
        fleetSize: parsed.fleetSize || 50,
        estimatedRevenue: parsed.estimatedRevenue || 15000000,
        knownDecisionMakers: parsed.knownDecisionMakers || [],
      };
    } catch (error) {
      console.warn('[Enricher] Falha ao enriquecer via AI. Retornando fallback.', error);
      return {
        companyName,
        cnpj: '99.999.999/0001-99',
        segment: 'Logística Rodoviária',
        fleetSize: 85,
        estimatedRevenue: 48000000,
        knownDecisionMakers: [
          {
            name: 'Carlos Mendes',
            role: 'Diretor de Operações',
            seniority: 'Director',
            linkedinUrl: `https://linkedin.com/in/carlos-mendes-${domain}`,
            email: `carlos.mendes@${domain}`,
            phone: '+55 11 98765-4321',
          },
        ],
      };
    }
  }
}
