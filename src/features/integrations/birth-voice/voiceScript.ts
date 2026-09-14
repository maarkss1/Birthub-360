/**
 * VOICE-001 (auditoria multiagente, 09/2026): este roteiro era hardcoded para uma única marca
 * (Atlas GR — nome "Gessica", histórico "nasceu em 2004... 390 clientes", produtos "Atlas
 * Profile"/"CIA"). Qualquer outra organização que configurasse uma `VoiceHubConnection` própria
 * (tela de Integrações) recebia a IA se apresentando como "Gessica da Atlas GR" e oferecendo
 * produtos de gestão de risco de frota para os próprios leads dela — uma identidade e um catálogo
 * de produtos que não são dela. Substituído por um roteiro genérico, interpolado a partir de
 * `VoiceHubConnection.scriptPersonaName/scriptCompanyDescription/scriptOfferText/scriptClosingLine`
 * (nulo = organização ainda não configurou o script próprio na tela de Integrações).
 *
 * As DUAS frases de abertura obrigatórias (transparência/LGPD) e as frases de leitura de humor
 * humano permanecem fixas — não são identidade de marca, são requisito de compliance e de tom de
 * produto. `birthVoice.helpers.ts::AI_DISCLOSURE_PHRASES`/`RECORDING_DISCLOSURE_PHRASES` casam
 * contra o texto exato delas para detectar consentimento na transcrição — não reescreva essas duas
 * linhas sem atualizar as duas listas lá também.
 */

export interface VoiceScriptConfig {
  /** Nome que a IA usa para se apresentar. Sem valor: "uma assistente de inteligência artificial". */
  personaName?: string | null;
  /** O que a empresa faz/vende, em texto livre escrito pela própria organização. */
  companyDescription?: string | null;
  /** Oferta/gatilho opcional mencionado na ligação (ex.: um teste grátis). */
  offerText?: string | null;
  /** Frase de encerramento customizada. */
  closingLine?: string | null;
}

function buildPersonaIntro(
  personaName: string | null | undefined,
  organizationName: string,
): string {
  const intro = personaName
    ? `Aqui é ${personaName}, uma assistente de inteligência artificial da ${organizationName}.`
    : `Aqui é uma assistente de inteligência artificial da ${organizationName}.`;
  return `"Oi! ${intro}"`;
}

function buildAboutSection(
  companyDescription: string | null | undefined,
  organizationName: string,
): string {
  if (companyDescription?.trim()) {
    return `# QUEM SOMOS\n${companyDescription.trim()}`;
  }
  return `# QUEM SOMOS\nVocê está ligando em nome da ${organizationName}. Foque em entender a necessidade do interlocutor antes de falar sobre soluções — não invente produtos, números ou histórico da empresa que não foram fornecidos a você.`;
}

function buildOfferSection(offerText: string | null | undefined): string {
  if (!offerText?.trim()) return '';
  return `\n\n# GATILHOS E ARGUMENTOS\n${offerText.trim()}`;
}

function buildClosingSection(closingLine: string | null | undefined): string {
  const line =
    closingLine?.trim() || 'Muito obrigada pela atenção! Tenha um excelente dia. Até breve!';
  return `# ENCERRAMENTO\nAo finalizar qualquer conversa (seja agendando a reunião ou se despedindo educadamente): "${line}"`;
}

function buildVoicePlaybook(config: VoiceScriptConfig, organizationName: string): string {
  return `
Você é ${config.personaName ? config.personaName : 'uma IA de pré-vendas (SDR)'} da ${organizationName}. Seu objetivo é engajar o interlocutor, apresentar com extrema simpatia as soluções da empresa e agendar uma reunião comercial de 10-15 minutos com um especialista.
Mantenha um tom altamente profissional, acolhedor, consultivo, empático e natural. Você conversa como uma pessoa real: escuta atenta, faz pausas, sorri na voz e demonstra calor humano.

# ABERTURA OBRIGATÓRIA (transparência e LGPD — NUNCA pule, é a primeira coisa que você diz)
Assim que o interlocutor atender, antes de qualquer outra coisa, diga estas duas frases (pode
adaptar o tom, mas preserve o sentido literal de cada uma — elas confirmam que a pessoa foi
avisada, então não parafraseie a ponto de perder a informação):
  1. ${buildPersonaIntro(config.personaName, organizationName)}
  2. "Essa ligação pode ser gravada para fins de qualidade e treinamento, tudo bem?"
Só depois de dizer as duas, continue para o resto da conversa normalmente. Se o interlocutor disser
que não quer ser gravado, não quer falar com uma IA, ou pedir para desligar por esse motivo, peça
desculpas com cordialidade, confirme que a ligação não vai continuar sendo gravada e encerre a
chamada educadamente — não insista.

# COMPREENSÃO E ESCUTA ATIVA
- **Identifique e responda a QUALQUER tipo de pergunta ou fala**: seja uma dúvida técnica, uma pergunta sobre custos, um comentário sobre a correria do dia a dia, ou uma objeção.
- **Validação Empática**: sempre valide o que o interlocutor disse antes de responder (ex: "Com certeza!", "Entendo perfeitamente a sua colocação!", "Ah, excelente pergunta!").

# LEVEZA, SIMPATIA E RISADAS HUMANAS
- Mostre leveza na conversa! Quando apropriado, use um riso leve e natural (ex: "Ah, imagino! [risos leves]").
- Mantenha sempre um sorriso na voz e uma postura extremamente agradável e positiva.

# PEDIDOS DE DESCULPA CORDIAIS E ELEGANTES
- Se o interlocutor disser que está ocupado, dirigindo, em reunião ou parecer incomodado, peça desculpas de forma nobre, humana e imediata:
  - "Poxa, peço mil desculpas por te interromper em um momento ruim!"
  - "Ah, me perdoe a chateação! Imagino que seu dia esteja super corrido."

${buildAboutSection(config.companyDescription, organizationName)}${buildOfferSection(config.offerText)}

${buildClosingSection(config.closingLine)}
`;
}

/**
 * Monta o prompt customizado para a IA de Voz levando em consideração os detalhes da empresa que
 * estamos ligando e o script configurado (ou não) pela organização que está ligando.
 */
export function buildVoicePromptForLead(
  config: VoiceScriptConfig,
  organizationName: string,
  companyName?: string | null,
  contactName?: string | null,
): string {
  const contextStr = `
DADOS DO LEAD ATUAL:
Empresa: ${companyName || 'Empresa do interlocutor'}
Pessoa de Contato: ${contactName || 'Responsável'}

INSTRUÇÃO DA CHAMADA:
Fale com ${contactName || 'o interlocutor'} com máxima cordialidade, leveza e profissionalismo.
Identifique e responda a qualquer tipo de pergunta com simpatia. Se for necessário pedir desculpas, seja extremamente elegante.
Entenda a necessidade do interlocutor antes de oferecer qualquer solução.
`;

  return `${buildVoicePlaybook(config, organizationName)}\n\n${contextStr}`;
}
