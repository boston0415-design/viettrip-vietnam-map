// Install guidance only. Existing startup/visibility handlers load shared map data.
(() => {
  let installPrompt=null,installed=false,installing=false;
  const standalone=()=>window.matchMedia?.('(display-mode: standalone)').matches || window.matchMedia?.('(display-mode: fullscreen)').matches || navigator.standalone===true;
  const byId=id=>document.getElementById(id);
  function status(message){const node=byId('homeScreenStatus');if(node){node.textContent=message;node.hidden=!message}}
  function sync(){
    const bar=byId('homeScreenBar'),button=byId('homeScreenInstall');
    if(bar)bar.hidden=installed||standalone();
    if(button){button.hidden=!installPrompt||installed||standalone();button.disabled=installing}
  }
  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();installPrompt=event;sync();
  });
  window.addEventListener('appinstalled',()=>{
    installed=true;installPrompt=null;status('홈 화면에 추가되었습니다. 베트남맵 아이콘을 눌러 열어보세요.');sync();
  });
  function init(){
    const barButton=byId('openHomeScreen'),dialog=byId('homeScreenDialog');
    if(!barButton||!dialog)return;
    const ua=navigator.userAgent||'';
    const ios=/iPad|iPhone|iPod/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1);
    const android=/Android/i.test(ua);
    const inApp=/KAKAOTALK|NAVER|DaumApps|Instagram|FBAN|FBAV|; wv\)/i.test(ua);
    const platform=ios?'ios':android?'android':'desktop';
    function choosePlatform(value){
      dialog.querySelectorAll('[data-home-platform]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.homePlatform===value)));
      dialog.querySelectorAll('[data-home-instructions]').forEach(section=>section.hidden=section.dataset.homeInstructions!==value);
    }
    dialog.querySelectorAll('[data-home-platform]').forEach(button=>button.addEventListener('click',()=>choosePlatform(button.dataset.homePlatform)));
    choosePlatform(platform);
    byId('homeScreenInApp').hidden=!inApp;
    byId('homeScreenLink').value=new URL('/',location.href).href;
    barButton.addEventListener('click',()=>{
      sync();if(dialog.open)return;
      if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
    });
    byId('closeHomeScreen').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('close',()=>{if(!byId('homeScreenBar').hidden)barButton.focus({preventScroll:true})});
    byId('homeScreenInstall').addEventListener('click',async()=>{
      if(!installPrompt||installing)return;
      const event=installPrompt;installPrompt=null;installing=true;
      // Browser installation must originate from this user gesture.
      try{
        const result=event.prompt();sync();await result;
        const choice=await event.userChoice;
        if(!installed)status(choice?.outcome==='accepted'?'추가 요청을 보냈습니다. 홈 화면에서 베트남맵 아이콘을 확인하세요.':'추가를 취소했습니다. 아래 방법으로 나중에 다시 추가할 수 있어요.');
      }catch{status('설치창을 열지 못했습니다. 아래 브라우저 메뉴 안내로 홈 화면에 추가해 주세요.')}
      finally{installing=false;sync()}
    });
    byId('copyHomeScreenLink').addEventListener('click',async()=>{
      const input=byId('homeScreenLink');
      try{
        if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');
        await navigator.clipboard.writeText(input.value);status('지도 주소를 복사했습니다. Chrome 또는 Safari 주소창에 붙여넣으세요.');
      }catch{
        input.focus();input.select();input.setSelectionRange(0,input.value.length);
        status('주소를 길게 눌러 복사한 뒤 Chrome 또는 Safari에서 열어주세요.');
      }
    });
    window.matchMedia?.('(display-mode: standalone)').addEventListener?.('change',sync);
    window.addEventListener('pageshow',sync);
    sync();
    if('serviceWorker' in navigator && window.isSecureContext){
      navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).catch(error=>console.warn('Home screen support unavailable',error));
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
