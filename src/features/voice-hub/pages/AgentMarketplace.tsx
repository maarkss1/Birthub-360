import React from 'react';
import { Card, Button, Badge } from '../../components/design-system';
import { Sparkles, DownloadCloud, Star, FlaskConical } from 'lucide-react';

// Template catalog and ratings/downloads below are illustrative — there is no marketplace backend
// yet (no endpoint lists/installs a template), so these are labeled as example data per
// AGENTS.md §14 instead of presented unlabeled as if they were real published templates.
export default function AgentMarketplace() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Agent Marketplace</h1>
            <Badge variant="warning" className="normal-case"><FlaskConical className="h-2.5 w-2.5 mr-1 inline" />Dados de exemplo</Badge>
          </div>
          <p className="text-sm text-slate-500">Instale templates corporativos de agentes pré-treinados e otimizados.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[
          { title: 'SDR Qualificador B2B', category: 'Vendas', author: 'Birth Hub', rating: '4.9', downloads: '1.2k' },
          { title: 'Triagem de Candidatos RH', category: 'RH', author: 'Birth Hub', rating: '5.0', downloads: '8.4k' },
          { title: 'Cobrança Humanizada', category: 'Financeiro', author: 'Birth Hub', rating: '4.8', downloads: '3.1k' },
          { title: 'Suporte L1 T.I.', category: 'Suporte', author: 'TechAgents', rating: '4.6', downloads: '5.5k' },
          { title: 'Concierge Hotelaria', category: 'Hospitalidade', author: 'Birth Hub', rating: '4.9', downloads: '900' }
        ].map((template, i) => (
          <Card key={i} className="flex flex-col overflow-hidden group">
            <div className="h-32 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center relative">
              <Sparkles className="h-8 w-8 text-slate-300 dark:text-slate-700" />
              <Badge variant="primary" className="absolute top-3 left-3">{template.category}</Badge>
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <h3 className="font-bold text-slate-900 dark:text-white mb-1">{template.title}</h3>
              <p className="text-xs text-slate-500 mb-4">Por {template.author}</p>
              
              <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-400 mb-6">
                <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /> {template.rating}</span>
                <span className="flex items-center gap-1"><DownloadCloud className="h-3.5 w-3.5" /> {template.downloads}</span>
              </div>

              <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button variant="outline" className="w-full text-xs py-2">Ver Detalhes</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
