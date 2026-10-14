/* Route endpoint search is independent of the main place/detail selection. */
(()=>{
 'use strict';
 function bind(input,onSelect,onEdit,onEnter){
  const list=document.createElement('div');list.className='routeSuggestions';list.id=input.id+'Results';list.hidden=true;list.setAttribute('role','listbox');list.setAttribute('aria-label',input.getAttribute('aria-label')+' 검색 결과');input.after(list);
  input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-controls',list.id);input.setAttribute('aria-expanded','false');
  let serial=0,timer,rows=[],selected=-1,composing=false;
  const valid=token=>token===serial&&input.isConnected;
  function hide(){serial++;clearTimeout(timer);list.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');selected=-1;}
  function display(message){
   const old=new Map([...list.querySelectorAll('button')].map(node=>[node.dataset.key,node]));list.querySelector(':scope > small')?.remove();list.hidden=false;input.setAttribute('aria-expanded','true');
   rows.forEach((row,index)=>{const key=row.id||row.placeId,button=old.get(key)||document.createElement('button');old.delete(key);button.dataset.key=key;button.type='button';button.id=list.id+'-'+index;button.setAttribute('role','option');button.setAttribute('aria-selected',String(index===selected));if(!button.children.length){button.append(document.createElement('strong'),document.createElement('small'));}button.children[0].textContent=row.name;button.children[1].textContent=row.address||'';button.onclick=()=>choose(row);if(list.children[index]!==button)list.insertBefore(button,list.children[index]||null);});
   for(const node of old.values())node.remove();
   if(message){const note=document.createElement('small');note.textContent=message;list.append(note);}
  }
  async function choose(row){
   const token=++serial;clearTimeout(timer);
   try{
    let place=row.id?db().places.find(p=>p.id===row.id):row;
    if(!place)throw Error('NOT_FOUND');
    if(row.placeId){const raw=await googlePhotoRequest(new google.maps.places.PlacesService(state.map),'getDetails',{placeId:row.placeId,fields:['place_id','name','formatted_address','geometry']});if(!valid(token))return;const pos=googlePhotoPosition(raw);if(!pos)throw Error('NOT_FOUND');place={name:raw.name,address:raw.formatted_address,placeId:raw.place_id,...pos};}
    if(!valid(token))return;hide();input.value=place.name;input.blur();onSelect(place);
   }catch{if(valid(token))display('장소를 확인하지 못했습니다. 다시 선택해 주세요.');}
  }
  async function search(commit=false){
   clearTimeout(timer);const q=input.value.trim(),token=++serial;selected=-1;
   if(!q){hide();return;}
   rows=window.PlaceSearch?.localMatches(q)||[];
   const normalize=s=>window.NameSearch?.canonical(s)||String(s).trim().toLowerCase();
   const exact=rows.filter(row=>normalize(row.name)===normalize(q));
   if(commit&&exact.length===1)return choose(exact[0]);
   display('장소 검색 중…');
   try{
    const lib=google.maps.places,service=new lib.AutocompleteService();
    const center=googlePhotoPosition(state.map.getCenter?.());
    const predictions=await googlePhotoRequest(service,'getPlacePredictions',{input:window.NameSearch?.googleQuery(q)||q,componentRestrictions:{country:'vn'},...(center?{locationBias:{center,radius:50000}}:{})});
    if(!valid(token))return;
    rows=[...rows,...(predictions||[]).slice(0,5).map(p=>({placeId:p.place_id,name:p.structured_formatting?.main_text||p.description,address:p.structured_formatting?.secondary_text||''}))];
    if(!rows.length){const found=await googlePhotoRequest(new lib.PlacesService(state.map),'findPlaceFromQuery',{query:(window.NameSearch?.googleQuery(q)||q)+' Vietnam',fields:['place_id','name','formatted_address'],...(center?{locationBias:{center,radius:50000}}:{})});if(!valid(token))return;rows=(found||[]).map(p=>({placeId:p.place_id,name:p.name,address:p.formatted_address}));}
    if(commit&&rows.length)return choose(rows[0]);
    display(rows.length?'이름과 주소를 확인하고 선택하세요. · Google 지도':'검색 결과가 없습니다. 장소명이나 도로명 주소를 입력하세요.');
   }catch{if(valid(token))display(rows.length?'회원 등록 장소를 선택하거나 다시 검색해 주세요.':'검색에 연결하지 못했습니다. Enter를 눌러 다시 시도하세요.');}
  }
  input.addEventListener('input',()=>{hide();onEdit();if(!composing)timer=setTimeout(search,350);});
  input.addEventListener('compositionstart',()=>{composing=true;hide();});input.addEventListener('compositionend',()=>{composing=false;clearTimeout(timer);timer=setTimeout(search,350);});
  input.addEventListener('keydown',e=>{if(e.isComposing||composing||e.keyCode===229)return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();hide();}else if(e.key==='Enter'){e.preventDefault();if(rows.length&&!list.hidden)choose(rows[selected>=0?selected:0]);else if(onEnter)onEnter();else search(true);}else if(['ArrowDown','ArrowUp'].includes(e.key)&&rows.length&&!list.hidden){e.preventDefault();selected=selected<0?(e.key==='ArrowDown'?0:rows.length-1):(selected+(e.key==='ArrowDown'?1:-1)+rows.length)%rows.length;display();input.setAttribute('aria-activedescendant',list.id+'-'+selected);list.children[selected].scrollIntoView({block:'nearest'});}});
  input.parentElement.addEventListener('focusout',e=>{if(!input.parentElement.contains(e.relatedTarget))hide();});
  return {search,hide};
 }
 window.RoutePlaceSearch={bind};
})();
