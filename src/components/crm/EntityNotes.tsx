import { useEffect, useState } from 'react';
import { Clock, FileText, Loader2, Send } from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from '../../lib/toast';
import { useAuth } from '../../contexts/AuthContext';
import type { Note } from '../../types';

type NoteEntityType = 'lead' | 'company' | 'contact';

// lead/company/contact -> segmento de rota real (leads/companies/contacts) montado em
// bootstrap/routes.ts.
const ROUTE_SEGMENT: Record<NoteEntityType, string> = {
  lead: 'leads',
  company: 'companies',
  contact: 'contacts',
};

interface EntityNotesProps {
  entityType: NoteEntityType;
  entityId: string;
}

/**
 * CRM-004 (auditoria de débito técnico): Notes deixaram de ser exclusivas de Lead. Este componente
 * generaliza o padrão de "Notas & Histórico" já usado em LeadDetailDrawer.tsx (mantido intocado lá
 * — já testado/coberto por e2e — mas o mesmo layout serve Company/Contact, que não tinham nenhuma
 * UI de nota antes desta mudança).
 */
export function EntityNotes({ entityType, entityId }: EntityNotesProps) {
  const { currentUser } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);

  const baseUrl = `/api/${ROUTE_SEGMENT[entityType]}/${entityId}/notes`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<Note[]>(baseUrl)
      .then((data) => {
        if (!cancelled) setNotes(data);
      })
      .catch(() => {
        if (!cancelled) toast.error('Erro ao carregar notas');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [baseUrl]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    setSaving(true);
    try {
      const newNote = await api.post<Note>(baseUrl, {
        content: noteText.trim(),
        author: currentUser?.name || 'Usuário',
      });
      setNotes((prev) => [newNote, ...prev]);
      setNoteText('');
      toast.success('Nota adicionada');
    } catch {
      toast.error('Erro ao adicionar nota');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-ink-2 flex items-center gap-2">
        <FileText className="w-4 h-4 text-brand" /> Notas & Histórico
      </h3>
      <form onSubmit={handleAddNote} className="space-y-2">
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Adicionar uma observação..."
          rows={3}
          className="w-full p-3 bg-surface-2/40 border border-line rounded-2xl text-xs text-ink focus:outline-none focus:border-brand resize-none"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || !noteText.trim()}
            className="px-4 py-2 bg-brand-active hover:brightness-110 text-on-brand rounded-xl text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Adicionar Nota
          </button>
        </div>
      </form>

      {loading ? (
        <p className="text-xs text-ink-2">Carregando notas…</p>
      ) : notes.length === 0 ? (
        <p className="text-xs text-ink-2">Nenhuma nota registrada ainda.</p>
      ) : (
        <div className="space-y-3">
          {notes.map((n) => (
            <div key={n.id} className="p-3 bg-surface-2/40 rounded-2xl border border-line space-y-1">
              <p className="text-xs text-ink whitespace-pre-wrap">{n.content}</p>
              <span className="text-[10px] text-ink-2 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {new Date(n.createdAt).toLocaleString()} ·{' '}
                {n.author}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
