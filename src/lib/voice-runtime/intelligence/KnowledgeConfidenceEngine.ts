import { KnowledgeConfidence } from '../types';

export interface KnowledgeDocument {
  id: string;
  name: string;
  keyword: string;
  content: string;
  addedAt: number;
}

export class KnowledgeConfidenceEngine {
  // Below this score, a match is not reliable enough to be presented to the end user (or the
  // supervisor dashboard) as a confident fact. Callers MUST branch on `isLowConfidence` — never
  // infer certainty from `confidence` alone — see AGENTS.md "Missão da Onda 2" item 4.
  public static readonly CONFIDENCE_THRESHOLD = 0.6;

  public evaluateKnowledge(query: string, availableDocuments: KnowledgeDocument[]): KnowledgeConfidence {
    // RAG Simulator: In a real scenario, this would query a vector DB (Pinecone, PgVector).
    // Due to sandbox constraints, we simulate semantic search over JSON.

    let bestMatchScore = 0;
    let snippetUsed = 'Não encontrei informações específicas sobre isso.';
    let documentName = 'Unknown';
    let isUpToDate = false;

    // Simple keyword simulation
    const lowerQuery = query.toLowerCase();

    for (const doc of availableDocuments) {
        if (lowerQuery.includes(doc.keyword) || doc.content.toLowerCase().includes(lowerQuery)) {
            bestMatchScore = 0.85; // Simulated high confidence
            snippetUsed = doc.content;
            documentName = doc.name;
            isUpToDate = true;
            break;
        }
    }

    const isLowConfidence = bestMatchScore < KnowledgeConfidenceEngine.CONFIDENCE_THRESHOLD;

    return {
      source: 'Internal Knowledge Base',
      confidence: bestMatchScore,
      isUpToDate,
      document: documentName,
      version: 'v1.0',
      // Never let a low-confidence/no-match result read as an assertion of fact: prefix it so
      // any surface that renders `snippetUsed` verbatim (voice agent response, playground,
      // supervisor transcript) still carries the caveat even if it ignores `isLowConfidence`.
      snippetUsed: isLowConfidence
        ? `[Baixa confiança — verificar com um humano antes de repassar como fato] ${snippetUsed}`
        : snippetUsed,
      embeddingsScore: bestMatchScore,
      isLowConfidence
    };
  }
}

export const knowledgeConfidenceEngine = new KnowledgeConfidenceEngine();
