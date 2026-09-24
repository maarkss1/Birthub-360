import { fileURLToPath } from 'node:url';
// Índice nome-de-componente -> arquivo:linha (definições reais em src/**/*.tsx)
import fs from 'node:fs'; import path from 'node:path';
const REPO = fileURLToPath(new URL('../../..', import.meta.url)).replace(/\\/g, '/').replace(/\/$/, ''); const ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/\\/g, '/').replace(/\/$/, '');
const files = [];
(function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) { if (f.name === 'node_modules') continue; walk(p); } else if (/\.tsx$/.test(f.name) && !/\.stories\.|\.test\.|\.spec\./.test(f.name)) files.push(p); } })(`${REPO}/src`);
const idx = {};
for (const p of files) {
  const rel = p.replace(/\\/g, '/').replace(REPO + '/', ''); const lines = fs.readFileSync(p, 'utf8').split('\n');
  lines.forEach((l, i) => {
    let m = l.match(/^(export\s+)?(default\s+)?(?:async\s+)?function\s+([A-Z]\w*)/) || l.match(/^(export\s+)?(default\s+)?class\s+([A-Z]\w*)/) || l.match(/^(export\s+)?const\s+([A-Z]\w*)\s*(?::[^=]+)?=\s*(?:React\.)?(?:memo|forwardRef|\(|async|function|<)/);
    if (!m) return; const name = m[3] || m[2]; if (!name || !/^[A-Z]/.test(name)) return;
    // ignora constantes de dados (const FOO = ...) tudo maiúsculo
    if (/^[A-Z0-9_]+$/.test(name) && name.length > 3) return;
    (idx[name] = idx[name] || []).push({ file: rel, line: i + 1, exported: !!m[1] });
  });
}
fs.writeFileSync(`${ROOT}/data/compindex.json`, JSON.stringify(idx));
console.log('components defined', Object.keys(idx).length, 'files', files.length);
