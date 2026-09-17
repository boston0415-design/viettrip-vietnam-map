// Grab's public download link is used without undocumented destination parameters.
// Copy the destination explicitly; never submit a ride or claim a booking succeeded.
document.addEventListener('DOMContentLoaded',()=>{
  const dialog=document.createElement('dialog');
  dialog.className='travellerDialog';dialog.id='grabDestinationDialog';
  dialog.setAttribute('aria-labelledby','grabDestinationTitle');
  dialog.innerHTML=`<div class="travellerDialogHead"><div><h2 id="grabDestinationTitle">그랩으로 이동</h2><p>목적지를 복사한 뒤 그랩에 붙여넣어 주세요</p></div><button type="button" aria-label="그랩 안내 닫기">×</button></div><div class="grabDestination"><strong id="grabPlaceName"></strong><span id="grabPlaceAddress"></span></div><div class="grabActions"><button type="button" id="copyGrabAddress" class="btn primary">목적지 주소 복사</button><a class="btn grabButton" href="https://www.grab.com/vn/download/" target="_blank" rel="noopener noreferrer">그랩 열기·설치</a></div><p id="grabCopyStatus" role="status"></p><p class="grabHelp">그랩의 목적지 검색창에 주소를 붙여넣고 업체명과 지도 위치를 확인하세요. 출발지·차종·요금을 확인한 후 그랩에서 직접 호출합니다. 현재 목적지 자동 입력은 지원하지 않습니다.</p>`;
  document.body.append(dialog);
  dialog.querySelector('.travellerDialogHead button').onclick=()=>dialog.close();
  let destination='';
  document.getElementById('copyGrabAddress').onclick=async()=>{
    const ok=await copyTextToClipboard(destination);
    document.getElementById('grabCopyStatus').textContent=ok?'복사했습니다. 그랩 목적지 검색창에 붙여넣어 주세요.':'자동 복사가 안 되면 위 주소를 길게 눌러 복사해주세요.';
  };
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-grab-place]');if(!button)return;
    const place=db().places.find(p=>p.id===button.dataset.grabPlace);if(!place)return;
    destination=place.address||place.name;
    document.getElementById('grabPlaceName').textContent=place.name;
    document.getElementById('grabPlaceAddress').textContent=destination;
    document.getElementById('grabCopyStatus').textContent='';
    dialog.showModal();
  });
});
