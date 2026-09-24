import { Request, Response } from 'express';
import { createUserSchema, updateUserSchema } from '../validators/index.js';
import { listUsers, createUserInTenant, updateUserProfile, deleteUser, anonymizeUserData, UserServiceError } from '../services/userService.js';
import { writeAuditLog } from '../services/audit.js';

export async function listUsersHandler(req: Request, res: Response) {
  const users = await listUsers(req.tenantId!);
  res.json({ users });
}

export async function createUserHandler(req: Request, res: Response) {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  try {
    const user = await createUserInTenant(req.tenantId!, parsed.data);
    writeAuditLog(req.tenantId, req.user!.id, 'USER_CREATE_BY_ADMIN', { targetUserId: user.id, email: user.email });
    res.json({ success: true, user });
  } catch (err) {
    if (err instanceof UserServiceError) return res.status(err.status).json({ error: err.message });
    throw err;
  }
}

export async function updateUserHandler(req: Request, res: Response) {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  try {
    await updateUserProfile(String(req.params.id), req.tenantId!, req.user!, parsed.data);
    writeAuditLog(req.tenantId, req.user!.id, 'USER_UPDATE', { targetUserId: String(req.params.id) });
    res.json({ success: true, message: 'Perfil atualizado com sucesso.' });
  } catch (err) {
    if (err instanceof UserServiceError) return res.status(err.status).json({ error: err.message });
    throw err;
  }
}

export async function deleteUserHandler(req: Request, res: Response) {
  try {
    await deleteUser(String(req.params.id), req.tenantId!, req.user!.id);
    writeAuditLog(req.tenantId, req.user!.id, 'USER_DELETE', { targetUserId: String(req.params.id) });
    res.json({ success: true, message: 'Usuário excluído com sucesso.' });
  } catch (err) {
    if (err instanceof UserServiceError) return res.status(err.status).json({ error: err.message });
    throw err;
  }
}

// LGPD technical erasure mechanism (Art. 18, VI, Lei 13.709/2018): irreversibly scrubs the
// account's personal data (email, company name, credential) instead of merely hiding the row.
// A user may invoke this on their own account (self-service data-subject request); an admin may
// invoke it on behalf of a titular within the same tenant.
export async function anonymizeUserHandler(req: Request, res: Response) {
  try {
    await anonymizeUserData(String(req.params.id), req.tenantId!, req.user!);
    writeAuditLog(req.tenantId, req.user!.id, 'USER_DATA_ANONYMIZED', { targetUserId: String(req.params.id) });
    res.json({ success: true, message: 'Dados pessoais anonimizados com sucesso, conforme solicitação do titular (LGPD).' });
  } catch (err) {
    if (err instanceof UserServiceError) return res.status(err.status).json({ error: err.message });
    throw err;
  }
}
