const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require(process.env.JSDOM_PATH||'jsdom');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const dom=new JSDOM(read('index.html'),{url:'https://viettrip-vietnam-map.pages.dev/',runScripts:'outside-only'});
const run=code=>vm.runInContext(code,dom.getInternalVMContext());
dom.window.assert=assert;dom.window.matchMedia=()=>({matches:true});
try{
 for(const match of read('index.html').matchAll(/<script src="\.\/(assets\/js\/(?:0[1-8]-[^?]+|hospital-directory\.js))\?/g))run(read(match[1]));
 run(`
  db=()=>({places:[],reviews:[]});
  renderAll=()=>{};showTypeRanges=()=>{};showPointCategory=()=>{};
  focusBusinessCategory=(cat,sub)=>{state.cat=cat;state.sub=sub};
  cancelPendingMapWork=()=>{};clearAreaLabels=()=>{};
  clearSelectedSystemIcons=()=>{};clearSelectionRanges=()=>{};
  renderCityControls();
  const rail=selector=>$(selector+' .filterChoices');
  rail('#quickAreas').scrollLeft=420;
  for(const category of ['market-nav','korean-zone','karaoke']){
    $('[data-nav-cat="'+category+'"]').click();
    assert.equal(state.navCategory,category);
    assert.equal(rail('#quickAreas').scrollLeft,420,'selection must not jump back to the first categories');
    assert.equal($('#quickAreas > .quickLabel').textContent,'분류');
    assert.equal($('[data-nav-cat="'+category+'"]').getAttribute('aria-pressed'),'true');
    assert(!$('#tagNav').classList.contains('show'));
    assert.equal($('#tagNav').childElementCount,0);
  }
  rail('#subNav').scrollLeft=90;
  $('[data-business-sub="로컬 KTV"]').click();
  assert.equal(state.sub,'로컬 KTV');
  assert.equal(rail('#subNav').scrollLeft,90);
  $('[data-nav-cat="restaurant"]').click();
  assert.equal(rail('#subNav').scrollLeft,0,'a different category starts its own choices at the beginning');
  assert($('#tagNav').classList.contains('show'));
  rail('#tagNav').scrollLeft=120;
  const tag=$('[data-restaurant-tag]:not([data-restaurant-tag="all"])');
  const chosenTag=tag.dataset.restaurantTag;tag.click();
  assert.equal(state.restaurantTag,chosenTag);
  assert.equal(rail('#tagNav').scrollLeft,120);
  $('[data-nav-cat="hospital"]').click();
  assert.equal(rail('#tagNav').scrollLeft,0);
  $('[data-hospital-sub="동물병원"]').click();
  assert.equal(hospitalSpecialty(),'동물병원');
  assert($('#tagNav').textContent.includes('One Verandah'));
  assert(!$('#tagNav').textContent.includes('FV Hospital'));
  assert.equal(document.querySelectorAll('.ratingLegend .filterChoices button').length,6);
  assert($('.areaLegendOptions').contains($('.benefitLegend [data-benefit-filter="benefit"]')));
  assert(!$('.areaLegendOptions').contains($('#closeMapFilters')));
 `);
 console.log('PASS category/subcategory/tag/hospital clicks, separate labels, retained rail positions, reset on category change, and footer outside the scroll region');
}finally{dom.window.close()}
