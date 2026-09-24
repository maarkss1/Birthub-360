import React, { useEffect, useState } from 'react';
import { Loader2, Users, Building2 } from 'lucide-react';
import { User } from '../types';

interface DistributionLead {
  id: string;
  name: string;
  segment: string | null;
  company_type: string | null;
  stage: string;
  domain: string | null;
  created_at: string;
}

interface DistributionEntry {
  user: User;
  leads: DistributionLead[];
  totalLeads: number;
}

interface DistributionGroup {
  sellers: DistributionEntry[];
  totalLeads: number;
}

interface DistributionResponse {
  atlas: DistributionGroup;
  totaltrac: DistributionGroup;
}

interface LeadDistributionTabProps {
  isDark: boolean;
}

const BRAND_LABEL: Record<'atlas' | 'totaltrac', string> = {
  atlas: 'AtlasGR',
  totaltrac: 'Total Trac'
};

const STAGE_LABELS: Record<string, { label: string; className: string }> = {
  prospecto: { label: 'Prospecto (Novo)', className: 'bg-[#008FCE]/10 text-[#008FCE] border-[#008FCE]/30' },
  qualificado: { label: 'Qualificado', className: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30' },
  contatado: { label: 'Em Contato', className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30' },
  negociacao: { label: 'Negociação', className: 'bg-purple-500/10 text-purple-500 border-purple-500/30' },
  ganho: { label: 'Ganho', className: 'bg-green-500/10 text-green-600 border-green-500/30' },
  perdido: { label: 'Perdido', className: 'bg-red-500/10 text-red-500 border-red-500/30' },
};

function StageBadge({ stage }: { stage: string }) {
  const info = STAGE_LABELS[stage] || { label: stage, className: 'bg-slate-500/10 text-slate-500 border-slate-500/30' };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${info.className}`}>
      {info.label}
    </span>
  );
}

const EMPTY_DISTRIBUTION: DistributionResponse = {
  atlas: { sellers: [], totalLeads: 0 },
  totaltrac: { sellers: [], totalLeads: 0 }
};

export function LeadDistributionTab({ isDark }: LeadDistributionTabProps) {
  const [distribution, setDistribution] = useState<DistributionResponse>(EMPTY_DISTRIBUTION);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDistribution();
  }, []);

  const fetchDistribution = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/leads/distribution');
      const data = await res.json();
      setDistribution({
        atlas: data?.atlas || { sellers: [], totalLeads: 0 },
        totaltrac: data?.totaltrac || { sellers: [], totalLeads: 0 }
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-primary)]" />
      </div>
    );
  }

  const totalDistributed = distribution.atlas.totalLeads + distribution.totaltrac.totalLeads;
  const brands: Array<'totaltrac' | 'atlas'> = ['totaltrac', 'atlas'];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className={`w-5 h-5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`} />
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Distribuição de Leads por Vendedor
          </h2>
        </div>
        <span className={`text-sm px-3 py-1 rounded-full ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'}`}>
          Total distribuído: {totalDistributed}
        </span>
      </div>

      {brands.map(brand => {
        const group = distribution[brand];
        return (
          <div key={brand} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-md ${
                brand === 'atlas' ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]' : 'bg-[#008FCE]/10 text-[#008FCE]'
              }`}>
                {BRAND_LABEL[brand]}
              </span>
              <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                {group.sellers.length} {group.sellers.length === 1 ? 'vendedor' : 'vendedores'} · {group.totalLeads} leads
              </span>
            </div>

            {group.sellers.length === 0 ? (
              <div className={`border-2 border-dashed rounded-2xl p-8 text-center text-sm ${isDark ? 'border-slate-800 text-slate-500' : 'border-slate-300 text-slate-500 bg-white'}`}>
                Nenhum vendedor cadastrado com company="{brand}".
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {group.sellers.map(({ user, leads, totalLeads }) => (
                  <div
                    key={user.id}
                    className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
                  >
                    <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-slate-50'}`}>
                      <div>
                        <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{user.name}</p>
                        <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{user.email}</p>
                      </div>
                      <span className="text-sm font-bold px-2.5 py-1 rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
                        {totalLeads} {totalLeads === 1 ? 'lead' : 'leads'}
                      </span>
                    </div>

                    {leads.length === 0 ? (
                      <p className={`px-4 py-6 text-sm text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        Nenhum lead atribuído.
                      </p>
                    ) : (
                      <div className="divide-y max-h-80 overflow-y-auto">
                        {leads.map(lead => (
                          <div
                            key={lead.id}
                            className={`px-4 py-2.5 flex items-center justify-between gap-3 ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Building2 className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                                <p className={`text-xs font-medium truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                                  {lead.name}
                                </p>
                              </div>
                              {lead.segment && (
                                <p className={`text-[10px] truncate ml-5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                                  {lead.segment}
                                </p>
                              )}
                            </div>
                            <StageBadge stage={lead.stage} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
