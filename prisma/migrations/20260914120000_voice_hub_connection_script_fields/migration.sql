-- VOICE-001 (auditoria multiagente, 09/2026): o roteiro da IA de voz era hardcoded no código para
-- a identidade/produtos de uma única organização (Birth Hub 360), não por-tenant. Qualquer outra
-- organização que configurasse uma VoiceHubConnection própria recebia a IA se apresentando como
-- "Gessica da Birth Hub 360" e oferecendo produtos de gestão de risco de frota para os próprios leads
-- dela. Estas 4 colunas tornam o script configurável por organização (ver
-- src/features/integrations/birth-voice/voiceScript.ts).
ALTER TABLE "VoiceHubConnection" ADD COLUMN "scriptPersonaName" TEXT;
ALTER TABLE "VoiceHubConnection" ADD COLUMN "scriptCompanyDescription" TEXT;
ALTER TABLE "VoiceHubConnection" ADD COLUMN "scriptOfferText" TEXT;
ALTER TABLE "VoiceHubConnection" ADD COLUMN "scriptClosingLine" TEXT;

-- Backfill: toda conexão já cadastrada hoje recebe o script exato que já usava antes desta
-- correção (o hardcoded da Birth Hub 360) — zero mudança de comportamento no deploy para quem já está
-- configurado. O roteiro genérico (voiceScript.ts, sem inventar nome/produto/histórico de outra
-- empresa) só entra em vigor para conexões novas a partir de agora, ou se uma organização já
-- existente limpar estes campos explicitamente na tela de Integrações.
UPDATE "VoiceHubConnection"
SET
  "scriptPersonaName" = 'Gessica',
  "scriptCompanyDescription" = 'A Birth Hub 360 nasceu em 2004 e tem mais de 20 anos de experiência protegendo operações de transporte e logística. Hoje atendemos mais de 390 clientes e monitoramos mais de 125 mil viagens por mês. Temos tecnologia própria e somos homologados por todas as principais seguradoras do mercado.

# NOSSOS PRODUTOS (FOCO DA CONVERSA)
1. **Atlas Profile (Background Check 100% digital com IA)**:
   - "O que o currículo não mostra, o Atlas Profile revela".
   - Analisa antecedentes criminais, cíveis, trabalhistas, situação na Receita Federal, ANTT e valida CNH com Inteligência Artificial e **Face ID (Biometria Facial e Prova de Vida)**. Resposta em 5 minutos.
2. **CIA (Célula de Inteligência Atlas)**: Pronta resposta, acionamento policial e recuperação de carga.',
  "scriptOfferText" = 'Campanha Teste Grátis: "Estamos liberando um teste sem custo: ao agendar a demonstração de 10 minutos, nós te presenteamos com duas consultas gratuitas no Atlas Profile para você testar na prática!"',
  "scriptClosingLine" = 'Muito obrigada pela atenção e pelo carinho! Um abraço de toda a equipe Birth Hub 360 e um excelente dia pra você! Tchau, tchau!'
WHERE "scriptPersonaName" IS NULL;
