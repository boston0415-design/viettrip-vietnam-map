const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require(process.env.JSDOM_PATH||'jsdom');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const dom=new JSDOM(read('index.html'),{url:'https://viettrip-vietnam-map.pages.dev/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,ctx=dom.getInternalVMContext(),run=code=>vm.runInContext(code,ctx);
w.assert=assert;w.matchMedia=query=>({matches:query.includes('max-width')});
for(const name of fs.readdirSync(path.join(root,'assets/js')).filter(name=>/^0[1-8]-/.test(name)).sort())run(read('assets/js/'+name));
run(read('assets/js/booking-links.js'));
run(`
  isOwnerPlace=()=>false;renderList=()=>{};refreshMapAfterMobileLayout=()=>{};positionSelectedPlaceInView=()=>{};
  const fixture={places:VERIFIED_BUSINESS_BOOKINGS.map(p=>({...p,subcategory:'',lat:10.77,lng:106.7})),reviews:[]};
  db=()=>fixture;
  Object.assign(state,{cat:'restaurant',sub:'한식',ratingFilter:'4',query:'preserve',markers:[{id:'unchanged'}]});
  const saved=JSON.stringify([state.cat,state.sub,state.ratingFilter,state.query,state.markers]);
  assert.equal(VERIFIED_BUSINESS_BOOKINGS.length,14);
  const activeDirectIds=VERIFIED_BUSINESS_BOOKINGS.map(p=>p.id);
  for(const id of ['890c1003-06f9-482b-b601-bfa9a8b6e2ff','c6b8a22b-f577-42ca-8381-37218a4677c5','6eb2c0b0-8052-4d23-8753-ef143725ae6a','590758f4-d650-4195-a583-15930d8b8632','4d17d5da-5f7b-4dc0-b49d-01ca48fcd3bd'])assert(activeDirectIds.includes(id),'retain previously verified direct reservations');
  assert(activeDirectIds.includes('d2a04f77-2218-4101-b9be-3fdf172a8958'),'Rex Hotel official booking');
  assert(activeDirectIds.includes('91b696af-588e-4a13-af5a-d50fb363172f'),'Vinpearl Landmark 81 official Marriott booking');
  const xliii=VERIFIED_BUSINESS_BOOKINGS.find(p=>p.id==='b028e325-1bbf-41a7-967a-384cfe78b4d9');
  assert(xliii,'XLIII Pasteur official reservation form');
  assert.equal(xliii.verifiedOn,'2026-10-04');
  assert.equal(xliii.url,'https://xliiicoffee.com/en/location/xliii-coffee-hcmc/');
  const kimSpa=VERIFIED_BUSINESS_BOOKINGS.find(p=>p.id==='bedc2ca1-07b3-4c7f-b49a-8d5f5cc4d1cd');
  assert(kimSpa,'Kim Spa District 7 official reservation request form');
  assert.equal(kimSpa.verifiedOn,'2026-10-05');
  assert.equal(kimSpa.url,'https://kimmassagequan7.com/');
  const goldenLotusSpa=VERIFIED_BUSINESS_BOOKINGS.find(p=>p.id==='264290b4-1b37-4f6d-bde8-79b54ec467a1');
  assert(goldenLotusSpa,'Golden Lotus 15 Thai Van Lung official appointment form');
  assert.equal(goldenLotusSpa.verifiedOn,'2026-10-08');
  assert.equal(goldenLotusSpa.url,'https://saigonwellness.vn/');
  const templeLeaf=VERIFIED_BUSINESS_BOOKINGS.find(p=>p.id==='ab1794e5-1897-4a13-920d-688b6cdffaa7');
  assert(templeLeaf,'Temple Leaf 32 Thai Van Lung official reservation form');
  assert.equal(templeLeaf.verifiedOn,'2026-10-08');
  assert.equal(templeLeaf.url,'https://templeleafsauna.com/bookingonline');
  for(const expected of [
    {id:'d1d8099f-8864-43ef-8025-7f77771b92d1',url:'https://louisianebrewhouse.com.vn/contact-us-reservations/'},
    {id:'a3c685fa-2d7d-459c-a0bc-f5d6d3cac080',url:'https://mzentertainment.vn/lien-he'},
    {id:'4dd4eb44-4e31-4ec3-b0c7-c5b68913cb29',url:'https://skylightnhatrang.com/rooftop-beach-club/booking/'}
  ]){
    const entry=VERIFIED_BUSINESS_BOOKINGS.find(p=>p.id===expected.id);
    assert(entry,'upgraded official table reservation form');
    assert.equal(entry.verifiedOn,'2026-10-09');
    assert.equal(entry.url,expected.url);
  }
  for(const id of ['890c1003-06f9-482b-b601-bfa9a8b6e2ff','c6b8a22b-f577-42ca-8381-37218a4677c5','6eb2c0b0-8052-4d23-8753-ef143725ae6a']){
    assert.equal(VERIFIED_BUSINESS_BOOKINGS.find(p=>p.id===id).verifiedOn,'2026-09-29','oldest direct route rechecked');
  }
  const mismatchedQuanBuiGarden={id:'4eccf861-1154-461b-b257-20a48f8850c6',name:'콴 부이 가든',category:'restaurant',address:'55A Ngô Quang Huy, An Khánh, Hồ Chí Minh 70000 베트남'};
  assert.equal(verifiedBookingFor(mismatchedQuanBuiGarden),null,'current official 55 address mismatch suspends reservation');
  assert.equal(bookingLinkHtml(mismatchedQuanBuiGarden),'','no mismatched branch reservation action');
  const mismatchedPizza={id:'a229bbfc-41eb-4749-8da2-4cedecaff5e7',name:'Pizza 4P’s Le Thanh Ton',category:'restaurant',address:'Vincom Building, Lê Thánh Tôn, Sài Gòn, Hồ Chí Minh 700000 베트남'};
  assert.equal(verifiedBookingFor(mismatchedPizza),null,'official branch address mismatch suspends reservation');
  assert.equal(bookingLinkHtml(mismatchedPizza),'','no stale reservation action');
  assert.equal(bookingNoteHtml(mismatchedPizza),'');
  for(const p of fixture.places){
    state.selected=p.id;renderDetail();
    const links=[...document.querySelectorAll('#detail .bookingButton')];
    assert.equal(links.length,1,'phone and desktop share one booking action');
    assert(document.querySelector('.detailQuickActions').classList.contains('hasBooking'));
    assert(!document.getElementById('detailBody').hidden,'booking details open ready to read');
    for(const a of links){
      assert.equal(a.href,p.url);assert.equal(a.target,'_blank');
      assert(a.rel.includes('noopener'));assert(a.rel.includes('noreferrer'));
      assert(a.getAttribute('aria-label').includes('새 창'));
    }
    assert(document.querySelector('#detail .bookingNote').textContent.includes(p.note));
    assert.equal(verifiedBookingFor({...p,id:'different-business'}),null,'similar names must not acquire another business booking');
    for(const field of ['name','category','address'])assert.equal(verifiedBookingFor({...p,[field]:'changed'}),null,'changed identity requires re-verification');
    setDetailExpanded(true);assert(!document.getElementById('detailBody').hidden);
  }
  fixture.places.push({id:'unknown',name:'등록되지 않은 업소',category:'spa',subcategory:'발마사지',bookingUrl:'javascript:alert(1)'});
  state.selected='unknown';renderDetail();assert(!document.querySelector('#detail .bookingButton'));
  assert(!document.querySelector('.detailQuickActions').classList.contains('hasBooking'));
  assert.equal(bookingLinkHtml({name:'<script>bad</script>',url:'javascript:alert(1)'}),'');
  const points=Object.values(EXTRA_DATA).flatMap(city=>city.points||[]);
  for(const entry of VERIFIED_POINT_BOOKINGS){
    const p=points.find(p=>p.name===entry.name);assert(p,entry.name);
    const html=mapFeatureHtml({...p,lat:10.77,lng:106.7},null,{directions:true});
    const holder=document.createElement('div');holder.innerHTML=html;
    assert.equal(holder.querySelector('.bookingButton').href,entry.url);
    assert(holder.querySelector('.mapDirectionsButton'),'existing walking directions retained');
    assert(!mapFeatureHtml(p).includes('bookingButton'),'hover stays passive');
    assert.equal(verifiedBookingFor({...p,sourceUrl:'https://unverified.test'}),null);
  }
  assert.equal(VERIFIED_POINT_BOOKINGS.length,7);
  const station=points.find(p=>p.name==='사이공역');
  let stationLocation;resolvePoiLocation(station,location=>{stationLocation=location});
  const stationCard=document.createElement('div');stationCard.innerHTML=mapFeatureHtml({...station,...stationLocation},null,{directions:true});
  assert.equal(stationCard.querySelector('.bookingButton').href,'https://dsvn.vn/');
  assert(stationCard.querySelector('.bookingButton').textContent.includes('기차표 예약'));
  assert(stationCard.querySelector('.bookingNote').textContent.includes('Sài Gòn'));
  const stationRoute=new URL(stationCard.querySelector('.mapDirectionsButton').href);
  assert.equal(stationRoute.searchParams.get('destination'),'10.781213,106.677198','directions use the corrected station pin');
  assert(!stationRoute.searchParams.has('origin'),'Google Maps obtains the current location');
  assert.equal(saved,JSON.stringify([state.cat,state.sub,state.ratingFilter,state.query,state.markers]));
`);
const scriptUrls=[...w.document.scripts].map(s=>s.src);
assert(scriptUrls.findIndex(u=>u.includes('booking-links.js'))<scriptUrls.findIndex(u=>u.includes('04-rendering.js')));
const trust=w.document.querySelector('.homeScreenTrust');
assert.deepEqual([...trust.querySelectorAll('dt')].map(n=>n.textContent),['이용 방식','권한','공식 주소']);
assert.equal(trust.querySelector('a').href,'https://viettrip-vietnam-map.pages.dev/');
dom.window.close();
console.log('PASS verified reservations for 14 businesses and 7 points, including Lousiane, MZ Club and Skylight table forms, Golden Lotus Spa and Temple Leaf, Saigon station booking and corrected route destination; identity changes, unsafe/unverified inputs, compact detail, directions, passive hover, install trust copy and unchanged filters');
