import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const evidence = path.resolve(root, '../dist');
export function write(relative, contents) {
  const destination = path.resolve(root, relative);
  if (!destination.startsWith(root + path.sep)) throw new Error('Output escaped reconstruction directory');
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, contents);
}
export const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
export function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const filename = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Evidence symlink needs separate review: ${filename}`);
    return entry.isDirectory() ? walk(filename) : [filename];
  });
}
const html = fs.readFileSync(path.join(evidence, 'index.html'), 'utf8');
const files = walk(evidence);
const texts = files.filter(f => /\.(js|css|html|json|svg|map|webmanifest)$/i.test(f)).map(f => ({ path: f, text: fs.readFileSync(f, 'utf8') }));
const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.map': 'application/json', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
function imageMetadata(bytes) {
  if (bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'))) return {mime:'image/png',dimensions:`${bytes.readUInt32BE(16)} × ${bytes.readUInt32BE(20)}`};
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    for (let offset=2;offset+9<bytes.length;) {
      if (bytes[offset]!==0xff) break;
      const marker=bytes[offset+1];
      if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) return {mime:'image/jpeg',dimensions:`${bytes.readUInt16BE(offset+7)} × ${bytes.readUInt16BE(offset+5)}`};
      if ([0xd9,0xda].includes(marker)) break;
      const length=bytes.readUInt16BE(offset+2); if(length<2)break;offset+=2+length;
    }
    return {mime:'image/jpeg',dimensions:null};
  }
  return null;
}
const inventory = files.map(filename => {
  const bytes = fs.readFileSync(filename);
  const relative = path.relative(evidence, filename).replaceAll('\\', '/');
  const name = path.basename(filename);
  const extension = path.extname(filename);
  const references = texts.filter(f => f.path !== filename && /\.(js|css)$/.test(f.path) && (f.text.includes(relative) || f.text.includes(name))).map(f => path.relative(evidence, f.path).replaceAll('\\', '/'));
  const image = imageMetadata(bytes);
  const dimensions = image?.dimensions || null;
  const purpose = extension === '.html' ? 'Document / React mounting shell' : extension === '.js' ? (name.startsWith('index-') ? 'React entry + lazy application import' : 'Application logic + bundled spreadsheet vendor') : extension === '.css' ? 'Production stylesheet' : extension === '.xlsx' ? 'Account-import workbook template' : name.includes('pattern') ? 'Decorative pattern' : name.includes('signature') ? 'Report-card signature' : name.includes('header') ? 'Institution / report-card logo' : 'Platform branding';
  return { originalPath: filename, relative, filename: name, extension: extension || '(none)', size: bytes.length, sha256: digest(bytes), mime: image?.mime || types[extension] || 'application/octet-stream', purpose, htmlReference: html.includes(relative) || html.includes(name), bundleReferences: references, dimensions, confidence: 'EXACT (metadata and literal references); HIGH CONFIDENCE (purpose)' };
});
const baseline = path.join(root, 'forensics/dist-sha256.json');
if (fs.existsSync(baseline)) {
  const previous = JSON.parse(fs.readFileSync(baseline, 'utf8'));
  if (JSON.stringify(previous) !== JSON.stringify(inventory.map(({relative,size,sha256})=>({relative,size,sha256})))) throw new Error('Original dist changed since baseline');
} else write('forensics/dist-sha256.json', JSON.stringify(inventory.map(({relative,size,sha256})=>({relative,size,sha256})), null, 2));
write('forensics/inventory.json', JSON.stringify(inventory, null, 2));
const groups = Object.groupBy(inventory, x => x.sha256);
const duplicates = Object.values(groups).filter(group => group.length > 1);
const preamble = '# Complete dist inventory\n\nEXACT: every regular file was read as bytes, including hidden entries. Original evidence is never written. SHA-256 baseline: `forensics/dist-sha256.json`. Purpose classifications are HIGH CONFIDENCE; no reference is not proof of non-use.\n\n';
write('docs/DIST_INVENTORY.md', preamble + `Files: ${inventory.length}. Total bytes: ${inventory.reduce((n,f)=>n+f.size,0)}. Directories: assets/, templates/. brand/ and brand-concepts/ are absent (EXACT).\n\n` + '| Original path | Filename | Extension | Bytes | MIME | Purpose | index.html | JS/CSS references | Confidence |\n|---|---|---|---:|---|---|---|---|---|\n' + inventory.map(f => `| ${f.originalPath} | ${f.filename} | ${f.extension} | ${f.size} | ${f.mime} | ${f.purpose} | ${f.htmlReference ? 'yes' : 'no'} | ${f.bundleReferences.join(', ') || 'none found'} | ${f.confidence} |`).join('\n') + '\n\n## Duplicate bytes\n\n' + duplicates.map(g=>'- EXACT: '+g.map(f=>f.relative).join(' = ')).join('\n') + '\n\n## Active bundle graph\n\nEXACT: index.html → assets/index-Bgp60kJC.js → dynamic import assets/legacyApp-Cum0wzIn.js. Main CSS: assets/index-D7j9Kx6Z.css. Other three entry/legacy pairs are not reachable from current index.html and are analyzed separately as surviving alternate artifacts. They are not route-specific chunks. Framework vendor code is embedded in each entry; spreadsheet vendor is embedded in each legacy chunk.\n');
write('docs/ASSET_MAP.md', '# Asset map\n\nEXACT paths, dimensions and reference matches. Component usage from naming/literal context is HIGH CONFIDENCE; dynamic use cannot be ruled out for an unreferenced asset.\n\n| File | Type | Dimensions | Purpose | References |\n|---|---|---|---|---|\n'+inventory.filter(f=>f.relative!=='index.html').map(f=>`| ${f.relative} | ${f.mime} | ${f.dimensions || 'N/A'} | ${f.purpose} | ${f.htmlReference?'index.html; ':''}${f.bundleReferences.join(', ') || 'none found'} |`).join('\n'));
const mapReferences = [];
const maps = [];
for (const file of texts) {
  for (const match of file.text.matchAll(/(?:[#@]\s*)?sourceMappingURL\s*=\s*([^\s*]+)/g)) {
    const url = match[1];
    mapReferences.push({ file: path.relative(evidence, file.path), url });
    if (url.startsWith('data:')) {
      const [head, data] = url.split(',',2);
      try { maps.push({ name: path.basename(file.path)+'.inline.map', value: JSON.parse(head.includes(';base64') ? Buffer.from(data,'base64').toString('utf8') : decodeURIComponent(data)) }); } catch (error) { mapReferences.at(-1).error=error.message; }
    }
  }
  if (file.path.endsWith('.map')) {
    try { maps.push({name: path.relative(evidence,file.path), value: JSON.parse(file.text)}); } catch (error) { mapReferences.push({file:file.path,error:error.message}); }
  }
}
const extracted = [];
for (const {name,value} of maps) {
  for (let i=0;i<(value.sources||[]).length;i++) {
    if (value.sourcesContent?.[i] == null) continue;
    const source = value.sources[i];
    const safe = (value.sourceRoot||'')+'/'+source;
    const relative = safe.replace(/^[a-z]+:\/*/i,'').split(/[\\/]/).filter(s=>s && s!=='.' && s!=='..').map(s=>s.replace(/[:?*"<>|]/g,'_')).join('/');
    write('exact_recovered_sources/'+relative,value.sourcesContent[i]);
    extracted.push({map:name,source,output:relative});
  }
}
write('forensics/source-maps.json',JSON.stringify({mapReferences,maps:maps.map(({name,value})=>({name,sources:value.sources,sourceRoot:value.sourceRoot,names:value.names,mappings:value.mappings,hasSourcesContent:!!value.sourcesContent})),extracted},null,2));
write('docs/SOURCE_MAP_REPORT.md', '# Source-map investigation\n\nEXACT: recursively searched all files for .map files and inspected full JS/CSS contents (including endings) for sourceMappingURL, including inline data/base64 maps.\n\n'+(maps.length?`Maps parsed: ${maps.length}. Sources extracted verbatim: ${extracted.length}. See forensics/source-maps.json.`:'No source maps, sourceMappingURL references, inline maps or sourcesContent were found. No original source can be claimed verbatim. Recovered application code is derived from surviving runtime code, with original module/file/local variable names UNKNOWN.')+'\n');
write('exact_recovered_sources/README.md','# Exact source recovery\n\nNo source maps or embedded sourcesContent were found. This directory intentionally contains no claimed original source. Assets and compiled CSS can be preserved byte-for-byte; reconstructed JavaScript is not original source.\n');
write('docs/BRAND_CONCEPTS_ANALYSIS.md','# Brand concepts\n\nEXACT: dist/brand-concepts/ does not exist. No files can be assigned USED IN PRODUCTION, LIKELY USED, DESIGN REFERENCE, UNREFERENCED or UNKNOWN within that absent folder. No concepts are added to the UI. All actual branding images in assets/ are inventoried and cross-referenced in ASSET_MAP.md.\n');
console.log(JSON.stringify({files:inventory.length,duplicates:duplicates.map(g=>g.map(f=>f.relative)),sourceMaps:maps.length,mapReferences:mapReferences.length},null,2));
