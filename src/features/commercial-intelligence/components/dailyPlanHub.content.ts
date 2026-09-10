/**
 * Conteúdo estático do Roteiro Diário Tradicional (checklist) e dos pitches por segmento usados em
 * `DailyPlanHub.tsx`. Extraído para arquivo próprio para manter o componente abaixo do limite de
 * `check:hotspots` (docs/architecture/HOTSPOT_EXCEPTIONS.md) sem precisar registrar exceção —
 * mesmo padrão de extração já usado no projeto (preferir modularizar a apenas elevar o limite).
 */

export interface DailyTask {
  id: string;
  time: string;
  title: string;
  target: string;
  channel: string;
  script: string;
  completed: boolean;
}

export const DEFAULT_DAILY_PLAN: DailyTask[] = [
  {
    id: 't1',
    time: '08:30 - 09:30',
    title: 'Planejamento e Fila de Prioridades',
    target: 'Revisar tarefas do Bitrix, leads prioritários e montar rota do dia',
    channel: 'Estratégia',
    script: 'Filtrar reuniões do dia, leads sem contato e SLA vencendo no Bitrix.',
    completed: false,
  },
  {
    id: 't2',
    time: '09:30 - 11:30',
    title: 'Bloco 1 de Prospecção & Follow-up',
    target: '20 ligações ativas e 15 contatos via WhatsApp para decisores',
    channel: 'Ligação / WhatsApp',
    script: 'Foco na dor de redução de custos, rastreamento inteligente e telemetria.',
    completed: false,
  },
  {
    id: 't3',
    time: '11:30 - 12:00',
    title: 'Atualização e Registro no CRM',
    target: 'Carimbar status, notas e agendamentos no Bitrix24',
    channel: 'Bitrix24',
    script: 'Preencher observação clara em 100% dos contatos realizados.',
    completed: false,
  },
  {
    id: 't4',
    time: '13:30 - 15:30',
    title: 'Bloco 2 de Prospecção & Qualificação',
    target: '25 ligações ativas com decisores de logística/transporte',
    channel: 'Ligação',
    script: 'Qualificar tamanho de frota e dores nos primeiros 3 minutos de conversa.',
    completed: false,
  },
  {
    id: 't5',
    time: '15:30 - 16:30',
    title: 'Confirmação de Reuniões & Reengajamento',
    target: 'Reengajar no-shows e confirmar agendas de amanhã',
    channel: 'WhatsApp / E-mail',
    script: 'Enviar lembrete amigável com link do Google Meet e pauta objetiva.',
    completed: false,
  },
  {
    id: 't6',
    time: '16:30 - 17:30',
    title: 'Fechamento do Dia & Alinhamento',
    target: 'Conferir meta do dia (60 toques), registrar pendências e planejar D+1',
    channel: 'Gestão',
    script: 'Zerar tarefas vencidas e enviar resumo de agendamentos para o Closer.',
    completed: false,
  },
];

export const PITCHES_BY_SEGMENT = {
  transportadora: {
    nome: 'Transportadoras & Cargas Fracionadas',
    dor: 'Sinistralidade, combustível descontrolado e falta de visibilidade em tempo real.',
    gancho:
      'Você sabe exatamente onde cada motorista parou e se o consumo de diesel está no padrão da rota agora?',
    script:
      'Olá! Sou especialista em operações de frotas pesadas da Birth Hub 360. Reduzimos em média 12% do custo de diesel e eliminamos desvios de rota em transportadoras do seu porte já no primeiro mês.',
  },
  locadora: {
    nome: 'Locadoras & Gestão de Ativos',
    dor: 'Recuperação rápida pós-sinistro, apropriação indébita e telemetria de uso severo.',
    gancho:
      'Se um cliente romper o contrato e sumir com o veículo hoje, em quantos minutos você consegue imobilizar?',
    script:
      'Olá! A tecnologia da Birth Hub 360 garante taxa de recuperação de 98% com dupla tecnologia e bloqueio seguro sem intervenção mecânica complexa.',
  },
  servicos: {
    nome: 'Frotas de Serviços & Utilitários',
    dor: 'Horas extras indevidas, uso particular do veículo fora de horário e atrasos.',
    gancho:
      'Você tem relatórios de quando a ignição foi ligada no final de semana ou após o expediente?',
    script:
      'Olá! Ajudamos empresas com frotas de manutenção e serviços a eliminar até 20% das horas extras indevidas com cercas eletrônicas automáticas.',
  },
};
