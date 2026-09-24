import React, { useEffect, useState } from 'react';
import { Card, Button, Badge, EmptyState, Skeleton } from '../../components/design-system';
import { useSessionStore } from '../../store/useSessionStore';
import { logger } from '../../lib/logger';
import { Shield, Users, Lock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface TenantUser {
  id: string;
  email: string;
  role: string;
}

export default function GovernancePage() {
  const user = useSessionStore((state) => state.user);
  const isAdmin = user?.role === 'admin';

  // GET /api/users is admin-only server-side (requireRole(['admin'])) — this page only attempts
  // the call, and only shows the member-management UI, when the current session is actually
  // admin. A non-admin visiting this route sees a real "access restricted" state instead of a
  // fabricated member list, matching what the API would answer them anyway.
  const [members, setMembers] = useState<TenantUser[] | null>(null);
  const [membersError, setMembersError] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    fetch('/api/users')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => setMembers(Array.isArray(data.users) ? data.users : []))
      .catch((err) => {
        logger.error('Failed to load tenant members', { err });
        setMembersError(true);
      });
  }, [isAdmin]);

  const roleCounts = (members ?? []).reduce<Record<string, number>>((acc, m) => {
    acc[m.role] = (acc[m.role] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Governança & RBAC</h1>
          <p className="text-sm text-slate-500">Controle de acessos, permissões granulares e auditoria corporativa.</p>
        </div>
        {/* Sensitive action gated on the real session role, not just visually hidden — the
            backend route this would call (POST /api/users) is itself requireRole(['admin']). */}
        {isAdmin && (
          <Button variant="primary" disabled title="Criação direta de usuário disponível via API; convite por e-mail ainda não implementado">
            <Users className="h-4 w-4 mr-2" /> Adicionar Membro
          </Button>
        )}
      </div>

      {!isAdmin ? (
        <EmptyState
          icon={<Lock className="h-8 w-8" />}
          title="Acesso restrito"
          description="A gestão de membros e papéis exige o papel de administrador nesta organização. Fale com um administrador da sua conta para solicitar acesso."
        />
      ) : (
        <>
          {members === null && !membersError && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}

          {membersError && (
            <EmptyState
              icon={<AlertTriangle className="h-8 w-8" />}
              title="Não foi possível carregar os membros"
              description="Tente novamente em alguns instantes."
            />
          )}

          {members !== null && !membersError && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {Object.keys(roleCounts).length === 0 ? (
                <div className="md:col-span-3">
                  <EmptyState
                    icon={<Users className="h-8 w-8" />}
                    title="Nenhum membro encontrado"
                    description="Esta organização ainda não tem usuários cadastrados além de você."
                  />
                </div>
              ) : (
                Object.entries(roleCounts).map(([role, count]) => (
                  <Card key={role} className="p-5 border-t-4 border-t-brand">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 capitalize">
                      <Shield className="h-4 w-4 text-brand" /> {role}
                    </h3>
                    <div className="flex justify-between items-center pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{count} membro{count !== 1 ? 's' : ''}</span>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </>
      )}

      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Lock className="h-5 w-5 text-slate-400" /> Auditoria e Políticas de Segurança
        </h3>
        <div className="space-y-4 text-sm">
          {/* SSO/OIDC infrastructure exists (Keycloak client config) but no application route
              wires login/callback yet — see .agents/runs/onda-1.md "Gap não-bloqueador". Showing
              this as "Ativado" would be a false compliance claim. */}
          <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800">
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Autenticação SSO (OIDC/Keycloak)</p>
              <p className="text-slate-500 text-xs mt-0.5">Login via provedor de identidade corporativo.</p>
            </div>
            <Badge variant="warning"><XCircle className="h-3 w-3 mr-1" /> Não configurado</Badge>
          </div>

          <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800">
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Data Residency (LGPD)</p>
              <p className="text-slate-500 text-xs mt-0.5">Armazenar dados, gravações e logs exclusivamente na região selecionada.</p>
            </div>
            <div className="text-xs font-mono bg-white dark:bg-slate-950 px-2 py-1 rounded border border-slate-200 dark:border-slate-800">sa-east-1 (SP)</div>
          </div>

          {/* Log redaction is real (see src/lib/logger.ts, pino `redact` over sensitive fields).
              Voice/PCI content masking beyond logs is not independently confirmed, so the claim
              is scoped to what is actually implemented instead of a blanket "Ativado". */}
          <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800">
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Mascaramento de PII em logs</p>
              <p className="text-slate-500 text-xs mt-0.5">Campos sensíveis (tokens, senhas, dados de contato) são redigidos automaticamente nos logs do servidor (pino).</p>
            </div>
            <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" /> Ativado</Badge>
          </div>
        </div>
      </Card>
    </div>
  );
}
