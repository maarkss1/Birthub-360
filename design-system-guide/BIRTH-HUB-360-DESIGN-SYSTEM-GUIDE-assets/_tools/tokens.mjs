import { fileURLToPath } from 'node:url';
// Extrai tokens REAIS de src/styles/globals.css (com linha) e conta usos reais em src/**/*.tsx|ts|css
import fs from 'node:fs'; import path from 'node:path';
const REPO = fileURLToPath(new URL('../../..', import.meta.url)).replace(/\\/g, '/').replace(/\/$/, ''); const ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/\\/g, '/').replace(/\/$/, '');
const cssPath=`${REPO}/src/styles/globals.css`; const lines=fs.readFileSync(cssPath,'utf8').split('\n');
// blocos de nível 0
const blocks=[]; let depth=0, cur=null;
lines.forEach((ln,i)=>{ const opens=(ln.match(/\{/g)||[]).length, closes=(ln.match(/\}/g)||[]).length;
  if(depth===0&&opens>closes){ cur={sel:ln.replace('{','').trim(),start:i+1,decls:[]}; }
  else if(cur&&depth===1){ const m=ln.match(/^\s*(--[\w-]+)\s*:\s*(.+?);?\s*(\/\*.*)?$/); if(m&&!ln.trim().startsWith('/*')) cur.decls.push({name:m[1],value:m[2].replace(/;$/,'').trim(),line:i+1}); }
  depth+=opens-closes; if(depth===0&&cur){cur.end=i+1;blocks.push(cur);cur=null;} });
const want=blocks.filter(b=>/^(:root|\.dark|@theme)/.test(b.sel));
// arquivos de código
const files=[]; (function walk(d){ for(const f of fs.readdirSync(d,{withFileTypes:true})){ const p=path.join(d,f.name); if(f.isDirectory()){ if(['node_modules','__tests__'].includes(f.name))continue; walk(p);} else if(/\.(tsx|ts|css)$/.test(f.name)&&!/\.stories\.|\.test\./.test(f.name)) files.push(p); } })(`${REPO}/src`);
const contents=files.map(f=>({f:f.replace(REPO+'/','').replace(/\\/g,'/'),t:fs.readFileSync(f,'utf8')}));
const UT='bg|text|border|ring|from|to|via|fill|stroke|divide|outline|shadow|decoration|accent|caret|placeholder|border-t|border-b|border-l|border-r|ring-offset';
function usage(regex){ let total=0; const per={}; for(const {f,t} of contents){ if(f.endsWith('globals.css'))continue; const m=t.match(regex); if(m){ total+=m.length; per[f]=m.length; } } return {total,files:Object.entries(per).sort((a,b)=>b[1]-a[1]).slice(0,8)}; }
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const out={file:'src/styles/globals.css',blocks:want.map(b=>({selector:b.sel,start:b.start,end:b.end,count:b.decls.length})),tokens:[]};
const byName=new Map();
for(const b of want) for(const d of b.decls){ const key=d.name; let t=byName.get(key); if(!t){t={name:key,values:{},origin:[]};byName.set(key,t);} t.values[b.sel]=d.value; t.origin.push({block:b.sel,line:d.line}); }
for(const t of byName.values()){
  const n=t.name; let group='other';
  if(/^--color-/.test(n)||/^--(bg|surface|ink|line|brand|on-brand|iris|orbit|warn|ok|soft|red|pink|danger)/.test(n)) group='color';
  if(/font|text-|leading|tracking/.test(n)) group='typography';
  if(/radius/.test(n)) group='radius'; if(/shadow|glow/.test(n)) group='shadow'; if(/spacing|space|gap/.test(n)) group='spacing';
  if(/ease|duration|animate|motion/.test(n)) group='motion'; if(/breakpoint/.test(n)) group='breakpoint'; if(/z-|zindex/.test(n)) group='z-index';
  t.group=group;
  const rx=[new RegExp(`var\\(\\s*${esc(n)}\\b`,'g')];
  if(n.startsWith('--color-')){ const c=n.slice(8); rx.push(new RegExp(`(?<![\\w-])(?:[a-z-]+:)*(?:${UT})-${esc(c)}(?![\\w-])`,'g')); }
  if(n.startsWith('--radius-')){ const c=n.slice(9); rx.push(new RegExp(`(?<![\\w-])rounded(?:-[a-z]{1,2})?-${esc(c)}(?![\\w-])`,'g')); }
  if(n.startsWith('--shadow-')){ const c=n.slice(9); rx.push(new RegExp(`(?<![\\w-])shadow-${esc(c)}(?![\\w-])`,'g')); }
  if(n.startsWith('--font-')){ const c=n.slice(7); rx.push(new RegExp(`(?<![\\w-])font-${esc(c)}(?![\\w-])`,'g')); }
  if(n.startsWith('--text-')){ const c=n.slice(7); rx.push(new RegExp(`(?<![\\w-])text-${esc(c)}(?![\\w-])`,'g')); }
  if(n.startsWith('--animate-')){ const c=n.slice(10); rx.push(new RegExp(`(?<![\\w-])animate-${esc(c)}(?![\\w-])`,'g')); }
  let total=0; const per={}; for(const r of rx){ const u=usage(r); total+=u.total; for(const [f,c] of u.files) per[f]=(per[f]||0)+c; }
  t.uses=total; t.usedIn=Object.entries(per).sort((a,b)=>b[1]-a[1]).slice(0,8);
  out.tokens.push(t);
}
// cores hardcoded (hex) e tailwind default palette em src (contagem)
const hex={}; const tw={}; const twRx=/(?<![\w-])(?:bg|text|border|from|to|via|ring|fill|stroke)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)(?:-\d{2,3})?(?:\/\d+)?(?![\w-])/g;
for(const {f,t} of contents){ if(f.endsWith('globals.css'))continue; for(const m of t.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g)||[]){ const k=m.toUpperCase(); (hex[k]=hex[k]||{count:0,files:{}}).count++; hex[k].files[f]=(hex[k].files[f]||0)+1; } for(const m of t.match(twRx)||[]){ (tw[m]=tw[m]||{count:0,files:{}}).count++; tw[m].files[f]=(tw[m].files[f]||0)+1; } }
const top=o=>Object.entries(o).sort((a,b)=>b[1].count-a[1].count).slice(0,60).map(([k,v])=>({value:k,count:v.count,files:Object.entries(v.files).sort((a,b)=>b[1]-a[1]).slice(0,4)}));
out.hardcodedHex=top(hex); out.twDefaultPalette=top(tw); out.hexDistinct=Object.keys(hex).length; out.twDistinct=Object.keys(tw).length;
// keyframes
out.keyframes=[]; lines.forEach((l,i)=>{const m=l.match(/@keyframes\s+([\w-]+)/); if(m)out.keyframes.push({name:m[1],line:i+1});});
fs.writeFileSync(`${ROOT}/data/tokens.json`,JSON.stringify(out,null,1));
console.log(want.map(b=>`${b.sel} ${b.start}-${b.end} ${b.decls.length}`).join('\n'), '\ntokens',out.tokens.length,'hex',out.hexDistinct,'tw',out.twDistinct);
