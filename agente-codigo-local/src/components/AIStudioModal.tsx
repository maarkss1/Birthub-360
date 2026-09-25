import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Music,
  Image as ImageIcon,
  Video,
  Mic,
  Search,
  MapPin,
  MessageSquare,
  X,
  Play,
  Pause,
  Download,
  Upload,
  RefreshCw,
  Send,
  Loader2,
  Bookmark,
  Check,
  Copy,
  ExternalLink,
  Volume2,
  Radio,
  FileAudio,
  Trash2,
  Wand2,
} from 'lucide-react';
import { auth } from '../firebase/config';
import {
  saveAICreation,
  subscribeToAICreations,
  deleteAICreation,
  type SavedAICreation,
} from '../firebase/firestoreService';

interface AIStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'chat' | 'music' | 'image' | 'video' | 'live' | 'grounding' | 'transcribe' | 'saved';
  onInsertCode?: (code: string) => void;
  onNotify?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const AIStudioModal: React.FC<AIStudioModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'chat',
  onInsertCode,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<
    'chat' | 'music' | 'image' | 'video' | 'live' | 'grounding' | 'transcribe' | 'saved'
  >(defaultTab);

  // Synchronize defaultTab when modal opens
  useEffect(() => {
    if (isOpen && defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [isOpen, defaultTab]);

  // Firestore Saved Creations
  const [savedCreations, setSavedCreations] = useState<SavedAICreation[]>([]);
  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeToAICreations(
      (items) => setSavedCreations(items),
      (err) => console.error('Erro ao assinar criações:', err)
    );
    return () => unsub();
  }, [isOpen]);

  // ================= 1. CHATBOT STATE =================
  const [chatModel, setChatModel] = useState<'gemini-3.1-pro-preview' | 'gemini-3.5-flash' | 'gemini-3.1-flash-lite'>('gemini-3.5-flash');
  const [chatRole, setChatRole] = useState<'Software Architect' | 'Full-Stack Mentor' | 'Code Reviewer' | 'Creative Assistant'>('Software Architect');
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'model'; content: string; time: string }>>([
    {
      role: 'model',
      content: 'Olá! Sou seu assistente de inteligência artificial Gemini. Como posso ajudar com sua arquitetura, código ou ideias hoje?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newHistory = [...chatMessages, { role: 'user' as const, content: userMsg, time: now }];
    setChatMessages(newHistory);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
          model: chatModel,
          role: chatRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro na resposta do chat');

      setChatMessages((prev) => [
        ...prev,
        {
          role: 'model',
          content: data.reply || '(Sem resposta)',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err: any) {
      onNotify?.(err.message || 'Falha ao comunicar com o Gemini.', 'error');
    } finally {
      setChatLoading(false);
    }
  };

  // ================= 2. MUSIC (LYRIA) STATE =================
  const [musicPrompt, setMusicPrompt] = useState('');
  const [musicModel, setMusicModel] = useState<'lyria-3-clip-preview' | 'lyria-3-pro-preview'>('lyria-3-clip-preview');
  const [musicImage, setMusicImage] = useState<string | null>(null);
  const [musicLoading, setMusicLoading] = useState(false);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [musicLyrics, setMusicLyrics] = useState<string>('');
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);

  const handleGenerateMusic = async () => {
    if (!musicPrompt.trim() || musicLoading) return;
    setMusicLoading(true);
    setGeneratedAudioUrl(null);
    setMusicLyrics('');

    try {
      const res = await fetch('/api/ai/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: musicPrompt,
          model: musicModel,
          base64Image: musicImage,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar música');

      setGeneratedAudioUrl(data.audioDataUrl);
      setMusicLyrics(data.lyrics || '');
      onNotify?.('Música gerada com sucesso!', 'success');

      // Auto save to Firestore if user logged in
      if (auth.currentUser) {
        await saveAICreation({
          type: 'music',
          title: `Música: ${musicPrompt.slice(0, 30)}...`,
          prompt: musicPrompt,
          model: musicModel,
          content: data.audioDataUrl,
          metadata: JSON.stringify({ lyrics: data.lyrics }),
        });
      }
    } catch (err: any) {
      onNotify?.(err.message || 'Falha ao gerar faixa com Lyria.', 'error');
    } finally {
      setMusicLoading(false);
    }
  };

  // ================= 3. IMAGE GENERATION / EDITING STATE =================
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageAspectRatio, setImageAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4'>('1:1');
  const [editSourceImage, setEditSourceImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim() || imageLoading) return;
    setImageLoading(true);
    setGeneratedImageUrl(null);

    try {
      const res = await fetch('/api/ai/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt,
          base64Image: editSourceImage,
          aspectRatio: imageAspectRatio,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao processar imagem');

      setGeneratedImageUrl(data.imageUrl);
      onNotify?.('Imagem gerada com sucesso!', 'success');

      if (auth.currentUser) {
        await saveAICreation({
          type: 'image',
          title: `Imagem: ${imagePrompt.slice(0, 30)}...`,
          prompt: imagePrompt,
          model: 'gemini-3.1-flash-image-preview',
          content: data.imageUrl,
          metadata: JSON.stringify({ aspectRatio: imageAspectRatio }),
        });
      }
    } catch (err: any) {
      onNotify?.(err.message || 'Falha ao gerar imagem.', 'error');
    } finally {
      setImageLoading(false);
    }
  };

  // ================= 4. VIDEO (VEO 3) STATE =================
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoSourcePhoto, setVideoSourcePhoto] = useState<string | null>(null);
  const [videoAspectRatio, setVideoAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoProgressStatus, setVideoProgressStatus] = useState<string>('');
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

  const handleGenerateVideo = async () => {
    if ((!videoPrompt.trim() && !videoSourcePhoto) || videoLoading) return;
    setVideoLoading(true);
    setGeneratedVideoUrl(null);
    setVideoProgressStatus('Iniciando renderização com Veo 3...');

    try {
      const startRes = await fetch('/api/ai/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: videoPrompt,
          base64Image: videoSourcePhoto,
          aspectRatio: videoAspectRatio,
        }),
      });

      const startData = await startRes.json();
      if (!startRes.ok) throw new Error(startData.error || 'Falha ao iniciar vídeo');

      const operationName = startData.operationName;
      setVideoProgressStatus('Processando quadros de alta resolução...');

      // Polling loop
      let isDone = false;
      let attempts = 0;
      while (!isDone && attempts < 40) {
        await new Promise((r) => setTimeout(r, 6000));
        attempts++;
        setVideoProgressStatus(`Renderizando física e movimento (etapa ${attempts}/30)...`);

        const pollRes = await fetch('/api/ai/video-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operationName }),
        });
        const pollData = await pollRes.json();
        if (pollData.done) {
          isDone = true;
          break;
        }
      }

      if (!isDone) {
        throw new Error('Tempo limite excedido na geração do vídeo.');
      }

      setVideoProgressStatus('Baixando vídeo gerado...');
      const dlRes = await fetch('/api/ai/video-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationName }),
      });
      const dlData = await dlRes.json();
      if (!dlRes.ok) throw new Error(dlData.error || 'Falha no download');

      setGeneratedVideoUrl(dlData.videoDataUrl);
      setVideoProgressStatus('Vídeo pronto!');
      onNotify?.('Vídeo Veo 3 gerado com sucesso!', 'success');

      if (auth.currentUser) {
        await saveAICreation({
          type: 'video',
          title: `Vídeo: ${videoPrompt.slice(0, 30) || 'Animação de foto'}...`,
          prompt: videoPrompt || 'Animação de foto',
          model: 'veo-3.1-fast-generate-preview',
          content: dlData.videoDataUrl,
          metadata: JSON.stringify({ aspectRatio: videoAspectRatio }),
        });
      }
    } catch (err: any) {
      onNotify?.(err.message || 'Falha na renderização de vídeo Veo.', 'error');
    } finally {
      setVideoLoading(false);
      setVideoProgressStatus('');
    }
  };

  // ================= 5. LIVE API (REAL-TIME VOICE) STATE =================
  const [liveConnected, setLiveConnected] = useState(false);
  const [liveListening, setLiveListening] = useState(false);
  const [liveLogs, setLiveLogs] = useState<string[]>(['Pronto para iniciar conversa de voz.']);
  const liveWsRef = useRef<WebSocket | null>(null);
  const audioInputCtxRef = useRef<AudioContext | null>(null);
  const audioOutputCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  const startLiveConversation = async () => {
    try {
      setLiveLogs((prev) => [...prev, 'Conectando ao modelo gemini-3.8-live via WebSocket...']);
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/live-ws`;
      const ws = new WebSocket(wsUrl);
      liveWsRef.current = ws;

      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioOutputCtxRef.current = outputCtx;

      ws.onopen = async () => {
        setLiveConnected(true);
        setLiveLogs((prev) => [...prev, '✓ Conexão WebSocket estabelecida com gemini-3.8-live.']);

        // Start Mic
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          micStreamRef.current = stream;
          const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
          audioInputCtxRef.current = inputCtx;

          const source = inputCtx.createMediaStreamSource(stream);
          const processor = inputCtx.createScriptProcessor(4096, 1, 1);
          source.connect(processor);
          processor.connect(inputCtx.destination);

          processor.onaudioprocess = (e) => {
            if (ws.readyState === WebSocket.OPEN) {
              const inputData = e.inputBuffer.getChannelData(0);
              // Convert Float32Array to 16-bit PCM ArrayBuffer
              const pcm16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                const s = Math.max(-1, Math.min(1, inputData[i]));
                pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
              }
              const bytes = new Uint8Array(pcm16.buffer);
              let binary = '';
              for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
              }
              const base64 = btoa(binary);
              ws.send(JSON.stringify({ audio: base64 }));
            }
          };

          setLiveListening(true);
          setLiveLogs((prev) => [...prev, '🎤 Microfone ativo (16kHz PCM). Pode falar!']);
        } catch (micErr: any) {
          setLiveLogs((prev) => [...prev, `Aviso microfone: ${micErr.message}.`]);
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.status) {
            setLiveLogs((prev) => [...prev, `[Live] Status: ${data.status}`]);
          }
          if (data.error) {
            setLiveLogs((prev) => [...prev, `[Live Erro]: ${data.error}`]);
          }
          if (data.audio && outputCtx) {
            // Play 24kHz PCM audio chunk
            const binary = atob(data.audio);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            const pcm16 = new Int16Array(bytes.buffer);
            const float32 = new Float32Array(pcm16.length);
            for (let i = 0; i < pcm16.length; i++) {
              float32[i] = pcm16[i] / 32768.0;
            }

            const audioBuffer = outputCtx.createBuffer(1, float32.length, 24000);
            audioBuffer.getChannelData(0).set(float32);
            const source = outputCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputCtx.destination);
            source.start();
          }
        } catch (e) {
          // ignore
        }
      };

      ws.onclose = () => {
        setLiveConnected(false);
        setLiveListening(false);
        setLiveLogs((prev) => [...prev, 'Sessão Live encerrada.']);
      };
    } catch (err: any) {
      onNotify?.(err.message || 'Erro ao conectar à Live API.', 'error');
    }
  };

  const stopLiveConversation = () => {
    if (liveWsRef.current) {
      liveWsRef.current.close();
      liveWsRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (audioInputCtxRef.current) {
      audioInputCtxRef.current.close();
      audioInputCtxRef.current = null;
    }
    if (audioOutputCtxRef.current) {
      audioOutputCtxRef.current.close();
      audioOutputCtxRef.current = null;
    }
    setLiveConnected(false);
    setLiveListening(false);
  };

  // ================= 6. GROUNDING (SEARCH & MAPS) STATE =================
  const [groundingPrompt, setGroundingPrompt] = useState('');
  const [groundingType, setGroundingType] = useState<'search' | 'maps'>('search');
  const [groundingLoading, setGroundingLoading] = useState(false);
  const [groundingResponse, setGroundingResponse] = useState<{
    text: string;
    sources: Array<{ title: string; uri: string; type: string }>;
  } | null>(null);

  const handleExecuteGrounding = async () => {
    if (!groundingPrompt.trim() || groundingLoading) return;
    setGroundingLoading(true);
    setGroundingResponse(null);

    try {
      let location: { latitude: number; longitude: number } | undefined;
      if (groundingType === 'maps' && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 });
          });
          location = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
        } catch {
          // Default location if geolocation permission not granted
          location = { latitude: -23.5505, longitude: -46.6333 }; // São Paulo
        }
      }

      const res = await fetch('/api/ai/grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: groundingPrompt,
          type: groundingType,
          location,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao consultar Grounding');

      setGroundingResponse(data);
      onNotify?.(`Consulta com ${groundingType === 'search' ? 'Google Search' : 'Google Maps'} concluída!`, 'success');

      if (auth.currentUser) {
        await saveAICreation({
          type: groundingType === 'search' ? 'search_grounding' : 'maps_grounding',
          title: `${groundingType === 'search' ? 'Busca' : 'Mapa'}: ${groundingPrompt.slice(0, 30)}...`,
          prompt: groundingPrompt,
          model: 'gemini-3.5-flash',
          content: data.text,
          metadata: JSON.stringify({ sources: data.sources }),
        });
      }
    } catch (err: any) {
      onNotify?.(err.message || 'Falha na consulta ancorada.', 'error');
    } finally {
      setGroundingLoading(false);
    }
  };

  // ================= 7. TRANSCRIBE AUDIO STATE =================
  const [isRecordingMic, setIsRecordingMic] = useState(false);
  const [transcribeLoading, setTranscribeLoading] = useState(false);
  const [transcriptionText, setTranscriptionText] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startMicRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((t) => t.stop());

        // Convert blob to base64
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = reader.result as string;
          await sendAudioToTranscribe(base64, 'audio/webm');
        };
        reader.readAsDataURL(audioBlob);
      };

      recorder.start();
      setIsRecordingMic(true);
      onNotify?.('Gravando microfone...', 'info');
    } catch (err: any) {
      onNotify?.(err.message || 'Não foi possível acessar o microfone.', 'error');
    }
  };

  const stopMicRecording = () => {
    if (mediaRecorderRef.current && isRecordingMic) {
      mediaRecorderRef.current.stop();
      setIsRecordingMic(false);
    }
  };

  const handleAudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      await sendAudioToTranscribe(base64, file.type || 'audio/mp3');
    };
    reader.readAsDataURL(file);
  };

  const sendAudioToTranscribe = async (base64Audio: string, mimeType: string) => {
    setTranscribeLoading(true);
    try {
      const res = await fetch('/api/ai/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Audio,
          mimeType,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro na transcrição');

      setTranscriptionText(data.transcription || '');
      onNotify?.('Áudio transcrito com sucesso via gemini-3.5-transcribe!', 'success');

      if (auth.currentUser) {
        await saveAICreation({
          type: 'transcription',
          title: `Transcrição: ${data.transcription.slice(0, 30)}...`,
          prompt: 'Transcrição de áudio',
          model: 'gemini-3.5-transcribe',
          content: data.transcription,
        });
      }
    } catch (err: any) {
      onNotify?.(err.message || 'Falha ao transcrever áudio.', 'error');
    } finally {
      setTranscribeLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <div className="bg-[#14141e] border border-[#272738] rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-[#252538] bg-[#0f0f17]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white text-base">Estúdio Multimodal de IA</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Gemini & Lyria & Veo
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Chatbot, Música Lyria, Imagens, Vídeos Veo, Voz Live, Grounding e Transcrição
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopLiveConversation();
              onClose();
            }}
            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-[#202030] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 py-2 border-b border-[#252538] bg-[#12121c] overflow-x-auto">
          {[
            { id: 'chat', label: 'Chatbot Gemini', icon: MessageSquare },
            { id: 'music', label: 'Música (Lyria)', icon: Music },
            { id: 'image', label: 'Criar & Editar Imagens', icon: ImageIcon },
            { id: 'video', label: 'Vídeo (Veo 3)', icon: Video },
            { id: 'live', label: 'Voz ao Vivo (Live API)', icon: Radio },
            { id: 'grounding', label: 'Grounding (Busca & Maps)', icon: Search },
            { id: 'transcribe', label: 'Transcrever Áudio', icon: Mic },
            { id: 'saved', label: 'Salvos no Firestore', icon: Bookmark },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (activeTab === 'live' && tab.id !== 'live') stopLiveConversation();
                  setActiveTab(tab.id as any);
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  active
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-[#1a1a28]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#14141e]">
          {/* TAB 1: GEMINI CHATBOT */}
          {activeTab === 'chat' && (
            <div className="flex flex-col h-full space-y-4">
              {/* Role & Model Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#1b1b28] border border-[#29293d]">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-medium">Modelo:</span>
                  <select
                    value={chatModel}
                    onChange={(e: any) => setChatModel(e.target.value)}
                    className="bg-[#12121b] border border-[#33334d] text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="gemini-3.5-flash">gemini-3.5-flash (Tarefas Gerais)</option>
                    <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (Tarefas Complexas)</option>
                    <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Ultra Rápido)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-medium">Função (System Prompt):</span>
                  <select
                    value={chatRole}
                    onChange={(e: any) => setChatRole(e.target.value)}
                    className="bg-[#12121b] border border-[#33334d] text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Software Architect">Arquiteto de Software</option>
                    <option value="Full-Stack Mentor">Mentor Full-Stack</option>
                    <option value="Code Reviewer">Auditor de Segurança & Reviewer</option>
                    <option value="Creative Assistant">Assistente Criativo</option>
                  </select>
                </div>
              </div>

              {/* Chat Thread */}
              <div className="flex-1 min-h-[300px] overflow-y-auto space-y-3 p-4 rounded-xl bg-[#101018] border border-[#252538]">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${
                      msg.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mb-1 px-1">
                      <span>{msg.role === 'user' ? 'Você' : `Gemini (${chatRole})`}</span>
                      <span>•</span>
                      <span>{msg.time}</span>
                    </div>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap ${
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white rounded-tr-none'
                          : 'bg-[#1b1b2a] text-gray-200 border border-[#2d2d42] rounded-tl-none shadow-md'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex items-center gap-2 text-xs text-indigo-400 p-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Gemini está raciocinando e redigindo resposta...</span>
                  </div>
                )}
                <div ref={chatScrollRef} />
              </div>

              {/* Input row */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendChatMessage()}
                  placeholder={`Pergunte ao Gemini (${chatRole})...`}
                  className="flex-1 bg-[#12121b] border border-[#2d2d40] rounded-xl px-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 shadow-inner"
                />
                <button
                  onClick={handleSendChatMessage}
                  disabled={!chatInput.trim() || chatLoading}
                  className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-2 disabled:opacity-50 transition-all"
                >
                  <Send className="w-4 h-4" />
                  Enviar
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: MUSIC (LYRIA) */}
          {activeTab === 'music' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-indigo-500/10 border border-purple-500/20">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Music className="w-4 h-4 text-purple-400" />
                  Geração de Música com Lyria 3
                </h4>
                <p className="text-xs text-gray-300 mt-1">
                  Gere faixas musicais instrumentais e vocais completas com alta fidelidade a partir de prompts descritivos ou combinados com imagens de referência.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-300 mb-1 block">
                      Descrição da Música (Gênero, Humor, Instrumentos):
                    </label>
                    <textarea
                      rows={3}
                      value={musicPrompt}
                      onChange={(e) => setMusicPrompt(e.target.value)}
                      placeholder="Ex: Trilha sonora orquestral cinematográfica épica para uma cena de exploração espacial com violinos, sintetizadores e ritmo crescente..."
                      className="w-full bg-[#12121b] border border-[#2e2e42] rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <div>
                      <span className="text-xs text-gray-400 block mb-1">Modelo Lyria:</span>
                      <select
                        value={musicModel}
                        onChange={(e: any) => setMusicModel(e.target.value)}
                        className="bg-[#12121b] border border-[#33334d] text-white text-xs rounded-lg px-3 py-1.5"
                      >
                        <option value="lyria-3-clip-preview">lyria-3-clip-preview (Clipes de até 30s)</option>
                        <option value="lyria-3-pro-preview">lyria-3-pro-preview (Faixas Completas)</option>
                      </select>
                    </div>

                    <div>
                      <span className="text-xs text-gray-400 block mb-1">Imagem Inspiracional (Opcional):</span>
                      <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#20202e] border border-[#33334a] text-gray-300 text-xs cursor-pointer hover:bg-[#28283a]">
                        <Upload className="w-3.5 h-3.5" />
                        {musicImage ? 'Imagem Selecionada' : 'Carregar Imagem'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const r = new FileReader();
                              r.onloadend = () => setMusicImage(r.result as string);
                              r.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateMusic}
                    disabled={!musicPrompt.trim() || musicLoading}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50"
                  >
                    {musicLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Music className="w-4 h-4" />}
                    {musicLoading ? 'Compondo e Renderizando Áudio...' : 'Gerar Música com Lyria'}
                  </button>
                </div>

                {/* Music Player & Output */}
                <div className="p-4 rounded-xl bg-[#12121c] border border-[#252538] flex flex-col justify-center items-center text-center space-y-3">
                  {generatedAudioUrl ? (
                    <div className="w-full space-y-3">
                      <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-500/30 mx-auto flex items-center justify-center text-purple-400 animate-pulse">
                        <Volume2 className="w-8 h-8" />
                      </div>
                      <p className="text-xs font-medium text-white truncate">{musicPrompt}</p>

                      <audio
                        ref={musicAudioRef}
                        controls
                        src={generatedAudioUrl}
                        className="w-full h-8"
                      />

                      {musicLyrics && (
                        <div className="p-2.5 rounded-lg bg-[#181826] border border-[#2b2b3d] text-left">
                          <span className="text-[10px] text-gray-400 font-bold block mb-1 uppercase">Letra / Poema Gerado:</span>
                          <p className="text-xs text-purple-300 italic whitespace-pre-wrap">{musicLyrics}</p>
                        </div>
                      )}

                      <a
                        href={generatedAudioUrl}
                        download="lyria-track.wav"
                        className="flex items-center justify-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-medium py-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Baixar Áudio (.wav)
                      </a>
                    </div>
                  ) : (
                    <div className="py-8">
                      <Music className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                      <p className="text-xs text-gray-500">Nenhuma faixa gerada ainda.</p>
                      <p className="text-[11px] text-gray-600">Insira um prompt acima para compor.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CREATE & EDIT IMAGES */}
          {activeTab === 'image' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-indigo-400" />
                  Criação e Edição de Imagens com gemini-3.1-flash-image-preview
                </h4>
                <p className="text-xs text-gray-300 mt-1">
                  Crie ilustrações, diagramas de arquitetura e concept arts a partir de texto ou envie uma foto para editar e adicionar elementos.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-300 mb-1 block">
                      Prompt de Criação ou Instrução de Edição:
                    </label>
                    <textarea
                      rows={3}
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      placeholder="Ex: Um desenvolvedor futurista em um escritório com visual neon cyberpunk, trabalhando em múltiplos monitores holográficos..."
                      className="w-full bg-[#12121b] border border-[#2e2e42] rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <div>
                      <span className="text-xs text-gray-400 block mb-1">Proporção (Aspect Ratio):</span>
                      <div className="flex items-center gap-1.5">
                        {(['1:1', '16:9', '9:16', '4:3', '3:4'] as const).map((ratio) => (
                          <button
                            key={ratio}
                            onClick={() => setImageAspectRatio(ratio)}
                            className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                              imageAspectRatio === ratio
                                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                                : 'bg-[#1b1b28] text-gray-400 border-[#2f2f42] hover:text-white'
                            }`}
                          >
                            {ratio}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-xs text-gray-400 block mb-1">Imagem para Edição (Opcional):</span>
                      <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#20202e] border border-[#33334a] text-gray-300 text-xs cursor-pointer hover:bg-[#28283a]">
                        <Upload className="w-3.5 h-3.5" />
                        {editSourceImage ? 'Imagem Pronta' : 'Enviar Foto'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const r = new FileReader();
                              r.onloadend = () => setEditSourceImage(r.result as string);
                              r.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateImage}
                    disabled={!imagePrompt.trim() || imageLoading}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
                  >
                    {imageLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    {imageLoading ? 'Renderizando Imagem...' : 'Gerar Imagem com Gemini'}
                  </button>
                </div>

                {/* Image Output Preview */}
                <div className="p-3 rounded-xl bg-[#12121c] border border-[#252538] flex flex-col items-center justify-center min-h-[220px]">
                  {generatedImageUrl ? (
                    <div className="space-y-3 w-full text-center">
                      <img
                        src={generatedImageUrl}
                        alt="Gerada por IA"
                        className="w-full max-h-[320px] object-contain rounded-lg border border-[#303045] shadow-lg"
                      />
                      <a
                        href={generatedImageUrl}
                        download="gemini-generated.png"
                        className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium py-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Baixar Imagem (.png)
                      </a>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <ImageIcon className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                      <p className="text-xs text-gray-500">Nenhuma imagem gerada ainda.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: VIDEO (VEO 3) */}
          {activeTab === 'video' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Video className="w-4 h-4 text-rose-400" />
                  Geração e Animação de Vídeo com Veo 3 (veo-3.1-fast-generate-preview)
                </h4>
                <p className="text-xs text-gray-300 mt-1">
                  Gere vídeos cinematográficos a partir de texto ou envie uma foto para animá-la em vídeo com aspect ratio 16:9 (paisagem) ou 9:16 (retrato).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-300 mb-1 block">
                      Prompt de Movimento / Cena:
                    </label>
                    <textarea
                      rows={3}
                      value={videoPrompt}
                      onChange={(e) => setVideoPrompt(e.target.value)}
                      placeholder="Ex: Drone sobrevoando montanhas com iluminação dourada do pôr do sol e nevoeiro cinematográfico..."
                      className="w-full bg-[#12121b] border border-[#2e2e42] rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <div>
                      <span className="text-xs text-gray-400 block mb-1">Proporção Obrigatória:</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setVideoAspectRatio('16:9')}
                          className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-all ${
                            videoAspectRatio === '16:9'
                              ? 'bg-rose-600 text-white border-rose-500 shadow-md'
                              : 'bg-[#1b1b28] text-gray-400 border-[#2f2f42]'
                          }`}
                        >
                          16:9 (Paisagem)
                        </button>
                        <button
                          onClick={() => setVideoAspectRatio('9:16')}
                          className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-all ${
                            videoAspectRatio === '9:16'
                              ? 'bg-rose-600 text-white border-rose-500 shadow-md'
                              : 'bg-[#1b1b28] text-gray-400 border-[#2f2f42]'
                          }`}
                        >
                          9:16 (Retrato)
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-xs text-gray-400 block mb-1">Foto para Animar (Opcional):</span>
                      <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#20202e] border border-[#33334a] text-gray-300 text-xs cursor-pointer hover:bg-[#28283a]">
                        <Upload className="w-3.5 h-3.5" />
                        {videoSourcePhoto ? 'Foto Carregada' : 'Upload Foto'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const r = new FileReader();
                              r.onloadend = () => setVideoSourcePhoto(r.result as string);
                              r.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateVideo}
                    disabled={(!videoPrompt.trim() && !videoSourcePhoto) || videoLoading}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/30 transition-all disabled:opacity-50"
                  >
                    {videoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                    {videoLoading ? 'Processando Vídeo Veo 3...' : 'Gerar Vídeo com Veo 3'}
                  </button>

                  {videoProgressStatus && (
                    <div className="flex items-center gap-2 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-lg animate-pulse">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{videoProgressStatus}</span>
                    </div>
                  )}
                </div>

                {/* Video Player Output */}
                <div className="p-3 rounded-xl bg-[#12121c] border border-[#252538] flex flex-col items-center justify-center min-h-[220px]">
                  {generatedVideoUrl ? (
                    <div className="space-y-3 w-full text-center">
                      <video
                        controls
                        src={generatedVideoUrl}
                        className="w-full max-h-[320px] rounded-lg border border-[#303045] shadow-lg"
                      />
                      <a
                        href={generatedVideoUrl}
                        download="veo3-video.mp4"
                        className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-medium py-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Baixar Vídeo (.mp4)
                      </a>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Video className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                      <p className="text-xs text-gray-500">Nenhum vídeo renderizado ainda.</p>
                      <p className="text-[11px] text-gray-600">A geração Veo leva cerca de 1 a 2 minutos.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: LIVE API (VOICE CONVERSATION) */}
          {activeTab === 'live' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400" />
                  Conversa por Voz em Tempo Real (Live API - gemini-3.8-live)
                </h4>
                <p className="text-xs text-gray-300 mt-1">
                  Converse naturalmente por voz com o Gemini com latência ultrabaixa. O áudio do seu microfone é transmitido em PCM 16kHz e as respostas de voz são sintetizadas a 24kHz.
                </p>
              </div>

              <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-[#111119] border border-[#26263a] space-y-6 text-center">
                <div
                  className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
                    liveConnected
                      ? 'bg-emerald-500/20 text-emerald-400 shadow-xl shadow-emerald-500/30 ring-4 ring-emerald-500/30 animate-pulse'
                      : 'bg-gray-800 text-gray-500'
                  }`}
                >
                  <Mic className="w-10 h-10" />
                </div>

                <div>
                  <h5 className="font-semibold text-white text-base">
                    {liveConnected ? 'Conectado ao gemini-3.8-live' : 'Sessão de Voz Inativa'}
                  </h5>
                  <p className="text-xs text-gray-400 mt-1 max-w-sm">
                    {liveConnected
                      ? 'Fale livremente. O modelo escuta em tempo real e responde verbalmente.'
                      : 'Clique abaixo para autorizar o microfone e iniciar uma chamada com o modelo.'}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {!liveConnected ? (
                    <button
                      onClick={startLiveConversation}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all"
                    >
                      <Radio className="w-4 h-4" />
                      Iniciar Conversa de Voz
                    </button>
                  ) : (
                    <button
                      onClick={stopLiveConversation}
                      className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-lg shadow-rose-600/30 flex items-center gap-2 transition-all"
                    >
                      <X className="w-4 h-4" />
                      Encerrar Chamada
                    </button>
                  )}
                </div>

                {/* Live Logs Terminal */}
                <div className="w-full max-w-lg p-3 rounded-xl bg-[#0c0c12] border border-[#222233] text-left font-mono text-[11px] text-gray-400 max-h-32 overflow-y-auto space-y-1">
                  {liveLogs.map((log, i) => (
                    <div key={i} className="leading-tight">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: GROUNDING (SEARCH & MAPS) */}
          {activeTab === 'grounding' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Search className="w-4 h-4 text-blue-400" />
                  Grounding com Google Search & Google Maps (gemini-3.5-flash)
                </h4>
                <p className="text-xs text-gray-300 mt-1">
                  Obtenha respostas precisas e atualizadas ancoradas diretamente na web ou com informações geográficas verificadas do Google Maps.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-300 font-medium">Tipo de Ancoragem:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setGroundingType('search')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
                        groundingType === 'search'
                          ? 'bg-blue-600 text-white border-blue-500'
                          : 'bg-[#1b1b28] text-gray-400 border-[#2d2d40]'
                      }`}
                    >
                      <Search className="w-3.5 h-3.5" />
                      Google Search Grounding
                    </button>
                    <button
                      onClick={() => setGroundingType('maps')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
                        groundingType === 'maps'
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-[#1b1b28] text-gray-400 border-[#2d2d40]'
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      Google Maps Grounding
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={groundingPrompt}
                    onChange={(e) => setGroundingPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleExecuteGrounding()}
                    placeholder={
                      groundingType === 'search'
                        ? 'Ex: Quais foram as novidades do lançamento do React 19 ou da última conferência Google I/O?'
                        : 'Ex: Melhores cafeterias para trabalhar com laptop próximas ou restaurantes em São Paulo?'
                    }
                    className="flex-1 bg-[#12121b] border border-[#2d2d40] rounded-xl px-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={handleExecuteGrounding}
                    disabled={!groundingPrompt.trim() || groundingLoading}
                    className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 flex items-center gap-2 disabled:opacity-50"
                  >
                    {groundingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Pesquisar
                  </button>
                </div>

                {/* Grounding Output */}
                {groundingResponse && (
                  <div className="p-4 rounded-xl bg-[#12121c] border border-[#252538] space-y-4">
                    <div>
                      <h5 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                        Resposta Ancorada
                      </h5>
                      <div className="text-xs text-gray-200 leading-relaxed whitespace-pre-wrap">
                        {groundingResponse.text}
                      </div>
                    </div>

                    {groundingResponse.sources.length > 0 && (
                      <div className="border-t border-[#26263b] pt-3">
                        <h6 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                          Fontes e Links Verificados:
                        </h6>
                        <div className="flex flex-wrap gap-2">
                          {groundingResponse.sources.map((s, idx) => (
                            <a
                              key={idx}
                              href={s.uri}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1c1c2a] border border-[#303046] text-blue-400 hover:text-blue-300 text-xs transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span className="truncate max-w-[240px]">{s.title || s.uri}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 7: TRANSCRIBE AUDIO */}
          {activeTab === 'transcribe' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/20">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Mic className="w-4 h-4 text-teal-400" />
                  Transcrição de Áudio com gemini-3.5-transcribe
                </h4>
                <p className="text-xs text-gray-300 mt-1">
                  Grave áudio pelo microfone ou envie um arquivo de voz para transcrever automaticamente o conteúdo com pontuação e termos técnicos precisos.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Inputs */}
                <div className="space-y-4 p-5 rounded-xl bg-[#12121c] border border-[#252538]">
                  <h5 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                    1. Captura ou Upload
                  </h5>

                  <div className="flex flex-col gap-3">
                    {!isRecordingMic ? (
                      <button
                        onClick={startMicRecording}
                        disabled={transcribeLoading}
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs shadow-lg shadow-teal-600/30 transition-all"
                      >
                        <Mic className="w-4 h-4" />
                        Gravar com Microfone
                      </button>
                    ) : (
                      <button
                        onClick={stopMicRecording}
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-lg shadow-rose-600/30 animate-pulse transition-all"
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-white" />
                        Parar Gravação e Transcrever
                      </button>
                    )}

                    <div className="relative flex py-1 items-center">
                      <div className="flex-grow border-t border-[#29293e]" />
                      <span className="flex-shrink mx-2 text-[10px] text-gray-500 uppercase">ou envie um arquivo</span>
                      <div className="flex-grow border-t border-[#29293e]" />
                    </div>

                    <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#1a1a27] border border-[#303046] text-gray-300 text-xs cursor-pointer hover:bg-[#222233] transition-all">
                      <Upload className="w-4 h-4 text-teal-400" />
                      Upload de Arquivo de Áudio (.mp3, .wav, .webm)
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={handleAudioFileUpload}
                      />
                    </label>
                  </div>
                </div>

                {/* Transcription Output */}
                <div className="space-y-3 p-5 rounded-xl bg-[#12121c] border border-[#252538] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                        2. Texto Transcrito
                      </h5>
                      {transcriptionText && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(transcriptionText);
                              onNotify?.('Texto copiado para a área de transferência!', 'success');
                            }}
                            className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            Copiar
                          </button>
                          {onInsertCode && (
                            <button
                              onClick={() => {
                                onInsertCode(transcriptionText);
                                onNotify?.('Inserido no editor!', 'success');
                              }}
                              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                            >
                              Inserir no Editor
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {transcribeLoading ? (
                      <div className="py-12 flex flex-col items-center justify-center text-teal-400 gap-2">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span className="text-xs">Processando áudio com gemini-3.5-transcribe...</span>
                      </div>
                    ) : transcriptionText ? (
                      <div className="p-3 rounded-lg bg-[#0e0e16] border border-[#252538] text-xs text-gray-200 leading-relaxed max-h-[220px] overflow-y-auto whitespace-pre-wrap">
                        {transcriptionText}
                      </div>
                    ) : (
                      <div className="py-12 text-center text-gray-500 text-xs">
                        Nenhum áudio transcrito ainda. Use o microfone ou envie um arquivo.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: SAVED CREATIONS IN FIRESTORE */}
          {activeTab === 'saved' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Bookmark className="w-4 h-4 text-amber-400" />
                    Criações Sincronizadas no Firestore
                  </h4>
                  <p className="text-xs text-gray-400">
                    Músicas, imagens, vídeos e transcrições salvas na nuvem com Firebase.
                  </p>
                </div>
              </div>

              {savedCreations.length === 0 ? (
                <div className="py-16 text-center">
                  <Bookmark className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-400 font-medium">Nenhuma criação salva ainda no Firestore.</p>
                  <p className="text-[11px] text-gray-600 mt-1">
                    Gere músicas, imagens ou vídeos enquanto autenticado para sincronizá-los aqui.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedCreations.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl bg-[#12121c] border border-[#242436] space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                            {item.type}
                          </span>
                          <button
                            onClick={() => deleteAICreation(item.id)}
                            className="text-gray-500 hover:text-rose-400 p-1 rounded"
                            title="Remover"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <h5 className="font-semibold text-white text-xs truncate">{item.title}</h5>
                        <p className="text-[11px] text-gray-400 line-clamp-2">{item.prompt}</p>
                      </div>

                      {/* Content preview */}
                      {item.type === 'image' && item.content && (
                        <img
                          src={item.content}
                          alt={item.title}
                          className="w-full h-32 object-cover rounded-lg border border-[#2d2d42]"
                        />
                      )}
                      {item.type === 'music' && item.content && (
                        <audio controls src={item.content} className="w-full h-8" />
                      )}
                      {item.type === 'video' && item.content && (
                        <video controls src={item.content} className="w-full h-32 object-cover rounded-lg" />
                      )}
                      {item.type === 'transcription' && item.content && (
                        <p className="text-xs text-teal-300 bg-[#0e0e16] p-2 rounded max-h-20 overflow-y-auto">
                          {item.content}
                        </p>
                      )}

                      <div className="text-[10px] text-gray-500 flex items-center justify-between pt-2 border-t border-[#1e1e2d]">
                        <span>Modelo: {item.model}</span>
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
