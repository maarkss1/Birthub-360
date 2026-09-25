// ARCH-009 (auditoria de dívida técnica): este arquivo era um único StudioService.generate() de
// 743 linhas — cada "kind" tinha seu próprio schema Zod, prompt e chamada de modelo, sem
// compartilhar lógica de verdade entre si (por isso a complexidade ciclomática proxy era baixa
// apesar do tamanho: era um if-chain reto, não lógica emaranhada). Decomposto em
// studio/schema.ts (contratos), studio/shared.ts (helpers de invocação de modelo compartilhados)
// e studio/generators/*.ts (um gerador por "kind"). Este arquivo agora só orquestra.

import { generateAssistant } from './studio/generators/assistant';
import { generateAutomation } from './studio/generators/automation';
import { generateB2bMatrix } from './studio/generators/b2bMatrix';
import { generateCallScript } from './studio/generators/callScript';
import { generateEmail } from './studio/generators/email';
import { generateMessage } from './studio/generators/message';
import { generateMethodology } from './studio/generators/methodology';
import { generateOcrExtract } from './studio/generators/ocrExtract';
import { generateRoleplay, generateRoleplayEvaluation } from './studio/generators/roleplay';
import { generateScript } from './studio/generators/script';
import { generateSuperagent } from './studio/generators/superagent';
import { generateTraining } from './studio/generators/training';
import type { StudioGenerationRequest } from './studio/schema';

export {
  assistantRequestSchema,
  type StudioGenerationRequest,
  studioGenerationSchema,
} from './studio/schema';

export class StudioService {
  async generate(request: StudioGenerationRequest): Promise<unknown> {
    switch (request.kind) {
      case 'email':
        return generateEmail(request);
      case 'call_script':
        return generateCallScript(request);
      case 'message':
        return generateMessage(request);
      case 'ocr_extract':
        return generateOcrExtract(request);
      case 'b2b_matrix':
        return generateB2bMatrix(request);
      case 'training':
        return generateTraining(request);
      case 'methodology':
        return generateMethodology(request);
      case 'script':
        return generateScript(request);
      case 'automation':
        return generateAutomation(request);
      case 'assistant':
        return generateAssistant(request);
      case 'roleplay':
        return generateRoleplay(request);
      case 'roleplay_evaluation':
        return generateRoleplayEvaluation(request);
      case 'superagent':
        return generateSuperagent(request);
    }
  }
}

export const studioService = new StudioService();
