import express from 'express';
import { Redis } from 'ioredis';
import { healthHandler, liveHandler, makeReadyHandler } from '../controllers/health.controller.js';

export function createHealthRouter(redisClient: Redis) {
  const router = express.Router();

  router.get('/health', healthHandler);
  router.get('/live', liveHandler);
  router.get('/ready', makeReadyHandler(redisClient));

  return router;
}
