const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const tick=()=>new Promise(r=>setTimeout(r,20));
(async()=>{for(const width of [390,1440]){
 const w=new JSDOM('<div id="map"></div><div id="detail" class="show"><div class="detailQuickActions"><a href="https://google.com" data-map-route>길찾기</a></div></div>',{runScripts:'outside-only',url:'https://example.test'}).window;
 w.innerWidth=width;let lines=[],fits=[],calls=[],reply;
 const path=[{lat:10.7,lng:106.7},{lat:10.71,lng:106.7},{lat:10.71,lng:106.703},{lat:10.712,lng:106.703}];
 w.state={selected:'a',map:{fitBounds:(b,p)=>fits.push({b,p})},userMarker:null};w.db=()=>({places:[{id:'a',name:'A',lat:10.712,lng:106.703}]});w.businessDirectionsUrl=()=> 'https://www.google.com/maps/dir/?api=1&destination=10.712,106.703';
 w.google={maps:{SymbolPath:{CIRCLE:'circle'},importLibrary:async()=>({Route:{computeRoutes:async req=>{calls.push(req);if(reply)return reply();return {routes:[{path,distanceMeters:1600,durationMillis:360000,legs:[{steps:[{instructions:'우회전'},{instructions:'목적지 도착'}]}]}]};}}}),Polyline:class{constructor(o){this.options=o;this.map=o.map;lines.push(this)}setMap(m){this.map=m}},LatLngBounds:class{constructor(){this.points=[]}extend(p){this.points.push(p)}}}};
 w.eval(fs.readFileSync('assets/js/destination-line.js','utf8'));
 w.DestinationLine.sync();await tick();assert.equal(lines.length,0);assert(!w.document.querySelector('form'),'nothing shown until directions clicked');
 w.document.querySelector('[data-map-route]').click();assert(w.document.querySelector('form'));assert.equal(calls.length,0);
 const input=w.document.querySelector('input');input.value='Ben Thanh Market, Ho Chi Minh City';input.dispatchEvent(new w.Event('input'));w.document.querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true}));await tick();
 assert.equal(calls[0].origin,input.value);assert.equal(calls[0].polylineQuality,'HIGH_QUALITY');assert.equal(lines.length,2);assert.equal(lines[0].options.strokeWeight,7);assert.equal(lines[1].options.strokeOpacity,0);assert(fits.length);assert(w.document.body.textContent.includes('1.6km'));assert(w.document.body.textContent.includes('우회전'));
 const parts=w.DestinationLine.splitPath(path);assert(parts.near.some(p=>p.lat===10.71&&p.lng===106.703),'near section preserves the bend');assert.deepEqual(JSON.parse(JSON.stringify(parts.main.at(-1))),JSON.parse(JSON.stringify(parts.near[0])));
 assert.equal(w.DestinationLine.splitPath([{lat:0,lng:0},{lat:0,lng:.0001}]).main.length,0);
 reply=()=>{throw Error('ZERO_RESULTS')};w.document.querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true}));await tick();assert(lines.every(l=>l.map===null));assert(w.document.body.textContent.includes('불러오지 못했습니다'));
 let resolve;reply=()=>new Promise(r=>resolve=r);w.document.querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true}));await tick();w.DestinationLine.clear();resolve({routes:[{path}]});await tick();assert(!w.document.querySelector('form'));assert(lines.every(l=>l.map===null),'late response cannot redraw after close');w.close();
}console.log('PASS mobile/desktop explicit route action, real geometry bends, last 300m, address origin, API failure without straight-line fallback, stale response cancellation');})();
