const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const read=p=>fs.readFileSync(p,'utf8');
(async()=>{
 for(const width of [360,768,1440]){
  const dom=new JSDOM(read('index.html'),{url:'https://viettrip-vietnam-map.pages.dev/',runScripts:'outside-only'}),w=dom.window,d=w.document;
  const run=code=>vm.runInContext(code,dom.getInternalVMContext());
  await new Promise(r=>d.addEventListener('DOMContentLoaded',r,{once:true}));
  w.matchMedia=()=>({matches:width<901});w.AbortSignal=AbortSignal;w.TextEncoder=TextEncoder;
  Object.defineProperty(w.crypto,'subtle',{value:require('node:crypto').webcrypto.subtle});
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
  w.confirm=()=>true;w.alert=()=>{};
  for(const file of fs.readdirSync('assets/js').filter(n=>/^0[1-8]-/.test(n)).sort())run(read('assets/js/'+file));
  const a='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',a2='cccccccc-cccc-4ccc-8ccc-cccccccccccc',b='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const hash=key=>require('node:crypto').createHash('sha256').update(key).digest('hex');
  const place='33333333-3333-4333-8333-333333333333';
  let rows=[{id:'review-a',place_id:place,place_name:'Cafe',rating:4,body:'First original review content',author_name:'Member A',photo_urls:['https://example.com/a.jpg'],created_at:'2026-09-20T00:00:00Z',created_by_hash:hash(a)},{id:'review-a2',place_id:place,place_name:'Cafe',rating:2,body:'Second linked review content',author_name:'Member A',photo_urls:[],created_at:'2026-09-21T00:00:00Z',created_by_hash:hash(a2)}];
  let session=null,listener,archived=null,blockList=null,claimKey=null;
  const calls=[];
  const userFor=id=>({id,email:id+'@example.test',user_metadata:{nickname:'Member '+id}});
  const profile=id=>({id:'member-'+id,nickname:'Member '+id,account_user_id:id,account_device_key:id==='A'?a:b,total:id==='A'?rows.length:0,level:0,devices:(id==='A'?[a,a2]:[b]).map(key=>({key,hash:hash(key)})),counts:{place:0,review:id==='A'?rows.length:0,correction:0},activities:[],corrections:[]});
  w.ViettripSupabase={createClient:()=>({auth:{
   getSession:async()=>({data:{session}}),getUser:async()=>({data:{user:session?.user}}),
   onAuthStateChange:callback=>{listener=callback},
   signInWithPassword:async()=>{session={access_token:'isolated-token-A',user:userFor('A')};listener('SIGNED_IN',session);return {data:{session}}},
   signUp:async args=>{calls.push({signup:args});return {data:{session:null}}},
   resetPasswordForEmail:async()=>({data:{}}),updateUser:async()=>({data:{}}),
   signOut:async()=>{session=null;listener('SIGNED_OUT',null);return {error:null}}
  }})};
  w.fetch=async(url,options)=>{
   const request=JSON.parse(options.body);calls.push({url,request,auth:options.headers.Authorization});
   const id=options.headers.Authorization==='Bearer isolated-token-A'?'A':options.headers.Authorization==='Bearer isolated-token-B'?'B':null;
   let result;
   if(url.endsWith('/map_account')){
    assert(id,'private account actions require a session');
    if(request.p_action==='reviews'){
     if(blockList){const blocker=blockList;blockList=null;await blocker;}
     result={items:id==='A'?rows:[],total:id==='A'?rows.length:0,has_more:false};
    }else if(request.p_action==='delete_review'){archived=rows.find(r=>r.id===request.p_payload.review_id);rows=rows.filter(r=>r.id!==request.p_payload.review_id);result={ok:true};}
    else if(request.p_action==='restore_review'){rows.push(archived);result={ok:true};}
    else if(request.p_action==='claim'){claimKey=request.p_payload.device_key;assert(request.p_payload.consent);result=profile(id);}
    else result=profile(id);
   }else result=request.p_action==='badges'?[]:id?profile(id):{id:'guest',total:0,level:0,devices:[],activities:[],corrections:[],counts:{}};
   return {ok:true,json:async()=>JSON.parse(JSON.stringify(result)),text:async()=>JSON.stringify(result)};
  };
  run(`let fixture={places:[{id:'${place}',name:'Cafe',category:'cafe',subcategory:'카페',lat:10.7,lng:106.7,address:'주소',tags:[]}],reviews:[]};db=()=>fixture;saveDb=data=>{fixture=data};state.sharedDbLoading=false;renderDetail=()=>{};renderList=()=>{};renderMarkers=()=>{};`);
  w.getServerRows=()=>rows;
  run('fetchSharedDb=async()=>({...fixture,reviews:window.getServerRows().map(remoteReviewToLocal)})');
  run(read('assets/js/member-account.js'));run(read('assets/js/map-membership.js'));
  const flush=async()=>{for(let i=0;i<16;i++)await new Promise(r=>setTimeout(r,0))};
  await w.MemberAccount.ready;await flush();
  const guest=run('getGuestDeviceId()');
  d.getElementById('memberLoginBtn').click();assert(d.getElementById('memberAuthDialog').open);assert(!d.getElementById('memberDialog').open);
  d.querySelector('[data-member-auth-mode=signup]').click();assert(!d.getElementById('memberAuthNicknameField').hidden);
  d.getElementById('memberAuthEmailInput').value='signup@example.test';d.getElementById('memberAuthNickname').value='Test';d.getElementById('memberAuthPassword').value='isolated-test-password';d.getElementById('memberAuthConfirm').value='different-password';
  d.getElementById('memberAuthForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await flush();assert(!calls.some(c=>c.signup));
  d.querySelector('[data-member-auth-mode=login]').click();d.getElementById('memberAuthPassword').value='isolated-test-password';
  d.getElementById('memberAuthForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await flush();
  assert(w.MemberAccount.signedIn());assert.equal(run('getDeviceId()'),a);assert(d.getElementById('memberDialog').open);assert(!d.getElementById('memberAuthDialog').open,'duplicate auth event does not strand the login dialog');
  assert.equal(d.getElementById('memberLoginBtn').textContent,'마이페이지');assert.equal(d.querySelectorAll('#memberOwnReviews>li').length,2);
  assert(!d.body.innerHTML.includes(a),'account credential never rendered');
  d.querySelector('[data-account-edit="review-a2"]').click();await flush();
  assert.equal(d.getElementById('rText').value,'Second linked review content','editing targets the selected review across linked devices');
  assert.equal(run('state.reviewEditReviewId'),'review-a2');d.getElementById('rText').value='Unsent draft';run("closeModalById('reviewModal')");await flush();
  assert.equal(rows[1].body,'Second linked review content','closing without save preserves the original');
  w.confirm=()=>false;d.querySelector('[data-account-delete="review-a2"]').click();await flush();assert.equal(rows.length,2);
  w.confirm=()=>true;d.querySelector('[data-account-delete="review-a2"]').click();await flush();assert.equal(rows.length,1);assert.equal(rows[0].body,'First original review content');assert(!d.getElementById('memberReviewUndo').hidden);
  d.getElementById('memberRestoreReview').click();await flush();assert.equal(rows.length,2);assert.equal(rows[1].body,'Second linked review content');
  d.getElementById('memberClaimConsent').checked=true;d.getElementById('memberClaimForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await flush();assert.equal(claimKey,guest);assert.notEqual(run('getGuestDeviceId()'),guest);
  let release;blockList=new Promise(r=>{release=r});const late=w.MemberAccount.loadReviews();await flush();
  d.getElementById('memberSignOut').click();await flush();assert(!w.MemberAccount.signedIn());assert(!w.MapMembership.ownsHash(hash(a)));assert.notEqual(run('getDeviceId()'),a);assert.equal(d.getElementById('memberOwnReviews').textContent,'');
  session={access_token:'isolated-token-B',user:userFor('B')};listener('SIGNED_IN',session);await flush();assert.equal(run('getDeviceId()'),b);release();await late;await flush();assert(!d.getElementById('memberOwnReviews').textContent.includes('original'),'late account-A response never appears in account B');
  assert(!w.MapMembership.ownsHash(hash(a)));assert(w.MapMembership.ownsHash(hash(b)));
  dom.window.close();
 }
 console.log('PASS member accounts: separate login, exact review editing, cancel/delete/restore, explicit guest claim, duplicate auth events, logout and stale cross-account isolation');
})().catch(error=>{console.error(error);process.exitCode=1});
