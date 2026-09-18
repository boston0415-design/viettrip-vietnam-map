const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require(process.env.JSDOM_PATH||'jsdom');
const root=path.join(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));

async function check(mobile){
  const dom=new JSDOM(read('index.html'),{url:'https://viettrip-vietnam-map.pages.dev/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,ctx=dom.getInternalVMContext(),run=code=>vm.runInContext(code,ctx);
  w.matchMedia=()=>({matches:mobile});w.assert=assert;
  for(const file of fs.readdirSync(path.join(root,'assets/js')).filter(name=>/^0[1-8]-/.test(name)).sort())run(read('assets/js/'+file));
  run(read('assets/js/place-photos.js'));
  run(`
    isOwnerPlace=()=>false;renderList=()=>{};refreshMapAfterMobileLayout=()=>{};positionSelectedPlaceInView=()=>{};
    const photoFixtures={places:[
      {id:'a',name:'Bếp Mẹ Ỉn',category:'restaurant',subcategory:'베트남',address:'136 Lê Thánh Tôn, Hồ Chí Minh',lat:10.773,lng:106.697,photoUrls:['https://example.test/member.webp']},
      {id:'b',name:'Other Venue',category:'restaurant',subcategory:'',address:'12 Pasteur, Hồ Chí Minh',lat:10.77,lng:106.7}
    ],reviews:[]};
    db=()=>photoFixtures;state.map={};
    const baseResult={place_id:'confirmed-google-id',name:'Bep Me In Restaurant',formatted_address:'136 Le Thanh Ton, Ho Chi Minh City',geometry:{location:{lat:()=>10.7731,lng:()=>106.697}}};
    const currentResult=()=>({...baseResult});
    assert(googlePhotoBranchMatches(photoFixtures.places[0],baseResult));
    assert(googlePhotoNameMatches('Lara Massage - 라라 마사지','Lara Spa'));
    assert(!googlePhotoNameMatches('Spa Massage','Another Spa Massage'),'category words cannot establish identity');
    assert(!googlePhotoBranchMatches(photoFixtures.places[0],{...baseResult,name:'Different Restaurant'}));
    assert(!googlePhotoBranchMatches(photoFixtures.places[0],{...baseResult,formatted_address:'137 Le Thanh Ton'}),'nearby chain branch with another house number rejected');
    assert(!googlePhotoBranchMatches(photoFixtures.places[0],{...baseResult,formatted_address:'136 Pasteur'}),'same number on another street rejected');
    assert(!googlePhotoBranchMatches(photoFixtures.places[0],{...baseResult,geometry:{location:{lat:11,lng:107}}}));
    assert(!googlePhotoBranchMatches(photoFixtures.places[0],{...baseResult,geometry:{location:{lat:null,lng:null}}}));
    assert.equal(googlePhotoStreet('09 Biệt Thự').house,googlePhotoStreet('9 Biet Thu').house);
    assert(googlePhotoBranchMatches({...photoFixtures.places[0],address:'Ho Chi Minh',name:baseResult.name},baseResult));
    assert(!googlePhotoBranchMatches({...photoFixtures.places[0],address:'Ho Chi Minh'},baseResult),'incomplete address requires full name match');
  `);
  const fixture=run('photoFixtures'),found=run('baseResult');
  let calls=[],urlCalls=0,photoCount=5,mode='ok',pending=[],failUrl=false;
  function makePhotos(){return Array.from({length:photoCount},(_,i)=>({
    html_attributions:[`<a href="https://maps.google.com/maps/contrib/author-${i}" onclick="alert(1)">촬영자 ${i}</a><img src=x onerror="alert(1)"><script>alert(1)</script>`],
    getUrl(options){assert.equal(options.maxWidth,480);assert.equal(options.maxHeight,360);urlCalls++;return failUrl?'javascript:alert(1)':`https://images.example.test/photo-${i}.jpg`}
  }))}
  w.google={maps:{places:{PlacesService:function(){
    this.findPlaceFromQuery=(request,callback)=>{
      calls.push({method:'find',request});
      if(mode==='pending'){pending.push(callback);return;}
      if(mode==='error'){callback(null,'REQUEST_DENIED');return;}
      if(mode==='zero'){callback([], 'ZERO_RESULTS');return;}
      if(mode==='mismatch'){callback([{...found,name:'Wrong business'}],'OK');return;}
      if(mode==='ambiguous'){callback([found,{...found,place_id:'another-id'}],'OK');return;}
      callback([found],'OK');
    };
    this.getDetails=(request,callback)=>{
      calls.push({method:'details',request});
      if(mode==='detail-pending'){pending.push(callback);return;}
      if(mode==='not-found'){callback(null,'NOT_FOUND');return;}
      if(mode==='detail-mismatch'){callback({...found,name:'Changed Venue'},'OK');return;}
      callback({...found,photos:makePhotos(),html_attributions:['<a href="https://example.test/source">Photo provider</a>']},'OK');
    };
  }}}};
  const open=async()=>{run("state.selected='a';renderDetail()");if(mobile)run('setDetailExpanded(true)');await tick()};
  const close=()=>run('closeDetailPanel()');
  const clear=()=>{close();w.localStorage.clear();calls=[];urlCalls=0};
  run("state.selected='a';renderDetail()");
  if(mobile){
    assert.equal(calls.length,0,'compact mobile view makes no photo requests');
    assert(w.document.getElementById('detailBody').hidden);
    run('setDetailExpanded(true)');
  }
  await tick();
  assert.equal(calls.length,2);assert.equal(calls[0].method,'find');assert.equal(calls[1].method,'details');
  assert.equal(urlCalls,3,'only three photo URLs requested');
  assert.equal(w.document.querySelectorAll('.googlePhotoGrid img').length,3);
  assert.equal(w.document.querySelectorAll('.placePhotos img').length,1,'existing member photos preserved');
  assert.equal(w.document.querySelectorAll('.googlePhotoGrid figcaption a').length,3);
  assert.equal(w.document.querySelector('.googlePhotoProvider').textContent,'Photo provider');
  assert(!w.document.querySelector('.googlePlacePhotos [onclick],.googlePlacePhotos [onerror],.googlePlacePhotos script'));
  const images=[...w.document.querySelectorAll('.googlePhotoGrid img')];
  assert(images.every(image=>image.alt.includes('Bếp Mẹ Ỉn')));
  const links=[...w.document.querySelectorAll('.googlePhotoImageLink')];
  assert(links.every(link=>link.href.includes('query_place_id=confirmed-google-id')&&link.rel==='noopener noreferrer'));
  assert(calls.every(call=>!call.request.fields.includes('rating')&&!call.request.fields.includes('reviews')));
  const serialized=w.localStorage.getItem('viettrip_google_photo_ids_v1');
  assert(serialized.includes('confirmed-google-id'));
  assert(!serialized.includes('photo-')&&!serialized.includes('author-')&&!serialized.includes('Photo provider'),'only IDs, not Google photo data, persist');
  run('renderDetail();syncGooglePlacePhotos();syncGooglePlacePhotos()');await tick();
  assert.equal(calls.length,2,'same active detail reuses its DOM without repeat requests');
  if(mobile){run('setDetailExpanded(false);setDetailExpanded(true)');await tick();assert.equal(calls.length,2)}
  images[0].dispatchEvent(new w.Event('error'));
  assert.equal(w.document.querySelectorAll('.googlePhotoGrid figure').length,2);
  images[1].dispatchEvent(new w.Event('error'));images[2].dispatchEvent(new w.Event('error'));
  assert(w.document.querySelector('.googlePhotoStatus').textContent.includes('불러오지 못'));
  close();assert.equal(run('activeGooglePhotoPanel'),null);
  calls=[];await open();assert.equal(calls.length,1,'saved Place ID skips repeat search but refreshes details');
  assert.equal(calls[0].method,'details');

  for(const failure of ['mismatch','ambiguous','zero','detail-mismatch']){
    clear();mode=failure;await open();
    assert.equal(urlCalls,0,failure+' must never request a photo URL');
    assert(!w.document.querySelector('.googlePhotoGrid img'));
    assert(w.document.querySelector('.googlePhotoStatus').textContent.includes('확인'));
    assert.equal(calls.length,failure==='detail-mismatch'?2:1);
  }
  for(const count of [0,1,2]){
    clear();mode='ok';photoCount=count;await open();
    assert.equal(w.document.querySelectorAll('.googlePhotoGrid img').length,count);
    if(!count)assert(w.document.querySelector('.googlePhotoStatus').textContent.includes('없어요'));
  }
  clear();mode='ok';photoCount=3;failUrl=true;await open();
  assert(!w.document.querySelector('.googlePhotoGrid img'));
  failUrl=false;
  clear();mode='error';await open();
  assert.equal(calls.length,1);run('renderDetail()');await tick();assert.equal(calls.length,1,'API errors do not auto-retry on re-render');
  assert(w.document.querySelector('.googlePhotoRetry'));
  mode='ok';w.document.querySelector('.googlePhotoRetry').click();await tick();
  assert.equal(w.document.querySelectorAll('.googlePhotoGrid img').length,3);
  // A revoked ID must not trap a user in permanent NOT_FOUND failures.
  close();mode='not-found';await open();
  assert(!w.localStorage.getItem('viettrip_google_photo_ids_v1').includes('confirmed-google-id'));
  clear();mode='pending';await open();assert.equal(pending.length,1);
  run("state.selected='b';renderDetail()");
  pending.shift()([found],'OK');await tick();
  assert.equal(calls.filter(call=>call.method==='details').length,0,'late lookup may not fetch photos after selection changes');
  while(pending.length)pending.shift()([], 'ZERO_RESULTS');await tick();
  clear();mode='detail-pending';await open();assert.equal(pending.length,1);
  close();pending.shift()({...found,photos:makePhotos()},'OK');await tick();
  assert.equal(urlCalls,0,'late details cannot request photos after closing');
  assert.equal(run('activeGooglePhotoPanel'),null);
  clear();mode='ok';await open();close();
  // Changing a business address invalidates the old ID lookup key.
  fixture.places[0].address='136 Lê Thánh Tôn, Updated Ward';calls=[];await open();
  assert.equal(calls[0].method,'find');
  // Attribution markup preserves safe credit links without executing HTML.
  run(`
    const credit=document.createElement('div');credit.append(googlePhotoAttribution('<a href="javascript:alert(1)">name</a><svg onload="alert(1)"></svg><b>credit</b>'));
    assert.equal(credit.textContent,'namecredit');assert.equal(credit.querySelectorAll('a,svg,b').length,0);
    for(const url of ['javascript:alert(1)','http://example.test','https://user:pass@example.test','https://example.test:444'])assert.equal(googlePhotoSafeUrl(url),null);
  `);
  // Storage denial still permits live photos and cannot break the business UI.
  close();w.Storage.prototype.getItem=()=>{throw Error('denied')};w.Storage.prototype.setItem=()=>{throw Error('denied')};await open();
  assert.equal(w.document.querySelectorAll('.googlePhotoGrid img').length,3);
  dom.window.close();
}
(async()=>{await check(true);await check(false);console.log('PASS Google live photos: mobile/desktop visibility, correct branch, ambiguity, three-photo bound, safe credits, preserved uploads, only Place IDs persisted, no duplicate requests, late response isolation and recovery');})().catch(error=>{console.error(error);process.exitCode=1});
