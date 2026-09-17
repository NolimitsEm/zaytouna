import fs from 'node:fs';
import {parse} from '@babel/parser';
import traverseModule from '@babel/traverse';
const traverse=traverseModule.default;
const source=fs.readFileSync('../dist/assets/legacyApp-Cum0wzIn.js','utf8');
const ast=parse(source,{sourceType:'module'});
const vendorStart=3436, vendorEnd=source.indexOf('const Oo=');
const body=ast.program.body.filter(n=>n.start<vendorStart||n.start>=vendorEnd);
const selected=body.filter(n=>n.type==='FunctionDeclaration');
if(process.argv[2]==='vars') {
 for(const n of body.filter(n=>n.type==='VariableDeclaration'))console.log(source.slice(n.start,Math.min(n.end,n.start+500)));
}else if(process.argv[2]==='vendor') {
 traverse(ast,{Program(p){const used=[];for(const [name,b] of Object.entries(p.scope.bindings)){if(b.identifier.start>=vendorStart&&b.identifier.start<vendorEnd&&b.referencePaths.some(r=>r.node.start>=vendorEnd||r.node.start<vendorStart))used.push({name,source:source.slice(b.path.node.start,Math.min(b.path.node.end,b.path.node.start+160)),references:b.referencePaths.filter(r=>r.node.start>=vendorEnd).map(r=>source.slice(r.parentPath.node.start,r.parentPath.node.end).slice(0,180))});}console.log(JSON.stringify(used,null,2));}});
}else if(process.argv[2]==='function'){
 for(const name of process.argv.slice(3)) {const n=selected.find(n=>n.id.name===name);if(n)console.log(source.slice(n.start,n.end));}
}else{
const start=Number(process.argv[2]||0), count=Number(process.argv[3]||100);
console.log('vendor',vendorStart,vendorEnd,'app funcs',selected.length);
for(const [i,n] of selected.entries())if(i>=start&&i<start+count)console.log(i,n.id.name,n.end-n.start,source.slice(n.start,Math.min(n.start+Number(process.argv[4]||220),n.end)));
}
