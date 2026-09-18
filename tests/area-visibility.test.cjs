// DOM interaction + geographic camera projection. This does not emulate Google rendering.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require(process.env.JSDOM_PATH||'jsdom');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const dom=new JSDOM(read('index.html'),{url:'https://viettrip-vietnam-map.pages.dev/',runScripts:'outside-only'});
const w=dom.window,run=s=>vm.runInContext(s,dom.getInternalVMContext());
let clock=0,frames=[],width=390,height=650;
w.assert=assert;w.matchMedia=q=>({matches:q.includes('max-width')?width<=900:width>900});
w.requestAnimationFrame=fn=>{frames.push(fn);return frames.length};w.performance.now=()=>clock;
w.flushFrames=()=>{let count=0;while(frames.length){assert(++count<100,'animation must terminate');clock+=32;const queue=frames;frames=[];queue.forEach(fn=>fn(clock))}};
w.setViewport=(x,y)=>{width=x;height=y};
const mapDiv=w.document.querySelector('#map');
Object.defineProperties(mapDiv,{clientWidth:{get:()=>width},clientHeight:{get:()=>height}});
mapDiv.getBoundingClientRect=()=>({top:0,left:0,right:width,bottom:height,width,height});
w.document.querySelector('#areaLegend').getBoundingClientRect=()=>{
 const h=w.document.querySelector('#areaLegend').classList.contains('mobileCollapsed')?46:Math.min(460,height-80);
 return {left:10,right:width-10,top:height-24-h,bottom:height-24,width:width-20,height:h};
};
try{
 for(const match of read('index.html').matchAll(/<script src="\.\/(assets\/js\/(?:0[1-8]-[^?]+|hospital-directory\.js))\?/g))run(read(match[1]));
 run(`
  class Bounds{
    constructor(){this.points=[]}
    extend(p){this.points.push({lat:typeof p.lat==='function'?p.lat():p.lat,lng:typeof p.lng==='function'?p.lng():p.lng});return this}
    isEmpty(){return !this.points.length}
    getNorthEast(){return {lat:()=>Math.max(...this.points.map(p=>p.lat)),lng:()=>Math.max(...this.points.map(p=>p.lng))}}
    getSouthWest(){return {lat:()=>Math.min(...this.points.map(p=>p.lat)),lng:()=>Math.min(...this.points.map(p=>p.lng))}}
    getCenter(){const ne=this.getNorthEast(),sw=this.getSouthWest();return {lat:()=>(ne.lat()+sw.lat())/2,lng:()=>(ne.lng()+sw.lng())/2}}
  }
  class Shape{
    constructor(options){this.options=options;this.map=options.map;this.events={}}
    setOptions(options){Object.assign(this.options,options)}
    setMap(map){this.map=map}
    addListener(event,fn){this.events[event]=fn}
  }
  class Overlay{
    setMap(map){this.map=map;if(map){this.onAdd();this.draw()}else this.onRemove()}
    getPanes(){return {overlayMouseTarget:document.body}}
    getProjection(){return {fromLatLngToDivPixel:()=>({x:150,y:100})}}
  }
  google={maps:{Circle:Shape,Marker:Shape,OverlayView:Overlay,LatLngBounds:Bounds,LatLng:class{constructor(p){Object.assign(this,p)}},Size:class{},Point:class{}}};
  let center={lat:10.77,lng:106.7},zoom=18;
  state.map={getDiv:()=>$('#map'),getCenter:()=>({lat:()=>center.lat,lng:()=>center.lng}),getZoom:()=>zoom,
    setCenter:p=>{center=p},setZoom:z=>{zoom=z;refreshReferenceRangeVisibility()}};
  db=()=>({places:[],reviews:[]});renderAll=()=>{};
  const project=p=>{
    const scale=256*2**zoom,div=state.map.getDiv();
    return {x:div.clientWidth/2+(p.lng-center.lng)/360*scale,y:div.clientHeight/2+(mercatorY(p.lat)-mercatorY(center.lat))*scale};
  };
  function assertRangesOnMap(){
    const map=state.map.getDiv(),legend=$('#areaLegend').getBoundingClientRect();
    for(const circle of state.selectionOverlays){
      assert(circle.options.visible,'selected regions must remain visible');
      assert(circle.options.fillOpacity>0);assert(circle.options.strokeOpacity>=.68);
      const b=new Bounds();extendBoundsByCircle(b,circle.options.center,circle.options.radius);
      for(const p of b.points){const pixel=project(p);
        assert(pixel.x>=-1 && pixel.x<=map.clientWidth+1,'full circle fits horizontally');
        assert(pixel.y>=-1 && pixel.y<=legend.top+1,'full circle fits above the filter bar: '+pixel.y+' > '+legend.top);
      }
    }
  }
  let selections=0;
  for(const viewport of [[390,650],[360,480],[844,240],[1280,800]]){
    setViewport(...viewport);
    for(const city of Object.keys(CITY_DATA)){
      state.city=city;state.navCategory=null;state.selectedNavItem=null;renderCityControls();
      for(const category of ['korean-zone','market-nav']){
        const type=navDef(category).type,areas=currentAreas().filter(a=>normalizeAreaType(a)===type);
        if(!areas.length)continue;
        zoom=18;setMobileLegendExpanded(true);
        $('[data-nav-cat="'+category+'"]').click();flushFrames();
        assert.equal(state.selectionOverlays.length,areas.length,city+' '+type);
        if(isMobileMapLayout())assert($('#areaLegendBody').hidden,'region selection opens the map view');
        assertRangesOnMap();
        if(type==='한인생활권'){
          assert.equal(state.areaLabels.length,areas.length);
          assert.deepEqual(state.areaLabels.map(label=>label.div.textContent),areas.map(area=>area.name));
        }else{
          assert.equal(state.poiMarkers.length,areas.length);
          assert(state.selectionOverlays.every(circle=>circle.options.radius>=350));
        }
        const first=areas[0];
        if(type==='시장')state.poiMarkers[0].events.click();
        else $('[data-nav-area="'+first.name+'"]').click();
        flushFrames();assert.equal(state.selectionOverlays.length,1);assertRangesOnMap();
        assert.equal(state.areaLabels[0].div.textContent,first.name);
        for(const z of [16,17,18,20]){state.map.setZoom(z);assert(state.selectionOverlays[0].options.visible);assert.notEqual(state.areaLabels[0].div.style.display,'none')}
        state.areaLabels[0].div.click();flushFrames();assert.equal(state.selectionOverlays.length,1);assertRangesOnMap();
        selections++;
      }
    }
  }
  setViewport(390,650);state.city='hcmc';renderCityControls();
  $('[data-nav-cat="market-nav"]').click();$('[data-nav-cat="korean-zone"]').click();flushFrames();
  assert.equal(state.selectionOverlays.length,2);assert.equal(state.poiMarkers.length,0);assert.equal(state.areaLabels.length,2);assertRangesOnMap();
  // Member markers use identical category artwork regardless of benefit status or device.
  for(const mobile of [true,false]){
    setViewport(mobile?390:1280,650);
    const svg=decodeURIComponent(businessMarkerIcon('karaoke','로컬 KTV',5,true,'할인').url);
    assert(!svg.includes('>%</text>'));assert(!svg.includes('제휴'));assert(!svg.includes('할인'));
    assert.equal(svg,decodeURIComponent(businessMarkerIcon('karaoke','로컬 KTV',null,false).url));
  }
  console.log('PASS',selections,'city/category/viewport cases, full projected ranges above filters, Korean labels, market icon taps, zoom persistence, repeated selection, rapid switching and consistent member icons');
 `);
}finally{dom.window.close()}
