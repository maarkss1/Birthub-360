import type React from 'react';
import { AtlasLogo } from './AtlasLogo.js';
import { TotalTracLogo } from './TotalTracLogo.js';
import type { ThemeMode, User } from '../types.js';
import {  
  Sparkles, 
  Database, 
  MessageSquare, 
  Terminal, 
  FileCode, 
  FileSpreadsheet, 
  Menu,
  BookOpen,
  Sun,
  Moon,
  LogOut,
  User as UserIcon,
  Users,
  ListChecks
, TrendingUp } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onExportJSON: () => void;
  onExportCSV: () => void;
  hasResults: boolean;
  onToggleSidebar: () => void;
  onOpenBrandGuide: () => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  user: User;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onExportJSON,
  onExportCSV,
  hasResults,
  onToggleSidebar,
  onOpenBrandGuide,
  theme,
  setTheme,
  user,
  onLogout
}) => {
  const navItems = [
    { id: 'prospector', label: 'Prospecção & Leads', icon: Sparkles },
    { id: 'chat', label: 'Chat LLaMA3', icon: MessageSquare },
    { id: 'database', label: 'Banco Relacional (SQL)', icon: Database },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'distribution', label: 'Distribuição', icon: Users },
    { id: 'tasks', label: 'Tarefas', icon: ListChecks },
    { id: 'terminal', label: 'Diagnóstico Ollama', icon: Terminal },
  ];

  const isDark = theme === 'dark';

  return (
    <header className={`sticky top-0 z-30 shadow-md transition-colors duration-200 border-b ${
      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-slate-100'
    }`}>
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left Side: Mobile Menu & Atlas Logo */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleSidebar}
              className={`lg:hidden p-2 rounded-xl transition ${
                isDark 
                  ? 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700' 
                  : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200'
              }`}
              title="Abrir Barra Lateral de Configurações"
            >
              <Menu className="w-5 h-5" />
            </button>
            {user.company === 'totaltrac' ? (
              <TotalTracLogo variant="with-subtitle" size="sm" theme={theme} />
            ) : (
              <AtlasLogo variant="with-subtitle" size="sm" theme={theme} />
            )}
          </div>

          <div className="flex items-center gap-2 md:hidden">
            {/* Mobile Theme Toggle */}
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className={`p-1.5 rounded-lg border transition ${
                isDark 
                  ? 'bg-slate-800 text-amber-400 border-slate-700 hover:bg-slate-700' 
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
              title={isDark ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={onOpenBrandGuide}
              className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition ${
                isDark 
                  ? 'bg-slate-800 text-slate-300 hover:text-[var(--brand-primary)] border-slate-700' 
                  : 'bg-slate-100 text-slate-700 hover:text-[var(--brand-primary)] border-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
              <span>Marca</span>
            </button>
          </div>
        </div>

        {/* Center: Navigation Tabs */}
        {/* Gestor navega e vê tudo (inclusive Distribuição, com os leads de todos os
            vendedores) mas sem o SQL Explorer — acesso a banco bruto fica só com admin. */}
        {(user.role === 'admin' || user.role === 'gestor') && (
          <nav className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {navItems.filter(item => user.role === 'admin' || item.id !== 'database').map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap ${
                    isActive
                      ? 'bg-[var(--brand-primary)] text-white shadow-md shadow-[var(--brand-primary)]/20'
                      : isDark
                        ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        )}

        {/* Right Side: Quick Export Actions, Theme Toggle & Brand Guide */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          {/* Theme Toggle Button (Light / Dark) */}
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className={`hidden md:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition font-medium ${
              isDark 
                ? 'bg-slate-800/80 hover:bg-slate-700 text-amber-300 border-slate-700' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200 shadow-sm'
            }`}
            title={isDark ? 'Ativar Modo Claro (Atlas Light)' : 'Ativar Modo Escuro (Atlas Dark)'}
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Modo Claro</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-700" />
                <span>Modo Escuro</span>
              </>
            )}
          </button>

          <button
            onClick={onOpenBrandGuide}
            className={`hidden md:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition font-medium ${
              isDark 
                ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
            <span>Guia Visual Atlas</span>
          </button>

          {hasResults && (
            <>
              <button
                onClick={onExportJSON}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition flex items-center gap-1.5 ${
                  isDark 
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                }`}
                title="Exportar todos os leads e mensagens para JSON"
              >
                <FileCode className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                <span className="hidden sm:inline">Exportar</span> JSON
              </button>
              <button
                onClick={onExportCSV}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition flex items-center gap-1.5 ${
                  isDark 
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                }`}
                title="Exportar dados para planilha CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                <span className="hidden sm:inline">Exportar</span> CSV
              </button>
            </>
          )}

          {/* User & Logout */}
          <div className={`flex items-center gap-2 pl-2 border-l ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <div className={`hidden lg:flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
              <UserIcon className="w-3.5 h-3.5" />
              <span>{user.name.split(' ')[0]} ({user.role})</span>
            </div>
            <button
              onClick={onLogout}
              className={`p-1.5 rounded-lg text-xs font-medium border transition flex items-center gap-1 ${
                isDark 
                  ? 'text-red-400 border-slate-700 hover:bg-slate-800 hover:border-red-500/50' 
                  : 'text-red-600 border-slate-200 hover:bg-red-50 hover:border-red-200'
              }`}
              title="Sair da plataforma"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
