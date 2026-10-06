const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
(async()=>{for(const width of [390,1440]){
 const w=new JSDOM('<div id="map"></div><div id="detail" class="show"><div class="detailQuickActions"></div></div>',{runScripts:'outside-only'}).window;
 w.innerWidth=width;let lines=[],fits=[],located=0,external=null;
 w.state={selected:'a',map:{fitBounds:(b,p)=>fits.push({b,p})},userMarker:null};w.db=()=>({places:[{id:'a',lat:10.72,lng:106.7},{id:'b',lat:10.73,lng:106.71}]});w.PlaceSearch={currentPlace:()=>external};w.locateUser=()=>located++;
 w.google={maps:{SymbolPath:{FORWARD_CLOSED_ARROW:'arrow'},Polyline:class{constructor(o){this.options=o;this.path=o.path;this.map=o.map;lines.push(this)}setMap(m){this.map=m}setPath(p){this.path=p}},LatLngBounds:class{constructor(){this.points=[]}extend(p){this.points.push(p)}}}};
 w.eval(fs.readFileSync('assets/js/destination-line.js','utf8'));
 const flush=()=>new Promise(r=>w.queueMicrotask(r));
 w.DestinationLine.sync();await flush();assert.equal(lines.length,0);w.document.querySelector('button').click();assert.equal(located,1);
 let pos={lat:()=>10.71,lng:()=>106.69};w.state.userMarker={getPosition:()=>pos};w.DestinationLine.sync();await flush();assert.equal(lines.length,1);assert.equal(lines[0].options.strokeOpacity,0);assert.equal(lines[0].options.clickable,false);assert.equal(lines[0].path[1].lat,10.72);
 w.document.querySelector('button').click();assert.equal(fits.length,1);assert.equal(fits[0].b.points.length,2);
 pos={lat:()=>10.715,lng:()=>106.69};w.state.selected='b';w.DestinationLine.sync();await flush();assert.equal(lines.length,1);assert.equal(lines[0].path[0].lat,10.715);assert.equal(lines[0].path[1].lat,10.73);
 w.state.selected=null;external={lat:10.8,lng:106.8};w.DestinationLine.sync();await flush();assert.equal(lines[0].path[1].lat,10.8);
 external={lat:null,lng:null};w.DestinationLine.sync();await flush();assert.equal(lines[0].map,null);assert(!w.document.querySelector('button'));
 w.state.selected='a';w.DestinationLine.sync();await flush();w.DestinationLine.clear();assert.equal(lines.at(-1).map,null);assert(!w.document.getElementById('destinationLineHint'));w.close();
}console.log('PASS 390/1440: permission button, dashed direction/arrow, location update, destination switch, external place, fit, invalid coordinates and cleanup');})();
