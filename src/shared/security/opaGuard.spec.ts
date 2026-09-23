import { describe, it, expect, vi, beforeEach } from 'vitest';
import { opaGuard } from './opaGuard';
import { Request, Response, NextFunction } from 'express';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('opaGuard Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      path: '/api/resource/123',
      user: { role: 'USER', id: '123' },
      params: { id: '123' },
    } as any;

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;

    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  it('should allow access if OPA returns true', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: true }),
    });

    await opaGuard(mockReq as Request, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('should deny access if OPA returns false', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: false }),
    });

    await opaGuard(mockReq as Request, mockRes as Response, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Forbidden by OPA policy' });
  });

  it('should fail-close (500) if OPA is unreachable', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await opaGuard(mockReq as Request, mockRes as Response, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authorization service unreachable' });
  });
});
