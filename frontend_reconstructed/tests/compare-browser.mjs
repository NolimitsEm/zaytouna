import fs from 'node:fs';
import path from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {chromium} from 'playwright';
import {PNG} from 'pngjs';
import {root,output,serve,isolatedContext,ready,navigate,snapshot,stabilizeScreenshot} from './support.mjs';
const routes=['home','about','teachers','programs','activities','news','media','contact','register','platform','courses','lesson','lessonPreview','quran','fiqh','aqida','exams','examSession','examPreview','examEditor','examCorrection','exerciseCorrection','questionnaires','questionnaireSession','questionnairePreview','questionnaireEditor','questionnaireResults','login','completeSignup','profile','student','studentBulletin','studentResults','generalPlan','teacher','teacherAbsence','lessonPrep','examPrep','admin','adminAbsences','generalPlans','users','levels','groups','subjects','schedule','lessons','examManagement','questionnaireManagement','analytics','logs'];
const publicRoutes=new Set(routes.slice(0,10).concat(['login','completeSignup']));
const servers=await Promise.all([serve(path.resolve(root,'../dist'),4175),serve(path.join(root,'build'),4176)]);
const browser=await chromium.launch({channel:'chrome',headless:true});
const report={description:'Original dist and rebuilt output, isolated deterministic API fixtures; no real backend called.',routes:routes.length,comparisons:[],screenshots:[],errors:[],failures:[]};
function pixels(a,b){const p=PNG.sync.read(a),q=PNG.sync.read(b);if(p.width!==q.width||p.height!==q.height)return{dimensionsMatch:false,original:[p.width,p.height],reconstructed:[q.width,q.height]};let difference=0;for(let i=0;i<p.data.length;i+=4){if(Math.max(...[0,1,2,3].map(c=>Math.abs(p.data[i+c]-q.data[i+c])))>12)difference++;}return{dimensionsMatch:true,width:p.width,height:p.height,differingPixels:difference,totalPixels:p.width*p.height,ratio:difference/(p.width*p.height)};}
try{
 for(const role of ['anonymous','student','teacher','admin']){
  const pair=await Promise.all([isolatedContext(browser,role),isolatedContext(browser,role)]);
  const pages=await Promise.all(pair.map(x=>x.context.newPage()));
  await Promise.all(pages.map((p,i)=>ready(p,`http://127.0.0.1:${4175+i}/`)));
  for(const route of routes){
   try{
    await Promise.all(pages.map(p=>navigate(p,'#'+route)));
    const data=await Promise.all(pages.map(snapshot));
    const fields=Object.keys(data[0]).filter(k=>!isDeepStrictEqual(data[0][k],data[1][k]));
    report.comparisons.push({role,route,match:fields.length===0,fields,originalRoute:data[0].route,reconstructedRoute:data[1].route,originalOverflow:data[0].overflow,reconstructedOverflow:data[1].overflow});
    if(fields.length){report.failures.push({role,route,fields});fs.writeFileSync(path.join(output,`difference-${role}-${route}.json`),JSON.stringify(data,null,2));}
    if((role==='anonymous'&&publicRoutes.has(route))||(role===route)||role==='admin'&&['users','levels','schedule','analytics','examManagement'].includes(route)){
     await Promise.all(pages.map(stabilizeScreenshot));
     const buffers=await Promise.all(pages.map((p,i)=>p.screenshot({path:path.join(output,`${i?'reconstructed':'original'}-${role}-${route}-desktop.png`),fullPage:true,animations:'disabled'})));
     report.screenshots.push({role,route,viewport:'desktop',...pixels(...buffers)});
    }
   }catch(error){report.failures.push({role,route,error:error.message});}
  }
  for(const route of (role==='anonymous'?['home','register','login','teachers','contact']:[role])){
   await Promise.all(pages.map(p=>p.setViewportSize({width:390,height:844})));
   await Promise.all(pages.map(p=>navigate(p,'#'+route)));
   const data=await Promise.all(pages.map(snapshot));
   report.comparisons.push({role,route,viewport:'mobile',match:isDeepStrictEqual(data[0],data[1]),originalOverflow:data[0].overflow,reconstructedOverflow:data[1].overflow});
   await Promise.all(pages.map(stabilizeScreenshot));
   const buffers=await Promise.all(pages.map((p,i)=>p.screenshot({path:path.join(output,`${i?'reconstructed':'original'}-${role}-${route}-mobile.png`),fullPage:true,animations:'disabled'})));
   report.screenshots.push({role,route,viewport:'mobile',...pixels(...buffers)});
  }
  pair.forEach((p,i)=>{if(p.backend.errors.length)report.errors.push({role,side:i?'reconstructed':'original',errors:p.backend.errors});});
  await Promise.all(pair.map(p=>p.context.close()));
  fs.writeFileSync(path.join(output,'route-comparison.json'),JSON.stringify(report,null,2));
  console.log(role,report.comparisons.filter(r=>r.role===role).length,'comparisons; failures',report.failures.length);
 }
}finally{
 fs.writeFileSync(path.join(output,'route-comparison.json'),JSON.stringify(report,null,2));
 await browser.close();await Promise.all(servers.map(server=>new Promise(r=>server.close(r))));
}
console.log(JSON.stringify({routes:routes.length,comparisons:report.comparisons.length,matches:report.comparisons.filter(x=>x.match).length,failures:report.failures,errors:report.errors,screenshotMaxRatio:Math.max(...report.screenshots.map(s=>s.ratio||0)),screenshotDimensionDifferences:report.screenshots.filter(s=>!s.dimensionsMatch)},null,2));
if(report.failures.length||report.errors.length||report.comparisons.some(c=>!c.match)||report.screenshots.some(s=>!s.dimensionsMatch||s.ratio>0.01))process.exitCode=1;
