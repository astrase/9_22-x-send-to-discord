const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
function fixture(namespace='chrome') {
 let listener,observer;const calls=[];
 class Element {}
 const group={isConnected:true,querySelector:()=>null};
 const article={querySelectorAll:()=>[{href:'https://x.com/user/status/88?s=20',getAttribute:()=>null,closest:s=>s==='article'?article:null,querySelector:()=>({})}]};
 const button={isConnected:true,state:'like',closest:s=>s==='article'?article:group,getAttribute(){return this.state;}};
 const target=new Element();target.closest=()=>button.state==='like'?button:null;
 const document={addEventListener:(name,fn)=>listener=fn};
 const api={runtime:{sendMessage:async message=>{calls.push(message);return {skipped:'disabled'};}}};
 const context=vm.createContext({[namespace]:api,URL,Element,document,setTimeout:()=>1,clearTimeout(){},MutationObserver:class{constructor(fn){observer=fn;}observe(){}disconnect(){}}});
 for(const file of ['core.js','content.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);
 return {button,calls,click:(trusted=true)=>listener({isTrusted:trusted,button:0,target}),change:()=>observer?.()};
}
for(const namespace of ['chrome','browser']) {
 test(namespace+': クリック後の状態変化で送信、解除は送信しない',async()=>{
  const f=fixture(namespace);f.click();assert.equal(f.calls.length,0);
  f.button.state='unlike';f.change();await Promise.resolve();assert.equal(f.calls.length,1);
  assert.equal(f.calls[0].url,'https://x.com/user/status/88');f.click();assert.equal(f.calls.length,1);
 });
}
test('スクリプトによる偽クリックを拒否',()=>{const f=fixture();f.click(false);f.button.state='unlike';f.change();assert.equal(f.calls.length,0);});
