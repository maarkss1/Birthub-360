import { useState } from 'react';
import {
  Share2,
  ExternalLink,
  Layers,
  Search,
  Copy,
  Check,
  Sparkles,
  Target,
} from 'lucide-react';
import { ExecutiveHeader } from '../../../components/layout/ExecutiveHeader';
import { BRAND } from '../../../config/brand';

export function SocialSellingHub() {
  const [activeSubTab, setActiveSubTab] = useState<'motor' | 'pipeline' | 'linkedin' | 'posts'>(
    'motor',
  );
  const [iframeKey, setIframeKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedPostIndex, setCopiedPostIndex] = useState<number | null>(null);

  // Nota (09/2026, pedido explícito do usuário): os 3 arquivos HTML abaixo (public/tools/social-selling/)
  // são acervo legado (ver CLAUDE.md §13, "public/tools/ são aplicações legadas embutidas por
  // iframe"). Foram reescritos e renomeados para a marca Birth Hub 360 — nome do arquivo, título,
  // logomarca (SVG próprio da Antique Gold/Deep Iris/Orbit Blue, ver identidade-visual/birthhub360/),
  // copy de campanha e o roteiro de diagnóstico de perfil LinkedIn (antes escrito para o vertical de
  // logística/gestão de risco da Atlas GR) generalizados pro ICP real do produto ("qualquer empresa
  // com área comercial"). Ressalva: dentro do "Kit Campanha LinkedIn" existem 4 screenshots
  // (imagens PNG embutidas em base64 numa das simulações internas) com UI de "gerenciador de
  // campanhas" ainda mostrando texto vertical-specific da Atlas GR — são raster, não texto, e por
  // isso não puderam ser editados por substituição de texto; regenerá-los é tarefa de design fora
  // do escopo desta rerotulagem — ver nota no relatório da tarefa.
  const subTabs = [
    {
      id: 'motor',
      label: 'Motor de Social Selling',
      path: '/tools/social-selling/Motor de Social Selling.html',
    },
    {
      id: 'pipeline',
      label: 'Pipeline Tracker',
      path: '/tools/social-selling/Pipeline Tracker.html',
    },
    {
      id: 'linkedin',
      label: 'LinkedIn Campaign Kit',
      path: '/tools/social-selling/Kit Campanha LinkedIn.html',
    },
    { id: 'posts', label: 'Posts Semanais (1-5)' },
  ] as const;

  // Copy regeneralizada (09/2026, pedido explícito do usuário) — os 5 posts abaixo eram escritos
  // especificamente para o vertical de gestão de risco/seguro de transporte de carga da Atlas GR
  // (sinistro, transportadora, score de motoristas). O ICP declarado do produto hoje é "qualquer
  // empresa com área comercial" (src/config/brand.ts) — a estrutura de 5 semanas (maturidade
  // operacional → tecnologia → performance → prevenção → processo escalável) foi preservada, só o
  // vocabulário do vertical foi trocado por linguagem comercial genérica.
  const weeklyPostsData = [
    {
      semana: 'Semana 1',
      tema: 'Operação reativa vs. governável',
      desc: 'Conceito chave sobre maturidade em gestão comercial.',
      copy: 'Você sabia que grande parte das oportunidades perdidas acontece em operações comerciais que trabalham no modo reativo? Aqui, transformamos a gestão do pipeline em governança preditiva. Conheça a diferença entre agir depois que o negócio esfria e antecipar o próximo passo certo.',
    },
    {
      semana: 'Semana 2',
      tema: 'Tecnologia útil vs. cosmética',
      desc: 'Como identificar soluções reais e ferramentas eficientes para times comerciais.',
      copy: 'Nem todo dashboard é tecnologia útil. Muitas soluções entregam gráficos bonitos mas falham no momento crítico da tomada de decisão. Nossa tecnologia de vendas foca em resposta imediata, integração de dados do cliente e qualificação rigorosa de leads.',
    },
    {
      semana: 'Semana 3',
      tema: 'Previsibilidade como performance',
      desc: 'Redução de perdas operacionais gerando margem líquida e ROI comprovado.',
      copy: 'Previsibilidade comercial não é custo, é alavanca de margem operacional. Cada negócio recuperado é lucro preservado diretamente na DRE da empresa. Veja como o diagnóstico de funil e nossas cadências reduzem em até 40% a perda de oportunidades no pipeline.',
    },
    {
      semana: 'Semana 4',
      tema: 'Diagnóstico antes da perda',
      desc: 'Prevenção proativa, score preditivo e qualificação de leads.',
      copy: 'A gestão comercial moderna começa muito antes de o negócio esfriar. A análise contínua do perfil de leads e clientes garante que o time comercial avance apenas com oportunidades qualificadas e validadas.',
    },
    {
      semana: 'Semana 5',
      tema: 'Improviso vs. processo escalável',
      desc: 'Estruturação de processos comerciais e operacionais em times de vendas.',
      copy: 'Times comerciais que dependem de processos manuais ou improvisos não escalam. Com uma infraestrutura comercial e tecnológica integrada, sua empresa ganha consistência, dados auditáveis e previsibilidade de receita.',
    },
  ];

  const filteredPosts = weeklyPostsData.filter(
    (p) =>
      p.semana.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tema.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.copy.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleCopyCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedPostIndex(index);
    setTimeout(() => setCopiedPostIndex(null), 2000);
  };

  const currentTab = subTabs.find((t) => t.id === activeSubTab);

  return (
    <div
      className={`flex flex-col h-full space-y-3 bg-bg ${isFullscreen ? 'fixed inset-0 z-50 p-3 bg-bg overflow-hidden' : 'p-4'}`}
    >
      {/* Unified Executive Header */}
      <ExecutiveHeader
        title="Social Selling"
        subtitle="Plano de ação, rastreador de pipeline, kit de campanhas LinkedIn e acervo de conteúdos."
        icon={Share2}
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
        onRefresh={() => setIframeKey((k) => k + 1)}
      />

      {/* KPI Cards Bar - Compacted */}
      {!isFullscreen && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="p-2.5 bg-surface border border-line rounded-xl flex items-center gap-2.5">
            <div className="p-1.5 bg-brand/10 text-brand rounded-lg">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-ink-2">Motor de Vendas</div>
              <div className="text-xs font-bold text-ink">Estratégia Outbound</div>
            </div>
          </div>
          <div className="p-2.5 bg-surface border border-line rounded-xl flex items-center gap-2.5">
            <div className="p-1.5 bg-info/10 text-info-active dark:text-info rounded-lg">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-ink-2">Pipeline Tracker</div>
              <div className="text-xs font-bold text-ink">Alertas Automáticos</div>
            </div>
          </div>
          <div className="p-2.5 bg-surface border border-line rounded-xl flex items-center gap-2.5">
            <div className="p-1.5 bg-success/10 text-success-active dark:text-success rounded-lg">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-ink-2">Posts LinkedIn</div>
              <div className="text-xs font-bold text-ink">5 Semanas de Copys</div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab Selector & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {subTabs.map((tab) => (
            <button
              type="button"
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as typeof activeSubTab)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border whitespace-nowrap transition-all ${
                activeSubTab === tab.id
                  ? 'bg-brand/10 border-brand/40 text-brand shadow-sm'
                  : 'bg-soft/50 border-line text-ink-2 hover:bg-soft hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {currentTab && 'path' in currentTab && currentTab.path && (
          <a
            href={currentTab.path}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-brand hover:underline flex items-center gap-1 self-end sm:self-auto"
          >
            Abrir em Nova Aba <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Main View Container */}
      <div
        className={`flex-1 bg-surface rounded-xl border border-line overflow-hidden shadow-sm flex flex-col ${isFullscreen ? 'h-[calc(100vh-110px)]' : 'min-h-[520px]'}`}
      >
        {activeSubTab === 'motor' && (
          <iframe
            key={`motor-${iframeKey}`}
            src="/tools/social-selling/Motor de Social Selling.html"
            className="w-full h-full min-h-[520px] border-none"
            title="Motor de Social Selling"
          />
        )}

        {activeSubTab === 'pipeline' && (
          <iframe
            key={`pipeline-${iframeKey}`}
            src="/tools/social-selling/Pipeline Tracker.html"
            className="w-full h-full min-h-[650px] border-none"
            title="Pipeline Tracker"
          />
        )}

        {activeSubTab === 'linkedin' && (
          <iframe
            key={`linkedin-${iframeKey}`}
            src="/tools/social-selling/Kit Campanha LinkedIn.html"
            className="w-full h-full min-h-[650px] border-none"
            title="Birth Hub 360 Kit Campanha LinkedIn"
          />
        )}

        {activeSubTab === 'posts' && (
          <div className="p-6 space-y-6 overflow-y-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-ink">
                  Acervo de Posts para LinkedIn (Semanas 1 a 5)
                </h2>
                <p className="text-xs text-ink-2">
                  Textos estratégicos e copys prontas para publicação e engajamento comercial —{' '}
                  {BRAND.shortName}.
                </p>
              </div>

              {/* Quick Search Bar */}
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-ink-2 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar por palavra-chave..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-soft/50 border border-line rounded-xl text-ink focus:outline-none focus:border-brand"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPosts.map((item, idx) => (
                <div
                  key={idx}
                  className="p-5 bg-soft/30 rounded-2xl border border-line space-y-3 flex flex-col justify-between hover:border-brand/30 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-brand/10 text-brand border border-brand/20">
                        {item.semana}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyCopy(item.copy, idx)}
                        className="px-2.5 py-1 text-xs font-medium bg-soft text-ink hover:bg-line rounded-lg border border-line flex items-center gap-1.5 transition-colors"
                        title="Copiar texto para publicação no LinkedIn"
                      >
                        {copiedPostIndex === idx ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-success-active dark:text-success" />
                            <span className="text-success-active dark:text-success font-bold">
                              Copiado!
                            </span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copiar Copy
                          </>
                        )}
                      </button>
                    </div>
                    <h3 className="text-sm font-bold text-ink">{item.tema}</h3>
                    <p className="text-xs text-ink-2 font-medium">{item.desc}</p>
                    <div className="p-3 bg-surface rounded-xl border border-line/60 text-xs text-ink-2 leading-relaxed italic">
                      &quot;{item.copy}&quot;
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
