import React, { useState, useEffect } from 'react';
import {
  Settings, Globe, Bell, Keyboard, LayoutGrid,
  SlidersHorizontal, ArrowRight, AlertTriangle
} from 'lucide-react';
import { Card, Button, Badge, Switch, Select, useToast, ToastContainer, Skeleton } from '../../components/design-system';
import { logger } from '../../lib/logger';

const PREFERENCES_DEFAULTS = {
  lang: 'pt',
  timezone: 'America/Sao_Paulo',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '24h',
  density: 'comfortable',
  highContrast: false,
  reducedMotion: false,
  notifEmail: true,
  notifBrowser: true,
  notifWeekly: false,
  notifCalls: true,
};

export default function PreferencesPage() {
  const { toasts, showToast } = useToast();

  // States — start `null`-ish (loaded=false) so we never briefly render client-only defaults
  // as if they were the user's saved choice before the real GET /api/settings resolves.
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);

  const [lang, setLang] = useState(PREFERENCES_DEFAULTS.lang);
  const [timezone, setTimezone] = useState(PREFERENCES_DEFAULTS.timezone);
  const [dateFormat, setDateFormat] = useState(PREFERENCES_DEFAULTS.dateFormat);
  const [timeFormat, setTimeFormat] = useState(PREFERENCES_DEFAULTS.timeFormat);
  const [density, setDensity] = useState(PREFERENCES_DEFAULTS.density);
  const [highContrast, setHighContrast] = useState(PREFERENCES_DEFAULTS.highContrast);
  const [reducedMotion, setReducedMotion] = useState(PREFERENCES_DEFAULTS.reducedMotion);

  // Notifications
  const [notifEmail, setNotifEmail] = useState(PREFERENCES_DEFAULTS.notifEmail);
  const [notifBrowser, setNotifBrowser] = useState(PREFERENCES_DEFAULTS.notifBrowser);
  const [notifWeekly, setNotifWeekly] = useState(PREFERENCES_DEFAULTS.notifWeekly);
  const [notifCalls, setNotifCalls] = useState(PREFERENCES_DEFAULTS.notifCalls);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const s = { ...PREFERENCES_DEFAULTS, ...(data.settings ?? {}) };
        setLang(s.lang);
        setTimezone(s.timezone);
        setDateFormat(s.dateFormat);
        setTimeFormat(s.timeFormat);
        setDensity(s.density);
        setHighContrast(!!s.highContrast);
        setReducedMotion(!!s.reducedMotion);
        setNotifEmail(!!s.notifEmail);
        setNotifBrowser(!!s.notifBrowser);
        setNotifWeekly(!!s.notifWeekly);
        setNotifCalls(!!s.notifCalls);
        setLoaded(true);
      })
      .catch((err) => {
        logger.error('Failed to load user preferences', { err });
        setLoadError(true);
        setLoaded(true);
      });
  }, []);

  // Applies reduced-motion immediately (both on load and on toggle), independent of save, so
  // the effect is never in a state where the switch says "on" but nothing actually changed.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.reducedMotion = reducedMotion ? 'true' : 'false';
  }, [reducedMotion]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            lang, timezone, dateFormat, timeFormat, density,
            highContrast, reducedMotion,
            notifEmail, notifBrowser, notifWeekly, notifCalls,
          },
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast('Preferências salvas com sucesso no seu perfil!', 'success');
    } catch (err) {
      logger.error('Failed to save user preferences', { err });
      showToast('Não foi possível salvar suas preferências. Tente novamente.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const timezones = [
    { value: 'America/Sao_Paulo', label: 'Brasília (GMT-3) — São Paulo' },
    { value: 'America/Manaus', label: 'Amazonas (GMT-4) — Manaus' },
    { value: 'America/New_York', label: 'Eastern Standard Time (GMT-5) — NY' },
    { value: 'Europe/London', label: 'Western European Time (GMT+0) — London' },
    { value: 'UTC', label: 'Coordinated Universal Time (UTC)' }
  ];

  const languages = [
    { value: 'pt', label: 'Português (Brasil)' },
    { value: 'en', label: 'English (US)' },
    { value: 'es', label: 'Español' }
  ];

  const dateFormats = [
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (Ex: 10/07/2026)' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (Ex: 2026-07-10)' },
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (Ex: 07/10/2026)' }
  ];

  const timeFormats = [
    { value: '24h', label: 'Formato 24h (Ex: 18:14)' },
    { value: '12h', label: 'Formato 12h (Ex: 06:14 PM)' }
  ];

  const densities = [
    { value: 'compact', label: 'Compacta (Alta densidade de dados, estilo Stripe)' },
    { value: 'comfortable', label: 'Confortável (Espaçamento padrão equilibrado)' },
    { value: 'spacious', label: 'Espaçosa (Maior negative space e descanso visual)' }
  ];

  return (
    <div className="space-y-8 animate-slide-up text-left pb-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Settings className="h-4.5 w-4.5 text-brand" />
            <Badge variant="primary">Configurações Pessoais</Badge>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 font-sans tracking-tight">Preferências da Conta</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm max-w-3xl">
            Ajuste as configurações de localidade, notificações, interface de dados e acessibilidade para criar o seu ambiente de trabalho perfeito.
          </p>
        </div>
        <Button variant="primary" onClick={handleSave} isLoading={saving} disabled={!loaded} className="shadow-lg shrink-0">
          Salvar Alterações
        </Button>
      </div>

      {loadError && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-lg text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Não foi possível carregar suas preferências salvas — exibindo valores padrão. Suas próximas alterações ainda serão salvas normalmente.
        </div>
      )}

      {!loaded ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-56 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">

          {/* LOCALIDADE */}
          <Card className="space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700/60 pb-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Localização e Formatação</h3>
                <p className="text-xs text-slate-450 dark:text-slate-400 mt-0.5">Defina idioma, fuso horário e formatos numéricos.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select 
                label="Idioma Principal"
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                options={languages}
              />
              <Select 
                label="Fuso Horário (Timezone)"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                options={timezones}
              />
              <Select 
                label="Formato de Data"
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
                options={dateFormats}
              />
              <Select 
                label="Formato de Hora"
                value={timeFormat}
                onChange={(e) => setTimeFormat(e.target.value)}
                options={timeFormats}
              />
            </div>
          </Card>

          {/* DENSIDADE E APARÊNCIA */}
          <Card className="space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700/60 pb-3">
              <div className="p-2 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-lg">
                <LayoutGrid className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Aparência do Painel</h3>
                <p className="text-xs text-slate-450 dark:text-slate-400 mt-0.5">Adapte a densidade e legibilidade das tabelas e KPIs.</p>
              </div>
            </div>

            <div className="space-y-6">
              <Select 
                label="Densidade de Dados"
                value={density}
                onChange={(e) => setDensity(e.target.value)}
                options={densities}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100 dark:border-slate-750">
                <div className="space-y-1">
                  <Switch
                    checked={highContrast}
                    onChange={setHighContrast}
                    label="Modo de Alto Contraste"
                    description="Preferência salva; aplicação visual completa do tema de alto contraste ainda não implementada."
                  />
                  <Badge variant="secondary">Em breve</Badge>
                </div>
                <Switch
                  checked={reducedMotion}
                  onChange={setReducedMotion}
                  label="Reduzir Movimento"
                  description="Desativa animações e transições em toda a interface imediatamente."
                />
              </div>
            </div>
          </Card>

          {/* NOTIFICAÇÕES */}
          <Card className="space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700/60 pb-3">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Canais de Notificação</h3>
                <p className="text-xs text-slate-450 dark:text-slate-400 mt-0.5">Gerencie onde e quando deseja receber alertas de voz e billing.</p>
              </div>
            </div>

            <div className="space-y-4">
              <Switch 
                checked={notifEmail} 
                onChange={setNotifEmail} 
                label="Notificações por E-mail"
                description="Resumos de faturas, alertas críticos do servidor e falhas de chamadas."
              />
              <hr className="border-slate-100 dark:border-slate-750" />
              <Switch 
                checked={notifBrowser} 
                onChange={setNotifBrowser} 
                label="Notificações do Navegador"
                description="Alertas instantâneos quando um novo lead ou chamada for concluída."
              />
              <hr className="border-slate-100 dark:border-slate-750" />
              <Switch
                checked={notifWeekly}
                onChange={setNotifWeekly}
                label="Relatório Executivo Semanal"
                description="Resumo periódico de atividade da conta, quando disponível."
              />
              <hr className="border-slate-100 dark:border-slate-750" />
              <Switch
                checked={notifCalls}
                onChange={setNotifCalls}
                label="Alertas de Erro na IA"
                description="Notificar sobre falhas na execução de agentes de voz."
              />
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
              Sua preferência é salva agora; o envio efetivo de e-mail/push para estes canais depende de um serviço de notificações que ainda não está implementado nesta versão.
            </p>
          </Card>

        </div>

        {/* SIDE PANEL: SHORTCUTS & INFO */}
        <div className="space-y-6">
          <Card className="bg-slate-900 text-white border-slate-850 p-6 space-y-4">
            <div className="flex items-center gap-2 text-brand">
              <Keyboard className="h-5 w-5" />
              <h4 className="font-bold text-sm uppercase tracking-wider">Atalhos de Teclado</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Agilize seu fluxo de trabalho utilizando os seguintes atalhos globais do sistema:
            </p>
            <div className="space-y-3 pt-2 font-mono text-xs">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-slate-400">Command Palette</span>
                <kbd className="px-2 py-0.5 bg-slate-800 text-slate-200 border border-slate-700 rounded text-[10px]">Ctrl + K</kbd>
              </div>
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-slate-400">Ir para Home</span>
                <kbd className="px-2 py-0.5 bg-slate-800 text-slate-200 border border-slate-700 rounded text-[10px]">G + H</kbd>
              </div>
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-slate-400">Criar Novo Agente</span>
                <kbd className="px-2 py-0.5 bg-slate-800 text-slate-200 border border-slate-700 rounded text-[10px]">C + A</kbd>
              </div>
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-slate-400">Fechar Modal / Esc</span>
                <kbd className="px-2 py-0.5 bg-slate-800 text-slate-200 border border-slate-700 rounded text-[10px]">ESC</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Abrir Suporte AI</span>
                <kbd className="px-2 py-0.5 bg-slate-800 text-slate-200 border border-slate-700 rounded text-[10px]">Ctrl + H</kbd>
              </div>
            </div>
          </Card>

          <Card className="border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 p-6 space-y-4 text-center">
            <SlidersHorizontal className="h-8 w-8 mx-auto text-brand animate-bounce" />
            <h4 className="font-bold text-slate-900 dark:text-slate-50 text-sm">Design System integrado</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              As preferências desta página são salvas na sua conta. Redução de movimento é aplicada imediatamente em toda a interface.
            </p>
            <Button size="sm" variant="outline" className="w-full" onClick={() => { window.location.hash = '#/dashboard/docs'; }}>
              Ver Design Tokens
              <ArrowRight className="h-3.5 w-3.5 ml-2" />
            </Button>
          </Card>
        </div>
      </div>
      )}

      <ToastContainer toasts={toasts} />
    </div>
  );
}
