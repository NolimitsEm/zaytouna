import fs from 'node:fs';
import path from 'node:path';
const base=path.resolve('../dist/assets');
for (const name of ['index-Bgp60kJC.js','legacyApp-Cum0wzIn.js','index-D7j9Kx6Z.css']) {
 const source=fs.readFileSync(path.join(base,name),'utf8');
 console.log('\n'+name);
 console.log('versions', [...source.matchAll(/.{0,45}(?:version\s*[:=]\s*["'][^"']+|react(?:-dom)? v?[\d.]+|SheetJS|tailwindcss|xlsx|API_BASE|sourceMappingURL).{0,65}/gi)].slice(0,35).map(m=>m[0]));
 console.log('head',source.slice(0,name.endsWith('.css')?2200:1000));
 console.log('api/urls', [...new Set([...source.matchAll(/["'`](?:https?:\/\/|\/api\/)[^"'`\s]{1,170}/g)].map(m=>m[0]))].slice(-90));
}
