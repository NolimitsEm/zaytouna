import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';
import generateModule from '@babel/generator';
import * as t from '@babel/types';
import prettier from 'prettier';
import {root,evidence,write} from './inventory.mjs';
import {names,explicitNames,stateNames} from './semantic-names.mjs';
if (fs.existsSync(path.join(root,'docs/BACKEND_FRONTEND_FIXES.md'))) throw new Error('Post-recovery fixes are present. This forensic generator would overwrite them; edit the maintained source instead.');
const traverse=traverseModule.default, generate=generateModule.default;
const filename='legacyApp-Cum0wzIn.js';
const source=fs.readFileSync(path.join(evidence,'assets',filename),'utf8');
const vendorStart=3436, vendorEnd=source.indexOf('const Oo=');
if(vendorEnd!==368558)throw new Error('Unexpected evidence revision');
const ast=parse(source,{sourceType:'module'});
ast.program.body=ast.program.body.filter(n=>n.start<vendorStart||n.start>=vendorEnd);
const functions=ast.program.body.filter(t.isFunctionDeclaration);
const assigned=new Set();
const manifest=functions.map((node,index)=>{
 let name=explicitNames[node.id.name]||names.get(index)||`recoveredHelper${index}`;
 if(assigned.has(name))name+=index;
 assigned.add(name);
 return {index,original:node.id.name,name,start:node.start,end:node.end,confidence:'INFERRED (name/module); HIGH CONFIDENCE (preserved logic)',module:moduleFor(index,name)};
});
function moduleFor(i,name){
 if(name==='postJson'||name==='getJson')return 'services/http.js';
 if(/^(currentRoute|renderRoute|routeQuery|readPrivateRouteReferences|entityReference|entityHref|resolveEntityReference|canonicalizeEntityRoute|courseHref|currentCourseId|routeLabel|dashboardRoute)$/.test(name))return 'routes/router.js';
 if(i<17)return 'utils/audience.js'; if(i<21)return 'utils/identifiers.js';
 if(i<31 || (i>=34&&i<=48) || (i>=53&&i<=60) || (i>=80&&i<=114))return 'services/state-repository.js';
 if(i<=35)return 'components/common/toasts.js';
 if(i<=66 || (i>=77&&i<=79))return 'services/auth.js';
 if(i<=76)return 'services/zoom.js';
 if(i<128)return 'services/settings-and-activity.js';
 if(i<=135)return 'services/polling.js';
 if(i===136)return 'layouts/footer.js';
 if(i<=142)return 'components/common/tables.js';
 if(i<=156)return 'layouts/navigation.js';
 if(i<=171)return 'pages/public.js';
 if(i<=201)return 'pages/lessons.js';
 if(i<=217)return 'pages/assessments.js';
 if(i<=224)return 'pages/account.js';
 if(i<=240)return 'pages/dashboards.js';
 if(i<=263)return 'components/teaching.js';
 if(i<=306)return 'pages/assessment-management.js';
 if(i<=323)return 'pages/users.js';
 if(i<=332)return 'pages/catalogs.js';
 if(i<=345)return 'pages/schedule.js';
 if(i<=388)return 'pages/grades.js';
 if(i<=396)return 'pages/activity.js';
 if(i<=410)return 'components/content-management.js';
 if(i===411||i===412)return 'controllers/forms.js';
 if(i<=419)return 'controllers/actions.js';
 if(i<=423)return 'services/account-actions.js';
 if(i<=428)return 'services/account-import.js';
 if(i<=446)return 'services/user-management.js';
 if(i<=463)return 'services/catalog-management.js';
 if(i<=467)return 'services/schedule-management.js';
 if(i<=478)return 'services/teaching-management.js';
 if(i<=497)return 'services/attachments.js';
 if(i<=518)return 'components/question-builders.js';
 if(i<=530)return 'services/exam-timing.js';
 if(i<=539)return 'routes/router.js';
 if(i<=565)return 'services/results.js';
 if(i<=580)return 'components/bulletins.js';
 if(i<=587)return 'services/exports.js';
 if(i<=593)return 'controllers/exam-session.js';
 if(i<=597)return 'services/public-content.js';
 if(i<=609)return 'controllers/filters.js';
 if(i<=632)return 'utils/content-access.js';
 if(i<=648)return 'utils/calendar.js';
 return 'utils/formatters.js';
}
write('forensics/symbol-map.json',JSON.stringify(manifest,null,2));
let programPath;
traverse(ast,{Program(p){programPath=p;}});
const topBindings=programPath.scope.bindings;
const funcsByOriginal=new Map(manifest.map(f=>[f.original,f]));
const originalStates=Object.keys(topBindings).filter(n=>!funcsByOriginal.has(n));
const stateMap=new Map(originalStates.map(name=>[name,stateNames[name]||`recoveredState_${name}`]));
write('forensics/state-map.json',JSON.stringify(Object.fromEntries(stateMap),null,2));
// Resolve through Babel lexical bindings, never string-replace minified identifiers.
traverse(ast,{
 Identifier(p){
  const original=p.node.name;
  if(p.parentPath.isFunctionDeclaration()&&p.key==='id')return;
  if(p.parentPath.isVariableDeclarator()&&p.key==='id'&&p.parentPath.parentPath.parentPath.isProgram())return;
  if(!p.isReferencedIdentifier()&&!p.isBindingIdentifier())return;
  const binding=p.scope.getBinding(original);
  if(binding!==topBindings[original])return;
  if(funcsByOriginal.has(original)) {
   if(p.parentPath.isObjectProperty()&&p.parent.shorthand)p.parent.shorthand=false;
   p.replaceWith(t.identifier(funcsByOriginal.get(original).name));p.skip();
  } else if(stateMap.has(original)) {
   if(p.parentPath.isObjectProperty()&&p.parent.shorthand)p.parent.shorthand=false;
   p.replaceWith(t.memberExpression(t.identifier('state'),t.identifier(stateMap.get(original))));p.skip();
  }
 }
});
for(const [i,node] of functions.entries())node.id.name=manifest[i].name;
// Eliminate minifier-only boolean/void encodings and restore statement control flow.
traverse(ast,{
 UnaryExpression(p){if(p.node.operator==='!'&&t.isNumericLiteral(p.node.argument))p.replaceWith(t.booleanLiteral(!p.node.argument.value));if(p.node.operator==='void'&&t.isNumericLiteral(p.node.argument,{value:0}))p.replaceWith(t.identifier('undefined'));},
 ExpressionStatement:{exit(p){const e=p.node.expression;if(t.isSequenceExpression(e)){p.replaceWithMultiple(e.expressions.map(x=>t.expressionStatement(x)));}else if(t.isConditionalExpression(e)){p.replaceWith(t.ifStatement(e.test,t.blockStatement([t.expressionStatement(e.consequent)]),t.blockStatement([t.expressionStatement(e.alternate)])));}else if(t.isLogicalExpression(e)&&['&&','||'].includes(e.operator)){p.replaceWith(t.ifStatement(e.operator==='&&'?e.left:t.unaryExpression('!',e.left),t.blockStatement([t.expressionStatement(e.right)])));}}},
 ReturnStatement:{exit(p){const e=p.node.argument;if(t.isSequenceExpression(e))p.replaceWithMultiple([...e.expressions.slice(0,-1).map(x=>t.expressionStatement(x)),t.returnStatement(e.expressions.at(-1))]);}},
 VariableDeclaration(p){if(p.node.declarations.length>1&&p.inList)p.replaceWithMultiple(p.node.declarations.map(d=>t.variableDeclaration(p.node.kind,[d])));}
});
// Standalone modules use the actual spreadsheet package, not recovered vendor internals.
traverse(ast,{ReferencedIdentifier(p){if(p.node.name==='xn'&&!p.scope.getBinding('xn'))p.replaceWith(t.identifier('readWorkbook'));if(p.node.name==='$S'&&!p.scope.getBinding('$S'))p.replaceWith(t.identifier('workbookUtils'));}});
 const allGlobalNames=new Set(manifest.map(f=>f.name));
function meaningfulLocal(binding){
 const n=binding.path.node;
 if(t.isVariableDeclarator(n)){
  const v=n.init;
  if(t.isNewExpression(v)&&t.isIdentifier(v.callee))return({FormData:'formData',URLSearchParams:'query',Date:'date',URL:'url',FileReader:'reader',Map:'lookup',Set:'uniqueValues',Blob:'blob',Uint8Array:'bytes'})[v.callee.name];
  if(t.isCallExpression(v)){
   if(t.isMemberExpression(v.callee)&&t.isIdentifier(v.callee.object,{name:'document'})&&t.isStringLiteral(v.arguments[0]))return /querySelector/.test(v.callee.property.name)?'element':v.callee.property.name==='createElement'?'element':undefined;
   if(t.isMemberExpression(v.callee)&&['get','getAll'].includes(v.callee.property.name)&&t.isStringLiteral(v.arguments[0]))return v.arguments[0].value.replace(/[^a-zA-Z0-9]+(.)/g,(_,c)=>c.toUpperCase()).replace(/^[^a-zA-Z]+/,'')||'fieldValue';
   if(t.isIdentifier(v.callee)&&/^(load|get|read|find|normalize)/.test(v.callee.name))return v.callee.name.replace(/^(load|get|read|find|normalize)/,'').replace(/^./,c=>c.toLowerCase());
  }
  if(t.isAwaitExpression(v)&&t.isCallExpression(v.argument)&&t.isIdentifier(v.argument.callee,{name:'fetch'}))return 'response';
 }
 const props=binding.referencePaths.filter(p=>p.parentPath.isMemberExpression()||p.parentPath.isOptionalMemberExpression()).filter(p=>p.key==='object').map(p=>p.parent.property.name);
 if(props.includes('preventDefault')||props.includes('target'))return 'event';
 if(props.includes('querySelector')||props.includes('reportValidity'))return 'formElement';
 if(props.includes('dataset')||props.includes('closest'))return 'element';
 if(props.includes('role')||props.includes('email'))return 'user';
 if(props.includes('questionItems')||props.includes('opensAt'))return 'exam';
 if(props.includes('teacherId')||props.includes('attachments'))return 'course';
 if(props.includes('get')&&props.includes('has'))return 'formData';
 if(props.includes('trim')||props.includes('replace'))return 'textValue';
 if(props.includes('filter')||props.includes('map'))return 'items';
 if(props.includes('json')||props.includes('ok'))return 'response';
 if(props.includes('options')&&props.includes('type'))return 'question';
 return null;
}
for(const node of ast.program.body.filter(t.isFunctionDeclaration)){
 const wrapper=t.file(t.program([node]));
 const scopes=[];traverse(wrapper,{Scope(p){if(!p.isProgram())scopes.push(p.scope);}});
 for(const scope of scopes){for(const binding of Object.values(scope.bindings)){
  if(binding.kind==='hoisted'||!/^[$_a-zA-Z]{1,3}$/.test(binding.identifier.name))continue;
  let label=meaningfulLocal(binding);if(!label||!/^[$_a-zA-Z][$_a-zA-Z0-9]*$/.test(label))continue;
  if(allGlobalNames.has(label)||label==='state')label+='Value';
  let candidate=label, suffix=2;while(scope.hasBinding(candidate)||scope.hasGlobal(candidate)||allGlobalNames.has(candidate))candidate=label+suffix++;
  scope.rename(binding.identifier.name,candidate);
 }}
}
// Preserve initialization order but move inert evidence literals into editable data modules.
const bootstrap=[], defaults=[];
function literalTree(n){return t.isLiteral(n)&&!t.isTemplateLiteral(n)||t.isUnaryExpression(n)&&literalTree(n.argument)||t.isArrayExpression(n)&&n.elements.every(e=>e===null||literalTree(e))||t.isObjectExpression(n)&&n.properties.every(p=>t.isObjectProperty(p)&&!p.computed&&literalTree(p.value));}
for(const node of ast.program.body){
 if(t.isFunctionDeclaration(node))continue;
 if(t.isVariableDeclaration(node)){
  for(const d of node.declarations){
   const name=stateMap.get(d.id.name);
   if(!name)throw new Error('Unknown state declaration '+d.id.name);
   let value=d.init||t.identifier('undefined');
   if(node.kind==='const'&&literalTree(value)){
    defaults.push(t.exportNamedDeclaration(t.variableDeclaration('const',[t.variableDeclarator(t.identifier(name),value)])));
    value=t.identifier(name);
   }
   bootstrap.push(t.expressionStatement(t.assignmentExpression('=',t.memberExpression(t.identifier('state'),t.identifier(name)),value)));
  }
 } else bootstrap.push(node);
}
const grouped=Object.groupBy(manifest,m=>m.module);
const sourceFunctions=new Map(ast.program.body.filter(t.isFunctionDeclaration).map(n=>[n.id.name,n]));
const moduleByName=new Map(manifest.map(m=>[m.name,m.module]));
function relativeImport(from,to){let p=path.posix.relative(path.posix.dirname(from),to);return p.startsWith('.')?p:'./'+p;}
function importsFor(body,from){
 const imports=new Map();
 const wrapper=t.file(t.program(body));
 traverse(wrapper,{ReferencedIdentifier(p){const name=p.node.name;if(p.scope.getBinding(name))return;let destination=moduleByName.get(name);if(name==='safeJsonParse')destination='utils/json.js';if(name==='state')destination='context/state.js';if(name==='readWorkbook'||name==='workbookUtils')destination='xlsx';if(defaults.some(d=>d.declaration.declarations[0].id.name===name))destination='data/defaults.js';if(!destination||destination===from)return;const list=imports.get(destination)||new Set();list.add(name);imports.set(destination,list);}});
 return [...imports].map(([dest,ids])=>t.importDeclaration([...ids].sort().map(name=>t.importSpecifier(t.identifier(name),t.identifier(name==='readWorkbook'?'read':name==='workbookUtils'?'utils':name))),t.stringLiteral(dest==='xlsx'?dest:relativeImport(from,dest))));
}
async function emit(filename,nodes,prefix=''){
 const code=generate(t.file(t.program(nodes)),{comments:true,jsescOption:{minimal:true}}).code;
write('src/'+filename,await prettier.format(prefix+code,{parser:'babel',printWidth:110}));
}
for(const [module,entries] of Object.entries(grouped)){
 const nodes=entries.map(m=>{
  const fn=sourceFunctions.get(m.name);
  t.addComment(fn,'leading',` HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: ${filename}:${m.start}-${m.end} (${m.original}). `);
  return t.exportNamedDeclaration(fn);
 });
 await emit(module,[...importsFor(nodes,module),...nodes]);
}
await emit('data/defaults.js',defaults,'// EXACT literal values from the active build; original source names are UNKNOWN.\n');
write('src/context/state.js','// INFERRED container replacing the original module-scoped bindings.\n// Initialization and mutation order are preserved in runtime/bootstrap.js.\nexport const state = {};\n');
const boot=t.exportNamedDeclaration(t.functionDeclaration(t.identifier('initializeRuntime'),[],t.blockStatement(bootstrap)));
await emit('runtime/bootstrap.js',[...importsFor([boot],'runtime/bootstrap.js'),boot]);
const inventory=JSON.parse(fs.readFileSync(path.join(root,'forensics/inventory.json'),'utf8'));
for(const file of inventory.filter(f=>!['.js','.css','.html','.map'].includes(f.extension))){
 const dest=path.join(root,'public',file.relative);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(file.originalPath,dest);
}
write('src/styles/production.css',await prettier.format(fs.readFileSync(path.join(evidence,'assets/index-D7j9Kx6Z.css'),'utf8'),{parser:'css',printWidth:110}));
const html=fs.readFileSync(path.join(evidence,'index.html'),'utf8').replace('<script type="module" crossorigin src="/assets/index-Bgp60kJC.js"></script>','<script type="module" src="/src/main.jsx"></script>').replace('    <link rel="stylesheet" crossorigin href="/assets/index-D7j9Kx6Z.css">\n','');
write('index.html',html);
console.log(JSON.stringify({functions:manifest.length,modules:Object.keys(grouped).length,unknownStateNames:[...stateMap.values()].filter(n=>n.startsWith('recovered')),missingNames:manifest.filter(m=>m.name.startsWith('recoveredHelper')),states:stateMap.size,defaults:defaults.length},null,2));
