import { useCallback, useEffect, useState } from 'react';

import {
  DEFAULT_PLAYBOOK,
  isPlaybookKey,
  playbookInfo,
  type PlaybookKey,
  type PlaybookInfo,
} from '../config/playbooks';

const STORAGE_KEY = '@birthhub:active-playbook';
/** Chave da versão de duas marcas: lida uma vez para não perder a escolha de quem já usava. */
const LEGACY_STORAGE_KEY = 'selectedBrand';
/** Evento próprio: `storage` só dispara entre abas, não dentro da mesma. */
const CHANGE_EVENT = 'birthhub:active-playbook-change';

function read(): PlaybookKey {
  if (typeof window === 'undefined') return DEFAULT_PLAYBOOK;
  try {
    const stored =
      window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
    return isPlaybookKey(stored) ? stored : DEFAULT_PLAYBOOK;
  } catch {
    // localStorage bloqueado (janela privada, cookies desativados) — o playbook
    // ativo é uma preferência de navegação, então cair no padrão é aceitável.
    return DEFAULT_PLAYBOOK;
  }
}

/**
 * Playbook comercial ativo — qual conjunto de objeções, qualificação, personas
 * e histórico do copiloto está em foco.
 *
 * Substitui `useBrand().activeBrand`, que fazia este mesmo trabalho quando o
 * playbook e a identidade visual do produto eram a mesma coisa. Agora são eixos
 * separados: a marca é única (`src/config/brand.ts`) e isto aqui é dado
 * comercial — ver `src/config/playbooks.ts`.
 *
 * A preferência é por navegador (não por conta): é uma lente de trabalho, não
 * uma permissão. O que cada pessoa PODE ver continua sendo decidido no backend
 * por `organizationId` (ver `src/lib/tenant-prisma.ts`).
 */
export function useActivePlaybook(): {
  playbook: PlaybookKey;
  setPlaybook: (next: PlaybookKey) => void;
  info: PlaybookInfo;
} {
  const [playbook, setPlaybookState] = useState<PlaybookKey>(read);

  useEffect(() => {
    const sync = () => setPlaybookState(read());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const setPlaybook = useCallback((next: PlaybookKey) => {
    setPlaybookState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ver comentário em read(): sem persistência a escolha vale só para esta sessão.
    }
    // Mantém em sincronia as telas que já estão montadas (copiloto flutuante,
    // matriz aberta em outra aba do app) sem precisar de um provider global.
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { playbook, setPlaybook, info: playbookInfo(playbook) };
}
