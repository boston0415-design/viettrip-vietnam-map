// Temporary entries correspond to visible panels, not filter choices. Closing
// the last panel returns to the original page entry so Back can leave normally.
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

    add('nearby-pick',byId('nearbyPickControls'),()=>Boolean(window.NearbyBusinesses?.isPicking()),()=>window.NearbyBusinesses.cancelPick());
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
    add('map-info',byId('map'),()=>Boolean(state.clickInfo),()=>closeSystemInfo());
    add('registration',byId('regHint'),()=>state.registerMode,cancelRegisterMode);
    document.querySelectorAll('.modalback').forEach(node=>{
      add(node.id,node,()=>node.classList.contains('open'),()=>closeModalById(node.id));
    });
    document.querySelectorAll('dialog.travellerDialog').forEach(node=>{
      add(node.id,node,()=>node.open,()=>node.close());
    });

    const depthOf=value=>{
      const saved=value?.[key];
      if(saved===true)return 1; // Clean up entries from the first released version.
      return Number.isInteger(saved?.depth) && saved.depth>0 ? saved.depth : 0;
    };
    let layers=[];
    let depth=depthOf(history.state),capacity=depth;
    let moving=false,canPush=true;

    function readLayers(){
      const visible=definitions.filter(panel=>panel.isOpen());
      // Re-rendering a visible panel does not change its order or add history.
      layers=layers.filter(panel=>visible.includes(panel));
      visible.forEach(panel=>{if(!layers.includes(panel))layers.push(panel)});
      return layers;
    }

    function moveTo(target){
      if(moving || target===depth)return;
      moving=true;
      history.go(target-depth);
    }

    function sync(){
      const wanted=readLayers().length;
      if(moving || wanted===depth)return;
      if(wanted<depth){moveTo(wanted);return}
      if(!canPush){
        // An open action can race an X/Cancel history traversal. Reuse existing
        // forward entries; never push from popstate (Chrome can skip those).
        if(capacity>depth)moveTo(Math.min(wanted,capacity));
        return;
      }
      try{
        while(depth<wanted){
          // Preserve URL/query/hash and unrelated state; store no form contents.
          history.pushState({...history.state,[key]:{depth:depth+1}},'');
          depth++;
          capacity=depth;
        }
      }catch(error){console.warn('Panel back navigation unavailable',error)}
    }

    window.addEventListener('popstate',event=>{
      const previous=depth;
      depth=depthOf(event.state);
      canPush=false;
      if(moving){
        // X/Cancel/Escape already changed the UI. Don't dismiss a replacement
        // panel which may have opened while this traversal was pending.
        moving=false;
      }else if(depth<previous){
        readLayers();
        while(layers.length>depth){
          const top=layers[layers.length-1];
          top.close();
          readLayers();
          if(layers.includes(top))break;
        }
      }
      // Forward/reload of a stale entry returns to the visible UI depth without
      // reopening forms. All Back handling traverses existing history only.
      sync();
    });

    // Browser history manipulation protection requires a fresh user interaction
    // before adding entries after Back/Forward. A new click/key enables that.
    const interaction=()=>{canPush=true;sync()};
    document.addEventListener('click',interaction,{capture:true,passive:true});
    document.addEventListener('keydown',interaction,{capture:true,passive:true});

    // Observe app panel attributes only, never the changing Google Maps DOM.
    const observer=new MutationObserver(sync);
    const nodes=new Set(definitions.map(panel=>panel.node));
    if(byId('areaLegendTitle'))nodes.add(byId('areaLegendTitle'));
    nodes.forEach(node=>observer.observe(node,{attributes:true,attributeFilter:['class','open','aria-expanded','hidden']}));
    window.addEventListener('viettrip:map-info-change',sync);
    window.addEventListener('resize',sync);
    window.addEventListener('pageshow',()=>{depth=depthOf(history.state);capacity=Math.max(capacity,depth);sync()});
    sync();
  }
  // Loaded last so the existing Grab dialog has been created before observing it.
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initPanelHistory,{once:true});
  else initPanelHistory();
})();
