import type React from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Radar, KanbanSquare, CalendarClock, Menu } from 'lucide-react';
import type { TabType } from './tabMeta';
import { SoundFX } from '../../lib/soundEffects';
import { cn } from '../../lib/utils';

interface FloatingDockProps {
  activeTab: TabType;
  onOpenFullMenu: () => void;
}

interface DockItem {
  tab?: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  isAction?: boolean;
}

const DOCK_ITEMS: DockItem[] = [
  { tab: 'dashboard', label: 'Painel', icon: LayoutDashboard },
  { tab: 'prospect', label: 'Captar', icon: Radar },
  { tab: 'crm', label: 'CRM', icon: KanbanSquare },
  { tab: 'activities', label: 'Agenda', icon: CalendarClock },
  { label: 'Menu', icon: Menu, isAction: true },
];

export function FloatingDock({ activeTab, onOpenFullMenu }: FloatingDockProps) {
  const navigate = useNavigate();

  const handleSelect = (item: DockItem) => {
    if (item.isAction) {
      SoundFX.play('focus');
      onOpenFullMenu();
    } else if (item.tab) {
      if (item.tab !== activeTab) {
        SoundFX.play('navigate');
      }
      navigate(`/app/${item.tab}`);
    }
  };

  return (
    <nav
      aria-label="Navegação rápida inferior"
      className="fixed bottom-3 inset-x-3 z-30 md:hidden flex justify-center pointer-events-none"
    >
      <div className="pointer-events-auto flex items-center gap-1 p-1.5 rounded-2xl atlas-glass bg-surface/90 border border-line shadow-2xl backdrop-blur-xl">
        {DOCK_ITEMS.map((item) => {
          const isActive = !item.isAction && item.tab === activeTab;
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              type="button"
              onClick={() => handleSelect(item)}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'relative flex flex-col items-center justify-center min-w-[56px] py-1.5 px-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer',
                isActive
                  ? 'text-white bg-brand shadow-sm'
                  : 'text-ink-2 hover:text-ink hover:bg-surface-2'
              )}
            >
              <Icon size={20} className="shrink-0" />
              <span className="text-[10px] mt-0.5 tracking-tight font-medium truncate max-w-[48px]">
                {item.label}
              </span>
              {isActive && (
                <span className="absolute -bottom-1 h-1 w-3 rounded-full bg-white shadow-sm" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
