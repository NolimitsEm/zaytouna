import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {getJson,postJson} from '../src/services/http.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=fs.readFileSync(path.join(root,'../dist/assets/legacyApp-Cum0wzIn.js'),'utf8');
const symbols=JSON.parse(fs.readFileSync(path.join(root,'forensics/symbol-map.json'),'utf8'));
for(const method of ['getJson','postJson']){
 for(const fixture of [
  {name:'success',status:200,data:{ok:true,user:{id:'fixture'}}},
  {name:'reason precedence',status:400,data:{reason:'reason',detail:'detail',error:'error'}},
  {name:'detail precedence',status:401,data:{detail:'detail',error:'error'}},
  {name:'server error',status:500,data:{error:'fixture failure'}},
  {name:'non-JSON response',status:502,text:'<html>unavailable</html>'},
  {name:'empty success',status:204,text:''},
 ])test(`${method}: original/recovered ${fixture.name}`,async()=>{
  const calls=[];
  const mockFetch=async(...args)=>{calls.push(JSON.stringify(args));return new Response(fixture.status===204?null:fixture.text??JSON.stringify(fixture.data),{status:fixture.status});};
  const symbol=symbols.find(s=>s.name===method);
  const original=vm.createContext({fetch:mockFetch});
  vm.runInContext(source.slice(symbol.start,symbol.end),original);
  const previous=globalThis.fetch;globalThis.fetch=mockFetch;
  const result=async fn=>{try{return{value:await fn('/api/fixture',{safe:'test-only'})};}catch(e){return{error:e.message};}};
  try{
   assert.equal(JSON.stringify(await result(original[symbol.original])),JSON.stringify(await result(method==='getJson'?getJson:postJson)));
   assert.equal(calls[0],calls[1]);
   assert.equal(JSON.parse(calls[0])[1].credentials,'same-origin');
  }finally{globalThis.fetch=previous;}
 });
}
