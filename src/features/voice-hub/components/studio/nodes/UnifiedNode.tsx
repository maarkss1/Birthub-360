import { Handle, Position, NodeProps } from '@xyflow/react';
import { LucideIcon } from 'lucide-react';
import * as Icons from 'lucide-react';
import { StudioNode } from '../../../lib/studio/types';

export type UnifiedNodeProps = NodeProps<StudioNode> & {
  iconName: string;
  colorClass: string;
  headerTitle: string;
  inputs?: number;
  outputs?: number;
};

export function UnifiedNode({ data, iconName, colorClass, headerTitle, inputs = 1, outputs = 1, selected }: UnifiedNodeProps) {
  const Icon = Icons[iconName as keyof typeof Icons] as LucideIcon;
  const isInvalid = data.validation?.isValid === false;
  const lifecycle = data.lifecycleState || 'Ready';

  // Determine active visual glow or status borders based on lifecycle
  let lifecycleBorderGlow = 'border-white/10 hover:border-white/20';
  if (selected) {
    lifecycleBorderGlow = 'ring-2 ring-indigo-500 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)]';
  } else if (isInvalid) {
    lifecycleBorderGlow = 'border-red-500 ring-1 ring-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]';
  } else if (lifecycle === 'Executing') {
    lifecycleBorderGlow = 'ring-2 ring-purple-500 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.4)] animate-pulse';
  } else if (lifecycle === 'Completed') {
    lifecycleBorderGlow = 'border-emerald-500 ring-1 ring-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]';
  } else if (lifecycle === 'Failed') {
    lifecycleBorderGlow = 'border-red-500 ring-2 ring-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]';
  }

  // Lifecycle badges colors
  const badgeStyles: Record<string, string> = {
    Created: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    Initialized: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    Configured: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    Validated: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    Ready: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    Executing: 'bg-purple-500/20 text-purple-400 border-purple-500/30 animate-bounce shadow-[0_0_10px_rgba(168,85,247,0.3)]',
    Completed: 'bg-green-500/10 text-green-400 border-green-500/20',
    Failed: 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]',
    Retry: 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse',
    Archived: 'bg-slate-500/10 text-slate-500 border-slate-500/20'
  };

  return (
    <div className={`
      relative min-w-[280px] bg-[#131520]/90 backdrop-blur-md rounded-xl shadow-lg transition-all duration-200
      ${lifecycleBorderGlow}
    `}>
      {/* Handles - Inputs */}
      {Array.from({ length: inputs }).map((_, i) => (
        <Handle
          key={`in-${i}`}
          type="target"
          position={Position.Left}
          id={`in-${i}`}
          className="w-3 h-3 border-2 border-[#131520] bg-gray-500 hover:bg-indigo-400 hover:scale-125 transition-transform"
          style={{ top: inputs > 1 ? `${(100 / (inputs + 1)) * (i + 1)}%` : '50%' }}
        />
      ))}

      {/* Header */}
      <div className={`flex items-center gap-3 p-3 border-b border-white/5 rounded-t-xl ${colorClass.replace('bg-', 'bg-').replace('100', '500/10')} bg-opacity-20`}>
        <div className={`p-1.5 rounded-lg bg-black/20 shadow-sm ${colorClass.replace('bg-', 'text-').replace('100', '400')} border border-white/5`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">{headerTitle}</h3>
            {/* Real-time Lifecycle State Tag */}
            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${badgeStyles[lifecycle] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
              {lifecycle}
            </span>
          </div>
          <p className="text-sm font-bold text-gray-200 mt-0.5">{data.label}</p>
        </div>
        {data.validation?.errors && data.validation.errors.length > 0 && (
          <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse" title={data.validation.errors[0]} />
        )}
      </div>

      {/* Body Placeholder */}
      <div className="p-4 space-y-2 text-sm text-gray-400">
        {Object.entries(data.config || {}).slice(0, 3).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between bg-white/5 p-1.5 rounded border border-white/5">
            <span className="capitalize text-xs font-medium">{key}</span>
            <span className="font-mono text-[10px] font-bold text-gray-300 truncate max-w-[120px]">
              {String(value)}
            </span>
          </div>
        ))}
        {(!data.config || Object.keys(data.config).length === 0) && (
          <div className="text-xs italic text-gray-500">Configure parameters...</div>
        )}
      </div>

      {/* Footer Metrics (Optional) */}
      {data.metrics && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-white/5 bg-black/20 rounded-b-xl text-[10px] font-mono text-gray-400">
          <span>{data.metrics.invocations.toLocaleString()} runs</span>
          <span>{data.metrics.latencyMs}ms</span>
        </div>
      )}

      {/* Handles - Outputs */}
      {Array.from({ length: outputs }).map((_, i) => (
        <Handle
          key={`out-${i}`}
          type="source"
          position={Position.Right}
          id={`out-${i}`}
          className="w-3 h-3 border-2 border-[#131520] bg-indigo-500 hover:bg-indigo-400 hover:scale-125 transition-transform"
          style={{ top: outputs > 1 ? `${(100 / (outputs + 1)) * (i + 1)}%` : '50%' }}
        />
      ))}
    </div>
  );
}
