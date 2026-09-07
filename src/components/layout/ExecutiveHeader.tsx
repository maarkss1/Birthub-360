import { useNavigate, useLocation } from 'react-router-dom';
import {
  Share2,
  GraduationCap,
  FileSignature,
  PieChart,
  Maximize2,
  Minimize2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { EXECUTIVE_HUB_ALLOWED_EMAIL } from '../../config/access-policy';

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

  const hubs = [
    { id: 'social-selling', label: 'Social Selling', path: '/app/social-selling', icon: Share2 },
    {
      id: 'treinamento-atlasgr',
      label: 'Treinamento AtlasGR',
      path: '/app/treinamento-atlasgr',
      icon: GraduationCap,
    },
    {
      id: 'proposta-comercial',
      label: 'Proposta Comercial',
      path: '/app/proposta-comercial',
      icon: FileSignature,
    },
    {
      id: 'hub-inteligencia-marketing',
      label: 'Hub Inteligência & Mkt',
      path: '/app/hub-inteligencia-marketing',
      icon: PieChart,
    },
  ];

  return (
    <div className="space-y-2 border-b border-line pb-2.5">
      {/* Top Banner & Hub Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 bg-soft/30 px-3 py-1.5 rounded-xl border border-line">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-ink-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span className="hidden sm:inline">Acervo Executivo</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 font-bold border border-emerald-500/20">
            {EXECUTIVE_HUB_ALLOWED_EMAIL}
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
                    ? 'bg-brand-active text-white border-brand shadow-sm'
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
