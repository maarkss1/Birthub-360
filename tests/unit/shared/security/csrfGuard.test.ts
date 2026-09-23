import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockEnv: Record<string, string | undefined> = {
  NODE_ENV: 'production',
  PUBLIC_BASE_URL: 'https://app.exemplo.com',
  ALLOWED_ORIGINS: 'https://app.exemplo.com, https://outro.exemplo.com',
};
vi.mock('../../../../src/config/env.js', () => ({
  env: new Proxy({}, { get: (_t, key: string) => mockEnv[key] }),
}));

const { csrfGuard } = await import('../../../../src/shared/security/csrfGuard.js');

function run(req: {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
}): { next: ReturnType<typeof vi.fn>; status: ReturnType<typeof vi.fn> } {
  const status = vi.fn();
  const res = { status, json: vi.fn() };
  status.mockReturnValue(res);
  const next = vi.fn();
  csrfGuard(
    {
      method: req.method ?? 'POST',
      originalUrl: req.url ?? '/api/leads',
      headers: req.headers ?? {},
    } as unknown as Request,
    res as unknown as Response,
    next as unknown as NextFunction,
  );
  return { next, status };
}

beforeEach(() => {
  mockEnv.NODE_ENV = 'production';
});

describe('csrfGuard', () => {
  it('não interfere em métodos seguros', () => {
    expect(run({ method: 'GET' }).next).toHaveBeenCalledOnce();
  });

  it('bloqueia mutação com cookie e sem Origin/Referer', () => {
    const { next, status } = run({ headers: { cookie: 'session=abc' } });
    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(403);
  });

  it('bloqueia Origin de terceiro', () => {
    const { next, status } = run({
      headers: { cookie: 'session=abc', origin: 'https://evil.example' },
    });
    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(403);
  });

  it('bloqueia Referer de terceiro mesmo com Origin válida', () => {
    const { status } = run({
      headers: {
        cookie: 'session=abc',
        origin: 'https://app.exemplo.com',
        referer: 'https://evil.example/page',
      },
    });
    expect(status).toHaveBeenCalledWith(403);
  });

  it('bloqueia Referer malformado', () => {
    expect(run({ headers: { referer: 'nao-e-url' } }).status).toHaveBeenCalledWith(403);
  });

  it('aceita Origin da própria aplicação e de ALLOWED_ORIGINS', () => {
    expect(
      run({ headers: { cookie: 's=1', origin: 'https://app.exemplo.com' } }).next,
    ).toHaveBeenCalledOnce();
    expect(
      run({ headers: { cookie: 's=1', origin: 'https://outro.exemplo.com' } }).next,
    ).toHaveBeenCalledOnce();
  });

  it('Bearer sem cookie passa; Bearer COM cookie continua validado', () => {
    expect(run({ headers: { authorization: 'Bearer tok' } }).next).toHaveBeenCalledOnce();
    const both = run({ headers: { authorization: 'Bearer tok', cookie: 's=1' } });
    expect(both.next).not.toHaveBeenCalled();
    expect(both.status).toHaveBeenCalledWith(403);
  });

  it('libera só os caminhos exatos de webhook', () => {
    expect(run({ url: '/api/integrations/birth-voice/webhook' }).next).toHaveBeenCalledOnce();
    expect(run({ url: '/api/webhooks/voice-result' }).next).toHaveBeenCalledOnce();
    expect(run({ url: '/api/integrations/stripe/webhook/conn-1' }).next).toHaveBeenCalledOnce();
    expect(run({ url: '/api/integrations/bitrix/webhook/conn-1' }).next).toHaveBeenCalledOnce();
  });

  it('NÃO libera rota que apenas contém "webhooks" no caminho', () => {
    const { next, status } = run({ url: '/api/leads/webhooks/../export', headers: { cookie: 's=1' } });
    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(403);
  });

  it('localhost só é aceito fora de produção', () => {
    const headers = { cookie: 's=1', origin: 'http://localhost:5173' };
    expect(run({ headers }).status).toHaveBeenCalledWith(403);
    mockEnv.NODE_ENV = 'development';
    expect(run({ headers }).next).toHaveBeenCalledOnce();
  });
});
