// Supabase Auth owns password/session handling; the database checks account ownership.
(() => {
 'use strict';
 const el=id=>document.getElementById(id);
 let client=null,user=null,deviceKey=null,epoch=0,mode='login',busy=false,items=[],deletedId=null,reviewRequest=0,returnToAccount=false,binding=null;
 let resolveReady;const ready=new Promise(resolve=>{resolveReady=resolve});
 const signedIn=()=>Boolean(user&&deviceKey);
 const safeError=error=>{
  const code=error?.code||'';
  if(code==='invalid_credentials')return '이메일 또는 비밀번호를 확인해 주세요.';
  if(code==='email_not_confirmed')return '가입 메일의 인증 링크를 누른 후 로그인해 주세요.';
  if(/rate_limit|over_.*limit/.test(code))return '요청이 많아 잠시 기다린 후 다시 시도해 주세요.';
  if(code==='email_address_not_authorized')return '현재 가입 인증 메일을 보낼 수 없습니다. 운영자가 메일 발송 설정을 확인해야 합니다.';
  if(/weak_password|same_password/.test(code))return '다른 비밀번호를 사용해 주세요. 영문·숫자를 포함해 10자 이상 권장합니다.';
  return '요청을 완료하지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요.';
 };
 function status(id,text,error=false){const n=el(id);if(n){n.textContent=text;n.classList.toggle('isError',error)}}
 async function tokenHeaders(){
  if(!client)return {...SUPABASE_HEADERS};
  const {data,error}=await client.auth.getSession();
  if(error)throw error;
  if(user&&data.session?.user?.id!==user.id)throw Error('Account changed');
  return {...SUPABASE_HEADERS,...(data.session?.access_token?{Authorization:`Bearer ${data.session.access_token}`}:{})};
 }
 async function accountRpc(action,payload={},headers){
  const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/map_account`,{method:'POST',headers:headers||await tokenHeaders(),body:JSON.stringify({p_action:action,p_payload:payload}),signal:AbortSignal.timeout(12000)});
  const data=await response.json();
  if(!response.ok){const error=Error(data.message||'회원 기록을 확인하지 못했습니다.');error.code=data.code;throw error}
  return data;
 }
 function paint(){
  const logged=signedIn();
  if(el('memberLoginBtn'))el('memberLoginBtn').textContent=logged?'마이페이지':'회원 로그인';
  if(el('memberAccountInfo'))el('memberAccountInfo').hidden=!logged;
  if(el('memberAccountEmail'))el('memberAccountEmail').textContent=logged?user.email||'':'';
  if(el('memberReviewsSection'))el('memberReviewsSection').hidden=!logged;
  if(el('memberClaimSection'))el('memberClaimSection').hidden=!logged;
  if(el('memberDeviceLink'))el('memberDeviceLink').hidden=logged;
  const notice=document.querySelector('.memberDeviceNotice');if(notice)notice.hidden=logged;
  if(!state.isAdmin){
   if(el('memberTitle'))el('memberTitle').textContent=logged?'마이페이지':'이 기기의 활동';
   if(el('memberBarLabel'))el('memberBarLabel').textContent=logged?'마이페이지':'회원 로그인';
  }
 }
 function clearPrivateUi(){
  reviewRequest++;items=[];deletedId=null;returnToAccount=false;
  el('memberOwnReviews')?.replaceChildren();
  if(el('memberReviewsCount'))el('memberReviewsCount').textContent='';
  if(el('memberReviewUndo'))el('memberReviewUndo').hidden=true;
  el('memberDialog')?.close();
  if(el('reviewModal')?.classList.contains('open')){el('reviewModal').classList.remove('open');resetReviewDraftUi();}
  for(const id of ['memberAuthPassword','memberAuthConfirm'])if(el(id))el(id).value='';
 }
 function bindSession(session,event){
  const id=session?.user?.id||null;
  if(binding&&binding.id===id)return binding.promise;
  if(id===user?.id&&deviceKey){if(event==='PASSWORD_RECOVERY')open('update');return Promise.resolve();}
  const task={id,promise:null};binding=task;
  task.promise=applySession(session,event,++epoch).finally(()=>{if(binding===task)binding=null});
  return task.promise;
 }
 async function applySession(session,event,version){
  if(session?.user?.id===user?.id&&deviceKey){if(event==='PASSWORD_RECOVERY')open('update');return}
  user=null;deviceKey=null;clearPrivateUi();window.MapMembership?.resetIdentity();paint();
  if(!session){resolveReady();await initDeviceHash();window.MapMembership?.schedule();return}
  try{
   const checked=await client.auth.getUser();if(checked.error)throw checked.error;
   const actual=checked.data.user;if(!actual||actual.id!==session.user.id)throw Error('Account changed');
   const profile=await accountRpc('profile',{nickname:typeof actual.user_metadata?.nickname==='string'?actual.user_metadata.nickname:''},{...SUPABASE_HEADERS,Authorization:`Bearer ${session.access_token}`});
   if(version!==epoch)return;
   user={id:actual.id,email:actual.email||''};deviceKey=profile.account_device_key;
   window.MapMembership?.acceptAccountProfile(profile);paint();await initDeviceHash();
   if(event==='PASSWORD_RECOVERY')open('update');
  }catch(error){if(version===epoch){status('memberAuthStatus','회원 정보를 불러오지 못했습니다. 다시 로그인해 주세요.',true);paint();}}
  finally{resolveReady()}
 }
 function setMode(next){
  mode=next;
  const signup=mode==='signup',reset=mode==='reset',update=mode==='update';
  const title=signup?'회원가입':reset?'비밀번호 재설정':update?'새 비밀번호 설정':'회원 로그인';
  el('memberAuthTitle').textContent=title;el('memberAuthSubmit').textContent=signup?'가입 인증 메일 받기':reset?'재설정 메일 받기':update?'비밀번호 저장':'로그인';
  el('memberAuthIntro').textContent=signup?'이메일 인증 후 내 활동을 안전하게 관리할 수 있어요.':reset?'가입한 이메일로 비밀번호 재설정 링크를 보내드립니다.':'내 활동과 후기를 PC·휴대폰에서 함께 관리하세요.';
  el('memberAuthNicknameField').hidden=!signup;el('memberAuthNickname').required=signup;
  el('memberAuthEmailField').hidden=update;el('memberAuthEmailInput').required=!update;
  el('memberAuthPasswordField').hidden=reset;el('memberAuthPassword').required=!reset;
  el('memberAuthPassword').autocomplete=signup||update?'new-password':'current-password';
  el('memberAuthPassword').minLength=signup||update?10:1;
  el('memberAuthConfirmField').hidden=!(signup||update);el('memberAuthConfirm').required=signup||update;
  el('memberAuthForgot').hidden=reset||update;
  document.querySelectorAll('[data-member-auth-mode]').forEach(n=>n.setAttribute('aria-pressed',String(n.dataset.memberAuthMode===mode)));
  el('memberAuthPassword').value='';el('memberAuthConfirm').value='';status('memberAuthStatus','');
 }
 function open(next='login'){
  if(signedIn()&&next==='login')return window.MapMembership?.open();
  setMode(next);const dialog=el('memberAuthDialog');if(!dialog.open)dialog.showModal();
 }
 async function submit(event){
  event.preventDefault();if(busy)return;
  if(!client){status('memberAuthStatus','로그인 연결을 준비하지 못했습니다. 새로고침해 주세요.',true);return}
  const email=el('memberAuthEmailInput').value.trim(),password=el('memberAuthPassword').value;
  if((mode==='signup'||mode==='update')&&password!==el('memberAuthConfirm').value){status('memberAuthStatus','비밀번호 확인이 일치하지 않습니다.',true);return}
  busy=true;el('memberAuthSubmit').disabled=true;status('memberAuthStatus','처리 중입니다…');
  const submittedMode=mode,redirectTo=new URL('./',location.href).href.split('#')[0].split('?')[0];
  try{
   let result;
   if(mode==='signup')result=await client.auth.signUp({email,password,options:{emailRedirectTo:redirectTo,data:{nickname:el('memberAuthNickname').value.trim()}}});
   else if(mode==='reset')result=await client.auth.resetPasswordForEmail(email,{redirectTo});
   else if(mode==='update')result=await client.auth.updateUser({password});
   else result=await client.auth.signInWithPassword({email,password});
   if(result.error)throw result.error;
   el('memberAuthPassword').value='';el('memberAuthConfirm').value='';
   if(submittedMode==='signup'&&!result.data.session)status('memberAuthStatus','이메일의 인증 링크를 확인해 주세요. 인증 후 로그인할 수 있습니다. 스팸함도 확인해 주세요.');
   else if(submittedMode==='reset')status('memberAuthStatus','가입된 이메일이라면 재설정 안내가 전송됩니다. 받은편지함과 스팸함을 확인해 주세요.');
   else if(submittedMode==='update'){setMode('login');status('memberAuthStatus','비밀번호를 변경했습니다.');}
   else {await bindSession(result.data.session,'SIGNED_IN');if(signedIn()){el('memberAuthDialog').close();await window.MapMembership?.open();}}
  }catch(error){status('memberAuthStatus',safeError(error),true)}
  finally{busy=false;el('memberAuthSubmit').disabled=false}
 }
 async function loadReviews(append=false){
  if(!signedIn())return;const version=epoch,request=++reviewRequest;
  status('memberReviewsStatus','후기를 불러오는 중입니다…');
  try{
   const data=await accountRpc('reviews',{offset:append?items.length:0});
   if(version!==epoch||request!==reviewRequest)return;
   items=append?[...items,...data.items]:data.items;
   el('memberReviewsCount').textContent=`${data.total}개`;
   el('memberOwnReviews').innerHTML=items.map(r=>`<li><h4>${esc(r.place_name)}</h4><small>${r.rating==null?'별점 없음':`★ ${Number(r.rating)}`} · ${new Date(r.created_at).toLocaleDateString('ko-KR')}</small><p>${esc(r.body||'별점만 남긴 기록입니다.')}</p><div class="memberReviewActions"><button type="button" data-account-edit="${esc(r.id)}">수정</button><button type="button" data-account-delete="${esc(r.id)}">삭제</button><button type="button" data-account-place="${esc(r.place_id)}">업소 보기</button></div></li>`).join('')||'<li class="memberEmpty">아직 작성한 후기가 없습니다.</li>';
   el('memberReviewsMore').hidden=!data.has_more;status('memberReviewsStatus','');
  }catch{if(version===epoch&&request===reviewRequest)status('memberReviewsStatus','후기를 불러오지 못했습니다. 활동 새로고침을 눌러 주세요.',true)}
 }
 async function editReview(id){
  const row=items.find(r=>r.id===id);if(!row||!signedIn())return;
  const place=db().places.find(p=>p.id===row.place_id);
  if(!place){status('memberReviewsStatus','업소 정보를 먼저 새로 불러와 주세요.',true);return}
  const current=db();const review=remoteReviewToLocal(row);
  saveDb({...current,reviews:[...current.reviews.filter(r=>r.id!==id),review]});
  el('memberDialog').close();state.selected=row.place_id;returnToAccount=true;openReview(id);
 }
 async function deleteReview(id){
  const row=items.find(r=>r.id===id);if(!row||!signedIn()||busy)return;
  if(!confirm(`‘${row.place_name}’에 남긴 내 후기를 삭제할까요? 활동 점수에도 반영됩니다.`))return;
  busy=true;const version=epoch;
  try{
   await accountRpc('delete_review',{review_id:id});if(version!==epoch)return;
   const current=db();saveDb({...current,reviews:current.reviews.filter(r=>r.id!==id)});
   deletedId=id;el('memberReviewUndo').hidden=false;renderDetail();renderList();
   await Promise.all([loadReviews(),window.MapMembership?.refresh()]);
  }catch{if(version===epoch)status('memberReviewsStatus','삭제하지 못했습니다. 다시 로그인하거나 새로고침해 주세요.',true)}
  finally{busy=false}
 }
 async function restoreReview(){
  if(!deletedId||busy||!signedIn())return;busy=true;const version=epoch;
  try{
   await accountRpc('restore_review',{review_id:deletedId});if(version!==epoch)return;
   deletedId=null;el('memberReviewUndo').hidden=true;
   const fresh=await fetchSharedDb();if(version!==epoch)return;saveDb(fresh);renderDetail();renderList();
   await Promise.all([loadReviews(),window.MapMembership?.refresh()]);
  }catch{if(version===epoch)status('memberReviewsStatus','복원하지 못했습니다. 이미 작성한 후기가 있는지 확인해 주세요.',true)}
  finally{busy=false}
 }
 async function claim(event){
  event.preventDefault();if(!signedIn()||busy||!el('memberClaimConsent').checked)return;
  busy=true;el('memberClaimSubmit').disabled=true;const version=epoch;
  try{
   const profile=await accountRpc('claim',{device_key:getGuestDeviceId(),consent:true});
   if(version!==epoch)return;
   safeStorageSet('viettrip_device_id_v1',crypto.randomUUID());
   window.MapMembership?.acceptAccountProfile(profile);el('memberClaimConsent').checked=false;paint();
   await initDeviceHash();await loadReviews();status('memberStatus','기존 활동을 계정에 연결했습니다. 다른 기기에서도 같은 이메일로 로그인해 주세요.');
  }catch{if(version===epoch)status('memberStatus','활동을 연결하지 못했습니다. 이 기기의 본인 활동인지 확인해 주세요.',true)}
  finally{busy=false;el('memberClaimSubmit').disabled=false}
 }
 async function init(){
  el('memberLoginBtn').onclick=()=>open();el('memberAuthForm').onsubmit=submit;
  el('memberAuthClose').onclick=()=>el('memberAuthDialog').close();
  el('memberAuthDialog').addEventListener('close',()=>{el('memberAuthPassword').value='';el('memberAuthConfirm').value=''});
  document.querySelectorAll('[data-member-auth-mode]').forEach(n=>n.onclick=()=>{if(!busy)setMode(n.dataset.memberAuthMode)});
  el('memberAuthForgot').onclick=()=>{if(!busy)setMode('reset')};
  el('memberAuthGuest').onclick=()=>{el('memberAuthDialog').close();window.MapMembership?.open({guest:true})};
  el('memberSignOut').onclick=async()=>{if(busy)return;busy=true;try{const result=await client.auth.signOut({scope:'local'});if(result.error)throw result.error;await bindSession(null,'SIGNED_OUT')}catch{status('memberStatus','로그아웃하지 못했습니다. 연결 상태를 확인해 주세요.',true)}finally{busy=false}};
  el('memberClaimForm').onsubmit=claim;el('memberReviewsMore').onclick=()=>loadReviews(true);el('memberRestoreReview').onclick=restoreReview;
  el('memberOwnReviews').onclick=event=>{const button=event.target.closest('button');if(!button)return;if(button.dataset.accountEdit)editReview(button.dataset.accountEdit);else if(button.dataset.accountDelete)deleteReview(button.dataset.accountDelete);else if(button.dataset.accountPlace){el('memberDialog').close();window.PlaceSearch?.openMember(button.dataset.accountPlace)}};
  new MutationObserver(()=>{if(returnToAccount&&!el('reviewModal').classList.contains('open')){returnToAccount=false;if(signedIn())window.MapMembership?.open()}}).observe(el('reviewModal'),{attributes:true,attributeFilter:['class']});
  document.addEventListener('map-data-saved',()=>{if(signedIn()&&el('memberDialog').open)loadReviews()});
  try{
   if(!window.ViettripSupabase?.createClient)throw Error('Auth SDK unavailable');
   client=window.ViettripSupabase.createClient(SUPABASE_URL,SUPABASE_ANON,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
   client.auth.onAuthStateChange((event,session)=>{if(event==='INITIAL_SESSION')return;setTimeout(()=>bindSession(session,event),0)});
   const {data,error}=await client.auth.getSession();if(error)throw error;await bindSession(data.session,'INITIAL_SESSION');
  }catch{resolveReady();paint();status('memberAuthStatus','로그인 연결을 준비하지 못했습니다. 새로고침해 주세요.',true)}
 }
 window.MemberAccount={ready,signedIn,deviceId:()=>deviceKey,identity:()=>user?.id||null,open,paint,loadReviews,requestHeaders:async()=>{await ready;return tokenHeaders()}};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
