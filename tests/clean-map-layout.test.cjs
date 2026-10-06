const fs=require('fs'),{JSDOM}=require('jsdom'),assert=require('node:assert/strict');
for(const width of [390,1440]){
const w=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://example.test',runScripts:'outside-only'}).window;w.innerWidth=width;let opened=0,closed=0;
w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};w.ListLayout={setCollapsed:()=>{}};w.ChatDock={close:()=>closed++};w.DestinationLine={clear:()=>{}};
for(const id of ['chatQuickPeople','chatQuickAi']){const b=w.document.createElement('button');b.id=id;b.textContent=id;b.onclick=()=>opened++;w.document.body.append(b);}
w.eval(fs.readFileSync('assets/js/clean-map-layout.js','utf8'));
const d=w.document;assert(d.body.classList.contains('cleanMap'));assert.equal(d.querySelectorAll('#locBtn').length,1);assert.equal(d.getElementById('locBtn').parentNode.className,'mapwrap');assert.equal(d.querySelectorAll('#mapMainMenu #addBtn').length,1);assert(d.querySelector('#mapMainMenu .operatorOptions').hidden);assert.equal(d.querySelectorAll('#mapBottomNav button').length,3);
d.getElementById('mapMenuButton').click();assert(d.getElementById('mapMainMenu').open);d.getElementById('shareMapApp').click();assert(!d.getElementById('mapMainMenu').open);d.getElementById('chatQuickPeople').click();assert.equal(opened,1);d.getElementById('cleanExplore').click();assert.equal(closed,1);w.close();
}console.log('PASS mobile/desktop control identity, menu access, admin visibility, existing chat handlers and single navigation');
