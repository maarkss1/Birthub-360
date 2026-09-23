import { type ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigationBusBridge } from '../../hooks/useNavigationBusBridge';
import { BugReportButton } from '../ui/BugReportButton';
import { CommandPalette } from '../ui/CommandPalette';
import { CopilotTrigger } from '../ui/CopilotTrigger';
import { Toaster } from '../ui/Toaster';
import { VoiceCommandWidget } from '../ui/VoiceCommandWidget';
import { AppTopbar } from './AppTopbar';
import { FloatingDock } from './FloatingDock';
import { OfflineBanner } from './OfflineBanner';
import { PageTransition } from './PageTransition';
import { FuturisticSidebar } from './FuturisticSidebar';
import type { TabType } from './tabMeta';

interface FuturisticLayoutProps {
  children: ReactNode;
}

export function FuturisticLayout({ children }: FuturisticLayoutProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();
  useNavigationBusBridge();
  const activeTab = (location.pathname.split('/')[2] as TabType) || 'dashboard';

  useEffect(() => {
    setMobileNavOpen(false);
  }, []);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNavOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileNavOpen]);

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-bg font-sans text-ink transition-colors duration-300">
      {/* Fundo futurista com grid e partículas */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Grid holográfico */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(212,175,55,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(212,175,55,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)]" />
        
        {/* Orbes de luz flutuantes */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand/20 rounded-full blur-[128px] animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-iris/15 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orbit-blue/10 rounded-full blur-[140px] animate-pulse-slow" style={{ animationDelay: '4s' }} />
        
        {/* Linhas de luz horizontais */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand/30 to-transparent animate-pulse-slow" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-iris/30 to-transparent animate-pulse-slow" style={{ animationDelay: '3s' }} />
      </div>

      <OfflineBanner />

      <div className="relative z-10 flex flex-1 min-h-0 w-full">
        <FuturisticSidebar
          activeTab={activeTab}
          mobileOpen={mobileNavOpen}
          onCloseMobile={() => setMobileNavOpen(false)}
        />
        
        {mobileNavOpen && (
          <div
            className="fixed inset-0 z-30 bg-overlay/80 backdrop-blur-md lg:hidden animate-fade-in"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
        )}
        
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          <AppTopbar activeTab={activeTab} onOpenMobileNav={() => setMobileNavOpen(true)} />
          <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative bg-transparent">
            <PageTransition id={activeTab}>{children}</PageTransition>
          </main>
          <FloatingDock activeTab={activeTab} onOpenFullMenu={() => setMobileNavOpen(true)} />
          <Toaster />
          <VoiceCommandWidget />
          <CopilotTrigger />
          <BugReportButton />
          <CommandPalette />
        </div>
      </div>
    </div>
  );
}
