import React from 'react';
import { Card, Button, Badge } from '../../components/design-system';
import { Plug, Plus, Settings, FlaskConical } from 'lucide-react';

// ToolEngine (lib/voice-runtime/ToolEngine.ts) has no live tool registered yet in production
// (verified: no call site invokes registerTool outside its own module), so the usage/latency
// figures below are illustrative, not real telemetry — labeled per AGENTS.md §14 instead of
// presented unlabeled as if a real tool were handling 14.2k calls/day.
export default function ToolRegistry() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tool Registry</h1>
            <Badge variant="warning" className="normal-case"><FlaskConical className="h-2.5 w-2.5 mr-1 inline" />Dados de exemplo</Badge>
          </div>
          <p className="text-sm text-slate-500">Integrações de API, CRMs e webhooks que os agentes podem executar.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="primary">
            <Plus className="h-4 w-4 mr-2" /> Nova Ferramenta
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { title: 'Agendamento Tasy CRM', type: 'API REST', calls: '14.2k/dia', status: 'healthy', latency: '120ms' },
          { title: 'Consulta Saldo Stripe', type: 'Plugin', calls: '3.1k/dia', status: 'healthy', latency: '45ms' },
          { title: 'Disparo WhatsApp', type: 'Webhook', calls: '22k/dia', status: 'warning', latency: '850ms' },
          { title: 'Salesforce Lead Sync', type: 'OAuth API', calls: '1.2k/dia', status: 'healthy', latency: '300ms' }
        ].map((tool, i) => (
          <Card key={i} className="p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg">
                  <Plug className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">{tool.title}</h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">{tool.type}</span>
                </div>
              </div>
              <button className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                <Settings className="h-4 w-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4 p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Uso</p>
                <p className="text-sm font-mono font-semibold text-slate-700 dark:text-slate-300">{tool.calls}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Latência Média</p>
                <p className={`text-sm font-mono font-semibold ${tool.status === 'warning' ? 'text-amber-500' : 'text-emerald-500'}`}>{tool.latency}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
