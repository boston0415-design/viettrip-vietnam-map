const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx=vm.createContext({console,assert,crypto:require('node:crypto').webcrypto,TextEncoder,Map,Set,Date,URL,setTimeout:()=>0,clearTimeout(){}});
ctx.window=ctx;ctx.document={querySelector:()=>null,querySelectorAll:()=>[]};
for(const f of ['01-data-storage.js','02-services-media.js'])vm.runInContext(fs.readFileSync(`${__dirname}/../assets/js/${f}`,'utf8'),ctx);
(async()=>{
 await vm.runInContext(`(async()=>{
  safeStorageSet('viettrip_device_id_v1','test-private-device');
  state.deviceHash=await sha256Hex(getDeviceId());
  const own=remoteReviewToLocal({id:'a',place_id:'p',created_by_hash:state.deviceHash,rating:4,body:'내 후기'});
  const other=remoteReviewToLocal({id:'b',place_id:'p',created_by_hash:'other-hash',created_by:'never-copy-public-secret',rating:null,body:'다른 후기'});
  assert.equal(own.createdBy,'');assert.equal(other.createdBy,'');
  assert(isOwnReview(own));assert(!isOwnReview(other));assert(!isOwnReview({}));
  const local={...own,createdBy:getDeviceId(),createdByHash:undefined};
  assert.equal(reviewIdentityKey(local),reviewIdentityKey(own));
  assert.equal(dedupeReviews([local,own,other]).length,2,'local own review and public hash do not duplicate');
  let publicReads=[];
  supaGet=async(table)=>{publicReads.push(table);return table==='reviews_public'?[{id:'a',place_id:'p',created_by_hash:state.deviceHash,body:'내 후기'}]:[]};
  await fetchSharedDb();assert(publicReads.includes('reviews_public'));assert(!publicReads.includes('reviews'));
  let writes=[];supaRpc=async(name,data)=>writes.push({name,data});supaInsert=async()=>{throw Error('unexpected direct write')};
  await uploadMissingLocal({places:[],reviews:[other,{...local,id:'missing'}]},{places:[],reviews:[]});
  assert.equal(writes.length,1);assert.equal(writes[0].name,'device_upsert_review');
  assert.equal(writes[0].data.p_device_id,'test-private-device');
  console.log('PASS public review privacy, own/other detection, deduplication, public reads, and own-only migration');
 })()`,ctx);
})().catch(e=>{console.error(e);process.exitCode=1});
