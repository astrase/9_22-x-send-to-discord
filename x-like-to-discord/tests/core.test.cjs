const {test} = require('node:test');
const assert = require('node:assert/strict');
require('../core.js');
test('投稿URLの正規化・クエリ削除・画像URL',()=>{
 assert.deepEqual(XLD.postURL('https://twitter.com/user/status/123/photo/1?s=20'),{id:'123',url:'https://x.com/user/status/123'});
});
test('不正な投稿URLを拒否',()=>{
 for(const value of ['https://evil.com/u/status/1','https://x.com.evil.com/u/status/1','javascript:alert(1)','https://x.com/home','https://x.com:444/u/status/1']) assert.equal(XLD.postURL(value),null);
});
test('Webhook宛先・資格情報・query検証',()=>{
 assert.equal(XLD.webhookURL('https://discord.com/api/webhooks/123/abc_DEF-1'),'https://discord.com/api/webhooks/123/abc_DEF-1');
 for(const value of ['https://evil.com/api/webhooks/1/token','http://discord.com/api/webhooks/1/token','https://discord.com/api/webhooks/1/token?x=1','https://user@discord.com/api/webhooks/1/token','https://discord.com/channels/1']) assert.equal(XLD.webhookURL(value),null);
});
test('再いいねの期限と不明な送信の2分予約',()=>{
 const now=100000000;
 assert.equal(XLD.duplicate({at:now-1000,state:'sent'},now,24),true);
 assert.equal(XLD.duplicate({at:now-86400000,state:'sent'},now,24),false);
 assert.equal(XLD.duplicate({at:now-120000,state:'pending'},now,24),false);
 assert.equal(XLD.hours(-1),24);
});
test('Fixup変換は投稿URLのみ、クエリ除去・外部通信不要',()=>{
 assert.equal(XLD.fixupURL('https://x.com/user/status/123?s=20'),'https://fixupx.com/user/status/123');
 assert.equal(XLD.fixupURL('https://twitter.com/user/status/123/photo/2'),'https://fixupx.com/user/status/123');
 assert.equal(XLD.fixupURL('https://evil.com/user/status/123'),null);
 assert.equal(XLD.fixupURL('https://x.com/home'),null);
});
