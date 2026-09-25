import type React from 'react';
import { useState, useRef, useEffect } from 'react';
import type { Lead, LeadStage, ThemeMode, IntegrationsConfig, AIConfig, User, LeadTask } from '../types';
import { LeadQualityBadge } from './LeadQualityBadge';
import { LeadStageAndTags } from './LeadStageAndTags';
import { LeadScoresBadge } from './LeadScoresBadge';
import { RequirementEvaluationsBadge } from './RequirementEvaluationsBadge';
import { LeadEvidenceModal } from './LeadEvidenceModal';
import { BitrixExportStatusBadge, type BitrixExportStatus } from './BitrixExportStatusBadge';
import { resolveBitrixWebhook } from '../utils/bitrix';
import { computeNextAction } from '../utils/nextAction';
import { 
  Phone, 
  Globe, 
  MapPin, 
  UserCheck, 
  Mail, 
  // Linkedin removed
  Copy, 
  Check, 
  Edit3, 
  Save, 
  PhoneCall, 
  MessageSquare, 
  Send,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Square,
  Newspaper,
  Terminal,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Building2,
  FileText,
  FileSearch,
  Clock,
  Hash,
  Zap,
  RefreshCw,
  Briefcase,
  Shield, ShieldAlert, ListChecks, Flame,
  Mic, MessageCircle, Calendar, Plus, Circle
} from 'lucide-react';
import { LinkedinIcon as Linkedin } from '../../../../components/ui/icons/LinkedinIcon';
import confetti from 'canvas-confetti';

// canvas-confetti draws on a <canvas>, which doesn't resolve CSS var() — so we read the
// active brand's colors from the [data-brand] element (the override lives there, not at :root).
function resolveBrandConfettiColors(): string[] {
  const brandEl = document.querySelector('[data-brand]') || document.documentElement;
  const style = getComputedStyle(brandEl);
  const primary = style.getPropertyValue('--brand-primary').trim() || '#FF5618';
  const secondary = style.getPropertyValue('--brand-secondary').trim() || '#FF8020';
  return [primary, secondary, '#FFC500'];
}

// wa.me só aceita dígitos (com DDI) — os telefones no lead já vêm formatados como
// "+55 (11) 3450-8000", então basta remover tudo que não é número.
function toWhatsAppLink(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const withCountryCode = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${withCountryCode}`;
}

interface LeadCardProps {
  lead: Lead;
  index?: number;
  pitch?: string;
  aiConfig?: AIConfig;
  onUpdateMessage?: (messageId: string, content: string, status: string) => void;
  onUpdateStage?: (leadId: string, stage: LeadStage) => void;
  onUpdateTags?: (leadId: string, tags: string[]) => void;
  onLeadSaved?: (updatedLead: Lead) => void;
  onSaveLead?: (updatedLead: Lead) => void;
  theme?: ThemeMode;
  integrationsConfig?: IntegrationsConfig;
  isReadOnly?: boolean;
  isUserView?: boolean;
  usersList?: User[];
  startCollapsed?: boolean;
  user?: User;
}

export const LeadCard: React.FC<LeadCardProps> = ({
  lead,
  index = 0,
  pitch,
  aiConfig,
  onUpdateMessage,
  onUpdateStage,
  onUpdateTags,
  onLeadSaved,
  onSaveLead,
  theme = 'dark',
  integrationsConfig,
  user,
  isReadOnly = false,
  isUserView = false,
  usersList = [],
  startCollapsed = false
}) => {
  const [isExpanded, setIsExpanded] = useState(!startCollapsed);
  const [activeChannel, setActiveChannel] = useState<'cold_call' | 'cold_email' | 'whatsapp' | 'linkedin' | 'objection_matrix' | 'qualification_matrix' | 'ice_breaker' | 'prompt'>('cold_call');
  const [copiedChannel, setCopiedChannel] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [copies, setCopies] = useState(lead.copies || {
    cold_call: '',
    cold_email: '',
    whatsapp: '',
    linkedin: '',
    objection_matrix: '',
    qualification_matrix: '',
    ice_breaker: ''
  });
  const [msgStatus, setMsgStatus] = useState<string>('draft');

  // Editable Lead General Info
  const [leadName, setLeadName] = useState(lead.name);
  const [leadCnpj, setLeadCnpj] = useState(lead.cnpj || '');
  const [razaoSocial, setRazaoSocial] = useState(lead.razao_social || '');
  const [situacaoCadastral, setSituacaoCadastral] = useState(lead.situacao_cadastral || '');
  const [cnaeFiscal, setCnaeFiscal] = useState(lead.cnae_fiscal || '');
  const [cnaeDescricao, setCnaeDescricao] = useState(lead.cnae_fiscal_descricao || '');
  const [capitalSocial, setCapitalSocial] = useState(lead.capital_social || '');
  const [qsaList, setQsaList] = useState<any[]>(lead.qsa || []);
  const [isRefreshingCnpj, setIsRefreshingCnpj] = useState(false);
  const [cnpjSuccessMsg, setCnpjSuccessMsg] = useState<string | null>(null);

  const [leadPhone, setLeadPhone] = useState(lead.phone || '');
  const [leadCorporateEmail, setLeadCorporateEmail] = useState(lead.corporate_email || '');
  const [leadWebsite, setLeadWebsite] = useState(lead.website || '');
  const [leadAddress, setLeadAddress] = useState(lead.address || '');

  // Main Decision Maker Info
  const mainDm = lead.decision_makers?.[0] || {
    name: lead.decision_maker_name || '',
    title: lead.decision_maker_title || '',
    email: lead.decision_maker_email || '',
    emails: lead.decision_maker_emails || (lead.decision_maker_email ? [lead.decision_maker_email] : []),
    phone: lead.decision_maker_phone || lead.phone || '',
    phones: lead.decision_maker_phones || (lead.decision_maker_phone ? [lead.decision_maker_phone] : [lead.phone || '']),
    linkedin: lead.decision_maker_linkedin || ''
  };

  const [dmName, setDmName] = useState(mainDm.name);
  const [dmTitle, setDmTitle] = useState(mainDm.title);
  const [dmEmail, setDmEmail] = useState(mainDm.email);
  const [dmPhone, setDmPhone] = useState(mainDm.phone || leadPhone);
  const [dmLinkedin, setDmLinkedin] = useState(mainDm.linkedin || '');

  // News Dossier state & Collapsible toggle
  const [newsDossier, setNewsDossier] = useState<any>(lead.news_dossier || null);
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(Boolean(lead.news_dossier));

  // Tarefa recomendada: regra determinística sobre estágio/tempo parado/checagem
  // no Bitrix — sempre a mesma resposta para o mesmo estado do lead (previsibilidade).
  const nextAction = computeNextAction(lead);
  const bitrixCheckStatus = lead.bitrix_check_status;

  // Second stage enrichment state
  const [isEnrichingNews, setIsEnrichingNews] = useState<boolean>(false);
  const [enrichStatusMsg, setEnrichStatusMsg] = useState<string>('');
  const [enrichAbortCtrl, setEnrichAbortCtrl] = useState<AbortController | null>(null);

  // On-Demand Copywriting State
  const [isGeneratingCopies, setIsGeneratingCopies] = useState(false);
  const [copiesGenMsg, setCopiesGenMsg] = useState<string | null>(null);

  // Save Lead State
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Integrations states
  const [isExportingBitrix, setIsExportingBitrix] = useState(false);
  const [bitrixResult, setBitrixResult] = useState<{ success: boolean; blocked?: boolean; leadId?: number; message?: string } | null>(null);

  // Wave 6 (CPI) - Evidence & Provenance: modal "ver evidências", sob demanda
  // (GET /api/leads/:id/evidence só é chamado quando o usuário abre o painel).
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);

  // Wave 12 (CPI) - CRM/Operação: status real de exportação, nunca um botão
  // fire-and-forget. Prioriza o resultado desta sessão (bitrixResult, setado
  // depois de um clique) sobre o que já estava persistido no lead ao carregar
  // o card — mas cai no valor persistido quando o usuário ainda não clicou
  // nesta sessão (ex.: reabriu um card cuja última tentativa já tinha falhado).
  const effectiveBitrixStatus: BitrixExportStatus = bitrixResult
    ? (bitrixResult.success ? 'exported' : (bitrixResult.blocked ? 'blocked' : 'error'))
    : (lead.bitrix_export_status || 'not_exported');
  const effectiveBitrixError = bitrixResult && !bitrixResult.success ? bitrixResult.message : lead.bitrix_export_error;
  const effectiveBitrixExportedAt = bitrixResult?.success ? undefined : lead.bitrix_exported_at;

  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [hunterResult, setHunterResult] = useState<{ status: string; score: number; result: string } | null>(null);

  const [isCallingBland, setIsCallingBland] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  const toggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        
        // Transcribe
        setActivityNotes(prev => prev + (prev ? '\n' : '') + '[Transcrevendo áudio com LLaMA3...]');
        
        try {
          const formData = new FormData();
          formData.append('audio', audioBlob);
          formData.append('aiConfig', JSON.stringify({
             groqApiKey: aiConfig?.groqApiKey || integrationsConfig?.groqApiKey
          }));

          const res = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData
          });
          const data = await res.json();
          if (data.text) {
            setActivityNotes(prev => prev.replace('[Transcrevendo áudio com LLaMA3...]', data.text));
          } else {
            setActivityNotes(prev => prev.replace('[Transcrevendo áudio com LLaMA3...]', '[Erro na transcrição]'));
          }
        } catch (err) {
          setActivityNotes(prev => prev.replace('[Transcrevendo áudio com LLaMA3...]', '[Erro na conexão]'));
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert('Permissão de microfone negada ou indisponível.');
    }
  };


  const [isFastGenerating, setIsFastGenerating] = useState(false);
  const handleFastScript = async () => {
    setIsFastGenerating(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/generate-copies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pitch,
          aiConfig: {
            ...aiConfig,
            groqApiKey: aiConfig?.groqApiKey || integrationsConfig?.groqApiKey
          },
          tone: enrichTone
        })
      });
      const data = await res.json();
      if (res.ok && data.copies && data.copies.cold_call) {
        navigator.clipboard.writeText(data.copies.cold_call);
        alert('Script de Cold Call copiado para a área de transferência!');
      } else {
        alert('Erro ao gerar script');
      }
    } catch(err) {
      alert('Erro de conexão ao gerar script rápido');
    } finally {
      setIsFastGenerating(false);
    }
  };

  const [blandResult, setBlandResult] = useState<{ success: boolean; callId?: string; message?: string } | null>(null);

  const [enrichTone, setEnrichTone] = useState<string>('consultivo');
  
  const [activityNotes, setActivityNotes] = useState(lead.activity_notes || '');
  const [activityContext, setActivityContext] = useState(lead.activity_context || '');
  const [assignedTo, setAssignedTo] = useState(lead.assigned_to || '');

  // Tarefas do lead (agendamento manual: "ligar de volta dia X", "enviar proposta")
  const [tasks, setTasks] = useState<LeadTask[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);

  const isDark = theme === 'dark';

  const hasCopies = Boolean(
    (copies.cold_call && copies.cold_call.trim().length > 10) ||
    (copies.cold_email && copies.cold_email.trim().length > 10) ||
    (copies.whatsapp && copies.whatsapp.trim().length > 10) ||
    (copies.linkedin && copies.linkedin.trim().length > 10)
  );

  const handleCopy = (channel: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedChannel(channel);
    setTimeout(() => setCopiedChannel(null), 2000);
  };

  // CNPJ Direct Refresh Action
  const handleRefreshCnpj = async () => {
    setIsRefreshingCnpj(true);
    setCnpjSuccessMsg(null);
    try {
      const res = await fetch(`/api/leads/${lead.id}/cnpj-refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cnpj: leadCnpj })
      });
      const data = await res.json();
      if (res.ok && data.cnpjData) {
        setLeadCnpj(data.cnpjData.cnpj);
        setRazaoSocial(data.cnpjData.razao_social);
        setSituacaoCadastral(data.cnpjData.situacao_cadastral);
        setCnaeFiscal(data.cnpjData.cnae_fiscal);
        setCnaeDescricao(data.cnpjData.cnae_fiscal_descricao);
        setCapitalSocial(data.cnpjData.capital_social);
        setQsaList(data.cnpjData.qsa || []);
        setCnpjSuccessMsg('CNPJ Atualizado via Receita Federal!');
        setTimeout(() => setCnpjSuccessMsg(null), 3500);
      } else {
        alert(data.error || 'Falha ao consultar CNPJ');
      }
    } catch (e: any) {
      alert(`Erro na consulta de CNPJ: ${e.message}`);
    } finally {
      setIsRefreshingCnpj(false);
    }
  };

  // On-demand Copywriting Generation Action
  const handleGenerateCopies = async () => {
    setIsGeneratingCopies(true);
    setCopiesGenMsg('Invocando LLaMA3 para gerar roteiros personalizados...');
    try {
      const res = await fetch(`/api/leads/${lead.id}/generate-copies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pitch,
          aiConfig: {
            ...aiConfig,
            groqApiKey: aiConfig?.groqApiKey || integrationsConfig?.groqApiKey
          },
          tone: enrichTone
        })
      });
      const data = await res.json();
      if (res.ok && data.copies) {
        setCopies(data.copies);
        setCopiesGenMsg('Roteiros comerciais gerados com sucesso!');
        confetti({
          particleCount: 45,
          spread: 65,
          origin: { y: 0.7 },
          colors: resolveBrandConfettiColors()
        });
        setTimeout(() => setCopiesGenMsg(null), 3500);
      } else {
        alert(data.error || 'Erro ao gerar copys');
      }
    } catch (e: any) {
      alert(`Falha na geração de copys: ${e.message}`);
    } finally {
      setIsGeneratingCopies(false);
    }
  };

  // 1. Action: "Salvar" Button (Persists everything directly to SQLite)
  const handleSaveLead = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const updatedLead: Lead = {
        ...lead,
        name: leadName,
        cnpj: leadCnpj,
        phone: leadPhone,
        corporate_email: leadCorporateEmail,
        website: leadWebsite,
        address: leadAddress,
        decision_maker_name: dmName,
        decision_maker_title: dmTitle,
        decision_maker_email: dmEmail,
        decision_maker_phone: dmPhone,
        decision_maker_linkedin: dmLinkedin,
        activity_notes: activityNotes,
        activity_context: activityContext,
        assigned_to: assignedTo,
        copies,
        news_dossier: newsDossier,
        userId: user?.id
      };

      const res = await fetch(`/api/leads/${lead.id}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedLead)
      });

      if (res.ok) {
        setSaveSuccess(true);
        setIsEditing(false);
        if (onLeadSaved) onLeadSaved(updatedLead);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        const err = await res.json();
        alert(`Erro ao salvar: ${err.error || 'Falha no servidor'}`);
      }
    } catch (err: any) {
      alert(`Falha na conexão: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Tarefas do lead: busca só quando o card está expandido (informação completa
  // não deve custar uma chamada de rede enquanto o card está só recolhido na lista).
  useEffect(() => {
    if (!isUserView || !isExpanded) return;
    let cancelled = false;
    setIsLoadingTasks(true);
    fetch(`/api/leads/${lead.id}/tasks`)
      .then(res => res.json())
      .then(data => {
        if (!cancelled) setTasks(Array.isArray(data) ? data : []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoadingTasks(false);
      });
    return () => { cancelled = true; };
  }, [isUserView, isExpanded, lead.id]);

  const handleAddTask = async () => {
    if (!newTaskDescription.trim() || isSavingTask) return;
    setIsSavingTask(true);
    setTaskError(null);
    try {
      const res = await fetch(`/api/leads/${lead.id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: newTaskDescription.trim(), dueDate: newTaskDueDate || null, userId: user?.id })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Falha ao criar tarefa.');
      }
      const created: LeadTask = await res.json();
      setTasks(prev => [created, ...prev]);
      setNewTaskDescription('');
      setNewTaskDueDate('');
    } catch (err: any) {
      setTaskError(err.message || 'Falha ao criar tarefa.');
    } finally {
      setIsSavingTask(false);
    }
  };

  const handleToggleTaskStatus = async (task: LeadTask) => {
    const nextStatus: LeadTask['status'] = task.status === 'done' ? 'pending' : 'done';
    setTasks(prev => prev.map(t => (t.id === task.id ? { ...t, status: nextStatus } : t)));
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, userId: user?.id })
      });
      if (!res.ok) throw new Error();
      const updated: LeadTask = await res.json();
      setTasks(prev => prev.map(t => (t.id === task.id ? updated : t)));
    } catch {
      // Falha ao persistir: desfaz a atualização otimista para não mostrar um estado que não foi salvo.
      setTasks(prev => prev.map(t => (t.id === task.id ? task : t)));
    }
  };

  // 2. Action: "Enriquecer +" Button (Second Stage News & Public Sources Dossier + New Scripts)
  const handleEnrichNews = async () => {
    if (isEnrichingNews) return;
    setIsEnrichingNews(true);
    setEnrichStatusMsg('Buscando notícias públicas e fatos relevantes...');

    const controller = new AbortController();
    setEnrichAbortCtrl(controller);

    try {
      const res = await fetch(`/api/leads/${lead.id}/enrich-news`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          pitch: pitch || 'A Atlas conecta pessoas e tecnologia gerando valores com segurança e inteligência logística.',
          aiConfig,
          tone: enrichTone
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.news_dossier) {
          setNewsDossier(data.news_dossier);
          setIsDossierOpen(true);
        }
        if (data.copies) {
          setCopies(data.copies);
        }

        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.7 },
          colors: [...resolveBrandConfettiColors().slice(0, 1), '#00D084', '#0070F3']
        });
      } else {
        const err = await res.json();
        alert(`Falha no enriquecimento: ${err.error || 'Erro desconhecido'}`);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Erro no enriquecimento:', err);
      }
    } finally {
      setIsEnrichingNews(false);
      setEnrichStatusMsg('');
      setEnrichAbortCtrl(null);
    }
  };

  // 3. Action: "Parar" Button (Aborts news enrichment)
  const handleStopEnrich = () => {
    if (enrichAbortCtrl) {
      enrichAbortCtrl.abort();
      setIsEnrichingNews(false);
      setEnrichStatusMsg('');
    }
  };

  // Integration Action: Send Lead to Bitrix24
  const handleExportToBitrix = async () => {
    setIsExportingBitrix(true);
    try {
      const webhookUrl = resolveBitrixWebhook(user, integrationsConfig);

      const res = await fetch('/api/integrations/bitrix24/send-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead: {
            ...lead,
            name: leadName,
            cnpj: leadCnpj,
            phone: leadPhone,
            corporate_email: leadCorporateEmail,
            decision_maker_name: dmName,
            decision_maker_title: dmTitle,
            decision_maker_email: dmEmail,
            decision_maker_phone: dmPhone,
            decision_maker_linkedin: dmLinkedin,
            copies
          },
          webhookUrl,
          title: `[Atlas Outbound] ${leadName} - ${dmTitle}`
        })
      });

      const data = await res.json();
      if (res.ok) {
        setBitrixResult({
          success: true,
          leadId: data.leadId,
          message: 'Enviado com sucesso para o Bitrix24!'
        });
      } else {
        // Wave 12 (CPI) - CRM/Operação: elegibilidade (409, `blocked: true`) é um
        // resultado distinto de uma falha de rede/API - nunca reportado com a
        // mesma mensagem genérica de erro.
        setBitrixResult({
          success: false,
          blocked: Boolean(data.blocked),
          message: data.blocked && Array.isArray(data.reasons)
            ? data.reasons.join(' | ')
            : (data.error || 'Falha ao sincronizar com Bitrix24')
        });
      }
    } catch (err: any) {
      setBitrixResult({
        success: false,
        message: err.message
      });
    } finally {
      setIsExportingBitrix(false);
    }
  };

  // Integration Action: Verify Decisor Email via Hunter.io
  const handleVerifyEmail = async () => {
    const targetEmail = dmEmail || mainDm.email;
    if (!targetEmail || targetEmail === 'Não revelado') return;
    setIsVerifyingEmail(true);
    try {
      const res = await fetch('/api/integrations/hunter/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          apiKey: integrationsConfig?.hunterApiKey
        })
      });
      const data = await res.json();
      // A verificação só é considerada válida quando o Hunter.io realmente respondeu
      // (success === true). Uma falha de rede ou serviço indisponível nunca deve
      // ser exibida como "e-mail válido" - isso seria inventar um resultado.
      if (res.ok && data.success) {
        setHunterResult({
          status: data.status,
          score: data.score ?? 0,
          result: data.result || 'unknown'
        });
      } else {
        setHunterResult({
          status: 'unknown',
          score: 0,
          result: 'unknown'
        });
      }
    } catch (err) {
      setHunterResult({
        status: 'unknown',
        score: 0,
        result: 'unknown'
      });
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  // Integration Action: Call Lead via Bland AI
  const handleCallViaBland = async () => {
    const phoneNumber = dmPhone || leadPhone;
    if (!phoneNumber) {
      // Nunca discamos um número inventado: sem telefone real conhecido, a chamada
      // simplesmente não é disparada.
      setBlandResult({ success: false, message: 'Nenhum telefone conhecido para este lead/decisor.' });
      return;
    }
    setIsCallingBland(true);
    try {
      const res = await fetch('/api/integrations/bland/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber,
          prompt: copies.cold_call || `Você é o assistente de prospecção da Atlas Segurança e Inteligência Logística. Converse com ${dmName} (${dmTitle}) da empresa ${leadName}.`,
          leadName: dmName,
          companyName: leadName,
          apiKey: integrationsConfig?.blandAiApiKey
        })
      });
      const data = await res.json();
      if (res.ok) {
        setBlandResult({
          success: true,
          callId: data.callId,
          message: 'Chamada iniciada com sucesso via Bland AI!'
        });
      } else {
        setBlandResult({
          success: false,
          message: data.error || 'Erro ao disparar chamada Bland AI'
        });
      }
    } catch (err: any) {
      setBlandResult({
        success: false,
        message: err.message
      });
    } finally {
      setIsCallingBland(false);
    }
  };

  // Botão "Concluir tarefa": executa a ação concreta por trás da recomendação
  // determinística (computeNextAction), em vez de só exibir o texto. Nunca pula
  // direto para Ganho/Perdido — essa transição sempre exige o motivo estruturado
  // escolhido em LeadStageAndTags, então aqui só abrimos o card para isso.
  const handleCompleteNextAction = () => {
    switch (nextAction.action) {
      case 'Gerar roteiros de abordagem':
        handleGenerateCopies();
        break;
      case 'Fazer o primeiro contato':
      case 'Avançar para o primeiro contato':
        onUpdateStage?.(lead.id, 'contatado');
        break;
      case 'Enriquecer com dossiê de notícias':
        handleEnrichNews();
        break;
      default:
        setIsExpanded(true);
    }
  };

  // Botão "Agendar Reunião": move para o estágio de Negociação, que já é o que
  // representa reunião/proposta em andamento (ver STAGE_CONFIG em LeadStageAndTags).
  const handleScheduleMeeting = () => {
    onUpdateStage?.(lead.id, 'negociacao');
  };

  return (
    <div className={`border rounded-2xl p-5 md:p-6 shadow-xl transition space-y-5 ${
      isDark 
        ? 'bg-slate-900 border-slate-800 hover:border-slate-700/80 text-slate-200' 
        : 'bg-white border-slate-200 hover:border-slate-300 shadow-slate-100 text-slate-800'
    }`}>
      {/* 1. Header: Company Info with CNPJ, Phone, Email, Website, Address */}
      {/* Empilhado sempre (não só flex-col-por-viewport): este card também vive numa coluna
          de Kanban fixa e estreita, onde sm:flex-row quebrava o layout (a coluna de
          nome/endereço era espremida a 0px de largura, já que o breakpoint reage à largura
          da janela, não à da coluna). */}
      <div className={`flex flex-col justify-between items-start gap-4 border-b pb-4 ${
        isDark ? 'border-slate-800/80' : 'border-slate-200'
      }`}>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-[var(--brand-primary)]/15 border border-[var(--brand-primary)]/30 text-[var(--brand-primary)] font-mono text-xs flex items-center justify-center font-bold">
              {index + 1}
            </span>
            
            {isEditing ? (
              <input
                type="text"
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                className={`text-base font-bold rounded px-2 py-0.5 border outline-none ${
                  isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsExpanded(prev => !prev)}
                className={`text-lg font-bold tracking-tight text-left hover:underline decoration-2 underline-offset-2 ${isDark ? 'text-white decoration-[var(--brand-primary)]' : 'text-slate-900 decoration-[var(--brand-primary)]'}`}
                title={isExpanded ? 'Clique para recolher os detalhes' : 'Clique para ver todos os detalhes deste lead'}
              >
                {leadName}
              </button>
            )}

            {/* CNPJ Badge */}
            <span className="bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border border-[var(--brand-primary)]/20 text-xs px-2.5 py-0.5 rounded-md font-mono font-semibold flex items-center gap-1">
              <Hash className="w-3 h-3 text-[var(--brand-primary)]" />
              <span>CNPJ: {leadCnpj || '61.123.456/0001-89'}</span>
            </span>

            {/* Quality Score Indicator Badge (completude de dado) */}
            <LeadQualityBadge lead={lead} theme={theme} />

            {/* Wave 8 (CPI) - Scoring: Fit / Intent / Data Quality / Final -
                só renderiza quando `lead.scores` existe (resposta de /prospect;
                leads recarregados depois não têm o campo, pois não é persistido). */}
            <LeadScoresBadge lead={lead} theme={theme} />

            {/* Wave 2 (CPI) - Requirement Engine: quais critérios da busca este
                lead confirma / não confirma / tem status desconhecido. */}
            <RequirementEvaluationsBadge lead={lead} theme={theme} />

            {/* News Enriched Badge */}
            {newsDossier && (
              <span className="bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Notícias Enriquecidas</span>
              </span>
            )}

            {/* Bitrix24 Duplicate-Check Badge */}
            {bitrixCheckStatus === 'existing_client' && (
              <span className="bg-red-500/15 text-red-500 border border-red-500/30 text-[10px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1" title={lead.bitrix_check_detail}>
                <ShieldAlert className="w-3 h-3" />
                <span>Já é cliente (Bitrix24)</span>
              </span>
            )}
            {bitrixCheckStatus === 'existing_lead' && (
              <span className="bg-amber-500/15 text-amber-500 border border-amber-500/30 text-[10px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1" title={lead.bitrix_check_detail}>
                <ShieldAlert className="w-3 h-3" />
                <span>Já está na base (Bitrix24)</span>
              </span>
            )}
            {bitrixCheckStatus === 'new' && (
              <span className="bg-sky-500/15 text-sky-500 border border-sky-500/30 text-[10px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1" title={lead.bitrix_check_detail}>
                <ShieldCheck className="w-3 h-3" />
                <span>Novo no Bitrix24</span>
              </span>
            )}

            {/* Badge de dado não confirmado: a consulta oficial de CNPJ não trouxe
                situação cadastral, CNAE e/ou capital social. Desde a Wave 0
                (anti-fabricação) esses campos ficam vazios, nunca preenchidos com
                um valor de preenchimento — o badge só sinaliza a ausência. */}
            {lead.is_estimated && (
              <span
                className="bg-amber-500/15 text-amber-600 border border-amber-500/30 text-[10px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1"
                title="Situação cadastral, CNAE e/ou capital social não foram confirmados pela Receita Federal — os campos ficam em branco, não preenchidos com um valor estimado."
              >
                <ShieldAlert className="w-3 h-3" />
                <span>Dados fiscais não confirmados</span>
              </span>
            )}
          </div>

          {/* Próxima Ação / Tarefa Recomendada */}
          {(lead.stage !== 'ganho' && lead.stage !== 'perdido') && (
            <div className={`w-full rounded-lg border px-3 py-2 space-y-2 ${
              nextAction.urgency === 'alta'
                ? 'border-red-500/30 bg-red-500/10'
                : nextAction.urgency === 'media'
                  ? 'border-amber-500/30 bg-amber-500/10'
                  : (isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-slate-50')
            }`}>
              <div className="flex items-start gap-2">
                <Flame className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                  nextAction.urgency === 'alta' ? 'text-red-500' : nextAction.urgency === 'media' ? 'text-amber-500' : (isDark ? 'text-slate-500' : 'text-slate-400')
                }`} />
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                    Próxima ação: {nextAction.action}
                  </p>
                  <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{nextAction.reason}</p>
                </div>
              </div>
              {/* Ações de tarefa ficam escondidas até o card ser expandido (clique no nome
                  ou em "Detalhes") — o card recolhido mostra só a informação básica. */}
              {isExpanded && (
                <div className="flex flex-wrap items-center gap-1.5 pl-5">
                  <button
                    type="button"
                    onClick={handleCompleteNextAction}
                    disabled={isGeneratingCopies}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border flex items-center gap-1 transition disabled:opacity-50 ${
                      isDark
                        ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border-emerald-500/30'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-200'
                    }`}
                    title="Executa a próxima ação recomendada (ou abre os detalhes quando precisar de uma decisão sua, como Ganho/Perdido)"
                  >
                    {isGeneratingCopies ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                    <span>Concluir tarefa</span>
                  </button>
                  {(lead.stage === 'prospecto' || lead.stage === 'qualificado' || lead.stage === 'contatado') && (
                    <button
                      type="button"
                      onClick={handleScheduleMeeting}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border flex items-center gap-1 transition ${
                        isDark
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                      }`}
                      title="Marca este lead como em Negociação (reunião/proposta agendada)"
                    >
                      <Calendar className="w-3 h-3" />
                      <span>Agendar reunião</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {lead.stage === 'perdido' && lead.loss_reason && (
            <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              Motivo da perda: <span className="font-semibold">{lead.loss_reason}</span>
            </p>
          )}

          {/* Wave 13 (CPI) - Feedback Loop: contraparte simétrica do motivo de perda. */}
          {lead.stage === 'ganho' && lead.win_reason && (
            <p className={`text-[11px] ${isDark ? 'text-emerald-500' : 'text-emerald-600'}`}>
              Motivo do ganho: <span className="font-semibold">{lead.win_reason}</span>
            </p>
          )}

          {/* Transparência: qual motor de IA gerou os roteiros deste lead */}
          {lead.engine_used && (
            <p className={`text-[10px] font-mono ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
              Roteiros gerados por: {lead.engine_used}
            </p>
          )}

          {/* Address & Meta */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs">
            <p className={`flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              <MapPin className="w-3.5 h-3.5 text-[var(--brand-primary)] shrink-0" />
              <span>{leadAddress}</span>
            </p>

            {lead.segment && (
              <span className={`px-2 py-0.5 rounded border text-[11px] ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}>
                {lead.segment}
              </span>
            )}

            {lead.employee_count && (
              <span className={`px-2 py-0.5 rounded border text-[11px] ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}>
                {lead.employee_count}
              </span>
            )}

            {lead.annual_revenue && (
              <span className={`px-2 py-0.5 rounded border text-[11px] ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}>
                {lead.annual_revenue}
              </span>
            )}
          </div>
        </div>

        {/* Só o botão que abre o card fica sempre visível — os contatos rápidos da
            empresa (site, LinkedIn, telefone, WhatsApp, e-mail) são "informação
            completa" e só aparecem expandido, junto com o resto (ver abaixo). */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsExpanded(prev => !prev)}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition flex items-center gap-1 ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
            title={isExpanded ? 'Recolher card' : 'Expandir card (CNPJ, decisor, contatos, roteiros)'}
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>{isExpanded ? 'Recolher' : 'Detalhes'}</span>
          </button>
        </div>
      </div>

      {isExpanded && (
      <>
      {/* Contatos Rápidos da Empresa (site, LinkedIn, telefone, WhatsApp, e-mail) */}
      <div className="flex flex-wrap items-center gap-2">
        {leadWebsite && (
          <a
            href={leadWebsite.startsWith('http') ? leadWebsite : `https://${leadWebsite}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition flex items-center gap-1.5 ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
            <span>Website</span>
          </a>
        )}

        {lead.company_linkedin && (
          <a
            href={lead.company_linkedin.startsWith('http') ? lead.company_linkedin : `https://${lead.company_linkedin}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition flex items-center gap-1.5 ${
              isDark
                ? 'bg-[#0077b5]/15 hover:bg-[#0077b5]/25 text-[#0077b5] border-[#0077b5]/30'
                : 'bg-slate-100 hover:bg-slate-200 text-[#0077b5] border-slate-300'
            }`}
            title="Página da Empresa no LinkedIn"
          >
            <Linkedin className="w-3.5 h-3.5 text-[#0077b5]" />
            <span>LinkedIn Empresa</span>
          </a>
        )}

        {leadPhone && leadPhone !== 'N/A' && (
          <a
            href={`tel:${leadPhone}`}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg border flex items-center gap-1.5 transition ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 text-emerald-600 border-slate-200'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>{leadPhone}</span>
          </a>
        )}

        {leadPhone && leadPhone !== 'N/A' && (
          <a
            href={toWhatsAppLink(leadPhone)}
            target="_blank"
            rel="noopener noreferrer"
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border flex items-center gap-1.5 transition ${
              isDark
                ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border-emerald-500/30'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-200'
            }`}
            title="Abrir conversa no WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </a>
        )}

        {leadCorporateEmail && (
          <a
            href={`mailto:${leadCorporateEmail}`}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg border flex items-center gap-1.5 transition ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
          >
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            <span>{leadCorporateEmail}</span>
          </a>
        )}
      </div>

      {/* 1.1 Dados Oficiais do CNPJ (API Pública / Receita Federal / Minha Receita) */}
      <div className={`p-3.5 rounded-xl border space-y-2.5 transition ${
        isDark ? 'bg-slate-950/50 border-[var(--brand-primary)]/20' : 'bg-[var(--brand-primary)]/5 border-[var(--brand-primary)]/20'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[var(--brand-primary)]" />
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-[var(--brand-primary)]' : 'text-[var(--brand-primary)]'}`}>
              Dados Oficiais do CNPJ (Receita Federal)
            </span>
            <span className="bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>{situacaoCadastral}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {cnpjSuccessMsg && (
              <span className="text-[11px] font-semibold text-emerald-500 flex items-center gap-1 animate-fadeIn">
                <Check className="w-3 h-3" />
                {cnpjSuccessMsg}
              </span>
            )}
            <button
              onClick={handleRefreshCnpj}
              disabled={isRefreshingCnpj}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border flex items-center gap-1.5 transition ${
                isDark 
                  ? 'bg-[var(--brand-primary)]/10 hover:bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] border-[var(--brand-primary)]/30' 
                  : 'bg-white hover:bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border-[var(--brand-primary)]/30'
              }`}
              title="Consultar dados cadastrais na API pública de CNPJ"
            >
              {isRefreshingCnpj ? (
                <Loader2 className="w-3 h-3 animate-spin text-[var(--brand-primary)]" />
              ) : (
                <RefreshCw className="w-3 h-3 text-[var(--brand-primary)]" />
              )}
              <span>Atualizar CNPJ</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Razão Social Oficial:</span>
            <span className={`font-semibold truncate block ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              {razaoSocial}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">CNPJ / Situação:</span>
            <span className={`font-mono font-bold block ${isDark ? 'text-[var(--brand-primary)]' : 'text-[var(--brand-primary)]'}`}>
              {leadCnpj}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">CNAE Principal:</span>
            <span className={`truncate block ${isDark ? 'text-slate-300' : 'text-slate-700'}`} title={`${cnaeFiscal} - ${cnaeDescricao}`}>
              <strong>{cnaeFiscal}</strong> - {cnaeDescricao}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Capital Social:</span>
            <span className={`font-semibold block ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
              {capitalSocial}
            </span>
          </div>
        </div>

        {/* Quadro Societário (QSA) se disponível */}
        {qsaList && qsaList.length > 0 && (
          <div className="pt-1.5 border-t border-slate-800/40 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-slate-400 font-semibold flex items-center gap-1">
              <Briefcase className="w-3 h-3 text-slate-400" />
              <span>Sócios/Administradores (QSA):</span>
            </span>
            {qsaList.map((socio, idx) => (
              <span 
                key={idx} 
                className={`px-2 py-0.5 rounded border text-[10px] font-medium ${
                  isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                {socio.nome_socio} {socio.qualificacao_socio ? `(${socio.qualificacao_socio})` : ''}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 2. Funnel Stage Selector, Assigned User & Tags Bar */}
      <div className={`p-3 rounded-xl border flex flex-col gap-3 ${
        isDark ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-50/80 border-slate-200'
      }`}>
        <div className="flex flex-col items-start justify-between gap-3">
          <div className="flex-1 w-full">
            <LeadStageAndTags
              lead={lead}
              theme={theme}
              onUpdateStage={onUpdateStage}
              onUpdateTags={onUpdateTags}
              userId={user?.id}
            />
          </div>
          
          {/* Admin Assigner */}
          {!isUserView && usersList.filter(u => u.role === 'user').length > 0 && (
            <div className="flex items-center gap-2 shrink-0 md:border-l md:pl-3 border-slate-200 dark:border-slate-800 overflow-x-auto">
              {usersList.filter(u => u.role === 'user').map(u => {
                const isAssigned = assignedTo === u.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => {
                      const newVal = isAssigned ? '' : u.id;
                      setAssignedTo(newVal);
                      fetch(`/api/leads/${lead.id}/save`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ...lead, assigned_to: newVal, userId: user?.id })
                      });
                    }}
                    className={`text-[11px] font-bold rounded-lg px-3 py-2 transition flex items-center gap-1.5 whitespace-nowrap shadow-sm ${
                      isAssigned 
                        ? 'bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-hover)] border border-[var(--brand-primary)]' 
                        : isDark 
                          ? 'bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800' 
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {isAssigned ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Atribuído a {u.name.split(' ')[0]}
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Enviar p/ {u.name.split(' ')[0]}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 3. Decision Maker Profile (Nomes, Emails, Telefones, LinkedIn) */}
      <div className={`border rounded-xl p-4 flex flex-col justify-between items-start gap-3.5 ${
        isDark ? 'bg-slate-950/70 border-slate-800/90' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-[var(--brand-primary)]/15 border border-[var(--brand-primary)]/30 flex items-center justify-center text-[var(--brand-primary)] shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
              <span>Decisor Mapeado</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[var(--brand-primary)]/15 text-[var(--brand-primary)] border border-[var(--brand-primary)]/30 font-semibold">
                Apollo.io
              </span>
              {hunterResult && hunterResult.status !== 'unknown' && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  <span>Hunter: {hunterResult.score}% {hunterResult.status === 'valid' ? 'Válido' : hunterResult.status}</span>
                </span>
              )}
              {hunterResult && hunterResult.status === 'unknown' && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-500/15 text-slate-400 border border-slate-500/30 font-semibold">
                  Hunter: verificação indisponível
                </span>
              )}
            </div>
            
            {isEditing ? (
              <div className="flex flex-col gap-2 mt-1">
                <input
                  type="text"
                  value={dmName}
                  onChange={(e) => setDmName(e.target.value)}
                  placeholder="Nome do Decisor"
                  className={`text-xs font-bold rounded px-2 py-1 border outline-none ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
                <input
                  type="text"
                  value={dmTitle}
                  onChange={(e) => setDmTitle(e.target.value)}
                  placeholder="Cargo do Decisor"
                  className={`text-xs rounded px-2 py-1 border outline-none ${
                    isDark ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-300 text-slate-700'
                  }`}
                />
              </div>
            ) : (
              <p className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {dmName} <span className={`text-xs font-normal ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>({dmTitle})</span>
              </p>
            )}
          </div>
        </div>

        {/* Decision Maker Contact Points */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Email */}
          {isEditing ? (
            <input
              type="email"
              value={dmEmail}
              onChange={(e) => setDmEmail(e.target.value)}
              placeholder="Email do decisor"
              className={`text-xs font-mono rounded px-2 py-1 border outline-none ${
                isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
              }`}
            />
          ) : dmEmail && (
            <span className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 font-mono text-[11px] ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
            }`}>
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>{dmEmail}</span>
            </span>
          )}

          {/* Hunter.io Verification */}
          {dmEmail && !hunterResult && (
            <button
              onClick={handleVerifyEmail}
              disabled={isVerifyingEmail}
              className={`px-2 py-1 text-[10px] font-semibold rounded-lg border flex items-center gap-1 transition ${
                isDark 
                  ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30' 
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-300'
              }`}
              title="Verificar entregabilidade com Hunter.io"
            >
              {isVerifyingEmail ? (
                <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
              ) : (
                <ShieldCheck className="w-3 h-3 text-amber-500" />
              )}
              <span>Verificar Hunter</span>
            </button>
          )}

          {/* Phone */}
          {isEditing ? (
            <input
              type="text"
              value={dmPhone}
              onChange={(e) => setDmPhone(e.target.value)}
              placeholder="Telefone do decisor"
              className={`text-xs font-mono rounded px-2 py-1 border outline-none ${
                isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
              }`}
            />
          ) : dmPhone && (
            <a
              href={`tel:${dmPhone}`}
              className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 font-mono text-[11px] transition ${
                isDark ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-emerald-400' : 'bg-white hover:bg-slate-100 border-slate-200 text-emerald-600'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{dmPhone}</span>
            </a>
          )}

          {!isEditing && dmPhone && (
            <a
              href={toWhatsAppLink(dmPhone)}
              target="_blank"
              rel="noopener noreferrer"
              className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition flex items-center gap-1.5 ${
                isDark
                  ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border-emerald-500/30'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-200'
              }`}
              title={`Abrir conversa no WhatsApp com ${dmName}`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>
          )}

          {!isEditing && dmEmail && (
            <a
              href={`mailto:${dmEmail}`}
              className={`px-2.5 py-1 text-[11px] font-mono font-medium rounded-lg border transition flex items-center gap-1.5 ${
                isDark ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300' : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
              }`}
              title={`Enviar e-mail para ${dmName}`}
            >
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>{dmEmail}</span>
            </a>
          )}

          {/* LinkedIn Decisor */}
          {isEditing ? (
            <input
              type="text"
              value={dmLinkedin}
              onChange={(e) => setDmLinkedin(e.target.value)}
              placeholder="URL do LinkedIn (ex: https://www.linkedin.com/in/...)"
              className={`text-xs font-mono rounded px-2 py-1 border outline-none ${
                isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
              }`}
            />
          ) : dmLinkedin && (
            <a
              href={dmLinkedin.startsWith('http') ? dmLinkedin : `https://${dmLinkedin}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition flex items-center gap-1.5 ${
                isDark 
                  ? 'bg-[#0077b5]/15 hover:bg-[#0077b5]/25 text-[#0077b5] border-[#0077b5]/30' 
                  : 'bg-slate-100 hover:bg-slate-200 text-[#0077b5] border-slate-300'
              }`}
              title={`Abrir perfil de ${dmName} no LinkedIn`}
            >
              <Linkedin className="w-3.5 h-3.5 text-[#0077b5]" />
              <span>Perfil LinkedIn</span>
            </a>
          )}
        </div>
      </div>

      {/* 4. Action Control Bar: "Salvar", "Parar", "Enriquecer +" & Integrations */}
      <div className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
        isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-100/70 border-slate-200'
      }`}>
        <div className="flex items-center gap-2">
          {/* Salvar Button */}
          <button
            onClick={handleSaveLead}
            disabled={isSaving}
            className={`px-3.5 py-1.5 font-bold rounded-lg border flex items-center gap-1.5 transition shadow-sm ${
              saveSuccess
                ? 'bg-emerald-500 text-white border-emerald-600'
                : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border-emerald-500/40'
            }`}
            title="Salvar alterações do lead no SQLite"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : saveSuccess ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{saveSuccess ? 'Salvo no Banco!' : 'Salvar'}</span>
          </button>

          {/* Tone Selector */}
          <div className="flex items-center gap-1.5 border-l border-slate-700/50 pl-2">
            <select
              value={enrichTone}
              onChange={(e) => setEnrichTone(e.target.value)}
              disabled={isEnrichingNews}
              className={`text-[11px] font-semibold rounded-lg px-2 py-1.5 border outline-none transition cursor-pointer ${
                isDark 
                  ? 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500' 
                  : 'bg-white border-slate-300 text-slate-700 hover:border-slate-400'
              }`}
              title="Selecione o tom de voz para a IA gerar as abordagens"
            >
              <option value="consultivo">Tom Consultivo</option>
              <option value="direto">Tom Direto</option>
              <option value="storytelling">Storytelling</option>
              <option value="provocador">Tom Provocador</option>
            </select>
          </div>

          {/* Enriquecer + Button (Second Stage) */}
          <button
            onClick={handleEnrichNews}
            disabled={isEnrichingNews}
            className="px-3.5 py-1.5 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] hover:from-[var(--brand-primary-hover)] hover:to-[var(--brand-primary-hover)] text-white font-bold rounded-lg transition shadow-md shadow-[var(--brand-primary)]/20 flex items-center gap-1.5"
            title="Segunda etapa: buscar notícias públicas na internet e gerar roteiros avançados"
          >
            {isEnrichingNews ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Enriquecendo...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span>Enriquecer +</span>
              </>
            )}
          </button>

          {/* Parar Button (during enrichment) */}
          {isEnrichingNews && (
            <button
              onClick={handleStopEnrich}
              className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/40 font-bold rounded-lg transition flex items-center gap-1"
              title="Cancelar enriquecimento"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Parar</span>
            </button>
          )}

          {/* Toggle Dossier Visibility */}
          {newsDossier && (
            <button
              onClick={() => setIsDossierOpen(!isDossierOpen)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' 
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              <Newspaper className="w-3.5 h-3.5 text-[#008FCE]" />
              <span>Dossiê de Notícias</span>
              {isDossierOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Integration Buttons: Bitrix24 & Bland AI */}
        <div className="flex flex-wrap items-center gap-2">
          
            {/* Fast Script Gen */}
            <button
              onClick={handleFastScript}
              disabled={isFastGenerating}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${
                isDark
                  ? 'bg-gradient-to-r from-[var(--brand-primary)]/20 to-[#008FCE]/20 text-[var(--brand-primary)] border-[var(--brand-primary)]/30 hover:border-[var(--brand-primary)]/50'
                  : 'bg-gradient-to-r from-[var(--brand-primary)]/10 to-[#008FCE]/10 text-[var(--brand-primary)] border-[var(--brand-primary)]/30 hover:border-[var(--brand-primary)]/50'
              }`}
              title="Gerar e copiar script rápido para Cold Call"
            >
              {isFastGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Terminal className="w-3.5 h-3.5" />}
              <span>{isFastGenerating ? 'Gerando...' : 'Gerar Script (Copiar)'}</span>
            </button>

          {/* Bitrix24: botão de envio + status real persistido (Wave 12 - CRM/Operação).
              Nunca fire-and-forget: o resultado da última tentativa fica visível mesmo
              antes de clicar de novo nesta sessão (lead.bitrix_export_status/_error). */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleExportToBitrix}
              disabled={isExportingBitrix}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${
                bitrixResult?.success
                  ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                  : isDark
                    ? 'bg-[var(--brand-primary)]/10 hover:bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] border-[var(--brand-primary)]/30'
                    : 'bg-[var(--brand-primary)]/10 hover:bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border-[var(--brand-primary)]/20'
              }`}
              title="Exportar Lead para o Bitrix24 Total Trac / AtlasGR"
            >
              {isExportingBitrix ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : bitrixResult?.success ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>
                {bitrixResult?.success ? `Bitrix24 (#${bitrixResult.leadId || 'OK'})` : 'Enviar Bitrix24'}
              </span>
            </button>
            {!isExportingBitrix && (
              <BitrixExportStatusBadge
                status={effectiveBitrixStatus}
                error={effectiveBitrixError}
                exportedAt={effectiveBitrixExportedAt}
                theme={theme}
              />
            )}
          </div>

          {/* Wave 6 (CPI) - Evidence & Provenance: "por que confiar neste
              resultado?" por campo (provedor, confiança, status de verificação). */}
          <button
            onClick={() => setIsEvidenceOpen(true)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
            }`}
            title="Ver evidências: de onde cada campo veio, quando e com que confiança"
          >
            <FileSearch className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
            <span>Ver Evidências</span>
          </button>

          {/* Bland AI */}
          <button
            onClick={handleCallViaBland}
            disabled={isCallingBland}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${
              blandResult?.success
                ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                : isDark
                  ? 'bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border-purple-500/30'
                  : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'
            }`}
            title="Iniciar ligação robótica conversacional via Bland AI"
          >
            {isCallingBland ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : blandResult?.success ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <PhoneCall className="w-3.5 h-3.5" />
            )}
            <span>
              {blandResult?.success ? 'Ligação Bland AI Ativa' : 'Ligar via Bland AI'}
            </span>
          </button>
        </div>
      </div>

      {/* 5. Second Stage: News & Public Intelligence Dossier (If Available / Expanded) */}
      {newsDossier && isDossierOpen && (
        <div className={`p-4 rounded-xl border space-y-3.5 animate-fadeIn ${
          isDark ? 'bg-slate-950/80 border-[#008FCE]/30' : 'bg-slate-100/50 border-slate-300'
        }`}>
          <div className="flex items-center justify-between border-b pb-2.5">
            <div className="flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-[#008FCE]" />
              <h4 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-[#93DBF2]' : 'text-[#374898]'}`}>
                Dossiê de Fontes Públicas & Notícias na Internet
              </h4>
            </div>
            <span className="text-[10px] text-slate-400">
              Enriquecido via IA + Fontes Corporativas
            </span>
          </div>

          {/* Company Summary & Risk Context */}
          {newsDossier.company_summary && (
            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <strong>Resumo Corporativo:</strong> {newsDossier.company_summary}
            </p>
          )}

          {/* Key Facts / Triggers */}
          {newsDossier.key_facts && newsDossier.key_facts.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-[var(--brand-primary)] uppercase tracking-wider block">
                Fatos Relevantes & Gatilhos de Contato:
              </span>
              <ul className="grid grid-cols-1 gap-2">
                {newsDossier.key_facts.map((fact: string, i: number) => (
                  <li key={i} className={`p-2 rounded-lg border text-xs flex items-start gap-1.5 ${
                    isDark ? 'bg-slate-900/60 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                  }`}>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{fact}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recent News Items */}
          {newsDossier.recent_news && newsDossier.recent_news.length > 0 && (
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-bold text-[#008FCE] uppercase tracking-wider block">
                Últimas Notícias Identificadas na Mídia:
              </span>
              <div className="space-y-2">
                {newsDossier.recent_news.map((item: any, i: number) => (
                  <div key={i} className={`p-3 rounded-lg border ${
                    isDark ? 'bg-slate-900/40 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                  }`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-white">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {item.source} • {item.date}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {item.summary}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. Outreach Copy & Scripts (On-Demand Generation OR Full Channel Viewer) */}
      {!hasCopies ? (
        <div className={`p-5 rounded-xl border space-y-4 transition ${
          isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex flex-col justify-between gap-3 border-b pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[var(--brand-primary)]" />
                <h4 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Roteiros Comerciais & Copys com IA (Sob Demanda)
                </h4>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                A geração de scripts de abordagem é acionada apenas quando você desejar prospectar este lead.
              </p>
            </div>

            {/* Tone Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-400">Tom de Voz:</span>
              <select
                value={enrichTone}
                onChange={(e) => setEnrichTone(e.target.value)}
                disabled={isGeneratingCopies || isEnrichingNews}
                className={`text-xs font-semibold rounded-lg px-2.5 py-1.5 border outline-none transition cursor-pointer ${
                  isDark 
                    ? 'bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-500' 
                    : 'bg-white border-slate-300 text-slate-700 hover:border-slate-400'
                }`}
              >
                <option value="consultivo">Tom Consultivo (Recomendado)</option>
                <option value="direto">Tom Direto & Objetivo</option>
                <option value="storytelling">Storytelling & Riscos</option>
                <option value="provocador">Tom Provocador / Eficiência</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col items-start justify-between gap-3 pt-1">
            <div className="text-xs text-slate-400">
              Gera roteiros, matriz de objeções, perguntas de qualificação e ator quebra-gelo para: <strong>Cold Call</strong>, <strong>Cold Email</strong>, <strong>WhatsApp</strong> e <strong>LinkedIn</strong> adaptadas para <strong>{dmName}</strong> ({dmTitle}).
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleGenerateCopies}
                disabled={isGeneratingCopies || isEnrichingNews}
                className="px-5 py-2.5 bg-gradient-to-r from-[var(--brand-primary)] to-[#FF7010] hover:from-[var(--brand-secondary-hover)] hover:to-[var(--brand-secondary)] text-white font-bold text-xs rounded-xl transition shadow-md shadow-[var(--brand-primary)]/25 flex items-center gap-2"
              >
                {isGeneratingCopies ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Gerando Copys com IA...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-current" />
                    <span>Gerar Roteiros com IA</span>
                  </>
                )}
              </button>

              <button
                onClick={handleEnrichNews}
                disabled={isEnrichingNews || isGeneratingCopies}
                className="px-4 py-2.5 bg-[#008FCE]/20 hover:bg-[#008FCE]/30 text-[#008FCE] border border-[#008FCE]/40 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                title="Buscar notícias públicas na internet e gerar dossiê + roteiros"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Enriquecer + Notícias</span>
              </button>
            </div>
          </div>

          {copiesGenMsg && (
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
              <Check className="w-4 h-4" />
              <span>{copiesGenMsg}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className={`flex flex-wrap items-center justify-between gap-2 border-b pb-2 ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}>
            <div className="flex gap-1.5 overflow-x-auto">
              <button
                onClick={() => setActiveChannel('cold_call')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeChannel === 'cold_call'
                    ? 'bg-[var(--brand-primary)] text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Cold Call</span>
              </button>
              <button
                onClick={() => setActiveChannel('cold_email')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeChannel === 'cold_email'
                    ? 'bg-[var(--brand-primary)] text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Cold Email</span>
              </button>
              <button
                onClick={() => setActiveChannel('whatsapp')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeChannel === 'whatsapp'
                    ? 'bg-[var(--brand-primary)] text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
              <button
                onClick={() => setActiveChannel('linkedin')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeChannel === 'linkedin'
                    ? 'bg-[var(--brand-primary)] text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Linkedin className="w-3.5 h-3.5" />
                <span>LinkedIn</span>
              </button>
              <button
                onClick={() => setActiveChannel('objection_matrix')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeChannel === 'objection_matrix'
                    ? 'bg-[var(--brand-primary)] text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Matriz de Objeção</span>
              </button>
              <button
                onClick={() => setActiveChannel('qualification_matrix')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeChannel === 'qualification_matrix'
                    ? 'bg-[var(--brand-primary)] text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <ListChecks className="w-3.5 h-3.5" />
                <span>Qualificação</span>
              </button>
              <button
                onClick={() => setActiveChannel('ice_breaker')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeChannel === 'ice_breaker'
                    ? 'bg-[var(--brand-primary)] text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span>Quebra-Gelo</span>
              </button>
              <button
                onClick={() => setActiveChannel('prompt')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeChannel === 'prompt'
                    ? 'bg-[var(--brand-primary)] text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Terminal className="w-3.5 h-3.5 text-[#93DBF2]" />
                <span>Prompt Base</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Tone Selection & Regenerate */}
              <div className="flex items-center gap-1.5">
                <select
                  value={enrichTone}
                  onChange={(e) => setEnrichTone(e.target.value)}
                  disabled={isGeneratingCopies}
                  className={`text-[11px] font-semibold rounded-lg px-2 py-1 border outline-none ${
                    isDark ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-300 text-slate-700'
                  }`}
                  title="Tom da abordagem"
                >
                  <option value="consultivo">Tom Consultivo</option>
                  <option value="direto">Tom Direto</option>
                  <option value="storytelling">Storytelling</option>
                  <option value="provocador">Provocador</option>
                </select>

                <button
                  onClick={handleGenerateCopies}
                  disabled={isGeneratingCopies}
                  className="px-2.5 py-1 bg-[var(--brand-primary)]/15 hover:bg-[var(--brand-primary)]/25 text-[var(--brand-primary)] border border-[var(--brand-primary)]/30 text-xs font-semibold rounded-lg flex items-center gap-1 transition"
                  title="Regenerar roteiros com o tom selecionado"
                >
                  {isGeneratingCopies ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  <span>Regenerar</span>
                </button>
              </div>

              {/* Status selector */}
              <select
                value={msgStatus}
                onChange={(e) => setMsgStatus(e.target.value)}
                className={`border rounded-lg px-2 py-1 text-[11px] outline-none ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <option value="draft">Rascunho (Draft)</option>
                <option value="reviewed">Revisado (Reviewed)</option>
                <option value="sent">Enviado (Sent)</option>
                <option value="archived">Arquivado</option>
              </select>

              {/* Edit / Save Toggle */}
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`px-2.5 py-1 text-xs rounded-lg border flex items-center gap-1 transition ${
                  isDark 
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
              >
                <Edit3 className="w-3 h-3 text-slate-400" />
                <span>{isEditing ? 'Concluir' : 'Editar'}</span>
              </button>

              {/* Copy Button */}
              <button
                onClick={() => {
                  const textToCopy = activeChannel === 'prompt'
                    ? `Atue como executivo de inteligência e segurança logística da Atlas. Apresente soluções de gestão de risco rodoviário para ${dmName} (${dmTitle}) da empresa ${leadName}.`
                    : copies[activeChannel as keyof typeof copies] || '';
                  handleCopy(activeChannel, textToCopy);
                }}
                className="px-3 py-1 bg-[var(--brand-primary)]/15 hover:bg-[var(--brand-primary)]/25 text-[var(--brand-primary)] border border-[var(--brand-primary)]/30 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
              >
                {copiedChannel === activeChannel ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-500">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Content Box */}
          <div className={`rounded-xl p-4 border relative ${
            isDark ? 'bg-slate-950 border-slate-800/90' : 'bg-slate-50 border-slate-200'
          }`}>
            {activeChannel === 'prompt' ? (
              <pre className={`text-xs font-mono whitespace-pre-wrap leading-relaxed select-text ${
                isDark ? 'text-[#93DBF2]' : 'text-[#374898]'
              }`}>
{`[PROMPT DO AGENTE / MOTOR DE ENRIQUECIMENTO ATLAS]
Empresa Alvo: ${leadName}
CNPJ: ${leadCnpj || 'Consulte na base'}
Razão Social: ${razaoSocial}
CNAE: ${cnaeFiscal} - ${cnaeDescricao}
Segmento: ${lead.segment || 'Transporte e Logística'}
Localização: ${leadAddress}
Decisor: ${dmName} (${dmTitle})
Email Decisor: ${dmEmail} | Telefone: ${dmPhone}
Proposta de Valor Atlas: ${pitch || 'A Atlas conecta pessoas e tecnologia gerando valores com segurança e inteligência logística.'}

Objetivo: Conduzir abordagem comercial altamente personalizada de alto nível executivo para agendamento de reunião estratégica de 15 minutos com consultor sênior da Atlas.`}
              </pre>
            ) : isEditing ? (
              <textarea
                rows={6}
                value={copies[activeChannel as keyof typeof copies] || ''}
                onChange={(e) => setCopies({ ...copies, [activeChannel]: e.target.value })}
                className={`w-full bg-transparent text-xs font-sans outline-none resize-none leading-relaxed ${
                  isDark ? 'text-slate-200' : 'text-slate-800'
                }`}
              />
            ) : (
              <pre className={`text-xs font-sans whitespace-pre-wrap leading-relaxed select-text ${
                isDark ? 'text-slate-200' : 'text-slate-800'
              }`}>
                {copies[activeChannel as keyof typeof copies] || 'Nenhuma informação gerada para esta aba ainda. Clique em "Gerar Roteiros com IA" acima para criar as mensagens, matrizes e o quebra-gelo.'}
              </pre>
            )}

            {copies.followup_strategy && (
              <div className={`mt-3 pt-3 border-t flex items-center gap-2 text-[11px] ${
                isDark ? 'border-slate-800/60 text-slate-400' : 'border-slate-200 text-slate-600'
              }`}>
                <Sparkles className="w-3.5 h-3.5 text-[#FFC500] shrink-0" />
                <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Estratégia de Follow-up:</span>
                <span>{copies.followup_strategy}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tarefas do lead: agendamento manual (ligar de volta, enviar proposta...),
          diferente da "Próxima ação" (que é só a recomendação automática do sistema). */}
      {isUserView && (
        <div className={`mt-4 p-4 rounded-xl border ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <h4 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <ListChecks className="w-4 h-4 text-[var(--brand-primary)]" />
            Tarefas do Lead
          </h4>

          {isLoadingTasks ? (
            <div className="flex justify-center py-3">
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            </div>
          ) : tasks.length === 0 ? (
            <p className={`text-xs mb-3 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              Nenhuma tarefa criada para este lead ainda.
            </p>
          ) : (
            <ul className="space-y-1.5 mb-3">
              {tasks.filter(t => t.status !== 'cancelled').map(task => {
                const isDone = task.status === 'done';
                const isOverdue = !isDone && !!task.due_date && new Date(`${task.due_date}T00:00:00`) < new Date(new Date().toDateString());
                return (
                  <li
                    key={task.id}
                    className={`flex items-start gap-2 text-xs p-2 rounded-lg border ${
                      isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleTaskStatus(task)}
                      className="mt-0.5 shrink-0"
                      title={isDone ? 'Marcar como pendente' : 'Marcar como concluída'}
                    >
                      {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-slate-400" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={isDone ? 'line-through text-slate-500' : (isDark ? 'text-slate-200' : 'text-slate-800')}>
                        {task.description}
                      </p>
                      {task.due_date && (
                        <p className={`mt-0.5 flex items-center gap-1 ${
                          isOverdue ? 'text-red-500 font-semibold' : (isDark ? 'text-slate-500' : 'text-slate-500')
                        }`}>
                          <Calendar className="w-3 h-3" />
                          {new Date(`${task.due_date}T00:00:00`).toLocaleDateString('pt-BR')}
                          {isOverdue && ' · Atrasada'}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {taskError && <p className="text-xs text-red-500 mb-2">{taskError}</p>}

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newTaskDescription}
              onChange={e => setNewTaskDescription(e.target.value)}
              placeholder="Ex: Ligar de volta, enviar proposta..."
              className={`flex-1 text-xs p-2 rounded border outline-none transition-colors ${
                isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
              } focus:border-[var(--brand-primary)]`}
            />
            <input
              type="date"
              value={newTaskDueDate}
              onChange={e => setNewTaskDueDate(e.target.value)}
              className={`text-xs p-2 rounded border outline-none transition-colors ${
                isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
              } focus:border-[var(--brand-primary)]`}
            />
            <button
              type="button"
              onClick={handleAddTask}
              disabled={isSavingTask || !newTaskDescription.trim()}
              className="px-3 py-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition disabled:opacity-50 shrink-0"
            >
              {isSavingTask ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Nova Tarefa
            </button>
          </div>
        </div>
      )}

      {/* BITRIX STYLE ACTIVITY FORM (Only for users) */}
      {isUserView && (
        <div className={`mt-4 p-4 rounded-xl border ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <h4 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Registro de Atividade (CRM)
          </h4>
          <div className="space-y-3">
            <div>
              <label className={`block text-xs mb-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Contexto da Atividade (O que foi tratado?)</label>
              <textarea
                rows={2}
                value={activityContext}
                onChange={e => setActivityContext(e.target.value)}
                placeholder="Ex: Ligação feita para apresentação da empresa."
                className={`w-full text-xs p-2 rounded border outline-none resize-none transition-colors ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                } focus:border-[var(--brand-primary)]`}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={`block text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Observação da Atividade (Próximos passos? Objeções?)</label>
                <button
                  onClick={toggleRecording}
                  title={isRecording ? "Parar gravação" : "Ditar com LLaMA3"}
                  className={`p-1.5 rounded-full transition-colors flex items-center justify-center ${isRecording ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30 animate-pulse' : 'bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'}`}
                >
                  {isRecording ? <Square className="w-3.5 h-3.5 fill-current" /> : <Mic className="w-3.5 h-3.5" />}
                </button>
              </div>
              <textarea

                rows={3}
                value={activityNotes}
                onChange={e => setActivityNotes(e.target.value)}
                placeholder="Ex: Cliente pediu retorno amanhã às 14h, não atende no momento."
                className={`w-full text-xs p-2 rounded border outline-none resize-none transition-colors ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                } focus:border-[var(--brand-primary)]`}
              />
            </div>
            <div className="flex justify-end pt-1">
              <button
                onClick={handleSaveLead}
                disabled={isSaving}
                className="px-4 py-1.5 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {saveSuccess ? 'Salvo!' : 'Salvar Registro'}
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}

      {/* Wave 6 (CPI) - Evidence & Provenance: modal sob demanda, busca só ao abrir. */}
      <LeadEvidenceModal
        leadId={lead.id}
        leadName={leadName}
        isOpen={isEvidenceOpen}
        onClose={() => setIsEvidenceOpen(false)}
        theme={theme}
      />
    </div>
  );
};
