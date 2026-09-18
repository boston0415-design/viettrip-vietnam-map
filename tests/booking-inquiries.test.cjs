const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require(process.env.JSDOM_PATH||'jsdom');
const root=path.join(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const pause=()=>new Promise(resolve=>setTimeout(resolve,25));

async function check(mobile){
  const dom=new JSDOM(read('index.html'),{url:'https://viettrip-vietnam-map.pages.dev/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,ctx=dom.getInternalVMContext(),run=code=>vm.runInContext(code,ctx);
  await new Promise(resolve=>w.document.addEventListener('DOMContentLoaded',resolve,{once:true}));
  w.assert=assert;w.matchMedia=()=>({matches:mobile});
  w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};
  w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new w.Event('close'))};
  for(const file of fs.readdirSync(path.join(root,'assets/js')).filter(name=>/^0[1-8]-/.test(name)).sort())run(read('assets/js/'+file));
  run(read('assets/js/booking-links.js'));
  run(`
    isOwnerPlace=()=>false;renderList=()=>{};refreshMapAfterMobileLayout=()=>{};positionSelectedPlaceInView=()=>{};hideHover=()=>{};
    const contactFixture={places:VERIFIED_BUSINESS_CONTACTS.map(p=>({...p,subcategory:'',lat:10.77,lng:106.7})),reviews:[]};
    db=()=>contactFixture;
    Object.assign(state,{cat:'spa',sub:'발마사지',query:'keep',ratingFilter:'4'});
    const savedCriteria=JSON.stringify([state.cat,state.sub,state.query,state.ratingFilter]);
    assert.equal(VERIFIED_BUSINESS_CONTACTS.length,4);
    for(const entry of VERIFIED_BUSINESS_CONTACTS){
      assert(entry.channels.length>0);
      assert(entry.channels.every(validBookingContact));
      assert.equal(verifiedBookingFor({...entry,id:'another-branch'}),null);
      for(const key of ['name','category','address'])assert.equal(verifiedBookingFor({...entry,[key]:'changed'}),null);
    }
    for(const bad of [
      {kind:'zalo',url:'javascript:alert(1)'},
      {kind:'zalo',url:'https://zalo.me.evil.test/contact'},
      {kind:'messenger',url:'https://m.me@evil.test/contact'},
      {kind:'facebook',url:'https://attacker@facebook.com/contact'},
      {kind:'facebook',url:'https://facebook.com:444/contact'},
      {kind:'kakao',url:'http://pf.kakao.com/test'},
      {kind:'phone',url:'tel:+842838239000;ext=123'},
      {kind:'phone',url:'tel:*123#'},
      {kind:'unknown',url:'https://example.test/booking'}
    ])assert(!validBookingContact(bad),'invalid route rejected: '+bad.url);
    assert(validBookingContact({kind:'whatsapp',url:'https://wa.me/84888545767'}));
    assert(!openBookingInquiry('unregistered'));
  `);
  // Real history/MutationObserver, emulated native dialog presentation only.
  run(read('assets/js/panel-history.js'));await pause();
  const dialog=w.document.getElementById('bookingInquiryDialog');
  const action=async code=>{w.document.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));run(code);await pause()};
  const entries=run('VERIFIED_BUSINESS_CONTACTS');
  for(const entry of entries){
    await action(`state.selected=${JSON.stringify(entry.id)};renderDetail()`);
    const triggers=[...w.document.querySelectorAll('#detail [data-booking-inquiry]')];
    assert.equal(triggers.length,2,'compact/mobile and desktop actions are both present');
    assert(w.document.querySelector('#detail .detailQuickActions').classList.contains('hasBooking'));
    assert.equal(w.document.getElementById('detailBody').hidden,mobile,'mobile details stay compact; desktop details stay visible');
    const depth=w.history.state.viettripPanelBack.depth,url=w.location.href;
    // Repeat opening is idempotent and never creates duplicate dialog history.
    triggers[mobile?0:1].click();await pause();assert(dialog.open);
    assert.equal(w.history.state.viettripPanelBack.depth,depth+1);
    assert(run(`openBookingInquiry(${JSON.stringify(entry.id)})`));await pause();
    assert.equal(w.history.state.viettripPanelBack.depth,depth+1);
    assert.equal(dialog.querySelector('#bookingInquiryPlace').textContent,entry.name);
    assert.equal(dialog.querySelector('#bookingInquiryAddress').textContent,entry.address);
    assert(dialog.textContent.includes('확정 답변'));
    const links=[...dialog.querySelectorAll('.bookingContactLink')];
    assert.equal(links.length,entry.channels.length);
    for(const [i,link] of links.entries()){
      assert.equal(link.href,entry.channels[i].url);
      if(entry.channels[i].kind==='phone')assert(!link.target);
      else {assert.equal(link.target,'_blank');assert.equal(link.rel,'noopener noreferrer')}
    }
    assert.equal(dialog.querySelector('#bookingInquirySource').href,entry.sourceUrl);
    assert(dialog.querySelector('#bookingInquiryChecked').textContent.includes(entry.verifiedOn));

    // Clipboard API success; no call/message/navigation is triggered.
    let copied;Object.defineProperty(w.navigator,'clipboard',{configurable:true,value:{writeText:async text=>{copied=text}}});
    const copy=dialog.querySelector('[data-booking-phone]');copy.click();await pause();
    assert.equal(copied,entry.channels.find(c=>c.kind==='phone').url.slice(4));
    assert(dialog.querySelector('#bookingInquiryStatus').textContent.includes('복사했습니다'));
    // Clipboard fallback must stay inside the native modal's focus boundary.
    Object.defineProperty(w.navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('denied')}}});
    w.document.execCommand=command=>{assert.equal(command,'copy');assert(dialog.contains(w.document.activeElement));return true};
    copy.click();await pause();assert(dialog.querySelector('#bookingInquiryStatus').textContent.includes('복사했습니다'));
    w.document.execCommand=()=>false;copy.click();await pause();
    assert(dialog.querySelector('#bookingInquiryStatus').textContent.includes('복사하지 못했습니다'));
    assert.equal(dialog.querySelectorAll('textarea').length,0);

    w.history.back();await pause();assert(!dialog.open);
    assert(w.document.getElementById('detail').classList.contains('show'),'Back closes only the inquiry dialog');
    assert.equal(w.location.href,url);assert.equal(w.history.state.viettripPanelBack.depth,depth);
    triggers[0].click();await pause();w.document.getElementById('closeBookingInquiry').click();await pause();
    assert(!dialog.open);assert.equal(w.history.state.viettripPanelBack.depth,depth);
    // Escape's default action in native <dialog> is a cancel followed by close.
    triggers[0].click();await pause();
    const cancel=new w.Event('cancel',{cancelable:true});
    if(dialog.dispatchEvent(cancel))dialog.close();await pause();
    assert(!dialog.open);assert.equal(w.history.state.viettripPanelBack.depth,depth);
    assert.equal(run('JSON.stringify([state.cat,state.sub,state.query,state.ratingFilter])'),run('savedCriteria'));
    await action('closeDetailPanel()');
  }
  // Already-rendered actions are checked against live data at the moment of use.
  await action('state.selected=contactFixture.places[0].id;renderDetail()');
  run("contactFixture.places[0].address='moved'");
  w.document.querySelector('[data-booking-inquiry]').click();await pause();
  assert(!dialog.open);assert(w.document.querySelector('[data-booking-inquiry]').disabled);
  assert.equal(w.document.querySelector('[data-booking-inquiry]').textContent,'연락처 확인 필요');
  assert.equal(run('bookingLinkHtml(contactFixture.places[0])'),'');
  dom.window.close();
}

(async()=>{
  await check(true);await check(false);
  console.log('PASS 4 verified branch inquiry routes: compact/desktop actions, safe URLs, branch mismatch, current-data revalidation, clipboard success/fallback/failure, Back/X/Escape and preserved map criteria');
})().catch(error=>{console.error(error);process.exitCode=1});
