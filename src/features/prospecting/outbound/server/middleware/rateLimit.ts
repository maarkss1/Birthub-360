import type { Request, Response, NextFunction } from 'express';

interface Bucket {
  count: number;
  resetAt: number;
}

// Limitador simples em memória, por IP + rota. Suficiente para uma única instância
// no Render; numa implantação com múltiplas instâncias o teto vira "por instância",
// não global — aceitável como primeira barreira contra custo/abuso nas rotas que
// chamam APIs pagas (Apollo, Groq, Gemini, Bitrix, Hunter).
const buckets = new Map<string, Bucket>();

export function rateLimit(opts: { windowMs: number; max: number; message?: string }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip || 'unknown'}:${req.baseUrl}${req.path}`;
    const now = Date.now();

    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + opts.windowMs };
      buckets.set(key, bucket);
    }

    bucket.count++;
    if (bucket.count > opts.max) {
      const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        error: opts.message || `Muitas requisições para esta rota. Tente novamente em ${retryAfterSec}s.`
      });
    }

    next();
  };
}
