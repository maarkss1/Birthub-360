import { Bot, Sparkles, Target } from 'lucide-react';
import { useState } from 'react';
import { OBJECTIONS_DATABASE, PITCHES_BY_SEGMENT } from './data';

export function AiCoachTab() {
  const [selectedSegment, setSelectedSegment] =
    useState<keyof typeof PITCHES_BY_SEGMENT>('transportadora');
  const [callTranscriptInput, setCallTranscriptInput] = useState<string>('');
  const [callAnalysisResult, setCallAnalysisResult] = useState<{
    score: number;
    talkListenRatio: string;
    qualificationTime: string;
    lockedNextStep: boolean;
    strengths: string[];
    improvements: string[];
  } | null>(null);

  const analyzeTranscript = () => {
    if (!callTranscriptInput.trim()) return;
    setCallAnalysisResult({
      score: 78,
      talkListenRatio: 'João 58% vs. Cliente 42%',
      qualificationTime: 'Qualificação aos 8 minutos',
      lockedNextStep: true,
      strengths: [
        'Excelente tom amigável e rapport nos primeiros 2 minutos.',
        'Fez a pergunta de fechamento ("Quando você consegue me dar um retorno?") aos 18 min.',
      ],
      improvements: [
        'Reduzir o tempo de apresentação técnica inicial (falou por 7min seguidos).',
        'Perguntar sobre a quantidade de veículos nos primeiros 3 minutos.',
      ],
    });
  };

  return (
    <div className="space-y-6">
      {/* Gerador de Pitch por Segmento */}
      <div className="p-6 rounded-card-lg border border-line bg-surface shadow-card space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-ink flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand" />
              Gerador de Pitch de 3 Minutos por Segmento
            </h3>
            <p className="text-xs text-ink-2">
              Roteiros sob medida para o João abordar cada perfil de empresa sem perder tempo.
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-surface-2 p-1 rounded-xl border border-line">
            {(Object.keys(PITCHES_BY_SEGMENT) as Array<keyof typeof PITCHES_BY_SEGMENT>).map(
              (seg) => (
                <button
                  type="button"
                  key={seg}
                  onClick={() => setSelectedSegment(seg)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors cursor-pointer ${
                    selectedSegment === seg
                      ? 'bg-brand-active text-on-brand shadow-sm'
                      : 'text-ink-2 hover:text-ink'
                  }`}
                >
                  {seg}
                </button>
              ),
            )}
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-brand/20 bg-soft space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-brand uppercase tracking-wider">
              {PITCHES_BY_SEGMENT[selectedSegment].segmento}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand/10 text-brand">
              Foco de Abordagem
            </span>
          </div>
          <p className="text-xs font-semibold text-ink-2">
            Dor Principal: {PITCHES_BY_SEGMENT[selectedSegment].dor}
          </p>
          <div className="p-3.5 rounded-xl bg-surface border border-line text-xs font-medium text-ink leading-relaxed">
            {PITCHES_BY_SEGMENT[selectedSegment].pitch}
          </div>
          <p className="text-xs font-bold text-brand">
            Pergunta Chave de Qualificação: “{PITCHES_BY_SEGMENT[selectedSegment].perguntaChave}”
          </p>
        </div>
      </div>

      {/* Analisador de Transcrição do Google Meet (IA) */}
      <div className="p-6 rounded-card-lg border border-line bg-surface shadow-card space-y-4">
        <h3 className="text-sm font-black text-ink flex items-center gap-2">
          <Bot className="w-4 h-4 text-brand" />
          Analisador Inteligente de Chamadas (Google Meet / Ata)
        </h3>
        <p className="text-xs text-ink-2">
          Cole a transcrição ou resumo da reunião com o cliente para a IA avaliar tempo de fala,
          qualificação de frota e fechamento do próximo passo.
        </p>

        <div className="space-y-3">
          <textarea
            value={callTranscriptInput}
            onChange={(e) => setCallTranscriptInput(e.target.value)}
            placeholder="Cole aqui o texto da transcrição ou ata da chamada com o cliente..."
            className="w-full h-28 p-3 rounded-xl border border-line bg-surface-2 text-ink text-xs focus:outline-none focus:ring-2 focus:ring-brand"
          />

          <button
            type="button"
            onClick={analyzeTranscript}
            className="px-5 py-2.5 rounded-xl bg-brand-active text-on-brand font-bold text-xs shadow-md hover:brightness-105 transition-colors cursor-pointer flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Analisar Qualidade da Call com IA
          </button>
        </div>

        {callAnalysisResult && (
          <div className="p-5 rounded-2xl border border-ok/30 bg-ok/5 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-ok uppercase">Pontuação da Reunião</span>
              <span className="text-2xl font-black text-ok">{callAnalysisResult.score} / 100</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-surface border border-line">
                <p className="text-[10px] font-bold text-ink-2 uppercase">Divisão de Fala</p>
                <p className="font-bold text-ink">{callAnalysisResult.talkListenRatio}</p>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-line">
                <p className="text-[10px] font-bold text-ink-2 uppercase">Tempo de Qualificação</p>
                <p className="font-bold text-ink">{callAnalysisResult.qualificationTime}</p>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-line">
                <p className="text-[10px] font-bold text-ink-2 uppercase">Próximo Passo Travado?</p>
                <p className="font-bold text-ok">
                  {callAnalysisResult.lockedNextStep ? '✓ Sim (Data/Hora alinhadas)' : '✗ Não'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <p className="font-bold text-ok mb-1">Pontos Fortes:</p>
                <ul className="list-disc pl-4 space-y-1 text-ink-2">
                  {callAnalysisResult.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-bold text-gold mb-1">Ajustes para a Próxima Call:</p>
                <ul className="list-disc pl-4 space-y-1 text-ink-2">
                  {callAnalysisResult.improvements.map((imp, i) => (
                    <li key={i}>{imp}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Simulador de Objeções (Roleplay) */}
      <div className="p-6 rounded-card-lg border border-line bg-surface shadow-card space-y-4">
        <h3 className="text-sm font-black text-ink flex items-center gap-2">
          <Target className="w-4 h-4 text-brand" />
          Matriz de Quebra de Objeções (Treino do João)
        </h3>

        <div className="space-y-3">
          {OBJECTIONS_DATABASE.map((obj) => (
            <div key={obj.id} className="p-4 rounded-2xl border border-line bg-surface-2 space-y-2">
              <p className="text-xs font-black text-brand">{obj.objeção}</p>
              <p className="text-xs text-ink-2">
                <b>Diagnóstico:</b> {obj.diagnostico}
              </p>
              <div className="p-3 rounded-xl bg-surface border border-line text-xs text-ink font-medium leading-relaxed">
                <b>Resposta Recomendada:</b> {obj.respostaRecomendada}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
