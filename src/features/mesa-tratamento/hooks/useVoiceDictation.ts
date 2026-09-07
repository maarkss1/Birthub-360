import { useCallback, useRef, useState } from 'react';
import { toast } from '../../../lib/toast';

// SpeechRecognitionLike / Window.SpeechRecognition são tipos ambient globais definidos em
// src/types/speech-recognition.d.ts (Web Speech API não faz parte da lib "DOM" do TypeScript) —
// mesmo tipo já usado por VoiceCommandWidget.tsx/RoleplayHub.tsx, reaproveitado aqui de propósito
// (duas declarações `declare global` incompatíveis para o mesmo tipo o TypeScript rejeita).

function formatVoiceText(raw: string): string {
  if (!raw) return '';
  let s = raw.trim();
  s = s.replace(/\s+vírgula\b/gi, ',');
  s = s.replace(/\s+ponto final\b/gi, '.');
  s = s.replace(/\s+ponto e vírgula\b/gi, ';');
  s = s.replace(/\s+dois pontos\b/gi, ':');
  s = s.replace(/\s+ponto de interrogação\b/gi, '?');
  s = s.replace(/\s+ponto de exclamação\b/gi, '!');
  s = s.replace(/\s+(novo parágrafo|nova linha|parágrafo)\b/gi, '\n');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Ditado por voz para a observação da Mesa de Tratamento — portado do protótipo standalone
 * `acompanhamento-sdr` (js/voice-service.js). Não porta o modo "comando de voz sempre ligado" do
 * protótipo: o app já tem um widget de comando de voz próprio (`VoiceCommandWidget`), então um
 * segundo microfone sempre ativo aqui competiria pelo mesmo hardware sem necessidade — só o
 * ditado pontual (aperta, fala, solta) faz sentido embutido neste formulário.
 */
export function useVoiceDictation(onResult: (text: string) => void) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [isDictating, setIsDictating] = useState(false);
  const isSupported =
    typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    if (!isSupported) {
      toast.error('Ditado por voz não é suportado neste navegador. Use Google Chrome ou Edge.');
      return;
    }
    if (isDictating) {
      stop();
      return;
    }

    const RecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!RecognitionCtor) return;

    const recognition = new RecognitionCtor();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      const text = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(' ');
      onResult(formatVoiceText(text));
    };
    recognition.onerror = () => {
      setIsDictating(false);
    };
    recognition.onend = () => {
      setIsDictating(false);
    };

    recognitionRef.current = recognition;
    setIsDictating(true);
    try {
      recognition.start();
    } catch {
      setIsDictating(false);
      toast.error('Não foi possível iniciar o microfone.');
    }
  }, [isSupported, isDictating, onResult, stop]);

  return { isSupported, isDictating, start, stop };
}
