import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'forensics/validation');
const checks=[];
for(const [name,cwd,args] of [
 ['backend-fix-tests',path.resolve(root,'../backend'),['--test','--test-reporter=tap','server.test.js','login-security.test.js']],
 ['frontend-fix-tests',root,['--test','--test-reporter=tap',...fs.readdirSync(path.join(root,'tests')).filter(f=>f.endsWith('.test.mjs')).map(f=>'tests/'+f)]],
 ['bugfix-build',root,['node_modules/vite/bin/vite.js','build']],
 ['bugfix-evidence',root,['tools/inventory.mjs']],
]){
 const result=spawnSync(process.execPath,args,{cwd,encoding:'utf8',windowsHide:true,maxBuffer:10*1024*1024});
 const log=(result.stdout||'')+(result.stderr||'');fs.writeFileSync(path.join(out,name+'.log'),log);
 checks.push({name,exitCode:result.status,tests:Number(log.match(/# tests (\d+)/)?.[1])||undefined,failed:Number(log.match(/# fail (\d+)/)?.[1])||0});
 if(result.status!==0)throw new Error(name+' failed: '+log);console.log(name,'PASS');
}
const browser=JSON.parse(fs.readFileSync(path.join(out,'bugfix-integration.json'),'utf8'));
const workflows=JSON.parse(fs.readFileSync(path.join(out,'interaction-report.json'),'utf8'));
if(browser.failure||browser.errors.length||browser.cases.length!==11||workflows.tests.length!==20||workflows.tests.some(t=>!t.pass))throw new Error('Browser report is incomplete or failed');
const result={checkedAt:new Date().toISOString(),checks,integrationScenarios:browser.cases.length,legacyInteractionWorkflows:workflows.tests.length,liveDatabase:JSON.parse(fs.readFileSync(path.join(out,'backend-data-audit.json'),'utf8')),note:'Real HTTP/auth/permission handlers tested with isolated memory storage. Live MySQL authentication remains blocked; no real accounts changed.'};
fs.writeFileSync(path.join(out,'bugfix-verification.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
