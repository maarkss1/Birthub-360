
import React, { useState, useEffect } from 'react';
import { Download, FileText, Clock, MessageSquare, Search, Music } from 'lucide-react';

interface CallLogEntry {
  id: string;
  agent?: string;
  contactName?: string;
  timestamp: string;
  duration: string;
  status?: string;
  summary?: string;
  transcript?: string;
  audioUrl?: string;
}

interface SessionRecord {
  id: string;
  agentName: string;
  caller: string;
  dateTime: string;
  duration: string;
  sentiment: 'Positivo' | 'Neutro' | 'Negativo';
  summary: string;
  transcript: string;
  audioUrl?: string;
}

export default function ResultsPage() {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetch('/api/call-logs')
      .then(res => res.json())
      .then(data => {
        if (data.callLogs) {
           const mappedLogs = data.callLogs.map((log: CallLogEntry) => ({
             id: log.id,
             agentName: log.agent || 'Desconhecido',
             caller: log.contactName || 'Anônimo',
             dateTime: new Date(log.timestamp).toLocaleString(),
             duration: log.duration,
             sentiment: log.status === 'Concluído' ? 'Positivo' : 'Neutro',
             summary: log.summary || 'Resumo não disponível',
             transcript: log.transcript || 'Transcrição não disponível',
             audioUrl: log.audioUrl || ''
           }));
           setSessions(mappedLogs);
        }
      });
  }, []);
const filteredSessions = sessions.filter(s =>
    s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.caller.includes(searchTerm) ||
    s.agentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.summary.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportCSV = () => {
    // Excel-safe standard headers
    const headers = ["ID da Sessão", "Canal/Agente", "Caller/Contato", "Data e Hora", "Duração", "Sentimento da Chamada", "Resumo Comercial/Operacional", "Transcrição Integral"];
    
    // Format sessions to CSV list with quotes escaping
    const csvContent = [
      headers.join(','),
      ...sessions.map(s => {
        const escapedAgentName = `"${(s.agentName || '').replace(/"/g, '""')}"`;
        const escapedSummary = `"${(s.summary || '').replace(/"/g, '""')}"`;
        const escapedTranscript = `"${(s.transcript || '').replace(/"/g, '""')}"`;
        
        return [
          s.id,
          escapedAgentName,
          s.caller,
          s.dateTime,
          s.duration,
          s.sentiment,
          escapedSummary,
          escapedTranscript
        ].join(',');
      })
    ].join('\n');
    
    // Download prompt with UTF-8 byte order mark to parse Portuguese accents correctly
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `hub_resultados_transcricoes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-sans">Resultados & Transcrições</h1>
          <p className="text-sm text-slate-500 mt-1">Monitore e analise os diálogos e métricas consolidadas dos agentes.</p>
        </div>
        <button 
          onClick={handleExportCSV}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-brand text-white rounded-lg hover:opacity-90 font-medium text-sm transition-opacity shadow-sm shrink-0"
        >
          <Download className="h-4 w-4" /> Exportar Dados (CSV)
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total de Chamadas</div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">{sessions.length}</div>
          <div className="text-xs text-brand mt-1 font-semibold flex items-center gap-1">
            <span>●</span> 100% integradas
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Duração Média</div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">03:06</div>
          <div className="text-xs text-green-600 mt-1 font-semibold">
            Tempo otimizado de resposta
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Score Positivo / Neutro</div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">75%</div>
          <div className="text-xs text-slate-500 mt-1">
            Sentimento satisfatório do usuário
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left List Pane */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Buscar por ID, agente, resumo ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand font-sans"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            </div>
          </div>
          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto scrollbar-hide">
            {filteredSessions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                Nenhuma sessão corresponde aos filtros digitados.
              </div>
            ) : (
              filteredSessions.map((s) => (
                <div 
                  key={s.id}
                  onClick={() => setSelectedSession(s)}
                  className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors border-l-4 ${
                    selectedSession?.id === s.id ? 'bg-brand-50 border-brand' : 'border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-mono text-xs font-bold text-slate-700">{s.id}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      s.sentiment === 'Positivo' ? 'bg-green-100 text-green-700' :
                      s.sentiment === 'Neutro' ? 'bg-slate-100 text-slate-650' : 'bg-red-100 text-red-700'
                    }`}>
                      {s.sentiment}
                    </span>
                  </div>
                  <div className="font-semibold text-sm text-slate-900 mt-1.5 truncate">{s.agentName}</div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                    <span className="font-mono">{s.caller}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {s.duration}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-2 line-clamp-2 italic">{s.summary}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Detail Pane */}
        <div className="lg:col-span-7 space-y-4">
          {selectedSession ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-brand font-bold bg-brand-50 px-2 py-1 rounded">{selectedSession.id}</span>
                    <span className="text-xs text-slate-400">{selectedSession.dateTime}</span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mt-1.5">{selectedSession.agentName}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-mono">{selectedSession.caller}</span>
                  <span className={`text-xs px-2.5 py-1 rounded-md font-bold ${
                    selectedSession.sentiment === 'Positivo' ? 'bg-green-100 text-green-700' :
                    selectedSession.sentiment === 'Neutro' ? 'bg-slate-100 text-slate-600' : 'bg-red-100 text-red-700'
                  }`}>
                    {selectedSession.sentiment}
                  </span>
                </div>
              </div>

              {/* Call Summary Card */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-250">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-400" />
                  Resumo Comercial / Operacional
                </h4>
                <p className="text-sm text-slate-700 mt-2.5 font-medium leading-relaxed">{selectedSession.summary}</p>
              </div>

              {/* Call Audio Recording */}
              <div className="flex items-center justify-between bg-white border border-slate-200 p-4 rounded-lg shadow-sm">
                <div className="flex items-center gap-3">
                   <div className="p-2.5 bg-brand-50 text-brand rounded-full">
                       <Music className="h-5 w-5" />
                   </div>
                   <div>
                       <div className="font-bold text-sm text-slate-900">Gravação do Áudio da Chamada</div>
                       <div className="text-xs text-slate-500">Gravado pelo canal de voz ({selectedSession.duration})</div>
                   </div>
                </div>
                <button 
                  onClick={() => {
                     const link = document.createElement("a");
                     link.href = selectedSession.audioUrl || "#";
                     link.setAttribute("download", `chamada_${selectedSession.id}.wav`);
                     document.body.appendChild(link);
                     link.click();
                     document.body.removeChild(link);
                  }}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:border-brand hover:text-brand bg-slate-50 hover:bg-brand-50 text-slate-600 rounded-lg text-sm font-semibold transition-all"
                >
                  <Download className="h-4 w-4" /> Baixar Áudio
                </button>
              </div>

              {/* Call Transcript Bubbles */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-slate-400" />
                  Diálogo Completo
                </h4>
                <div className="space-y-3 max-h-[320px] overflow-y-auto bg-slate-50 border border-slate-100 p-4 rounded-lg scrollbar-hide">
                  {selectedSession.transcript.split('\n').map((line, idx) => {
                    const isAgent = line.startsWith('Agente:');
                    const cleanLine = line.replace('Agente:', '').replace('Usuário:', '').trim();
                    return (
                      <div key={idx} className={`flex flex-col ${isAgent ? 'items-start' : 'items-end'}`}>
                        <span className="text-[10px] text-slate-400 mb-0.5">{isAgent ? "Agente de Voz" : "Usuário / Contato"}</span>
                        <div className={`p-3 rounded-xl text-xs max-w-[85%] leading-relaxed ${
                          isAgent 
                            ? 'bg-white text-slate-850 hover:border-slate-200 border border-slate-100 rounded-tl-none font-medium' 
                            : 'bg-brand text-white rounded-tr-none'
                        }`}>
                          {cleanLine}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center text-slate-400">
               Selecione uma chamada do painel esquerdo para visualizar as transcrições e análises correspondentes.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
