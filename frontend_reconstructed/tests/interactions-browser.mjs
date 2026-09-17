import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {root,output,serve,isolatedContext,ready,navigate} from './support.mjs';
import {defaultCourses,defaultQuestionnaires,demoCorrectionExam,defaultLevels,defaultUsers} from '../src/data/defaults.js';
const servers=await Promise.all([serve(path.resolve(root,'../dist'),4177),serve(path.join(root,'build'),4178)]);
const browser=await chromium.launch({channel:'chrome',headless:true});
const report={tests:[],description:'Interactions in isolated browser contexts; all /api requests intercepted. Fixture behavior is not a recovered backend.'};
const fixtureExam={...structuredClone(demoCorrectionExam),opensAt:'2026-09-14T09:00',durationMinutes:240,duration:'240 دقيقة',publishedToStudents:true};
const flags=Object.fromEntries(['correctedExamExamplesSeededV1','examCorrectionExamplesSeeded','ilyasCompletedSemesterWorkV1','ilyasDemoRestoredV1','questionnaireResultExamplesSeededV1'].map(k=>[k,'true']));
const fixtures={...flags,managedExams:JSON.stringify([fixtureExam])};
const submit=async(page,selector)=>page.locator(selector).evaluate(form=>form.requestSubmit());
const sent=async(backend,path)=>{for(let i=0;i<80;i++){const calls=backend.requests.filter(r=>r.path===path);if(calls.length)return calls.at(-1);await new Promise(r=>setTimeout(r,25));}throw new Error('No request to '+path);};
async function run(name,role,action,options={}){
 if(process.env.RECOVERY_CASE&& !name.includes(process.env.RECOVERY_CASE))return;
 const results=[];
 for(const side of options.onlyReconstructed?[1]:[0,1]){
  const {context,backend}=await isolatedContext(browser,role,options.mobile?{width:390,height:844}:undefined,{state:structuredClone(options.state||fixtures)});
  const page=await context.newPage();page.setDefaultTimeout(8000);
  try{
   await ready(page,`http://127.0.0.1:${4177+side}/${options.hash||''}`);
   const detail=await action(page,backend,side);
   assert.equal(backend.errors.length,0,backend.errors.join('; '));
   results.push({side:side?'reconstructed':'original',pass:true,detail});
  }catch(error){results.push({side:side?'reconstructed':'original',pass:false,error:error.message,errors:backend.errors});}
  await context.close();
 }
 const pass=results.every(r=>r.pass);report.tests.push({name,role,pass,results});
 console.log(pass?'PASS':'FAIL',name,pass?'':JSON.stringify(results));
 fs.writeFileSync(path.join(output,'interaction-report.json'),JSON.stringify(report,null,2));
}
try{
 await run('mobile menu, dropdown and navigation','anonymous',async page=>{
  await page.locator('.menu-button').click();assert.equal(await page.locator('.menu-button').getAttribute('aria-expanded'),'true');
  await page.locator('.nav-dropdown summary').first().click();await page.locator('.nav-links a[href="#about"]').click();
  await page.waitForFunction(()=>document.body.dataset.route==='about');assert.equal(await page.locator('.menu-button').getAttribute('aria-expanded'),'false');
  return {route:'about',menuClosed:true};
 },{mobile:true});
 await run('public details disclosure','anonymous',async page=>{
  const button=page.locator('[data-toggle-public-detail]').first();await button.click();await page.locator('dialog.public-detail-dialog[open]').waitFor();await page.locator('.public-detail-dialog-close').click();await page.locator('dialog.public-detail-dialog').waitFor({state:'detached'});
  return {dialogOpenedAndClosed:true};
 });
 await run('route aliases and unknown-route fallback','anonymous',async page=>{
  for(const [hash,route]of [['#connexion','login'],['#connection','login'],['#course','login'],['#cours','login'],['#/about/','about']]){await page.evaluate(h=>location.hash=h,hash);await page.waitForFunction(r=>document.body.dataset.route===r,route);}
  await page.evaluate(()=>location.hash='unknown-test-route');await page.locator('#home-title').waitFor();return{aliases:5,unknownRendersHome:true};
 });
 await run('invalid login, student login, sidebar, logout','anonymous',async(page,backend)=>{
  await navigate(page,'#login');const form=page.locator('[data-login-form]');await form.locator('[name=email]').fill('sara@example.org');await form.locator('[name=password]').fill('wrong');await submit(page,'[data-login-form]');
  await page.locator('.toast-error').first().waitFor();assert.equal(backend.user,null);
  await form.locator('[name=password]').fill('FixturePassword@123');await submit(page,'[data-login-form]');await page.waitForFunction(()=>document.body.dataset.route==='student');
  await page.locator('[data-toggle-app-sidebar]').click();assert.equal(await page.locator('[data-toggle-app-sidebar]').getAttribute('aria-expanded'),'true');
  await page.locator('[data-logout]').first().click();await page.waitForFunction(()=>document.body.dataset.route==='home');assert.equal(backend.user,null);
  return {failedAttempt:true,loginRole:'student',loggedOut:true};
 });
 for(const role of ['teacher','admin'])await run(role+' login redirect','anonymous',async(page,backend)=>{
  await navigate(page,'#login');await page.locator('[name=email]').fill(role+'@example.org');await page.locator('[name=password]').fill('FixturePassword@123');await submit(page,'[data-login-form]');await page.waitForFunction(role=>document.body.dataset.route===role,role);return{role:backend.user.role};
 });
 await run('registration constraints and request payload','anonymous',async(page,backend)=>{
  await navigate(page,'#register');assert.equal(await page.locator('[data-registration-form]').evaluate(f=>f.checkValidity()),false);
  const values={secondName:'اختبار',firstName:'استرجاع',birthDate:'01/01/2000',cinPassport:'TEST0001',profession:'طالب',email:'fixture@example.invalid',phone:'22111222',message:'طلب اختبار معزول'};
  for(const[name,value]of Object.entries(values))await page.locator(`[data-registration-form] [name=${name}]`).fill(value);
  for(const name of ['studyLevel','program','sana'])await page.locator(`[name=${name}]`).selectOption({index:1});
  assert.equal(await page.locator('[data-registration-form]').evaluate(f=>f.checkValidity()),true);
  await submit(page,'[data-registration-form]');const request=await sent(backend,'/api/registration-requests');return{method:request.method,payloadKeys:Object.keys(request.body).sort()};
 });
 await run('activation token capture, validation, completion','anonymous',async(page,backend)=>{
  await page.locator('[data-complete-signup-form]').waitFor();assert.equal(new URL(page.url()).hash,'#completeSignup');
  await page.locator('[name=password]').fill('FixturePassword@123');await page.locator('[name=confirmPassword]').fill('MismatchPassword@123');await submit(page,'[data-complete-signup-form]');
  assert.equal(backend.requests.filter(r=>r.path==='/api/activation-complete').length,0);
  await page.locator('[name=confirmPassword]').fill('FixturePassword@123');await submit(page,'[data-complete-signup-form]');const request=await sent(backend,'/api/activation-complete');return{tokenCaptured:request.body.token==='fixture-token',passwordValidated:true};
 },{hash:'#completeSignup?token=fixture-token'});
 await run('profile update and password validation','student',async(page,backend)=>{
  await navigate(page,'#profile');await page.locator('[data-account-profile-form] [name=phone]').fill('22333444');await page.locator('[name=residence]').fill('تونس');await submit(page,'[data-account-profile-form]');await sent(backend,'/api/auth/profile');
  await page.locator('[data-account-password-form]').waitFor();
  await page.locator('[data-account-password-form] [name=currentPassword]').fill('FixturePassword@123');await page.locator('[data-account-password-form] [name=password]').fill('weak');await page.locator('[name=confirmPassword]').fill('weak');await submit(page,'[data-account-password-form]');
  assert.equal(backend.requests.filter(r=>r.path==='/api/auth/change-password').length,0);
  await page.locator('[data-account-password-form] [name=password]').fill('DifferentPassword@123');await page.locator('[name=confirmPassword]').fill('DifferentPassword@123');await submit(page,'[data-account-password-form]');await sent(backend,'/api/auth/change-password');return{phone:backend.user.phone,passwordValidation:true};
 });
 for(const[type,route,key]of [['level','levels','managedNiveaux'],['group','groups','managedGroupes']])await run(type+' add, edit, delete and save','admin',async(page,backend)=>{
  await navigate(page,'#'+route);await page.locator(`[data-${type}-add-form] [name=name]`).fill('عنصر اختبار');await submit(page,`[data-${type}-add-form]`);
  await page.waitForFunction(()=>[...document.querySelectorAll('input[name=name]')].some(e=>e.value==='عنصر اختبار'));
  const input=page.locator(`table input[value="عنصر اختبار"]`);const formId=await input.getAttribute('form');await input.fill('عنصر معدّل');await submit(page,'#'+formId);
  await page.waitForFunction(()=>[...document.querySelectorAll('input[name=name]')].some(e=>e.value==='عنصر معدّل'));
  const row=page.locator(`table input[value="عنصر معدّل"]`).locator('xpath=ancestor::tr');await row.locator(`[data-delete-${type}]`).click();
  await page.waitForFunction(()=>![...document.querySelectorAll('input[name=name]')].some(e=>e.value==='عنصر معدّل'));
  const saved=JSON.parse(backend.state[key]);assert.equal(saved.some(e=>e.name==='عنصر معدّل'),false);return{crud:true,remaining:saved.length};
 });
 await run('table search and pagination','admin',async(page)=>{
  await navigate(page,'#levels');assert.equal(await page.locator('.levels-table tbody tr:visible').count(),10);
  await page.locator('[data-table-page=next]').click();assert.equal(await page.locator('.levels-table tbody tr:visible').count(),5);
  await page.locator('[data-table-search]').fill('test14');assert.equal(await page.locator('.levels-table tbody tr:visible').count(),1);return{pageSize:10,search:true};
 },{state:{...fixtures,managedNiveaux:JSON.stringify(Array.from({length:15},(_,i)=>({id:'test'+i,name:'مستوى اختبار '+i})))}});
 await run('exam builder, submit answers and score persistence','student',async(page,backend)=>{
  await navigate(page,'#examSession?ref=exam:9001');await page.locator('[data-exam-session-form]').waitFor();
  await page.locator('[name=q-0][value="الطهارة"]').check();await page.locator('[name=q-1]').fill('إجابة اختبار معزول');await page.locator('[name=q-2][value="النوم المستغرق"]').check();
  await submit(page,'[data-exam-session-form]');await page.waitForFunction(()=>document.body.dataset.route==='exams');
  const saved=JSON.parse(backend.state.examSubmissions);assert.ok(saved.some(s=>s.userId==='sara'&&Number(s.examId)===9001));return{answers:saved.find(s=>s.userId==='sara').answers.length};
 });
 await run('questionnaire completion and duplicate-submit state','student',async(page,backend)=>{
  await navigate(page,'#questionnaireSession?ref=questionnaire:1');await page.locator('[data-questionnaire-session-form]').waitFor();
  await page.locator('[name=q-0]').fill('إجابة اختبار معزول');await page.locator('[name=q-1]').first().check();await submit(page,'[data-questionnaire-session-form]');
  await page.waitForFunction(()=>document.body.dataset.route==='questionnaires');assert.ok(JSON.parse(backend.state.questionnaireSubmissions).some(s=>s.userId==='sara'));return{saved:true};
 });
 await run('exam question add/remove controls','admin',async page=>{
  await navigate(page,'#examManagement');const builder=page.locator('[data-exam-question-builder]').first();const before=await builder.locator('[data-exam-builder-question]').count();
  await builder.locator('[data-add-exam-question]').click();assert.equal(await builder.locator('[data-exam-builder-question]').count(),before+1);await builder.locator('[data-remove-exam-question]').last().click();assert.equal(await builder.locator('[data-exam-builder-question]').count(),before);return{builder:true};
 });
 await run('spreadsheet import and activation requests (intercepted)','admin',async(page,backend)=>{
  await navigate(page,'#users?panel=create');await page.locator('input[name=studentsFile]').setInputFiles(path.join(root,'public/templates/exemple-import-comptes.xlsx'));
  const form=page.locator('input[name=studentsFile]').locator('xpath=ancestor::form');await form.evaluate(f=>f.requestSubmit());
  for(let i=0;i<100&&!backend.requests.some(r=>r.path==='/api/send-activation-email');i++)await new Promise(r=>setTimeout(r,30));
  const saved=JSON.parse(backend.state.acceptedUsers||'[]');assert.ok(saved.length>defaultUsers.length);return{created:saved.length-defaultUsers.length,activationRequests:backend.requests.filter(r=>r.path==='/api/send-activation-email').length};
 });
 await run('email settings form and same-origin save (intercepted)','admin',async(page,backend)=>{
  await navigate(page,'#users?panel=email');const form=page.locator('[data-email-settings-form]');
  await form.locator('[name=fromName]').fill('اختبار معزول');await form.locator('[name=fromEmail]').fill('fixture@example.invalid');
  await submit(page,'[data-email-settings-form]');const call=await sent(backend,'/api/email-settings');assert.equal(call.body.fromEmail,'fixture@example.invalid');return{payloadKeys:Object.keys(call.body).sort(),noRealEmailSent:true};
 });
 await run('Zoom creation and hidden-field binding (intercepted)','admin',async(page,backend)=>{
  await navigate(page,'#lessons');const form=page.locator('[data-course-edit-form]').first();await form.locator('xpath=ancestor::details').locator('summary').click();
  await form.locator('[name=zoomDate]').fill('2026-09-14');await form.locator('[name=zoomStartClock]').fill('09:00');await form.locator('[name=zoomEndClock]').fill('10:00');
  await form.locator('[data-create-zoom-meeting]').click();const call=await sent(backend,'/api/zoom/meetings');assert.equal(call.body.durationMinutes,60);
  await page.waitForFunction(()=>document.querySelector('[data-course-edit-form] [name=zoomMeetingId]')?.value==='fixture-zoom');return{durationMinutes:call.body.durationMinutes,fieldsBound:true,noRealMeetingCreated:true};
 });
 await run('original Excel template download bytes','admin',async(page)=>{
  await navigate(page,'#users?panel=create');const pending=page.waitForEvent('download');await page.locator('a[download][href$="exemple-import-comptes.xlsx"]').click();
  const download=await pending,stream=await download.createReadStream(),hash=createHash('sha256');for await(const chunk of stream)hash.update(chunk);
  const digest=hash.digest('hex');assert.equal(digest,createHash('sha256').update(fs.readFileSync(path.join(root,'public/templates/exemple-import-comptes.xlsx'))).digest('hex'));return{filename:download.suggestedFilename(),sha256:digest};
 });
 await run('repaired attachment removal and course save','admin',async(page,backend)=>{
  await navigate(page,'#lessons');const editor=page.locator('[data-course-edit-form]').first();await editor.locator('xpath=ancestor::details').locator('summary').click();await editor.locator('[data-remove-saved-attachment]').first().click();
  assert.equal(await editor.locator('[name=removedAttachmentIndexes]').inputValue(),'[0]');
  assert.equal(await editor.evaluate(f=>f.checkValidity()),true,await editor.evaluate(f=>JSON.stringify([...f.elements].filter(e=>!e.checkValidity()).map(e=>({name:e.name,message:e.validationMessage})))));
  await editor.evaluate(f=>f.requestSubmit());
  for(let i=0;i<120&&JSON.parse(backend.state.teacherCourses||'[]')[0]?.attachments?.some(a=>a.name==='fixture.txt');i++)await new Promise(r=>setTimeout(r,25));
  assert.ok(backend.state.teacherCourses);const saved=JSON.parse(backend.state.teacherCourses);assert.ok(saved[0].attachments.every(a=>a.type==='none'),JSON.stringify({dialogs:backend.dialogs,saved:saved[0],requests:backend.requests.filter(r=>r.method==='POST').map(r=>r.path)}));return{originalUndefinedHelperRepaired:true,emptyAttachmentPlaceholderPreserved:true};
 },{onlyReconstructed:true,state:{...fixtures,teacherCourses:JSON.stringify([{...defaultCourses[0],zoomStartTime:'2026-09-14T09:00',zoomDurationMinutes:60,attachments:[{name:'fixture.txt',label:'fixture.txt',type:'text/plain',url:'data:text/plain;base64,SGVsbG8='}]}])}});
}finally{
 fs.writeFileSync(path.join(output,'interaction-report.json'),JSON.stringify(report,null,2));
 await browser.close();await Promise.all(servers.map(s=>new Promise(r=>s.close(r))));
}
console.log(JSON.stringify({tests:report.tests.length,passed:report.tests.filter(t=>t.pass).length,failed:report.tests.filter(t=>!t.pass).map(t=>t.name)},null,2));
if(report.tests.some(t=>!t.pass))process.exitCode=1;
