const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'..');
const ctx=vm.createContext({console,assert,URL,setTimeout:()=>0,clearTimeout(){},document:{addEventListener(){},getElementById(){return null}},Map,Set,Promise});ctx.window=ctx;
for(const f of fs.readdirSync(path.join(root,'assets/js')).filter(f=>/^0[1-8]-/.test(f)).sort())vm.runInContext(fs.readFileSync(path.join(root,'assets/js',f),'utf8'),ctx);
for(const f of ['community-reviews.js','transport-guide.js','admin-regions.js'])vm.runInContext(fs.readFileSync(path.join(root,'assets/js',f),'utf8'),ctx);
vm.runInContext(`
assert.equal(writtenCommunityReviews([{body:'hello',rating:null},{body:' ',rating:5},{body:null,rating:4},{body:'후기',rating:5}]).length,2);
assert.equal(reviewPhotoUrl('javascript:alert(1)'),null);
assert.equal(reviewPhotoUrl('data:text/html,bad'),null);
assert.equal(reviewPhotoUrl('https://example.com/photo.jpg'),'https://example.com/photo.jpg');
for(const city of Object.keys(CITY_DATA)){
  const guide=TRANSPORT_GUIDES[city];assert(guide,city);
  for(const t of guide.terminals){
    assert(EXTRA_DATA[city==='hoian'?'danang':city].points.some(p=>p.name===t.point),t.point);
    assert(TRANSPORT_SOURCES[t.source]?.startsWith('https://'),t.source);
  }
}
assert(transportRouteUrl('Hotel A & B / 1군').includes('Hotel%20A%20%26%20B'));
const geo={type:'Polygon',coordinates:[[[106,10],[107,10],[107,11],[106,10]]]};
assert(validAdministrativeGeometry(geo));
assert(!validAdministrativeGeometry({type:'Point',coordinates:[106,10]}));
assert(!validAdministrativeGeometry({type:'Polygon',coordinates:[[[106,10],[107,10],[107,11],[108,12]]]}));
state.cat='stay';state.ratingFilter='4';const before=JSON.stringify({cat:state.cat,rating:state.ratingFilter});
let removed=0;administrativeRegions.layer={setMap(value){assert.equal(value,null);removed++}};administrativeRegions.halo={setMap(value){assert.equal(value,null);removed++}};
administrativeRegions.selected='old';resetAdministrativeRegions();assert.equal(removed,2);assert.equal(administrativeRegions.selected,null);
assert.equal(JSON.stringify({cat:state.cat,rating:state.ratingFilter}),before);
`,ctx);
const cities=['hcmc','hanoi','danang','nhatrang','phuquoc','dalat','hoian','vungtau','muine'];
for(const city of cities){
 const data=JSON.parse(fs.readFileSync(path.join(root,'assets/data/admin',city+'.geojson'),'utf8'));
 ctx.boundaryFixture=data;
 vm.runInContext(`assert(boundaryFixture.features.every(f=>validAdministrativeGeometry(f.geometry)));assert.equal(boundaryFixture.features.filter(f=>f.properties.era==='2025').length,1);assert.equal(new Set(boundaryFixture.features.map(f=>f.properties.id)).size,boundaryFixture.features.length);`,ctx);
 assert(data.features.some(f=>f.properties.era==='2020'));
}
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const id of ['openCommunityReviews','communityReviewsDialog','openTransportGuide','transportGuideDialog','openAdminRegions','adminRegionSelect'])assert(html.includes('id="'+id+'"'));
console.log('PASS written vs rating-only reviews, safe images, all city/terminal guides, route encoding, boundary validation/reset, nine local datasets');
