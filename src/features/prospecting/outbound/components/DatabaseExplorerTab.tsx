import type React from 'react';
import { useState, useEffect } from 'react';
import type { DatabaseStats, QueryResult, ThemeMode } from '../types.js';
import { 
  Database, 
  Play, 
  Table, 
  RefreshCw, 
  AlertCircle,
  Code2,
} from 'lucide-react';

interface DatabaseExplorerTabProps {
  dbStats: DatabaseStats | null;
  onRefreshStats: () => void;
  theme?: ThemeMode;
}

export const DatabaseExplorerTab: React.FC<DatabaseExplorerTabProps> = ({ 
  dbStats, 
  onRefreshStats,
  theme = 'dark'
}) => {
  const [_selectedTable, _setSelectedTable] = useState('messages');
  const [customSql, setCustomSql] = useState('SELECT m.id, l.name as lead, m.channel, m.status, m.content FROM messages m LEFT JOIN leads l ON m.lead_id = l.id LIMIT 25;');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const isDark = theme === 'dark';

  const sampleQueries = [
    { label: 'Todas as Mensagens (JOIN Lead)', sql: 'SELECT m.id, l.name as empresa, m.channel, m.status, substr(m.content, 1, 80) || "..." as previa FROM messages m LEFT JOIN leads l ON m.lead_id = l.id ORDER BY m.created_at DESC;' },
    { label: 'Leads & Decisores Apollo', sql: 'SELECT name, address, rating, decision_maker_name, decision_maker_title, decision_maker_email FROM leads ORDER BY created_at DESC;' },
    { label: 'Mensagens por Canal (Estatística)', sql: 'SELECT channel, status, COUNT(*) as total FROM messages GROUP BY channel, status;' },
    { label: 'Campanhas Criadas', sql: 'SELECT id, title, segment, provider, model, leads_count, created_at FROM campaigns ORDER BY created_at DESC;' },
    { label: 'Histórico de Chat LLaMA3', sql: 'SELECT session_id, role, model, tokens, substr(content, 1, 100) || "..." as previa FROM chat_messages ORDER BY created_at DESC LIMIT 20;' },
    { label: 'Logs de Auditoria SQL', sql: 'SELECT id, query, execution_time_ms, rows_affected, created_at FROM query_audit_logs ORDER BY created_at DESC LIMIT 15;' }
  ];

  const runQuery = async (sqlToRun?: string) => {
    const sql = sqlToRun || customSql;
    if (!sql.trim()) return;

    setIsExecuting(true);
    try {
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sql })
      });
      const data = await res.json();
      setQueryResult(data);
      onRefreshStats();
    } catch (err: any) {
      setQueryResult({
        columns: ['error'],
        rows: [[err.message]],
        rowCount: 0,
        executionTimeMs: 0,
        error: err.message
      });
    } finally {
      setIsExecuting(false);
    }
  };

  useEffect(() => {
    runQuery();
  }, [runQuery]);

  return (
    <div className="space-y-6">
      {/* Top Banner: Relational Persistence Architecture */}
      <div className={`border rounded-2xl p-5 md:p-6 shadow-xl space-y-4 transition ${
        isDark 
          ? 'bg-slate-900 border-slate-800 text-slate-200' 
          : 'bg-white border-slate-200 shadow-slate-100 text-slate-800'
      }`}>
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-4 ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}>
          <div>
            <h2 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <Database className="w-5 h-5 text-[var(--brand-primary)]" />
              <span>Banco de Dados Relacional SQLite (Persistência de Mensagens)</span>
            </h2>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Estrutura relacional normalizada com integridade referencial, foreign keys e logs de auditoria para todas as mensagens de outbound e histórico de chat.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefreshStats}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition flex items-center gap-1.5 ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Atualizar Métricas</span>
            </button>
          </div>
        </div>

        {/* Database Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className={`p-3.5 rounded-xl border ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Tabela messages</div>
            <div className="text-xl font-bold text-emerald-500 mt-0.5">{dbStats?.messagesCount ?? 0}</div>
            <div className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Registros persistidos</div>
          </div>
          <div className={`p-3.5 rounded-xl border ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Tabela leads</div>
            <div className={`text-xl font-bold mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>{dbStats?.leadsCount ?? 0}</div>
            <div className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Empresas & Decisores</div>
          </div>
          <div className={`p-3.5 rounded-xl border ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Tabela campaigns</div>
            <div className="text-xl font-bold text-[var(--brand-primary)] mt-0.5">{dbStats?.campaignsCount ?? 0}</div>
            <div className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Sessões de prospecção</div>
          </div>
          <div className={`p-3.5 rounded-xl border ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Tamanho do Banco</div>
            <div className="text-xl font-bold text-[var(--brand-primary)] mt-0.5">
              {((dbStats?.dbSizeBytes ?? 0) / 1024).toFixed(1)} KB
            </div>
            <div className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>SQLite Engine</div>
          </div>
        </div>
      </div>

      {/* SQL Query Console */}
      <div className={`border rounded-2xl p-5 md:p-6 shadow-xl space-y-4 transition ${
        isDark 
          ? 'bg-slate-900 border-slate-800 text-slate-200' 
          : 'bg-white border-slate-200 shadow-slate-100 text-slate-800'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
            isDark ? 'text-slate-300' : 'text-slate-700'
          }`}>
            <Code2 className="w-4 h-4 text-[var(--brand-primary)]" /> Console SQL Interativo
          </label>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>DML & DQL habilitados</span>
          </div>
        </div>

        {/* Preset Query Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-400 font-medium">Queries Prontas:</span>
          {sampleQueries.map((q, i) => (
            <button
              key={i}
              onClick={() => {
                setCustomSql(q.sql);
                runQuery(q.sql);
              }}
              className={`text-[11px] px-2.5 py-1 rounded-lg border transition ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-200'
              }`}
            >
              {q.label}
            </button>
          ))}
        </div>

        {/* Query Text Area */}
        <div className="space-y-2">
          <textarea
            rows={3}
            value={customSql}
            onChange={(e) => setCustomSql(e.target.value)}
            className={`w-full border rounded-xl p-3 font-mono text-xs outline-none leading-relaxed resize-y ${
              isDark 
                ? 'bg-slate-950 border-slate-700 text-emerald-400 focus:border-[var(--brand-primary)]' 
                : 'bg-slate-900 border-slate-700 text-emerald-400 focus:border-[var(--brand-primary)]'
            }`}
            placeholder="Digite sua query SQL (ex: SELECT * FROM messages;)"
          />

          <div className="flex justify-between items-center">
            <span className="text-[11px] text-slate-400">
              Pressione Executar para rodar no SQLite nativo.
            </span>
            <button
              onClick={() => runQuery()}
              disabled={isExecuting}
              className="py-2 px-5 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] disabled:opacity-50 text-white font-bold rounded-xl text-xs transition shadow-md flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isExecuting ? 'Executando...' : 'Executar SQL'}</span>
            </button>
          </div>
        </div>

        {/* Results Table */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Table className="w-3.5 h-3.5 text-slate-400" />
              Resultado da Execução:
            </span>
            {queryResult && (
              <span className="font-mono text-[11px]">
                {queryResult.rowCount} linhas encontradas em {queryResult.executionTimeMs}ms
              </span>
            )}
          </div>

          {queryResult?.error ? (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{queryResult.error}</span>
            </div>
          ) : queryResult && queryResult.columns.length > 0 ? (
            <div className={`overflow-x-auto rounded-xl border max-h-96 ${
              isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-white'
            }`}>
              <table className="w-full text-left text-xs">
                <thead className={`border-b text-[11px] font-mono sticky top-0 ${
                  isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                }`}>
                  <tr>
                    {queryResult.columns.map((col, idx) => (
                      <th key={idx} className="p-3 uppercase font-semibold">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className={`divide-y ${
                  isDark ? 'divide-slate-900 text-slate-200' : 'divide-slate-100 text-slate-800'
                }`}>
                  {queryResult.rows.map((row, rIdx) => (
                    <tr key={rIdx} className={`transition ${
                      isDark ? 'hover:bg-slate-900/60' : 'hover:bg-slate-50'
                    }`}>
                      {row.map((val, cIdx) => (
                        <td key={cIdx} className="p-3 max-w-xs truncate font-mono text-[11px]">
                          {val === null || val === undefined ? (
                            <span className="text-slate-400 italic">NULL</span>
                          ) : (
                            String(val)
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={`p-8 text-center text-xs rounded-xl border ${
              isDark ? 'text-slate-500 bg-slate-950 border-slate-800' : 'text-slate-400 bg-slate-50 border-slate-200'
            }`}>
              Nenhum registro retornado.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
