import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { TOOL_BINDINGS } from '../../src/features/job-roles/config/tool-bindings';
import { CAPABILITY_CODES } from '../../src/config/capability-catalog';

/**
 * PROMPT 3B — Hardening Final, item 2: "Cada available:true precisa apontar para símbolo/operação
 * real... Binding não comprovado: available=false, reason=FUTURE_TOOL."
 *
 * Este teste é a comprovação em si: para cada binding `verification: 'VERIFIED'` em
 * `tool-bindings.ts`, (1) o arquivo de `evidencePath` realmente existe no repositório, (2) o
 * arquivo realmente contém o texto do símbolo declarado, e (3) importar o módulo real confirma
 * que `exportName` é de fato exportado e — quando `methodName` está preenchido (o real trabalho é
 * um MÉTODO de instância, ex.: `LeadUseCases.findLeadById`) — que esse método existe no protótipo
 * da classe. Se um símbolo for renomeado/removido do código real, este teste quebra — o registry
 * nunca fica desatualizado silenciosamente.
 *
 * Não viola `no-cross-feature-imports` (dependency-cruiser): `npm run lint:architecture` escaneia
 * só `src server.ts worker.ts` (ver package.json), nunca `tests/**` — testes podem importar
 * qualquer módulo de qualquer feature para fins de verificação, só o CÓDIGO DE PRODUÇÃO do
 * Capability Engine não pode (e de fato não faz — `tool-bindings.ts` só guarda o caminho como
 * string).
 */
describe('Tool Bindings — evidência real de cada binding VERIFIED (PROMPT 3B item 2)', () => {
  it('todo capabilityCode referenciado em TOOL_BINDINGS existe no catálogo canônico', () => {
    for (const binding of TOOL_BINDINGS) {
      expect(CAPABILITY_CODES, `capability "${binding.capabilityCode}" não está no catálogo`).toContain(
        binding.capabilityCode,
      );
    }
  });

  it('todo capabilityCode do catálogo canônico tem um binding registrado (nenhum órfão)', () => {
    const bound = new Set(TOOL_BINDINGS.map((b) => b.capabilityCode));
    for (const code of CAPABILITY_CODES) {
      expect(bound.has(code), `capability "${code}" não tem ToolBinding registrado`).toBe(true);
    }
  });

  it('binding VERIFIED sempre tem evidencePath + exportName preenchidos; UNVERIFIED sempre null', () => {
    for (const binding of TOOL_BINDINGS) {
      if (binding.verification === 'VERIFIED') {
        expect(binding.evidencePath, `${binding.capabilityCode} VERIFIED sem evidencePath`).not.toBeNull();
        expect(binding.exportName, `${binding.capabilityCode} VERIFIED sem exportName`).not.toBeNull();
        expect(binding.available).toBe(true);
      } else {
        expect(binding.evidencePath, `${binding.capabilityCode} UNVERIFIED com evidencePath`).toBeNull();
        expect(binding.exportName, `${binding.capabilityCode} UNVERIFIED com exportName`).toBeNull();
        expect(binding.methodName, `${binding.capabilityCode} UNVERIFIED com methodName`).toBeNull();
        expect(binding.available).toBe(false);
        expect(['SOURCE_REQUIRED', 'FUTURE_TOOL', 'TOOL_UNAVAILABLE']).toContain(binding.reason);
      }
    }
  });

  const verifiedBindings = TOOL_BINDINGS.filter((b) => b.verification === 'VERIFIED');

  it.each(verifiedBindings)(
    '$capabilityCode -> $evidencePath ($exportName): arquivo existe de verdade',
    (binding) => {
      const fullPath = path.resolve(process.cwd(), binding.evidencePath!);
      expect(existsSync(fullPath), `arquivo não encontrado: ${binding.evidencePath}`).toBe(true);
    },
  );

  it.each(verifiedBindings)(
    '$capabilityCode -> $evidencePath ($exportName): o texto do arquivo declara o símbolo',
    (binding) => {
      const fullPath = path.resolve(process.cwd(), binding.evidencePath!);
      const content = readFileSync(fullPath, 'utf-8');
      const exportName = binding.exportName!;
      const declaredExport =
        content.includes(`class ${exportName}`) ||
        content.includes(`function ${exportName}`) ||
        content.includes(`const ${exportName} `) ||
        content.includes(`const ${exportName}=`);
      expect(declaredExport, `export "${exportName}" não encontrado no texto de ${binding.evidencePath}`).toBe(
        true,
      );
      if (binding.methodName) {
        const declaredMethod = new RegExp(`\\b${binding.methodName}\\s*\\(`).test(content);
        expect(
          declaredMethod,
          `método "${binding.methodName}" não encontrado no texto de ${binding.evidencePath}`,
        ).toBe(true);
      }
    },
  );

  it.each(verifiedBindings)(
    '$capabilityCode -> $evidencePath ($exportName): importar o módulo real confirma que o símbolo é executável',
    async (binding) => {
      const modulePath = `../../${binding.evidencePath!.replace(/\.ts$/, '.js')}`;
      const mod: Record<string, unknown> = await import(modulePath);
      const exported = mod[binding.exportName!];
      expect(exported, `"${binding.exportName}" não é exportado por ${binding.evidencePath}`).toBeDefined();

      if (binding.methodName) {
        // exportName é uma classe — o trabalho real é um método de instância no protótipo.
        const prototype = (exported as { prototype?: Record<string, unknown> }).prototype;
        expect(prototype, `"${binding.exportName}" não é uma classe (sem prototype)`).toBeDefined();
        const method = prototype?.[binding.methodName];
        expect(
          typeof method,
          `"${binding.exportName}.prototype.${binding.methodName}" não é uma função`,
        ).toBe('function');
      } else {
        // exportName já é a própria função/const executável (ex.: createCalendarEvent, bitrixRoutes).
        const kind = typeof exported;
        const isCallableOrRouter = kind === 'function' || (kind === 'object' && exported !== null);
        expect(
          isCallableOrRouter,
          `"${binding.exportName}" em ${binding.evidencePath} tem tipo inesperado: ${kind}`,
        ).toBe(true);
      }
    },
  );
});
