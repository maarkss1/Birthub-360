import React, { useState, useRef, useEffect } from 'react';
import { Play, Mic, MicOff, Save, RotateCcw } from 'lucide-react';
import { logger } from '../../lib/logger';

interface SpeechRecognitionResultLike {
  0: { transcript: string };
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export default function PlaygroundPage() {
  const [prompt, setPrompt] = useState('Você é um assistente útil e amigável.');
  const [messages, setMessages] = useState<{role: 'user'|'agent', text: string}[]>([]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [enableSearchGrounding, setEnableSearchGrounding] = useState(false);
  const [enableTTS, setEnableTTS] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const originalInputRef = useRef<string>('');

  // Audio waveform refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') audioContextRef.current.close();
    };
  }, []);

  const drawWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;
    
    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;
    if (!analyser || !dataArray) return;
    
    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);
      
      canvasCtx.fillStyle = '#f8fafc'; // Matches bg-slate-50
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
      
      canvasCtx.lineWidth = 3;
      // Get --brand-color or default to fallback blue-600
      const brandColor = getComputedStyle(document.documentElement).getPropertyValue('--brand-color').trim() || '#2563eb';
      canvasCtx.strokeStyle = brandColor;
      
      canvasCtx.beginPath();
      
      const sliceWidth = (canvas.width * 1.0) / dataArray.length;
      let x = 0;
      
      for (let i = 0; i < dataArray.length; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        
        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }
        
        x += sliceWidth;
      }
      
      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();
    };
    
    draw();
  };

  const startAudioWave = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      dataArrayRef.current = dataArray;
      
      // Delay slightly for canvas sizing if container takes a millisecond to mount
      requestAnimationFrame(() => {
        drawWaveform();
      });
    } catch (err) {
      logger.error('Error fetching stream for waveform', { err });
    }
  };

  const stopAudioWave = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    
    const canvas = canvasRef.current;
    if (canvas) {
      const canvasCtx = canvas.getContext('2d');
      if (canvasCtx) {
        canvasCtx.fillStyle = '#f8fafc';
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = '#cbd5e1';
        canvasCtx.beginPath();
        canvasCtx.moveTo(0, canvas.height / 2);
        canvasCtx.lineTo(canvas.width, canvas.height / 2);
        canvasCtx.stroke();
      }
    }
  };

  const handleSend = async () => {
      if (isListening && recognitionRef.current) {
          recognitionRef.current.stop();
      }
      stopAudioWave();
      if (!input.trim() || isLoading) return;
      
      const userMsg = { role: 'user' as const, text: input };
      const currentMessages = [...messages, userMsg];
      setMessages(currentMessages);
      setInput('');
      setIsLoading(true);

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            currentMessages,
            enableSearchGrounding
          })
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Falha ao comunicar com agente');
        }

        const data = await response.json();
        setMessages(prev => [...prev, { role: 'agent', text: data.text }]);

        if (enableTTS && data.text) {
          try {
            if ('speechSynthesis' in window) {
              window.speechSynthesis.cancel(); // Stop any previous speech
              const utterance = new SpeechSynthesisUtterance(data.text);
              utterance.lang = 'pt-BR';
              utterance.rate = 1.0;
              window.speechSynthesis.speak(utterance);
            }
          } catch (e) {
            logger.error('Falha ao tocar áudio local', { e });
          }
        }
      } catch (error: unknown) {
        logger.error('Error sending message in playground', { error });
        const message = error instanceof Error ? error.message : String(error);
        setMessages(prev => [...prev, { role: 'agent', text: `[Erro]: ${message}` }]);
      } finally {
        setIsLoading(false);
      }
  };

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      stopAudioWave();
      return;
    }

    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      alert('Seu navegador não suporta reconhecimento de voz.');
      return;
    }

    originalInputRef.current = input;
    const { SpeechRecognition: SpeechRecognitionCtor, webkitSpeechRecognition } = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SpeechRecognition = SpeechRecognitionCtor || webkitSpeechRecognition;
    const recognition = new SpeechRecognition!();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'pt-BR';

    recognition.onstart = () => {
      setIsListening(true);
      startAudioWave();
    };
    
    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      const transcript = Array.from(event.results)
        .map((result: SpeechRecognitionResultLike) => result[0].transcript)
        .join('');

      setInput(originalInputRef.current + (originalInputRef.current ? ' ' : '') + transcript);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      logger.error('Erro de reconhecimento de voz', { error: event.error });
      setIsListening(false);
      stopAudioWave();
    };

    recognition.onend = () => {
      setIsListening(false);
      stopAudioWave();
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] overflow-hidden bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-200 bg-white flex justify-between items-center shrink-0">
            <div>
                <h1 className="text-xl font-bold text-slate-900">Agent Playground</h1>
                <p className="text-sm text-slate-500">Teste prompts e configurações em tempo real</p>
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={() => setMessages([])}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium flex items-center gap-2"
                >
                    <RotateCcw className="h-4 w-4" /> Resetar
                </button>
                <button className="px-4 py-2 bg-brand text-white rounded-lg hover:opacity-95 text-sm font-medium flex items-center gap-2 transition-opacity">
                    <Save className="h-4 w-4" /> Salvar Versão
                </button>
            </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
            {/* Config Panel */}
            <div className="w-1/3 border-r border-slate-200 bg-slate-50 p-6 overflow-y-auto">
                <h3 className="font-bold text-slate-800 mb-4">Configuração do Prompt</h3>
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full h-[400px] p-4 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-brand outline-none resize-none"
                    placeholder="Digite o System Prompt aqui..."
                />
                <div className="mt-4 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Modelo</label>
                        <select className="w-full p-2 border border-slate-300 rounded-lg bg-white text-sm">
                            <option>GPT-4 Turbo</option>
                            <option>GPT-3.5 Turbo</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Temperatura (0.7)</label>
                        <input type="range" className="w-full accent-brand" min="0" max="1" step="0.1" />
                    </div>
                    <div className="pt-2 border-t border-slate-200">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={enableSearchGrounding} 
                                onChange={(e) => setEnableSearchGrounding(e.target.checked)}
                                className="w-4 h-4 text-brand rounded focus:ring-brand accent-brand"
                            />
                            <span className="text-sm font-bold text-slate-700">Ativar Pesquisa no Google (Grounding)</span>
                        </label>
                        <p className="text-xs text-slate-500 mt-1 ml-6 mb-4">Permite que o agente acesse a internet para responder com dados atualizados.</p>
                        
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={enableTTS} 
                                onChange={(e) => setEnableTTS(e.target.checked)}
                                className="w-4 h-4 text-brand rounded focus:ring-brand accent-brand"
                            />
                            <span className="text-sm font-bold text-slate-700">Ativar Retorno por Voz (TTS)</span>
                        </label>
                        <p className="text-xs text-slate-500 mt-1 ml-6">O agente irá falar a resposta gerada usando a voz padrão (Kore).</p>
                    </div>
                </div>
            </div>

            {/* Chat Preview */}
            <div className="flex-1 flex flex-col bg-white">
                <div className="flex-1 p-6 overflow-y-auto space-y-4">
                    {messages.length === 0 && (
                        <div className="text-center text-slate-400 mt-20">
                            <Play className="h-12 w-12 mx-auto mb-2 opacity-20" />
                            <p>Inicie a conversa para testar</p>
                        </div>
                    )}
                    {messages.map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                                m.role === 'user' ? 'bg-brand text-white rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none'
                            }`}>
                                {m.text}
                            </div>
                        </div>
                    ))}
                </div>
                
                {/* Audio Waveform Real-time Visualizer */}
                {isListening && (
                    <div className="px-6 py-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-4 transition-all animate-fade-in">
                        <div className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                           <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></span>
                           <span className="text-red-600">Reconhecimento ativo...</span>
                        </div>
                        <div className="flex-1 max-w-xs flex justify-end">
                            <canvas 
                                ref={canvasRef} 
                                width={240} 
                                height={32} 
                                className="h-8 w-full rounded bg-slate-50 border border-slate-200"
                            />
                        </div>
                    </div>
                )}

                <div className="p-4 border-t border-slate-200">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Digite uma mensagem de teste..."
                            className="flex-1 p-3 border border-slate-300 rounded-full focus:outline-none focus:border-brand"
                        />
                        <button onClick={handleSend} className="p-3 bg-brand text-white rounded-full hover:opacity-90 font-medium">
                            <Play className="h-5 w-5 fill-current" />
                        </button>
                        <button 
                            onClick={toggleListening}
                            className={`p-3 rounded-full transition-all ${
                                isListening 
                                    ? 'bg-red-100 text-red-600 hover:bg-red-200 animate-pulse' 
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}