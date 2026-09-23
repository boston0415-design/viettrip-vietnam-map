/* Desktop double-click complements dragging; form fields and actions keep their behavior. */
(() => {
  'use strict';
  const panels='#businessSide,#detail,#areaLegend,#areaPanel,#nearbyResults,.modalback .modal,dialog';
  const actions='button,a,input,textarea,select,label,summary,img,video,audio,iframe,[contenteditable]:not([contenteditable="false"]),[role="button"],[data-no-window-resize]';
  const windows=new Map();
  const desktop=()=>window.matchMedia('(min-width:901px)').matches;
  const maxHeight=()=>Math.max(180,(window.visualViewport?.height||innerHeight)-40);
  function size(panel,maximized){
    const max=maxHeight(),height=maximized?max:Math.min(150,max);
    panel.style.setProperty('--desktop-window-height',height+'px');panel.classList.add('desktopWindowSized');
    panel.scrollTop=0;windows.set(panel,maximized);
  }
  function toggle(panel){
    window.BodySheetDrag?.cancel(panel);
    if(panel.id==='detail'){window.DetailSheetResize?.toggle();return;}
    if(panel.id==='nearbyResults'){window.MapUX?.toggleNearbySize();return;}
    if(window.MenuSheetResize?.toggle(panel))return;
    size(panel,windows.has(panel)?!windows.get(panel):panel.getBoundingClientRect().height<maxHeight()-3);
  }
  document.addEventListener('dblclick',event=>{
    if(!desktop()||event.button!==0||event.defaultPrevented)return;
    const target=event.target.closest?.('*'),panel=target?.closest(panels);
    if(!panel||target.closest(actions)&&!target.closest('#areaLegendTitle'))return;
    if(panel.closest('.modalback:not(.open)')||panel.matches('dialog:not([open])')||panel.hidden)return;
    event.preventDefault();event.stopPropagation();toggle(panel);
  });
  const titles='.mobileSideHead,.detailHeader,.menuResizeGrip,.detailResizeHandle,.areaPanelHead,.nearbyResultsHead,.nearbyResizeGrip,.travellerDialogHead,.reviewEditorHeader,.browseDialogHead,.weatherDialogHead,.photoViewerHead,.modal>h3';
  function hint(){document.querySelectorAll(titles).forEach(node=>{if(!node.hasAttribute('data-desktop-resize-hint')){node.setAttribute('data-desktop-resize-hint','');node.title='PC에서 두 번 클릭하면 창을 최대화·최소화합니다';}});}
  hint();new MutationObserver(hint).observe(document.body,{childList:true,subtree:true});
  window.addEventListener('resize',()=>{for(const [panel,maximized] of windows){if(!panel.isConnected||!desktop()){panel.classList.remove('desktopWindowSized');panel.style.removeProperty('--desktop-window-height');windows.delete(panel);}else size(panel,maximized);}});
})();
