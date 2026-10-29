const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require(process.env.JSDOM_PATH||'jsdom');
const read=f=>fs.readFileSync(f,'utf8'),tick=()=>new Promise(r=>setTimeout(r,20));
function fixture({width=1440,native=false,key=''}={}){
 const dom=new JSDOM(`<meta name="kakao-javascript-key" content="${key}"><button id="shareMapApp">앱 공유</button>`,{url:'https://example.test/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 w.innerWidth=width;w.esc=s=>String(s).replace(/</g,'&lt;');w.console.warn=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 let copied,shared,initialized=false,payload,sdkTimeout;
 const timer=w.setTimeout.bind(w);w.setTimeout=(fn,delay)=>delay===8000?(sdkTimeout=fn,0):timer(fn,delay);
 Object.defineProperty(w,'isSecureContext',{value:true});
 Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async text=>{copied=text;}}});
 if(native)w.navigator.share=async data=>{shared=data;};
 const rendering=read('assets/js/04-rendering.js');
 w.eval(rendering.slice(rendering.indexOf('function encodeCopyValue('),rendering.indexOf('function openOwnedPlaceEditor(')));
 if(key)w.Kakao={isInitialized:()=>initialized,init:()=>{initialized=true;},Share:{sendDefault:data=>{payload=data;}}};
 w.eval(read('assets/js/map-sharing.js'));w.eval(read('assets/js/app-share.js'));
 const dialog=w.document.querySelector('dialog'),button=w.document.getElementById('shareMapApp');
 return {w,dialog,button,copied:()=>copied,shared:()=>shared,payload:()=>payload,timeout:()=>sdkTimeout(),close:()=>dom.window.close()};
}
(async()=>{
 for(const width of [390,1440])for(const native of [false,true]){
  const f=fixture({width,native}),{w,dialog,button}=f;
  button.click();assert(dialog.open);assert(dialog.querySelector('.kakaoShareButton').hidden);
  const share=[...dialog.querySelectorAll('button')].find(b=>b.textContent==='공유 앱 선택');
  assert.equal(share.hidden,!native);assert.equal(w.MapSharing.kakaoState,'unconfigured');
  if(native){share.click();await tick();assert.equal(f.shared().url,'https://viettrip-vietnam-map.pages.dev/');assert.match(dialog.textContent,/카카오톡을 선택/);}
  const copy=dialog.querySelector('[data-copy]');copy.click();await tick();assert.equal(f.copied(),'https://viettrip-vietnam-map.pages.dev/');assert.match(dialog.textContent,/복사 완료/);
  w.navigator.clipboard.writeText=async()=>{throw Error('denied');};
  let fallback;w.document.execCommand=()=>{fallback=dialog.querySelector('textarea').value;return true;};
  copy.click();await tick();assert.equal(fallback,'https://viettrip-vietnam-map.pages.dev/');assert(!dialog.querySelector('textarea'));
  w.document.execCommand=()=>false;w.prompt=()=>null;copy.click();await tick();assert.match(dialog.textContent,/길게 누르/);
  dialog.querySelector('[data-close]').click();assert(!dialog.open);assert.equal(w.document.activeElement,button);f.close();
 }
 const configured=fixture({key:'mock-public-key'});
 configured.button.click();assert(configured.dialog.querySelector('.kakaoShareButton').hidden);
 assert.equal(configured.w.MapSharing.kakaoState,'loading');
 configured.w.document.querySelector('script').onload();assert(!configured.dialog.querySelector('.kakaoShareButton').hidden);
 configured.dialog.querySelector('.kakaoShareButton').click();await tick();assert.equal(configured.payload().content.link.webUrl,'https://viettrip-vietnam-map.pages.dev/');configured.close();
 for(const fail of ['load','init','timeout']){
  const f=fixture({key:'mock-public-key'});
  if(fail==='init')f.w.Kakao.init=()=>{throw Error('invalid key');};
  f.button.click();if(fail==='timeout')f.timeout();else f.w.document.querySelector('script')[fail==='load'?'onerror':'onload']();
  assert.equal(f.w.MapSharing.kakaoState,'error');assert(f.dialog.querySelector('.kakaoShareButton').hidden);assert.match(f.dialog.textContent,/연결하지 못했습니다/);f.close();
 }
 const unsupported=fixture({native:true});unsupported.w.navigator.canShare=()=>false;unsupported.button.click();assert(unsupported.dialog.querySelector('button').hidden);assert.equal(await unsupported.w.MapSharing.share(),false);unsupported.close();
 console.log('PASS desktop/mobile app share, capability-based chooser, missing/configured/failed Kakao, dialog clipboard fallback, cancellation and focus restoration (native APIs mocked)');
})().catch(e=>{console.error(e);process.exitCode=1;});
