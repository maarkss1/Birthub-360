import crypto from 'crypto';
import { hashPassword, verifyPassword, generateToken, generateRefreshToken, verifyRefreshToken, TokenPayload } from '../lib/auth-tokens.js';
import { findUserByEmail, findUserById, createUser, createMembership, findMembershipWithRole } from '../repositories/userRepository.js';
import { createTenant } from '../repositories/organizationRepository.js';
import { getOrCreateSystemRole } from '../repositories/roleRepository.js';

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function toPublicUser(user: { id: string; email: string; companyName: string }, role: string) {
  return {
    id: user.id,
    name: user.email.split('@')[0],
    company: user.companyName,
    email: user.email,
    role,
  };
}

export async function register(email: string, password: string, companyName: string) {
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new AuthError('Este email já está cadastrado.');
  }

  const tenant = await createTenant(companyName);
  const adminRole = await getOrCreateSystemRole('admin');
  const user = await createUser({ email, passwordHash: hashPassword(password), companyName, organizationId: tenant.id });
  await createMembership(user.id, tenant.id, adminRole.id);

  const payload: TokenPayload = { id: user.id, email: user.email, role: 'admin', organizationId: tenant.id };
  const token = generateToken(payload);
  const refreshToken = generateRefreshToken({ id: user.id });

  return { token, refreshToken, user: toPublicUser(user, 'admin'), organizationId: tenant.id };
}

export async function login(email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash) || !user.organizationId) {
    throw new AuthError('Credenciais inválidas.', 401);
  }

  const membership = await findMembershipWithRole(user.id, user.organizationId);
  const role = membership?.role.name || 'user';

  const payload: TokenPayload = { id: user.id, email: user.email, role, organizationId: user.organizationId };
  const token = generateToken(payload);
  const refreshToken = generateRefreshToken({ id: user.id });

  return { token, refreshToken, user: toPublicUser(user, role), organizationId: user.organizationId };
}

export async function refreshSession(refreshToken: string) {
  const decoded = verifyRefreshToken(refreshToken);
  if (!decoded) return null;

  const user = await findUserById(decoded.id);
  if (!user || !user.organizationId) return null;

  const membership = await findMembershipWithRole(user.id, user.organizationId);
  const role = membership?.role.name || 'user';

  const payload: TokenPayload = { id: user.id, email: user.email, role, organizationId: user.organizationId };
  return { token: generateToken(payload), session: payload };
}

export function newId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
}
