// Cafe posts share a registered business ID, never the sender's filters or location.
(() => {
  'use strict';
  const publicOrigin='https://viettrip-vietnam-map.pages.dev';
  const validId=id=>typeof id==='string' && /^[a-zA-Z0-9_-]{1,160}$/.test(id);
  let openedId=null;

  function url(place){
    if(!validId(place?.id))return '';
    const link=new URL('/',publicOrigin);
    link.searchParams.set('place',place.id);
    return link.href;
  }
  function text(place){
    const link=url(place);
    return link?[place.name,place.address,'베트남맵에서 위치·후기 보기',link].filter(Boolean).join('\n'):'';
  }
  function html(place){
    if(!url(place))return '';
    return `<section class="businessShare" aria-label="업소 위치 공유"><div class="businessShareActions">${copyButtonHtml('카페에 공유',text(place))}${copyButtonHtml('위치 링크 복사',url(place))}</div><p>카페에 공유를 누르면 업소명·주소·지도 링크가 복사됩니다. 카페 글에 붙여넣어 주세요.</p></section>`;
  }
  const isSharedSelection=place=>Boolean(openedId && place?.id===openedId && state.selected===openedId);
  function includeSelectedPlace(visible){
    // Explicitly opened links show their pin without changing a saved hidden preference.
    const place=db().places.find(isSharedSelection);
    return place && !visible.some(p=>p.id===place.id)?[...visible,place]:visible;
  }

  function init(){
    const params=new URL(location.href).searchParams;
    if(!params.has('place'))return;
    const id=params.get('place');
    const box=document.createElement('div');
    box.id='businessShareNotice';box.className='businessShareNotice';
    const message=document.createElement('span'),retry=document.createElement('button'),close=document.createElement('button');
    message.setAttribute('role','status');
    retry.type='button';retry.textContent='다시 열기';retry.hidden=true;
    close.type='button';close.textContent='×';close.setAttribute('aria-label','공유 위치 안내 닫기');
    box.append(message,retry,close);document.querySelector('.mapwrap')?.append(box);
    let canceled=false,busy=false,done=false,timer=null;
    function cancel(event){
      if(done || event.target.closest('#businessShareNotice') || event.type==='keydown'&&event.key==='Tab')return;
      canceled=true;
      message.textContent='공유된 위치로 이동을 멈췄습니다. 다시 열기를 누르면 해당 업소로 이동합니다.';
      retry.hidden=false;
    }
    document.querySelectorAll('.content,.top').forEach(node=>{
      node.addEventListener('pointerdown',cancel,{passive:true});
      node.addEventListener('keydown',cancel);
      node.addEventListener('input',cancel);
    });
    close.addEventListener('click',()=>{canceled=true;box.hidden=true;clearTimeout(timer)});
    if(!validId(id)){
      done=true;message.textContent='올바른 업소 위치 링크가 아닙니다. 업소 상세창에서 링크를 다시 복사해 주세요.';
      return;
    }
    async function connect(refresh=false){
      if(busy)return;
      busy=true;canceled=false;done=false;box.hidden=false;retry.hidden=true;retry.disabled=true;clearTimeout(timer);
      message.textContent='공유된 업소 위치를 불러오는 중…';
      try{
        const pending=sharedBootstrapPromise || (refresh || state.sharedDbLoading?bootstrapSharedDb():Promise.resolve());
        const results=await Promise.allSettled([loadGoogle(),pending]);
        // Map initialization may start another DB load after the first one completed.
        const latest=sharedBootstrapPromise;
        let dbFailed=results[1].status==='rejected';
        if(latest && latest!==pending){
          try{await latest;dbFailed=false}catch{dbFailed=true}
        }
        if(canceled)return;
        const place=db().places.find(p=>p.id===id);
        if(!place){
          message.textContent=dbFailed?'업소 정보를 불러오지 못했습니다. 연결을 확인하고 다시 열어주세요.':'공유된 업소를 찾을 수 없습니다. 삭제되었거나 아직 등록이 완료되지 않았을 수 있습니다.';
          retry.hidden=false;return;
        }
        window.PersonalPlaces?.setView('all');
        openedId=id;
        switchCity(placeCityKey(place)||'all');
        const hasMap=results[0].status==='fulfilled' && Boolean(state.map);
        const hasPosition=Boolean(validMapLocation(place));
        cancelPendingMapWork();
        await selectPlace(id,false,false);
        if(canceled)return;
        if(hasMap && hasPosition){
          state.map.setZoom(17);
          state.map.setCenter(validMapLocation(place));
          positionSelectedPlaceInView();
        }
        done=true;
        if(!hasMap){message.textContent='업소 정보는 열었습니다. 지도를 연결하지 못해 위치는 다시 열기를 눌러 확인해 주세요.';retry.hidden=false}
        else if(!hasPosition){message.textContent='업소 정보는 열었지만 등록된 위치 좌표가 없습니다.'}
        else{
          message.textContent=`${place.name} 위치를 열었습니다.`;
          timer=setTimeout(()=>{box.hidden=true},4500);
        }
      }catch{
        if(!canceled){message.textContent='공유된 위치를 열지 못했습니다. 연결을 확인하고 다시 열어주세요.';retry.hidden=false}
      }finally{busy=false;retry.disabled=false}
    }
    retry.addEventListener('click',()=>connect(true));
    connect();
  }
  window.BusinessShare={url,text,html,isSharedSelection,includeSelectedPlace};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
