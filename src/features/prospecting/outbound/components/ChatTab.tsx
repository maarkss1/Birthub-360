import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import type { AIConfig, ChatMessage, ChatSession, ThemeMode } from '../types';
import { AtlasLogo } from './AtlasLogo';
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  RotateCcw, 
  Loader2, 
  Terminal, 
  MessageSquare, 
  Plus, 
  Database,
  Lightbulb,
  Copy,
  Check
} from 'lucide-react';

interface ChatTabProps {
  aiConfig: AIConfig;
  theme?: ThemeMode;
}

export const ChatTab: React.FC<ChatTabProps> = ({ aiConfig, theme = 'dark' }) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isDark = theme === 'dark';

  const quickPrompts = [
    'Como quebrar a objeção: "Já temos empresa de gerenciamento de risco"?',
    'Crie 3 opções de assunto de Cold Email de alto impacto para diretores de frota.',
    'Gere um script de WhatsApp de 3 linhas com pergunta aberta sobre sinistros.',
    'Explique como a tecnologia de predição da Atlas reduz custos com seguro de carga.'
  ];

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const res = await fetch('/api/chat/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
        if (data.length > 0 && !currentSessionId) {
          setCurrentSessionId(data[0].id);
          loadMessages(data[0].id);
        } else if (data.length === 0) {
          createNewSession();
        }
      }
    } catch (err) {
      console.error('Erro ao carregar sessões:', err);
    }
  };

  const loadMessages = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err);
    }
  };

  const createNewSession = () => {
    const newId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title: `Conversa LLaMA3 (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
      model: aiConfig.ollamaModel || 'llama3',
      created_at: new Date().toISOString()
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newId);
    setMessages([
      {
        id: `init-${Date.now()}`,
        session_id: newId,
        role: 'assistant',
        content: 'Olá! Sou o Assistente de Inteligência Comercial e Estratégia da **Atlas (Segurança e Inteligência Logística)**. Posso redigir scripts personalizados, contornar objeções de clientes ou afinar sua abordagem de prospecção. Como posso ajudar hoje?',
        model: 'Atlas LLaMA3',
        created_at: new Date().toISOString()
      }
    ]);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputPrompt;
    if (!textToSend.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      session_id: currentSessionId,
      role: 'user',
      content: textToSend,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    if (!customText) setInputPrompt('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSessionId,
          message: textToSend,
          aiConfig
        })
      });

      if (res.ok) {
        const data = await res.json();
        const botMessage: ChatMessage = {
          id: data.assistantMessageId || `a-${Date.now()}`,
          session_id: currentSessionId,
          role: 'assistant',
          content: data.reply,
          model: data.modelUsed,
          tokens: data.tokensEstimated,
          created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro na resposta');
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          session_id: currentSessionId,
          role: 'assistant',
          content: `Houve uma instabilidade na conexão: ${err.message}. Verifique o status do Ollama na aba lateral.`,
          model: 'Sistema',
          created_at: new Date().toISOString()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)] min-h-[550px]">
      {/* Sessions Sidebar Column (3 cols) */}
      <div className={`lg:col-span-3 border rounded-2xl p-4 flex flex-col justify-between shadow-xl transition ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-slate-100'
      }`}>
        <div className="space-y-3 flex-1 overflow-y-auto">
          <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <MessageSquare className="w-3.5 h-3.5 text-[var(--brand-primary)]" /> Histórico de Sessões
            </h3>
            <button
              onClick={createNewSession}
              className="p-1.5 bg-[var(--brand-primary)] hover:bg-[#FF6B10] text-white rounded-lg transition"
              title="Nova Conversa"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1.5">
            {sessions.map((sess) => (
              <button
                key={sess.id}
                onClick={() => {
                  setCurrentSessionId(sess.id);
                  loadMessages(sess.id);
                }}
                className={`w-full text-left p-2.5 rounded-xl text-xs transition flex items-center justify-between ${
                  currentSessionId === sess.id
                    ? 'bg-[var(--brand-primary)]/15 border border-[var(--brand-primary)]/40 text-[var(--brand-primary)] font-bold'
                    : isDark 
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                }`}
              >
                <span className="truncate flex-1">{sess.title}</span>
                <span className="text-[10px] text-slate-400 shrink-0 ml-1 font-mono">
                  {sess.model || 'llama3'}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className={`pt-3 border-t text-[11px] flex items-center gap-1.5 ${
          isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'
        }`}>
          <Database className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
          <span>Sessões salvas no SQLite</span>
        </div>
      </div>

      {/* Main Chat Thread (9 cols) */}
      <div className={`lg:col-span-9 border rounded-2xl flex flex-col shadow-xl overflow-hidden transition ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-slate-100'
      }`}>
        {/* Chat Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--brand-primary)]/20 border border-[var(--brand-primary)]/30 flex items-center justify-center text-[var(--brand-primary)]">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <span>Assistente Atlas LLaMA3</span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono font-semibold">
                  ONLINE
                </span>
              </h3>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Afinamento de copy, contorno de objeções e estratégia comercial
              </p>
            </div>
          </div>

          <div className={`text-xs font-mono px-2.5 py-1 rounded-lg border ${
            isDark ? 'text-slate-400 bg-slate-900 border-slate-800' : 'text-slate-600 bg-slate-100 border-slate-200'
          }`}>
            Motor: <span className="text-[var(--brand-primary)] font-bold">{aiConfig.provider.toUpperCase()}</span>
          </div>
        </div>

        {/* Message Stream */}
        <div className={`flex-1 p-4 md:p-6 overflow-y-auto space-y-4 ${
          isDark ? 'bg-slate-900/50' : 'bg-slate-50/50'
        }`}>
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-lg bg-[var(--brand-primary)] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-md shadow-[var(--brand-primary)]/20">
                    A
                  </div>
                )}

                <div
                  className={`max-w-2xl rounded-2xl p-4 text-xs leading-relaxed space-y-1.5 ${
                    isUser
                      ? 'bg-[var(--brand-primary)] text-white font-medium rounded-tr-sm shadow-md'
                      : isDark
                        ? 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-sm relative group'
                        : 'bg-white border border-slate-200 text-slate-800 shadow-sm rounded-tl-sm relative group'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] opacity-70 pb-1 border-b border-white/10">
                    <span>{isUser ? 'Você' : 'Atlas LLaMA3 Specialist'}</span>
                    <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div className="whitespace-pre-wrap font-sans select-text">
                    {msg.content}
                  </div>

                  {!isUser && (
                    <div className="pt-2 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{msg.model || 'LLaMA3'}</span>
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="hover:text-[var(--brand-primary)] transition flex items-center gap-1 font-medium"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span className="text-emerald-500">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs shrink-0 border ${
                    isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-200 text-slate-700 border-slate-300'
                  }`}>
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-lg bg-[var(--brand-primary)] text-white flex items-center justify-center font-bold text-xs shrink-0 animate-pulse">
                A
              </div>
              <div className={`border rounded-2xl rounded-tl-sm p-4 text-xs flex items-center gap-2 ${
                isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600 shadow-sm'
              }`}>
                <Loader2 className="w-4 h-4 animate-spin text-[var(--brand-primary)]" />
                <span>LLaMA3 está estruturando sua resposta comercial...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips for Chat */}
        <div className={`px-4 py-2 border-t flex items-center gap-1.5 overflow-x-auto scrollbar-none ${
          isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-100 border-slate-200'
        }`}>
          <Lightbulb className="w-3.5 h-3.5 text-[#FFC500] shrink-0 ml-1" />
          {quickPrompts.map((qp, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(qp)}
              className={`text-[11px] px-2.5 py-1 rounded-lg border whitespace-nowrap transition ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700' 
                  : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border-slate-200'
              }`}
            >
              {qp}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className={`p-3 border-t ${
          isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-white'
        }`}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Digite sua dúvida ou peça um roteiro específico para a Atlas..."
              className={`flex-1 border rounded-xl px-4 py-2.5 text-xs outline-none ${
                isDark 
                  ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[var(--brand-primary)]' 
                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-[var(--brand-primary)]'
              }`}
            />
            <button
              type="submit"
              disabled={isLoading || !inputPrompt.trim()}
              className="p-2.5 bg-[var(--brand-primary)] hover:bg-[#FF6B10] disabled:opacity-50 text-white rounded-xl transition shadow-md shadow-[var(--brand-primary)]/20"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
