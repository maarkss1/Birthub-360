import { fileURLToPath } from 'node:url';
// Roda com: npx tsx icons.mts (cwd = repo). Renderiza os ícones REAIS com react-dom/server.
import fs from 'node:fs'; import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as Brand from '../../../src/components/icons/BrandIcons.tsx';
import { HubIcons } from '../../../src/features/hub/components/HubIcons.tsx';
import { GithubIcon } from '../../../src/components/ui/icons/GithubIcon.tsx';
import { LinkedinIcon } from '../../../src/components/ui/icons/LinkedinIcon.tsx';
import { YoutubeIcon } from '../../../src/components/ui/icons/YoutubeIcon.tsx';
import * as Lucide from 'lucide-react';

const REPO = fileURLToPath(new URL('../../..', import.meta.url)).replace(/\\/g, '/').replace(/\/$/, ''); const ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/\\/g, '/').replace(/\/$/, '');
const files: string[] = [];
(function walk(d: string) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) { if (['node_modules'].includes(f.name)) continue; walk(p); } else if (/\.tsx$/.test(f.name) && !/\.stories\.|\.test\./.test(f.name)) files.push(p); } })(`${REPO}/src`);
const rel = (p: string) => p.replace(/\\/g, '/').replace(REPO + '/', '');
const src = files.map((f) => ({ f: rel(f), t: fs.readFileSync(f, 'utf8') }));

function attrs(svg: string) {
  const m = (a: string) => (svg.match(new RegExp(`<svg[^>]*\\s${a}="([^"]*)"`)) || [])[1] ?? null;
  return { viewBox: m('viewBox'), width: m('width'), height: m('height'), stroke: m('stroke'), fill: m('fill'), strokeWidth: m('stroke-width'), ariaHidden: m('aria-hidden'), role: m('role') };
}
function findDef(name: string, file: string) {
  const t = fs.readFileSync(`${REPO}/${file}`, 'utf8').split('\n');
  const i = t.findIndex((l) => new RegExp(`(function|const)\\s+${name}\\b`).test(l));
  if (i < 0) return null; let d = 0, started = false, end = i;
  for (let j = i; j < t.length; j++) { const o = (t[j].match(/\{/g) || []).length, c = (t[j].match(/\}/g) || []).length; if (o) started = true; d += o - c; if (started && d <= 0) { end = j; break; } }
  return { start: i + 1, end: end + 1, code: t.slice(i, end + 1).join('\n') };
}
function usage(name: string, defFile: string) { const rx = new RegExp(`(?<![\\w])${name}(?![\\w])`, 'g'); const per: Record<string, number> = {}; let total = 0; for (const { f, t } of src) { if (f === defFile) continue; const m = t.match(rx); if (m) { per[f] = m.length; total += m.length; } } return { total, files: Object.entries(per).sort((a, b) => b[1] - a[1]).slice(0, 6) }; }

const custom: any[] = [];
const push = (name: string, Comp: any, file: string, extraUse?: () => any) => {
  let svg = ''; try { svg = renderToStaticMarkup(React.createElement(Comp, {})); } catch (e) { svg = ''; }
  const def = findDef(name, file); const u = extraUse ? extraUse() : usage(name, file);
  custom.push({ name, file, line: def ? [def.start, def.end] : null, code: def?.code.slice(0, 1800) ?? null, svg, ...attrs(svg), uses: u.total, usedIn: u.files });
};
for (const [k, v] of Object.entries(Brand)) if (/^Icon/.test(k) && typeof v === 'function') push(k, v, 'src/components/icons/BrandIcons.tsx');
for (const [k, v] of Object.entries(HubIcons)) push(`HubIcons.${k}`, v, 'src/features/hub/components/HubIcons.tsx', () => { const rx = new RegExp(`HubIcons`, 'g'); let total = 0; const per: Record<string, number> = {}; for (const { f, t } of src) { if (f.endsWith('HubIcons.tsx')) continue; const m = t.match(rx); if (m) { per[f] = m.length; total += m.length; } } return { total, files: Object.entries(per) }; });
push('GithubIcon', GithubIcon, 'src/components/ui/icons/GithubIcon.tsx');
push('LinkedinIcon', LinkedinIcon, 'src/components/ui/icons/LinkedinIcon.tsx');
push('YoutubeIcon', YoutubeIcon, 'src/components/ui/icons/YoutubeIcon.tsx');

// lucide: nomes importados por arquivo
const lu: Record<string, { count: number; files: Record<string, number> }> = {};
for (const { f, t } of src) { for (const m of t.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]lucide-react['"]/g)) { for (let n of m[1].split(',')) { n = n.trim().split(/\s+as\s+/)[0].trim(); if (!n || n.startsWith('type ')) continue; (lu[n] = lu[n] || { count: 0, files: {} }); lu[n].count++; lu[n].files[f] = 1; } } }
const lucide = Object.entries(lu).map(([name, v]) => {
  const C: any = (Lucide as any)[name]; let svg = ''; try { if (C) svg = renderToStaticMarkup(React.createElement(C, {})); } catch { /* */ }
  return { name, importedIn: Object.keys(v.files).length, files: Object.keys(v.files).slice(0, 5), svg, ...attrs(svg) };
}).sort((a, b) => b.importedIn - a.importedIn);
const lucideVersion = JSON.parse(fs.readFileSync(`${REPO}/node_modules/lucide-react/package.json`, 'utf8')).version;
// SVGs inline soltos em componentes (fora dos arquivos de ícone)
const inline: any[] = [];
for (const { f, t } of src) { if (/BrandIcons|HubIcons|icons\/(Github|Linkedin|Youtube)|BirthHubLogo/.test(f)) continue; const lines = t.split('\n'); lines.forEach((l, i) => { if (l.includes('<svg')) { let j = i; while (j < lines.length && !lines[j].includes('</svg>') && !/\/>\s*$/.test(lines[j]) || j === i && !lines[j].includes('</svg>') && !lines[j].trim().endsWith('/>') && j < i + 40) { j++; if (lines[j] && lines[j].includes('</svg>')) break; } inline.push({ file: f, line: [i + 1, j + 1], code: lines.slice(i, j + 1).join('\n').slice(0, 1200) }); } }); }
fs.writeFileSync(`${ROOT}/data/icons.json`, JSON.stringify({ lucideVersion, custom, lucide, inline }, null, 1));
console.log('custom', custom.length, 'rendered', custom.filter((c) => c.svg).length, 'lucide', lucide.length, 'lucide rendered', lucide.filter((c) => c.svg).length, 'inline', inline.length, 'v', lucideVersion);
