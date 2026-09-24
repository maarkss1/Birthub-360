import React, { useState } from 'react';
import { Phone, Globe, Shield, Search, Music, Play, Loader2, Download } from 'lucide-react';

export default function TelephonyPage() {
  const [musicPrompt, setMusicPrompt] = useState('Uma música de elevador relaxante com toques de bossa nova, agradável e suave.');
  const [isGeneratingMusic, setIsGeneratingMusic] = useState(false);
  const [generatedMusicUrl, setGeneratedMusicUrl] = useState<string | null>(null);
  const [musicError, setMusicError] = useState<string | null>(null);

  const handleGenerateMusic = async () => {
    setIsGeneratingMusic(true);
    setMusicError(null);
    setGeneratedMusicUrl(null);
    
    try {
      const res = await fetch('/api/generate-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: musicPrompt })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar música');
      
      const binary = atob(data.audioBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: data.mimeType || 'audio/wav' });
      setGeneratedMusicUrl(URL.createObjectURL(blob));
    } catch (err: unknown) {
      setMusicError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsGeneratingMusic(false);
    }
  };

  return (
    <div className="space-y-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Telefonia & Números</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
             <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-6">
                 <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                     <Phone className="h-4 w-4 text-brand" />
                     Comprar Número (DID)
                 </h3>
                 <div className="flex gap-4">
                     <select className="p-2 border border-slate-300 rounded-lg bg-white flex-1">
                         <option>Brasil (+55)</option>
                         <option>United States (+1)</option>
                     </select>
                     <input type="text" placeholder="DDD / Área (ex: 11)" className="p-2 border border-slate-300 rounded-lg w-32" />
                     <button className="px-4 py-2 bg-brand text-white rounded-lg hover:opacity-90 font-medium flex items-center gap-2">
                         <Search className="h-4 w-4" /> Buscar
                     </button>
                 </div>
                 <div className="mt-6 space-y-2">
                     <div className="p-3 border border-slate-200 rounded-lg flex justify-between items-center hover:border-brand/40 hover:bg-brand-50 cursor-pointer transition-colors">
                         <div className="font-mono text-lg text-slate-700">+55 11 4004-9999</div>
                         <div className="text-sm font-bold text-green-600">R$ 15,00/mês</div>
                     </div>
                 </div>
             </div>

             <div className="space-y-6">
                 <div className="bg-white rounded-xl border border-slate-200 p-6">
                     <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                         <Globe className="h-4 w-4 text-purple-600" />
                         BYOC (Bring Your Own Carrier)
                     </h3>
                     <p className="text-xs text-slate-500 mb-4">Conecte seu próprio tronco SIP/Twilio.</p>
                     <button className="w-full py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">Configurar Tronco</button>
                 </div>

                 <div className="bg-white rounded-xl border border-slate-200 p-6">
                     <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                         <Shield className="h-4 w-4 text-green-600" />
                         Compliance
                     </h3>
                     <div className="flex items-center justify-between py-2 border-b border-slate-100">
                         <span className="text-sm text-slate-600">Mascaramento</span>
                         <div className="w-8 h-4 bg-green-500 rounded-full relative"><div className="w-2 h-2 bg-white rounded-full absolute right-1 top-1"></div></div>
                     </div>
                     <div className="flex items-center justify-between py-2">
                         <span className="text-sm text-slate-600">Gravação Auto</span>
                         <div className="w-8 h-4 bg-slate-300 rounded-full relative"><div className="w-2 h-2 bg-white rounded-full absolute left-1 top-1"></div></div>
                     </div>
                 </div>
             </div>
        </div>

        <h3 className="font-bold text-slate-800 mb-4 mt-8">Gerador de Música de Espera (URA)</h3>
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8 flex flex-col md:flex-row gap-6">
            <div className="flex-1 space-y-4">
                <p className="text-sm text-slate-600">
                    Crie uma música de espera exclusiva para seus clientes usando Inteligência Artificial. Descreva o estilo, instrumentos e o clima desejado.
                </p>
                <textarea
                    value={musicPrompt}
                    onChange={(e) => setMusicPrompt(e.target.value)}
                    className="w-full p-4 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand outline-none resize-none h-24"
                    placeholder="Ex: Uma música calma de piano com violão, estilo corporativo acolhedor..."
                />
                {musicError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
                        {musicError}
                    </div>
                )}
                <button
                    onClick={handleGenerateMusic}
                    disabled={isGeneratingMusic || !musicPrompt.trim()}
                    className="px-6 py-2 bg-brand text-white rounded-lg hover:opacity-90 font-medium flex items-center justify-center gap-2 disabled:opacity-50 w-full md:w-auto transition-opacity"
                >
                    {isGeneratingMusic ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Gerando música (pode levar 1-2 minutos)...</>
                    ) : (
                        <><Music className="h-4 w-4" /> Gerar Música (30s)</>
                    )}
                </button>
            </div>
            
            <div className="w-full md:w-1/3 flex flex-col justify-center border-t md:border-t-0 md:border-l border-slate-100 pt-6 md:pt-0 md:pl-6">
                {generatedMusicUrl ? (
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <Play className="h-4 w-4 text-green-600" /> Pré-visualização
                        </h4>
                        <audio src={generatedMusicUrl} controls className="w-full h-10" />
                        <a 
                            href={generatedMusicUrl} 
                            download="musica_espera.wav"
                            className="w-full py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center justify-center gap-2"
                        >
                            <Download className="h-4 w-4" /> Baixar Áudio (.wav)
                        </a>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 h-full gap-3 opacity-60">
                        <Music className="h-8 w-8" />
                        <span className="text-sm text-center">A música gerada aparecerá aqui</span>
                    </div>
                )}
            </div>
        </div>

        <h3 className="font-bold text-slate-800 mb-4">Meus Números</h3>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium">
                    <tr>
                        <th className="p-3">Número</th>
                        <th className="p-3">Provedor</th>
                        <th className="p-3">Destino (Webhook)</th>
                        <th className="p-3">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    <tr>
                        <td className="p-3 font-mono">+55 11 99999-0000</td>
                        <td className="p-3"><span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold">TWILIO</span></td>
                        <td className="p-3 text-slate-500 truncate max-w-xs">https://api.birthhub.com/voice/incoming/...</td>
                        <td className="p-3"><span className="w-2 h-2 bg-green-500 rounded-full inline-block mr-2"></span>Ativo</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
  );
}