const {JSDOM}=require('jsdom'),fs=require('fs'),assert=require('node:assert/strict');
const dom=new JSDOM('<button data-grab-place="one">Grab</button>',{url:'https://example.test',runScripts:'outside-only'}),w=dom.window;
const place={id:'one',name:'벤탄 & Chợ Bến Thành',address:'Hồ Chí Minh / A&B',lat:10.77257,lng:106.69802};w.db=()=>({places:[place]});w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
w.eval(fs.readFileSync('assets/js/interface-polish.js','utf8'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));w.document.querySelector('button').click();
const outer=new URL(w.document.querySelector('#openGrabApp').href),inner=new URL(outer.searchParams.get('af_dp'));
assert.equal(outer.hostname,'grab.onelink.me');assert.equal(inner.searchParams.get('screenType'),'BOOKING');assert.equal(inner.searchParams.get('dropOffAddress'),place.address);assert.equal(inner.searchParams.get('dropOffKeywords'),place.name);assert.equal(inner.searchParams.get('dropOffLatitude'),'10.77257');assert.equal(inner.searchParams.has('pickUpLatitude'),false);
place.lat=null;w.document.querySelector('button').click();assert.equal(new URL(new URL(w.document.querySelector('#openGrabApp').href).searchParams.get('af_dp')).searchParams.has('dropOffLatitude'),false);
dom.window.close();console.log('PASS Grab destination encoding, coordinates, no invented pickup and missing coordinate fallback');
