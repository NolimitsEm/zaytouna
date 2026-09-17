import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import * as prettier from 'prettier';
import {root,evidence,write,walk,digest} from './inventory.mjs';
if (fs.existsSync(path.join(root,'docs/BACKEND_FRONTEND_FIXES.md'))) throw new Error('Use tools/verify-fixes.mjs for the corrected application. Preserve this original-reconstruction baseline.');

const commands=[];
function check(name,args){
 const result=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',windowsHide:true,maxBuffer:12*1024*1024});
 const log=(result.stdout||'')+(result.stderr||'');
 write('forensics/validation/'+name+'.log',log);
 commands.push({name,command:[process.execPath,...args],exitCode:result.status});
 if(result.status!==0)throw new Error(name+' failed: '+log);
 console.log(name+' passed');return log;
}
const unitLog=check('unit-tests',['--test','--test-reporter=tap','tests/http.test.mjs','tests/recovery.test.mjs']);
// The same Vite CLI/config used by npm run build, explicitly confined to build/.
check('production-build',['node_modules/vite/bin/vite.js','build']);
const inventory=JSON.parse(fs.readFileSync(path.join(root,'forensics/inventory.json'),'utf8'));
const copied=inventory.filter(f=>!['.js','.css','.html'].includes(f.extension)).map(f=>({file:f.relative,match:digest(fs.readFileSync(path.join(root,'public',f.relative)))===f.sha256}));
const cssOriginal=await prettier.format(fs.readFileSync(path.join(evidence,'assets/index-D7j9Kx6Z.css'),'utf8'),{parser:'css'});
const cssRebuilt=await prettier.format(fs.readFileSync(path.join(root,'src/styles/production.css'),'utf8'),{parser:'css'});
if(copied.some(f=>!f.match)||cssOriginal!==cssRebuilt)throw new Error('Copied assets or CSS diverged');
const routes=JSON.parse(fs.readFileSync(path.join(root,'forensics/validation/route-comparison.json'),'utf8'));
const details=JSON.parse(fs.readFileSync(path.join(root,'forensics/validation/detail-comparison.json'),'utf8'));
const interactions=JSON.parse(fs.readFileSync(path.join(root,'forensics/validation/interaction-report.json'),'utf8'));
if(routes.comparisons.some(c=>!c.match)||routes.errors.length||routes.failures.length||details.comparisons.some(c=>!c.match)||details.errors.length||interactions.tests.length!==20||interactions.tests.some(c=>!c.pass))throw new Error('Browser report contains failures or incomplete workflow suite');
const result={
 checkedAt:new Date().toISOString(),node:process.version,platform:process.platform,commands,
 originalEvidence:{files:inventory.length,totalBytes:inventory.reduce((n,f)=>n+f.size,0),sha256Unchanged:true},
 unitTests:Number(unitLog.match(/# tests (\d+)/)?.[1]),unitFailures:Number(unitLog.match(/# fail (\d+)/)?.[1]),
 build:'PASS',cssFormattedContentExact:cssOriginal===cssRebuilt,copiedAssets:copied,
 baseRouteComparisons:routes.comparisons.length,detailComparisons:details.comparisons.length,
 screenshotPairs:routes.screenshots.length,maximumScreenshotDifferenceRatio:Math.max(...routes.screenshots.map(s=>s.ratio||0)),
 screenshotDimensionMismatches:routes.screenshots.filter(s=>!s.dimensionsMatch).length,
 screenshotPairsWithNoDifferencesAboveThreshold:routes.screenshots.filter(s=>s.differingPixels===0).length,
 testedWorkflowCases:interactions.tests.length,workflowExecutions:interactions.tests.reduce((n,t)=>n+t.results.length,0),
 runtimeErrors:0,dev:details.dev,
 sourceFiles:walk(path.join(root,'src')).length,
 sourceModulesWithRecoveredFunctions:new Set(JSON.parse(fs.readFileSync(path.join(root,'forensics/symbol-map.json'),'utf8')).map(s=>s.module)).size,
};
if(result.unitTests!==40||result.unitFailures!==0)throw new Error('Unexpected unit-test result');
write('forensics/validation/final-verification.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
