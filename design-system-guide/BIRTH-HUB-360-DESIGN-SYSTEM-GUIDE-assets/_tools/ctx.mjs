import fs from 'node:fs';
import { ROOT, REPO, VPS, rd, exists, loadShots, lines, slug } from './lib.mjs';
const opt = (p, d) => (exists(p) ? rd(p) : d);
export function buildCtx() {
  const shots = loadShots();
  const tokens = opt(`${ROOT}/data/tokens.json`, { tokens: [], blocks: [], hardcodedHex: [], twDefaultPalette: [], keyframes: [] });
  const icons = opt(`${ROOT}/data/icons.json`, { custom: [], lucide: [], inline: [], lucideVersion: '?' });
  const compindex = opt(`${ROOT}/data/compindex.json`, {});
  const compshots = opt(`${ROOT}/data/compshots.json`, {});
  const states = opt(`${ROOT}/data/states.json`, { states: [], overlays: [], themes: [], notes: [] });
  // rotas -> componente raiz (App.tsx)
  const app = fs.readFileSync(`${REPO}/src/App.tsx`, 'utf8'); const appLines = app.split('\n');
  const WRAP = new Set(['RequireRole', 'ProtectedRoute', 'ErrorBoundary', 'RequireModuleAccess', 'Navigate', 'Suspense', 'Route', 'Routes', 'MainLayout']);
  const rootOf = {}; const rx = /<Route\s+(index|path="([^"]+)")/g; let m; const marks = [];
  while ((m = rx.exec(app))) marks.push({ pos: m.index, path: m[2] === undefined ? '' : m[2], line: app.slice(0, m.index).split('\n').length });
  marks.forEach((mk, i) => { const seg = app.slice(mk.pos, marks[i + 1] ? marks[i + 1].pos : mk.pos + 800); const tags = [...seg.matchAll(/<([A-Z]\w+)/g)].map((x) => x[1]).filter((t) => !WRAP.has(t)); rootOf[mk.path] = { comp: tags[0] || null, line: mk.line }; });
  const rootFor = (route) => { const k = route === '/' ? '/' : route.replace(/^\/app\/?/, ''); if (route.startsWith('/app')) return rootOf[k] || rootOf[''] || {}; return rootOf[route] || {}; };
  const routes = Object.keys(shots).sort((a, b) => a.localeCompare(b));
  const pubFirst = routes.filter((r) => !r.startsWith('/app')).concat(routes.filter((r) => r.startsWith('/app')));
  // agregados por categoria (1440)
  const agg = {}; // cat -> hash -> {count,routes:{},sample,shot,route}
  for (const r of routes) { const d = shots[r][1440]; if (!d || !d.groups) continue; for (const [cat, gs] of Object.entries(d.groups)) for (const g of gs) { const h = g.hash || g.sig; const a = ((agg[cat] = agg[cat] || {})[h] = agg[cat][h] || { hash: h, count: 0, routes: {}, sample: g.samples[0], route: r, shot: null, vw: d.viewport }); a.count += g.count; a.routes[r] = (a.routes[r] || 0) + g.count; if (g.samples[0]?.shot && !a.shot) { a.shot = g.samples[0].shot; a.sample = g.samples[0]; a.route = r; a.vw = d.viewport; } } }
  const aggList = (cat) => Object.values(agg[cat] || {}).sort((a, b) => b.count - a.count);
  // tipografia agregada
  const typo = {}; for (const r of routes) { const d = shots[r][1440]; for (const t of d?.typography || []) { const a = (typo[t.key] = typo[t.key] || { key: t.key, count: 0, routes: {}, samples: [] }); a.count += t.count; a.routes[r] = 1; if (a.samples.length < 4) a.samples.push(...t.samples.slice(0, 2).map((s) => ({ ...s, route: r }))); } }
  const typoList = Object.values(typo).sort((a, b) => b.count - a.count);
  // cores/radius/sombras/gradientes/z
  const sumMap = (sel) => { const o = {}; for (const r of routes) { const d = shots[r][1440]; const src = sel(d); if (!src) continue; for (const [k, v] of Object.entries(src)) { const a = (o[k] = o[k] || { count: 0, routes: 0, tags: {} }); a.count += typeof v === 'number' ? v : v.count; a.routes++; if (v.tags) for (const [t, n] of Object.entries(v.tags)) a.tags[t] = (a.tags[t] || 0) + n; } } return Object.entries(o).map(([k, v]) => ({ value: k, ...v })).sort((a, b) => b.count - a.count); };
  const colors = { bg: sumMap((d) => d?.colors?.bg), color: sumMap((d) => d?.colors?.color), border: sumMap((d) => d?.colors?.border) };
  const radius = sumMap((d) => d?.radius), shadows = sumMap((d) => d?.shadows), gradients = sumMap((d) => d?.gradients), zindex = sumMap((d) => d?.zindex);
  // componentes observados por rota (apenas os definidos em src)
  const compsByRoute = {}; const routesByComp = {};
  for (const r of routes) { const d = shots[r][1440]; if (!d) continue; const list = (d.components || []).filter((c) => compindex[c]); compsByRoute[r] = list; for (const c of list) (routesByComp[c] = routesByComp[c] || []).push(r); }
  // arquivo -> componentes definidos
  const compsInFile = {}; for (const [n, defs] of Object.entries(compindex)) for (const dd of defs) (compsInFile[dd.file] = compsInFile[dd.file] || []).push(n);
  const primaryDef = (n) => { const d = compindex[n]; if (!d) return null; return d.find((x) => x.exported) || d[0]; };
  const screen = (r) => shots[r]?.[1440]?.screenshot;
  return { shots, tokens, icons, compindex, compshots, states, rootFor, rootOf, appLines, routes, pubFirst, agg, aggList, typoList, colors, radius, shadows, gradients, zindex, compsByRoute, routesByComp, compsInFile, primaryDef, screen };
}
