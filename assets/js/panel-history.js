// One temporary history entry protects visible panels. It is removed when the
// last panel closes; the map itself never blocks navigation away from the site.
(() => {
  function initPanelHistory(){
    const key='viettripPanelBack';
    const history=window.history;
    if(!history?.pushState || !window.MutationObserver)return;
    const byId=id=>document.getElementById(id);
    const mobile=()=>isMobileMapLayout();
    const definitions=[];
    const add=(id,node,isOpen,close)=>{if(node)definitions.push({id,node,isOpen,close})};
    const legend=byId('areaLegend'),list=byId('businessSide'),detail=byId('detail');

    add('filters',legend,()=>byId('areaLegendTitle')?.getAttribute('aria-expanded')==='true',
      ()=>setMobileLegendExpanded(false,{restoreFocus:true}));
    add('areas',byId('areaPanel'),()=>byId('areaPanel').classList.contains('show'),()=>{
      closeAreaPanel();byId('areaLegendTitle')?.focus({preventScroll:true});
    });
    add('list',list,()=>mobile() && list.classList.contains('mobileOpen'),closeMobileBusinessList);
    add('list-filters',list,()=>mobile() && list.classList.contains('mobileOpen') && list.classList.contains('mobileFiltersOpen'),()=>{
      list.classList.remove('mobileFiltersOpen');
      const toggle=byId('mobileFilterToggle');
      toggle?.setAttribute('aria-expanded','false');
      if(toggle)toggle.textContent='업종 필터';
    });
    add('detail',detail,()=>detail.classList.contains('show'),closeDetailPanel);
    add('detail-expanded',detail,()=>mobile() && detail.classList.contains('show') && detail.classList.contains('detailExpanded'),()=>setDetailExpanded(false));
    add('registration',byId('regHint'),()=>state.registerMode,cancelRegisterMode);
    document.querySelectorAll('.modalback').forEach(node=>{
      add(node.id,node,()=>node.classList.contains('open'),()=>closeModalById(node.id));
    });
    document.querySelectorAll('dialog.travellerDialog').forEach(node=>{
      add(node.id,node,()=>node.open,()=>node.close());
    });

    let layers=[];
    let armed=history.state?.[key]===true;
    let removing=false;

    function readLayers(){
      const visible=definitions.filter(panel=>panel.isOpen());
      // Re-rendering a visible panel does not change its order or add history.
      layers=layers.filter(panel=>visible.includes(panel));
      visible.forEach(panel=>{if(!layers.includes(panel))layers.push(panel)});
      return layers;
    }

    function arm(){
      if(armed)return;
      try{
        // Keep URL/query/hash and any unrelated history state exactly as they are.
        history.pushState({...history.state,[key]:true},'');
        armed=true;
      }catch(error){console.warn('Panel back navigation unavailable',error)}
    }

    function removeGuard(){
      if(removing || !armed)return;
      removing=true;
      history.back();
    }

    function sync(){
      readLayers();
      if(removing)return;
      if(layers.length)arm();
      else removeGuard();
    }

    window.addEventListener('popstate',event=>{
      const wasArmed=armed;
      armed=event.state?.[key]===true;
      if(removing){
        // The X/Cancel/Escape action already closed the panel. Do not also
        // dismiss another panel if one opened while history.back() was pending.
        removing=false;
        sync();
        return;
      }
      if(wasArmed && !armed){
        readLayers();
        const top=layers[layers.length-1];
        top?.close();
        // Nested views use the same single entry, so repeated opens never leave
        // invisible pages to step through. Each Back dismisses only the top view.
        sync();
      }else if(armed){
        // Forward/reload may revisit an entry whose panel has already closed.
        // Consume that stale entry without reopening forms or losing draft data.
        sync();
      }
    });

    // Observe only app panel attributes, never the changing Google Maps DOM.
    const observer=new MutationObserver(sync);
    const nodes=new Set(definitions.map(panel=>panel.node));
    if(byId('areaLegendTitle'))nodes.add(byId('areaLegendTitle'));
    nodes.forEach(node=>observer.observe(node,{attributes:true,attributeFilter:['class','open','aria-expanded']}));
    window.addEventListener('resize',sync);
    window.addEventListener('pageshow',()=>{armed=history.state?.[key]===true;sync()});
    sync();
  }
  // Loaded last so the existing Grab dialog has been created before observing it.
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initPanelHistory,{once:true});
  else initPanelHistory();
})();
