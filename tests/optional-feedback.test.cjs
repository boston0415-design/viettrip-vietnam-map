const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const path=require('node:path');
const ctx=vm.createContext({console,assert,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},URL,Map,Set,Promise});
ctx.window=ctx;ctx.document={addEventListener(){},querySelector(){return {value:'',classList:{toggle(){},add(){},remove(){}}}},querySelectorAll(){return []}};
for(const file of fs.readdirSync(path.join(__dirname,'../assets/js')).filter(f=>/^\d/.test(f)&&f.endsWith('.js')&&!f.startsWith('09-')).sort())vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets/js',file),'utf8'),ctx);
vm.runInContext(`
const sample={places:[{id:'p',initialRating:null}],reviews:[{id:'a',placeId:'p',rating:4,text:''},{id:'b',placeId:'p',rating:null,text:'text only'}]};
db=()=>sample;
assert.equal(stats('p').rating,4);assert.equal(stats('p').count,1);assert.equal(stats('p').reviews.length,1);
sample.reviews[0].rating=null;assert.equal(stats('p').rating,null);assert.equal(stats('p').count,0);
assert.equal(remoteReviewToLocal({rating:null}).rating,null);
assert.equal(reviewToRemote({rating:null,createdBy:'device'}).rating,null);
assert.equal(remoteReviewToLocal({rating:'5'}).rating,5);
console.log('PASS optional feedback: review-only excluded from averages, rating-only excluded from reviews, null round trip');
`,ctx);
