import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as XLSX from 'xlsx';
import {state} from '../src/context/state.js';
import {safeJsonParse} from '../src/utils/json.js';
import * as defaults from '../src/data/defaults.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=fs.readFileSync(path.join(root,'../dist/assets/legacyApp-Cum0wzIn.js'),'utf8');
const symbols=JSON.parse(fs.readFileSync(path.join(root,'forensics/symbol-map.json'),'utf8'));
const byName=new Map(symbols.map(s=>[s.name,s]));
const stateMap=JSON.parse(fs.readFileSync(path.join(root,'forensics/state-map.json'),'utf8'));
const values={...defaults,subjects:defaults.defaultSubjects,levels:defaults.defaultLevels,groups:defaults.defaultGroups,users:defaults.defaultUsers,currentUser:defaults.defaultUsers[0],allGroupsAliases:new Set(['all','all-groups','all_groups','tous','toutes','كل المجموعات','كل المجموعات في المستوى']),gradeSettings:{semesterCoefficients:{s1:1,s2:2},subjectCoefficients:{}},courses:defaults.defaultCourses,exams:[],examSubmissions:[],questionnaireSubmissions:[],questionnaires:defaults.defaultQuestionnaires,deletedUserIds:[]};
Object.assign(state,values);
const original=vm.createContext({structuredClone,URL,URLSearchParams,Date,Intl,Set,Map,Uint32Array,Uint8Array,crypto:globalThis.crypto,window:{location:{origin:'http://localhost'}},...Object.fromEntries(Object.entries(stateMap).map(([old,name])=>[old,values[name]]))});
vm.runInContext(symbols.map(s=>source.slice(s.start,s.end)).join('\n'),original);
globalThis.window={location:{origin:'http://localhost'}};
const samples={
 uniqueStrings:[[['a','a','',null,' b ']],['hello'],[null]],
 normalizeArabicText:[['  إِيمَان   '],['العقيدة'],[' École ']],
 normalizeCreatorRole:[['direction'],['إدارة'],['teacher']],
 targetLevelIds:[[{niveauId:'n1',niveauIds:['n1','n2']}]],
 targetGroupIds:[[{groupeId:'all',groupeIds:['ga','ga','toutes']}]],
 matchesStudentAudience:[[{niveauId:'n1',groupeId:'ga'},defaults.defaultUsers[0],{niveaux:defaults.defaultLevels,groupes:defaults.defaultGroups}],[{niveauId:'n3'},defaults.defaultUsers[0]]],
 encodeEntityReference:[['course',25],['exam','x'],['bad:type','3']],
 decodeEntityReference:[['course','course:42'],['exam','course:42']],
 createNumericId:[[[{id:1002001}],{now:1002,entropy:1}],[[],{now:1002,entropy:999}]],
 normalizePayment:[[{allYear:true}],[{s1:true,s2:false}],[{s1:true,s2:true}]],
 validatePassword:[['short'],['lowercase1!'],['Uppercase1!'],['NoNumbers!'],['NoSymbols123']],
 importedRole:[['professeur'],['إدارة'],['student']],
 importedBoolean:[['oui'],['مدفوع'],['false']],
 normalizeSemester:[['s2'],['invalid']],
 questionPoints:[[{points:5}],[{points:0}],[{}]],
 formatNumber:[[12],[12.345],[0],['2.5']],
 parseScore:[['18/20'],['5/10'],['قيد التصحيح (5/20 آلي)'],['-']],
 average:[[[12,16,20]],[[]]],
 escapeHtml:[['<b title="x">&</b>']],
 safeUrl:[['javascript:alert(1)'],['/assets/file.png'],['https://example.org'],['data:image/png;base64,AAAA']],
 safeImageUrl:[['data:application/pdf;base64,AAAA'],['assets/main-logo.png']],
 csvCell:[['a"b;c']],
 equalAnswers:[[['A','B'],['b','a']],[['a'],['b']]],
 scoreAnswers:[[[{type:'qcm',points:5,answer:['yes'],correctAnswers:['yes']},{type:'text',points:5,answer:'fixture'}]]],
 examAvailability:[[{opensAt:'2026-09-14T09:00:00Z',durationMinutes:60},new Date('2026-09-14T08:00:00Z')],[{opensAt:'2026-09-14T09:00:00Z',durationMinutes:60},new Date('2026-09-14T09:30:00Z')],[{opensAt:'2026-09-14T09:00:00Z',durationMinutes:60},new Date('2026-09-14T10:01:00Z')]],
};
const plain=value=>JSON.stringify(value);
for(const [name,cases] of Object.entries(samples)){
 test('original/recovered equivalence: '+name,async()=>{
  const symbol=byName.get(name);assert.ok(symbol,name+' must be mapped');
  const recovered=(await import('../src/'+symbol.module))[name];
  for(const args of cases){const a=original[symbol.original](...structuredClone(args)),b=recovered(...structuredClone(args));assert.equal(plain(b),plain(a));}
 });
}
test('all 680 original application functions are represented exactly once',()=>{
 assert.equal(symbols.length,680);assert.equal(new Set(symbols.map(s=>s.original)).size,680);assert.equal(new Set(symbols.map(s=>s.name)).size,680);
 for(const s of symbols)assert.ok(fs.readFileSync(path.join(root,'src',s.module),'utf8').includes('function '+s.name+'('));
});
test('inferred missing JSON helper: valid data and malformed-data fallback',()=>{
 assert.deepEqual(safeJsonParse('[1,2]',[]),[1,2]);assert.deepEqual(safeJsonParse('',[]),[]);assert.deepEqual(safeJsonParse('{broken',{}),{});
});
test('replacement SheetJS reads surviving template exactly as bundled vendor',()=>{
 const vendor=vm.createContext({Buffer,Uint8Array,ArrayBuffer,console});
 vm.runInContext(source.slice(3436,368558)+';globalThis.recoveredRead=xn;globalThis.recoveredUtils=$S;',vendor);
 const bytes=fs.readFileSync(path.join(root,'../dist/templates/exemple-import-comptes.xlsx'));
 const baseline=vendor.recoveredRead(bytes,{type:'buffer'}),rebuilt=XLSX.read(bytes,{type:'buffer'});
 assert.equal(plain(baseline.SheetNames),plain(rebuilt.SheetNames));
 for(const name of baseline.SheetNames)assert.equal(plain(vendor.recoveredUtils.sheet_to_json(baseline.Sheets[name],{defval:''})),plain(XLSX.utils.sheet_to_json(rebuilt.Sheets[name],{defval:''})));
});
