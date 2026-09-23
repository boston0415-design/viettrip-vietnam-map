const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'../assets/js'),KEY='viettrip_admin_key_v1',password='fixture-admin-only';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function app(local=new Map(),session=new Map(),blocked=false){
  const nodes=new Map(),events=new Map();
  const node=selector=>{
    if(!nodes.has(selector)){
      const classes=new Set();
      nodes.set(selector,{value:'',textContent:'',style:{},disabled:false,checked:false,
        classList:{add:s=>classes.add(s),remove:s=>classes.delete(s),contains:s=>classes.has(s),toggle(s,on){if(on)classes.add(s);else classes.delete(s)}},
        focus(){},setAttribute(){},removeAttribute(){},addEventListener(){}});
    }
    return nodes.get(selector);
  };
  const storage=data=>({getItem(key){if(blocked)throw Error('blocked');return data.get(key)??null},setItem(key,value){if(blocked)throw Error('blocked');data.set(key,String(value))},removeItem(key){if(blocked)throw Error('blocked');data.delete(key)}});
  const c=vm.createContext({console:{log(){},warn(){},error(){}},URL,Map,Set,Promise,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){}});
  c.window=c;c.localStorage=storage(local);c.sessionStorage=storage(session);
  c.addEventListener=(name,fn)=>{const list=events.get(name)||[];list.push(fn);events.set(name,list)};
  c.document={visibilityState:'visible',addEventListener:c.addEventListener,querySelector:node,querySelectorAll:()=>[]};
  for(const file of fs.readdirSync(root).filter(f=>/^0[1-8]-/.test(f)).sort())vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),c,{filename:file});
  const run=code=>vm.runInContext(code,c);
  run('renderDetail=()=>{};');
  c.supaRpc=async(name,args)=>name==='admin_verify'&&args.p_admin_key===password;
  return {c,run,node,local,session,emit:async(name,event={})=>{for(const fn of events.get(name)||[])fn(event);await tick()}};
}
async function login(a){a.node('#adminPassword').value=password;await a.run('submitAdminPassword()');}
(async()=>{
  const a=app();await login(a);
  assert.equal(a.local.get(KEY),password);assert(!a.session.has(KEY));assert.equal(a.run('state.isAdmin'),true);
  assert.equal(a.node('#adminPassword').value,'');assert.equal(a.node('#adminBtn').textContent,'운영자 로그아웃');

  // A new page context and empty sessionStorage simulate closing/reopening the browser.
  const b=app(a.local);b.run('bindAdminSessionEvents()');await b.run('restoreAdminSession()');
  assert.equal(b.run('state.isAdmin'),true,'persistent credential still requires server verification');
  await a.run('toggleAdminMode()');await b.emit('storage',{key:KEY,newValue:''});
  assert.equal(b.run('state.isAdmin'),false);assert.equal(b.run('adminKey()'),'');
  assert.equal(b.node('#adminBtn').textContent,'운영자 로그인');
  const afterLogout=app(a.local);await afterLogout.run('restoreAdminSession()');assert.equal(afterLogout.run('state.isAdmin'),false);

  const legacy=app(new Map(),new Map([[KEY,password]]));await legacy.run('restoreAdminSession()');
  assert.equal(legacy.local.get(KEY),password);assert(!legacy.session.has(KEY));
  const oldTab=app(a.local,new Map([[KEY,password]]));await oldTab.run('restoreAdminSession()');
  assert.equal(oldTab.run('state.isAdmin'),false,'a logout tombstone overrides an old tab credential');

  const invalid=app(new Map([[KEY,'incorrect']]));await invalid.run('restoreAdminSession()');
  assert.equal(invalid.run('state.isAdmin'),false);assert.equal(invalid.local.get(KEY),'');

  const offline=app(new Map([[KEY,password]]));offline.run('bindAdminSessionEvents()');
  offline.c.supaRpc=async()=>{throw Error('network unavailable')};await offline.run('restoreAdminSession()');
  assert.equal(offline.local.get(KEY),password);assert.equal(offline.run('state.isAdmin'),false,'offline startup does not grant unverified permissions');
  offline.c.supaRpc=async()=>true;await offline.emit('online');assert.equal(offline.run('state.isAdmin'),true);

  const pending=app(new Map([[KEY,password]]));let complete;
  pending.c.supaRpc=()=>new Promise(resolve=>{complete=resolve});
  const restoring=pending.run('restoreAdminSession()');await pending.run('toggleAdminMode()');complete(true);await restoring;
  assert.equal(pending.run('state.isAdmin'),false);assert.equal(pending.run('adminKey()'),'','late verification cannot reverse logout');

  const deniedLogin=app();deniedLogin.c.supaRpc=async()=>{throw Error('offline')};await login(deniedLogin);
  assert.equal(deniedLogin.run('state.isAdmin'),false);assert.equal(deniedLogin.run('adminKey()'),'');
  assert(deniedLogin.node('#adminLoginStatus').textContent.includes('서버에 연결하지 못했습니다'));
  assert.equal(deniedLogin.node('#adminPassword').value,password,'connection failure does not claim the password is wrong');

  // Exercise the actual edit/save failure path, not just the storage helpers.
  const edit=app();await login(edit);edit.c.alert=()=>{};
  edit.run(`
    const fixture={id:'place-1',name:'Original',lat:10.77,lng:106.7};
    db=()=>({places:[fixture],reviews:[]});isOwnerPlace=()=>false;
    uploadSelectedPlacePhotos=async()=>[];setPlaceSaving=()=>{};setPlaceSaveStatus=()=>{};
    state.editPlaceId=fixture.id;state.editMode='admin';state.clickLatLng={lat:10.77,lng:106.7};
  `);
  edit.node('#pName').value='Edited';edit.node('#pCat').value='restaurant';edit.node('#pSub').value='한식';
  edit.run('selectedRestaurantTags=()=>[]');
  for(const failAt of ['verify','write','declined']){
    edit.c.supaRpc=async(name)=>{
      if(name==='admin_verify'){if(failAt==='verify')throw Error('offline');return true;}
      if(failAt==='write')throw Error('offline');return false;
    };
    await edit.run('savePlaceOnce()');
    assert.equal(edit.run('state.isAdmin'),true,failAt+' keeps login');
    assert.equal(edit.local.get(KEY),password);assert.equal(edit.node('#pName').value,'Edited');
    assert.equal(edit.run('fixture.name'),'Original','failed writes never pretend to have saved');
  }
  edit.c.supaRpc=async()=>false;await edit.run('savePlaceOnce()');
  assert.equal(edit.run('state.isAdmin'),false,'explicit server rejection still revokes local admin access');
  assert.equal(edit.local.get(KEY),'');

  const blocked=app(new Map(),new Map(),true);await login(blocked);assert.equal(blocked.run('state.isAdmin'),true);
  await blocked.run('toggleAdminMode()');assert.equal(blocked.run('adminKey()'),'');
  console.log('PASS browser restart, legacy migration, cross-tab logout, revoked credentials, offline retry, logout races, failed-save draft preservation and blocked storage');
})().catch(error=>{console.error(error);process.exitCode=1});
