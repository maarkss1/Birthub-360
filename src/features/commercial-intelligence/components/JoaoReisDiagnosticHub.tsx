import {
  BarChart3,
  BookOpen,
  Bot,
  Calendar,
  CalendarCheck,
  ClipboardCheck,
  FileText,
  Inbox,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { Dialog } from '../../../components/ui/Dialog';
import { useAuth } from '../../../contexts/AuthContext';
import { DailyPlanHub } from './DailyPlanHub';
import { AiCoachTab } from './joao-reis/AiCoachTab';
import { ComparativeTab } from './joao-reis/ComparativeTab';
import { DailyPlanTab } from './joao-reis/DailyPlanTab';
import { DiagnosticoTab } from './joao-reis/DiagnosticoTab';
import { EmCadenciaTab } from './joao-reis/EmCadenciaTab';
import { MonthViewTab } from './joao-reis/MonthViewTab';
import { Pauta1to1Tab } from './joao-reis/Pauta1to1Tab';

export { DailyPlanHub };

export function JoaoReisDiagnosticHub() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<
    | 'daily'
    | 'julho'
    | 'agosto'
    | 'comparativo'
    | 'emcadencia'
    | 'diagnostico'
    | 'iacoach'
    | 'pauta1to1'
  >('daily');
  const [modalContent, setModalContent] = useState<{ title: string; body: React.ReactNode } | null>(
    null,
  );

  const isJoaoReis =
    currentUser?.email?.toLowerCase().includes('joao.reis') ||
    currentUser?.name?.toLowerCase().includes('joão reis');

  const TAB_ITEMS: {
    id: typeof activeTab;
    icon: typeof ClipboardCheck;
    title: string;
    subtitle: string;
  }[] = [
    {
      id: 'daily',
      icon: ClipboardCheck,
      title: 'Plano Diário',
      subtitle: 'Pace & Sprint',
    },
    { id: 'iacoach', icon: Bot, title: 'IA Coach SDR', subtitle: 'Pitches & Meet' },
    { id: 'pauta1to1', icon: FileText, title: 'Pauta de 1:1', subtitle: 'Exportar p/ Gestor' },
    { id: 'julho', icon: Calendar, title: 'Julho 2026', subtitle: '213 Atividades' },
    { id: 'agosto', icon: CalendarCheck, title: 'Agosto 2026', subtitle: '530 Atividades' },
    { id: 'comparativo', icon: BarChart3, title: 'Comparativo', subtitle: 'Jul x Ago Δ' },
    { id: 'emcadencia', icon: Inbox, title: 'Em Cadência', subtitle: '130 Leads Fila' },
    { id: 'diagnostico', icon: BookOpen, title: 'Diagnóstico', subtitle: 'Gargalos & Ação' },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-bg p-4 md:p-8 space-y-6 min-h-screen text-ink">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Banner de Identificação */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-brand/10 via-brand-2/10 to-gold/10 border border-brand/20 shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-brand mb-1">
              <Sparkles className="w-4 h-4 text-brand" />
              Diagnóstico SDR &amp; Plano Diário Operacional · BDR ID 392
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-ink">João Reis da Birth Hub 360</h1>
            <p className="text-sm text-ink-2 mt-1">
              Hub completo de performance, automações de prospecção, IA Coach e pauta de 1:1.
            </p>
          </div>
          {isJoaoReis && (
            <div className="px-4 py-2 rounded-2xl bg-brand-active text-on-brand text-xs font-black shadow-md flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Sessão Exclusiva — João Reis
            </div>
          )}
        </div>

        {/* Navegação por Abas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
          {TAB_ITEMS.map(({ id, icon: Icon, title, subtitle }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`relative overflow-hidden flex items-center gap-3 rounded-card border p-3.5 text-left transition-colors duration-200 cursor-pointer ${
                  active
                    ? 'border-brand/40 bg-surface shadow-card-hover -translate-y-0.5'
                    : 'border-line bg-surface shadow-card hover:-translate-y-0.5 hover:shadow-card-hover hover:border-brand/20'
                }`}
              >
                <span
                  className={`absolute inset-x-0 top-0 h-[3px] ${active ? 'bg-gradient-to-r from-brand to-brand-2' : 'bg-line'}`}
                />
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                    active ? 'bg-brand text-on-brand' : 'bg-brand/10 text-brand'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-black leading-tight text-ink truncate">
                    {title}
                  </span>
                  <span className="block text-[10px] text-ink-2 leading-snug truncate">
                    {subtitle}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {activeTab === 'daily' && (
          <DailyPlanTab onNavigateToEmCadencia={() => setActiveTab('emcadencia')} />
        )}
        {activeTab === 'iacoach' && <AiCoachTab />}
        {activeTab === 'pauta1to1' && <Pauta1to1Tab />}
        {activeTab === 'julho' && <MonthViewTab month="julho" />}
        {activeTab === 'agosto' && <MonthViewTab month="agosto" />}
        {activeTab === 'comparativo' && <ComparativeTab />}
        {activeTab === 'emcadencia' && <EmCadenciaTab />}
        {activeTab === 'diagnostico' && <DiagnosticoTab />}

        <Dialog
          isOpen={!!modalContent}
          onClose={() => setModalContent(null)}
          title={modalContent?.title ?? ''}
          maxWidth="max-w-2xl"
        >
          <div className="text-xs text-ink-2 space-y-2 max-h-[60vh] overflow-y-auto pr-2">
            {modalContent?.body}
          </div>
        </Dialog>
      </div>
    </div>
  );
}
