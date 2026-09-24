const {test}=require('node:test');
const assert=require('node:assert/strict');
require('../core.js');
// Xの日時アンカーと引用カードの属性・親子関係を再現する。
function articleFixture() {
 const links=[];
 const article={querySelectorAll:()=>links,getAttribute:()=>null};
 function wrapper(attrs={},parent=article){return {parentElement:parent,getAttribute:key=>attrs[key] || null};}
 function link(id,{parent=article,owner=article,time=true,role='link'}={}) {
  const a={href:`https://x.com/user/status/${id}?s=20`,parentElement:parent,
   getAttribute:key=>key==='role'?role:null,
   closest:selector=>selector==='article'?owner:selector.includes('role')&&role==='link'?a:null,
   querySelector:selector=>selector==='time'&&time?{}:null};
  links.push(a);return a;
 }
 return {article,link,wrapper};
}
test('日時アンカー自身のrole=linkを許可する（今回の回帰）',()=>{
 const f=articleFixture();f.link('123');
 assert.equal(XLD.findPost(f.article).url,'https://x.com/user/status/123');
});
test('引用カードのrole=link内の日時は除外する',()=>{
 const f=articleFixture();f.link('123');f.link('456',{parent:f.wrapper({role:'link'})});
 assert.equal(XLD.findPost(f.article).id,'123');
});
test('quoteTweet属性と別articleの投稿リンクも除外する',()=>{
 const f=articleFixture();f.link('123');
 f.link('456',{parent:f.wrapper({},f.wrapper({'data-testid':'quoteTweet'}))});
 f.link('789',{owner:{}});
 assert.equal(XLD.findPost(f.article).id,'123');
});
test('日時リンク優先・同一ID重複・曖昧な日時リンク',()=>{
 const f=articleFixture();f.link('123');f.link('123');f.link('456',{time:false});
 assert.equal(XLD.findPost(f.article).id,'123');
 f.link('789');assert.equal(XLD.findPost(f.article),null);
});
test('日時なしでも候補が一意なら取得し、引用しかなければ送らない',()=>{
 const f=articleFixture();f.link('123',{time:false});assert.equal(XLD.findPost(f.article).id,'123');
 const g=articleFixture();g.link('456',{parent:g.wrapper({role:'link'})});assert.equal(XLD.findPost(g.article),null);
});
