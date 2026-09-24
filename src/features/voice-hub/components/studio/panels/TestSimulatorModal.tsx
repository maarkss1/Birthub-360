import React, { useState, useRef, useEffect } from 'react';
import { X, Mic, MicOff, PhoneOff, User, Bot, Loader2, AlertTriangle } from 'lucide-react';
import { logger } from '../../../lib/logger';
import { useStudioStore } from '../../../store/useStudioStore';
import { validationEngine } from '../../../lib/studio/ValidationEngine';

interface TestSimulatorModalProps {
  onClose: () => void;
}

export function TestSimulatorModal({ onClose }: TestSimulatorModalProps) {
  // This modal is a rule-based text/voice demo chat (see handleSendText -> /api/chat below), NOT
  // an execution of the graph being edited: the Voice Runtime (Agente 04) doesn't consume
  // Workflow.nodes/edges yet (see .agents/handoffs/onda-2/07-para-04-contrato-execucao-workflow.md),
  // and /api/chat is a fixed keyword-matcher with zero awareness of this workflow's prompt/LLM
  // nodes. It must never be presented as if it reflects real graph behavior — hence the mock
  // banner and the node-driven title/subtitle below instead of a hardcoded bot name.
  const { nodes, edges } = useStudioStore();
  const startNode = nodes.find(n => n.type === 'start');
  const promptNode = nodes.find(n => n.type === 'prompt');
  const botLabel = promptNode?.data.label || startNode?.data.label || 'Fluxo sem nome';
  const validation = validationEngine.validate(nodes, edges);
  const errorCount = validation.issues.filter(i => i.type === 'error').length;

  const [messages, setMessages] = useState<{role: 'user'|'agent', text: string}[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [, setTranscript] = useState('');
  
  const recognitionRef = useRef<any>(null);
  
  // Audio waveform refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // Initial welcome message
    setMessages([{ role: 'agent', text: 'Olá! Este é um chat de demonstração (mock) para testar a UI de teste de voz. Clique no microfone e diga algo.' }]);
    
    return () => {
      stopAudioWave();
      if (recognitionRef.current) recognitionRef.current.stop();
      if (window.speechSynthesis) window.speechSynthesis.cancel();
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
      
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      
      canvasCtx.lineWidth = 3;
      canvasCtx.strokeStyle = '#60a5fa'; // Blue 400 for glowing effect
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
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      dataArrayRef.current = dataArray;
      
      requestAnimationFrame(drawWaveform);
    } catch (err) {
      logger.error('Error fetching stream', { err });
    }
  };

  const stopAudioWave = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') audioContextRef.current.close();
    
    const canvas = canvasRef.current;
    if (canvas) {
      const canvasCtx = canvas.getContext('2d');
      if (canvasCtx) canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleSendText = async (text: string) => {
    if (!text.trim() || isLoading) return;
    
    const userMsg = { role: 'user' as const, text };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentMessages: [...messages, userMsg] })
      });

      if (!response.ok) throw new Error('Falha na comunicação');
      
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'agent', text: data.text }]);
      
      // Native TTS
      if ('speechSynthesis' in window && data.text) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(data.text);
        utterance.lang = 'pt-BR';
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      logger.error('Error sending message in test simulator', { err });
      setMessages(prev => [...prev, { role: 'agent', text: 'Erro de comunicação.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      stopAudioWave();
      return;
    }

    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      alert('Seu navegador não suporta reconhecimento de voz.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'pt-BR';

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
      startAudioWave();
    };
    
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      handleSendText(text);
    };

    recognition.onerror = () => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-[450px] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-slate-700/50">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-brand/20">
                <Bot className="w-5 h-5" />
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full"></div>
            </div>
            <div>
              <h3 className="text-white font-semibold leading-none mb-1">{botLabel}</h3>
              <p className="text-amber-400 text-xs font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                Modo Demo (mock) — não usa o prompt/LLM deste fluxo
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-800 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mock disclosure banner: this is not the Voice Runtime, and never claims to be. */}
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-300 text-[11px] leading-snug">
          Este chat responde com regras fixas de demonstração (endpoint /api/chat), não com o LLM/prompt configurado no Canvas. Use o "Runtime Simulator" no painel inferior para uma simulação que percorre os nós reais deste fluxo.
          {errorCount > 0 && (
            <div className="mt-1 flex items-center gap-1.5 text-red-300 font-semibold">
              <AlertTriangle className="w-3 h-3 shrink-0" /> Este fluxo tem {errorCount} erro(s) de validação — mesmo respostas "corretas" aqui não significam que o fluxo real funcionaria.
            </div>
          )}
        </div>

        {/* Chat Area */}
        <div className="h-[314px] overflow-y-auto p-4 flex flex-col gap-4 bg-slate-900/50 scrollbar-thin scrollbar-thumb-slate-700">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
              {m.role === 'agent' && (
                <div className="w-6 h-6 rounded-full bg-brand flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                m.role === 'user' 
                  ? 'bg-slate-700 text-white rounded-tr-sm' 
                  : 'bg-slate-800 text-slate-100 rounded-tl-sm border border-slate-700'
              }`}>
                {m.text}
              </div>
              {m.role === 'user' && (
                <div className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center shrink-0 mt-1">
                  <User className="w-3.5 h-3.5 text-slate-300" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start gap-2">
              <div className="w-6 h-6 rounded-full bg-brand flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="bg-slate-800 p-3 rounded-2xl rounded-tl-sm border border-slate-700 flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-brand animate-spin" />
                <span className="text-slate-400 text-xs">Processando...</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Area */}
        <div className="p-6 bg-slate-900 border-t border-slate-800 flex flex-col items-center">
          <div className="w-full h-12 mb-6 flex justify-center items-center">
            {isListening ? (
              <canvas ref={canvasRef} width={200} height={40} className="w-full max-w-[200px]" />
            ) : (
              <p className="text-slate-500 text-sm font-medium">Toque no microfone para falar</p>
            )}
          </div>
          
          <div className="flex items-center gap-6">
            <button 
              onClick={toggleListening}
              className={`w-16 h-16 flex items-center justify-center rounded-full shadow-lg transition-all ${
                isListening 
                  ? 'bg-red-500 text-white shadow-red-500/20 animate-pulse'
                  : 'bg-indigo-600 text-white hover:bg-indigo-500 hover:scale-105 shadow-indigo-600/20'
              }`}
            >
              {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>
            
            <button 
              onClick={onClose}
              className="w-12 h-12 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 transition-all hover:text-white"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
