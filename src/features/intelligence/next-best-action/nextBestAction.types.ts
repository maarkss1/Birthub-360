export interface NextBestActionContext {
  organizationId: string;
  actorUserId?: string;

  missionId: string;
  accountName: string;

  scores: {
    icpScore?: number;
    fitScore?: number;
    intentScore?: number;
    engagementScore?: number;
  };

  interactionHistory: Array<{
    type: string;
    channel?: string;
    date: Date;
    outcome?: string;
  }>;

  strategyContext?: {
    painPoints?: string[];
    valueProposition?: string;
    targetPersona?: string;
  };

  currentDateTime: Date;
}

export interface NBAEvidence {
  type: string;
  source?: string;
  value: string;
}

export interface NextBestActionDecision {
  actionType:
    | 'CALL'
    | 'EMAIL'
    | 'WHATSAPP'
    | 'LINKEDIN'
    | 'MEETING'
    | 'FOLLOW_UP'
    | 'WAIT'
    | 'ESCALATE'
    | 'RESEARCH'
    | 'QUALIFY'
    | 'DISQUALIFY';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  channel?: string;
  scheduledFor?: Date;
  objective: string;
  rationale: string;
  recommendedMessage?: string;
  evidence: NBAEvidence[];
  confidence: number;
  requiresApproval: boolean;
}
