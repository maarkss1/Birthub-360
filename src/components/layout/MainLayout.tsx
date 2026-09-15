import { type ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigationBusBridge } from '../../hooks/useNavigationBusBridge';
import { BottomSheet } from '../ui/BottomSheet';
import { BugReportButton } from '../ui/BugReportButton';
import { CommandPalette } from '../ui/CommandPalette';
import { CopilotTrigger } from '../ui/CopilotTrigger';
import { Toaster } from '../ui/Toaster';
import { VoiceCommandWidget } from '../ui/VoiceCommandWidget';
import { AppTopbar } from './AppTopbar';
import { FloatingDock } from './FloatingDock';
import { OfflineBanner } from './OfflineBanner';
import { PageTransition } from './PageTransition';
import { Sidebar } from './Sidebar';
import type { TabType } from './tabMeta';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();
  // Liga o navigationBus (usado hoje pelo comando de voz) à navegação real — ver
  // useNavigationBusBridge.ts sobre por que isto precisa ficar aqui dentro do Router.
  useNavigationBusBridge();
  // "/app" (dashboard) ou "/app/prospect" etc — o segmento logo após "/app" é o módulo ativo.
  // TabType assumido aqui porque toda rota é registrada em App.tsx com um valor de TabType como
  // path; qualquer path desconhecido já é redirecionado pra "/app" antes de chegar aqui.
  const activeTab = (location.pathname.split('/')[2] as TabType) || 'dashboard';

  // Fecha a navegação mobile sempre que o módulo ativo muda (ex.: usuário tocou num item do menu).
  useEffect(() => {
    setMobileNavOpen(false);
  }, []);

  // Fecha com Escape, igual ao comportamento do Drawer/Dialog compartilhados.
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
      {/* Ambientação de marca contida: clara no light, profunda sem neon no dark. */}
      <div className="absolute inset-0 flex z-0 overflow-hidden pointer-events-none bg-bg">
        <div className="absolute -right-48 -top-56 h-[32rem] w-[32rem] rounded-full bg-brand/8 blur-[140px] dark:bg-brand/6" />
        <div className="absolute -bottom-64 -left-48 h-[30rem] w-[30rem] rounded-full bg-iris/5 blur-[150px] dark:bg-orbit-blue/5" />
      </div>

      <OfflineBanner />

      <div className="relative z-10 flex flex-1 min-h-0 w-full">
        {/* Removemos o Header global antigo, injetamos a Sidebar contínua */}
        <Sidebar
          activeTab={activeTab}
          mobileOpen={mobileNavOpen}
          onCloseMobile={() => setMobileNavOpen(false)}
        />
        {/* Backdrop da navegação mobile — some em telas md+, onde a Sidebar é estática */}
        {mobileNavOpen && (
          <div
            className="fixed inset-0 z-30 bg-overlay backdrop-blur-sm lg:hidden"
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
          <BottomSheet open={false} onOpenChange={() => {}} snapPoints={['50%', '90%']}>
            <div />
          </BottomSheet>
        </div>
      </div>
    </div>
  );
}
