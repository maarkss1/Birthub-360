import type { NextFunction, Request, Response } from 'express';
import { routeParam } from '../../../../shared/http/routeParams';
import type { AuthRequest } from '../../../../shared/middlewares/authenticateToken';
import { generateObjectionSuggestions } from '../application/objectionGenerator.service';
import type { ObjectionMatrixUseCases } from '../application/ObjectionMatrixUseCases';

export class ObjectionMatrixController {
  constructor(private useCases: ObjectionMatrixUseCases) {}

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId: orgId } = (req as AuthRequest).user;
      const brand = typeof req.query.brand === 'string' ? req.query.brand : undefined;
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 200;
      const result = await this.useCases.findItems(orgId, brand, page, limit);
      res.json({ success: true, data: result.data, meta: result.meta });
    } catch (error) {
      next(error);
    }
  };

  /** Item 7 de "IA Agêntica de Vendas": gera sugestões a partir de negócios REALMENTE perdidos —
   * nunca persiste sozinho. Cada sugestão aprovada vira um item real via `create` abaixo, mesmo
   * fluxo e mesma permissão de sempre (o gate de autorização não muda, só ganha uma etapa de
   * proposta antes). */
  generateSuggestions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId: orgId } = (req as AuthRequest).user;
      const result = await generateObjectionSuggestions(orgId);
      // `meta` (não um campo solto) porque apiFetch (src/lib/api.ts) só preserva o envelope
      // {data, meta} inteiro quando a chave 'meta' está presente na resposta — qualquer outra
      // chave irmã de `data` seria descartada no unwrap padrão {success, data}.
      res.json({ success: true, data: result.suggestions, meta: { emptyReason: result.emptyReason } });
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId: orgId } = (req as AuthRequest).user;
      const item = await this.useCases.createItem(orgId, req.body);
      res.status(201).json({ success: true, data: item });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId: orgId } = (req as AuthRequest).user;
      const item = await this.useCases.updateItem(orgId, routeParam(req.params.id, 'id'), req.body);
      res.json({ success: true, data: item });
    } catch (error) {
      next(error);
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId: orgId } = (req as AuthRequest).user;
      await this.useCases.deleteItem(orgId, routeParam(req.params.id, 'id'));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
