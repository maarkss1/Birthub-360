import { CheckCheck, Loader2, MessageSquarePlus, ShieldCheck, UserCog } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { toast } from '../../../lib/toast';
import { type BitrixUserOption, bitrixApi } from '../../integrations/bitrix/bitrix.api';
import { mesaTratamentoManagementApi } from '../mesaTratamento.api';

interface ManagementPanelProps {
  leadId: string;
  connectionId: string | null;
  onActionComplete: () => void;
}

const selectClass =
  'w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand';
const textareaClass = `${selectClass} min-h-[70px] resize-y`;
const labelClass = 'block text-xs font-semibold text-ink-2 mb-1.5';

/** Painel de ações de gestão (ADMIN/GESTOR) — reatribuir responsável, comentar na timeline do
 *  Bitrix sem registrar um resultado completo, e marcar um lead como revisado/decidido. AGENTS.md
 *  desta pasta: "Painel de gestão com ações (reatribuir responsável, comentar, marcar como
 *  decidido) — hoje ADMIN/GESTOR só veem a mesma fila, sem ação extra." Renderizado só para
 *  ADMIN/GESTOR — ver gate em CurrentLeadCard.tsx. */
export function ManagementPanel({ leadId, connectionId, onActionComplete }: ManagementPanelProps) {
  const [users, setUsers] = useState<BitrixUserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [reassigning, setReassigning] = useState(false);

  const [comment, setComment] = useState('');
  const [commenting, setCommenting] = useState(false);

  const [decideNote, setDecideNote] = useState('');
  const [deciding, setDeciding] = useState(false);

  useEffect(() => {
    if (!connectionId) return;
    setLoadingUsers(true);
    bitrixApi
      .listUsers(connectionId)
      .then(setUsers)
      .catch(() => toast.error('Não foi possível carregar os usuários do Bitrix24.'))
      .finally(() => setLoadingUsers(false));
  }, [connectionId]);

  async function handleReassign() {
    if (!selectedUserId) return toast.error('Selecione o novo responsável.');
    setReassigning(true);
    try {
      const result = await mesaTratamentoManagementApi.reassign(leadId, selectedUserId);
      toast.success(`Responsável reatribuído para ${result.ownerName}.`);
      setSelectedUserId('');
      onActionComplete();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível reatribuir o lead.');
    } finally {
      setReassigning(false);
    }
  }

  async function handleComment() {
    if (!comment.trim()) return toast.error('Escreva um comentário.');
    setCommenting(true);
    try {
      await mesaTratamentoManagementApi.comment(leadId, comment.trim());
      toast.success('Comentário registrado no Bitrix24.');
      setComment('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível comentar.');
    } finally {
      setCommenting(false);
    }
  }

  async function handleDecide() {
    setDeciding(true);
    try {
      await mesaTratamentoManagementApi.decide(leadId, decideNote.trim() || undefined);
      toast.success('Lead marcado como revisado pela gestão.');
      setDecideNote('');
      onActionComplete();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível marcar como decidido.');
    } finally {
      setDeciding(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-brand" aria-hidden="true" />
          <CardTitle className="text-sm">Painel de gestão</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className={labelClass} htmlFor="mgmt-reassign">
            Reatribuir responsável
          </label>
          <div className="flex gap-2">
            <select
              id="mgmt-reassign"
              className={selectClass}
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              disabled={loadingUsers || !connectionId}
            >
              <option value="">
                {loadingUsers ? 'Carregando usuários...' : 'Selecione o novo responsável...'}
              </option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <Button
              onClick={handleReassign}
              disabled={reassigning || !selectedUserId}
              variant="secondary"
              className="shrink-0"
              aria-label="Reatribuir responsável"
            >
              {reassigning ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <UserCog className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="mgmt-comment">
            Comentar na timeline (sem registrar resultado)
          </label>
          <div className="space-y-2">
            <textarea
              id="mgmt-comment"
              className={textareaClass}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ex.: acompanhar de perto, cliente estratégico..."
            />
            <Button
              onClick={handleComment}
              disabled={commenting || !comment.trim()}
              variant="secondary"
              className="w-full"
            >
              {commenting ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <MessageSquarePlus className="mr-1.5 h-4 w-4" aria-hidden="true" />
              )}
              Comentar
            </Button>
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="mgmt-decide">
            Marcar como revisado/decidido pela gestão
          </label>
          <div className="space-y-2">
            <textarea
              id="mgmt-decide"
              className={textareaClass}
              value={decideNote}
              onChange={(e) => setDecideNote(e.target.value)}
              placeholder="Nota opcional sobre a decisão..."
            />
            <Button
              onClick={handleDecide}
              disabled={deciding}
              variant="secondary"
              className="w-full"
            >
              {deciding ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <CheckCheck className="mr-1.5 h-4 w-4" aria-hidden="true" />
              )}
              Marcar como decidido
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
