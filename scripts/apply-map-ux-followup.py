"""Update regression fixtures for explicit-grip resizing and existing 30-minute visits."""
from pathlib import Path

def change(file, old, new):
    p = Path(file)
    text = p.read_text()
    assert old in text, (file, old)
    p.write_text(text.replace(old, new))

change('assets/js/detail-resize.js', "'.detailResizeHandle,.detailHeader,.detailQuickActions,.externalMeta'", "'.detailResizeHandle,.detailHeader,.browseNavigation,.externalRegisterBar,.detailQuickActions,.externalMeta'")
for name in ['benefit-scope', 'classification-scopes', 'geography-regressions', 'rating-scope']:
    change('tests/'+name+'.test.cjs', ".filter(f=>f.endsWith('.js')&&!f.startsWith('09-'))", ".filter(f=>/^(0[1-8]|10)-/.test(f)&&f.endsWith('.js'))")
change('tests/classification-scopes.test.cjs', 'context.window=context;', 'context.window=context;context.matchMedia=()=>({matches:false});')
change('tests/classification-scopes.test.cjs', 'renderHierarchyNav=()=>{};', 'renderHierarchyNav=()=>{};syncMapFilterSummary=()=>{};')
change('tests/classification-scopes.test.cjs', "'golf-nav':'golf'", "'golf-nav':'golf',hospital:'hospital',pharmacy:'pharmacy'")
change('tests/geography-regressions.test.cjs', 'ctx.window=ctx;', 'ctx.window=ctx;ctx.matchMedia=()=>({matches:false});')
change('tests/geography-regressions.test.cjs', 'google={maps:{Circle:TestCircle}};', 'google={maps:{Circle:TestCircle,Marker:TestCircle,Size:class{},Point:class{}}};')
change('tests/geography-regressions.test.cjs', 'createSelectedPoiMarker=()=>{};createGolfMarker=()=>{};', 'createSelectedPoiMarker=()=>{};createGolfMarker=()=>{};makeAreaLabel=()=>({setMap(){}});')
change('tests/community-stats.test.cjs', "#totalVisits').textContent==='2'", "#totalVisits').textContent==='1'")
change('tests/community-stats.test.cjs', "assert.equal(visits.size,2,'reload must increase visits once');", "assert.equal(visits.size,1,'reload within the 30-minute window must not double-count visits');")
change('tests/community-stats.test.cjs', 'page views including reloads', '30-minute reload deduplication')
change('tests/map-membership.test.cjs', ' dom.window.close();', ' await w.MapMembership.loadBadges();await flush();\n dom.window.close();')
change('tests/body-sheet-drag.test.cjs', ' dom.window.close();', ' await new Promise(resolve=>setImmediate(resolve));\n dom.window.close();')
f='tests/detail-resize.test.cjs'
change(f, 'event(title,', 'event(handle,')
change(f, '// Genuine TouchEvent path on the nested title span, rather than a fake touch PointerEvent.', '// Genuine touch/mouse gestures use the explicit resize grip. Title links remain clickable.')
change(f, "event(handle,'down');event(handle,'up');title.click();assert.equal(clicks,1);", "event(title,'down');event(title,'up');title.click();assert.equal(clicks,1);\n const initial=height();event(title,'down',500);assert.equal(event(title,'move',360).defaultPrevented,false);event(title,'up',360);assert.equal(height(),initial,'title button cannot resize the sheet');")
change(f, '// Title drag can shrink even when the body has been scrolled.', '// Grip drag can shrink even when the body has been scrolled.')
change(f, '// An upward body swipe expands even when its content was previously scrolled.', '// An upward body swipe scrolls natively and never changes the sheet height.')
change(f, "event(body,'down',500);assert.equal(event(body,'move',400).defaultPrevented,true);advance(16);assert(height()>previous);event(body,'cancel',400);", "event(body,'down',500);assert.equal(event(body,'move',400).defaultPrevented,false);advance(16);assert.equal(height(),previous);event(body,'cancel',400);")
change(f, "event(body,'down',500);event(body,'move',250);event(body,'up',250);", "event(handle,'down',500);event(handle,'move',250);event(handle,'up',250);")
change(f, "event(body,'down',500);advance(100);event(body,'move',300);event(body,'up',300);", "event(handle,'down',500);advance(100);event(handle,'move',300);event(handle,'up',300);")
change(f, 'title and body paths', 'grip resizing and native title/body paths')
Path(__file__).unlink()
