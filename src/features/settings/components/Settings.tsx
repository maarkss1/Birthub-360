import { BrainCircuit, Flag, GitMerge, Moon, Puzzle, Shield, Sun, User, Users } from 'lucide-react';
import { useState } from 'react';
import { IconSliders } from '../../../components/icons/index.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/Card.js';
import { useAuth } from '../../../contexts/AuthContext.js';
import { useTheme } from '../../../contexts/ThemeContext.js';
import { hasRequiredRole } from '../../../lib/auth/authorization.js';
import { SoundFX } from '../../../lib/soundEffects.js';
import { FeatureFlagsPanel } from '../../feature-flags/components/FeatureFlagsPanel.js';
import { Integrations } from '../../integrations/components/Integrations.js';
import { AuditLogs } from '../../lgpd/components/AuditLogs.js';
import { DataSubjectRights } from '../../lgpd/components/DataSubjectRights.js';
import { Team } from '../../team/components/Team.js';
import { CompanyDedupPanel } from './CompanyDedupPanel.js';
import { LeadDedupPanel } from './LeadDedupPanel.js';
import { LearningProfilePanel } from './LearningProfilePanel.js';
import { MemoryGovernancePanel } from './MemoryGovernancePanel.js';

import { PageHeader } from '../../../components/ui/PageHeader.js';

export function Settings() {
  const { theme, setThemeMode } = useTheme();
  const { currentUser, isAdmin } = useAuth();
  // GESTOR também pode ler auditoria no backend (`lgpd.routes.ts`, `requireRole(['ADMIN',
  // 'GESTOR'])`, já coberto por teste), mas a aba só checava `isAdmin` — GESTOR nunca tinha como
  // chegar numa ação que o próprio backend autoriza (achado do Piloto 025, mesmo tipo de bug de
  // RBAC dos pilotos anteriores, só que na direção oposta: esconder em vez de mostrar demais).
  const canViewAudit = hasRequiredRole(currentUser?.role ?? '', ['ADMIN', 'GESTOR']);

  const [activeTab, setActiveTab] = useState<
    'profile' | 'users' | 'integrations' | 'featureFlags' | 'audit' | 'memory' | 'dedup'
  >('profile');

  return (
    <div className="flex-1 overflow-y-auto bg-transparent font-sans">
      <div className="bh-page bh-page-stack">
        <div className="max-w-4xl mx-auto w-full">
          <PageHeader
            title="Configurações"
            subtitle="Gerencie sua conta, equipe, integrações e sistema."
            icon={<IconSliders className="w-5 h-5" />}
          />

          <div className="flex gap-6 overflow-x-auto no-scrollbar border-b border-line mt-6 mb-8">
            <button
              type="button"
              onClick={() => {
                SoundFX.play('navigate');
                setActiveTab('profile');
              }}
              className={`flex items-center gap-2 pb-3 border-b-2 font-bold text-sm transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'profile'
                  ? 'border-brand text-brand-ink dark:text-brand'
                  : 'border-transparent text-ink-2 hover:text-ink hover:border-line'
              }`}
            >
              <User size={16} /> Perfil e Aparência
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  SoundFX.play('navigate');
                  setActiveTab('users');
                }}
                className={`flex items-center gap-2 pb-3 border-b-2 font-bold text-sm transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'users'
                    ? 'border-brand text-brand-ink dark:text-brand'
                    : 'border-transparent text-ink-2 hover:text-ink hover:border-line'
                }`}
              >
                <Users size={16} /> Usuários
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                SoundFX.play('navigate');
                setActiveTab('integrations');
              }}
              className={`flex items-center gap-2 pb-3 border-b-2 font-bold text-sm transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'integrations'
                  ? 'border-brand text-brand-ink dark:text-brand'
                  : 'border-transparent text-ink-2 hover:text-ink hover:border-line'
              }`}
            >
              <Puzzle size={16} /> Integrações
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  SoundFX.play('navigate');
                  setActiveTab('featureFlags');
                }}
                className={`flex items-center gap-2 pb-3 border-b-2 font-bold text-sm transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'featureFlags'
                    ? 'border-brand text-brand-ink dark:text-brand'
                    : 'border-transparent text-ink-2 hover:text-ink hover:border-line'
                }`}
              >
                <Flag size={16} /> Feature Flags
              </button>
            )}
            {canViewAudit && (
              <button
                type="button"
                onClick={() => {
                  SoundFX.play('navigate');
                  setActiveTab('audit');
                }}
                className={`flex items-center gap-2 pb-3 border-b-2 font-bold text-sm transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'audit'
                    ? 'border-brand text-brand-ink dark:text-brand'
                    : 'border-transparent text-ink-2 hover:text-ink hover:border-line'
                }`}
              >
                <Shield size={16} /> Auditoria & LGPD
              </button>
            )}
            {canViewAudit && (
              <button
                type="button"
                onClick={() => {
                  SoundFX.play('navigate');
                  setActiveTab('memory');
                }}
                className={`flex items-center gap-2 pb-3 border-b-2 font-bold text-sm transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'memory'
                    ? 'border-brand text-brand-ink dark:text-brand'
                    : 'border-transparent text-ink-2 hover:text-ink hover:border-line'
                }`}
              >
                <BrainCircuit size={16} /> Memória & Aprendizado
              </button>
            )}
            {canViewAudit && (
              <button
                type="button"
                onClick={() => {
                  SoundFX.play('navigate');
                  setActiveTab('dedup');
                }}
                className={`flex items-center gap-2 pb-3 border-b-2 font-bold text-sm transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'dedup'
                    ? 'border-brand text-brand-ink dark:text-brand'
                    : 'border-transparent text-ink-2 hover:text-ink hover:border-line'
                }`}
              >
                <GitMerge size={16} /> Deduplicação
              </button>
            )}
          </div>

          {/* Conteúdo da Aba */}
          <div className="space-y-6">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Perfil</CardTitle>
                    <CardDescription>Dados da conta autenticada — somente leitura.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                      {currentUser?.image ? (
                        <img
                          src={currentUser.image}
                          alt=""
                          width={56}
                          height={56}
                          className="w-14 h-14 rounded-full border border-line object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-surface-2 border border-line flex items-center justify-center text-ink font-bold text-lg">
                          {currentUser?.name?.slice(0, 2).toUpperCase() || 'US'}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-ink text-base">
                          {currentUser?.name || 'Usuário'}
                        </p>
                        <p className="text-xs text-ink-2">
                          {currentUser?.email || 'email@exemplo.com'}
                        </p>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-brand/10 text-brand-ink dark:text-brand">
                          {currentUser?.role || 'USUÁRIO'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Aparência e Tema</CardTitle>
                    <CardDescription>Escolha o tema visual e a marca da interface.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      {/* Não é <label htmlFor>: rotula um grupo de botões de escolha (Escuro/Claro),
                        não um único controle — role="group" + aria-labelledby é a associação
                        correta aqui. */}
                      <span
                        id="settings-theme-label"
                        className="text-xs font-bold text-ink-2 uppercase tracking-wider block mb-3"
                      >
                        Tema
                      </span>
                      {/* Toolbar de botões toggle (não campos de formulário) — <fieldset> não
                        traria ganho real de acessibilidade aqui, só estilo. */}
                      {/* biome-ignore lint/a11y/useSemanticElements: ver comentário acima */}
                      <div
                        role="group"
                        aria-labelledby="settings-theme-label"
                        className="flex gap-4"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            SoundFX.play('confirm');
                            setThemeMode('dark');
                          }}
                          aria-pressed={theme === 'dark'}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl border font-bold text-sm transition-colors ${
                            theme === 'dark'
                              ? 'border-brand bg-brand/10 text-ink'
                              : 'border-line bg-surface-2 text-ink-2 hover:text-ink'
                          }`}
                        >
                          <Moon size={18} /> Modo Escuro
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            SoundFX.play('confirm');
                            setThemeMode('light');
                          }}
                          aria-pressed={theme === 'light'}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl border font-bold text-sm transition-colors ${
                            theme === 'light'
                              ? 'border-brand bg-brand/10 text-ink'
                              : 'border-line bg-surface-2 text-ink-2 hover:text-ink'
                          }`}
                        >
                          <Sun size={18} /> Modo Claro
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <LearningProfilePanel />
              </div>
            )}

            {activeTab === 'users' && isAdmin && (
              <div className="space-y-6">
                <Team />
              </div>
            )}

            {activeTab === 'integrations' && (
              <div className="space-y-6">
                <Integrations />
              </div>
            )}

            {activeTab === 'featureFlags' && isAdmin && (
              <div className="space-y-6">
                <FeatureFlagsPanel />
              </div>
            )}

            {activeTab === 'audit' && canViewAudit && (
              <div className="space-y-6">
                <DataSubjectRights />
                <AuditLogs />
              </div>
            )}

            {activeTab === 'memory' && canViewAudit && (
              <div className="space-y-6">
                <MemoryGovernancePanel />
              </div>
            )}

            {activeTab === 'dedup' && canViewAudit && (
              <div className="space-y-6">
                <LeadDedupPanel />
                <CompanyDedupPanel />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
