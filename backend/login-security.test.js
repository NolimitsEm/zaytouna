import test from "node:test";
import assert from "node:assert/strict";
import { createLoginLimiter } from "./login-security.js";
import { changedAccountAccess, changeAccountAccess } from "./account-access.js";
import { memoryApi, password } from "./test-support/memory-api.js";
const { mutateUserAccessInDatabase, mergeUserSecrets } = await import('./server.js');
const admin={id:'admin-fixture',email:'admin@example.invalid',role:'admin',emailConfirmed:true,isDisabled:false,password,sessionVersion:0};
const student={id:'student-fixture',email:'student@example.invalid',role:'student',emailConfirmed:true,confirmedAt:'2026-01-01',isDisabled:false,password,sessionVersion:0,niveauId:'n1',groupeId:'ga'};
test('temporary throttle expires and resets the failed-attempt counter',()=>{
 let time=1000;const limiter=createLoginLimiter({maxAttempts:2,windowMs:100000,blockMs:1000,now:()=>time});
 const first=limiter.status('ip','USER');limiter.fail(first.key);limiter.fail(first.key);assert.equal(limiter.status('ip','user').allowed,false);
 time+=1001;const next=limiter.status('ip','user');assert.equal(next.allowed,true);assert.equal(limiter.fail(next.key).count,1);
});
test('admin unlock clears this user across IPs and aliases, never another user',()=>{
 const limiter=createLoginLimiter({maxAttempts:1});
 for(const [ip,id] of [['ip1','USER'],['ip2','u@example.invalid'],['ip1','other']])limiter.fail(limiter.status(ip,id).key);
 limiter.clearUser({id:'user',email:'u@example.invalid'});
 assert.equal(limiter.status('ip1','USER').allowed,true);assert.equal(limiter.status('ip2','u@example.invalid').allowed,true);assert.equal(limiter.status('ip1','other').allowed,false);
});
test('reactivation preserves password, confirmation and activation fields',()=>{
 const stored={...student,isDisabled:true,disabledReason:'too_many_failed_login_attempts',disabledAt:'old',activationToken:'existing-token'};
 const next=changedAccountAccess(stored,admin,false);
 assert.equal(next.isDisabled,false);assert.equal(next.password,stored.password);assert.equal(next.confirmedAt,stored.confirmedAt);assert.equal(next.emailConfirmed,true);assert.equal(next.activationToken,stored.activationToken);assert.equal(next.disabledReason,undefined);
});
test('manual disabling invalidates sessions; repeat disabling does not rotate again',()=>{
 const next=changedAccountAccess(student,admin,true);assert.equal(next.sessionVersion,1);assert.equal(next.disabledReason,'admin_disabled');assert.equal(changedAccountAccess(next,admin,true).sessionVersion,1);
});
test('unconfirmed, self, missing and unauthorized changes are rejected',()=>{
 assert.throws(()=>changedAccountAccess({...student,emailConfirmed:false},admin,false),{statusCode:409});
 assert.throws(()=>changedAccountAccess(admin,admin,true),{statusCode:400});
 assert.throws(()=>changedAccountAccess(null,admin,false),{statusCode:404});
 assert.throws(()=>changedAccountAccess(student,student,false),{statusCode:403});
 assert.throws(()=>changedAccountAccess(student,admin,'false'),{statusCode:400});
});
test('failed status save does not clear login protection',async()=>{
 let cleared=false;await assert.rejects(changeAccountAccess({actor:admin,body:{id:student.id,isDisabled:false},mutateUser:async()=>{throw new Error('storage unavailable');},limiter:{clearUser(){cleared=true;}}}));assert.equal(cleared,false);
});
test('database status update locks and updates only the target user inside a transaction',async()=>{
 const events=[];const connection={
  beginTransaction:async()=>events.push('begin'),commit:async()=>events.push('commit'),rollback:async()=>events.push('rollback'),release:()=>events.push('release'),
  execute:async(sql,params)=>{events.push({sql,params});return sql.startsWith('SELECT')?[[{payload:JSON.stringify(student)}]]:[{affectedRows:1}];},
 };
 const result=await mutateUserAccessInDatabase(student.id,user=>changedAccountAccess(user,admin,true),{getConnection:async()=>connection});
 assert.equal(result.isDisabled,true);assert.equal(events[0],'begin');assert.match(events[1].sql,/WHERE id = \? FOR UPDATE/);assert.deepEqual(events[1].params,[student.id]);assert.match(events[2].sql,/UPDATE users SET payload = \? WHERE id = \?/);assert.equal(events[2].params[1],student.id);assert.deepEqual(events.slice(-2),['commit','release']);
});
test('database status write failure rolls back and releases the connection',async()=>{
 const events=[];const connection={beginTransaction:async()=>{},commit:async()=>events.push('commit'),rollback:async()=>events.push('rollback'),release:()=>events.push('release'),execute:async(sql)=>{if(sql.startsWith('UPDATE'))throw new Error('write failed');return[[{payload:JSON.stringify(student)}]];}};
 await assert.rejects(mutateUserAccessInDatabase(student.id,user=>changedAccountAccess(user,admin,true),{getConnection:async()=>connection}),/write failed/);assert.deepEqual(events,['rollback','release']);
});
test('resaving the same password does not rehash it or invalidate a working session',async()=>{
 const [stored]=await mergeUserSecrets({query:async()=>[[]]},[{...student,sessionVersion:4}]);
 const connection={query:async()=>[[{payload:JSON.stringify(stored)}]]};
 const [unchanged]=await mergeUserSecrets(connection,[{...student,sessionVersion:0}],{preserveUserSecurity:true});
 assert.equal(unchanged.password,stored.password);assert.equal(unchanged.sessionVersion,4);
 const [changed]=await mergeUserSecrets(connection,[{...student,password:'DifferentPassword@123'}],{preserveUserSecurity:true});
 assert.notEqual(changed.password,stored.password);assert.equal(changed.sessionVersion,5);
});
test('real HTTP login throttle, admin unlock, sessions and stale state writes',async()=>{
 const api=await memoryApi({users:[admin,student]});
 const request=async(path,body,cookie)=>{
  const response=await fetch(api.origin+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json',Origin:api.origin}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});
  return{status:response.status,body:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0],retry:response.headers.get('Retry-After')};
 };
 try{
  const adminLogin=await request('/api/auth/login',{email:admin.email,password});assert.equal(adminLogin.status,200);
  const studentLogin=await request('/api/auth/login',{email:student.id,password});assert.equal(studentLogin.status,200);
  const oldUsers=structuredClone(api.store.users).map(({password,...u})=>u);
  const oldRevisions=(await request('/api/app-state',undefined,adminLogin.cookie)).body.revisions;
  for(let i=0;i<5;i++)assert.equal((await request('/api/auth/login',{email:i%2?student.id:student.email,password:'wrong'})).status,401);
  const blocked=await request('/api/auth/login',{email:student.email,password});assert.equal(blocked.status,429);assert.ok(Number(blocked.retry)>0);assert.ok(blocked.body.retryAfterSeconds>0);
  assert.equal(api.store.users[1].isDisabled,false);assert.equal((await request('/api/auth/session',undefined,studentLogin.cookie)).status,200);
  assert.equal((await request('/api/admin/users/status',{id:student.id,isDisabled:false})).status,401);
  assert.equal((await request('/api/admin/users/status',{id:admin.id,isDisabled:false},studentLogin.cookie)).status,403);
  assert.equal((await request('/api/admin/users/status',{id:student.id,isDisabled:true},adminLogin.cookie)).status,200);
  assert.equal((await request('/api/auth/session',undefined,studentLogin.cookie)).status,401);
  const enabled=await request('/api/admin/users/status',{id:student.id,isDisabled:false},adminLogin.cookie);assert.equal(enabled.status,200);assert.equal(enabled.body.user.emailConfirmed,true);assert.equal(enabled.body.user.password,undefined);
  const retry=await request('/api/auth/login',{email:student.email,password});assert.equal(retry.status,200);
  // An old browser snapshot cannot restore disabled flags or an old sessionVersion.
  oldUsers[1].isDisabled=true;oldUsers[1].emailConfirmed=false;
  assert.equal((await request('/api/app-state',{items:{acceptedUsers:JSON.stringify(oldUsers)},revisions:oldRevisions},adminLogin.cookie)).status,409);
  assert.equal((await request('/api/auth/session',undefined,retry.cookie)).status,200);
  assert.equal(api.store.users[1].isDisabled,false);assert.equal(api.store.users[1].emailConfirmed,true);
  assert.equal(api.store.requests.some(r=>r.path==='/api/send-activation-email'),false);
 }finally{await api.close();}
});
