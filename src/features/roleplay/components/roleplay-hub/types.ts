// SpeechRecognitionLike/SpeechRecognitionEventLike/Window.SpeechRecognition agora são tipos
// ambient globais definidos em src/types/speech-recognition.d.ts (sem import necessário) — movidos
// de volta pra lá pra não colidir com a mesma declaração global usada por VoiceCommandWidget.tsx.

export interface CallMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
}

export interface Persona {
  id: string;
  label: string;
  desc: string;
}

export interface CallAnalysisResult {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  // Notas por critério do parecer técnico de sessão completa (generateRoleplayEvaluation) —
  // opcionais porque o estado de erro (evaluationError em RoleplayHub) nunca chega a produzir
  // um CallAnalysisResult com estes campos preenchidos.
  clarityScore?: number;
  objectionHandlingScore?: number;
  closingScore?: number;
  // null quando a avaliação foi gerada mas a persistência falhou (ver finishRoleplaySession) —
  // a sessão não fica disponível pra histórico, mas o parecer já foi entregue normalmente.
  sessionId?: string | null;
}

// Espelha RoleplaySessionHistoryItem (roleplay-session.service.ts no backend), exceto createdAt
// que chega como string ISO 8601 (serializado via JSON), não Date.
export interface RoleplayHistoryItem {
  id: string;
  personaId: string;
  personaLabel: string;
  difficulty: 'facil' | 'medio' | 'dificil';
  durationSeconds: number;
  overallScore: number;
  clarityScore: number;
  objectionHandlingScore: number;
  closingScore: number;
  strengths: string[];
  improvements: string[];
  summary: string;
  createdAt: string;
}
