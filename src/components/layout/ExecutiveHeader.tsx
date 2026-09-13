import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Share2,
  GraduationCap,
  FileSignature,
  PieChart,
  Maximize2,
  Minimize2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { useModuleAccess } from '../../hooks/useModuleAccess';

interface ExecutiveHeaderProps {
  title: string;
  subtitle: string;
  icon: typeof Share2;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onRefresh?: () => void;
}

export function ExecutiveHeader({
  title,
  subtitle,
  icon: IconComponent,
  isFullscreen,
  onToggleFullscreen,
  onRefresh,
}: ExecutiveHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { grantedModules } = useModuleAccess();

  // Mesmo padrão do botão "Voltar" do AppTopbar (src/components/layout/AppTopbar.tsx): usa o
  // histórico real de navegação desta sessão quando existe; cai para o Hub Executivo (`/hub`) —
  // a origem real de quem chega a qualquer um dos 4 módulos executivos, ver o switcher abaixo —
  // em deep link direto, sem histórico. Estes 4 módulos vivem fora de `/app/*` de propósito, então
  // não usam AppTopbar; o botão de voltar deles precisa estar aqui, no header que os 4 compartilham.
  const handleBack = () => {
    if (location.key !== 'default') navigate(-1);
    else navigate('/hub');
  };

  const hubs = [
    { id: 'social-selling', label: 'Social Selling', path: '/social-selling', icon: Share2 },
    {
      id: 'treinamento-atlasgr',
      label: 'Treinamento Comercial',
      path: '/treinamento-atlasgr',
      icon: GraduationCap,
    },
    {
      id: 'proposta-comercial',
      label: 'Proposta Comercial',
      path: '/proposta-comercial',
      icon: FileSignature,
    },
    {
      id: 'hub-inteligencia-marketing',
      label: 'Hub Inteligência & Mkt',
      path: '/hub-inteligencia-marketing',
      icon: PieChart,
    },
    // Só mostra no switcher os módulos que o usuário logado realmente tem concedidos (ver
    // ModuleAccessGrant/ModuleAccessAdmin) — antes deste piloto os 4 hubs apareciam para
    // qualquer usuário que passasse pelo gate único por e-mail; agora a concessão é individual,
    // então o switcher não pode mais assumir "tudo ou nada".
  ].filter((hub) => grantedModules.includes(hub.id));

  return (
    <div className="space-y-2 border-b border-line pb-2.5">
      {/* Top Banner & Hub Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 bg-soft/30 px-3 py-1.5 rounded-xl border border-line">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-ink-2">
          <button
            type="button"
            onClick={handleBack}
            className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
            aria-label="Voltar ao Hub Executivo"
            title="Voltar ao Hub Executivo"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span className="hidden sm:inline">
            Acervo Executivo — acesso concedido individualmente
          </span>
        </div>

        {/* Executive Switcher Pills */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {hubs.map((hub) => {
            const HubIcon = hub.icon;
            const isActive = location.pathname.startsWith(hub.path);
            return (
              <button
                type="button"
                key={hub.id}
                onClick={() => navigate(hub.path)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border flex items-center gap-1.5 whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-brand-active text-on-brand border-brand shadow-sm'
                    : 'bg-surface text-ink-2 hover:bg-soft hover:text-ink border-line'
                }`}
              >
                <HubIcon className="w-3 h-3" />
                {hub.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Title & Action Bar */}
      <div className="flex items-center justify-between gap-3 pt-0.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 bg-brand/10 rounded-xl border border-brand/20 text-brand shrink-0">
            <IconComponent className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-ink truncate">{title}</h1>
            <p className="text-[11px] text-ink-2 truncate">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="px-2.5 py-1 text-[11px] font-medium bg-soft text-ink hover:bg-line rounded-lg border border-line flex items-center gap-1 transition-colors"
              title="Recarregar tela"
            >
              <RefreshCw className="w-3 h-3" />
              Recarregar
            </button>
          )}
          <button
            type="button"
            onClick={onToggleFullscreen}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border flex items-center gap-1 transition-colors shadow-sm ${
              isFullscreen
                ? 'bg-warning-active text-white border-warning hover:bg-warning'
                : 'bg-soft text-ink hover:bg-line border-line'
            }`}
            title={isFullscreen ? 'Sair do Modo Tela Cheia' : 'Modo Tela Cheia Imersivo'}
          >
            {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
            {isFullscreen ? 'Sair Tela Cheia' : 'Tela Cheia'}
          </button>
        </div>
      </div>
    </div>
  );
}
