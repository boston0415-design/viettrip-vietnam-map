// Real city/category/benefit handlers, with Google geometry and network loading emulated.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {JSDOM}=require(process.env.JSDOM_PATH||'jsdom');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const wait=()=>new Promise(r=>setTimeout(r,80));
async function fixture(query,{delay=false,fail=false}={}){
 const dom=new JSDOM(read('index.html'),{url:'https://example.test/'+query,runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,c=dom.getInternalVMContext();
 await new Promise(r=>w.document.addEventListener('DOMContentLoaded',r,{once:true}));
 c.assert=assert;
 for(const file of fs.readdirSync(path.join(root,'assets/js')).filter(f=>/^0[1-8]-/.test(f)).sort())vm.runInContext(read('assets/js/'+file),c,{filename:file});
 const run=code=>vm.runInContext(code,c);
 run(`
 window.matchMedia=()=>({matches:false});
 let fixtures=[['h1','stay','hcmc',true],['h2','stay','hcmc',false],['r1','restaurant','hcmc',true],['n1','stay','hanoi',true]].map(([id,category,city,memberBenefit])=>({id,name:id,category,memberBenefit,subcategory:CONFIG.categories[category].subs[0],...CITY_DATA[city].center}));
 db=()=>({places:fixtures,reviews:[]});stats=()=>({rating:null,count:0,reviews:[]});
 state.map={};state.cat='spa';state.ratingFilter='4';
 let loads=0,groupShown=null,openedPanel=null,heldResolve=null,failLoad=${fail},holdLoad=${delay};
 loadGoogle=async()=>{loads++;if(holdLoad)await new Promise(r=>heldResolve=r);if(failLoad)throw Error('offline');return true};
 sharedBootstrapPromise=Promise.resolve();
 const noop=()=>{};cancelPendingMapWork=noop;clearAreaLabels=noop;clearSelectionRanges=noop;clearSelectedSystemIcons=noop;closeSystemInfo=noop;setDbStatus=noop;fitSelectedCityView=noop;showCityRange=noop;renderPopularAreas=noop;renderAll=noop;renderAreaList=noop;renderMarkers=noop;fitUnifiedBounds=noop;extendBoundsByCircle=noop;
 makeBounds=()=>({extend(){}});focusBenefitFilterResults=noop;setMobileLegendExpanded=noop;
 showAirportCategory=()=>{groupShown='all'};showAirportGroup=group=>{groupShown=group};
 showPointCategory=noop;showTypeRanges=noop;
 window.PersonalPlaces={getView:()=>window.personalView||'all',setView:v=>{window.personalView=v},filter:p=>p};
 document.getElementById('openTransportGuide').addEventListener('click',()=>openedPanel='transport');document.getElementById('openCommunityReviews').addEventListener('click',()=>openedPanel='reviews');
 renderCityControls();
 `);
 const events=read('assets/js/09-init-events.js'),start=events.indexOf("document.querySelectorAll('[data-benefit-filter]').forEach"),end=events.indexOf("\n$('#pName')",start);
 run(events.slice(start,end));run(read('assets/js/guide-map-link.js'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));await wait();
 return {dom,w,run,close:()=>w.close()};
}
(async()=>{
 const normal=await fixture('');normal.run(`assert.equal(loads,0);assert.equal(state.cat,'spa');assert.equal(state.ratingFilter,'4')`);assert(!normal.w.document.getElementById('guideMapNotice'));normal.close();
 const stay=await fixture('?from=guide&city=hcmc&category=stay&benefit=1');stay.run(`assert.equal(state.city,'hcmc');assert.equal(state.cat,'stay');assert.equal(state.navCategory,'stay');assert.equal(state.benefitFilter,'benefit');assert.equal(state.ratingFilter,'all');assert.deepEqual(items().map(p=>p.id),['h1']);assert.equal(window.personalView,'all');assert.equal(loads,1)`);assert(!stay.w.document.getElementById('relatedGuideLink'));assert.match(stay.w.document.getElementById('mapGuideLink').href,/guide\/\?city=hcmc$/);stay.close();
 const hanoi=await fixture('?from=guide&city=hanoi&category=stay');hanoi.run(`assert.equal(state.city,'hanoi');assert.equal(state.cat,'stay');assert.deepEqual(items().map(p=>p.id),['n1'])`);hanoi.close();
 for(const group of ['grab','green','bus']){const f=await fixture('?from=guide&city=hcmc&category=airport&group='+group);f.run(`assert.equal(state.navCategory,'airport');assert.equal(groupShown,'${group}');assert.equal(state.cat,'all')`);f.close()}
 for(const panel of ['reviews','transport']){const f=await fixture('?from=guide&city=danang&panel='+panel);f.run(`assert.equal(state.city,'danang');assert.equal(openedPanel,'${panel}')`);f.close()}
 const malicious=await fixture('?from=guide&city=__proto__&category=%22%5D%3Cscript%3E&panel=other');malicious.run(`assert.equal(state.city,'hcmc');assert.equal(state.cat,'all');assert.equal(openedPanel,null)`);malicious.close();
 const canceled=await fixture('?from=guide&city=hanoi&category=stay',{delay:true});canceled.w.document.querySelector('.content').dispatchEvent(new canceled.w.Event('pointerdown',{bubbles:true}));canceled.run('heldResolve()');await wait();canceled.run(`assert.equal(state.city,'hcmc');assert.equal(state.cat,'spa')`);assert.match(canceled.w.document.getElementById('guideMapNotice').textContent,/자동 이동을 멈췄/);canceled.close();
 const failed=await fixture('?from=guide&city=hcmc&category=exchange',{fail:true});assert.match(failed.w.document.getElementById('guideMapNotice').textContent,/연결하지 못/);failed.run('failLoad=false');failed.w.document.querySelector('#guideMapNotice button').click();await wait();failed.run(`assert.equal(state.cat,'exchange')`);failed.close();
 console.log('PASS untouched ordinary map entry, guide city/category/benefit intersection, airport groups, review/transport panels, validated input, user-interaction cancellation and network retry (map geometry/network emulated)');
})().catch(e=>{console.error(e);process.exitCode=1});
