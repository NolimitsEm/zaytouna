import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import { defaultUsers } from '../src/data/defaults.js';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const output=path.join(root,'forensics/validation');
fs.mkdirSync(output,{recursive:true});
export function serve(directory,port){
 const server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  let file=path.resolve(directory,'.'+pathname);
  if(file!==directory&&!file.startsWith(directory+path.sep)){res.writeHead(403);res.end();return;}
  if(pathname==='/')file=path.join(directory,'index.html');
  if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('Not found');return;}
  const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.map':'application/json','.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}[path.extname(file)]||'application/octet-stream';
  res.writeHead(200,{'Content-Type':mime,'Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
 });
 return new Promise(resolve=>server.listen(port,'127.0.0.1',()=>resolve(server)));
}
export async function isolatedContext(browser,role='anonymous',viewport={width:1440,height:1000},overrides={}){
 const context=await browser.newContext({viewport,reducedMotion:'reduce',locale:'fr-FR',timezoneId:'Africa/Tunis',serviceWorkers:'block'});
 const user=role==='anonymous'?null:structuredClone(defaultUsers.find(u=>u.role===role));
 const backend={user, state:{},requests:[],errors:[],dialogs:[],...overrides};
 await context.addInitScript(()=>{
  const NativeDate=Date;const now=new NativeDate('2026-09-14T10:00:00.000Z').getTime();
  class FixedDate extends NativeDate{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
  window.Date=FixedDate;
  let seed=12345;Math.random=()=>((seed=(seed*16807)%2147483647)-1)/2147483646;
  // Deterministic entropy ONLY in this isolated test realm. Production uses crypto.
  let entropy=24680;
  crypto.getRandomValues=array=>{for(let i=0;i<array.length;i++){entropy=(entropy*16807)%2147483647;array[i]=entropy;}return array;};
 });
 await context.route('**/*',async route=>{
  const request=route.request(), url=new URL(request.url());
  if(!['127.0.0.1','localhost'].includes(url.hostname))return route.abort();
  if(!url.pathname.startsWith('/api/'))return route.continue();
  const body=request.postDataJSON();
  backend.requests.push({path:url.pathname+url.search,method:request.method(),body});
  let response={};let status=200;
  if(url.pathname==='/api/app-state'){
   if(request.method()==='POST'){Object.assign(backend.state,body?.items||{});response={ok:true};}
   else response={state:backend.state};
  }else if(url.pathname==='/api/auth/session')response={user:backend.user};
  else if(url.pathname==='/api/auth/login'){
   if(body.password==='FixturePassword@123'){
    backend.user=structuredClone(defaultUsers.find(u=>u.email===body.email||u.id===body.email));
    response={user:backend.user};
   }else{status=401;response={error:'Invalid credentials'};}
  }else if(url.pathname==='/api/auth/logout'){backend.user=null;response={ok:true};}
  else if(url.pathname==='/api/registration-requests')response={ok:true};
  else if(url.pathname==='/api/auth/verify-password')response={ok:true,valid:true};
  else if(url.pathname==='/api/auth/profile'){backend.user={...backend.user,...body};response={user:backend.user};}
  else if(url.pathname==='/api/activation-invite')response={user:structuredClone(defaultUsers[0])};
  else if(url.pathname==='/api/activation-complete')response={ok:true,user:structuredClone(defaultUsers[0])};
  else if(url.pathname==='/api/auth/change-password'||url.pathname==='/api/auth/profile/avatar')response={user:backend.user};
  else if(url.pathname==='/api/send-activation-email')response={ok:true,messageId:'isolated-test-message'};
  else if(url.pathname==='/api/zoom/meetings')response={meeting:{meetingId:'fixture-zoom',joinUrl:'https://example.invalid/join',startUrl:'https://example.invalid/start',timezone:'Africa/Tunis'}};
  else if(url.pathname==='/api/zoom/recordings')response={recording:{recordingStatus:'waiting',files:[]}};
  else if(url.pathname==='/api/zoom/meetings/end')response={ok:true};
  else if(url.pathname==='/api/email-settings')response={ok:true};
  else {status=501;response={error:'No test fixture for observed endpoint'};}
  if(overrides.respond){const result=overrides.respond({url,request,body,response,status});if(result){response=result.response;status=result.status??status;}}
  return route.fulfill({status,contentType:'application/json',body:JSON.stringify(response)});
 });
 context.on('page',page=>{page.on('pageerror',e=>backend.errors.push(e.message));page.on('dialog',dialog=>{backend.dialogs.push(dialog.message());return dialog.type()==='prompt'?dialog.accept('FixturePassword@123'):dialog.accept();});});
 return {context,backend};
}
export async function ready(page,url){
 await page.goto(url,{waitUntil:'load'});
 await page.locator('#main > *').first().waitFor({timeout:15000});
 await page.locator('.loading-screen').waitFor({state:'detached',timeout:15000});
 await page.evaluate(()=>document.fonts.ready);
}
export async function navigate(page,hash){
 await page.evaluate(hash=>{location.hash=hash;},hash);
 await page.waitForFunction(hash=>{
  const route=hash.replace(/^#/,'').split('?')[0];
  return document.body.dataset.route===route||document.querySelector('#main [data-login-form]')||document.querySelector('#signed-account-title');
 },hash);
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}
export async function snapshot(page){return page.evaluate(()=>{
 const clean=s=>s.replace(/\s+/g,' ').trim();
 return {route:document.body.dataset.route,text:clean(document.querySelector('#root').innerText),headings:[...document.querySelectorAll('h1,h2,h3')].map(e=>clean(e.textContent)),links:[...document.querySelectorAll('#root a')].map(e=>({text:clean(e.textContent),href:e.getAttribute('href')})),forms:[...document.querySelectorAll('#main form')].map(e=>({data:[...e.attributes].filter(a=>a.name.startsWith('data-')).map(a=>a.name),fields:[...e.elements].map(f=>({tag:f.tagName,type:f.type,name:f.name,required:f.required,value:f.value,disabled:f.disabled}))})),images:[...document.querySelectorAll('#root img')].map(e=>({src:e.getAttribute('src'),loaded:e.complete&&e.naturalWidth>0})),overflow:document.documentElement.scrollWidth>innerWidth};
});}
export async function stabilizeScreenshot(page){
 await page.evaluate(async()=>{
  await Promise.all([...document.images].map(img=>img.decode().catch(()=>{})));
  document.documentElement.style.scrollBehavior='auto';
  window.scrollTo({top:0,left:0,behavior:'instant'});
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 });
}
