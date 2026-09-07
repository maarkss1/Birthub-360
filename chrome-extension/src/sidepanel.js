import { copilotoApi, googleApi, getApiBaseUrl, setApiBaseUrl, ApiError } from './api.js';

const statusEl = document.getElementById('status');
const errorBannerEl = document.getElementById('errorBanner');
const meetTitleEl = document.getElementById('meetTitle');
const meetUrlEl = document.getElementById('meetUrl');
const leadIdEl = document.getElementById('leadId');
const leadSearchResultsEl = document.getElementById('leadSearchResults');
const linkLeadEl = document.getElementById('linkLead');
const skipLeadEl = document.getElementById('skipLead');
const consentCardEl = document.getElementById('consentCard');
const consentEl = document.getElementById('consent');
const registerConsentEl = document.getElementById('registerConsent');
const captureCardEl = document.getElementById('captureCard');
const toggleCaptureEl = document.getElementById('toggleCapture');
const apiBaseUrlEl = document.getElementById('apiBaseUrl');
const saveApiBaseUrlEl = document.getElementById('saveApiBaseUrl');
const apiBaseUrlHintEl = document.getElementById('apiBaseUrlHint');
const calendarSuggestionCardEl = document.getElementById('calendarSuggestionCard');
const calendarSuggestionTextEl = document.getElementById('calendarSuggestionText');
const useCalendarSuggestionEl = document.getElementById('useCalendarSuggestion');
const aiCardEl = document.getElementById('aiCard');
const aiStatusTextEl = document.getElementById('aiStatusText');
const aiSummaryEl = document.getElementById('aiSummary');
const aiSummaryTextEl = document.getElementById('aiSummaryText');
const aiSentimentEl = document.getElementById('aiSentiment');
const aiSuggestionsEl = document.getElementById('aiSuggestions');
const refreshAiEl = document.getElementById('refreshAi');

/** @type {number|null} */
let activeTabId = null;
let meetContext = null;
/** Estado local espelhando `CopilotoConversation` — sempre re-sincronizado a partir da resposta
 * do backend após cada ação, nunca inferido/adivinhado no cliente. */
let conversation = null;
/** Lead escolhido na lista de busca por nome (`GET /leads/search`) — distinto do texto livre em
 * `leadIdEl`, porque o título de um Lead não é um id/e-mail/URL válido para `lookupLead` resolver
 * sozinho. Zerado sempre que o usuário volta a editar o campo, pra nunca vincular um Lead que não
 * corresponde mais ao texto digitado. */
let selectedLead = null;
let leadSearchRequestId = 0;
/** Sugestão de Lead vinda do Google Calendar (Onda 7) — só preenche o campo quando o usuário
 * clica em "Usar este Lead sugerido", nunca vincula sozinha. Zerada a cada troca de aba/Meet. */
let calendarSuggestedLead = null;
let calendarSuggestionRequestId = 0;
/** Último `meetingCode` para o qual já tentamos a sugestão do Calendar — evita repetir a chamada
 * a cada poll de 1.5s de `refreshMeetContext` (só tenta de novo quando o Meet muda). */
let calendarSuggestionMeetingCode = null;
/** Última conversa (id) para a qual já carregamos o handoff — evita repetir `getHandoff` a cada
 * poll enquanto o usuário não pede explicitamente ("Atualizar sugestões"). */
let handoffLoadedForConversationId = null;
/** Vista agregada (resumo/sugestões) da conversa atual — carregada só quando `status === 'READY'`. */
let handoff = null;

function clearLeadSearchResults() {
  leadSearchResultsEl.hidden = true;
  leadSearchResultsEl.innerHTML = '';
}

function renderLeadSearchResults(leads) {
  leadSearchResultsEl.innerHTML = '';
  if (!leads.length) {
    leadSearchResultsEl.hidden = true;
    return;
  }
  for (const lead of leads) {
    const li = document.createElement('li');
    const strong = document.createElement('strong');
    strong.textContent = lead.title || lead.companyName || lead.contactName || lead.id;
    const span = document.createElement('span');
    span.textContent = [lead.companyName, lead.contactName].filter(Boolean).join(' · ');
    li.append(strong, span);
    li.addEventListener('click', () => {
      selectedLead = lead;
      leadIdEl.value = lead.title || lead.companyName || lead.id;
      clearLeadSearchResults();
    });
    leadSearchResultsEl.append(li);
  }
  leadSearchResultsEl.hidden = false;
}

// Heurística de classificação usada só pra decidir SE busca por nome — a classificação real de
// e-mail/URL do Bitrix/id (que decide COMO resolver) é feita no backend (`parseLeadLookupQuery`);
// aqui só evita chamar `/leads/search` para algo que claramente não é um nome.
function looksLikeNameQuery(query) {
  return query.length >= 2 && !query.includes('@') && !/bitrix24\./i.test(query);
}

let leadSearchDebounce = null;
leadIdEl.addEventListener('input', () => {
  selectedLead = null;
  clearTimeout(leadSearchDebounce);
  const query = leadIdEl.value.trim();
  if (!looksLikeNameQuery(query)) {
    clearLeadSearchResults();
    return;
  }
  const requestId = ++leadSearchRequestId;
  leadSearchDebounce = setTimeout(async () => {
    try {
      const leads = await copilotoApi.searchLeads(query);
      // Ignora resposta atrasada de uma busca antiga (usuário já digitou algo mais recente).
      if (requestId !== leadSearchRequestId) return;
      renderLeadSearchResults(leads || []);
    } catch {
      // Falha de busca-enquanto-digita não deve travar o fluxo — o usuário ainda pode colar
      // e-mail/URL/id e clicar em "Vincular" normalmente.
      if (requestId === leadSearchRequestId) clearLeadSearchResults();
    }
  }, 350);
});

function clearCalendarSuggestion() {
  calendarSuggestedLead = null;
  calendarSuggestionCardEl.hidden = true;
  calendarSuggestionTextEl.textContent = '';
}

/**
 * Onda 7 ("calendário"): tenta achar, na agenda Google conectada da organização
 * (`GET /api/google/calendar/upcoming`), o evento cujo `hangoutLink` é este mesmo Meet — e, se
 * achar, tenta resolver um Lead pelo e-mail de algum convidado (`leads/lookup`). Só OFERECE a
 * sugestão (o usuário ainda precisa clicar em "Usar este Lead sugerido" e depois em "Vincular");
 * nunca vincula sozinha. A conexão Google é ÚNICA por organização (não por vendedor — ver
 * `GoogleWorkspaceConnection` no schema), então isto só funciona quando a conta conectada está
 * convidada nesta reunião. Qualquer falha (Google não configurado/conectado, sessão expirada,
 * rede) é silenciosa — é um atalho a mais, nunca um requisito do fluxo manual já existente.
 */
async function tryCalendarSuggestion() {
  clearCalendarSuggestion();
  if (!meetContext?.meetingCode || conversation) return;
  const requestId = ++calendarSuggestionRequestId;
  const meetingCode = meetContext.meetingCode;

  let events;
  try {
    events = await googleApi.getUpcomingCalendarEvents();
  } catch {
    return;
  }
  if (requestId !== calendarSuggestionRequestId || conversation) return;

  const matchingEvent = (events || []).find(
    (event) => typeof event.hangoutLink === 'string' && event.hangoutLink.includes(meetingCode),
  );
  if (!matchingEvent) return;

  for (const email of matchingEvent.attendees || []) {
    let lead;
    try {
      lead = await copilotoApi.lookupLead(email);
    } catch {
      continue;
    }
    if (requestId !== calendarSuggestionRequestId || conversation) return;
    if (lead) {
      calendarSuggestedLead = lead;
      calendarSuggestionTextEl.textContent = `${lead.title || lead.companyName || lead.contactName || lead.id} — encontrado pelo convidado ${email} no evento "${matchingEvent.summary}".`;
      calendarSuggestionCardEl.hidden = false;
      return;
    }
  }
}

function showError(message) {
  errorBannerEl.textContent = message;
  errorBannerEl.hidden = false;
}

function clearError() {
  errorBannerEl.hidden = true;
  errorBannerEl.textContent = '';
}

async function withErrorHandling(fn) {
  clearError();
  try {
    await fn();
  } catch (err) {
    showError(err instanceof ApiError ? err.message : String(err?.message || err));
  }
}

async function conversationStorageKey() {
  return `conversation:${activeTabId}`;
}

async function loadConversationForTab() {
  if (activeTabId == null) return;
  const key = await conversationStorageKey();
  const stored = await chrome.storage.session.get(key);
  conversation = stored[key] || null;
}

async function saveConversationForTab() {
  if (activeTabId == null) return;
  const key = await conversationStorageKey();
  if (conversation) {
    await chrome.storage.session.set({ [key]: conversation });
  } else {
    await chrome.storage.session.remove(key);
  }
}

function notifyCaptureState(capturing) {
  if (activeTabId == null) return;
  chrome.runtime.sendMessage({ type: 'ATLAS_SET_CAPTURE_STATE', tabId: activeTabId, capturing }).catch(() => {});
}

function render() {
  // Status
  statusEl.className = 'pill';
  if (!meetContext) {
    statusEl.textContent = 'Aguardando';
  } else if (!conversation) {
    statusEl.textContent = 'Meet detectado';
  } else if (conversation.status === 'CAPTURING') {
    statusEl.textContent = 'Capturando';
    statusEl.classList.add('capturing');
  } else {
    statusEl.textContent = conversation.status;
    if (conversation.consentStatus === 'GRANTED') statusEl.classList.add('granted');
  }

  // Meet card
  if (meetContext) {
    meetTitleEl.textContent = meetContext.title || 'Google Meet';
    meetUrlEl.textContent = meetContext.meetingCode
      ? `Código da reunião: ${meetContext.meetingCode}`
      : meetContext.url || '';
  } else {
    meetTitleEl.textContent = 'Nenhuma reunião detectada. Abra uma chamada em meet.google.com.';
    meetUrlEl.textContent = '';
  }

  // CRM/link card
  linkLeadEl.disabled = !meetContext || !!conversation;
  linkLeadEl.textContent = conversation ? 'Reunião já vinculada' : 'Vincular reunião a este Lead';
  leadIdEl.disabled = !!conversation;
  skipLeadEl.disabled = !meetContext || !!conversation;
  skipLeadEl.textContent = conversation
    ? 'Sessão já iniciada'
    : 'Capturar sem vincular a um Lead';

  // Consent card
  const hasConversation = !!conversation;
  consentCardEl.hidden = !hasConversation;
  if (hasConversation) {
    const granted = conversation.consentStatus === 'GRANTED';
    consentEl.checked = granted;
    consentEl.disabled = granted;
    registerConsentEl.disabled = granted || !consentEl.checked;
    registerConsentEl.textContent = granted ? 'Consentimento registrado' : 'Registrar consentimento';
  }

  // Capture card
  captureCardEl.hidden = !hasConversation;
  if (hasConversation) {
    const canStart = conversation.status === 'SCHEDULED' && conversation.consentStatus === 'GRANTED';
    const isCapturing = conversation.status === 'CAPTURING';
    toggleCaptureEl.disabled = !(canStart || isCapturing);
    toggleCaptureEl.textContent = isCapturing ? 'Parar sessão de captura' : 'Iniciar sessão de captura';
    toggleCaptureEl.className = isCapturing ? 'danger' : '';
  }

  // Sugestão do Calendar só faz sentido antes de vincular a reunião a um Lead.
  if (hasConversation) clearCalendarSuggestion();

  // IA/writeback card — só quando a transcrição+resumo já terminaram (AGENT_04: "exibir sugestões
  // da IA"/"confirmar/editar/descartar writebacks" direto na extensão).
  aiCardEl.hidden = !hasConversation || conversation.status !== 'READY';
  if (hasConversation && conversation.status === 'READY' && conversation.id !== handoffLoadedForConversationId) {
    handoffLoadedForConversationId = conversation.id;
    loadHandoff();
  }
}

async function refreshMeetContext() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  const tabId = tab?.id ?? null;

  if (tabId !== activeTabId) {
    activeTabId = tabId;
    await loadConversationForTab();
  }

  if (activeTabId == null || !tab.url?.startsWith('https://meet.google.com/')) {
    meetContext = null;
    render();
    return;
  }

  const key = `meetContext:${activeTabId}`;
  const stored = await chrome.storage.session.get(key);
  meetContext = stored[key] || null;
  render();

  if (!meetContext?.meetingCode) {
    calendarSuggestionMeetingCode = null;
  } else if (meetContext.meetingCode !== calendarSuggestionMeetingCode && !conversation) {
    calendarSuggestionMeetingCode = meetContext.meetingCode;
    tryCalendarSuggestion();
  }
}

/** Cria a conversa no backend e sincroniza o estado local — usado tanto vinculado a um Lead
 * quanto sem vínculo nenhum (o backend aceita `leadId` opcional; ver CopilotoIaUseCases). */
async function startConversation(extra) {
  if (!meetContext) throw new Error('Nenhuma reunião do Meet detectada nesta aba.');
  const created = await copilotoApi.createConversation({
    source: 'MEET',
    title: meetContext.title,
    externalMeetingId: meetContext.meetingCode || undefined,
    ...extra,
  });
  conversation = {
    id: created.id,
    status: created.status,
    consentStatus: created.consentStatus,
  };
  await saveConversationForTab();
  render();
}

linkLeadEl.addEventListener('click', () =>
  withErrorHandling(async () => {
    const query = leadIdEl.value.trim();
    if (!query) throw new Error('Informe o nome, e-mail, o link do Bitrix24 ou o id do Lead antes de vincular.');
    // Lead escolhido na lista de busca por nome já traz o id — não faz sentido mandar o título de
    // volta pro backend tentar (de novo) classificar como e-mail/URL/id cru.
    if (selectedLead && leadIdEl.value.trim() === (selectedLead.title || selectedLead.companyName || selectedLead.id)) {
      await startConversation({ leadId: selectedLead.id });
      return;
    }
    // O backend aceita as três formas (e-mail do contato, URL de lead/negócio do Bitrix24, ou id
    // cru da Central) e resolve pra um leadId — a extensão nunca precisa saber qual das três é.
    const lead = await copilotoApi.lookupLead(query);
    if (!lead) {
      throw new Error(
        'Nenhum Lead encontrado para isso na Central Atlas GR. Confira o nome/e-mail/link/id, ou use "Capturar sem vincular a um Lead".',
      );
    }
    await startConversation({ leadId: lead.id });
  }),
);

skipLeadEl.addEventListener('click', () =>
  withErrorHandling(async () => {
    // Sem leadId: Deal Health Score, forecast e sugestão de campo de CRM não se aplicam (dependem
    // de uma oportunidade) — a conversa ainda é transcrita e resumida normalmente.
    await startConversation({});
  }),
);

useCalendarSuggestionEl.addEventListener('click', () => {
  if (!calendarSuggestedLead) return;
  selectedLead = calendarSuggestedLead;
  leadIdEl.value =
    calendarSuggestedLead.title || calendarSuggestedLead.companyName || calendarSuggestedLead.id;
  clearLeadSearchResults();
});

consentEl.addEventListener('change', () => {
  registerConsentEl.disabled = !consentEl.checked;
});

registerConsentEl.addEventListener('click', () =>
  withErrorHandling(async () => {
    if (!conversation) throw new Error('Vincule a reunião a um Lead antes de registrar consentimento.');
    await copilotoApi.recordConsent(conversation.id, {
      method: 'meet_banner',
      textVersion: 'v1',
      granted: true,
    });
    conversation.consentStatus = 'GRANTED';
    await saveConversationForTab();
    render();
  }),
);

toggleCaptureEl.addEventListener('click', () =>
  withErrorHandling(async () => {
    if (!conversation) return;

    if (conversation.status === 'CAPTURING') {
      toggleCaptureEl.disabled = true;
      toggleCaptureEl.textContent = 'Enviando gravação...';
      // Para a gravação local e sobe o áudio ANTES de fechar a sessão no backend — se o upload
      // falhar, o usuário vê o erro com a conversa ainda em CAPTURING, em vez de já ter avançado
      // pra PROCESSING sem áudio nenhum associado.
      const stopResult = await chrome.runtime.sendMessage({ type: 'ATLAS_STOP_RECORDING' });
      if (!stopResult?.ok) {
        throw new Error(stopResult?.error || 'Falha ao enviar a gravação para o backend.');
      }
      const updated = await copilotoApi.stopCapture(conversation.id);
      conversation.status = updated.status;
      notifyCaptureState(false);
    } else {
      const updated = await copilotoApi.startCapture(conversation.id);
      conversation.status = updated.status;
      const startResult = await chrome.runtime.sendMessage({
        type: 'ATLAS_START_RECORDING',
        tabId: activeTabId,
        conversationId: conversation.id,
      });
      if (!startResult?.ok) {
        // Sem gravação real rodando, a conversa não deveria continuar "CAPTURING" no backend —
        // reverte pra PROCESSING (o worker de transcrição pula sozinho, sem áudio associado).
        await copilotoApi.stopCapture(conversation.id).catch(() => {});
        conversation.status = 'PROCESSING';
        throw new Error(startResult?.error || 'Falha ao iniciar a gravação de áudio da aba.');
      }
      notifyCaptureState(true);
    }
    await saveConversationForTab();
    render();
  }),
);

const SUGGESTION_STATUS_LABEL = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovada',
  REJECTED: 'Rejeitada',
  WRITTEN_BACK: 'Enviada ao Bitrix24',
  FAILED: 'Falhou',
};

function renderHandoff() {
  if (!handoff) {
    aiStatusTextEl.textContent = 'Carregando resumo e sugestões...';
    aiSummaryEl.hidden = true;
    aiSuggestionsEl.innerHTML = '';
    return;
  }

  if (!handoff.isComplete) {
    aiStatusTextEl.textContent = `Processamento ainda incompleto: ${handoff.missingParts.join(', ')}.`;
  } else {
    aiStatusTextEl.textContent = '';
  }

  if (handoff.summary) {
    aiSummaryTextEl.textContent = handoff.summary.executiveSummary;
    aiSentimentEl.textContent = handoff.summary.sentimentScore;
    aiSummaryEl.hidden = false;
  } else {
    aiSummaryEl.hidden = true;
  }

  const suggestions = handoff.conversation?.crmFieldSuggestions || [];
  aiSuggestionsEl.innerHTML = '';
  for (const suggestion of suggestions) {
    const li = document.createElement('li');
    li.className = 'ai-suggestion';

    const header = document.createElement('div');
    header.className = 'ai-suggestion-header';
    const fieldSpan = document.createElement('span');
    fieldSpan.className = 'ai-suggestion-field';
    fieldSpan.textContent = suggestion.fieldCode;
    const statusSpan = document.createElement('span');
    statusSpan.className = `status-badge ${suggestion.status}`;
    statusSpan.textContent = SUGGESTION_STATUS_LABEL[suggestion.status] || suggestion.status;
    header.append(fieldSpan, statusSpan);

    const diff = document.createElement('p');
    diff.className = 'ai-suggestion-diff';
    const oldSpan = document.createElement('span');
    oldSpan.className = 'old';
    oldSpan.textContent = suggestion.previousValue || '(vazio)';
    diff.append(oldSpan, ' → ', suggestion.suggestedValue);

    li.append(header, diff);

    if (suggestion.writebackError) {
      const errorP = document.createElement('p');
      errorP.className = 'ai-suggestion-error';
      errorP.textContent = suggestion.writebackError;
      li.append(errorP);
    }

    const actions = document.createElement('div');
    actions.className = 'ai-suggestion-actions';
    if (suggestion.status === 'PENDING') {
      actions.append(
        createSuggestionActionButton('Aprovar', () => handleSuggestionAction('approve', suggestion.id)),
        createSuggestionActionButton('Rejeitar', () => handleSuggestionAction('reject', suggestion.id)),
      );
    } else if (suggestion.status === 'APPROVED' || suggestion.status === 'FAILED') {
      // A extensão não sabe o role do usuário logado — o botão sempre aparece, e o backend
      // responde 403 explícito (ADMIN/GESTOR apenas) se não tiver permissão, tratado como
      // qualquer outro ApiError (mesmo raciocínio de "nunca falha silenciosamente").
      actions.append(
        createSuggestionActionButton('Enviar ao Bitrix24', () =>
          handleSuggestionAction('writeback', suggestion.id),
        ),
      );
    }
    if (actions.childElementCount > 0) li.append(actions);

    aiSuggestionsEl.append(li);
  }
}

function createSuggestionActionButton(label, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'secondary';
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

async function handleSuggestionAction(action, suggestionId) {
  await withErrorHandling(async () => {
    if (action === 'approve') await copilotoApi.approveSuggestion(suggestionId);
    if (action === 'reject') await copilotoApi.rejectSuggestion(suggestionId);
    if (action === 'writeback') await copilotoApi.writebackSuggestion(suggestionId);
    await loadHandoff();
  });
}

async function loadHandoff() {
  if (!conversation) return;
  const conversationId = conversation.id;
  try {
    handoff = await copilotoApi.getHandoff(conversationId);
  } catch (err) {
    // Falha ao buscar o handoff não deve travar o resto do side panel (captura/consentimento já
    // concluídos nesta altura) — mostra a mensagem só dentro do próprio card de IA.
    aiStatusTextEl.textContent =
      err instanceof ApiError ? err.message : 'Não foi possível carregar o resumo e as sugestões.';
    return;
  }
  if (conversation?.id !== conversationId) return;
  renderHandoff();
}

refreshAiEl.addEventListener('click', () => loadHandoff());

saveApiBaseUrlEl.addEventListener('click', () =>
  withErrorHandling(async () => {
    const origin = await setApiBaseUrl(apiBaseUrlEl.value.trim());
    apiBaseUrlHintEl.textContent = `Salvo: ${origin}`;
  }),
);

/**
 * A transcrição+resumo rodam em background no worker (`transcribeConversation.worker.ts`) depois
 * de `stopCapture` — nada empurra esse resultado pro side panel automaticamente. Sem isto, o
 * estado local (`conversation.status`, espelhado em `chrome.storage.session`) fica travado em
 * `PROCESSING` para sempre, e o card de resumo/sugestões (`aiCard`, só visível em `READY`) nunca
 * aparece sozinho. Intervalo mais espaçado que `refreshMeetContext` (que só lê estado local) por
 * ser uma chamada real ao backend, e só roda enquanto há algo relevante para checar.
 */
async function pollConversationStatus() {
  if (!conversation || conversation.status !== 'PROCESSING') return;
  const conversationId = conversation.id;
  let updated;
  try {
    updated = await copilotoApi.getConversation(conversationId);
  } catch {
    return;
  }
  if (!conversation || conversation.id !== conversationId || updated.status === conversation.status) {
    return;
  }
  conversation.status = updated.status;
  conversation.consentStatus = updated.consentStatus;
  await saveConversationForTab();
  render();
}

async function init() {
  apiBaseUrlEl.value = await getApiBaseUrl();
  await refreshMeetContext();
}

init();
setInterval(refreshMeetContext, 1500);
setInterval(pollConversationStatus, 8000);
