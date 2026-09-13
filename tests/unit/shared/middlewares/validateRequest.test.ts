import { describe, it, expect, vi } from 'vitest';
import { validateRequest } from '@/shared/middlewares/validateRequest';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

describe('validateRequest Middleware', () => {
  const schema = z.object({
    name: z.string().min(1),
  });
  const middleware = validateRequest(schema);

  it('should call next if validation passes', async () => {
    const req = { body: { name: 'Test' } } as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    await middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalledWith(expect.any(Error));
  });

  it('should call next with error if validation fails', async () => {
    const req = { body: { name: '' } } as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    await middleware(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(z.ZodError));
  });
});
