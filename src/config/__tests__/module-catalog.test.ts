import { describe, expect, it } from 'vitest';
import { EXTERNAL_LINKS, isModuleKey, MODULE_CATALOG, MODULE_KEYS } from '../module-catalog';

/**
 * Regressão para DOCBRAND-002/005/012 (docs/audits/repository-debt-audit): o módulo "Proposta
 * Comercial" (PropostaComercialHub.tsx, cockpits Birth Hub 360, proposta nomeada a um
 * cliente terceiro) e os atalhos hardcoded de EXTERNAL_LINKS para domínios `*.birthhub360.com.br`
 * foram aposentados/generalizados em b06ba649/edcf6b0d. Este teste trava a reintrodução
 * silenciosa de conteúdo comercial vertical-específico (Birth Hub 360) em MODULE_CATALOG ou
 * EXTERNAL_LINKS — qualquer módulo ou atalho novo aqui precisa ser genérico o suficiente para
 * qualquer tenant, consistente com o ICP vertical-agnóstico do produto.
 */
describe('module-catalog não reintroduz conteúdo vertical-específico da Birth Hub 360 (DOCBRAND-002/005/012)', () => {
  const RETIRED_KEYS = [
    'proposta-comercial',
    'treinamento-birthhub360',
    'hub-inteligencia-marketing',
  ];

  it('MODULE_CATALOG não contém as chaves de módulo aposentadas', () => {
    for (const key of RETIRED_KEYS) {
      expect(MODULE_KEYS as string[]).not.toContain(key);
      expect(isModuleKey(key)).toBe(false);
    }
  });

  it('MODULE_CATALOG não expõe rótulo/descrição com terminologia de GR/logística/seguro de carga', () => {
    const verticalTerms = /\bGR\b|logíst|seguro|apólice|carga|frete|transpacheco/i;
    for (const entry of MODULE_CATALOG) {
      expect(entry.label).not.toMatch(verticalTerms);
      expect(entry.description).not.toMatch(verticalTerms);
    }
  });

  it('EXTERNAL_LINKS não hardcoda domínios *.birthhub360.com.br nem bitrix24 de terceiro nomeado', () => {
    for (const link of EXTERNAL_LINKS) {
      expect(link.url).not.toMatch(/birthhub360\.(com\.br|bitrix24\.com\.br)/i);
      expect(link.url).not.toMatch(/^https?:\/\/birthhub360\.bitrix24\.com\.br(?:\/|$)/i);
    }
  });
});
