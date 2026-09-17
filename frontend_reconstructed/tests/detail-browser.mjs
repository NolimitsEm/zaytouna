import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
import {chromium} from 'playwright';
import {root,output,serve,isolatedContext,ready,navigate,snapshot} from './support.mjs';
const servers=await Promise.all([serve(path.resolve(root,'../dist'),4179),serve(path.join(root,'build'),4180)]);
const browser=await chromium.launch({channel:'chrome',headless:true});
const report={description:'Query/detail pages discovered from original runtime links, depth two. API isolated; not real backend data.',comparisons:[],errors:[],dev:null};
const seeds=['#courses','#exams','#questionnaires','#lessons','#examManagement','#questionnaireManagement','#users','#schedule','#analytics','#generalPlans'];
try{
 for(const role of ['student','teacher','admin']){
  const pair=await Promise.all([isolatedContext(browser,role),isolatedContext(browser,role)]);
  const pages=await Promise.all(pair.map(p=>p.context.newPage()));
  await Promise.all(pages.map((p,i)=>ready(p,`http://127.0.0.1:${4179+i}/`)));
  let links=new Set();const visited=new Set();
  const collect=async()=>{for(const hash of await pages[0].locator('a[href^="#"]').evaluateAll(items=>items.map(e=>e.getAttribute('href')).filter(s=>s.includes('?'))))if(!visited.has(hash))links.add(hash);};
  for(const hash of seeds){await Promise.all(pages.map(p=>navigate(p,hash)));await collect();}
  for(let depth=1;depth<=2;depth++){
   const batch=[...links];links=new Set();
   for(const hash of batch){
    visited.add(hash);
    try{
     await Promise.all(pages.map(p=>navigate(p,hash)));
     const data=await Promise.all(pages.map(snapshot));
     const fields=Object.keys(data[0]).filter(k=>!isDeepStrictEqual(data[0][k],data[1][k]));
     report.comparisons.push({role,hash,depth,match:fields.length===0,fields});
     if(fields.length)fs.writeFileSync(path.join(output,`detail-difference-${role}-${report.comparisons.length}.json`),JSON.stringify(data,null,2));
     await collect();
    }catch(e){report.comparisons.push({role,hash,match:false,error:e.message});}
   }
  }
  pair.forEach((p,i)=>{if(p.backend.errors.length)report.errors.push({role,side:i?'reconstructed':'original',messages:p.backend.errors});});
  await Promise.all(pair.map(p=>p.context.close()));
  fs.writeFileSync(path.join(output,'detail-comparison.json'),JSON.stringify(report,null,2));
  console.log(role,report.comparisons.filter(c=>c.role===role).length,'detail comparisons');
 }
 // Verify the actual npm run dev server as well as the static production build.
 const {context,backend}=await isolatedContext(browser,'anonymous');const page=await context.newPage();
 await ready(page,'http://127.0.0.1:5174/');assert.equal(await page.locator('#home-title').count(),1);
 await navigate(page,'#register');assert.equal(await page.locator('[data-registration-form]').count(),1);
 assert.deepEqual(backend.errors,[]);report.dev={url:'http://127.0.0.1:5174/',home:true,registration:true,runtimeErrors:0};await context.close();
}finally{
 fs.writeFileSync(path.join(output,'detail-comparison.json'),JSON.stringify(report,null,2));
 await browser.close();await Promise.all(servers.map(s=>new Promise(r=>s.close(r))));
}
console.log(JSON.stringify({comparisons:report.comparisons.length,matches:report.comparisons.filter(c=>c.match).length,errors:report.errors,dev:report.dev},null,2));
if(report.comparisons.some(c=>!c.match)||report.errors.length)process.exitCode=1;
