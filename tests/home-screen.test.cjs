const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {JSDOM}=require(process.env.JSDOM_PATH||'jsdom');
const root=path.join(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
const wait=()=>new Promise(resolve=>setTimeout(resolve,25));

async function fixture({ua='Mozilla/5.0 (Linux; Android 16) Chrome/150.0',standalone=false,insecure=false,clipboard=true,workerFails=false}={}){
 const dom=new JSDOM(read('index.html'),{url:'https://example.test/previous',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;
 await new Promise(resolve=>w.document.addEventListener('DOMContentLoaded',resolve,{once:true}));
 let displayMode=standalone,registered=[],copied=[],modeChange;
 Object.defineProperty(w.navigator,'userAgent',{value:ua});
 Object.defineProperty(w.navigator,'standalone',{value:standalone});
 Object.defineProperty(w,'isSecureContext',{value:!insecure});
 Object.defineProperty(w.navigator,'clipboard',{value:clipboard?{writeText:async text=>copied.push(text)}:undefined});
 Object.defineProperty(w.navigator,'serviceWorker',{value:{register:async(...args)=>{registered.push(args);if(workerFails)throw Error('unavailable');return {}}}});
 w.console.warn=()=>{};
 w.matchMedia=query=>({matches:query.includes('display-mode: standalone')?displayMode:query.includes('max-width'),addEventListener:(event,fn)=>{modeChange=fn}});
 w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};
 w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new w.Event('close'))};
 w.history.pushState({retained:'keep'},'','/');
 // Existing panel controller is exercised with native dialog presentation stubbed.
 w.state={registerMode:false,cat:'spa',ratingFilter:'4',markers:['preserve']};
 w.isMobileMapLayout=()=>true;
 for(const name of ['closeAreaPanel','closeMobileBusinessList','closeDetailPanel','setDetailExpanded','cancelRegisterMode','closeModalById','setMobileLegendExpanded'])w[name]=()=>{};
 const c=dom.getInternalVMContext();
 vm.runInContext(read('assets/js/home-screen.js'),c);
 vm.runInContext(read('assets/js/panel-history.js'),c);
 await wait();
 const id=name=>w.document.getElementById(name);
 function prompt(outcome='accepted',reject=false){
  let calls=0;
  const event=new w.Event('beforeinstallprompt',{cancelable:true});
  event.prompt=()=>{calls++;return reject?Promise.reject(Error('blocked')):Promise.resolve()};
  event.userChoice=Promise.resolve({outcome});w.dispatchEvent(event);
  return {event,calls:()=>calls};
 }
 return {dom,w,id,prompt,registered,copied,mode:()=>{displayMode=true;modeChange()},cleanup:()=>dom.window.close()};
}

(async()=>{
 const f=await fixture();
 assert.equal(f.registered.length,1);assert.equal(f.registered[0][0],'/sw.js');assert.equal(f.registered[0][1].updateViaCache,'none');
 assert(f.id('homeScreenInstall').hidden,'never show a fake install button before the native event');
 assert(!f.id('homeScreenBar').hidden);assert(!f.w.history.state.viettripPanelBack);
 f.id('openHomeScreen').click();await wait();assert(f.id('homeScreenDialog').open);assert(f.w.history.state.viettripPanelBack);
 f.w.history.back();await wait();assert(!f.id('homeScreenDialog').open);assert(!f.w.history.state.viettripPanelBack);assert.equal(f.w.location.pathname,'/');assert.equal(f.w.history.state.retained,'keep');
 assert.equal(f.w.state.cat,'spa');assert.equal(f.w.state.markers[0],'preserve');
 f.id('openHomeScreen').click();await wait();
 const p=f.prompt();assert(p.event.defaultPrevented);assert(!f.id('homeScreenInstall').hidden);assert.equal(p.calls(),0,'no automatic prompt');
 f.id('homeScreenInstall').click();f.id('homeScreenInstall').click();await wait();
 assert.equal(p.calls(),1);assert.match(f.id('homeScreenStatus').textContent,/요청을 보냈/);assert(!f.id('homeScreenBar').hidden,'acceptance is not confirmation of completed installation');
 f.w.dispatchEvent(new f.w.Event('appinstalled'));assert(f.id('homeScreenBar').hidden);assert.match(f.id('homeScreenStatus').textContent,/추가되었습니다/);
 f.id('closeHomeScreen').click();await wait();assert(!f.w.history.state.viettripPanelBack);f.cleanup();

 for(const reject of [false,true]){
  const f=await fixture(),p=f.prompt('dismissed',reject);
  f.id('openHomeScreen').click();f.id('homeScreenInstall').click();await wait();
  assert.equal(p.calls(),1);assert(f.id('homeScreenInstall').hidden);assert(!f.id('homeScreenBar').hidden);
  assert.match(f.id('homeScreenStatus').textContent,reject?/열지 못했습니다/:/취소/);f.cleanup();
 }
 const installed=await fixture({standalone:true});assert(installed.id('homeScreenBar').hidden);assert(installed.id('homeScreenInstall').hidden);installed.cleanup();
 const changing=await fixture();changing.mode();assert(changing.id('homeScreenBar').hidden);changing.cleanup();
 const ios=await fixture({ua:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit Safari/604.1'});
 assert(!ios.w.document.querySelector('[data-home-instructions="ios"]').hidden);assert(ios.id('homeScreenInstall').hidden);
 ios.id('copyHomeScreenLink').click();await wait();assert.equal(ios.copied[0],'https://example.test/');ios.cleanup();
 const cafe=await fixture({ua:'Mozilla/5.0 (Linux; Android 16) NAVER(inapp)'});assert(!cafe.id('homeScreenInApp').hidden);cafe.cleanup();
 const denied=await fixture({clipboard:false,insecure:true});assert.equal(denied.registered.length,0);denied.id('copyHomeScreenLink').click();await wait();assert.match(denied.id('homeScreenStatus').textContent,/길게 눌러/);assert.equal(denied.id('homeScreenLink').selectionStart,0);denied.cleanup();
 const unavailable=await fixture({workerFails:true});unavailable.id('openHomeScreen').click();assert(unavailable.id('homeScreenDialog').open);unavailable.cleanup();
 console.log('PASS install availability, single user-initiated prompt, cancel/failure, Android/iOS/in-app guidance, standalone, clipboard fallback, Back and unchanged map state (native browser APIs emulated)');

 const handlers={},fetches=[];let fail=false,skip=0,claim=0;
 const c=vm.createContext({URL,Response,fetch:async(request,options)=>{fetches.push({request,options});if(fail)throw Error('offline');return new Response('fresh document')},self:{location:{origin:'https://example.test'},skipWaiting:()=>{skip++},clients:{claim:()=>{claim++;return Promise.resolve()}},addEventListener:(name,handler)=>handlers[name]=handler}});
 vm.runInContext(read('sw.js'),c);handlers.install();handlers.activate({waitUntil:()=>{}});assert.equal(skip,1);assert.equal(claim,1);
 const nav={method:'GET',mode:'navigate',url:'https://example.test/'};
 let response;handlers.fetch({request:nav,respondWith:p=>response=p});assert.equal(await (await response).text(),'fresh document');assert.equal(fetches[0].options.cache,'no-store');
 fail=true;handlers.fetch({request:nav,respondWith:p=>response=p});const offline=await response;assert.equal(offline.status,503);assert.match(await offline.text(),/인터넷 연결/);assert.equal(offline.headers.get('cache-control'),'no-store');
 for(const request of [{...nav,method:'POST'},{...nav,mode:'cors',url:'https://example.test/api/reviews'},{...nav,url:'https://maps.googleapis.com/'},{...nav,mode:'no-cors',url:'https://example.test/assets/js/01-data-storage.js'}])handlers.fetch({request,respondWith:()=>assert.fail('Must not intercept assets, API requests, writes or third-party requests')});
 assert.equal(fetches.length,2);console.log('PASS network-only page loads, honest offline screen and no API/asset/third-party interception');

 const manifest=JSON.parse(read('manifest.webmanifest'));
 assert.equal(manifest.start_url,'/');assert.equal(manifest.id,'/');assert.equal(manifest.scope,'/');assert.equal(manifest.display,'standalone');assert.equal(manifest.prefer_related_applications,false);
 for(const icon of manifest.icons){
  const png=fs.readFileSync(path.join(root,icon.src));assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');
  assert.equal(icon.sizes,png.readUInt32BE(16)+'x'+png.readUInt32BE(20));
 }
 for(const required of [192,512])assert(manifest.icons.some(icon=>icon.sizes===required+'x'+required));
 assert(manifest.icons.some(icon=>icon.purpose==='maskable'));
 for(const file of ['manifest.webmanifest','sw.js','assets/js/home-screen.js','assets/css/home-screen.css','assets/icons/vietmap-180.png','assets/icons/vietmap-192.png','assets/icons/vietmap-512.png','assets/icons/vietmap-maskable-512.png'])assert(fs.existsSync(path.join(root,'dist-pages',file)),file+' missing from production build');
 console.log('PASS manifest, icon dimensions and complete deployment output');
})().catch(error=>{console.error(error);process.exitCode=1});
