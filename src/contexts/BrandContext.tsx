/* eslint-disable react-refresh/only-export-components */
import { type ReactNode, useEffect } from 'react';

import { BRAND, type BrandInfo } from '../config/brand';

export type { BrandInfo };

/**
 * Identidade da plataforma exposta a componentes.
 *
 * Este módulo era um contexto de troca de marca em runtime: mantinha
 * `activeBrand` ('atlasgr' | 'totaltrac'), reescrevia `--brand`/`--brand-2` via
 * `documentElement.style.setProperty` e marcava `data-brand` no `<html>` para o
 * CSS reagir. A plataforma passou a ter uma marca só (Birth Hub 360), então não
 * há mais estado: `useBrand()` devolve uma constante e as cores vivem
 * inteiramente em `src/styles/globals.css` — nenhum estilo inline sobrescreve
 * token de cor em runtime.
 *
 * O eixo que o seletor de marca de fato controlava no conteúdo (playbook,
 * personas, matriz de objeções, portal Bitrix) não era identidade visual e sim
 * dado comercial: continua existindo (`src/config/playbooks.ts`), mas não é
 * mais nomeado por empresa (`atlasgr`/`totaltrac` removidos por pedido
 * explícito do usuário) — hoje é um único playbook geral.
 */
export function useBrand(): { brandInfo: BrandInfo } {
  return { brandInfo: BRAND };
}

/**
 * Aplica os metadados da marca ao documento uma única vez.
 *
 * Só sobra o que precisa existir fora do CSS: `theme-color` (barra do navegador
 * e da WebView no Android via Capacitor) reagindo a claro/escuro. Fica num
 * provider, e não solto num `useEffect` de tela, porque é uma decisão de
 * aplicação inteira — e para que a limpeza da chave de marca antiga rode uma vez
 * só por sessão.
 */
export function BrandProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // `data-brand` e `selectedBrand` sobreviveriam no navegador de quem já usou
    // a versão de duas marcas: o atributo ainda casaria com seletores CSS de
    // terceiros e a chave ficaria órfã no localStorage para sempre.
    delete document.documentElement.dataset.brand;
    try {
      window.localStorage.removeItem('selectedBrand');
    } catch {
      // localStorage pode estar bloqueado (janela privada, cookies desativados).
      // Limpar chave legada é higiene, não requisito — seguir sem falhar.
    }

    // A classe `.dark` no <html> é a fonte de verdade do tema (ThemeContext já a
    // aplica, inclusive resolvendo a preferência do sistema). Observar a classe
    // cobre os dois casos com uma dependência só — e sem `matchMedia`, que não
    // existe no jsdom dos testes nem em WebView antiga.
    const apply = () => {
      const isDark = document.documentElement.classList.contains('dark');
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', isDark ? BRAND.colors.midnight : BRAND.colors.snow);
    };

    apply();
    if (typeof MutationObserver === 'undefined') return;
    const observer = new MutationObserver(apply);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return <>{children}</>;
}
