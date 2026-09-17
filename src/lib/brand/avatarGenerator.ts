export interface AvatarResult {
  svg: string;
  initials: string;
  gradientColors: [string, string];
}

export class DeterministicAvatarGenerator {
  private readonly colorPairs: Array<[string, string]> = [
    ['#4f46e5', '#06b6d4'], // Indigo -> Cyan
    ['#7c3aed', '#ec4899'], // Violet -> Pink
    ['#059669', '#10b981'], // Emerald
    ['#d97706', '#f59e0b'], // Amber
    ['#2563eb', '#3b82f6'], // Blue
  ];

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  generateInitials(name: string): string {
    const clean = name.trim();
    if (!clean) return 'BH';

    const parts = clean.split(/\s+/);
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }

    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  generateAvatar(name: string, size = 40): AvatarResult {
    const initials = this.generateInitials(name);
    const hash = this.simpleHash(name);
    const colorPair = this.colorPairs[hash % this.colorPairs.length];

    const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad-${hash}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${colorPair[0]}" />
          <stop offset="100%" stop-color="${colorPair[1]}" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${size / 4}" fill="url(#grad-${hash})" />
      <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="${size * 0.4}" font-weight="bold">${initials}</text>
    </svg>`;

    return {
      svg,
      initials,
      gradientColors: colorPair,
    };
  }
}

export const deterministicAvatarGenerator = new DeterministicAvatarGenerator();
