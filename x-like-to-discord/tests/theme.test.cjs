const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
test('テーマを復元し、切り替えを保存する。Webhook設定は変更しない',async()=>{
 const elements={};
 for(const id of ['form','status','webhook','hours','enabled','test','theme','theme-label','use-fixup']) elements['#'+id]={elements:[],events:{},addEventListener(name,fn){this.events[name]=fn;}};
 const stored={theme:'dark'};
 const document={documentElement:{dataset:{}},querySelector:s=>elements[s]};
 const browser={runtime:{sendMessage:async()=>({ok:true,settings:{}})},storage:{local:{get:async()=>stored,set:async data=>Object.assign(stored,data)}}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../options.js'),'utf8'),{document,browser,matchMedia:()=>({matches:false})});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(document.documentElement.dataset.theme,'dark');
 elements['#theme'].checked=false;
 await elements['#theme'].events.change();
 assert.equal(document.documentElement.dataset.theme,'light');
 assert.deepEqual(stored,{theme:'light'});
});
