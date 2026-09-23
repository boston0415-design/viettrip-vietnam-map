// Map contribution grades are calculated by the server, never by local counters.
(() => {
  'use strict';
  const GRADES=[['훈련병',0],['이등병',3],['일병',10],['상병',25],['병장',60],['대장',150]];
  const KIND={place:'업소 등록',review:'방문 후기',correction:'정보 수정'};
  const CORRECTION={address:'주소·위치',hours:'영업시간',closed:'폐업·휴업',other:'기타 정보'};
  const STATUS={pending:'확인 중',approved:'기여 인정',rejected:'인정되지 않음'};
  const badges=new Map(),credentials=new Map();
  let profile=null,profileRequest=null,badgeRequest=null,refreshTimer=null,revision=0,busy=false;
  const el=id=>document.getElementById(id);
  const validHash=h=>/^[a-f0-9]{64}$/.test(String(h||''));
  const grade=n=>GRADES[Math.max(0,Math.min(5,Number(n)||0))];
  const levelFor=total=>GRADES.reduce((level,g,i)=>Number(total)>=g[1]?i:level,0);
  function insignia(level){
    return level===5?'<span class="rankStars" aria-hidden="true">★★★★</span>':`<span class="rankBars" aria-hidden="true">${'<i></i>'.repeat(level)}</span>`;
  }
  function badgeHtml(hash){
    if(!validHash(hash))return '';
    const b=badges.get(hash);
    return `<span class="mapRank${b?' rank'+b.level:' rankPending'}" data-member-hash="${hash}" title="${b?`맵 기여 ${b.total}건 · 기여량 기준 등급`:'맵 등급 확인 중'}">${b?insignia(b.level)+grade(b.level)[0]:'등급 확인 중'}</span>`;
  }
  async function rpc(action,payload={}){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
    try{
      const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/map_membership`,{method:'POST',headers:SUPABASE_HEADERS,
        body:JSON.stringify({p_action:action,p_device_id:action==='badges'?null:getDeviceId(),p_payload:payload}),signal:controller.signal});
      const data=await response.json();
      if(!response.ok)throw new Error(data.message||'활동 정보를 불러오지 못했습니다.');
      return data;
    }finally{clearTimeout(timer)}
  }
  function message(text,error=false){const node=el('memberStatus');if(node){node.textContent=text;node.classList.toggle('isError',error)}}
  function adopt(data){
    if(!data?.id)return;
    profile=data;credentials.clear();
    for(const item of data.devices||[]){
      if(!validHash(item.hash)||typeof item.key!=='string')continue;
      credentials.set(item.hash,item.key);
      badges.set(item.hash,{hash:item.hash,member:data.id,total:data.total,level:data.level});
    }
    if(data.nickname)rememberMemberNickname(data.nickname);
    revision++;paint();
  }
  async function refresh(){
    if(profileRequest)return profileRequest;
    const version=revision;
    profileRequest=(async()=>{
      try{const data=await rpc('profile',{nickname:rememberedMemberNickname()});if(revision===version)adopt(data);return true}
      catch(error){
        if(!profile){el('memberBarRank').textContent='등급 확인';el('memberBarProgress').textContent='눌러서 다시 확인';}
        if(el('memberDialog')?.open)message(error.name==='AbortError'?'연결이 지연되고 있어요. 다시 확인해 주세요.':error.message,true);
        return false;
      }finally{profileRequest=null}
    })();return profileRequest;
  }
  function schedule(){
    clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>{refresh().then(()=>loadBadges(true))},500);
  }
  async function loadBadges(force=false,extra=[]){
    if(badgeRequest){await badgeRequest;return loadBadges(force,extra)}
    const local=typeof db==='function'?db():{places:[],reviews:[]};
    const hashes=[...new Set([...(local.places||[]).map(p=>p.ownerKeyHash),...(local.reviews||[]).map(r=>r.createdByHash),
      ...Array.from(document.querySelectorAll('[data-member-hash]'),n=>n.dataset.memberHash),...extra])].filter(h=>validHash(h)&&(force||!badges.has(h)));
    if(!hashes.length){paintBadges();return}
    const version=revision;
    badgeRequest=(async()=>{
      try{
        for(let i=0;i<hashes.length;i+=200){
          const rows=await rpc('badges',{hashes:hashes.slice(i,i+200)});
          if(revision!==version)return;
          for(const b of rows||[])if(validHash(b.hash))badges.set(b.hash,b);
        }
        paintBadges();
      }catch{
        document.querySelectorAll('.mapRank.rankPending').forEach(n=>{n.textContent='등급 확인 필요';n.title='연결 후 다시 확인할 수 있습니다.'});
      }finally{badgeRequest=null}
    })();return badgeRequest;
  }
  function paintBadges(){
    document.querySelectorAll('[data-member-hash]').forEach(node=>{
      const b=badges.get(node.dataset.memberHash);if(!b)return;
      const value=insignia(b.level)+grade(b.level)[0];
      if(node.innerHTML!==value)node.innerHTML=value;
      node.className=`mapRank rank${b.level}`;
      node.title=`맵 기여 ${b.total}건 · 기여량 기준 등급`;
    });
  }
  function paint(){
    paintRole();
    if(!profile)return;
    const [name,start]=grade(profile.level),next=GRADES[profile.level+1];
    el('memberBarRank').innerHTML=insignia(profile.level)+name;
    el('memberBarRank').className=`mapRank rank${profile.level}`;
    el('memberBarProgress').textContent=next?`${next[0]}까지 ${Math.max(0,next[1]-profile.total)}건`:`기여 ${profile.total}건`;
    el('memberHeroRank').innerHTML=insignia(profile.level)+name;
    el('memberHeroRank').className=`memberHeroRank rank${profile.level}`;
    el('memberHeroName').textContent=profile.nickname||'나의 맵 활동';
    el('memberTotal').textContent=String(profile.total);
    el('memberNext').textContent=next?`${next[0]}까지 ${Math.max(0,next[1]-profile.total)}건 남았어요`:'대장 · 함께 만들어주셔서 감사합니다';
    const progress=el('memberProgress');progress.max=next?next[1]-start:1;progress.value=next?Math.max(0,profile.total-start):1;
    progress.setAttribute('aria-label',next?`${name}에서 ${next[0]}까지 승급 진행률`:'최고 등급 달성');
    for(const kind of Object.keys(KIND))el('memberCount_'+kind).textContent=String(profile.counts?.[kind]||0);
    if(document.activeElement!==el('memberNickname'))el('memberNickname').value=profile.nickname||rememberedMemberNickname();
    el('memberRecoveryNote').textContent=profile.has_recovery?'복구 코드가 발급되어 있어요. 새로 발급하면 이전 코드는 사용할 수 없습니다.':'브라우저 기록을 지우거나 휴대폰을 바꾸기 전에 복구 코드를 보관해 주세요.';
    el('memberActivityList').innerHTML=(profile.activities||[]).map(a=>`<li><button type="button" data-member-place="${esc(a.place_id)}"><span>${esc(KIND[a.kind]||a.kind)}</span><strong>${esc(a.name)}</strong><small>${new Date(a.at).toLocaleDateString('ko-KR')}</small></button></li>`).join('')||'<li class="memberEmpty">방문한 곳의 경험을 남겨보세요.<br>업소 등록과 정보 수정도 기여로 인정됩니다.</li>';
    el('memberCorrectionList').innerHTML=(profile.corrections||[]).map(c=>`<li><strong>${esc(c.name)}</strong><span>${esc(CORRECTION[c.kind])} · ${esc(STATUS[c.status])}</span><p>${esc(c.body)}</p></li>`).join('')||'<li class="memberEmpty">아직 제출한 정보 수정 제안이 없습니다.</li>';
    el('memberGradeSteps').innerHTML=GRADES.map((g,i)=>`<li class="${i===profile.level?'current':''}" ${i===profile.level?'aria-current="step"':''}><span class="mapRank rank${i}">${insignia(i)}${g[0]}</span><span>${g[1]}건${i===profile.level?' · 현재':''}</span></li>`).join('');
    el('memberAdminTools').hidden=!state.isAdmin;
    paintRole();
    paintBadges();
  }
  function paintRole(){
    const admin=Boolean(state.isAdmin);
    if(el('openMapMembership'))el('openMapMembership').hidden=admin;
    el('memberDialog')?.classList.toggle('isAdministrator',admin);
    if(el('memberAdminTools'))el('memberAdminTools').hidden=!admin;
    if(el('memberTitle'))el('memberTitle').textContent=admin?'관리자 · 맵 운영':'내 맵 등급 · 활동';
    if(el('memberBarLabel'))el('memberBarLabel').textContent=admin?'맵 관리':'내 맵 등급';
    if(admin){
      for(const id of ['memberBarRank','memberHeroRank']){const node=el(id);if(node){node.textContent='관리자';node.className=id==='memberBarRank'?'mapRank rankAdmin':'memberHeroRank rankAdmin';}}
      if(el('memberBarProgress'))el('memberBarProgress').textContent='운영 권한';
      if(el('memberNext'))el('memberNext').textContent='관리자는 일반 회원 승급 대상이 아닙니다.';
    }else if(!profile){
      if(el('memberBarRank')){el('memberBarRank').className='mapRank rankPending';el('memberBarRank').textContent='등급 확인 중';}
      if(el('memberHeroRank')){el('memberHeroRank').className='memberHeroRank';el('memberHeroRank').textContent='등급 확인 중';}
      if(el('memberBarProgress'))el('memberBarProgress').textContent='내 활동 보기';
    }
    const linked=(profile?.devices||[]).length>1;
    if(el('memberDeviceStatus'))el('memberDeviceStatus').textContent=linked?'기기 연결됨 · 같은 회원 기록으로 등급을 확인합니다.':'PC·모바일 등급이 다르면 두 기기를 한 번 연결해 주세요.';
  }
  async function open(){
    const dialog=el('memberDialog');if(!dialog.open)dialog.showModal();
    el('memberAdminTools').hidden=!state.isAdmin;
    message('활동 정보를 확인하고 있어요.');
    if(await refresh())message('지도 이용에는 등급 제한이 없습니다. 카페 등급과는 별도로 적용됩니다.');
    loadBadges(true);
  }
  async function perform(button,task){
    if(busy)return;busy=true;if(button)button.disabled=true;
    try{await task()}catch(error){message(error.name==='AbortError'?'연결이 지연되고 있어요. 다시 시도해 주세요.':error.message,true)}
    finally{busy=false;if(button)button.disabled=false}
  }
  async function copyCode(){
    const field=el('memberCode');
    try{await navigator.clipboard.writeText(field.value);message('코드를 복사했습니다. 본인의 다른 기기에서만 사용해 주세요.')}
    catch{field.focus();field.select();message('선택된 코드를 길게 눌러 복사해 주세요.')}
  }
  async function showPlace(id){
    el('memberDialog').close();
    const place=db().places.find(p=>p.id===id);
    if(place){await window.PlaceSearch?.openMember(id);return}
    message('업소 정보를 새로 불러온 뒤 다시 열어주세요.',true);
    el('memberDialog').showModal();
  }
  async function moderation(){
    const rows=await rpc('moderation',{admin_key:adminKey()});
    el('memberModeration').innerHTML=(rows||[]).map(c=>`<article><strong>${esc(c.name)}</strong><p>${esc(c.nickname||'회원')} · ${esc(CORRECTION[c.kind])} · ${esc(STATUS[c.status])}</p><p>${esc(c.body)}</p><div><button type="button" data-member-place="${esc(c.place_id)}">업소 확인·수정</button>${c.status!=='approved'?`<button type="button" data-correction-id="${esc(c.id)}" data-correction-status="approved">정보 확인 후 인정</button>`:''}${c.status!=='rejected'?`<button type="button" data-correction-id="${esc(c.id)}" data-correction-status="rejected">${c.status==='approved'?'인정 취소':'반려'}</button>`:''}</div></article>`).join('')||'<p>접수된 정보 수정 제안이 없습니다.</p>';
  }
  function openCorrection(id){
    const place=db().places.find(p=>p.id===id);if(!place)return;
    const dialog=el('mapCorrectionDialog');el('correctionPlaceId').value=id;
    el('correctionPlaceName').textContent=place.name;el('correctionBody').value='';el('correctionStatus').textContent='';
    if(!dialog.open)dialog.showModal();
  }
  function init(){
    el('openMapMembership').addEventListener('click',open);
    el('openOperatorTools')?.addEventListener('click',open);
    el('memberDeviceLinkButton')?.addEventListener('click',()=>{const section=el('memberDeviceLink');if(section){section.open=true;section.scrollIntoView({block:'start'});section.querySelector('button')?.focus({preventScroll:true});}});
    window.addEventListener('focus',schedule);
    setInterval(()=>{if(!document.hidden&&el('memberDialog')?.open)schedule();},30000);
    el('memberClose').onclick=()=>el('memberDialog').close();
    el('memberRefresh').onclick=()=>open();
    el('memberNicknameForm').onsubmit=event=>{
      event.preventDefault();perform(el('memberNicknameSave'),async()=>{adopt(await rpc('nickname',{nickname:el('memberNickname').value}));message('맵 활동 닉네임을 저장했습니다. 기존 후기의 작성자 이름은 유지됩니다.')});
    };
    document.querySelectorAll('[data-member-code]').forEach(button=>button.onclick=()=>perform(button,async()=>{
      const data=await rpc('code',{kind:button.dataset.memberCode});
      el('memberCode').value=data.code;el('memberCodeBox').hidden=false;
      el('memberCodeHelp').textContent=data.kind==='link'?'10분 동안 한 번 사용할 수 있습니다. 연결할 기기에서 이 코드를 입력하세요.':'이 복구 코드를 안전한 곳에 보관하세요. 누구든 이 코드로 활동 기록에 접근할 수 있습니다. 다시 표시되지 않습니다.';
      message('코드를 발급했습니다. 카페 글이나 댓글에 공개하지 마세요.');await refresh();
    }));
    el('memberCopyCode').onclick=copyCode;
    el('memberConnectForm').onsubmit=event=>{
      event.preventDefault();perform(el('memberConnect'),async()=>{
        if(!el('memberMerge').checked)throw new Error('현재 활동을 합치는 항목을 체크해 주세요.');
        adopt(await rpc('connect',{code:el('memberConnectCode').value,merge:true}));
        el('memberConnectCode').value='';el('memberMerge').checked=false;
        el('memberCode').value='';el('memberCodeBox').hidden=true;
        await loadBadges(true);if(state.selected)renderDetail();
        message('연결했습니다. 두 기기의 활동이 같은 등급에 반영됩니다.');
      });
    };
    el('memberDialog').addEventListener('close',()=>{el('memberCode').value='';el('memberCodeBox').hidden=true;el('memberConnectCode').value=''});
    el('memberModerationLoad').onclick=event=>perform(event.currentTarget,moderation);
    document.addEventListener('click',event=>{
      const place=event.target.closest('[data-member-place]');if(place){showPlace(place.dataset.memberPlace);return}
      const correction=event.target.closest('[data-map-correction]');if(correction){openCorrection(correction.dataset.mapCorrection);return}
      const mod=event.target.closest('[data-correction-id]');if(mod)perform(mod,async()=>{
        await rpc('moderate',{admin_key:adminKey(),id:mod.dataset.correctionId,status:mod.dataset.correctionStatus});
        await moderation();await refresh();await loadBadges(true);message('제안 처리와 기여 집계를 반영했습니다.');
      });
      const exclusion=event.target.closest('[data-grade-exclude]');if(exclusion&&state.isAdmin){
        if(!confirm('이 기록의 기여 인정을 취소할까요? 업소·후기 내용은 유지됩니다.'))return;
        perform(exclusion,async()=>{await rpc('exclude',{admin_key:adminKey(),kind:exclusion.dataset.gradeExclude,id:exclusion.dataset.sourceId,excluded:true});await refresh();await loadBadges(true);exclusion.textContent='기여 제외 완료'});
      }
    });
    el('correctionClose').onclick=()=>el('mapCorrectionDialog').close();
    el('mapCorrectionForm').onsubmit=async event=>{
      event.preventDefault();const button=el('correctionSave');if(button.disabled)return;button.disabled=true;
      try{adopt(await rpc('correct',{place_id:el('correctionPlaceId').value,kind:el('correctionKind').value,body:el('correctionBody').value,nickname:rememberedMemberNickname()}));el('correctionStatus').textContent='접수했습니다. 관리자가 확인하면 기여에 반영됩니다.';el('correctionBody').value='';}
      catch(error){el('correctionStatus').textContent=error.name==='AbortError'?'연결이 지연됩니다. 다시 시도해 주세요.':error.message}
      finally{button.disabled=false}
    };
    document.addEventListener('map-data-saved',schedule);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});
    window.addEventListener('online',schedule);
    window.addEventListener('storage',event=>{if(event.key==='viettrip_member_nickname_v1')schedule()});
    const observer=new MutationObserver(()=>{paintBadges()});
    for(const id of ['detail','communityReviewFeed'])if(el(id))observer.observe(el(id),{childList:true,subtree:true});
    refresh().then(()=>loadBadges());
  }
  window.MapMembership={GRADES,levelFor,badgeHtml,loadBadges,refresh,schedule,open,syncRole:paint,
    ownsHash:hash=>credentials.has(hash),credentialFor:hash=>credentials.get(hash)||null,
    memberFor:hash=>badges.get(hash)?.member||hash,
    correctionButton:id=>`<button type="button" class="mapCorrectionButton" data-map-correction="${esc(id)}">정보 수정 제안</button>`,
    moderationButton:(kind,id)=>state.isAdmin?`<button type="button" class="gradeModerationButton" data-grade-exclude="${kind}" data-source-id="${esc(id)}">기여 인정 취소</button>`:''};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
