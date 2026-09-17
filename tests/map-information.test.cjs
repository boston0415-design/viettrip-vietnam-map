const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'../assets/js');
const c=vm.createContext({console,assert,setTimeout,clearTimeout,setInterval,clearInterval,URL});c.window=c;c.matchMedia=q=>({matches:q.includes('hover')});c.document={addEventListener(){},querySelector(){return {}},querySelectorAll(){return []}};
for(const f of fs.readdirSync(root).filter(f=>/^0[1-8]-/.test(f)).sort())vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),c);
vm.runInContext(`
const actualShowClickInfo=showClickInfo;
let hovered='',clicked='';showPositionHover=(position,html)=>{assert(position);hovered=html};showClickInfo=(position,html)=>{assert(position);clicked=html};hideHover=()=>{};
class Target{constructor(options){this.options=options;this.events={}}addListener(name,fn){(this.events[name]||=[]).push(fn)}setIcon(){}setMap(){}}
google={maps:{Circle:Target,Marker:Target,Size:class{},Point:class{}}};state.map={};
const pos={lat:10.77,lng:106.7};
const routeFrom=html=>new URL(html.match(/class="mapDirectionsButton" href="([^"]+)"/)[1].replace(/&amp;/g,'&'));
const isPickup=p=>['그랩승차','택시승차','그린SM승차','버스승차','유람선·수상버스','시티투어 버스'].includes(p.type)||(p.type==='공항'&&/승차/.test(p.name));
let dismissals=0,registrations=0;closeSystemInfo=()=>{dismissals++};closeDetailPanel=()=>{};closeAreaPanel=()=>{};registerMapClick=()=>{registrations++};
for(const city of Object.values(EXTRA_DATA))for(const p of city.points||[]){
 const marker=createSelectedPoiMarker(p,pos,false);
 marker.events.mouseover.forEach(fn=>fn({latLng:pos}));assert(hovered.includes(esc(p.name)));assert(!hovered.includes('mapDirectionsButton'),'passive hover has no route control');
 marker.events.click.forEach(fn=>fn({latLng:pos}));assert(clicked.includes(esc(p.name)));
 const route=routeFrom(clicked);assert.equal(route.searchParams.get('destination'),'10.77,106.7');assert(!route.searchParams.has('origin'));assert(!route.searchParams.has('key'));
 assert.equal(route.searchParams.get('travelmode'),isPickup(p)?'walking':null);
 assert(clicked.includes('target="_blank"'));assert(clicked.includes('rel="noopener noreferrer"'));
 const circle=addPointCoverageCircle(p.type,pos,p);clicked='';const before=dismissals;circle.events.click[0]({latLng:pos});assert.equal(clicked,'');assert.equal(dismissals,before+1);assert(state.selectionOverlays.includes(circle));circle.events.mouseover[0]({latLng:pos});assert(hovered.includes(esc(p.name)));
}
// Touch and narrow screens must not react to synthesized mouseover events.
window.matchMedia=q=>({matches:q.includes('max-width')});hovered='';
const touch=createSelectedPoiMarker({name:'touch',type:'공항'},pos,false);
touch.events.mouseover.forEach(fn=>fn({latLng:pos}));assert.equal(hovered,'');
touch.events.click.forEach(fn=>fn({latLng:pos}));assert(clicked.includes('touch'));
// Real airport targets retain their exact marker point even if the tap is offset.
for(const type of ['그랩승차','택시승차','그린SM승차','버스승차']){
 const p=EXTRA_DATA.hcmc.points.find(p=>p.type===type && p.name.includes('T2'));
 assert(p,type);const target=createSelectedPoiMarker(p,{lat:p.lat,lng:p.lng},false);
 hovered='';target.events.mouseover.forEach(fn=>fn({latLng:pos}));assert.equal(hovered,'');
 target.events.click.forEach(fn=>fn({latLng:pos}));const route=routeFrom(clicked);
 assert.equal(route.searchParams.get('destination'),p.lat+','+p.lng);assert.equal(route.searchParams.get('travelmode'),'walking');
 assert(clicked.includes('현재 위치에서 걸어가기'));
}
assert.equal(mapFeatureDirectionsHtml({}),'');
// Clicking a route card allows Google Maps to keep its controls in view on PC and phone.
let infoOptions,infoPosition,infoOpened=0;
google.maps.InfoWindow=class{constructor(options){infoOptions=options}setPosition(position){infoPosition=position}open(){infoOpened++}close(){}};
for(const mobile of [false,true]){
 window.matchMedia=q=>({matches:mobile?q.includes('max-width'):q.includes('hover')});
 actualShowClickInfo(pos,clicked);assert.equal(infoOptions.disableAutoPan,false);assert.equal(infoPosition,pos);
}
assert.equal(infoOpened,2);window.matchMedia=q=>({matches:q.includes('max-width')});
// A touch on a filled range closes information instead of opening another card.
dismissals=0;registrations=0;
closeSystemInfo=()=>{dismissals++};closeDetailPanel=()=>{};closeAreaPanel=()=>{};
registerMapClick=()=>{registrations++};
const mobileRange=addPointCoverageCircle('공항',pos,{name:'range'});
clicked='';mobileRange.events.click[0]({latLng:pos});assert.equal(clicked,'');assert.equal(dismissals,1);
assert(state.selectionOverlays.includes(mobileRange));
state.registerMode=true;mobileRange.events.click[0]({latLng:pos});assert.equal(registrations,1);state.registerMode=false;
window.matchMedia=q=>({matches:q.includes('hover')});
const bad={name:'<script>bad</script>',address:'<img src=x>',description:'<svg onload=bad>',...pos};
assert(!mapFeatureHtml(bad).includes('<script>'));assert(mapFeatureHtml(bad).includes('&lt;script&gt;'));
assert(mapFeatureHtml(bad).includes('&lt;img'));assert(!mapFeatureHtml({name:'주소 없음',...pos}).includes('상세 주소 미등록'));
for(const category of Object.keys(CONFIG.categories))assert(businessGlyphPath(category)!==businessGlyphPath('unknown'),category+' needs a recognizable symbol');
assert(mapFeatureHtml({name:'unsafe',sourceUrl:'javascript:alert(1)'}).includes('unsafe'));assert(!mapFeatureHtml({sourceUrl:'javascript:alert(1)'}).includes('href'));
const discount=decodeURIComponent(businessMarkerIcon('stay','호텔',4,true).url.split(',')[1]);assert(discount.includes('>%</text>'));
state.city='hcmc';assert.equal(airportGroupPoints('green').length,3);assert.equal(airportGroupPoints('bus').length,3);assert(airportGroupPoints('all').some(p=>p.type==='버스승차'));
const pin=businessMarkerIcon('stay','호텔',4.5);const svg=decodeURIComponent(pin.url.split(',')[1]);assert(svg.includes('stroke-width="1.5"'));assert(svg.includes('<rect'));assert(!svg.includes('4.5'));
const systemSvg=decodeURIComponent(poiSvg('공항').url.split(',')[1]);assert(systemSvg.includes('<circle'));assert(!systemSvg.includes('<rect'));
console.log('PASS desktop/mobile range dismissal, desktop hover retained, marker taps, registration, escaped content, distinct member/system marker shapes');
`,c);
