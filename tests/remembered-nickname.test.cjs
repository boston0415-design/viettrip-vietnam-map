const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require(process.env.JSDOM_PATH||'jsdom');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const key='viettrip_member_nickname_v1';
function fixture(mobile,stored=null,{denied=false}={}){
 const dom=new JSDOM(read('index.html'),{url:'https://viettrip-vietnam-map.pages.dev/',runScripts:'outside-only'}),w=dom.window;
 w.assert=assert;w.matchMedia=()=>({matches:mobile});
 if(denied)Object.defineProperty(w,'localStorage',{get(){throw new w.DOMException('blocked','SecurityError')}});
 else if(stored!==null)w.localStorage.setItem(key,stored);
 const run=s=>vm.runInContext(s,dom.getInternalVMContext());
 for(const name of fs.readdirSync(path.join(root,'assets/js')).filter(n=>/^0[1-8]-/.test(n)).sort())run(read('assets/js/'+name));
 run(`
  let data={places:[],reviews:[]};db=()=>data;
  state.deviceHash='mine';initAddressAutocomplete=()=>{};
  window.alert=m=>{throw Error(m)};
  function openNew(){closeEditMode();openPlace({name:'새 업체',latLng:{lat:10.77,lng:106.7}})}
  function typeNickname(id,value){const field=$(id);field.value=value;field.dispatchEvent(new Event('input',{bubbles:true}))}
 `);
 return {dom,w,run};
}
for(const mobile of [false,true]){
 const first=fixture(mobile);
 first.run(`
  openNew();assert.equal($('#pNickname').value,'');
  typeNickname('#pNickname','  노스탤지어  ');
  closeModalById('placeModal');openNew();assert.equal($('#pNickname').value,'노스탤지어','cancel and reopen retain nickname');
  assert.equal($('#pName').value,'새 업체');assert.equal($('#pAddress').value,'','business-specific fields remain independent');
  for(const invalid of ['', ' '.repeat(4),'가'.repeat(31)]){typeNickname('#pNickname',invalid);assert.equal(rememberedMemberNickname(),'노스탤지어')}
  const input=$('#pNickname');input.value='미완성';input.dispatchEvent(new InputEvent('input',{isComposing:true}));
  assert.equal(rememberedMemberNickname(),'노스탤지어');input.value='새닉네임';input.dispatchEvent(new CompositionEvent('compositionend'));
  assert.equal(rememberedMemberNickname(),'새닉네임');
  const other={id:'other',name:'타인 업체',category:'cafe',subcategory:'카페',lat:10.77,lng:106.7,ownerKeyHash:'other',registrantNickname:'타인 닉네임'};
  state.isAdmin=true;openEditPlace(other,'admin');assert.equal($('#pNickname').value,'타인 닉네임');
  typeNickname('#pNickname','변조값');closeModalById('placeModal');openNew();assert.equal($('#pNickname').value,'새닉네임');
  closeModalById('placeModal');state.selected='new-review';openReview();assert.equal($('#rName').value,'새닉네임');
  typeNickname('#rName','후기닉네임');closeModalById('reviewModal');openNew();assert.equal($('#pNickname').value,'후기닉네임');
  data.reviews=[{id:'r',placeId:'old',nickname:'예전 닉네임',createdByHash:'mine'}];state.selected='old';openReview();
  assert.equal($('#rName').value,'예전 닉네임','existing review preserves original attribution');closeModalById('reviewModal');
  assert.equal(rememberedMemberNickname(),'후기닉네임','opening old review does not overwrite the new default');
  assert.equal($('#pNickname').autocomplete,'nickname');assert.equal($('#rName').autocomplete,'nickname');
  assert.equal($('#pNickname').maxLength,30);assert.equal($('#rName').maxLength,30);
  assert($('#pNicknameHelp').textContent.includes('자동 입력'));assert($('#rNameHelp').textContent.includes('브라우저'));
 `);
 const saved=first.w.localStorage.getItem(key);first.dom.window.close();
 const reload=fixture(mobile,saved);
 reload.run(`openNew();assert.equal($('#pNickname').value,'후기닉네임','fresh page restores persisted nickname');state.selected='new';openReview();assert.equal($('#rName').value,'후기닉네임')`);
 reload.dom.window.close();
 const migration=fixture(mobile,'x'.repeat(31));
 migration.run(`
  data.places=[{id:'mine',ownerKeyHash:'mine',registrantNickname:'내 등록 닉네임',createdAt:'2026-09-17'},
    {id:'other',ownerKeyHash:'other',registrantNickname:'남의 닉네임',createdAt:'2026-09-18'}];
  state.isAdmin=true;openNew();assert.equal($('#pNickname').value,'내 등록 닉네임','only owned records seed the preference');
 `);migration.dom.window.close();
 const denied=fixture(mobile,null,{denied:true});
 denied.w.console.warn=()=>{};
 denied.run(`openNew();typeNickname('#pNickname','임시기억');closeModalById('placeModal');openNew();assert.equal($('#pNickname').value,'임시기억','storage denial does not break registration')`);
 denied.dom.window.close();
}
// These assertions check the shared responsive CSS rules, not browser rendering.
const css=read('assets/css/mobile-access.css');
assert(css.includes('.modal input:not([type="checkbox"]):not([type="radio"])'));
assert(css.includes('font-size:16px!important;min-height:44px'));
console.log('PASS desktop/mobile nickname input, IME, cancel/reopen, reload, review reuse, edit isolation, owned-record migration, corrupt/blocked storage and mobile input CSS');
