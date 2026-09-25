// ARCH-009 (auditoria de dívida técnica): este arquivo era um único StudioService.generate() de
// 743 linhas — cada "kind" tinha seu próprio schema Zod, prompt e chamada de modelo, sem
// compartilhar lógica de verdade entre si (por isso a complexidade ciclomática proxy era baixa
// apesar do tamanho: era um if-chain reto, não lógica emaranhada). Decomposto em
// studio/schema.ts (contratos), studio/shared.ts (helpers de invocação de modelo compartilhados)
// e studio/generators/*.ts (um gerador por "kind"). Este arquivo agora só orquestra.

import { generateAssistant } from './studio/generators/assistant.js';
import { generateAutomation } from './studio/generators/automation.js';
import { generateB2bMatrix } from './studio/generators/b2bMatrix.js';
import { generateCallScript } from './studio/generators/callScript.js';
import { generateEmail } from './studio/generators/email.js';
import { generateMessage } from './studio/generators/message.js';
import { generateMethodology } from './studio/generators/methodology.js';
import { generateOcrExtract } from './studio/generators/ocrExtract.js';
import { generateRoleplay, generateRoleplayEvaluation } from './studio/generators/roleplay.js';
import { generateScript } from './studio/generators/script.js';
import { generateSuperagent } from './studio/generators/superagent.js';
import { generateTraining } from './studio/generators/training.js';
import type { StudioGenerationRequest } from './studio/schema.js';

export {
  assistantRequestSchema,
  type StudioGenerationRequest,
  studioGenerationSchema,
} from './studio/schema.js';

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
