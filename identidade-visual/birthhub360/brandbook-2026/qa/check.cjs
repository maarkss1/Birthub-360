const {chromium}=require('playwright');
const {default:AxeBuilder}=require('@axe-core/playwright');
const fs=require('fs');
const path=require('path');
const {pathToFileURL}=require('url');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 const report={};
 for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
  const context=await browser.newContext({viewport:{width,height},acceptDownloads:true,reducedMotion:'reduce'});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.resolve(__dirname,'../BRANDBOOK-BIRTH-HUB-360.html')).href);
  await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:path.join(__dirname,name+'.png'),fullPage:false});
  report[name]={errors,dimensions:await page.evaluate(()=>({viewport:innerWidth,body:document.documentElement.scrollWidth,chapters:document.querySelectorAll('.section').length,fonts:[document.fonts.check('16px Cabin'),document.fonts.check('16px "IBM Plex Mono"')],brokenImages:Array.from(document.images).filter(i=>!i.complete||!i.naturalWidth).length,links:Array.from(document.querySelectorAll('a[href^="#"]')).filter(a=>!document.querySelector(a.hash)).length}))};
  await page.locator('#cores').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(__dirname,name+'-cores.png')});
  const a11y=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();report[name].a11y=a11y.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));
  await page.locator('#sampleText').fill('Contexto real. Ação clara.');await page.locator('#sampleFont').selectOption('IBM Plex Mono');report[name].type=await page.locator('#typeOutput').evaluate(e=>({text:e.textContent,font:getComputedStyle(e).fontFamily}));
  const links=page.locator('a[download]');report[name].downloads=[];
  for(let i=0;i<await links.count();i++){const link=links.nth(i);const [download]=await Promise.all([page.waitForEvent('download'),link.click()]);await download.saveAs(path.join(__dirname,'download-'+download.suggestedFilename()));report[name].downloads.push({filename:download.suggestedFilename(),failure:await download.failure()});}
  await page.locator('[data-copy]').first().click();await page.waitForFunction(()=>document.getElementById('toast').textContent.length>0);report[name].copy=await page.locator('#toast').textContent();
  if(name==='mobile'){await page.locator('.mobile-header summary').click();await page.locator('.mobile-header a[href="#logo"]').click();report[name].mobileMenuClosed=await page.locator('.mobile-header details').evaluate(e=>!e.open);}
  await page.keyboard.press('Tab');report[name].keyboard=await page.evaluate(()=>({tag:document.activeElement.tagName,outline:getComputedStyle(document.activeElement).outlineStyle}));
  await context.close();
 }
 const page=await browser.newPage();await page.goto(pathToFileURL(path.resolve(__dirname,'../BRANDBOOK-BIRTH-HUB-360.html')).href);await page.evaluate(()=>document.fonts.ready);await page.pdf({path:path.join(__dirname,'print-proof.pdf'),preferCSSPageSize:true,printBackground:true});
 await browser.close();fs.writeFileSync(path.join(__dirname,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
