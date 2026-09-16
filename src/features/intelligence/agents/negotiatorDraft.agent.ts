import { BaseAgent } from './base.agent.js';
import { SWARM_BRAND, SWARM_UNTRUSTED_CONTENT_GUARD } from './swarm.constants.js';

/**
 * Negociador de IA em segundo plano (item 3 do pedido de IA Agêntica de Vendas): diferente do
 * CloserAgent/BDRAgent (que produzem uma ANÁLISE em markdown para o vendedor ler), este agente
 * produz a PRÓPRIA MENSAGEM a ser enviada ao lead em resposta a algo que ele escreveu — texto
 * puro, curto, pronto para sair como réplica de WhatsApp. Os dois nunca se confundem: a análise
 * do Closer continua alimentando `swarm_recommendation`; este agente alimenta exclusivamente
 * `send_whatsapp_reply`, sempre como sugestão pendente de aprovação humana (ver
 * negotiatorReply.service.ts e aiPendingAction.service.ts — nenhum envio automático nesta versão).
 *
 * Deliberadamente NÃO herda `appendLearnedStyle`: o "estilo aprendido" registrado hoje
 * (learning.agent.ts) foi calibrado sobre a saída em markdown do Closer/BDR/CRM, e aplicar essas
 * preferências aqui arriscaria reintroduzir formatação (blockquote, cabeçalho) que o contrato de
 * saída deste agente proíbe explicitamente.
 */
export class NegotiatorDraftAgent extends BaseAgent {
  protected agentType = 'NEGOTIATOR_DRAFT';
  protected modelName = 'local-llama3-fast';
  protected temperature = 0.35;

  protected buildSystemPrompt(): string {
    return `Você redige, em nome de um vendedor humano da ${SWARM_BRAND}, a PRÓXIMA MENSAGEM de WhatsApp em resposta a algo que um lead acabou de escrever.

REGRAS RÍGIDAS, NUNCA NEGOCIÁVEIS:
1. Responda APENAS com o texto da mensagem a enviar. Nunca markdown, nunca blockquote, nunca cabeçalho, nunca aspas envolvendo a mensagem, nunca explicação sobre a própria mensagem.
2. Tom humano, direto, como um vendedor brasileiro experiente escreveria no WhatsApp — frases curtas, sem jargão corporativo, sem emoji em excesso (no máximo 1, e só se o contexto pedir informalidade).
3. Nunca invente fato, preço, prazo, desconto ou condição que não estejam explicitamente no contexto fornecido.
4. Se o lead pediu desconto, prazo ou condição especial fora do que o contexto autoriza, reconheça o pedido e diga que vai confirmar — nunca prometa o valor.
5. No máximo 4 frases curtas. É uma mensagem de WhatsApp, não um e-mail.
6. Nunca assine como IA, bot ou assistente — a mensagem é enviada em nome do vendedor responsável pelo lead, sem assinatura explícita (o WhatsApp já identifica o remetente).
7. Se o contexto fornecido não for suficiente para responder com segurança (faltam dados que o lead pediu), escreva uma mensagem curta reconhecendo a pergunta e informando que vai verificar — nunca invente a resposta para preencher a lacuna.

${SWARM_UNTRUSTED_CONTENT_GUARD}`;
  }

  protected buildHumanMessage(input: string): string {
    return `Contexto da conversa e da oportunidade:\n${input}\n\nEscreva agora somente o texto da mensagem de WhatsApp a enviar.`;
  }

  async run(inputData: string, sessionId?: string) {
    const result = await super.run(inputData, sessionId);
    return {
      reply: result.output as string | undefined,
      error: result.error,
      sessionId: result.sessionId,
    };
  }
}
