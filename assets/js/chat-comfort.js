/* Small conversation tools; replies remain plain text compatible with old clients. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id),input=$('chatMessage'),form=$('chatForm');if(!input||!form)return;
 let reply=null,selected=null;
 const preview=document.createElement('div');preview.id='chatReplyPreview';preview.hidden=true;
 const quote=document.createElement('span'),cancel=document.createElement('button');cancel.type='button';cancel.textContent='×';cancel.setAttribute('aria-label','답장 취소');preview.append(quote,cancel);form.prepend(preview);
 const feedback=document.createElement('p');feedback.id='chatComposeStatus';feedback.setAttribute('role','status');form.append(feedback);
 const menu=document.createElement('dialog');menu.id='chatMessageMenu';menu.setAttribute('data-no-sheet-resize','');menu.setAttribute('aria-label','메시지 메뉴');
 menu.innerHTML='<p class="chatMenuExcerpt"></p><button type="button" data-reply>답장</button><button type="button" data-copy>복사</button><button type="button" data-close>닫기</button>';document.body.append(menu);
 function save(){try{sessionStorage.setItem('viettrip_chat_draft_v1',JSON.stringify({text:input.value,reply,time:Date.now()}))}catch{}}
 function resize(){input.style.height='auto';input.style.height=Math.min(120,Math.max(42,input.scrollHeight))+'px';}
 function paint(){preview.hidden=!reply;quote.textContent=reply?reply.name+'에게 답장 · '+reply.text:'';resize();}
 try{const draft=JSON.parse(sessionStorage.getItem('viettrip_chat_draft_v1'));if(draft&&Date.now()-draft.time<86400000){input.value=String(draft.text||'').slice(0,1000);if(draft.reply&&typeof draft.reply.name==='string'&&typeof draft.reply.text==='string')reply=draft.reply;}}catch{}
 cancel.onclick=()=>{reply=null;paint();save();input.focus()};
 input.addEventListener('input',()=>{resize();save();feedback.textContent=''});
 const prefix=()=>reply?'↪ '+reply.name+': '+reply.text+'\n\n':'';
 function close(){menu.close();selected?.trigger?.focus({preventScroll:true})}
 menu.querySelector('[data-close]').onclick=close;
 menu.querySelector('[data-reply]').onclick=()=>{reply={name:selected.row.nickname.replace(/\s+/g,' ').slice(0,30),text:selected.row.body.replace(/\s+/g,' ').slice(0,100)};menu.close();paint();save();input.focus()};
 menu.querySelector('[data-copy]').onclick=async()=>{const value=selected.row.body;let ok=false;try{if(typeof copyTextToClipboard==='function')ok=await copyTextToClipboard(value);else{await navigator.clipboard.writeText(value);ok=true}}catch{}close();feedback.textContent=ok?'복사했습니다.':'복사하지 못했어요. 다시 시도해 주세요.'};
 function richText(node,text){const pattern=/https?:\/\/[^\s<>]+/g;let from=0;for(const match of text.matchAll(pattern)){node.append(document.createTextNode(text.slice(from,match.index)));const a=document.createElement('a');a.href=match[0];a.textContent=match[0];a.target='_blank';a.rel='noopener noreferrer';node.append(a);from=match.index+match[0].length;}node.append(document.createTextNode(text.slice(from)));}
 function decorate(node,row){
  const body=node.querySelector('p');body.replaceChildren();const split=row.body.startsWith('↪ ')?row.body.indexOf('\n\n'):-1;
  if(split>0){const block=document.createElement('blockquote');block.className='chatQuote';block.textContent=row.body.slice(2,split);body.before(block);richText(body,row.body.slice(split+2));}else richText(body,row.body);
  const action=document.createElement('button');action.type='button';action.className='chatMessageActions';action.textContent='⋯';action.setAttribute('aria-label',row.nickname+' 메시지 메뉴');action.onclick=()=>{selected={row,trigger:action};menu.querySelector('.chatMenuExcerpt').textContent=row.body.slice(0,160);if(!menu.open)menu.showModal()};node.querySelector('header').append(action);
 }
 window.ChatComfort={decorate,compose:text=>prefix()+text,sent(text,sentBody){if(input.value.trim()===text&&prefix()+text===sentBody){input.value='';reply=null;paint();save();}},feedback:text=>{feedback.textContent=text},changed:resize};
 input.rows=1;input.placeholder='메시지 입력';input.setAttribute('enterkeyhint','enter');
 const hint=form.querySelector('small');if(hint)hint.textContent=window.matchMedia('(min-width:901px)').matches?'Enter 전송 · Shift+Enter 줄바꿈':'';
 paint();
})();
