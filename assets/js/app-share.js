(()=>{
 'use strict';
 const button=document.getElementById('shareMapApp');if(!button)return;
 const url='https://viettrip-vietnam-map.pages.dev/';
 const dialog=document.createElement('dialog');dialog.className='appShareDialog';dialog.setAttribute('aria-label','베트남맵 공유');
 dialog.innerHTML='<h3>베트남맵 공유</h3><p>친구에게 지도를 공유하세요.</p><input aria-label="공유할 지도 주소" readonly><div><button type="button" data-copy>링크 복사</button><button type="button" data-close>닫기</button></div><p role="status" aria-live="polite"></p>';
 document.body.append(dialog);const input=dialog.querySelector('input'),status=dialog.querySelector('[role=status]');input.value=url;
 dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.addEventListener('close',()=>button.focus({preventScroll:true}));
 dialog.querySelector('[data-copy]').onclick=async()=>{try{await navigator.clipboard.writeText(url);status.textContent='복사 완료 · 대화방에 붙여넣으세요.';}catch{input.focus();input.select();status.textContent='주소를 길게 누르거나 Ctrl+C로 복사해 주세요.';}};
 const kakao=document.createElement('button');kakao.type='button';kakao.className='kakaoShareButton';kakao.textContent='카카오톡으로 공유';kakao.disabled=!window.MapSharing?.kakaoReady;dialog.querySelector('div').prepend(kakao);
 document.addEventListener('map-sharing-ready',()=>{kakao.disabled=false});
 kakao.onclick=async()=>{if(!await window.MapSharing.share(null,{kakao:true}))status.textContent='카카오톡을 열지 못했어요. 링크 복사를 이용해 주세요.';};
 const other=document.createElement('button');other.type='button';other.textContent='휴대폰 공유 메뉴';other.hidden=!(navigator.share&&/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));dialog.querySelector('div').prepend(other);other.onclick=async()=>{if(!await window.MapSharing.share())status.textContent='공유창을 열지 못했어요. 링크 복사를 이용해 주세요.';};
 button.onclick=()=>{status.textContent=window.MapSharing?.kakaoReady?'':'카카오톡 직접 공유 연결이 준비되지 않았습니다. 링크를 복사해 대화방에 붙여넣어 주세요.';if(!dialog.open)dialog.showModal();};
})();
