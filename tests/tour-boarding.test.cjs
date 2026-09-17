// UI navigation with Google Maps emulated; this does not validate live geocoding.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {JSDOM}=require(process.env.JSDOM_PATH||'jsdom');
const root=path.join(__dirname,'..');
const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{url:'https://viettrip-vietnam-map.pages.dev/',runScripts:'outside-only',pretendToBeVisual:true});
const c=dom.getInternalVMContext();c.console=console;c.assert=assert;
for(const file of fs.readdirSync(path.join(root,'assets/js')).filter(f=>/^0[1-8]-/.test(f)).sort())vm.runInContext(fs.readFileSync(path.join(root,'assets/js',file),'utf8'),c,{filename:file});
const run=code=>vm.runInContext(code,c);
const flush=()=>new Promise(resolve=>setImmediate(resolve));
run(`
let mobile=false,clickedInfo='',geocoded=[];
window.matchMedia=q=>({matches:q.includes('max-width')?mobile:!mobile});
class MapObject{
 constructor(options){this.options=options;this.events={};this.map=options.map}
 addListener(name,fn){this.events[name]=fn}setMap(map){this.map=map}setIcon(icon){this.options.icon=icon}
 setOptions(options){Object.assign(this.options,options)}
}
google={maps:{Marker:MapObject,Circle:MapObject,Size:class{},Point:class{},Geocoder:class{
 geocode({address},done){geocoded.push(address);const center=currentCity().center;done([{geometry:{location:{lat:()=>center.lat,lng:()=>center.lng}}}],'OK')}
}}};
state.map={getZoom:()=>17};
renderAll=()=>{};setDbStatus=()=>{};hideHover=()=>{};showClickInfo=(position,html)=>{clickedInfo=html};
makeBounds=()=>({extend(){}});fitUnifiedBounds=()=>{};fitCircleGeometry=()=>{};
const newTypes=['유람선·수상버스','시티투어 버스'];
const fresh=Object.values(EXTRA_DATA).flatMap(city=>city.points||[]).filter(p=>newTypes.includes(p.type));
assert.equal(fresh.length,6);
for(const p of fresh){
 assert(p.address&&p.desc&&p.locationNote&&p.verifiedOn,p.name);
 assert.equal(new URL(p.sourceUrl).protocol,'https:');
 assert(p.sourceLabel,p.name);
}
assert.notEqual(businessGlyphPath('boat'),businessGlyphPath('bus'));
assert.notEqual(businessGlyphPath('boat'),businessGlyphPath('unknown'));
assert.equal(airportGroupPoints('bus').length,3,'tour buses must not leak into airport buses');
`);
(async()=>{
 for(const mobile of [false,true]){
  run(`mobile=${mobile};state.city='hcmc';state.navCategory=null;state.cat='all';state.sub='all';renderHierarchyNav();`);
  for(const [id,type,count] of [['cruise','유람선·수상버스',2],['citytour','시티투어 버스',2]]){
   dom.window.document.querySelector(`[data-nav-cat="${id}"]`).click();await flush();
   run(`
    assert.equal(state.navCategory,${JSON.stringify(id)});assert.equal(state.poiMarkers.length,${count});
    assert.equal(state.selectionOverlays.length,${count});
    assert(state.selectionOverlays.every(r=>r.options.visible===false),'new ranges must stay hidden at street zoom');
    assert(state.poiMarkers.every(m=>m.map===state.map),'boarding markers must remain visible');
    assert.equal(subItemsForNav(navDef(state.navCategory)).length,${count});
    assert.equal(state.areaType,${JSON.stringify(type)});
    renderAreaList();
   `);
   assert.equal(dom.window.document.querySelectorAll('#areaList [data-poi-row]').length,count);
   const row=dom.window.document.querySelector('#areaList [data-poi-row]');row.click();await flush();
   run(`
    assert.equal(state.poiMarkers.length,1);assert(state.selectedNavItem);
    state.poiMarkers[0].events.click({latLng:{lat:0,lng:0}});
    var card=document.createElement('div');card.innerHTML=clickedInfo;
    var link=card.querySelector('.mapDirectionsButton');assert(link);
    var url=new URL(link.href);assert.equal(url.searchParams.get('travelmode'),'walking');
    assert.equal(url.searchParams.get('destination'),state.poiMarkers[0].options.position.lat+','+state.poiMarkers[0].options.position.lng);
    assert(!url.searchParams.has('origin'));assert(!url.searchParams.has('key'));
    assert(clickedInfo.includes('예약 안내'));assert(!clickedInfo.includes('호출 앱'));
    assert(card.textContent.includes(state.selectedNavItem));
    assert(card.querySelector('a[href^="https:"]'));
    renderAreaList();
   `);
   dom.window.document.querySelector(`[data-area-type="${type}"]`).click();await flush();
   run(`assert.equal(state.poiMarkers.length,${count});assert.equal(state.navCategory,${JSON.stringify(id)});`);
  }
  run(`state.city='hanoi';renderHierarchyNav();renderAreaList();`);
  dom.window.document.querySelector('[data-nav-cat="citytour"]').click();await flush();
  run(`assert.equal(state.poiMarkers.length,2);assert(state.poiMarkers.every(m=>/하노이|호안끼엠/.test(m._poiName)));renderAreaList();`);
  assert.equal(dom.window.document.querySelectorAll('#areaList [data-poi-row]').length,2);
  run(`state.city='danang';renderHierarchyNav();renderAreaList();`);
  dom.window.document.querySelector('[data-nav-cat="cruise"]').click();await flush();
  run(`assert.equal(state.poiMarkers.length,0);assert.equal(state.selectionOverlays.length,0);renderAreaList();`);
  assert.match(dom.window.document.querySelector('#areaList').textContent,/아직 없습니다/);
 }
 run(`assert(geocoded.some(a=>a.includes('10B')));assert(geocoded.some(a=>a.includes('7 Đinh')));`);
 console.log('PASS desktop/mobile boarding category and directory clicks, city isolation, exact marker route destination, walking links, airport isolation, street-level range hiding and empty states (Google Maps emulated)');
})().catch(err=>{console.error(err);process.exitCode=1}).finally(()=>dom.window.close());
