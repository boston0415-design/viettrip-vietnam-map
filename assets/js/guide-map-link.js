/* Travel-guide links reuse the map's existing filters. No database writes or new API service. */
(()=>{
  'use strict';
  function syncGuideLinks(){
    const city=typeof state!=='undefined'&&CITY_DATA[state.city]?state.city:'hcmc';
    const url=new URL('/guide/',location.origin);url.searchParams.set('city',city);
    document.getElementById('mapGuideLink')?.setAttribute('href',url.pathname+url.search);
  }
  document.addEventListener('DOMContentLoaded',()=>{
    syncGuideLinks();
    document.addEventListener('click',e=>{if(e.target.closest('[data-city],[data-nav-cat],[data-cat],[data-benefit-filter]'))queueMicrotask(syncGuideLinks)});
    const params=new URL(location.href).searchParams;if(params.get('from')!=='guide')return;
    const city=Object.hasOwn(CITY_DATA,params.get('city'))?params.get('city'):'hcmc';
    const category=NAV_CATEGORIES.find(c=>c.id===params.get('category'))?.id;
    const group=['all','airport','grab','green','bus','taxi','terminal'].includes(params.get('group'))?params.get('group'):null;
    const panel=['transport','reviews'].includes(params.get('panel'))?params.get('panel'):null;
    const benefit=params.get('benefit')==='1';
    const box=document.createElement('div');box.id='guideMapNotice';box.className='guideMapNotice';box.setAttribute('role','status');
    const message=document.createElement('span'),retry=document.createElement('button'),close=document.createElement('button');
    retry.type='button';retry.textContent='다시 연결';retry.hidden=true;close.type='button';close.textContent='×';close.setAttribute('aria-label','가이드 연결 안내 닫기');box.append(message,retry,close);document.querySelector('.mapwrap')?.append(box);
    let canceled=false,busy=false,done=false;
    const cancel=()=>{if(!done){canceled=true;message.textContent='지도 조작을 시작해 자동 이동을 멈췄어요.';retry.hidden=false}};
    document.querySelector('.content')?.addEventListener('pointerdown',event=>{if(!event.target.closest('#guideMapNotice'))cancel()},{passive:true});
    document.querySelector('.top')?.addEventListener('pointerdown',cancel,{passive:true});
    document.querySelector('.top')?.addEventListener('input',cancel);
    document.querySelector('.content')?.addEventListener('keydown',event=>{if(event.key!=='Tab'&&!event.target.closest('#guideMapNotice'))cancel()});
    close.addEventListener('click',()=>{canceled=true;box.hidden=true});
    async function connect(){
      if(busy)return;busy=true;canceled=false;box.hidden=false;retry.hidden=true;retry.disabled=true;message.textContent='가이드에서 선택한 지도 정보를 불러오는 중…';
      try{
        // Join the existing load; do not start another data refresh or upload.
        const pending=typeof sharedBootstrapPromise!=='undefined'?sharedBootstrapPromise:null;
        const result=await Promise.allSettled([loadGoogle(),pending||Promise.resolve()]);
        if(canceled)return;
        if(result[0].status==='rejected'||!state.map)throw new Error('map');
        window.PersonalPlaces?.setView('all');switchCity(city);
        if(category)document.querySelector(`[data-nav-cat="${category}"]`)?.click();
        if(category==='airport'&&group)document.querySelector(`[data-point-group="${group}"]`)?.click();
        if(benefit)document.querySelector('[data-benefit-filter="benefit"]')?.click();
        setMobileLegendExpanded(false);syncGuideLinks();
        if(panel==='transport')document.getElementById('openTransportGuide')?.click();
        if(panel==='reviews')document.getElementById('openCommunityReviews')?.click();
        done=true;
        const label=NAV_CATEGORIES.find(c=>c.id===category)?.label;
        message.textContent=[CITY_DATA[city].label,label,benefit?'할인·혜택업소':null].filter(Boolean).join(' · ')+' 지도를 열었어요.';
        if(result[1].status==='rejected')message.textContent+=' 업체 정보를 갱신하지 못했어요. 연결 후 새로고침해주세요.';
        else setTimeout(()=>{box.hidden=true},4500);
      }catch{if(!canceled){message.textContent='지도를 연결하지 못했어요. 인터넷 연결을 확인하고 다시 눌러주세요.';retry.hidden=false}}
      finally{busy=false;retry.disabled=false}
    }
    retry.addEventListener('click',connect);connect();
  });
})();
