const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
function fixture(status=200) {
 const state={settings:{enabled:true,webhook:'https://discord.com/api/webhooks/123/test_token',hours:24}};
 let listener; const calls=[];
 const api={runtime:{id:'test',getURL:p=>'extension://test/'+p,onMessage:{addListener:f=>listener=f}},storage:{local:{get:async()=>structuredClone(state),set:async data=>Object.assign(state,structuredClone(data))}},action:{onClicked:{addListener(){}}}};
 const context=vm.createContext({browser:api,URL,AbortController,setTimeout,clearTimeout,fetch:async(url,options)=>{calls.push({url,options});return {ok:status===200,status,json:async()=>({retry_after:3}),headers:{get:()=>null}};}});
 for(const name of ['core.js','background.js']) vm.runInContext(fs.readFileSync(path.join(__dirname,'..',name),'utf8'),context);
 const sender={id:'test',tab:{id:1},frameId:0,url:'https://x.com/home'};
 return {state,calls,send:(msg,s=sender)=>new Promise(resolve=>listener(msg,s,resolve))};
}
test('並行する同一投稿を1回だけ送信し保存',async()=>{
 const f=fixture(); const msg={type:'LIKE',url:'https://x.com/user/status/123'};
 const results=await Promise.all([f.send(msg),f.send(msg)]);
 assert.equal(f.calls.length,1);assert.equal(results[1].skipped,'duplicate');assert.equal(f.state.history['123'].state,'sent');
 const call=f.calls[0];assert.equal(call.options.redirect,'error');assert.equal(call.options.credentials,'omit');
 assert.deepEqual(JSON.parse(call.options.body),{content:'❤️ Xでいいねしました\n\nhttps://x.com/user/status/123',allowed_mentions:{parse:[]}});
});
test('content scriptから設定取得や任意送信先の変更を拒否',async()=>{
 const f=fixture();assert.equal((await f.send({type:'LOAD'})).ok,false);
 assert.equal((await f.send({type:'LIKE',url:'https://evil.com/u/status/1'})).ok,false);assert.equal(f.calls.length,0);
});
test('設定画面からテスト送信',async()=>{
 const f=fixture();assert.equal((await f.send({type:'TEST'},{id:'test',url:'extension://test/options.html',tab:{id:2}})).ok,true);
 assert.equal(JSON.parse(f.calls[0].options.body).content,'X → Discord連携テスト成功！');
});
test('429の待機期限・確定失敗時の予約解除',async()=>{
 const f=fixture(429);const msg={type:'LIKE',url:'https://x.com/u/status/1'};
 assert.equal((await f.send(msg)).ok,false);assert.equal(f.state.history['1'],undefined);assert.ok(f.state.cooldownUntil>Date.now());
 await f.send(msg);assert.equal(f.calls.length,1);
});
test('無効時は送信しない',async()=>{
 const f=fixture();f.state.settings.enabled=false;
 assert.equal((await f.send({type:'LIKE',url:'https://x.com/u/status/1'})).skipped,'disabled');assert.equal(f.calls.length,0);
});
test('Fixup ONで変換、OFFで通常URLを送る',async()=>{
 for(const on of [true,false]) {
  const f=fixture();
  const sender={id:'test',url:'extension://test/options.html'};
  await f.send({type:'SAVE',webhook:f.state.settings.webhook,hours:24,enabled:true,useFixup:on},sender);
  const loaded=await f.send({type:'LOAD'},sender);
  assert.equal(loaded.settings.useFixup,on);
  await f.send({type:'LIKE',url:'https://x.com/user/status/123?s=20'});
  assert.equal(JSON.parse(f.calls[0].options.body).content,`❤️ Xでいいねしました\n\nhttps://${on?'fixupx.com':'x.com'}/user/status/123`);
 }
});
test('Fixupを切り替えても同一投稿の二重送信を防ぐ',async()=>{
 const f=fixture();const msg={type:'LIKE',url:'https://x.com/user/status/123'};
 await f.send(msg);f.state.settings.useFixup=true;
 assert.equal((await f.send(msg)).skipped,'duplicate');assert.equal(f.calls.length,1);
});
