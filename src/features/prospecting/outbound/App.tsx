import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar.js';
import { Header } from './components/Header.js';
import { ProspectorTab } from './components/ProspectorTab.js';
import { PerformanceTab } from './components/PerformanceTab.js';
import { LeadDistributionTab } from './components/LeadDistributionTab.js';
import { TasksOverviewTab } from './components/TasksOverviewTab.js';
import { ChatTab } from './components/ChatTab.js';
import { DatabaseExplorerTab } from './components/DatabaseExplorerTab.js';
import { OllamaTerminalTab } from './components/OllamaTerminalTab.js';
import { BrandGuideModal } from './components/BrandGuideModal.js';
import { LoginScreen } from './components/LoginScreen.js';
import { ReportErrorButton } from './components/ReportErrorButton.js';
import { UserKanbanBoard } from './components/UserKanbanBoard.js';
import { MyTasksTab } from './components/MyTasksTab.js';
import type { AIConfig, Lead, DatabaseStats, ThemeMode, RecentSearch, IntegrationsConfig, LeadStage, User, ProspectFilters, ProspectRunMeta } from './types.js';
import { resolveBitrixWebhook } from './utils/bitrix.js';
import confetti from 'canvas-confetti';

export default function App() {
  // Auth state
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('atlas_user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (loggedUser: User) => {
    setUser(loggedUser);
    localStorage.setItem('atlas_user', JSON.stringify(loggedUser));
  };

  // Auth & RBAC (CPI follow-up): o cookie de sessão (httpOnly, o front nunca o lê
  // diretamente) é quem de fato autoriza cada chamada à API a partir de agora — o
  // objeto em localStorage é só para a UI lembrar "quem estava logado" ao recarregar
  // a página, sem precisar pedir email/senha de novo. Por isso o logout precisa
  // avisar o servidor para invalidar o cookie, não só limpar o estado local; nunca
  // deve travar o botão de sair, mesmo se a chamada falhar (ex: já sem sessão).
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('atlas_user');
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
  };

  // Auth & RBAC (CPI follow-up): a sessão restaurada de localStorage no mount (acima)
  // é só a lembrança visual de "quem estava logado" - o cookie httpOnly que de fato
  // autoriza chamadas à API tem TTL próprio (12h, ver server/auth.ts) e pode já ter
  // expirado sem que o localStorage saiba. Confirma contra /api/auth/me uma vez ao
  // montar; se o servidor não reconhecer nenhuma sessão válida, desloga localmente
  // em vez de deixar a UI "logada" chamando rotas que vão devolver 401 silenciosamente.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => (res.ok ? res.json() : { user: null }))
      .then(data => {
        if (!cancelled && !data?.user) {
          handleLogout();
        }
      })
      .catch(() => {
        // Falha de rede ao checar a sessão não desloga ninguém - só um problema de
        // conectividade momentâneo, não evidência de que a sessão é inválida.
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleLogout, user]);

  // Theme state with local persistence
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('atlas_theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'light';
  });

  useEffect(() => {
    localStorage.setItem('atlas_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [theme]);

  // Navigation
  const [activeTab, setActiveTab] = useState<string>('prospector');
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState<boolean>(false);
  const [isBrandGuideOpen, setIsBrandGuideOpen] = useState<boolean>(false);
  // Alterna entre o Kanban de leads e a visão consolidada de tarefas, só para vendedores
  // (role 'user') — eles não têm as abas de navegação do admin/gestor no Header.
  const [sellerView, setSellerView] = useState<'kanban' | 'tasks'>('kanban');

  // Integrations Configuration Preloaded with User's API Keys
  // Chaves em branco por padrão: o backend usa as chaves configuradas via
  // variáveis de ambiente do servidor quando o usuário não informa a sua própria aqui.
  const [integrationsConfig, setIntegrationsConfig] = useState<IntegrationsConfig>({
    apolloApiKey: '',
    googlePlacesApiKey: '',
    groqApiKey: '',
    hunterApiKey: '',
    blandAiApiKey: '',
    bitrixTotalTracWebhook: '',
    bitrixAtlasGrWebhook: 'https://atlasgr.bitrix24.com.br/rest/',
    activeBitrixTarget: 'auto',
    customBitrixWebhook: ''
  });

  // AI & Pipeline Configuration
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    provider: 'ollama',
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: 'llama3',
    groqApiKey: '',
    groqModel: 'llama-3.3-70b-versatile',
    geminiModel: 'gemini-3.7-flash',
    temperature: 0.7,
    maxTokens: 2048,
  });

  const [pitch, setPitch] = useState<string>(
    'A Atlas conecta pessoas e tecnologia gerando valores com segurança e inteligência logística. Apoiamos frotas e transportadoras rodoviárias de carga a gerenciar riscos, prever desvios operacionais e reduzir custos de sinistro em até 85%.'
  );

  const [googleApiKey, setGoogleApiKey] = useState<string>('');
  const [apolloApiKey, setApolloApiKey] = useState<string>('');

  // Search & Leads State
  const [query, setQuery] = useState<string>('Grandes Frotas de Transportadoras Rodoviárias de Carga Geral em Campinas, Sumaré e Região Metropolitana');
  const [limit, setLimit] = useState<number>(3);
  // Wave 1 (CPI) - Search Intent: filtros estruturados reportados pelo ProspectorTab,
  // enviados individualmente ao backend junto com `query` (nunca só a string composta).
  const [searchFilters, setSearchFilters] = useState<ProspectFilters>({});
  const [leads, setLeads] = useState<Lead[]>([]);
  // Wave 7 + Wave 10 (CPI) - Progressive Search & Observabilidade: metadados da
  // última busca (funil, motivo de parada, Search-ID, se a lista foi ranqueada)
  // - vem junto com `leads` na mesma resposta de /api/prospect, null antes da
  // primeira busca desta sessão.
  const [prospectRunMeta, setProspectRunMeta] = useState<ProspectRunMeta | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [searchAbortController, setSearchAbortController] = useState<AbortController | null>(null);

  // Recent Searches State
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>(() => {
    try {
      const saved = localStorage.getItem('atlas_recent_searches');
      return saved ? JSON.parse(saved) : [
        {
          id: 's-1',
          query: 'Transportadoras e Operadores Logísticos em São Paulo',
          limit: 3,
          timestamp: new Date().toISOString(),
          leadsCount: 3
        },
        {
          id: 's-2',
          query: 'Frotas de Cargas Refrigeradas no Triângulo Mineiro',
          limit: 3,
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          leadsCount: 3
        }
      ];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('atlas_recent_searches', JSON.stringify(recentSearches));
  }, [recentSearches]);

  // Relational Database Stats
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);

  // Ollama Connection Status
  const [ollamaStatus, setOllamaStatus] = useState<{
    online: boolean;
    latencyMs?: number;
    message?: string;
    availableModels?: string[];
    hasRequestedModel?: boolean;
  } | null>(null);
  const [isCheckingOllama, setIsCheckingOllama] = useState<boolean>(false);

  const fetchDbStats = async () => {
    try {
      const res = await fetch('/api/db/stats');
      if (res.ok) {
        const data = await res.json();
        setDbStats(data);
      }
    } catch (err: any) {
      console.warn('Erro ao obter estatísticas do banco:', err);
    }
  };

  const checkOllamaStatus = async () => {
    setIsCheckingOllama(true);
    try {
      const res = await fetch('/api/ollama/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: aiConfig.ollamaUrl,
          model: aiConfig.ollamaModel
        })
      });
      const data = await res.json();
      setOllamaStatus(data);
    } catch (_err: any) {
      setOllamaStatus({
        online: false,
        message: 'Não foi possível conectar ao Ollama local'
      });
    } finally {
      setIsCheckingOllama(false);
    }
  };

  const loadInitialCampaign = async () => {
    try {
      const res = await fetch('/api/campaigns');
      if (res.ok) {
        const campaigns = await res.json();
        if (campaigns && campaigns.length > 0) {
          const campDetailRes = await fetch(`/api/campaigns/${campaigns[0].id}`);
          if (campDetailRes.ok) {
            const detail = await campDetailRes.json();
            if (detail.leads && detail.leads.length > 0) {
              setLeads(detail.leads);
            }
          }
        }
      }
    } catch (err: any) {
      console.warn('Erro ao carregar campanha inicial:', err);
    }
  };

  // Fetch initial stats and initial leads on mount
  useEffect(() => {
    fetchDbStats();
    checkOllamaStatus();
    loadInitialCampaign();
  }, [loadInitialCampaign, fetchDbStats, checkOllamaStatus]);

  // Start Prospecting Search Pipeline
  const handleStartSearch = async () => {
    if (!query.trim() || isSearching) return;

    const controller = new AbortController();
    setSearchAbortController(controller);
    setIsSearching(true);
    setProgressPercent(15);
    setStatusMessage('1/4 Consultando empresas no Google Places...');

    try {
      const t1 = setTimeout(() => {
        setProgressPercent(40);
        setStatusMessage('2/3 Consultando dados cadastrais oficiais na API Pública do CNPJ (Receita/BrasilAPI)...');
      }, 500);

      const t2 = setTimeout(() => {
        setProgressPercent(75);
        setStatusMessage('3/3 Mapeando decisores, e-mails e telefones diretos via Apollo.io...');
      }, 1100);

      const effectiveGoogleKey = googleApiKey || integrationsConfig.googlePlacesApiKey;
      const effectiveApolloKey = apolloApiKey || integrationsConfig.apolloApiKey;

      const res = await fetch('/api/prospect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: controller.signal,
        body: JSON.stringify({
          query,
          limit,
          pitch,
          aiConfig: {
            ...aiConfig,
            groqApiKey: aiConfig.groqApiKey || integrationsConfig.groqApiKey
          },
          googleApiKey: effectiveGoogleKey,
          apolloApiKey: effectiveApolloKey,
          company: user?.company === 'atlas' ? 'atlas' : 'totaltrac',
          bitrixWebhook: resolveBitrixWebhook(user, integrationsConfig),
          // Wave 1 (CPI) - Search Intent: filtros estruturados enviados individualmente
          // (o backend monta e valida o SearchIntent a partir destes campos).
          ...searchFilters
        })
      });

      clearTimeout(t1);
      clearTimeout(t2);

      setProgressPercent(95);
      setStatusMessage('Finalizando e salvando leads mapeados no SQLite...');

      if (res.ok) {
        const data = await res.json();
        const foundLeads = data.leads || [];
        setLeads(foundLeads);
        // Wave 7 + Wave 10 (CPI): captura os metadados honestos da busca junto
        // com os leads - nunca só a lista, escondendo funil/ranking/Search-ID.
        setProspectRunMeta({
          searchId: data.searchId,
          funnelSummary: data.funnelSummary,
          stopReason: data.stopReason,
          rankingApplied: data.rankingApplied,
          rankingNote: data.rankingNote
        });
        setProgressPercent(100);
        setStatusMessage(`Pronto! ${foundLeads.length} empresas mapeadas com Places, CNPJ Oficial e Decisores Apollo.`);
        fetchDbStats();

        // Add to recent searches
        const newSearchItem: RecentSearch = {
          id: `s-${Date.now()}`,
          query,
          limit,
          timestamp: new Date().toISOString(),
          leadsCount: foundLeads.length
        };
        setRecentSearches(prev => [newSearchItem, ...prev.filter(s => s.query !== query)].slice(0, 8));

        // Celebration (canvas-confetti needs resolved colors, not CSS var() references).
        // Resolve from the [data-brand] element itself, not <html> — the override lives there, not at :root.
        const brandEl = document.querySelector('[data-brand]') || document.documentElement;
        const rootStyle = getComputedStyle(brandEl);
        const brandPrimary = rootStyle.getPropertyValue('--brand-primary').trim() || '#FF5618';
        const brandSecondary = rootStyle.getPropertyValue('--brand-secondary').trim() || '#FF8020';
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: [brandPrimary, brandSecondary, '#FFC500']
        });
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro na prospecção');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        alert(`Falha na execução: ${err.message}`);
      }
    } finally {
      setTimeout(() => {
        setIsSearching(false);
        setSearchAbortController(null);
      }, 600);
    }
  };

  const handleStopSearch = () => {
    if (searchAbortController) {
      searchAbortController.abort();
      setIsSearching(false);
      setStatusMessage('Prospecção interrompida pelo usuário.');
      setSearchAbortController(null);
    }
  };

  // Update Message content or status in SQLite
  const handleUpdateMessage = async (messageId: string, content: string, status: string) => {
    try {
      await fetch(`/api/messages/${messageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, status })
      });
      fetchDbStats();
    } catch (err: any) {
      console.error('Erro ao atualizar mensagem:', err);
    }
  };

  // Update Lead Funnel Stage in SQLite & Local State
  const handleUpdateStage = async (leadId: string, stage: LeadStage) => {
    try {
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage } : l));
      await fetch(`/api/leads/${leadId}/stage`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ stage, userId: user?.id })
      });
      fetchDbStats();
    } catch (err: any) {
      console.error('Erro ao atualizar estágio do lead:', err);
    }
  };

  // Update Lead Tags in SQLite & Local State
  const handleUpdateTags = async (leadId: string, tags: string[]) => {
    try {
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, tags } : l));
      await fetch(`/api/leads/${leadId}/tags`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tags, userId: user?.id })
      });
      fetchDbStats();
    } catch (err: any) {
      console.error('Erro ao atualizar tags do lead:', err);
    }
  };

  // Delete a single recent search
  const handleDeleteRecentSearch = (id: string) => {
    setRecentSearches(prev => prev.filter(s => s.id !== id));
  };

  // Execute a recent search immediately
  const handleExecuteRecentSearch = (search: RecentSearch) => {
    setQuery(search.query);
    setLimit(search.limit);
    setTimeout(() => {
      handleStartSearch();
    }, 100);
  };

  // Export functions
  const handleExportJSON = () => {
    const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(leads, null, 2))}`;
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `atlas_outbound_leads_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
  };

  const handleExportCSV = () => {
    let csv = 'Empresa,Endereco,Telefone,Website,Avaliacao,Decisor_Nome,Decisor_Cargo,Decisor_Email,Decisor_LinkedIn,Cold_Call,Cold_Email,WhatsApp,LinkedIn\n';
    leads.forEach(l => {
      const dm = l.decision_makers?.[0] || {
        name: l.decision_maker_name || '',
        title: l.decision_maker_title || '',
        email: l.decision_maker_email || '',
        linkedin: l.decision_maker_linkedin || ''
      };
      const cc = (l.copies?.cold_call || '').replace(/"/g, '""');
      const ce = (l.copies?.cold_email || '').replace(/"/g, '""');
      const wpp = (l.copies?.whatsapp || '').replace(/"/g, '""');
      const lk = (l.copies?.linkedin || '').replace(/"/g, '""');

      csv += `"${l.name}","${l.address}","${l.phone}","${l.website}","${l.rating}","${dm.name}","${dm.title}","${dm.email}","${dm.linkedin}","${cc}","${ce}","${wpp}","${lk}"\n`;
    });

    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', url);
    dlAnchor.setAttribute('download', `atlas_outbound_leads_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
  };

  const isDark = theme === 'dark';
  const brand = user?.company === 'totaltrac' ? 'totaltrac' : 'atlas';

  if (!user) {
    return (
      <>
        <LoginScreen onLogin={handleLogin} isDark={isDark} setTheme={setTheme} />
        <ReportErrorButton user={null} page="login" isDark={isDark} />
      </>
    );
  }

  if (user.role === 'user') {
    return (
      <div data-brand={brand} className={`min-h-screen flex flex-col antialiased transition-colors duration-200 ${
        isDark ? 'bg-[#090d16] text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}>
        {/* Header */}
        <Header
          activeTab="kanban"
          setActiveTab={() => {}}
          onExportJSON={handleExportJSON}
          onExportCSV={handleExportCSV}
          hasResults={false}
          onToggleSidebar={() => {}}
          onOpenBrandGuide={() => {}}
          theme={theme}
          setTheme={setTheme}
          user={user}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
          <div className="flex justify-center sm:justify-start mb-6">
            <div className={`inline-flex p-1 rounded-full ${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-slate-100 border border-slate-200'}`}>
              {([
                { id: 'kanban', label: 'Meus Leads' },
                { id: 'tasks', label: 'Minhas Tarefas' },
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSellerView(tab.id)}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-full transition ${
                    sellerView === tab.id
                      ? 'bg-[var(--brand-primary)] text-white shadow-sm'
                      : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          {sellerView === 'kanban' ? (
            <UserKanbanBoard user={user} isDark={isDark} />
          ) : (
            <MyTasksTab user={user} isDark={isDark} />
          )}
        </main>
        <ReportErrorButton user={user} page={sellerView === 'kanban' ? 'kanban' : 'tasks'} isDark={isDark} />
      </div>
    );
  }

  return (
    <div data-brand={brand} className={`min-h-screen flex flex-col antialiased transition-colors duration-200 ${
      isDark ? 'bg-[#090d16] text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onExportJSON={handleExportJSON}
        onExportCSV={handleExportCSV}
        hasResults={leads.length > 0}
        onToggleSidebar={() => setIsSidebarMobileOpen(!isSidebarMobileOpen)}
        onOpenBrandGuide={() => setIsBrandGuideOpen(true)}
        theme={theme}
        setTheme={setTheme}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Layout: Sidebar + Tab Content */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          aiConfig={aiConfig}
          setAiConfig={setAiConfig}
          pitch={pitch}
          setPitch={setPitch}
          googleApiKey={googleApiKey}
          setGoogleApiKey={setGoogleApiKey}
          apolloApiKey={apolloApiKey}
          setApolloApiKey={setApolloApiKey}
          dbStats={dbStats}
          onOpenBrandGuide={() => setIsBrandGuideOpen(true)}
          onNavigateTab={(tab) => setActiveTab(tab)}
          ollamaStatus={ollamaStatus}
          checkOllama={checkOllamaStatus}
          isCheckingOllama={isCheckingOllama}
          isOpenMobile={isSidebarMobileOpen}
          setIsOpenMobile={setIsSidebarMobileOpen}
          theme={theme}
          recentSearches={recentSearches}
          onSelectRecentSearch={(search) => {
            setQuery(search.query);
            setLimit(search.limit);
          }}
          onExecuteRecentSearch={handleExecuteRecentSearch}
          onDeleteRecentSearch={handleDeleteRecentSearch}
          onClearRecentSearches={() => setRecentSearches([])}
          integrationsConfig={integrationsConfig}
          setIntegrationsConfig={setIntegrationsConfig}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {activeTab === 'prospector' && (
            <ProspectorTab
              user={user}
              query={query}
              setQuery={setQuery}
              limit={limit}
              setLimit={setLimit}
              pitch={pitch}
              aiConfig={aiConfig}
              googleApiKey={googleApiKey}
              apolloApiKey={apolloApiKey}
              leads={leads}
              setLeads={setLeads}
              isSearching={isSearching}
              onStartSearch={handleStartSearch}
              onStopSearch={handleStopSearch}
              statusMessage={statusMessage}
              progressPercent={progressPercent}
              onUpdateMessage={handleUpdateMessage}
              onUpdateStage={handleUpdateStage}
              onUpdateTags={handleUpdateTags}
              onExportJSON={handleExportJSON}
              onExportCSV={handleExportCSV}
              theme={theme}
              integrationsConfig={integrationsConfig}
              onFiltersChange={setSearchFilters}
              runMeta={prospectRunMeta}
            />
          )}

          {activeTab === 'chat' && (
            <ChatTab aiConfig={aiConfig} theme={theme} />
          )}

          {activeTab === 'performance' && (
            <PerformanceTab leads={leads} isDark={isDark} />
          )}

          {activeTab === 'distribution' && (
            <LeadDistributionTab isDark={isDark} />
          )}

          {activeTab === 'tasks' && (
            <TasksOverviewTab isDark={isDark} />
          )}

          {activeTab === 'database' && (
            <DatabaseExplorerTab
              dbStats={dbStats}
              onRefreshStats={fetchDbStats}
              theme={theme}
            />
          )}

          {activeTab === 'terminal' && (
            <OllamaTerminalTab
              aiConfig={aiConfig}
              setAiConfig={setAiConfig}
              ollamaStatus={ollamaStatus}
              onCheckOllama={checkOllamaStatus}
              isChecking={isCheckingOllama}
            />
          )}
        </main>
      </div>

      {/* Brand Visual Guide Modal */}
      <BrandGuideModal
        isOpen={isBrandGuideOpen}
        onClose={() => setIsBrandGuideOpen(false)}
      />

      <ReportErrorButton user={user} page={activeTab} isDark={isDark} />
    </div>
  );
}
