// The PNGs are committed, so production builds require no image dependency.
// Regenerate with an installed sharp package or the workspace runtime bundle.
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
const require=createRequire(import.meta.url);
let sharp;
try{sharp=require('sharp')}catch{
  sharp=createRequire(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/package.json')('sharp');
}
const base=new URL('../assets/icons/',import.meta.url);
const source=await readFile(new URL('vietmap.svg',base));
for(const size of [180,192,512]){
  await sharp(source).resize(size,size).png().toFile(new URL(`vietmap-${size}.png`,base).pathname);
}
// Full-bleed background; the pin fits within the central 80% maskable safe zone.
await writeFile(new URL('vietmap-maskable-512.png',base),await readFile(new URL('vietmap-512.png',base)));
console.log('Rendered 180px Apple touch icon, 192/512px app icons and maskable icon.');
