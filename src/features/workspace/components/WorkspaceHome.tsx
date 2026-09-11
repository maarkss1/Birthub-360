import { motion } from 'framer-motion';
import { Compass, Loader2, UserX } from 'lucide-react';
import { useWorkspace } from '../../../hooks/useWorkspace';
import { BlockedState } from '../../../components/ui/BlockedState';
import { WorkspaceReadySection } from '../../../components/workspace/WorkspaceReadySection';

/** Home do workspace por cargo (PROMPT 6), destino dedicado ("Meu Workspace" na Sidebar,
 *  `/app/workspace`). Renderizado dentro de `MainLayout` (que já provê o landmark `<main>`), por
 *  isso a raiz aqui é `<div>`, mesmo padrão de `SinglePageDashboard.tsx`.
 *
 *  O conteúdo por cargo em si (`WorkspaceReadySection`) também é usado dentro da home unificada
 *  (`AdaptiveDashboard.tsx`, `/app` e `/app/dashboard`) — mas os estados de loading/erro/bloqueio
 *  abaixo são exclusivos DESTA tela dedicada (cobertos por `tests/e2e/workspace.spec.ts`): na home
 *  unificada, a seção por cargo é um complemento não-bloqueante, nunca esconde o dashboard atrás
 *  de um spinner ou de uma mensagem de bloqueio. */
export function WorkspaceHome() {
  const { workspace, isLoading, error, reload } = useWorkspace();

  return (
    <div className="relative flex min-h-screen flex-1 flex-col items-center overflow-y-auto bg-transparent p-4 font-sans md:p-8">
      <div className="relative z-[1] flex w-full max-w-[92rem] flex-1 flex-col items-center justify-center">
        {isLoading && (
          <div aria-live="polite" aria-busy="true" className="flex items-center gap-2 text-ink-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Carregando seu workspace…</span>
          </div>
        )}

        {!isLoading && error && (
          <BlockedState
            tone="warning"
            title="Não foi possível carregar seu workspace"
            description="Tente novamente em instantes. Se o problema persistir, avise um administrador."
            actionLabel="Tentar de novo"
            onAction={reload}
          />
        )}

        {!isLoading && !error && workspace?.status === 'NO_JOB_ROLE' && (
          <BlockedState
            tone="neutral"
            icon={<UserX className="h-6 w-6" />}
            title="Nenhum cargo atribuído"
            description="Seu usuário ainda não tem um cargo (JobRole) principal ativo. Peça a um administrador para atribuir um cargo em Cargos e Agentes para liberar o seu workspace."
          />
        )}

        {!isLoading && !error && workspace?.status === 'NO_WORKSPACE_DEFINITION' && (
          <BlockedState
            tone="neutral"
            icon={<Compass className="h-6 w-6" />}
            title="Workspace ainda não configurado para este cargo"
            description="Este cargo existe no catálogo, mas ainda não tem uma definição de workspace publicada."
          />
        )}

        {!isLoading && !error && workspace?.status === 'READY' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="w-full"
          >
            <WorkspaceReadySection workspace={workspace} />
          </motion.div>
        )}
      </div>
    </div>
  );
}
