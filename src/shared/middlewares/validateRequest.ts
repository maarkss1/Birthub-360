import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';

export const validateRequest = (schema: ZodTypeAny) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);

      next();
    } catch (error) {
      next(error);
    }
  };
};
