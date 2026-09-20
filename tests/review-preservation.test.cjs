// Offline-only: an API outage is not evidence that user reviews were deleted.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx=vm.createContext({console,assert,crypto:require('node:crypto').webcrypto,TextEncoder,Map,Set,Date,URL,setTimeout:()=>0,clearTimeout(){}});
ctx.window=ctx;ctx.document={querySelector:()=>null,querySelectorAll:()=>[]};
for(const name of ['01-data-storage','02-services-media'])vm.runInContext(fs.readFileSync(`${__dirname}/../assets/js/${name}.js`,'utf8'),ctx);
vm.runInContext(`(async()=>{
 const original={id:'review-keep',placeId:'place-keep',nickname:'작성자',text:'지워지면 안 되는 원래 글',rating:5,photoUrls:['https://example.test/photo.jpg'],cafeUrl:'https://cafe.naver.com/example/123',createdAt:'2026-09-19T00:00:00Z'};
 db=()=>({places:[{id:'place-keep',name:'업소'}],reviews:[original]});
 supaGet=async name=>{if(name==='reviews_public')throw Error('simulated offline');return [{id:'place-keep',name:'업소'}];};
 const failed=await fetchSharedDb();assert.equal(failed.reviews[0].text,original.text);assert.equal(failed.reviews[0].photoUrls[0],original.photoUrls[0]);assert.equal(failed.reviewsAvailable,false);assert.equal(state.reviewsLoadFailed,true);
 let writes=0;supaRpc=async()=>writes++;supaInsert=async()=>writes++;
 await uploadMissingLocal(db(),failed);assert.equal(writes,0,'failed feed must not trigger legacy review or place writes');
 supaGet=async name=>name==='reviews_public'?[]:[{id:'place-keep',name:'업소'}];
 const success=await fetchSharedDb();assert.equal(success.reviews.length,0,'a successful authoritative empty result is respected; no resurrection');assert.equal(state.reviewsLoadFailed,false);
 assert.equal(original.text,'지워지면 안 되는 원래 글','read paths do not mutate source content');
 console.log('PASS offline review preservation, no write on partial reads, authoritative empty response and immutable source content');
})()`,ctx).catch(error=>{console.error(error);process.exitCode=1});
