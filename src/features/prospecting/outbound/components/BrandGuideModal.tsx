import React from 'react';
import { AtlasLogo } from './AtlasLogo.js';
import { 
  X, 
  ShieldCheck, 
  Sparkles, 
  Target, 
  HeartHandshake, 
  Check, 
  Copy,
  Layers,
  Palette,
  Type
} from 'lucide-react';

interface BrandGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BrandGuideModal: React.FC<BrandGuideModalProps> = ({ isOpen, onClose }) => {
  const [copiedHex, setCopiedHex] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const copyColor = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 1800);
  };

  const primaryColors = [
    {
      name: 'Laranja Atlas Primário',
      pantone: 'Pantone 172 C',
      hex: '#FF5618',
      rgb: '255, 86, 24',
      cmyk: 'C:0 M:84 Y:100 K:0',
      bgClass: 'bg-[#FF5618]',
      textDark: false
    },
    {
      name: 'Chumbo Corporativo',
      pantone: 'Pantone 447 C',
      hex: '#333333',
      rgb: '51, 51, 51',
      cmyk: 'C:73 M:67 Y:65 K:80',
      bgClass: 'bg-[#333333]',
      textDark: false
    },
    {
      name: 'Branco Puro',
      pantone: 'Pantone 000 C',
      hex: '#FFFFFF',
      rgb: '255, 255, 255',
      cmyk: 'C:0 M:0 Y:0 K:0',
      bgClass: 'bg-[#FFFFFF]',
      textDark: true
    }
  ];

  const secondaryColors = [
    {
      name: 'Amarelo Dourado',
      pantone: 'Pantone 109 C',
      hex: '#FFC500',
      rgb: '255, 197, 0',
      bgClass: 'bg-[#FFC500]',
      textDark: true
    },
    {
      name: 'Âmbar Enérgico',
      pantone: 'Pantone 151 C',
      hex: '#FF8008',
      rgb: '255, 128, 8',
      bgClass: 'bg-[#FF8008]',
      textDark: false
    },
    {
      name: 'Laranja Intenso',
      pantone: 'Pantone 2018 C',
      hex: '#FF6B10',
      rgb: '255, 107, 16',
      bgClass: 'bg-[#FF6B10]',
      textDark: false
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <AtlasLogo variant="with-subtitle" size="md" />
            <span className="hidden sm:inline-block h-6 w-px bg-slate-800" />
            <span className="hidden sm:inline-block text-xs font-semibold text-slate-400">
              Manual de Identidade Visual v1.0
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-8 overflow-y-auto flex-1">
          {/* Propósito & Valores */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-[#FF5618]/15 to-transparent p-5 rounded-2xl border border-[#FF5618]/30 space-y-2">
              <div className="flex items-center gap-2 text-[#FF5618] font-bold text-xs uppercase tracking-wider">
                <Target className="w-4 h-4" /> Propósito da Marca
              </div>
              <h3 className="text-lg font-bold text-white leading-snug">
                "Nós conectamos pessoas e tecnologia gerando valores com segurança e inovação."
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed pt-1">
                A Atlas atua há mais de 17 anos gerenciando riscos em processos logísticos para transportadoras rodoviárias de carga com excelência e tecnologia de ponta.
              </p>
            </div>

            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                <HeartHandshake className="w-4 h-4" /> Valores Atlas
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {['Perseverança', 'Transparência', 'Simplicidade', 'Atitude de Dono', 'Inovação'].map((val, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-700/80 text-xs font-semibold text-slate-200"
                  >
                    {val}
                  </span>
                ))}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed pt-1">
                Pilares estruturantes aplicados em cada copy, mensagem de prospecção e relacionamento consultivo B2B.
              </p>
            </div>
          </div>

          {/* Paleta de Cores Primárias */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Palette className="w-4 h-4 text-[#FF5618]" /> Cores Primárias Oficiais
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {primaryColors.map((col, idx) => (
                <div
                  key={idx}
                  onClick={() => copyColor(col.hex)}
                  className="group cursor-pointer bg-slate-950 rounded-2xl p-3.5 border border-slate-800 hover:border-slate-600 transition space-y-3"
                >
                  <div className={`h-16 rounded-xl ${col.bgClass} flex items-center justify-end p-2.5 shadow-inner border border-white/10`}>
                    <span className="text-[10px] opacity-0 group-hover:opacity-100 bg-black/60 text-white px-2 py-0.5 rounded transition flex items-center gap-1">
                      {copiedHex === col.hex ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedHex === col.hex ? 'Copiado!' : 'Copiar Hex'}</span>
                    </span>
                  </div>
                  <div>
                    <div className="font-bold text-xs text-white">{col.name}</div>
                    <div className="text-[11px] font-mono text-[#FF5618]">{col.pantone}</div>
                    <div className="text-[10px] font-mono text-slate-400 mt-1">HEX: {col.hex}</div>
                    <div className="text-[9px] text-slate-500">{col.cmyk}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Paleta Secundária */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#FFC500]" /> Cores Secundárias e Apoio
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {secondaryColors.map((col, idx) => (
                <div
                  key={idx}
                  onClick={() => copyColor(col.hex)}
                  className="group cursor-pointer bg-slate-950 rounded-2xl p-3.5 border border-slate-800 hover:border-slate-600 transition space-y-3"
                >
                  <div className={`h-12 rounded-xl ${col.bgClass} flex items-center justify-end p-2.5 shadow-inner border border-white/10`}>
                    <span className="text-[10px] opacity-0 group-hover:opacity-100 bg-black/60 text-white px-2 py-0.5 rounded transition">
                      {copiedHex === col.hex ? 'Copiado!' : col.hex}
                    </span>
                  </div>
                  <div>
                    <div className="font-bold text-xs text-white">{col.name}</div>
                    <div className="text-[11px] font-mono text-slate-400">{col.pantone}</div>
                    <div className="text-[10px] font-mono text-[#FF8008]">HEX: {col.hex}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tipografia */}
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Type className="w-4 h-4 text-[#FF5618]" /> Diretrizes de Tipografia (Mont & Montserrat)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
              <div className="space-y-1">
                <div className="font-bold text-white text-sm">Família Primária: Mont</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Utilizada no logotipo, títulos e materiais impressos. Transmite solidez, inovação e modernidade geométrica.
                </p>
              </div>
              <div className="space-y-1">
                <div className="font-bold text-white text-sm">Família Secundária: Montserrat</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Aplicada nesta aplicação web para garantir legibilidade de alta performance no ecossistema digital.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#FF5618] hover:bg-[#FF6B10] text-white text-xs font-bold rounded-xl transition"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
