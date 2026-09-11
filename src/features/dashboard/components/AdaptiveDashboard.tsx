import { motion } from 'framer-motion';
import { Compass } from 'lucide-react';
import { useWorkspace } from '../../../hooks/useWorkspace';
import { WorkspaceReadySection } from '../../../components/workspace/WorkspaceReadySection';
import { SinglePageDashboard } from './SinglePageDashboard';

/**
 * Home unificada (item 105 da constituição de produto — Adaptive Command Center). Antes desta
 * fatia, `/app`/`/app/dashboard` (`SinglePageDashboard`, igual pra todo UserRole) e `/app/workspace`
 * (`WorkspaceHome`, adaptativo por JobRole) eram duas implementações paralelas do mesmo conceito
 * de "home". Preferido aditivo a substituição: o dashboard operacional de sempre continua
 * exatamente igual para todo mundo (nenhum widget removido — regra de preservação de conteúdo da
 * seção 6 do CLAUDE.md), e a seção por cargo aparece embaixo SÓ quando o backend resolve um
 * workspace real (`status: 'READY'`) para a sessão.
 *
 * `/app/workspace` continua existindo como destino próprio (link "Meu Workspace" da Sidebar), com
 * `WorkspaceHome` inalterado — inclusive os estados de bloqueio (`NO_JOB_ROLE`/
 * `NO_WORKSPACE_DEFINITION`), cobertos por `tests/e2e/workspace.spec.ts`. Aqui a seção por cargo é
 * um complemento não-bloqueante: enquanto carrega, falha, ou o usuário não tem cargo atribuído, a
 * home simplesmente não mostra a seção extra — nunca um spinner ou erro cobrindo o dashboard real.
 */
export function AdaptiveDashboard() {
  const { workspace, isLoading, error } = useWorkspace();
  const showWorkspaceSection = !isLoading && !error && workspace?.status === 'READY';

  return (
    <>
      <SinglePageDashboard />
      {showWorkspaceSection && workspace && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mx-auto w-full max-w-[92rem] px-4 pb-8 md:px-8"
        >
          <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-ink-2">
            <Compass className="h-3.5 w-3.5 text-brand" />
            Seu workspace — {workspace.jobRole?.name}
          </div>
          <WorkspaceReadySection workspace={workspace} />
        </motion.div>
      )}
    </>
  );
}
