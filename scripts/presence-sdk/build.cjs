const fs=require('node:fs'),path=require('node:path'),esbuild=require('esbuild');
const root=path.resolve(__dirname,'../..');
const version=require('@supabase/realtime-js/package.json').version;
esbuild.buildSync({
  entryPoints:[path.join(__dirname,'entry.js')],bundle:true,minify:true,
  platform:'browser',format:'iife',globalName:'ViettripRealtime',target:['es2020'],
  outfile:path.join(root,`assets/vendor/realtime-${version}.min.js`),
  banner:{js:`/* @supabase/realtime-js ${version}; MIT. See ../licenses/realtime-NOTICE.txt. */`},
  legalComments:'none'
});
const licenses=[['@supabase/realtime-js','LICENSE'],['@supabase/phoenix','LICENSE.md'],['tslib','LICENSE.txt']];
fs.writeFileSync(path.join(root,'assets/licenses/realtime-NOTICE.txt'),licenses.map(([name,file])=>{
  const dir=path.join(__dirname,'node_modules',name);
  return name+'\n'+fs.readFileSync(path.join(dir,file),'utf8');
}).join('\n\n'));
