const fs=require('node:fs'),path=require('node:path'),esbuild=require('esbuild');
const root=path.resolve(__dirname,'../..');
esbuild.buildSync({entryPoints:[path.join(__dirname,'entry.js')],bundle:true,minify:true,platform:'browser',format:'iife',globalName:'ViettripSupabase',target:['es2020'],outfile:path.join(root,'assets/vendor/member-auth-2.117.2.min.js'),legalComments:'eof'});
const names=['@supabase/supabase-js','@supabase/auth-js','@supabase/functions-js','@supabase/postgrest-js','@supabase/realtime-js','@supabase/storage-js','@supabase/phoenix','iceberg-js','tslib'];
const notices=[];
for(const name of names){const dir=path.join(__dirname,'node_modules',name);if(!fs.existsSync(dir))continue;const file=fs.readdirSync(dir).find(f=>/^LICENSE/i.test(f));if(file)notices.push(name+'\n'+fs.readFileSync(path.join(dir,file),'utf8'));}
fs.writeFileSync(path.join(root,'assets/licenses/member-auth-NOTICE.txt'),notices.join('\n\n'));
