import type { RunDialerCycle } from "../../application/use-cases/RunDialerCycle.js";
import type { Logger } from "../../infrastructure/logger.js";

export interface DialerLoopHandle {
  stop(): Promise<void>;
}

/**
 * Dispara `RunDialerCycle` a cada `intervalMs`. Evita sobreposição de ciclos
 * e aguarda o ciclo ativo terminar ao receber sinal de encerramento.
 */
export function startDialerLoop(
  runDialerCycle: RunDialerCycle,
  intervalMs: number,
  logger: Logger,
): DialerLoopHandle {
  let isStopped = false;
  let activeCyclePromise: Promise<void> | null = null;

  const tick = async (): Promise<void> => {
    if (activeCyclePromise !== null) {
      logger.warn("Ciclo anterior do discador ainda em execução — pulando este tick");
      return;
    }
    if (isStopped) {
      return;
    }

    const currentPromise = runDialerCycle
      .execute()
      .then((report) => {
        if (report.skippedReason !== null) {
          logger.debug({ report }, "Ciclo do discador pulado");
          return;
        }
        if (
          report.totalDialed > 0 ||
          report.totalRejectedImmediately > 0 ||
          report.totalDnConflicts > 0
        ) {
          logger.info({ report }, "Ciclo do discador concluído");
        }
        if (report.totalDnConflicts > 0) {
          logger.warn(
            { report },
            "Corrida entre processos ao reservar DN de agente — leads liberados de volta para a fila",
          );
        }
      })
      .catch((error: unknown) => {
        logger.error({ err: error }, "Erro ao executar ciclo do discador");
      })
      .finally(() => {
        if (activeCyclePromise === currentPromise) {
          activeCyclePromise = null;
        }
      });

    activeCyclePromise = currentPromise;
    await currentPromise;
  };

  const timer = setInterval(() => {
    void tick();
  }, intervalMs);

  return {
    stop: async () => {
      isStopped = true;
      clearInterval(timer);
      if (activeCyclePromise !== null) {
        logger.info("Aguardando ciclo ativo do discador finalizar para encerrar...");
        await activeCyclePromise;
      }
    },
  };
}
