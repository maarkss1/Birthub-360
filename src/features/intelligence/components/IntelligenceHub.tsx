import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bot,
  CheckSquare,
  Cpu,
  Database,
  FileText,
  GraduationCap,
  Loader2,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Wand2,
  Workflow,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Intelligence } from '../../../components/Intelligence.js';
import { Button } from '../../../components/ui/Button.js';
import { Card, CardDescription, CardTitle } from '../../../components/ui/Card.js';
import { useBrandAccent } from '../../../hooks/useBrandAccent.js';
import { fadeInUp, SPRING_SOFT, staggerContainer, staggerItem } from '../../../lib/motion.js';
import { AIConfigCenter } from '../../dashboard/components/AIConfigCenter.js';
import { type KnowledgeDocumentSummary, knowledgeApi } from '../../knowledge/knowledge.api.js';
import { AgentQualityPanel } from './AgentQualityPanel.js';
import { AIPendingActions } from './AIPendingActions.js';
import { AISuiteHub } from './AISuiteHub.js';
import { CopilotoIaHub } from '../../copiloto-ia/components/CopilotoIaHub.js';
import { AutomationGuide } from './AutomationGuide.js';
import { B2BGenerator } from './B2BGenerator.js';
import { RobustScriptGenerator } from './RobustScriptGenerator.js';
import { SalesMethodologyStudio } from './SalesMethodologyStudio.js';
import { SuperagentCreator } from './SuperagentCreator.js';
import { SwarmDashboard } from './SwarmDashboard.js';

export type IntelligenceTab =
  | 'ai_suite'
  | 'swarm'
  | 'methodologies'
  | 'ai_config'
  | 'superagent'
  | 'scripts'
  | 'automations'
  | 'actions'
  | 'generator'
  | 'tools'
  | 'rag'
  | 'quality'
  | 'copiloto';

interface IntelligenceHubProps {
  initialTab?: IntelligenceTab;
}

// O Hub de IA sempre abre na grade de ferramentas (nunca direto numa ferramenta padrão) — o
// usuário escolhe qual IA quer usar a partir dos cards, depois volta pra grade pelo botão "Voltar".
// `initialTab` continua existindo só para um eventual deep-link futuro; hoje nenhum chamador o passa.
const TOOL_TABS: {
  id: IntelligenceTab;
  label: string;
  icon: typeof Bot | typeof Cpu;
  description: string;
}[] = [
  {
    id: 'ai_suite',
    label: 'Suíte dos 20 Motores de IA',
    icon: Cpu,
    description:
      'Console interativo para executar e orquestrar os 20 motores de IA (Ollama & Cloud) da plataforma.',
  },
  {
    id: 'copiloto',
    label: 'Copiloto IA',
    icon: Sparkles,
    description:
      'Conversas, reuniões e ligações capturadas pelo Copiloto Comercial IA — resumo, deal health e coaching.',
  },
  {
    id: 'swarm',
    label: 'Enxame Autônomo',
    icon: Bot,
    description:
      'Dispara uma missão para o enxame de agentes de IA (SDR, closer, CRM) e acompanha em tempo real.',
  },
  {
    id: 'methodologies',
    label: 'Metodologias de Vendas',
    icon: GraduationCap,
    description:
      'Gera scripts B2B com frameworks clássicos: SPIN, SNAP, AIDA, MEDDPICC e Challenger.',
  },
  {
    id: 'ai_config',
    label: 'Central de Motores de IA',
    icon: Settings,
    description:
      'Escolhe o modelo de IA e a temperatura usados por cada ferramenta de conteúdo do sistema.',
  },
  {
    id: 'superagent',
    label: 'Criador de Copiloto',
    icon: Sparkles,
    description:
      'Monta a configuração de um copiloto autônomo e gera prompt, JSON e scripts de provisionamento.',
  },
  {
    id: 'scripts',
    label: 'Gerador de Scripts',
    icon: FileText,
    description:
      'Gera código pronto para produção — scraping, ETL, integrações de API e agentes SDR.',
  },
  {
    id: 'automations',
    label: 'Guia de Automações',
    icon: Workflow,
    description: 'Monta o guia, o workflow n8n e o script para ligar um gatilho a uma ação.',
  },
  {
    id: 'actions',
    label: 'Central de Decisões',
    icon: CheckSquare,
    description: 'Aprova ou descarta as ações que a IA recomendou, com risco e confiança.',
  },
  {
    id: 'generator',
    label: 'Gerador B2B',
    icon: Wand2,
    description:
      'Simula dores, perguntas de qualificação e objeções táticas a partir do ICP e da solução.',
  },
  {
    id: 'tools',
    label: 'Outreach Intelligence',
    icon: Search,
    description:
      'Gera scripts de ligação, WhatsApp, e-mail, cadência e battlecards para o lead selecionado.',
  },
  {
    id: 'rag',
    label: 'Base de Conhecimento',
    icon: Database,
    description:
      'Base de embeddings que o Copiloto SDR consulta para gerar abordagens contextuais.',
  },
  {
    id: 'quality',
    label: 'Qualidade do Enxame',
    icon: ShieldCheck,
    description:
      'Harness real de avaliação (custo, latência, override humano, fallback, corretude, PII) e resumo do Golden Dataset.',
  },
];

function formatRelativeDate(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return 'agora mesmo';
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `há ${diffHours}h`;
  const diffDays = Math.round(diffHours / 24);
  return `há ${diffDays} dia${diffDays === 1 ? '' : 's'}`;
}

export function IntelligenceHub({ initialTab }: IntelligenceHubProps) {
  const [activeTab, setActiveTab] = useState<IntelligenceTab | null>(initialTab ?? null);
  const accent = useBrandAccent();

  // Estado real da Base de Conhecimento (RAG) — nunca dados fabricados. Ver AGENTS.md, bloqueador
  // #6 ("dados fictícios misturados a dados reais"): o card desta aba já mostrou "última
  // sincronização há 2 horas" hardcoded para documentos que não existiam no banco. Reaproveita o
  // mesmo `knowledgeApi` já usado pela tela completa de Base de Conhecimento (`/knowledge`), sem
  // duplicar o pipeline de ingestão/busca — só um resumo, com link para a tela cheia.
  const [ragDocuments, setRagDocuments] = useState<KnowledgeDocumentSummary[] | null>(null);
  const [ragError, setRagError] = useState<string | null>(null);
  const [ragLoading, setRagLoading] = useState(false);

  const loadRagSummary = useCallback(async () => {
    setRagLoading(true);
    setRagError(null);
    try {
      setRagDocuments(await knowledgeApi.list());
    } catch (err: any) {
      setRagError((err as Error).message);
    } finally {
      setRagLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'rag') void loadRagSummary();
  }, [activeTab, loadRagSummary]);

  if (activeTab === null) {
    return (
      <div className="flex-1 overflow-y-auto bg-transparent">
        <div className="bh-page bh-page-stack">
          <header className="border-b border-line pb-5">
            <div className="bh-label text-brand-ink dark:text-brand">INTELIGÊNCIA APLICADA</div>
            <h1 className="mt-1 font-display text-h1 font-bold text-ink">Hub de IA</h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-2">
              Escolha uma capacidade para transformar contexto operacional em uma próxima ação
              verificável.
            </p>
          </header>

          <motion.nav
            aria-label="Ferramentas do Hub de IA"
            variants={staggerContainer()}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
          >
            {TOOL_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <motion.button
                  key={tab.id}
                  type="button"
                  variants={staggerItem}
                  transition={SPRING_SOFT}
                  onClick={() => setActiveTab(tab.id)}
                  className="text-left cursor-pointer group"
                >
                  <Card
                    variant="default"
                    padding="sm"
                    className={`h-full ${accent.hoverBorder} group-focus-visible:border-brand/50 group-focus-visible:shadow-card-hover`}
                  >
                    <div
                      className={`mb-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-line ${accent.bgSoft} ${accent.text}`}
                    >
                      <Icon size={16} />
                    </div>
                    <CardTitle className={`${accent.text} text-sm`}>{tab.label}</CardTitle>
                    <CardDescription className="mt-1 text-xs leading-snug line-clamp-2">
                      {tab.description}
                    </CardDescription>
                    <span
                      className={`mt-3 inline-flex items-center gap-1 text-xs font-semibold ${accent.text}`}
                    >
                      Abrir <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </Card>
                </motion.button>
              );
            })}
          </motion.nav>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-transparent p-4 sm:p-6 lg:p-8 space-y-6">
      <button
        type="button"
        onClick={() => setActiveTab(null)}
        className="flex items-center gap-2 text-ink-2 hover:text-ink transition-colors group cursor-pointer"
      >
        <div className="p-2 rounded-xl bg-surface-2 border border-line group-hover:bg-surface transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </div>
        <span className="font-bold text-sm">Voltar ao Hub de IA</span>
      </button>

      <motion.div key={activeTab} initial="hidden" animate="show" variants={fadeInUp}>
        {activeTab === 'ai_suite' && <AISuiteHub />}
        {activeTab === 'swarm' && <SwarmDashboard />}
        {activeTab === 'quality' && <AgentQualityPanel />}
        {activeTab === 'methodologies' && <SalesMethodologyStudio />}
        {activeTab === 'ai_config' && <AIConfigCenter />}
        {activeTab === 'superagent' && <SuperagentCreator />}
        {activeTab === 'scripts' && <RobustScriptGenerator />}
        {activeTab === 'automations' && <AutomationGuide />}
        {activeTab === 'generator' && <B2BGenerator />}
        {activeTab === 'tools' && <Intelligence />}
        {activeTab === 'copiloto' && (
          <Card variant="default" padding="lg" accentBar>
            <CopilotoIaHub />
          </Card>
        )}

        {activeTab === 'actions' && (
          <Card variant="default" padding="lg" accentBar>
            <AIPendingActions />
          </Card>
        )}

        {activeTab === 'rag' && (
          <Card variant="default" padding="lg" accentBar>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-brand/15 border border-brand/30 flex items-center justify-center text-brand shrink-0">
                  <Database size={22} />
                </div>
                <div>
                  <CardTitle>Base de Conhecimento</CardTitle>
                  <CardDescription>
                    Documentos reais indexados nesta organização. O Copiloto SDR consulta esta mesma
                    base (busca híbrida semântica + palavra-chave) para gerar abordagens contextuais
                    — nunca inventa uma fonte que não está aqui.
                  </CardDescription>
                </div>
              </div>
              <Button asChild variant="outline" className="shrink-0 whitespace-nowrap">
                <Link to="/knowledge">
                  Gerenciar base <ArrowUpRight className="w-4 h-4 ml-1.5" />
                </Link>
              </Button>
            </div>

            {ragLoading && (
              <div className="flex items-center justify-center gap-2 text-sm text-ink-2 py-8">
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando documentos…
              </div>
            )}

            {!ragLoading && ragError && (
              <div className="text-center py-8">
                <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-amber-400" />
                <p className="text-sm text-ink-2 mb-4">{ragError}</p>
                <Button variant="outline" onClick={() => void loadRagSummary()}>
                  Tentar novamente
                </Button>
              </div>
            )}

            {!ragLoading && !ragError && ragDocuments !== null && ragDocuments.length === 0 && (
              <div className="text-center py-8 border border-dashed border-line rounded-card">
                <Database className="w-10 h-10 mx-auto mb-3 text-ink-2" />
                <p className="text-sm font-semibold text-ink mb-1">
                  Nenhum documento indexado ainda
                </p>
                <p className="text-xs text-ink-2 mb-4 max-w-sm mx-auto">
                  Sem documentos, o Copiloto SDR não tem playbook para consultar — ele avisa isso em
                  vez de inventar uma resposta.
                </p>
                <Button asChild variant="outline">
                  <Link to="/knowledge">Enviar o primeiro documento</Link>
                </Button>
              </div>
            )}

            {!ragLoading && !ragError && ragDocuments !== null && ragDocuments.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-ink-2 uppercase tracking-wider">
                  {ragDocuments.length} documento{ragDocuments.length === 1 ? '' : 's'} ·{' '}
                  {ragDocuments.reduce((sum, d) => sum + d.chunkCount, 0)} trecho(s) vetorizado(s)
                </p>
                {ragDocuments.slice(0, 5).map((doc) => (
                  <div
                    key={doc.id}
                    className={`p-5 bg-surface-2 border border-line rounded-card flex items-center justify-between group ${accent.hoverBorder} transition-colors`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-full ${accent.bgSoft} flex items-center justify-center ${accent.text} shrink-0`}
                      >
                        <FileText size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-ink text-sm truncate">{doc.title}</p>
                        <p className="text-[11px] font-semibold text-ink-2 mt-0.5 uppercase tracking-wider">
                          {doc.chunkCount} trecho{doc.chunkCount === 1 ? '' : 's'} · atualizado{' '}
                          {formatRelativeDate(doc.updatedAt)}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`shrink-0 px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border ${doc.chunkCount > 0 ? 'bg-success/15 text-success-active dark:text-success border-success/30' : 'bg-amber-500/15 text-amber-400 border-amber-500/30'}`}
                    >
                      {doc.chunkCount > 0 ? 'Indexado' : 'Sem trechos'}
                    </div>
                  </div>
                ))}
                {ragDocuments.length > 5 && (
                  <Link
                    to="/knowledge"
                    className="block text-center text-xs font-semibold text-ink-2 hover:text-ink transition-colors pt-1"
                  >
                    Ver todos os {ragDocuments.length} documentos →
                  </Link>
                )}
              </div>
            )}
          </Card>
        )}
      </motion.div>
    </div>
  );
}
