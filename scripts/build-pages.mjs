import { cp, mkdir, rm, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const output=resolve(root,'dist-pages');
const files=['index.html','assets','_headers'];
for(const file of files)await access(resolve(root,file));
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
for(const file of files)await cp(resolve(root,file),resolve(output,file),{recursive:true});
console.log('Cloudflare Pages output: dist-pages');
