import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../src/lib/logger.js', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

const { opaGuard } = await import('../../../../src/shared/security/opaGuard.js');

const fetchMock = vi.fn();

function makeRes() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
}

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    method: 'GET',
    path: '/api/resource/123',
    params: { id: '123' },
    user: { id: '123', role: 'SDR' },
    ...overrides,
  } as unknown as Request;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', fetchMock);
});

describe('opaGuard', () => {
  it('libera quando o OPA devolve result=true e envia o input esperado', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ result: true }) });
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    await opaGuard(makeReq(), res as unknown as Response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.input).toEqual({
      role: 'SDR',
      userId: '123',
      resourceOwnerId: '123',
      method: 'GET',
      path: '/api/resource/123',
    });
  });

  it('nega (403) quando o OPA devolve result=false', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ result: false }) });
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    await opaGuard(makeReq(), res as unknown as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('nega (403) quando a resposta não traz result (nunca assume permissão)', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    await opaGuard(makeReq(), res as unknown as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('fail-closed (500) quando o OPA responde com status de erro', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) });
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    await opaGuard(makeReq(), res as unknown as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('fail-closed (500) quando o OPA está inacessível', async () => {
    fetchMock.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    await opaGuard(makeReq(), res as unknown as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
