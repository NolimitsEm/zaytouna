import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';
import prettier from 'prettier';
import { root, evidence, write, walk } from './inventory.mjs';
const traverse=traverseModule.default;
for(const filename of walk(evidence).filter(f=>/\.(js|css)$/.test(f))) {
 const source=fs.readFileSync(filename,'utf8');
 const name=path.basename(filename);
 const formatted=await prettier.format(source,{parser:name.endsWith('.css')?'css':'babel',printWidth:110});
 write('forensics/beautified_bundles/'+name,formatted);
 if(name.endsWith('.css'))continue;
 const ast=parse(source,{sourceType:'module'});
 const declarations=ast.program.body.map((n,index)=>({index,type:n.type,start:n.start,end:n.end,name:n.id?.name||n.declarations?.map(d=>d.id.name).join(','),preview:source.slice(n.start,Math.min(n.start+220,n.end)),bytes:n.end-n.start}));
 const strings=[];const calls=[];const imports=[];
 traverse(ast,{
  StringLiteral(p){ strings.push({value:p.node.value,offset:p.node.start,owner:p.getFunctionParent()?.node.id?.name||'(top-level)'}); },
  TemplateElement(p){ strings.push({value:p.node.value.cooked,raw:p.node.value.raw,offset:p.node.start,owner:p.getFunctionParent()?.node.id?.name||'(template)'}); },
  CallExpression(p){const n=p.node;const text=source.slice(n.start,n.end);if(/^(fetch|.*?\.fetch|localStorage\.|sessionStorage\.|.*?\.sendBeacon)/.test(text)) calls.push({offset:n.start,owner:p.getFunctionParent()?.node.id?.name,text});if(n.callee.type==='Import')imports.push(n.arguments[0].value);}
 });
 write('forensics/'+name+'.analysis.json',JSON.stringify({declarations,strings,calls,imports},null,2));
 if(name==='legacyApp-Cum0wzIn.js')write('forensics/DECLARATIONS.md','# Active legacy declarations\n\n'+declarations.map(d=>`${d.index} ${d.start}-${d.end} ${d.type} ${d.name||''} (${d.bytes})\n${d.preview}\n`).join('\n'));
 console.log(name, ast.program.body.length,'top-level statements;',strings.length,'strings;',calls.length,'I/O calls; lazy:',imports);
}
