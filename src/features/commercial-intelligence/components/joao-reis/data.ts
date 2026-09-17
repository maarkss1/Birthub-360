import type { DealCardData } from '../../../../components/ui/DealsGrid';
import type { FunnelBarItem } from '../../../../components/ui/FunnelBars';

export const DIAGNOSTIC_DATA = {
  funilJul: [
    { status: 'JUNK', nome: 'Desqualificado', eventos: 20, leadsUnicos: 20 },
    { status: 'UC_B5Q2RS', nome: 'Reunião Agendada', eventos: 16, leadsUnicos: 16 },
    { status: 'CONVERTED', nome: 'Convertido', eventos: 11, leadsUnicos: 11 },
    { status: 'UC_IX9SZ8', nome: 'Em Cadência', eventos: 28, leadsUnicos: 26 },
    { status: 'NEW', nome: 'Lead inbound', eventos: 81, leadsUnicos: 79 },
  ],
  funilAgo: [
    { status: 'NEW', nome: 'Lead inbound', eventos: 131, leadsUnicos: 131 },
    { status: 'UC_IX9SZ8', nome: 'Em Cadência', eventos: 195, leadsUnicos: 194 },
    { status: 'JUNK', nome: 'Desqualificado', eventos: 109, leadsUnicos: 109 },
    { status: 'UC_68OHNT', nome: 'Reunião Realizada', eventos: 6, leadsUnicos: 6 },
    { status: 'CONVERTED', nome: 'Convertido', eventos: 17, leadsUnicos: 17 },
    { status: 'UC_B5Q2RS', nome: 'Reunião Agendada', eventos: 15, leadsUnicos: 15 },
    { status: 'UC_YJSF5N', nome: 'No-Show', eventos: 1, leadsUnicos: 1 },
  ],
  metJul: {
    leadsNovos: 79,
    leadsTrabalhados: 64,
    emCadencia: 26,
    reuniaoAgendada: 16,
    reuniaoRealizada: 0,
    noShow: 0,
    convertido: 11,
    desqualificado: 20,
    taxaContato: 81,
    taxaAgendamento: 25,
    taxaComparecimento: 0,
    taxaReuniaoParaConvertido: 68.8,
    taxaDesqualificacao: 25.3,
    atividadesTotais: 213,
    atividadesPorLeadTrabalhado: 3.3,
    dealsGerados: 10,
    dealsGanhos: 1,
    dealsPerdidos: 1,
    dealsAbertos: 8,
    pipelineValor: 9521.7,
    ganhoValor: 180,
    taxaVitoriaDeal: 50,
  },
  metAgo: {
    leadsNovos: 131,
    leadsTrabalhados: 179,
    emCadencia: 194,
    reuniaoAgendada: 15,
    reuniaoRealizada: 6,
    noShow: 1,
    convertido: 17,
    desqualificado: 109,
    taxaContato: 136.6,
    taxaAgendamento: 8.4,
    taxaComparecimento: 40,
    taxaReuniaoParaConvertido: 113.3,
    taxaDesqualificacao: 83.2,
    atividadesTotais: 530,
    atividadesPorLeadTrabalhado: 3,
    dealsGerados: 15,
    dealsGanhos: 5,
    dealsPerdidos: 2,
    dealsAbertos: 8,
    pipelineValor: 4388.3,
    ganhoValor: 363.2,
    taxaVitoriaDeal: 71.4,
  },
  slaJul: {
    leadsDoMes: 82,
    comPrimeiroContato: 65,
    semContato: 17,
    mediaHoras: 386.2,
    medianaHoras: 426.0,
  },
  slaAgo: {
    leadsDoMes: 97,
    comPrimeiroContato: 81,
    semContato: 16,
    mediaHoras: 125.9,
    medianaHoras: 84.7,
  },
  diasUteisJul: 23,
  diasUteisAgo: 21,
  dealsJulResumo: {
    total: 10,
    ganhos: 1,
    perdidos: 1,
    abertos: 8,
    pipelineValor: 9521.7,
    ganhoValor: 180,
  },
  dealsAgoResumo: {
    total: 15,
    ganhos: 5,
    perdidos: 2,
    abertos: 8,
    pipelineValor: 4388.3,
    ganhoValor: 363.2,
  },
  canalJul: {
    'Contatar cliente (genérico)': 184,
    Ligação: 4,
    'Outro/Tarefa': 8,
    WhatsApp: 2,
    'E-mail': 15,
  },
  canalAgo: {
    WhatsApp: 9,
    'Contatar cliente (genérico)': 472,
    LinkedIn: 4,
    'E-mail': 31,
    Ligação: 2,
    'Outro/Tarefa': 12,
  },
  dealsJulDetalhe: [
    {
      id: '25300',
      titulo: 'Transac | Transportadora | João Reis',
      empresa: 'Transac Transporte Rodoviario LTDA',
      stage: 'NEW',
      valor: 3949.8,
    },
    {
      id: '25450',
      titulo: 'Dori Edson | e-book | João Reis',
      empresa: 'Nobelkraft Embalagens de Papelão',
      stage: 'LOSE',
      valor: 119.5,
    },
    {
      id: '25470',
      titulo: 'ACP Bioenergia | Profile RH | João Reis',
      empresa: 'ACP Bioenergia LTDA',
      stage: 'UC_R1YAOS',
      valor: 0,
    },
    {
      id: '25532',
      titulo: 'Transcarlos | Transportadora | João Reis',
      empresa: 'TransCarlos Transportes Ltda',
      stage: 'NEW',
      valor: 1224.9,
    },
    {
      id: '25548',
      titulo: 'CCM | Profile RH | João Reis',
      empresa: 'CCM Tecnologia',
      stage: 'NEW',
      valor: 191.2,
    },
    {
      id: '25708',
      titulo: 'Mendes Mundin Serviços | Profile RH | João Reis',
      empresa: 'Mendes Mundin Serviços',
      stage: 'NEW',
      valor: 358.5,
    },
    {
      id: '25722',
      titulo: 'Usina Pitangueiras | RH | João Reis ',
      empresa: 'Pitangueiras Açúcar e Álcool LTDA',
      stage: 'NEW',
      valor: 3450,
    },
    {
      id: '25764',
      titulo: 'Cerealista Malanski | Profile | João Reis',
      empresa: 'Cerealista Malanski Ltda',
      stage: 'WON',
      valor: 180,
    },
    {
      id: '25770',
      titulo: 'Tupi Rio Transportes | Profile | João Reis',
      empresa: 'Cimento Tupi',
      stage: 'NEW',
      valor: 47.8,
    },
    {
      id: '25790',
      titulo: '[PILOTO PROFILE] | Alfa | João Reis',
      empresa: 'Alfa Transportes LTDA',
      stage: 'UC_A0VPC5',
      valor: 0,
    },
  ],
  dealsAgoDetalhe: [
    {
      id: '25808',
      titulo: 'Grupo RH | Profile RH | João Reis',
      empresa: 'Grupo RH Serviços',
      stage: 'NEW',
      valor: 1175,
    },
    {
      id: '25810',
      titulo: 'Pessegueiro | GR + Profile | João Reis',
      empresa: 'Pessegueiro Transportes de Cargas Ltda',
      stage: 'WON',
      valor: 136.9,
    },
    {
      id: '25828',
      titulo: 'Solfarma | Reunião 07/07/2026 | João Reis',
      empresa: 'SOLFARMA COMÉRCIO DE PRODUTOS FARMACÊUTICOS',
      stage: 'LOSE',
      valor: 392.8,
    },
    {
      id: '25830',
      titulo: 'Rodomac | Reunião 22/07/2026 | João Reis',
      empresa: 'Rodomac Transportes',
      stage: 'LOSE',
      valor: 0,
    },
    {
      id: '25846',
      titulo: 'Vulk Seguros | Seguradora | João Reis',
      empresa: 'Vulk Seguros',
      stage: 'NEW',
      valor: 119.5,
    },
    {
      id: '25848',
      titulo: 'AKB | Profile + Torre | João Reis',
      empresa: 'AKB Transportes Ltda',
      stage: 'WON',
      valor: 58.8,
    },
    {
      id: '25854',
      titulo: 'Vlog Transportes | Profile | Marcelo',
      empresa: 'Vlog Transporte',
      stage: 'UC_A0VPC5',
      valor: 0,
    },
    {
      id: '25864',
      titulo: 'H B Correia Transportes | Profile | João Reis',
      empresa: 'H B Correia Transportes Logística',
      stage: 'WON',
      valor: 47.8,
    },
    {
      id: '25892',
      titulo: 'B. Tobace | e-book | João Reis',
      empresa: 'B. Tobace Instalações Elétricas',
      stage: 'UC_A0VPC5',
      valor: 0,
    },
    {
      id: '25896',
      titulo: 'RPSV Transportes ',
      empresa: 'R.P.S.V. Transportes LTDA',
      stage: 'WON',
      valor: 71.9,
    },
    {
      id: '25986',
      titulo: 'Palmares | RH | João Reis',
      empresa: 'Agricultura Pecuária Palmares',
      stage: 'NEW',
      valor: 47.8,
    },
    {
      id: '25994',
      titulo: 'Vivian | Profile | João Reis',
      empresa: 'Transportes Ap Itu LTDA',
      stage: 'WON',
      valor: 47.8,
    },
    {
      id: '26004',
      titulo: 'Jefferson | Corretora | João Reis',
      empresa: 'Superseg Corretora de Seguros',
      stage: 'UC_A0VPC5',
      valor: 0,
    },
    {
      id: '26016',
      titulo: 'Usina Colorado | RH | João Reis',
      empresa: 'Usina Colorado',
      stage: 'NEW',
      valor: 1990,
    },
    {
      id: '26146',
      titulo: 'Usina Santa Adélia | RH | João Reis',
      empresa: 'Usina Santa Adélia S/A',
      stage: 'NEW',
      valor: 300,
    },
  ],
  reuniaoVerificacao: {
    confirmadas: [
      {
        empresa: 'AKB Transportes (Kátia)',
        data: '2026-08-04',
        duracaoMin: 27,
        resumo:
          'Ligação completa sobre gerenciamento de risco e monitoramento veicular — apresentou a plataforma ao vivo, explicou exigências da seguradora e alinhou envio de proposta por escrito.',
      },
      {
        empresa: 'Lei de Cargas (Henrique)',
        data: '2026-08-05',
        duracaoMin: 21,
        resumo:
          'Ligação completa sobre cadastro de motoristas e veículos — identificou os dois decisores (Henrique e a esposa) e travou prazo de retorno até sexta-feira.',
      },
    ],
    semConversaReal: [
      {
        empresa: 'AKB Transportes (Kátia) — retorno',
        data: '2026-08-11',
        quem: 'João Reis (convidado)',
      },
      {
        empresa: 'Hospital Guararapes',
        data: '2026-07-22',
        quem: 'João Reis (convidado, junto com colegas)',
      },
      {
        empresa: 'Verzani & Sandrini',
        data: '2026-07-15',
        quem: 'Barbara Lopes / Matheus Hernandes',
      },
      {
        empresa: 'Turner & Townsend',
        data: '2026-07-10',
        quem: 'Barbara Lopes / Matheus Hernandes',
      },
      {
        empresa: 'Usina Pitangueiras',
        data: '2026-07-16',
        quem: 'Barbara Lopes / Matheus Hernandes',
      },
      {
        empresa: 'Generall Segurança e Serviços',
        data: '2026-07-08',
        quem: 'Barbara Lopes / Matheus Hernandes',
      },
    ],
  },
  emCadencia: {
    resumo: {
      total: 130,
      semAtividade: 8,
      parado30d: 55,
      parado15d: 35,
      toqueUnico: 2,
      ok: 30,
      comReuniaoNoHistorico: 6,
      totalAtividadesSoma: 561,
      mediaAtividadesPorLead: 4.3,
      mediaGapGeral: 5.2,
    },
    topLeads: [
      {
        id: '18672',
        nome: 'CDGN Logística | Embarcador (Gás)',
        diasParado: 182,
        atividades: 7,
        gap: '3.3d',
        status: '30+ dias parado',
      },
      {
        id: '18676',
        nome: 'Copacol | Cooperativa agroindustrial',
        diasParado: 182,
        atividades: 6,
        gap: '3.9d',
        status: '30+ dias parado',
      },
      {
        id: '18680',
        nome: 'RodoViva Transportes',
        diasParado: 182,
        atividades: 3,
        gap: '9.5d',
        status: '30+ dias parado',
      },
      {
        id: '18682',
        nome: 'Sanfe Transporte e Logistica Ltda',
        diasParado: 182,
        atividades: 4,
        gap: '6.3d',
        status: '30+ dias parado',
      },
      {
        id: '19872',
        nome: 'Actual Serviços Terceirizados',
        diasParado: 82,
        atividades: 1,
        gap: '—',
        status: '30+ dias parado',
      },
      {
        id: '19762',
        nome: 'Pratika Serviços Terceirizados',
        diasParado: 81,
        atividades: 6,
        gap: '2.0d',
        status: '30+ dias parado',
      },
      {
        id: '19880',
        nome: 'Elite Serviços',
        diasParado: 80,
        atividades: 4,
        gap: '1.4d',
        status: '30+ dias parado',
      },
      {
        id: '19866',
        nome: 'BRASIL SERVIÇOS GERAIS',
        diasParado: 68,
        atividades: 2,
        gap: '14d',
        status: '30+ dias parado',
      },
      {
        id: '19992',
        nome: 'Diana Bioenergia',
        diasParado: 68,
        atividades: 4,
        gap: '1.0d',
        status: '30+ dias parado',
      },
      {
        id: '19864',
        nome: 'PETERSA BRASIL SERVIÇOS',
        diasParado: 66,
        atividades: 5,
        gap: '4.3d',
        status: '30+ dias parado',
      },
      {
        id: '20272',
        nome: 'Ayrton Luis',
        diasParado: 36,
        atividades: 0,
        gap: '—',
        status: 'Sem atividade',
      },
      {
        id: '20284',
        nome: 'Ana Albacete',
        diasParado: 35,
        atividades: 0,
        gap: '—',
        status: 'Sem atividade',
      },
      {
        id: '20580',
        nome: 'Maria Lucia',
        diasParado: 6,
        atividades: 0,
        gap: '—',
        status: 'Sem atividade',
      },
      {
        id: '20586',
        nome: 'angelita braga',
        diasParado: 4,
        atividades: 0,
        gap: '—',
        status: 'Sem atividade',
      },
      {
        id: '20588',
        nome: 'Lidiane',
        diasParado: 4,
        atividades: 0,
        gap: '—',
        status: 'Sem atividade',
      },
      {
        id: '20590',
        nome: 'Patrícia de Souza Marques',
        diasParado: 4,
        atividades: 0,
        gap: '—',
        status: 'Sem atividade',
      },
    ],
  },
};

export interface DailyTask {
  id: string;
  timeBlock: string;
  title: string;
  description: string;
  tool: string;
  targetCount?: string;
  completed: boolean;
}

export const DEFAULT_DAILY_PLAN: DailyTask[] = [
  {
    id: 'task-1',
    timeBlock: '08:30 - 09:30',
    title: 'Bloco 1: Higiene de SLA & Reação Rápida',
    description:
      'Verificar Leads novos que entraram no Bitrix em < 24h e realizar o 1º contato imediato. Atacar prioritariamente os 8 leads sem nenhuma atividade.',
    tool: 'Bitrix24 (Filtro Leads Novos sem atividade) + Agenda de Prospecção',
    targetCount: '15 a 20 toques rápidos',
    completed: false,
  },
  {
    id: 'task-2',
    timeBlock: '09:30 - 11:30',
    title: 'Bloco 2: Prospecção em Lote (Sprint de Toques)',
    description:
      'Disparar cadência no WhatsApp, E-mail e LinkedIn. REGRA OBRIGATÓRIA: Nunca salvar como "Contatar cliente" genérico — indicar sempre o canal real (ex: "WhatsApp - Proposta enviados").',
    tool: 'Bitrix24 / Ferramenta de Cadência + WhatsApp Web',
    targetCount: '40 a 50 atividades com canal discriminado',
    completed: false,
  },
  {
    id: 'task-3',
    timeBlock: '11:30 - 12:00',
    title: 'Bloco 3: Cadência & Follow-up de Reuniões',
    description:
      'Verificar reuniões do dia ou do dia anterior. Carimbar no CRM o status real: "Reunião Realizada" ou "No-Show" antes de qualquer outra ação.',
    tool: 'Bitrix24 (Estágio Reunião Agendada)',
    targetCount: '100% das reuniões carimbadas no dia',
    completed: false,
  },
  {
    id: 'task-4',
    timeBlock: '14:00 - 16:00',
    title: 'Bloco 4: Limpeza de Estoque (Aging Cut)',
    description:
      'Atacar a fila de 130 leads parados em "Em Cadência" (especialmente os 55 parados há > 30 dias). Decidir: aplicar cadência de 6-8 toques ou mover para Desqualificado (JUNK).',
    tool: 'Bitrix24 (Filtro Em Cadência > 15 dias)',
    targetCount: 'Revisar e movimentar 25 a 30 leads parados',
    completed: false,
  },
  {
    id: 'task-5',
    timeBlock: '16:00 - 17:30',
    title: 'Bloco 5: Calls de Qualificação & Fechamento',
    description:
      'Conduzir chamadas agendadas. Foco: Qualificar perfil nas primeiras falas (evitar 20min de demo em lead de 1 veículo) e sair da call SEMPRE com data travada ("Quando você consegue me dar o retorno?").',
    tool: 'Google Meet / Softphone Bitrix24',
    targetCount: '2 a 4 reuniões/calls qualificadoras',
    completed: false,
  },
  {
    id: 'task-6',
    timeBlock: '17:30 - 18:00',
    title: 'Bloco 6: Encerramento & Batimento de Meta',
    description:
      'Conferir o volume total de atividades lançadas no dia (Meta: 60-100/dia), atualizar compromissos de amanhã e registrar o diário de prospecção.',
    tool: 'Painel Central Birth Hub 360 + CRM Bitrix24',
    targetCount: 'Meta mínima de 60 atividades batida',
    completed: false,
  },
];

export const PITCHES_BY_SEGMENT = {
  transportadora: {
    segmento: 'Transportadora de Cargas',
    dor: 'Exigências da seguradora/PGR para cadastro rápido de motoristas e redução de sinistro.',
    pitch: `Olá [Nome], aqui é o João Reis da Birth Hub 360. Vi que a [Nome da Empresa] atua no transporte rodoviário e sei o quanto a exigência de gerenciamento de risco e cadastro rápido de motoristas impacta a liberação de frota. Nós ajudamos transportadoras a reduzirem o tempo de validação de motoristas e cumprirem 100% da apólice com nossa plataforma. Como vocês gerenciam esse processo hoje?`,
    perguntaChave: 'Quantos veículos ou viagens vocês operam por mês em média?',
  },
  agro: {
    segmento: 'Usina / Agroindústria',
    dor: 'Logística de escoamento de safra e rastreamento em rotas rurais sem sinal.',
    pitch: `Olá [Nome], sou o João Reis da Birth Hub 360. Estou em contato com grandes grupos sucroalcooleiros e do agronegócio para otimizar o monitoramento do escoamento de safra e controle de terceiros. Vocês hoje têm visibilidade em tempo real do transbordo e da segurança dos veículos que entram na usina?`,
    perguntaChave: 'Vocês trabalham mais com frota própria ou frota dedicada de terceiros?',
  },
  embarcador: {
    segmento: 'Embarcador / Indústria / Varejo',
    dor: 'Falta de visibilidade da carga em trânsito e nível de serviço da transportadora.',
    pitch: `Olá [Nome], João Reis da Birth Hub 360. Ajudamos embarcadores industriais a terem torre de controle centralizada sobre todas as transportadoras contratadas, reduzindo no-show e atrasos de entrega. Como vocês garantem o nível de serviço do frete hoje?`,
    perguntaChave: 'Quantas transportadoras parceiras hoje atendem as rotas de vocês?',
  },
  terceirizacao: {
    segmento: 'Terceirização & Facilities (Portaria/Segurança)',
    dor: 'Controle de ponto/presença e validação de perfil de atendentes.',
    pitch: `Olá [Nome], aqui é o João Reis da Birth Hub 360. Trabalhamos com empresas de facilities para gestão e validação de equipes terceirizadas em postos de trabalho. Como vocês fazem o acompanhamento de presença e compliance dos profissionais hoje?`,
    perguntaChave: 'Quantos postos de trabalho ativos a empresa gerencia atualmente?',
  },
};

export const OBJECTIONS_DATABASE = [
  {
    id: 'obj-1',
    objeção: '“Já temos Gerenciadora de Risco / Rastreador.”',
    diagnostico:
      'O lead acha que o produto substitui o que ele tem, quando na verdade pode integrar ou complementar.',
    respostaRecomendada:
      'Perfeito, [Nome]! Nós não substituímos sua gerenciadora nem exigimos troca de rastreadores. A Birth Hub 360 integra com a sua infraestrutura atual para homologar cadastros mais rápido e automatizar a conformidade com a seguradora. Quantas horas hoje sua equipe leva pra liberar um motorista agregado?',
  },
  {
    id: 'obj-2',
    objeção: '“Pode me mandar a proposta por e-mail pra eu analisar?”',
    diagnostico:
      'Objeção de esquiva clássica. Enviar e-mail sem qualificação tem 90% de chance de virar lead morto.',
    respostaRecomendada:
      'Consigo enviar sim, [Nome]! Mas como temos diferentes planos e módulos (como validação de motorista vs torre de controle), levaria 5 minutos numa breve call pra eu ajustar o valor exato pro seu volume real. Você tem 5 minutos amanhã às 10h ou 14h?',
  },
  {
    id: 'obj-3',
    objeção: '“Somos uma empresa pequena, temos só 2 ou 3 caminhões.”',
    diagnostico: 'Lead pensa que a plataforma é cara ou feita apenas para grandes frotas.',
    respostaRecomendada:
      'Entendo perfeitamente, [Nome]! Inclusive temos uma oferta enxuta desenhada exatamente para frotas de pequeno porte cumprirem a exigência da seguradora sem peso fixo alto. Se eu te mostrar em 10 minutos como fica acessível pro seu tamanho, faz sentido avaliarmos?',
  },
];

export const CHANNEL_HEX: Record<string, string> = {
  'Contatar cliente (genérico)': 'var(--ink-2)',
  'Outro/Tarefa': 'var(--ink-2)',
  Ligação: 'var(--brand)',
  WhatsApp: 'var(--ok)',
  'E-mail': 'var(--warn)',
  LinkedIn: 'var(--brand-2)',
};

const DEAL_STAGE_LABEL: Record<string, string> = {
  NEW: 'Proposta Enviada',
  UC_A0VPC5: 'Nova Oportunidade',
  UC_R1YAOS: 'Piloto',
  UC_5X3WZN: 'Call/Visita Agendada',
};

export function toFunnelItems(
  items: { status: string; nome: string; leadsUnicos: number }[],
): FunnelBarItem[] {
  return items.map((item) => ({
    id: item.status,
    label: item.nome,
    value: item.leadsUnicos,
    tone: item.status === 'CONVERTED' ? 'ok' : item.status === 'JUNK' ? 'critical' : 'brand',
  }));
}

export function toDealCardData(
  deals: { id: string; titulo: string; empresa: string; stage: string; valor: number }[],
): DealCardData[] {
  return deals.map((d) => {
    const status = d.stage === 'WON' ? 'won' : d.stage === 'LOSE' ? 'lost' : 'open';
    const statusLabel =
      status === 'won'
        ? 'Ganho'
        : status === 'lost'
          ? 'Perdido'
          : (DEAL_STAGE_LABEL[d.stage] ?? d.stage);
    return { id: d.id, title: d.empresa || d.titulo, status, statusLabel, value: d.valor };
  });
}

export const formatCurrency = (val: number) =>
  val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
