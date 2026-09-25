import { Request, Response } from 'express';
import { findTenantById } from '../repositories/organizationRepository';

export async function listOrganizationsHandler(req: Request, res: Response) {
  const tenant = await findTenantById(req.organizationId!);
  res.json({ organizations: tenant ? [{ id: tenant.id, name: tenant.name, createdAt: tenant.createdAt }] : [] });
}
