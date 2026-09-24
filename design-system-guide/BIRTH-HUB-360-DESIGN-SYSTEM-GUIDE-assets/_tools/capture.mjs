import { fileURLToPath } from 'node:url';
import { chromium } from '../../../node_modules/playwright/index.mjs';
import fs from 'node:fs'; import crypto from 'node:crypto';
const ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/\\/g, '/').replace(/\/$/, '');
const BASE = 'http://localhost:3024';
for (const d of ['screens','data','components']) fs.mkdirSync(`${ROOT}/${d}`, {recursive:true});
const only = process.argv[2] ? new RegExp(process.argv[2]) : null;
const PUBLIC = ['/', '/login', '/reset-password', '/book/demo', '/rota-inexistente-404'];
const APP = ['', 'dashboard','workspace','prospect','crm','crm360','mesa-tratamento','intelligence','intelligence/elite-agent','companies','contacts','activities','cadence','chatbook','roleplay','qualification_matrix','objections_matrix','topic_training','bitrix','reports','integrations','knowledge','analytics','winloss','market-intelligence','market-intelligence/deck','propostas','commercial_intelligence','daily-plan','sdr-diagnostic','calendar','notifications','automations','usage','editor','team','module-access','settings'].map(p=>'/app'+(p?'/'+p:''));
const OTHER = ['/social-selling','/design-lab/command-language','/design-lab/components-v2'];
const NOAUTH=!!process.env.NOAUTH; const ROUTES = (NOAUTH?PUBLIC.filter(r=>r!=='/rota-inexistente-404'&&r!=='/book/demo').concat(['/welcome']):[...PUBLIC, ...APP, ...OTHER]).filter(r=>!only||only.test(r));
const VPS = [[1440,900],[1280,800],[1024,768],[768,1024],[430,932],[390,844],[375,812]];
const slug = r => (r==='/'?'root':r.replace(/^\//,'').replace(/[\/:]/g,'_'));
const sha = s => crypto.createHash('sha1').update(s).digest('hex').slice(0,8);
const seen = new Set(fs.existsSync(`${ROOT}/data/_seen.json`)?JSON.parse(fs.readFileSync(`${ROOT}/data/_seen.json`)):[]);
const catCount = {}; for(const f of fs.readdirSync(`${ROOT}/components`)){ const m=f.match(/^([a-z]+)-([0-9a-f]{8}).png$/); if(m){ seen.add(m[2]); catCount[m[1]]=(catCount[m[1]]||0)+1; } }

function pageProbe(full){
  const PROPS=['width','height','paddingTop','paddingRight','paddingBottom','paddingLeft','marginTop','marginRight','marginBottom','marginLeft','gap','borderRadius','borderTopWidth','borderTopColor','borderTopStyle','fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','boxShadow','backgroundColor','backgroundImage','color','display','position','zIndex','opacity','transition'];
  const st = el => { const c=getComputedStyle(el); const o={}; for(const p of PROPS)o[p]=c[p]; return o; };
  const R = el => { const r=el.getBoundingClientRect(); return {x:+r.x.toFixed(1),y:+r.y.toFixed(1),width:+r.width.toFixed(1),height:+r.height.toFixed(1)}; };
  const vis = el => { const r=el.getBoundingClientRect(); const c=getComputedStyle(el); return r.width>0&&r.height>0&&c.visibility!=='hidden'&&c.display!=='none'&&+c.opacity>0; };
  const fk = el => Object.keys(el).find(k=>k.startsWith('__reactFiber$'));
  const nm = f => { const t=f.type; if(!t||typeof t==='string')return null; const n=t.displayName||t.name||(t.render&&(t.render.displayName||t.render.name))||(t.type&&(t.type.displayName||t.type.name)); return n&&/^[A-Z]/.test(n)?n:null; };
  const chain = el => { const k=fk(el); if(!k)return []; const out=[]; let f=el[k]; let guard=0; while(f&&guard++<80){const n=nm(f); if(n&&!out.includes(n))out.push(n); f=f.return;} return out.slice(0,8); };
  const allComps = new Set(); const visited = new Set();
  for(const el of document.body.querySelectorAll('*')){ const k=fk(el); if(!k)continue; let f=el[k]; let g=0; while(f&&!visited.has(f)&&g++<200){visited.add(f); const n=nm(f); if(n)allComps.add(n); f=f.return;} }
  const de=document.documentElement;
  const out={ url:location.pathname+location.search, title:document.title,
    viewport:{w:innerWidth,h:innerHeight,dpr:devicePixelRatio}, scroll:{docW:de.scrollWidth,docH:de.scrollHeight,bodyW:document.body.scrollWidth,bodyH:document.body.scrollHeight},
    hOverflow: de.scrollWidth>innerWidth+1, theme:{htmlClass:de.className, dataTheme:de.getAttribute('data-theme')},
    h1:[...document.querySelectorAll('h1')].slice(0,3).map(e=>e.innerText.slice(0,80)),
    components:[...allComps].sort(), landmarks:{} };
  const LM={aside:'aside',nav:'nav',main:'main',header:'header',footer:'footer',h1:'h1',h2:'h2',dialog:'[role=dialog],[aria-modal=true]',root:'#root > *'};
  for(const [k,sel] of Object.entries(LM)){ out.landmarks[k]=[...document.querySelectorAll(sel)].filter(vis).slice(0,4).map(e=>({tag:e.tagName.toLowerCase(),cls:(e.getAttribute('class')||'').slice(0,160),text:(e.innerText||'').slice(0,50),rect:R(e),styles:st(e),comps:chain(e)})); }
  const over=[]; for(const el of document.body.querySelectorAll('*')){ if(over.length>=6)break; const r=el.getBoundingClientRect(); if(r.width>0&&r.right>innerWidth+2&&vis(el)&&getComputedStyle(el).position!=='fixed'){over.push({tag:el.tagName.toLowerCase(),cls:(el.getAttribute('class')||'').slice(0,100),right:+r.right.toFixed(0)});} }
  out.overflowers=over;
  const tt=[...document.querySelectorAll('button,a[href],[role=button]')].filter(vis); out.touch={total:tt.length,small:tt.filter(e=>{const r=e.getBoundingClientRect();return r.width<44||r.height<44;}).length};
  if(!full) return out;
  const CATS={
    button:'button,[role=button]', link:'a[href]', input:'input:not([type=hidden]):not([type=checkbox]):not([type=radio]),select,textarea', checkbox:'input[type=checkbox],input[type=radio],[role=switch]',
    heading:'h1,h2,h3,h4,h5,h6', table:'table,[role=table],[role=grid]', dialog:'[role=dialog],[aria-modal=true]', tab:'[role=tab]', menuitem:'[role=menuitem],[role=option]', tooltip:'[role=tooltip]',
    badge:'span,div', card:'div,section,article,li'};
  const groups={}; let idc=0;
  for(const [cat,sel] of Object.entries(CATS)){
    const map=new Map(); let n=0;
    for(const el of document.querySelectorAll(sel)){
      if(n>600)break; if(!vis(el))continue; const r=el.getBoundingClientRect(); const c=getComputedStyle(el);
      if(cat==='badge'){ if(!(parseFloat(c.borderTopLeftRadius)>=8&&r.height>=14&&r.height<=34&&r.width<=200&&(el.children.length<=2)&&(el.innerText||'').trim().length>0&&(el.innerText||'').length<28&&(c.backgroundColor!=='rgba(0, 0, 0, 0)'||parseFloat(c.borderTopWidth)>0)&&el.tagName!=='BUTTON'&&!el.closest('button,a')))continue; }
      if(cat==='card'){ if(!(r.width>=160&&r.width<=1000&&r.height>=60&&r.height<=600&&parseFloat(c.borderTopLeftRadius)>=8&&(c.boxShadow!=='none'||parseFloat(c.borderTopWidth)>0)&&(c.backgroundColor!=='rgba(0, 0, 0, 0)')&&el.children.length>=1))continue; }
      n++;
      const s=st(el); const sig=[s.height,s.paddingTop,s.paddingRight,s.borderRadius,s.borderTopWidth,s.borderTopColor,s.fontFamily.split(',')[0],s.fontSize,s.fontWeight,s.letterSpacing,s.boxShadow.slice(0,60),s.backgroundColor,s.backgroundImage.slice(0,40),s.color,cat==='card'?s.width:''].join('|');
      let g=map.get(sig); if(!g){g={sig,count:0,samples:[]};map.set(sig,g);} g.count++;
      if(g.samples.length<1){ const id='ds'+(idc++); el.setAttribute('data-dsid',id); g.samples.push({dsid:id,tag:el.tagName.toLowerCase(),cls:(el.getAttribute('class')||'').slice(0,400),text:(el.innerText||el.getAttribute('aria-label')||'').trim().slice(0,60),role:el.getAttribute('role'),type:el.getAttribute('type'),aria:el.getAttribute('aria-label'),disabled:el.disabled||el.getAttribute('aria-disabled')||null,rect:R(el),styles:s,comps:chain(el),html:el.outerHTML.slice(0,700)}); }
    }
    groups[cat]=[...map.values()].sort((a,b)=>b.count-a.count).slice(0,12);
  }
  out.groups=groups;
  const ty=new Map(); for(const el of document.body.querySelectorAll('*')){ let own=''; for(const ch of el.childNodes) if(ch.nodeType===3)own+=ch.textContent; own=own.trim(); if(!own||!vis(el))continue; const c=getComputedStyle(el); const k=[c.fontFamily,c.fontSize,c.fontWeight,c.lineHeight,c.letterSpacing,c.textTransform].join('|'); let g=ty.get(k); if(!g){g={key:k,count:0,samples:[]};ty.set(k,g);} g.count++; if(g.samples.length<3)g.samples.push({tag:el.tagName.toLowerCase(),text:own.slice(0,50),color:c.color,comps:chain(el).slice(0,3)}); }
  out.typography=[...ty.values()].sort((a,b)=>b.count-a.count).slice(0,60);
  const col={color:{},bg:{},border:{}}; const inc=(o,k,tag)=>{if(!k||k==='rgba(0, 0, 0, 0)')return; (o[k]=o[k]||{count:0,tags:{}}).count++; o[k].tags[tag]=(o[k].tags[tag]||0)+1;};
  for(const el of document.body.querySelectorAll('*')){ if(!vis(el))continue; const c=getComputedStyle(el); const t=el.tagName.toLowerCase(); inc(col.bg,c.backgroundColor,t); if([...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))inc(col.color,c.color,t); if(parseFloat(c.borderTopWidth)>0)inc(col.border,c.borderTopColor,t); }
  out.colors=col;
  const rad={},sh={},gr={},zi={}; for(const el of document.body.querySelectorAll('*')){ if(!vis(el))continue; const c=getComputedStyle(el); const r=c.borderTopLeftRadius; if(r!=='0px')rad[r]=(rad[r]||0)+1; if(c.boxShadow!=='none')sh[c.boxShadow]=(sh[c.boxShadow]||0)+1; if(c.backgroundImage.includes('gradient')){const k=c.backgroundImage.slice(0,220);gr[k]=(gr[k]||0)+1;} if(c.zIndex!=='auto')zi[c.zIndex]=(zi[c.zIndex]||0)+1; }
  out.radius=rad; out.shadows=sh; out.gradients=gr; out.zindex=zi;
  out.svgs=[...document.querySelectorAll('svg')].filter(vis).slice(0,120).map(e=>{const c=getComputedStyle(e);const r=R(e);const par=e.closest('button,a,[role]');return {cls:(e.getAttribute('class')||'').slice(0,120),viewBox:e.getAttribute('viewBox'),w:r.width,h:r.height,stroke:e.getAttribute('stroke')||c.stroke,fill:e.getAttribute('fill')||c.fill,strokeWidth:e.getAttribute('stroke-width'),ariaHidden:e.getAttribute('aria-hidden'),ariaLabel:e.getAttribute('aria-label'),role:e.getAttribute('role'),color:c.color,parent:par?(par.tagName.toLowerCase()+':'+((par.innerText||par.getAttribute('aria-label')||'').trim().slice(0,30))):null,comps:chain(e).slice(0,3),html:e.outerHTML.slice(0,2500)};});
  out.a11y={ imgNoAlt:document.querySelectorAll('img:not([alt])').length, btnNoName:[...document.querySelectorAll('button,[role=button]')].filter(b=>vis(b)&&!(b.innerText||'').trim()&&!b.getAttribute('aria-label')&&!b.getAttribute('aria-labelledby')&&!b.getAttribute('title')).slice(0,10).map(b=>({cls:(b.getAttribute('class')||'').slice(0,100),html:b.outerHTML.slice(0,300),rect:R(b)})), inputNoLabel:[...document.querySelectorAll('input:not([type=hidden]),select,textarea')].filter(i=>vis(i)&&!i.labels?.length&&!i.getAttribute('aria-label')&&!i.getAttribute('aria-labelledby')).slice(0,10).map(i=>({cls:(i.getAttribute('class')||'').slice(0,100),html:i.outerHTML.slice(0,300),rect:R(i)})), h1Count:document.querySelectorAll('h1').length, landmarkMain:document.querySelectorAll('main,[role=main]').length, lang:de.lang };
  return out;
}

async function task(browser, route, [w,h]){
  { const bf=`${ROOT}/data/${slug(route)}__${w}x${h}.json`; if(fs.existsSync(bf)&&!process.env.FORCE){ try{ if(!JSON.parse(fs.readFileSync(bf)).error){ console.log('SKIP',route,w); return; } }catch{} } }
  const ctx = await browser.newContext({ ...(NOAUTH?{}:{storageState:`${ROOT}/_tools/auth.json`}), viewport:{width:w,height:h}, isMobile:w<768, hasTouch:w<768, deviceScaleFactor:1 });
  await ctx.addInitScript(()=>{try{localStorage.setItem('@prospector:has_seen_tour','true')}catch{}});
  const page = await ctx.newPage(); const errs=[]; page.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,200));}); page.on('pageerror',e=>errs.push('pageerror: '+String(e).slice(0,200)));
  const t0=Date.now(); const base=`${slug(route)}__${w}x${h}`;
  try{ await page.goto(BASE+route,{waitUntil:'domcontentloaded',timeout:30000}); await page.waitForLoadState('networkidle',{timeout:3500}).catch(()=>{}); await page.waitForTimeout(1200);
    await page.waitForFunction(()=>!document.querySelector('[class*="animate-pulse"],[aria-busy=true]'),{timeout:2500}).catch(()=>{});
    const full = w===1440 || w===390;
    const data = await page.evaluate(pageProbe, full);
    data.route=route; data.requestedViewport=[w,h]; data.timestamp=new Date().toISOString(); data.consoleErrors=errs.slice(0,8); data.finalUrl=page.url();
    await page.screenshot({path:`${ROOT}/screens/${base}.png`});
    data.screenshot=`screens/${base}.png`;
    let shots=0;
    if(w===1440){
      for(const [cat,gs] of Object.entries(data.groups||{})){
        for(const g of gs){ g.hash=sha(cat+g.sig); }
        for(const g of gs.slice(0,3)){ const s=g.samples[0]; if(!s)continue; if(seen.has(g.hash)||(catCount[cat]||0)>=30)continue; if(cat!=='heading'&&(s.rect.width>1000||s.rect.height>700))continue;
          try{ const loc=page.locator(`[data-dsid="${s.dsid}"]`); await loc.scrollIntoViewIfNeeded({timeout:1500}); await loc.screenshot({path:`${ROOT}/components/${cat}-${g.hash}.png`,timeout:3000}); seen.add(g.hash); catCount[cat]=(catCount[cat]||0)+1; s.shot=`components/${cat}-${g.hash}.png`; shots++; }catch{} }
      }
      data.componentShots=shots;
    }
    data.loadMs=Date.now()-t0;
    fs.writeFileSync(`${ROOT}/data/${base}.json`,JSON.stringify(data));
    console.log('OK',route,w,data.finalUrl.replace(BASE,''),data.components.length+'c',shots);
  }catch(e){ console.log('FAIL',route,w,String(e).slice(0,120)); fs.writeFileSync(`${ROOT}/data/${base}.json`,JSON.stringify({route,requestedViewport:[w,h],error:String(e).slice(0,300)})); }
  await ctx.close();
}

const browser = await chromium.launch({ channel:'msedge', headless:true });
const queue=[]; for(const r of ROUTES) for(const vp of VPS) queue.push([r,vp]);
// 1440 primeiro e em série (dedupe de recortes de componentes depende da ordem)
const q1440=queue.filter(q=>q[1][0]===1440), rest=queue.filter(q=>q[1][0]!==1440); const PRI={390:0,1024:1,768:2,1280:3,430:4,375:5}; rest.sort((a,b)=>PRI[a[1][0]]-PRI[b[1][0]]);
{ let k=0; await Promise.all(Array.from({length:3},async()=>{ while(k<q1440.length){ const [r,vp]=q1440[k++]; await task(browser,r,vp); fs.writeFileSync(`${ROOT}/data/_seen.json`,JSON.stringify([...seen])); } })); }
fs.writeFileSync(`${ROOT}/data/_seen.json`,JSON.stringify([...seen]));
let i=0; await Promise.all(Array.from({length:3},async()=>{ while(i<rest.length){ const [r,vp]=rest[i++]; await task(browser,r,vp); } }));
await browser.close(); console.log('DONE');
