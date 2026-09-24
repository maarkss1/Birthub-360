import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
export const REPO = fileURLToPath(new URL('../../..', import.meta.url)).replace(/\\/g, '/').replace(/\/$/, '');
export const ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/\\/g, '/').replace(/\/$/, '');
export const A = 'BIRTH-HUB-360-DESIGN-SYSTEM-GUIDE-assets'; // prefixo relativo usado no HTML
export const VPS = [[1440, 900], [1280, 800], [1024, 768], [768, 1024], [430, 932], [390, 844], [375, 812]];
export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const slug = (r) => (r === '/' ? 'root' : r.replace(/^\//, '').replace(/[\/:]/g, '_'));
export const rd = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
export const exists = (p) => fs.existsSync(p);
export const img = (rel, alt = '', cls = 'zoom') => exists(`${ROOT}/${rel}`) ? `<img class="${cls}" loading="lazy" src="${A}/${rel}" alt="${esc(alt)}" data-full="${A}/${rel}">` : `<div class="missing">arquivo ausente: ${esc(rel)}</div>`;
const fileCache = new Map();
export function lines(file) { if (!fileCache.has(file)) { const p = `${REPO}/${file}`; fileCache.set(file, exists(p) ? fs.readFileSync(p, 'utf8').split('\n') : []); } return fileCache.get(file); }
export function excerpt(file, start, end) { const L = lines(file); return L.slice(start - 1, end).join('\n'); }
// bloco de definição por chaves a partir de startLine
export function defBlock(file, startLine, max = 90) {
  const L = lines(file); let d = 0, started = false, end = startLine - 1;
  for (let j = startLine - 1; j < L.length && j < startLine - 1 + 400; j++) { const o = (L[j].match(/\{/g) || []).length, c = (L[j].match(/\}/g) || []).length; if (o) started = true; d += o - c; end = j; if (started && d <= 0) break; }
  const e = Math.min(end + 1, startLine + max - 1); return { start: startLine, end: e, truncated: end + 1 > e, code: L.slice(startLine - 1, e).join('\n') };
}
let cid = 0;
export function code(file, start, end, text, lang = 'tsx', note = '') {
  const id = 'c' + cid++; const loc = file ? `${file}${start ? `:${start}${end && end !== start ? '-' + end : ''}` : ''}` : '';
  return `<figure class="code"><figcaption><span class="file">${esc(loc)}</span>${note ? `<span class="note">${esc(note)}</span>` : ''}<span class="lang">${lang}</span><button class="copy" data-copy="${id}">copiar</button></figcaption><pre id="${id}"><code>${esc(text)}</code></pre></figure>`;
}
export const codeFrom = (file, s, e, lang = 'tsx', note = '') => code(file, s, e, excerpt(file, s, e), lang, note);
export function table(head, rows, opts = {}) {
  const id = opts.filter ? `<input class="tfilter" placeholder="filtrar…" aria-label="Filtrar tabela">` : '';
  return `${id}<div class="tw"><table class="${opts.cls || ''}"><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c ?? ''}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
export const kv = (obj, keys) => table(['Propriedade', 'Valor (computado no navegador)'], (keys || Object.keys(obj)).filter((k) => obj[k] !== undefined && obj[k] !== null).map((k) => [`<code>${k}</code>`, `<code>${esc(obj[k])}</code>`]));
export const badge = (t, cls = '') => `<span class="badge ${cls}">${esc(t)}</span>`;
export const tag = (label, text) => `<span class="ref"><b>[${label}]</b> ${text}</span>`;
export function rgbToHex(c) { const m = String(c).match(/rgba?\(([\d.\s,\/]+)\)/); if (!m) { return c; } const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number); const h = (n) => Math.round(n).toString(16).padStart(2, '0'); const a = p[3]; return '#' + h(p[0]) + h(p[1]) + h(p[2]) + (a !== undefined && a < 1 ? h(a * 255) : ''); }
export function loadShots() {
  const data = {}; // data[route][w] = json
  for (const f of fs.readdirSync(`${ROOT}/data`)) { const m = f.match(/^(.+)__(\d+)x(\d+)\.json$/); if (!m) continue; const j = rd(`${ROOT}/data/${f}`); if (j.error) continue; (data[j.route] = data[j.route] || {})[+m[2]] = j; }
  return data;
}
// recorte de evidência: mostra a região (rect) do screenshot real via CSS
export function crop(shot, rect, vw, vh, opts = {}) {
  if (!shot || !rect || !exists(`${ROOT}/${shot}`)) return '';
  const pad = opts.pad ?? 16; const x = Math.max(0, rect.x - pad), y = Math.max(0, rect.y - pad); const w = Math.min(vw - x, rect.width + pad * 2 || rect.w + pad * 2), h = Math.min(vh - y, (rect.height ?? rect.h) + pad * 2);
  const maxW = opts.maxW ?? 420; const s = Math.min(1, maxW / w) * (opts.zoom ?? 1);
  return `<div class="crop" style="width:${(w * s).toFixed(0)}px;height:${(h * s).toFixed(0)}px"><img class="zoom" loading="lazy" data-full="${A}/${shot}" src="${A}/${shot}" style="width:${(vw * s).toFixed(0)}px;left:${(-x * s).toFixed(0)}px;top:${(-y * s).toFixed(0)}px" alt="recorte ${esc(shot)}"><i class="cropbox" style="left:${((rect.x - x) * s).toFixed(0)}px;top:${((rect.y - y) * s).toFixed(0)}px;width:${(rect.width ?? rect.w) * s}px;height:${(rect.height ?? rect.h) * s}px"></i></div><div class="cap">${esc(shot)} · rect ${rect.x},${rect.y} ${(rect.width ?? rect.w)}×${(rect.height ?? rect.h)}</div>`;
}
