(()=>{
 'use strict';
 const button=document.getElementById('shareMapApp');if(!button)return;
 const url='https://viettrip-vietnam-map.pages.dev/';
 const dialog=document.createElement('dialog');dialog.className='appShareDialog';dialog.setAttribute('aria-label','베트남맵 공유');
 dialog.innerHTML='<h3>베트남맵 공유</h3><p>친구에게 링크를 보내 함께 이용하세요.</p><input aria-label="공유할 지도 주소" readonly><div><button type="button" data-copy>링크 복사</button><button type="button" data-close>닫기</button></div><p role="status" aria-live="polite"></p>';
 document.body.append(dialog);const input=dialog.querySelector('input'),status=dialog.querySelector('[role=status]');input.value=url;
 dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.addEventListener('close',()=>button.focus({preventScroll:true}));
 dialog.querySelector('[data-copy]').onclick=async()=>{try{await navigator.clipboard.writeText(url);status.textContent='링크를 복사했어요. 원하는 대화방에 붙여넣으세요.';}catch{input.focus();input.select();status.textContent='주소를 길게 누르거나 Ctrl+C로 복사해 주세요.';}};
 button.onclick=async()=>{if(navigator.share){try{await navigator.share({title:'일상탈출 베트남맵',text:'베트남 맛집·숙소·회원 후기와 공항 그랩 승차장까지, 지도에서 확인하세요.',url});return;}catch(error){if(error.name==='AbortError')return;}}status.textContent='';if(!dialog.open)dialog.showModal();};
})();
