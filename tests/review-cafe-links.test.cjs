const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx=vm.createContext({console,assert,URL,Map,Set,Date,setTimeout:()=>0,clearTimeout(){}});
ctx.window=ctx;ctx.document={querySelector:()=>null,querySelectorAll:()=>[]};
for(const f of ['01-data-storage.js','02-services-media.js','03-business-ui.js'])vm.runInContext(fs.readFileSync(`${__dirname}/../assets/js/${f}`,'utf8'),ctx);
vm.runInContext(`
 for(const url of ['https://naver.me/5394bkDO','https://naver.me/5394bkD0','https://naver.me/Ab12Cd34?from=share','https://cafe.naver.com/talkvietnam/123','https://m.cafe.naver.com/talkvietnam/123?ref=share','https://cafe.naver.com/ca-fe/cafes/123/articles/456','https://m.cafe.naver.com/ArticleRead.nhn?clubid=123&articleid=456'])assert.equal(normalizeCafeReviewUrl(url),url);
 assert.equal(normalizeCafeReviewUrl('http://cafe.naver.com/talkvietnam/123#comment'),'https://cafe.naver.com/talkvietnam/123');
 for(const url of ['https://naver.me.evil.com/5394bkDO','https://naver.me@evil.com/5394bkDO','https://user@naver.me/5394bkDO','https://naver.me/','https://naver.me/a/b','https://naver.me/%2Fexample','https://naver.me:123/5394bkDO','javascript:alert(1)','https://cafe.naver.com.evil.com/talkvietnam/123','https://cafe.naver.com@evil.com/talkvietnam/123','https://cafe.naver.com/talkvietnam','https://cafe.naver.com/redirect?url=https://evil.com','https://cafe.naver.com:123/talkvietnam/1','https://user@cafe.naver.com/talkvietnam/123'])assert.equal(normalizeCafeReviewUrl(url),null,url);
 assert.equal(normalizeCafeReviewUrl('  http://naver.me/5394bkDO#share  '),'https://naver.me/5394bkDO');
 assert.equal(normalizeCafeReviewUrl(''),'');
 assert.equal(remoteReviewToLocal({cafe_url:'https://cafe.naver.com/talkvietnam/1'}).cafeUrl,'https://cafe.naver.com/talkvietnam/1');
 for(const sub of ['한식','일식','베트남','중식','양식','기타'])assert(CONFIG.categories.restaurant.subs.includes(sub));
 assert.equal(new Set(RESTAURANT_TAGS).size,RESTAURANT_TAGS.length);
 for(const tag of ['고기·구이','해산물','채식','야식','오마카세','브런치'])assert(RESTAURANT_TAGS.includes(tag));
 assert(hasRestaurantTag({subcategory:'이탈리아',tags:['파스타','채식']},'파스타'));
 assert(hasRestaurantTag({subcategory:'고기집'},'고기·구이'));
 console.log('PASS Cafe article URL validation, safe public mapping, expanded cuisine tags and legacy compatibility');
`,ctx);
