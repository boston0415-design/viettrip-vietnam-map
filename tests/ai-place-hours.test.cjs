const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require(process.env.JSDOM_PATH||'jsdom');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
(async()=>{
 const dom=new JSDOM('',{url:'https://map.test',runScripts:'outside-only'}),w=dom.window,ctx=dom.getInternalVMContext();
 vm.runInContext('const state={map:{}}',ctx);
 vm.runInContext(read('assets/js/place-photos.js'),ctx);vm.runInContext(read('assets/js/ai-place-hours.js'),ctx);
 const api=w.AIPlaceHours,now=new Date('2026-09-24T09:00:00Z'); // Thursday 16:00 in Vietnam.
 const period=(day,hour,closeDay,closeHour)=>({open:{day,hour,minute:0},close:{day:closeDay,hour:closeHour,minute:0}});
 const today=periods=>({businessStatus:'OPERATIONAL',currentOpeningHours:{periods}});
 let result=api.summarize(today([period(4,18,5,2)]),now);assert.equal(result.kind,'later');assert.equal(result.label,'18:00 영업 예정');assert.equal(result.hours,'오늘 18:00–다음 날 02:00');
 assert.equal(api.summarize(today([period(4,10,4,15)]),now).label,'오늘 영업 종료');
 assert.equal(api.summarize(today([]),now).label,'오늘 휴무');
 assert.equal(api.summarize({},now).kind,'unknown','missing hours cannot mean closed');
 assert.equal(api.summarize({businessStatus:'CLOSED_TEMPORARILY',...{currentOpeningHours:{periods:[period(4,9,4,22)]}}},now).label,'임시 휴업');
 assert.equal(api.summarize({businessStatus:'CLOSED_PERMANENTLY'},now).available,false);
 assert.equal(api.summarize(today([{open:{day:0,hour:0,minute:0}}]),now).hours,'오늘 24시간');
 assert.equal(api.summarize(today([period(3,20,4,2)]),new Date('2026-09-23T18:00:00Z')).kind,'open','Vietnam Thursday 01:00 even while UTC is Wednesday');
 assert.equal(api.summarize(today([period(6,20,0,2)]),new Date('2026-09-26T18:00:00Z')).kind,'open','overnight Saturday to Sunday');
 result=api.summarize(today([period(4,9,4,12),period(4,17,4,22)]),now);assert.equal(result.kind,'later');assert.match(result.hours,/09:00–12:00 \/ 17:00–22:00/);
 assert.equal(api.summarize(today([{open:{day:4,hour:25,minute:0}}]),now).kind,'unknown');
 result=api.summarize({opening_hours:{periods:[{open:{day:4,hours:10,minutes:0},close:{day:4,hours:20,minutes:0}}]}},now,'regular');assert.equal(result.kind,'open');assert.equal(result.source,'regular');
 const place={id:'a',googlePlaceId:'google-a',name:'Test Bistro',address:'10 Test Road, Vietnam',lat:10.77,lng:106.7};
 let modern=0,legacy=0,find=0,fail=false,wrong=false,hold=null;
 w.google={maps:{places:{Place:class{
   constructor({id}){this.id=id;}
   async fetchFields({fields}){modern++;assert(fields.includes('currentOpeningHours'));if(fail)throw Error('REQUEST_DENIED');if(hold)await hold;Object.assign(this,{displayName:wrong?'Other Bistro':place.name,formattedAddress:place.address,location:{lat:()=>place.lat,lng:()=>place.lng},businessStatus:'OPERATIONAL',currentOpeningHours:{periods:[period(4,18,5,2)]}});}
 },PlacesService:class{
   getDetails({placeId},callback){legacy++;callback({place_id:placeId,name:place.name,formatted_address:place.address,geometry:{location:{lat:()=>place.lat,lng:()=>place.lng}},opening_hours:{periods:[{open:{day:4,hours:9,minutes:0},close:{day:4,hours:22,minutes:0}}]}},'OK');}
   findPlaceFromQuery(request,callback){find++;callback([],'ZERO_RESULTS');}
 }}}};
 const before=JSON.stringify(place);result=await api.lookup(place,{now});assert.equal(result.kind,'later');assert.equal(result.source,'current');assert.equal(legacy,0);assert.equal(find,0);assert.equal(JSON.stringify(place),before,'never mutate member records');
 wrong=true;result=await api.lookup(place,{now});assert.equal(result.kind,'unknown','mismatched Google branch cannot supply hours');wrong=false;
 fail=true;result=await api.lookup(place,{now});assert.equal(result.source,'regular','fallback is not presented as current holiday hours');assert.equal(legacy,1);fail=false;
 result=await api.lookup({...place,id:'unresolved',googlePlaceId:null,name:'Missing Bistro'},{now});assert.equal(result.kind,'unknown');assert.equal(find,1);
 let release;hold=new Promise(resolve=>release=resolve);const controller=new w.AbortController();let published=0;
 const work=api.checkAll(Array.from({length:10},()=>({place})),{signal:controller.signal,onResult:()=>published++});
 await new Promise(r=>setTimeout(r,5));const called=modern;controller.abort();release();await work;
 assert.equal(published,0,'cancel prevents late updates');assert.equal(modern,called,'queued lookups stop after cancellation');
 dom.window.close();console.log('PASS Vietnam today, split/overnight/24h/closed/missing hours, branch validation, regular fallback and cancelled lookup queue');
})().catch(error=>{console.error(error);process.exitCode=1;});
