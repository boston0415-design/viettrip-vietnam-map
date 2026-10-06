// Destination handoff verified on the owner's Vietnam Grab app. Final booking stays in Grab.
document.addEventListener('DOMContentLoaded',()=>{
  const dialog=document.createElement('dialog');
  dialog.className='travellerDialog';dialog.id='grabDestinationDialog';
  dialog.setAttribute('aria-labelledby','grabDestinationTitle');
  dialog.innerHTML=`<div class="travellerDialogHead"><div><h2 id="grabDestinationTitle">그랩</h2></div><button type="button" aria-label="그랩 안내 닫기">×</button></div><div class="grabDestination"><strong id="grabPlaceName"></strong><label for="grabPlaceAddress">목적지 주소</label><input id="grabPlaceAddress" type="text" maxlength="500" aria-label="그랩 목적지 주소" placeholder="주소 입력"></div><div class="grabActions"><a id="openGrabApp" class="btn grabButton" href="grab://open?screenType=BOOKING">그랩 열기</a><button type="button" id="copyGrabAddress" class="btn">주소 복사</button></div><p id="grabCopyStatus" role="status"></p><p class="grabHelp">목적지·승차 위치·요금 확인 후 호출하세요.</p><details class="grabHelp"><summary>도움말</summary><p>앱이 안 열리면 Chrome·Safari에서 다시 시도하세요. 목적지가 비어 있으면 주소를 복사해 붙여넣으세요.</p><a href="https://www.grab.com/vn/download/" target="_blank" rel="noopener noreferrer">그랩 설치</a></details>`;
  document.body.append(dialog);
  dialog.querySelector('.travellerDialogHead button').onclick=()=>dialog.close();
  let destination='';
  document.getElementById('copyGrabAddress').onclick=async()=>{
    const ok=await copyTextToClipboard(destination);
    document.getElementById('grabCopyStatus').textContent=ok?'복사 완료 · 그랩에 붙여넣으세요.':'주소를 길게 눌러 복사하세요.';
  };
  function showDestination(place){
    destination=place.address||place.name;
    const params=new URLSearchParams({screenType:'BOOKING'});
    const lat=Number(place.lat),lng=Number(place.lng);
    const valid=place.lat!=null&&place.lng!=null&&String(place.lat).trim()!==''&&String(place.lng).trim()!==''&&Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180;
    if(valid){params.set('dropOffLatitude',String(lat));params.set('dropOffLongitude',String(lng));}
    params.set('dropOffAddress',destination);params.set('dropOffKeywords',place.name||destination);
    const link=new URL('https://grab.onelink.me/2695613898');
    link.search=new URLSearchParams({pid:'organic_web',af_force_deeplink:'true',af_dp:'grab://open?'+params.toString().replace(/\+/g,'%20')}).toString();
    document.getElementById('openGrabApp').href=link.href;
    document.getElementById('openGrabApp').textContent='그랩 열기';
    document.getElementById('grabPlaceName').textContent=place.name;
    document.getElementById('grabPlaceAddress').value=destination;
    document.getElementById('grabCopyStatus').textContent='';
    if(!dialog.open)dialog.showModal();
  }
  document.getElementById('grabPlaceAddress').addEventListener('input',event=>{
    const address=event.target.value.trim();destination=address;
    if(address){const value=event.target.value,start=event.target.selectionStart;showDestination({name:address,address});event.target.value=value;event.target.setSelectionRange(start,start);}
    else document.getElementById('openGrabApp').removeAttribute('href');
  });
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-grab-place],[data-grab-address]');if(!button)return;
    const place=button.hasAttribute('data-grab-place')?db().places.find(p=>p.id===button.dataset.grabPlace):{name:button.dataset.grabName,address:button.dataset.grabAddress,lat:button.dataset.grabLat,lng:button.dataset.grabLng};
    if(place)showDestination(place);
  });
});
