const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
(async()=>{
 const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://example.test',runScripts:'outside-only'}),w=dom.window,run=s=>vm.runInContext(s,dom.getInternalVMContext());
 for(const n of ['01-data-storage','02-services-media'])run(fs.readFileSync('assets/js/'+n+'.js','utf8'));
 run(`getDeviceId=()=> 'own-device';initDeviceHash=async()=>{};db=()=>({places:[],reviews:[]});renderStars=()=>{};renderReviewPhotoPreview=()=>{};rememberedMemberNickname=()=> '본인';`);
 run(fs.readFileSync('assets/js/review-vault.js','utf8'));await Promise.resolve();
 const mine={id:'mine',placeId:'p1',text:'원래 후기',nickname:'본인',rating:5,photoUrls:['https://example.test/p.jpg'],createdBy:'own-device'};
 const other={...mine,id:'other',placeId:'p2',text:'다른 사람 후기',createdBy:'other-device'};
 w.ReviewVault.archive([mine,other]);w.ReviewVault.archive([{...mine,text:'수정한 후기'},mine]);
 const versions=JSON.parse(w.localStorage.getItem('viettrip_my_review_versions_v1'));assert.equal(versions.length,2);assert(!versions.some(r=>r.id==='other'));assert.equal(mine.text,'원래 후기');
 const el=id=>w.document.getElementById(id);el('reviewModal').classList.add('open');run("state.reviewEditPlaceId='p1';state.rating=5");
 el('rName').value='본인';el('rText').value='저장 전 초안';w.ReviewVault.capture();el('rText').value='';w.ReviewVault.capture();assert.match(w.localStorage.getItem('viettrip_review_drafts_v1'),/저장 전 초안/,'blank input does not erase a draft');
 w.ReviewVault.offer('p2',null);assert.equal(el('reviewRecovery'),null,'cannot offer another author or another place');
 w.ReviewVault.offer('p1',null);assert(el('reviewRecovery'));assert.equal(el('rText').value,'','offer never silently rewrites current input');
 el('reviewRecovery').querySelector('button').click();assert.equal(el('rText').value,'저장 전 초안');
 // Closing keeps a local draft only; no remote persistence function is involved.
 el('rText').value='닫기 전에 쓴 글';el('reviewEditorClose').click();assert.match(w.localStorage.getItem('viettrip_review_drafts_v1'),/닫기 전에 쓴 글/);
 w.ReviewVault.saved('p2');assert.match(w.localStorage.getItem('viettrip_review_drafts_v1'),/닫기 전에 쓴 글/,'another place saving cannot clear this draft');
 w.ReviewVault.saved('p1');assert.equal(JSON.parse(w.localStorage.getItem('viettrip_review_drafts_v1')).length,0);
 w.ReviewVault.offer('p1',{...mine,text:''});el('rText').value='';el('reviewRecovery').querySelector('button').click();assert.equal(el('rText').value,'수정한 후기','latest original version can be loaded explicitly');
 assert.equal(JSON.parse(w.localStorage.getItem('viettrip_my_review_versions_v1')).length,2,'successful save retains history');dom.window.close();
 console.log('PASS review vault: original versions retained, ownership and place isolation, blank/cancel draft preservation, explicit recovery, save clears only matching draft');
})().catch(e=>{console.error(e);process.exitCode=1});
