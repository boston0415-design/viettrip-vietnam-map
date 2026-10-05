const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
(async()=>{
for(const mobile of [false,true]){
 const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://example.test',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,d=w.document,run=s=>vm.runInContext(s,dom.getInternalVMContext());
 await new Promise(r=>d.addEventListener('DOMContentLoaded',r,{once:true}));
 w.matchMedia=()=>({matches:mobile});
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 for(const f of ['01-data-storage','02-services-media','03-business-ui','05-places-registration','07-ranges-categories','booking-links'])run(fs.readFileSync('assets/js/'+f+'.js','utf8'));
 run(`const first=VERIFIED_BUSINESS_CONTACTS[0];const fixture={places:[{...first,city:'hcmc',memberBenefit:true,benefitText:'2명 이상 예약 조건',lat:10.77,lng:106.7},{id:'unverified',name:'<img src=x onerror=alert(1)>',category:'restaurant',city:'hanoi',memberBenefit:true,benefitText:'문의 필요'}],reviews:[{placeId:first.id,text:'직접 남긴 후기 <script>bad()</script>',rating:4}]};db=()=>fixture;state.city='all';state.sharedDbLoading=false;placeInCity=(p,c)=>c==='all'||p.city===c;window.PersonalPlaces={isHidden:()=>false,isFavorite:id=>id==='unverified'};selectPlace=id=>{window.chosen=id};`);
 const initial=run('JSON.stringify(fixture)');
 run(fs.readFileSync('assets/js/trip-companion.js','utf8'));
 d.getElementById('openTripCompanion').click();assert(d.getElementById('tripCompanion').open);
 assert.equal(d.querySelectorAll('.tripCard').length,2);assert(!d.querySelector('.tripCard img'),'untrusted place names escaped');
 assert.equal(d.querySelectorAll('[data-trip-inquiry]').length,1,'unverified contacts never get a fabricated booking route');
 d.querySelector('[data-trip-tab=reviews]').click();assert.equal(d.querySelectorAll('.tripCard').length,1);assert(!d.querySelector('.tripCard script'),'review escaped');
 d.querySelector('[data-trip-tab=saved]').click();assert.equal(d.querySelectorAll('.tripCard').length,1);assert.match(d.getElementById('tripNote').textContent,/이 기기/);
 d.querySelector('[data-trip-place]').click();assert.equal(w.chosen,'unverified');assert(!d.getElementById('tripCompanion').open);
 w.TripCompanion.open();d.querySelector('[data-trip-tab=benefits]').click();d.querySelector('[data-trip-inquiry]').click();assert(d.getElementById('bookingInquiryDialog').open);
 assert(!d.getElementById('tripCompanion').open);assert.match(d.getElementById('tripMessage').value,/2 người/);assert.match(d.getElementById('tripMessage').value,/điều kiện áp dụng/);
 function input(id,value){d.getElementById(id).value=value;d.getElementById(id).dispatchEvent(new w.Event('input',{bubbles:true}));}
 input('tripDate','2026-10-08');input('tripTime','19:30');input('tripPeople','4');
 assert.match(d.getElementById('tripMessage').value,/4 người vào ngày 08\/10\/2026 lúc 19:30/);
 input('tripPeople','0');assert(d.getElementById('tripCopy').disabled);assert.equal(d.getElementById('tripMessage').value,'');
 input('tripPeople','3');let copied='';w.navigator.clipboard={writeText:async text=>{copied=text}};d.getElementById('tripCopy').click();await new Promise(r=>setImmediate(r));assert.match(copied,/3 người/);
 assert.match(d.getElementById('tripCopyStatus').textContent,/직접 보내세요/);
 run('openBookingInquiry(first.id)');assert.equal(d.querySelectorAll('.tripInquiry').length,1,'reopening never duplicates forms');
 assert.equal(run('JSON.stringify(fixture)'),initial,'shared places and reviews unchanged');dom.window.close();
}
console.log('PASS desktop/mobile DOM: benefit/review/saved scopes, escaping, verified contacts, reservation message, invalid counts, copy, reopen and shared-data preservation');
})().catch(e=>{console.error(e);process.exitCode=1});
