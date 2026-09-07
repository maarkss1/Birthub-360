import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  LayoutTemplate,
  Share2,
  GraduationCap,
  FileSignature,
  PieChart,
  LogIn,
  Globe,
  ShieldCheck,
  Building2,
  Mail,
  ExternalLink,
  Sun,
  Moon,
  LogOut,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useBrand } from '../../../contexts/BrandContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useModuleAccess } from '../../../hooks/useModuleAccess';
import { MODULE_CATALOG, EXTERNAL_LINKS, type ModuleKey } from '../../../config/module-catalog';
import { Logo } from '../../../components/Logo';
import { TotalTrackLogo } from '../../../components/TotalTrackLogo';
import { SoundFX } from '../../../lib/soundEffects';
import { staggerContainer, staggerItem } from '../../../lib/motion';

const MODULE_ICONS: Record<ModuleKey, LucideIcon> = {
  'social-selling': Share2,
  'treinamento-atlasgr': GraduationCap,
  'proposta-comercial': FileSignature,
  'hub-inteligencia-marketing': PieChart,
};

const EXTERNAL_LINK_ICONS: Record<string, LucideIcon> = {
  connect: LogIn,
  newConnect: Globe,
  securitario: ShieldCheck,
  bitrix24: Building2,
  webmail: Mail,
};

interface DestinationCardProps {
  icon: LucideIcon;
  label: string;
  description: string;
  onClick: () => void;
  external?: boolean;
}

function DestinationCard({
  icon: Icon,
  label,
  description,
  onClick,
  external,
}: DestinationCardProps) {
  return (
    <motion.button
      type="button"
      variants={staggerItem}
      onClick={onClick}
      className="group relative flex flex-col items-start gap-3 rounded-card border border-line bg-surface p-5 text-left shadow-card transition-[transform,border-color,box-shadow,background-color] duration-200 hover:-translate-y-1 hover:border-brand/25 hover:bg-surface-2/70 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-line bg-surface-2 text-brand transition-[transform,border-color] duration-200 group-hover:scale-105 group-hover:border-brand/30">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="flex-1">
        <span className="flex items-center gap-1.5 font-display text-sm font-bold text-ink">
          {label}
          {external && (
            <ExternalLink
              className="h-3 w-3 text-ink-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              aria-hidden="true"
            />
          )}
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-ink-2">{description}</span>
      </span>
    </motion.button>
  );
}

/**
 * Hub Executivo — tela de destinos pós-login ("os círculos", pedido explícito do usuário: os
 * módulos executivos e as ferramentas externas não vivem dentro do CRM, vivem aqui). Central
 * Comercial (o CRM) é o destino primário; os módulos executivos só aparecem se o usuário logado
 * tiver concessão real (ModuleAccessGrant, via useModuleAccess — nunca por e-mail/papel); as
 * ferramentas externas (Bitrix24, webmail, portais) são atalhos sempre visíveis, sem gate, porque
 * são ferramentas de uso corriqueiro da equipe, não acervo executivo restrito.
 */
export function HubScreen() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { activeBrand } = useBrand();
  const { theme, toggleTheme } = useTheme();
  const { grantedModules, isLoading } = useModuleAccess();
  const isAtlas = activeBrand === 'atlasgr';

  const grantedCatalog = MODULE_CATALOG.filter((m) => grantedModules.includes(m.key));

  const goTo = (path: string) => {
    SoundFX.play('navigate');
    navigate(path);
  };

  const openExternal = (url: string) => {
    SoundFX.play('navigate');
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-line bg-surface/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          {isAtlas ? (
            <Logo className="h-7 text-ink" />
          ) : (
            <TotalTrackLogo className="h-7 text-ink" />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                SoundFX.play('focus');
                toggleTheme();
              }}
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-transparent text-ink-2 transition-[transform,background-color,border-color,color] duration-200 hover:-translate-y-0.5 hover:border-line hover:bg-surface-2 hover:text-ink active:translate-y-0"
              aria-label="Alternar tema"
              title={`Mudar para modo ${theme === 'dark' ? 'claro' : 'escuro'}`}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            {currentUser && (
              <div className="flex items-center gap-2.5 rounded-xl border border-line bg-surface-2/70 py-1.5 pl-1.5 pr-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-xs font-bold text-white">
                  {currentUser.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="hidden leading-tight sm:block">
                  <p className="text-xs font-bold text-ink">{currentUser.name}</p>
                  <p className="text-[10px] text-ink-2">{currentUser.roleTitle}</p>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={logout}
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-transparent text-critical transition-[transform,background-color,border-color] duration-200 hover:-translate-y-0.5 hover:border-critical/15 hover:bg-critical/10 active:translate-y-0"
              aria-label="Encerrar sessão"
              title="Encerrar sessão e sair da conta"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <motion.div
          initial="hidden"
          animate="show"
          variants={staggerContainer(0.05)}
          className="space-y-10"
        >
          {/* Destino primário — Central Comercial (CRM) */}
          <motion.button
            type="button"
            variants={staggerItem}
            onClick={() => goTo('/app')}
            className="group relative flex w-full flex-col items-start gap-4 overflow-hidden rounded-card-lg border border-brand/25 bg-surface p-8 text-left shadow-glow-brand transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-4">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-brand/30 bg-brand/10 text-brand">
                <LayoutTemplate className="h-7 w-7" aria-hidden="true" />
              </span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-active dark:text-brand-2">
                  Destino principal
                </p>
                <h1 className="font-display text-2xl font-bold text-ink">Central Comercial</h1>
                <p className="mt-1 max-w-md text-sm text-ink-2">
                  CRM, pipeline, prospecção e IA comercial — tudo o que o time usa no dia a dia.
                </p>
              </div>
            </div>
            <span className="rounded-xl border border-brand/25 bg-brand/10 px-4 py-2 text-sm font-bold text-brand-active transition-colors duration-200 group-hover:bg-brand/15 dark:text-brand-2">
              Entrar no CRM →
            </span>
            <span
              className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-brand/10 blur-[70px]"
              aria-hidden="true"
            />
          </motion.button>

          {/* Módulos executivos — só os concedidos individualmente ao usuário logado */}
          <section aria-labelledby="hub-executivos-heading">
            <div className="mb-4 flex items-center gap-2">
              <h2
                id="hub-executivos-heading"
                className="font-display text-sm font-black uppercase tracking-[0.14em] text-ink-2"
              >
                Acervo Executivo
              </h2>
              <span
                className="h-px flex-1 bg-gradient-to-r from-line to-transparent"
                aria-hidden="true"
              />
            </div>

            {isLoading ? (
              <div className="flex items-center gap-2 py-6 text-sm text-ink-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando módulos concedidos…
              </div>
            ) : grantedCatalog.length === 0 ? (
              <p className="rounded-card border border-dashed border-line bg-surface/60 p-5 text-sm text-ink-2">
                Nenhum módulo executivo liberado para a sua conta ainda. Peça a um administrador
                para conceder acesso no painel de Acesso a Módulos.
              </p>
            ) : (
              <motion.div
                variants={staggerContainer(0.05)}
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
              >
                {grantedCatalog.map((mod) => (
                  <DestinationCard
                    key={mod.key}
                    icon={MODULE_ICONS[mod.key]}
                    label={mod.label}
                    description={mod.description}
                    onClick={() => goTo(`/${mod.key}`)}
                  />
                ))}
              </motion.div>
            )}
          </section>

          {/* Ferramentas externas — sempre visíveis, sem gate (uso corriqueiro da equipe) */}
          <section aria-labelledby="hub-ferramentas-heading">
            <div className="mb-4 flex items-center gap-2">
              <h2
                id="hub-ferramentas-heading"
                className="font-display text-sm font-black uppercase tracking-[0.14em] text-ink-2"
              >
                Ferramentas
              </h2>
              <span
                className="h-px flex-1 bg-gradient-to-r from-line to-transparent"
                aria-hidden="true"
              />
            </div>
            <motion.div
              variants={staggerContainer(0.05)}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {EXTERNAL_LINKS.map((link) => (
                <DestinationCard
                  key={link.key}
                  icon={EXTERNAL_LINK_ICONS[link.iconKey]}
                  label={link.label}
                  description={link.description}
                  onClick={() => openExternal(link.url)}
                  external
                />
              ))}
            </motion.div>
          </section>
        </motion.div>
      </main>
    </div>
  );
}
