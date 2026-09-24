import { Request, Response } from 'express';
import { findTenantById } from '../repositories/tenantRepository.js';

export async function listOrganizationsHandler(req: Request, res: Response) {
  const tenant = await findTenantById(req.tenantId!);
  res.json({ organizations: tenant ? [{ id: tenant.id, name: tenant.name, createdAt: tenant.createdAt }] : [] });
}
