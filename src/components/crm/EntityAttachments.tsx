import { useEffect, useRef, useState } from 'react';
import { Download, Loader2, Paperclip, Trash2, Upload } from 'lucide-react';
import { Button } from '../ui/Button';
import { api } from '../../lib/api';
import { toast } from '../../lib/toast';
import type { Attachment } from '../../types';

type AttachmentEntityType = 'lead' | 'company' | 'contact';

const ROUTE_SEGMENT: Record<AttachmentEntityType, string> = {
  lead: 'leads',
  company: 'companies',
  contact: 'contacts',
};

// Mesmo teto de src/lib/zod.ts (MAX_ATTACHMENT_SIZE_BYTES) — duplicado aqui só como valor de UI
// (mensagem antes de gastar uma chamada de rede), a validação real continua no backend.
const MAX_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024;

interface EntityAttachmentsProps {
  entityType: AttachmentEntityType;
  entityId: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * CRM-005 (auditoria de débito técnico): primeira UI de anexo/arquivo para qualquer entidade de
 * CRM — antes desta mudança não existia nenhuma. Fluxo de 3 passos (mesmo padrão real já usado por
 * CopilotoIaController para áudio): pede uma URL assinada de upload, envia o arquivo direto pro
 * storage S3-compatível, confirma no backend pra só então o registro existir.
 */
export function EntityAttachments({ entityType, entityId }: EntityAttachmentsProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const baseUrl = `/api/${ROUTE_SEGMENT[entityType]}/${entityId}/attachments`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<Attachment[]>(baseUrl)
      .then((data) => {
        if (!cancelled) setAttachments(data);
      })
      .catch(() => {
        if (!cancelled) toast.error('Erro ao carregar anexos');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [baseUrl]);

  const handleUpload = async (file: File) => {
    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      toast.error('Arquivo excede o limite de 25MB por anexo.');
      return;
    }
    setUploading(true);
    try {
      const { signedUrl, objectKey } = await api.post<{ signedUrl: string; objectKey: string }>(
        `${baseUrl}/upload-url`,
        { fileName: file.name, mimeType: file.type || 'application/octet-stream', sizeBytes: file.size },
      );

      // PUT direto pro storage S3-compatível — não passa por api.ts (não é o envelope
      // {success,data} da nossa API, é a resposta crua do bucket).
      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });
      if (!uploadRes.ok) throw new Error('Falha no upload para o storage.');

      const attachment = await api.post<Attachment>(baseUrl, {
        objectKey,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
      });
      setAttachments((prev) => [attachment, ...prev]);
      toast.success('Anexo enviado');
    } catch {
      toast.error('Erro ao enviar anexo');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (attachmentId: string) => {
    try {
      const { signedUrl } = await api.get<{ signedUrl: string }>(
        `${baseUrl}/${attachmentId}/download-url`,
      );
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('Erro ao gerar link de download');
    }
  };

  const handleDelete = async (attachmentId: string) => {
    try {
      await api.delete(`${baseUrl}/${attachmentId}`);
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      toast.success('Anexo removido');
    } catch {
      toast.error('Erro ao remover anexo');
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-ink-2 flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-brand" /> Anexos
        </h3>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5 mr-1.5" />
          )}
          {uploading ? 'Enviando…' : 'Enviar arquivo'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleUpload(file);
            e.target.value = '';
          }}
        />
      </div>

      {loading ? (
        <p className="text-xs text-ink-2">Carregando anexos…</p>
      ) : attachments.length === 0 ? (
        <p className="text-xs text-ink-2">Nenhum anexo enviado ainda.</p>
      ) : (
        <div className="space-y-2">
          {attachments.map((a) => (
            <div
              key={a.id}
              className="p-3 bg-surface-2/40 rounded-2xl border border-line flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold text-ink truncate">{a.fileName}</p>
                <p className="text-[10px] text-ink-2">
                  {formatFileSize(a.sizeBytes)} · {new Date(a.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownload(a.id)}
                  aria-label={`Baixar ${a.fileName}`}
                  className="p-1.5 rounded-lg text-ink-2 hover:text-brand hover:bg-brand/10 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(a.id)}
                  aria-label={`Remover ${a.fileName}`}
                  className="p-1.5 rounded-lg text-ink-2 hover:text-danger hover:bg-danger/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
