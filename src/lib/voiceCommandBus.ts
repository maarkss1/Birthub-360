// Contrato entre telas que precisam de comandos de voz próprios (hoje: Mesa de Tratamento — timer
// Pomodoro e sincronização da fila) e o microfone único do app (`VoiceCommandWidget.tsx`, montado
// em `MainLayout`, irmão da tela ativa — mesmo problema estrutural que `navigationBus.ts` já
// resolve para navegação, mas aqui várias telas/widgets podem estar montados ao mesmo tempo e
// registrar comandos simultaneamente (ex.: `PomodoroWidget` e `MesaTratamento` na mesma tela), por
// isso um Map por dono em vez de um único slot como o `navigationBus`.

export interface VoiceCommand {
  /** Basta uma destas palavras/frases aparecer na fala reconhecida (comparação por `includes`,
   *  já em minúsculas) para disparar o comando. */
  keywords: string[];
  /** Frase de exemplo mostrada no prompt "Diga: ..." do assistente enquanto esta tela estiver
   *  ativa (ex.: "iniciar foco") — não é comparada, só exibida. */
  phrase: string;
  /** Mensagem de confirmação mostrada como `lastAction` depois que o comando dispara (ex.:
   *  "Bloco de foco iniciado"). */
  confirmationLabel: string;
  handler: () => void;
}

const registrations = new Map<string, VoiceCommand[]>();

export const voiceCommandBus = {
  /** Registra (substituindo) o conjunto de comandos de um dono — `ownerId` estável por componente
   *  (ex.: `'mesa-tratamento:pomodoro'`). Chame de novo a cada mudança de callbacks (mesmo padrão
   *  de um `useEffect` com dependências) e com `[]` (ou via `unregister`) no cleanup do unmount. */
  registerCommands(ownerId: string, commands: VoiceCommand[]) {
    if (commands.length === 0) {
      registrations.delete(ownerId);
    } else {
      registrations.set(ownerId, commands);
    }
  },

  unregister(ownerId: string) {
    registrations.delete(ownerId);
  },

  /** Tenta despachar `textLower` (já em minúsculas) contra todos os comandos registrados, de
   *  qualquer dono — primeiro que bater dispara e vence. Devolve o `confirmationLabel` do comando
   *  disparado, ou `null` quando nenhum comando de nenhuma tela ativa reconheceu a fala (o
   *  chamador cai para o vocabulário global de navegação). */
  tryHandle(textLower: string): string | null {
    for (const commands of registrations.values()) {
      for (const command of commands) {
        if (command.keywords.some((k) => textLower.includes(k))) {
          command.handler();
          return command.confirmationLabel;
        }
      }
    }
    return null;
  },

  /** Frases de exemplo de todos os comandos ativos agora — usado pelo painel do assistente de voz
   *  pra sugerir o vocabulário disponível na tela atual, além do vocabulário global fixo. */
  getPhrases(): string[] {
    return Array.from(registrations.values()).flatMap((commands) => commands.map((c) => c.phrase));
  },
};
