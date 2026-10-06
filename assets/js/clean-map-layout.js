// One map surface and one active panel. Move existing controls to preserve their handlers and permissions.
(()=>{
 'use strict';
 const byId=id=>document.getElementById(id),top=document.querySelector('.top'),wrap=document.querySelector('.mapwrap');
 if(!top||!wrap)return;
 document.body.classList.add('cleanMap');
 const menu=document.createElement('dialog');menu.id='mapMainMenu';menu.setAttribute('aria-label','베트남맵 메뉴');menu.setAttribute('data-no-sheet-resize','');
 const head=document.createElement('div');head.className='cleanMenuHead';
 const title=document.createElement('strong');title.textContent='일상탈출 베트남맵';
 const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','메뉴 닫기');close.onclick=()=>menu.close();head.append(title,close);menu.append(head);
 const content=document.createElement('div');content.className='cleanMenuContent';menu.append(content);document.body.append(menu);
 const controls=[document.querySelector('.brand'),byId('openMapMembership'),byId('shareMapApp'),byId('homeScreenBar'),byId('addBtn'),document.querySelector('.communityStats'),document.querySelector('.operatorOptions')];
 for(const node of controls)if(node)content.append(node);
 const button=document.createElement('button');button.id='mapMenuButton';button.type='button';button.setAttribute('aria-label','메뉴 열기');button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls',menu.id);button.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';button.onclick=()=>menu.showModal();top.prepend(button);
 menu.addEventListener('click',e=>{if(e.target===menu)menu.close();else if(e.target.closest('button,a')&&!e.target.closest('.cleanMenuHead'))menu.close();});
 const location=byId('locBtn');if(location){wrap.append(location);location.classList.add('cleanLocation');location.setAttribute('aria-label','현재 위치 찾기');}
 const nav=document.createElement('nav');nav.id='mapBottomNav';nav.setAttribute('aria-label','지도 주요 기능');
 const explore=document.createElement('button');explore.type='button';explore.id='cleanExplore';explore.textContent='탐색';explore.onclick=()=>{window.ChatDock?.close();window.DestinationLine?.clear();byId('browseShowList')?.click();};nav.append(explore);
 for(const [id,label] of [['chatQuickPeople','채팅'],['chatQuickAi','AI 질문']]){const node=byId(id);if(!node)continue;const text=[...node.childNodes].find(n=>n.nodeType===3);if(text)text.textContent=label;node.querySelector('[aria-hidden="true"]')?.remove();node.addEventListener('click',()=>{window.DestinationLine?.clear();if(typeof closeDetailPanel==='function')closeDetailPanel();if(typeof closeMobileBusinessList==='function')closeMobileBusinessList();window.ListLayout?.setCollapsed(true);});nav.append(node);}
 document.body.append(nav);
 const menuEntry=()=>menu.close();for(const node of controls)node?.addEventListener('click',menuEntry);
 document.addEventListener('click',e=>{if(e.target.closest?.('#browseShowList,#desktopListToggle'))window.ChatDock?.close();});
 // Avoid showing the empty member list over the initial map.
 if(!new URLSearchParams(locationSearch()).has('place'))window.ListLayout?.setCollapsed(true);
 function locationSearch(){return window.location.search;}
})();
