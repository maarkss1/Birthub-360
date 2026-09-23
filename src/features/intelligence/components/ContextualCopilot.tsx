import { useState } from 'react';
import { Bot, Sparkles, Send, X } from 'lucide-react';

export type CopilotContext = 'CRM' | 'PROSPECTING' | 'MANAGEMENT';

interface ContextualCopilotProps {
  context: CopilotContext;
  onClose?: () => void;
}

export function ContextualCopilot({ context, onClose }: ContextualCopilotProps) {
  const [input, setInput] = useState('');
  
  const suggestions = {
    CRM: [
      "Quais as oportunidades mais quentes hoje?",
      "Resumo da conta atual",
      "Quais tarefas estão atrasadas?"
    ],
    PROSPECTING: [
      "Quem abordar primeiro nesta lista?",
      "Gerar e-mail frio para este lead",
      "Qual o melhor horário para ligar?"
    ],
    MANAGEMENT: [
      "Visão geral de metas deste mês",
      "Qual vendedor está precisando de ajuda?",
      "Previsão de fechamento da semana"
    ]
  };
  
  const currentSuggestions = suggestions[context] || [];

  return (
    <div className="flex flex-col h-full w-80 bg-white border-l border-gray-200 shadow-xl overflow-hidden rounded-l-2xl">
      <div className="bg-indigo-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot size={20} />
          <h3 className="font-semibold text-sm">Copilot ({context})</h3>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-white hover:text-indigo-200 transition-colors">
            <X size={18} />
          </button>
        )}
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col gap-4">
        <div className="bg-white p-3 rounded-lg shadow-sm text-sm text-gray-700 border border-gray-100">
          Olá! Como posso te ajudar na sua visão de <strong>{context}</strong> hoje?
        </div>
        
        <div className="mt-2">
          <p className="text-xs text-gray-500 font-medium mb-2 uppercase tracking-wide">Sugestões de contexto</p>
          <div className="flex flex-col gap-2">
            {currentSuggestions.map((suggestion, idx) => (
              <button 
                key={idx}
                className="text-left text-xs bg-indigo-50 text-indigo-700 p-2 rounded-md hover:bg-indigo-100 transition-colors flex items-center gap-2 border border-indigo-100"
                onClick={() => setInput(suggestion)}
              >
                <Sparkles size={12} className="shrink-0" />
                <span>{suggestion}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="p-3 bg-white border-t border-gray-200">
        <div className="relative flex items-center">
          <input
            type="text"
            className="w-full pl-3 pr-10 py-2 bg-gray-100 border-transparent rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-transparent transition-all outline-none"
            placeholder="Pergunte à IA..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button className="absolute right-2 p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors">
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
