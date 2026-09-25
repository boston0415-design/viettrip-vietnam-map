const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const nodes=new Map(),frames=[],listeners={};
let mobile=true,landscape=false;
const document={activeElement:null,querySelector:s=>nodes.get(s)||null,querySelectorAll:()=>[],addEventListener:(type,fn)=>listeners[type]=fn};
function element(id){
 const classes=new Set(),attrs={};let html='';
 const node={hidden:false,textContent:'',scrollTop:0,
  classList:{contains:k=>classes.has(k),add:(...ks)=>ks.forEach(k=>classes.add(k)),remove:(...ks)=>ks.forEach(k=>classes.delete(k)),toggle(k,on){on??=!classes.has(k);on?classes.add(k):classes.delete(k);return on}},
  setAttribute:(k,v)=>attrs[k]=v,getAttribute:k=>attrs[k]??null,
  querySelector:()=>null,contains:n=>n?.insideBody===true,focus(){document.activeElement=this},
  get innerHTML(){return html},set innerHTML(value){html=value;for(const [,child] of value.matchAll(/\bid="([^"]+)"/g))element(child)}
 };nodes.set('#'+id,node);return node;
}
const detail=element('detail'),wrap=element('mapwrap');nodes.set('.mapwrap',wrap);
for(const id of ['areaLegend','areaLegendTitle','areaLegendBody','areaPanel','businessSide','activeCityName','filterSelectionSummary'])element(id);
wrap.getBoundingClientRect=()=>({top:150,left:0,right:landscape?844:mobile?390:900,bottom:750,width:landscape?844:mobile?390:900,height:600});
detail.getBoundingClientRect=()=>{
 const expanded=detail.classList.contains('detailExpanded'),side=!mobile||landscape;
 return {left:side?524:8,right:side?834:382,top:side?160:expanded?318:562,bottom:side?650:726,width:side?310:374,height:side?490:expanded?408:164};
};
const ctx=vm.createContext({console,assert,document,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},URL,Map,Set,Promise,requestAnimationFrame:fn=>frames.push(fn)});
ctx.window=ctx;ctx.matchMedia=()=>({matches:mobile});ctx.addEventListener=(type,fn)=>listeners[type]=fn;
const root=path.join(__dirname,'../assets/js');
for(const f of fs.readdirSync(root).filter(f=>/^0[1-8]-/.test(f)).sort())vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
const run=code=>vm.runInContext(code,ctx),flush=()=>{while(frames.length)frames.shift()()};
run(`
const fixture={places:[{id:'a',name:'테스트 <업체>',category:'restaurant',subcategory:'한식',address:'테스트 주소',lat:10.77,lng:106.7,initialRating:5},{id:'b',name:'다음 업체',category:'bar',subcategory:'클럽',lat:10.78,lng:106.71}],reviews:[{id:'r',placeId:'a',nickname:'회원',text:'좋아요',rating:4}]};
db=()=>fixture;isOwnerPlace=()=>false;renderList=()=>{};closeSystemInfo=()=>{};refreshMapAfterMobileLayout=()=>{};cancelPendingMapWork=()=>{};
let lastCenter,lastPan,writeReviewCalls=0;
openReview=()=>writeReviewCalls++;
state.map={setCenter:position=>lastCenter=position,panBy:(x,y)=>lastPan={x,y}};
focusLocationAtZoom=async(position,zoom)=>{assert.equal(zoom,17);state.map.setCenter(position)};
Object.assign(state,{city:'hcmc',navCategory:'restaurant',cat:'restaurant',sub:'한식',selectedNavItem:'한식',ratingFilter:'4',benefitFilter:'benefit',query:'테스트'});
const marker={setMap(){throw Error('panel must not remove markers')}};state.markers=[marker];state.selectionOverlays=[marker];
const criteria=()=>JSON.stringify([state.city,state.cat,state.sub,state.ratingFilter,state.benefitFilter,state.query,state.markers,state.selectionOverlays]);
const originalCriteria=criteria();
// Prefer the selected marker coordinates over an ambiguous business name.
let route=new URL(businessDirectionsUrl(fixture.places[0]));
assert.equal(route.origin,'https://www.google.com');assert.equal(route.pathname,'/maps/dir/');
assert.equal(route.searchParams.get('api'),'1');assert.equal(route.searchParams.get('destination'),'10.77,106.7');
assert(!route.searchParams.has('origin'),'Google Maps must determine the live device origin');
assert(!route.searchParams.has('key'));assert(!route.searchParams.has('travelmode'),'leave travel mode choice in Google Maps');
route=new URL(businessDirectionsUrl({name:'A & B',address:'1군 #2',lat:null,lng:''}));
assert.equal(route.searchParams.get('destination'),'A & B 1군 #2','missing coordinates must not become 0,0');
assert.equal(businessDirectionsUrl({}), '');
assert.equal(new URL(businessDirectionsUrl({name:'valid address',lat:999,lng:NaN})).searchParams.get('destination'),'valid address');
const routeLink=businessDirectionsLinkHtml({name:'<unsafe>',lat:10,lng:106});
assert(routeLink.includes('&lt;unsafe&gt;'));assert(routeLink.includes('rel="noopener noreferrer"'));assert(!routeLink.includes('onclick='));
assert.equal(criteria(),originalCriteria);
`);
(async()=>{
 nodes.get('#businessSide').classList.add('mobileOpen');wrap.classList.add('listOpen');
 run('setMobileLegendExpanded(true)');
 await run("selectPlace('a')");flush();
 assert.equal(nodes.get('#detailBody').hidden,true,'selection starts compact');
 assert(!nodes.get('#businessSide').classList.contains('mobileOpen'),'list closes on selection');
 assert(!wrap.classList.contains('listOpen'));assert(wrap.classList.contains('detailOpen'));
 assert(nodes.get('#areaLegendBody').hidden);assert(detail.innerHTML.includes('회원 후기 1개 보기'));
 assert(detail.innerHTML.includes('테스트 &lt;업체&gt;'));
 assert.equal((detail.innerHTML.match(/class="directionsButton/g)||[]).length,1,'one directions action shared by phone and desktop');assert(!detail.innerHTML.includes('id="adminDeleteBtn"'));
 run('assert.equal(lastPan.y,74);assert.equal(lastPan.x,0);assert.equal(criteria(),originalCriteria)');
 for(let i=0;i<3;i++){
  nodes.get('#detailExpandBtn').onclick();flush();assert.equal(nodes.get('#detailBody').hidden,false);
  run('assert.equal(lastPan.y,196)');
  document.activeElement={insideBody:true};run('setDetailExpanded(false)');flush();
  assert.equal(nodes.get('#detailBody').hidden,true);assert.equal(document.activeElement,nodes.get('#detailExpandBtn'));
  run('assert.equal(criteria(),originalCriteria)');
 }
 run('setDetailExpanded(true);renderDetail()');assert.equal(nodes.get('#detailBody').hidden,false,'same place updates keep reading mode');
 nodes.get('#writeReview').onclick();run('assert.equal(writeReviewCalls,1)');
 await run("selectPlace('b')");flush();assert.equal(nodes.get('#detailBody').hidden,true,'new place resets summary');
 // Desktop/phone rotation keeps one panel and exposes details on desktop.
 mobile=false;run('syncDetailPanelLayout();positionSelectedPlaceInView()');flush();
 assert.equal(nodes.get('#detailBody').hidden,false);run('assert.equal(lastPan.x,188);assert.equal(lastPan.y,0)');
 mobile=true;landscape=true;run('syncDetailPanelLayout();positionSelectedPlaceInView()');flush();
 assert.equal(nodes.get('#detailBody').hidden,true);run('assert.equal(lastPan.x,160);assert.equal(lastPan.y,0)');landscape=false;
 // Filter and list opening dismiss detail; all map criteria remain intact.
 run('setMobileLegendExpanded(true)');assert(!detail.classList.contains('show'));assert(!nodes.get('#areaLegendBody').hidden);
 await run("selectPlace('a')");run('openMobileBusinessList()');flush();
 assert(!detail.classList.contains('show'));assert(nodes.get('#businessSide').classList.contains('mobileOpen'));assert(!wrap.classList.contains('detailOpen'));
 run('assert.equal(criteria(),originalCriteria)');
 const events=fs.readFileSync(path.join(root,'09-init-events.js'),'utf8');
 const start=events.indexOf("window.addEventListener('resize',()=>{");
 run(events.slice(start,events.indexOf("$('#mapRetryBtn')",start)));
 run('closeTopModalOrRegisterMode=()=>false');
 await run("selectPlace('a')");run('setDetailExpanded(true)');flush();
 const escape={key:'Escape',preventDefault(){},stopPropagation(){}};
 listeners.keydown(escape);assert(detail.classList.contains('show'));assert(nodes.get('#detailBody').hidden);
 listeners.keydown(escape);assert(!detail.classList.contains('show'));flush();
 // A pending pan must never reopen/recentre a panel dismissed before the next frame.
 const oldPan=run('JSON.stringify(lastPan)');run('positionSelectedPlaceInView();closeDetailPanel()');flush();assert.equal(run('JSON.stringify(lastPan)'),oldPan);
 await run("selectPlace('a')");mobile=false;listeners.resize();flush();assert(wrap.classList.contains('detailOpen'));assert.equal(nodes.get('#detailBody').hidden,false);
 run('assert.equal(criteria(),originalCriteria)');
 console.log('PASS summary/expand/review controls, map framing, list/filter exclusivity, new selection, resize, Escape, permissions and retained criteria');
})().catch(error=>{console.error(error);process.exitCode=1});
