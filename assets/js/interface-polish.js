// Destination handoff verified on the owner's Vietnam Grab app. Final booking stays in Grab.
document.addEventListener('DOMContentLoaded',()=>{
  const dialog=document.createElement('dialog');
  dialog.className='travellerDialog';dialog.id='grabDestinationDialog';
  dialog.setAttribute('aria-labelledby','grabDestinationTitle');
  dialog.innerHTML=`<div class="travellerDialogHead"><div><h2 id="grabDestinationTitle">그랩으로 이동</h2><p>선택한 업소를 그랩 목적지로 전달합니다</p></div><button type="button" aria-label="그랩 안내 닫기">×</button></div><div class="grabDestination"><strong id="grabPlaceName"></strong><label for="grabPlaceAddress">목적지 주소</label><input id="grabPlaceAddress" type="text" maxlength="500" aria-label="그랩 목적지 주소" placeholder="목적지 주소를 입력하세요"></div><div class="grabActions"><a id="openGrabApp" class="btn grabButton" href="grab://open?screenType=BOOKING">목적지 넣고 그랩 열기</a><button type="button" id="copyGrabAddress" class="btn">주소 복사</button></div><p id="grabCopyStatus" role="status"></p><p class="grabHelp">그랩에서 목적지와 승차 위치·차종·요금을 확인한 후 호출하세요. 목적지가 입력되지 않으면 주소 복사를 이용하세요.</p><details class="grabHelp"><summary>앱이 열리지 않나요?</summary><p>카카오톡·카페 안에서 보고 있다면 메뉴에서 Chrome 또는 Safari로 열어 다시 눌러주세요.</p><a href="https://www.grab.com/vn/download/" target="_blank" rel="noopener noreferrer">그랩 공식 설치 안내</a></details>`;
  document.body.append(dialog);
  dialog.querySelector('.travellerDialogHead button').onclick=()=>dialog.close();
  let destination='';
  document.getElementById('copyGrabAddress').onclick=async()=>{
    const ok=await copyTextToClipboard(destination);
    document.getElementById('grabCopyStatus').textContent=ok?'복사했습니다. 그랩 목적지 검색창에 붙여넣어 주세요.':'자동 복사가 안 되면 위 주소를 길게 눌러 복사해주세요.';
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
    document.getElementById('openGrabApp').textContent=valid?'목적지 넣고 그랩 열기':'그랩 예약 화면 열기';
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
