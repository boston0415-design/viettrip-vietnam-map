const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'../assets/js');
const c=vm.createContext({console,assert,setTimeout,clearTimeout,setInterval,clearInterval,URL});c.window=c;c.document={addEventListener(){},querySelector(){return {}},querySelectorAll(){return []}};
for(const f of fs.readdirSync(root).filter(f=>/^0[1-8]-/.test(f)).sort())vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),c);
vm.runInContext(`
let hovered='',clicked='';showPositionHover=(position,html)=>{assert(position);hovered=html};showClickInfo=(position,html)=>{assert(position);clicked=html};hideHover=()=>{};
class Target{constructor(options){this.options=options;this.events={}}addListener(name,fn){(this.events[name]||=[]).push(fn)}setIcon(){}setMap(){}}
google={maps:{Circle:Target,Marker:Target,Size:class{},Point:class{}}};state.map={};
const pos={lat:10.77,lng:106.7};
for(const city of Object.values(EXTRA_DATA))for(const p of city.points||[]){
 const marker=createSelectedPoiMarker(p,pos,false);
 marker.events.mouseover.forEach(fn=>fn({latLng:pos}));assert(hovered.includes(esc(p.name)));
 marker.events.click.forEach(fn=>fn({latLng:pos}));assert(clicked.includes(esc(p.name)));
 const circle=addPointCoverageCircle(p.type,pos,p);circle.events.click[0]({latLng:pos});assert(clicked.includes(esc(p.name)));assert(clicked.includes('반경'));
}
const bad={name:'<script>bad</script>',address:'<img src=x>',description:'<svg onload=bad>',...pos};
assert(!mapFeatureHtml(bad).includes('<script>'));assert(mapFeatureHtml(bad).includes('&lt;script&gt;'));
assert(mapFeatureHtml(bad).includes('&lt;img'));assert(mapFeatureHtml({name:'주소 없음',...pos}).includes('상세 주소 미등록'));
for(const category of Object.keys(CONFIG.categories))assert(businessGlyphPath(category)!==businessGlyphPath('unknown'),category+' needs a recognizable symbol');
const pin=businessMarkerIcon('stay','호텔',4.5);const svg=decodeURIComponent(pin.url.split(',')[1]);assert(svg.includes('stroke-width="1.6"'));assert(svg.includes('4.5'));
console.log('PASS every fixed POI and range hover/tap info, missing address fallback, escaped content, all 10 category glyphs, thin pin border');
`,c);
