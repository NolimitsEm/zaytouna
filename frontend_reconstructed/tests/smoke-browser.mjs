import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
import {root,output,serve,isolatedContext,ready,snapshot} from './support.mjs';
const original=await serve(path.resolve(root,'../dist'),4175);
const recovered=await serve(path.join(root,'build'),4176);
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const results=[];
 for(const [label,url] of [['original','http://127.0.0.1:4175'],['reconstructed','http://127.0.0.1:4176']]){
  const {context,backend}=await isolatedContext(browser);
  const page=await context.newPage();
  try{await ready(page,url);await page.screenshot({path:path.join(output,label+'-home.png'),fullPage:true,animations:'disabled'});results.push({label,snapshot:await snapshot(page),errors:backend.errors});}
  catch(error){results.push({label,error:error.message,errors:backend.errors});}
  await context.close();
 }
 fs.writeFileSync(path.join(output,'smoke.json'),JSON.stringify(results,null,2));
 console.log(JSON.stringify(results.map(r=>({...r,snapshot:r.snapshot?{route:r.snapshot.route,text:r.snapshot.text.slice(0,200),images:r.snapshot.images}:undefined})),null,2));
}finally{await browser.close();await Promise.all([new Promise(r=>original.close(r)),new Promise(r=>recovered.close(r))]);}
