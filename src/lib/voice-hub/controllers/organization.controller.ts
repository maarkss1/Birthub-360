import type { Request, Response } from 'express';
import { findTenantById } from '../repositories/organizationRepository.js';

export async function listOrganizationsHandler(req: Request, res: Response) {
  const tenant = await findTenantById(req.organizationId!);
  return res.json({ organizations: tenant ? [{ id: tenant.id, name: tenant.name, createdAt: tenant.createdAt }] : [] });
}
