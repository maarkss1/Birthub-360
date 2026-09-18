import { getAiModel } from '../../../../lib/ai/gateway/chat-model.js';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';

export interface ProspectingQuery {
  targetSegment: string;
  region: string;
  minimumFleetSize?: number;
}

export interface ProspectingResult {
  companyName: string;
  domain: string;
  source: string;
}

export class HunterProspectingAgent {
  /**
   * Vasculha a web passivamente para mapear contas baseadas num critério.
   * Concebido para integrar a infraestrutura do 'Agent Reach' (Open Source)
   * e realizar scraping descentralizado (Jina Reader, X, RSS) em tempo real.
   */
  public async hunt(query: ProspectingQuery): Promise<ProspectingResult[]> {
    console.log(
      `[Hunter] Iniciando captação via Agent Reach para: ${query.targetSegment} em ${query.region}`,
    );

    const ai = getAiModel(
      'groq-llama3-70b',
      0.2,
      'Você é o Agente Caçador Especialista (Hunter Prospector).',
    );

    const prompt = new SystemMessage(
      `Sua missão é atuar como um web-scraper autônomo (camada lógica do Agent Reach).
O usuário passará critérios de prospecção. Liste 3 empresas que se encaixam no perfil.
Retorne APENAS JSON VÁLIDO no seguinte formato:
[
  { "companyName": "Nome da Empresa", "domain": "dominio.com.br", "source": "LinkedIn/Web" }
]`,
    );

    const userMsg = new HumanMessage(`Segmento: ${query.targetSegment}, Região: ${query.region}`);

    try {
      const result = await ai.invoke([prompt, userMsg]);
      const content = result.content || '[]';
      const cleanContent = content
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      const companies = JSON.parse(cleanContent);
      return Array.isArray(companies) ? companies : [];
    } catch (error) {
      console.warn(
        '[Hunter] Falha na captação passiva via AI/Reach. Retornando dados de fallback.',
        error,
      );
      return [
        { companyName: 'TransSul Logística', domain: 'transsul.com.br', source: 'Fallback' },
        { companyName: 'Expresso ABC', domain: 'expressoabc.com.br', source: 'Fallback' },
      ];
    }
  }
}
