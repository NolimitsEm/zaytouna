import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {chromium} from 'playwright';
import {root,output,serve,ready,navigate} from './support.mjs';
import {memoryApi,password} from '../../backend/test-support/memory-api.js';
const users=[
 {id:'admin',role:'admin',name:'إدارة اختبار',email:'admin@example.invalid'},
 {id:'teacher',role:'teacher',name:'أستاذ اختبار',email:'teacher@example.invalid'},
 {id:'s1',role:'student',name:'أَحْمَد بن علي',email:'s1@example.invalid',niveauId:'n1',groupeId:'ga'},
 {id:'s2',role:'student',name:'إياد محمد',email:'s2@example.invalid',niveauId:'n1',groupeId:'gb'},
 {id:'s3',role:'student',name:'سارة',email:'s3@example.invalid',niveauId:'n2',groupeId:'ga'},
 {id:'s4',role:'student',name:'طالب معطّل',email:'s4@example.invalid',niveauId:'n1',groupeId:'ga',isDisabled:true,disabledReason:'too_many_failed_login_attempts'},
 {id:'s5',role:'student',name:'طالب غير مؤكد',email:'s5@example.invalid',niveauId:'n1',groupeId:'ga',isDisabled:true,emailConfirmed:false},
].map(user=>({password,emailConfirmed:true,isDisabled:false,sessionVersion:0,residence:'تونس',payment:{allYear:true,s1:true,s2:true},...user}));
const flags=Object.fromEntries(['correctedExamExamplesSeededV1','examCorrectionExamplesSeeded','ilyasCompletedSemesterWorkV1','ilyasDemoRestoredV1','questionnaireResultExamplesSeededV1'].map(key=>[key,'true']));
const staticServer=await serve(path.join(root,'build'),4181);
const api=await memoryApi({users,state:flags,staticHandler:(req,res)=>{
 const upstream=http.get('http://127.0.0.1:4181'+req.url,result=>{res.writeHead(result.statusCode,result.headers);result.pipe(res);});upstream.on('error',()=>{res.writeHead(502);res.end();});
}});
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'fr-FR',timezoneId:'Africa/Tunis'});
const page=await context.newPage();page.setDefaultTimeout(10000);
const report={description:'Production frontend + actual backend HTTP/auth/permission handlers; in-memory storage only. No MySQL writes, real mail or Zoom.',cases:[],errors:[]};
page.on('pageerror',error=>report.errors.push(error.message));page.on('dialog',dialog=>dialog.accept());
await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
const check=async(name,action)=>{await action();report.cases.push({name,pass:true});console.log('PASS',name);};
const waitForStore=async predicate=>{for(let i=0;i<100;i++){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,30));}assert.ok(predicate(),'Expected persisted backend state');};
const apiLogin=async(id,pw)=>fetch(api.origin+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:id,password:pw})});
try{
 await ready(page,api.origin+'/');await navigate(page,'#login');await page.locator('[name=email]').fill('admin@example.invalid');await page.locator('[name=password]').fill(password);await page.locator('[data-login-form] button[type=submit]').click();await page.waitForFunction(()=>document.body.dataset.route==='admin');
 await check('real signed-cookie admin login and role-scoped app-state load',async()=>{
  const cookies=await context.cookies();assert.ok(cookies.some(c=>c.name==='zaytouna_session'&&c.httpOnly));assert.equal((await page.request.get(api.origin+'/api/auth/session')).status(),200);
 });
 await navigate(page,'#schedule');let form=page.locator('[data-schedule-add-form]');await form.locator('[data-schedule-student-picker] summary').click();
 await check('all groups shows only active students in the selected level',async()=>{
  assert.equal(await form.locator('.schedule-student-option:visible').count(),2);assert.equal(await form.locator('[value=s4]').count(),0);assert.equal(await form.locator('[value=s5]').count(),0);
 });
 await check('Arabic search and clearing search restore the cohort list',async()=>{
  await form.locator('[data-schedule-student-search]').fill('احمد');assert.equal(await form.locator('.schedule-student-option:visible').count(),1);
  await form.locator('[data-schedule-student-search]').fill('لا يوجد');assert.equal(await form.locator('.schedule-student-option:visible').count(),0);assert.equal(await form.locator('[data-schedule-student-empty]').isVisible(),true);
  await form.locator('[data-schedule-student-search]').fill('');assert.equal(await form.locator('.schedule-student-option:visible').count(),2);assert.equal(await form.locator('[data-schedule-student-empty]').isVisible(),false);
 });
 await check('changing level/group updates choices and clears invalid selections',async()=>{
  await form.locator('[data-schedule-groupe-control]').selectOption('ga');await form.locator('[value=s1]').check();
  await form.locator('[data-schedule-niveau-control]').selectOption('n2');assert.equal(await form.locator('[value=s1]').isChecked(),false);assert.equal(await form.locator('.schedule-student-option:visible').count(),1);assert.equal(await form.locator('[value=s3]').isEnabled(),true);
  await form.locator('[data-schedule-niveau-control]').selectOption('n1');await form.locator('[value=s1]').check();
 });
 await check('add lesson persists the selected student IDs through the real API',async()=>{
  await form.locator('[name=title]').fill('حصة اختبار الربط');await form.locator('[name=date]').fill('2026-10-15');await form.locator('[name=startTime]').fill('09:00');await form.locator('[name=endTime]').fill('10:00');
  await form.locator('button[type=submit]').click();await waitForStore(()=>JSON.parse(api.store.state.managedSchedule||'[]').some(s=>s.title==='حصة اختبار الربط'));
  const saved=JSON.parse(api.store.state.managedSchedule).find(s=>s.title==='حصة اختبار الربط');assert.deepEqual(saved.studentIds,['s1']);assert.equal(saved.niveauId,'n1');assert.equal(saved.groupeId,'ga');
 });
 await check('editing a schedule row submits externally associated student checkboxes',async()=>{
  const saved=JSON.parse(api.store.state.managedSchedule).find(s=>s.title==='حصة اختبار الربط');
  const editor=page.locator(`[data-schedule-edit-form][data-schedule-id="${saved.id}"]`);const row=editor.locator('xpath=ancestor::tr');
  await row.locator('[data-schedule-groupe-control]').selectOption('');await row.locator('[data-schedule-student-picker] summary').click();await row.locator('[value=s2]').check();
  await editor.locator('button[type=submit]').click();await waitForStore(()=>JSON.parse(api.store.state.managedSchedule).find(s=>s.id===saved.id)?.studentIds?.length===2);
  assert.deepEqual(JSON.parse(api.store.state.managedSchedule).find(s=>s.id===saved.id).studentIds.sort(),['s1','s2']);
 });
 await check('failed logins do not disable the account or revoke another valid session',async()=>{
  for(let i=0;i<5;i++)assert.equal((await apiLogin('s1','wrong')).status,401);
  assert.equal((await apiLogin('s1',password)).status,429);assert.equal(api.store.users.find(u=>u.id==='s1').isDisabled,false);assert.equal((await page.request.get(api.origin+'/api/auth/session')).status(),200);
 });
 await navigate(page,'#users?view=students&niveau=n1&groupe=ga');
 await check('admin unlock enables immediate login without any activation email',async()=>{
  await page.locator('[data-unlock-user=s1]').click();await page.locator('.toast-success').last().waitFor();assert.equal((await apiLogin('s1',password)).status,200);
  assert.equal(api.store.requests.some(r=>r.path==='/api/send-activation-email'),false);
 });
 await check('legacy disabled confirmed account is enabled, not re-enrolled',async()=>{
  for(let i=0;i<5;i++)await apiLogin('s4','wrong');assert.equal((await apiLogin('s4',password)).status,429);
  await page.locator('[data-toggle-user=s4]').click();await waitForStore(()=>!api.store.users.find(u=>u.id==='s4').isDisabled);
  const user=api.store.users.find(u=>u.id==='s4');assert.equal(user.emailConfirmed,true);assert.equal(user.password,password);assert.equal(user.disabledReason,undefined);assert.equal((await apiLogin('s4',password)).status,200);
  assert.equal(api.store.requests.some(r=>r.path==='/api/send-activation-email'),false);
 });
 await check('unconfirmed account is not silently verified or emailed by status toggle',async()=>{
  const response=page.waitForResponse(r=>r.url().endsWith('/api/admin/users/status')&&r.request().postDataJSON()?.id==='s5');await page.locator('[data-toggle-user=s5]').click();assert.equal((await response).status(),409);
  const user=api.store.users.find(u=>u.id==='s5');assert.equal(user.emailConfirmed,false);assert.equal(user.isDisabled,true);assert.equal(api.store.requests.some(r=>r.path==='/api/send-activation-email'),false);
 });
 await navigate(page,'#schedule');form=page.locator('[data-schedule-add-form]');await form.locator('[data-schedule-student-picker] summary').click();
 await check('reactivated student becomes available in the schedule picker',async()=>{assert.equal(await form.locator('[value=s4]').isVisible(),true);assert.equal(await form.locator('[value=s4]').isEnabled(),true);});
 assert.deepEqual(report.errors,[]);
}catch(error){report.failure=error.stack;console.error(error);process.exitCode=1;}
finally{
 report.apiRequests=api.store.requests.filter(r=>r.path.startsWith('/api/'));report.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(output,'bugfix-integration.json'),JSON.stringify(report,null,2));
 await context.close();await browser.close();await api.close();await new Promise(resolve=>staticServer.close(resolve));
}
console.log(JSON.stringify({passed:report.cases.length,errors:report.errors,failure:report.failure},null,2));
