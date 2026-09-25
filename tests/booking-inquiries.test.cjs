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
    assert.equal(new Set(VERIFIED_BUSINESS_CONTACTS.map(p=>p.id)).size,VERIFIED_BUSINESS_CONTACTS.length,'each verified branch has one contact entry');
    for(const id of ['4a33bd0b-9bd7-433e-879b-00348ff6e15c','00c49c81-8085-43b9-a7a1-284bc2550cd2','e6acd5e1-242d-4d45-9195-953dcb0b9306','3b69b891-1c6e-465a-9379-b1dd61ce1c38']){
      const entry=VERIFIED_BUSINESS_CONTACTS.find(p=>p.id===id);
      assert(entry,'newly verified inquiry route');
      assert.equal(entry.verifiedOn,'2026-09-19');
      assert(entry.channels.some(c=>c.kind==='phone'),'verified operator phone retained');
    }
    const nj184=VERIFIED_BUSINESS_CONTACTS.find(p=>p.id==='12579ac9-0154-40f9-b58c-bc666ed78451');
    assert(nj184,'new NJ184 inquiry route');
    assert.equal(nj184.verifiedOn,'2026-09-21');
    assert.equal(nj184.sourceUrl,'https://nj184barbershop.com/lien-he');
    assert.deepEqual(nj184.channels.map(c=>c.kind),['zalo','whatsapp','facebook','phone']);
    assert(nj184.channels.some(c=>c.url==='tel:+84708999184'));
    for(const expected of [
      {id:'e29a5622-8556-4fee-9814-85089929cbd7',kinds:['facebook','phone'],phone:'tel:+84384308587'},
      {id:'500ccf1c-201f-4837-abd1-f465c4317a21',kinds:['facebook','phone'],phone:'tel:+842432006379'},
      {id:'f5bdf96e-c292-46ae-bbd6-4b5bdebe25d7',kinds:['kakao','facebook','phone'],phone:'tel:+84364682281'}
    ]){
      const entry=VERIFIED_BUSINESS_CONTACTS.find(p=>p.id===expected.id);
      assert(entry,'new 2026-09-24 inquiry route');
      assert.equal(entry.verifiedOn,'2026-09-24');
      assert.deepEqual(entry.channels.map(c=>c.kind),expected.kinds);
      assert(entry.channels.some(c=>c.url===expected.phone));
    }
    assert(VERIFIED_BUSINESS_CONTACTS.some(p=>p.channels.every(c=>c.kind!=='phone')),'cover social-only inquiry routes');
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
      {kind:'tiktok',url:'https://www.tiktok.com.evil.test/@venue'},
      {kind:'tiktok',url:'https://www.tiktok.com/@venue/video/123'},
      {kind:'tiktok',url:'https://www.tiktok.com/@venue?redirect=https://evil.test'},
      {kind:'tiktok',url:'https://vm.tiktok.com/shortlink/'},
      {kind:'tiktok',url:'https://www.tiktok.com/login'},
      {kind:'unknown',url:'https://example.test/booking'}
    ])assert(!validBookingContact(bad),'invalid route rejected: '+bad.url);
    assert(validBookingContact({kind:'tiktok',url:'https://www.tiktok.com/@example.venue_1'}));
    assert(validBookingContact({kind:'tiktok',url:'https://tiktok.com/@example_venue/'}));
    assert(validBookingContact({kind:'whatsapp',url:'https://wa.me/84888545767'}));
    assert(validBookingContact({kind:'facebook',url:'https://web.facebook.com/threetabomspa'}));
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
    assert.equal(triggers.length,1,'one booking action is shared by mobile and desktop');
    assert(w.document.querySelector('#detail .detailQuickActions').classList.contains('hasBooking'));
    assert.equal(w.document.getElementById('detailBody').hidden,mobile,'mobile details stay compact; desktop details stay visible');
    const depth=w.history.state.viettripPanelBack.depth,url=w.location.href;
    // Repeat opening is idempotent and never creates duplicate dialog history.
    triggers[0].click();await pause();assert(dialog.open);
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

    const phone=entry.channels.find(c=>c.kind==='phone');
    const copy=dialog.querySelector('[data-booking-phone]');
    if(phone){
      assert(copy);
      // Clipboard API success; no call/message/navigation is triggered.
      let copied;Object.defineProperty(w.navigator,'clipboard',{configurable:true,value:{writeText:async text=>{copied=text}}});
      copy.click();await pause();
      assert.equal(copied,entry.channels.find(c=>c.kind==='phone').url.slice(4));
      assert(dialog.querySelector('#bookingInquiryStatus').textContent.includes('복사했습니다'));
      // Clipboard fallback must stay inside the native modal's focus boundary.
      Object.defineProperty(w.navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('denied')}}});
      w.document.execCommand=command=>{assert.equal(command,'copy');assert(dialog.contains(w.document.activeElement));return true};
      copy.click();await pause();assert(dialog.querySelector('#bookingInquiryStatus').textContent.includes('복사했습니다'));
      w.document.execCommand=()=>false;copy.click();await pause();
      assert(dialog.querySelector('#bookingInquiryStatus').textContent.includes('복사하지 못했습니다'));
      assert.equal(dialog.querySelectorAll('textarea').length,0);
    }else{
      assert.equal(copy,null,'social-only contacts do not show an empty phone action');
    }

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
  // A future verified TikTok contact uses the same inquiry UI, without claiming
  // every operator profile can receive a DM. This fixture never enters production data.
  await action('state.selected=contactFixture.places[0].id;renderDetail()');
  run(`
    const originalChannels=VERIFIED_BUSINESS_CONTACTS[0].channels;
    VERIFIED_BUSINESS_CONTACTS[0].channels=[{kind:'tiktok',url:'https://www.tiktok.com/@example.venue_1'}];
  `);
  w.document.querySelector('#detail [data-booking-inquiry]').click();await pause();
  assert(dialog.open);
  const tiktok=dialog.querySelector('.bookingContactLink');
  assert.equal(tiktok.href,'https://www.tiktok.com/@example.venue_1');
  assert(tiktok.textContent.includes('틱톡 예약 안내'));
  assert(tiktok.textContent.includes('공식 프로필에서 예약 안내 확인'));
  assert.equal(tiktok.target,'_blank');assert.equal(tiktok.rel,'noopener noreferrer');
  assert(!dialog.querySelector('[data-booking-phone]'));
  w.history.back();await pause();assert(!dialog.open);
  run('VERIFIED_BUSINESS_CONTACTS[0].channels=originalChannels');
  await action('closeDetailPanel()');
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
  console.log('PASS all verified branch inquiry routes (including Facebook/Messenger-only contacts): compact/desktop actions, safe URLs, branch mismatch, current-data revalidation, clipboard success/fallback/failure, Back/X/Escape and preserved map criteria');
})().catch(error=>{console.error(error);process.exitCode=1});
