import { describe, expect, it } from 'vitest';
import { DeterministicAvatarGenerator } from '../../../../src/lib/brand/avatarGenerator.js';

describe('DeterministicAvatarGenerator (Agente 11)', () => {
  it('gera iniciais corretas para nomes compostos e simples', () => {
    const generator = new DeterministicAvatarGenerator();

    expect(generator.generateInitials('João Reis')).toBe('JR');
    expect(generator.generateInitials('Atlas')).toBe('AT');
    expect(generator.generateInitials('Maria Clara Souza')).toBe('MS');
  });

  it('gera avatar SVG determinístico com cores gradientes institucionais', () => {
    const generator = new DeterministicAvatarGenerator();
    const avatar1 = generator.generateAvatar('Atlas GR', 48);
    const avatar2 = generator.generateAvatar('Atlas GR', 48);

    expect(avatar1.initials).toBe('AG');
    expect(avatar1.svg).toContain('<svg');
    expect(avatar1.svg).toContain('width="48"');
    expect(avatar1.gradientColors).toHaveLength(2);

    // Determinismo: o mesmo nome gera exatamente os mesmos gradientes
    expect(avatar1.svg).toBe(avatar2.svg);
  });
});
