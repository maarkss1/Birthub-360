import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import express from 'express';
import type { Express } from 'express';
import { agentQueue } from '../lib/queue/agent.worker.js';
import { leadsQueue } from '../lib/queue/index.js';
import { queuesEnabled } from '../lib/queue/redis.js';
import { searchQueue } from '../lib/queue/search.queue.js';
import { requirePlatformOperator } from '../shared/middlewares/requirePlatformOperator.js';
import { logger } from '../lib/logger.js';

/**
 * SEC-001 (Sprint 01/Onda 13) e P0 Security Freeze (BullBoard tenant data isolation):
 * A UI do BullBoard exibe jobs com dados de TODAS as organizações (filas globais).
 * Anteriormente, a rota era exposta na mesma porta web da aplicação, permitindo acesso se o usuário
 * estivesse autenticado, com tenant e role ADMIN, criando um risco de "tenant admin enxergar jobs
 * cross-tenant".
 *
 * Resolução na Origem (Network Isolation): 
 * O BullBoard agora é removido da aplicação Express principal e isolado em um servidor
 * rodando em uma porta separada, acessível APENAS via localhost (127.0.0.1).
 * Além do isolamento de rede, mantém-se a trava exigindo o `requirePlatformOperator`.
 */
export function mountBullBoard(app: Express): void {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');
  
  if (queuesEnabled && leadsQueue && searchQueue && agentQueue) {
    createBullBoard({
      queues: [
        new BullMQAdapter(leadsQueue),
        new BullMQAdapter(searchQueue),
        new BullMQAdapter(agentQueue),
      ],
      serverAdapter,
    });
  }

  // Cria um app Express completamente separado apenas para o BullBoard
  const bullBoardApp = express();
  
  // Exige apenas o token de operador da plataforma (sem dependência de tenant/admin de negócio)
  bullBoardApp.use('/admin/queues', requirePlatformOperator, serverAdapter.getRouter());

  // Porta dedicada para o serviço isolado (default 3010)
  const port = process.env.BULL_BOARD_PORT ? parseInt(process.env.BULL_BOARD_PORT, 10) : 3010;
  
  // Importante: bind em 127.0.0.1 garante que a porta NÃO está exposta para a rede externa
  bullBoardApp.listen(port, '127.0.0.1', () => {
    logger.info({ port, host: '127.0.0.1' }, 'BullBoard (Isolated) running on http://127.0.0.1:' + port + '/admin/queues');
  });
}
