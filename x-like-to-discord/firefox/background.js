/* ChromeではService Worker、Firefoxではイベントページ。 */
if (typeof importScripts === 'function') importScripts('core.js');
const api = globalThis.browser || globalThis.chrome;
// Chromeではcontent scriptから秘密の設定を読めないようにする。
const ready = api.storage.local.setAccessLevel
  ? api.storage.local.setAccessLevel({accessLevel: 'TRUSTED_CONTEXTS'}) : Promise.resolve();
let queue = Promise.resolve();
function serial(task) {
  const result = queue.then(task);
  queue = result.catch(() => {});
  return result;
}
function authorized(sender, type) {
  if (sender.id !== api.runtime.id) return false;
  if (type === 'LIKE') {
    try { return !!sender.tab && sender.frameId === 0 && new URL(sender.url).origin === 'https://x.com'; } catch { return false; }
  }
  return sender.url === api.runtime.getURL('options.html');
}
async function send(webhook, content) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${webhook}?wait=true`, {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({content, allowed_mentions: {parse: []}}),
      credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error', signal: controller.signal
    });
    if (response.status === 429) {
      let data = {}; try { data = await response.json(); } catch {}
      const seconds = Number(data.retry_after || response.headers.get('Retry-After'));
      return {ok:false, error:'送信が混み合っています。少し待ってから再度お試しください。', retrySeconds: Math.min(86400, Math.max(1, seconds || 5)), definite:true};
    }
    if (!response.ok) return {ok:false, error:`Discordへの送信に失敗しました（HTTP ${response.status}）。設定を確認してください。`, definite:response.status < 500};
    return {ok:true};
  } catch { return {ok:false, error:'通信結果を確認できませんでした。Discordを確認してから再試行してください。'}; }
  finally { clearTimeout(timeout); }
}
async function handle(message, sender) {
  await ready;
  if (!message || !['LIKE','TEST','SAVE','LOAD'].includes(message.type) || !authorized(sender,message.type)) return {ok:false,error:'許可されていない操作です。'};
  const data = await api.storage.local.get(['settings','history','cooldownUntil']);
  const settings = data.settings || {};
  if (message.type === 'LOAD') return {ok:true, settings};
  if (message.type === 'SAVE') {
    const webhook = XLD.webhookURL(message.webhook);
    if (!webhook && message.webhook !== '') return {ok:false,error:'discord.comのWebhook URLを確認してください。'};
    await api.storage.local.set({settings:{webhook:webhook || '', hours:XLD.hours(message.hours), enabled:!!message.enabled, useFixup:message.useFixup === true}});
    return {ok:true};
  }
  if (message.type === 'LIKE' && !settings.enabled) return {ok:true, skipped:'disabled'};
  const webhook = XLD.webhookURL(settings.webhook || '');
  if (!webhook) return {ok:false,error:'設定画面でWebhook URLを保存してください。'};
  if (Date.now() < (data.cooldownUntil || 0)) return {ok:false,error:'Discordの送信制限中です。少し待ってください。'};
  let post, history;
  if (message.type === 'LIKE') {
    post = XLD.postURL(message.url);
    if (!post) return {ok:false,error:'投稿URLを確認できませんでした。'};
    const now = Date.now();
    history = data.history || {};
    if (XLD.duplicate(history[post.id],now,settings.hours)) return {ok:true, skipped:'duplicate'};
    // 1年を超えた履歴を整理。成功履歴は時刻とIDだけを保存する。
    for (const [id,record] of Object.entries(history)) if (now-record.at > 8760*3600000) delete history[id];
    // 送信前に予約。Worker停止時の直後の再送も抑止する。
    history[post.id] = {at:now,state:'pending'};
    await api.storage.local.set({history});
  }
  const outgoingURL = post ? (settings.useFixup === true ? XLD.fixupURL(post.url) : post.url) : null;
  const result = await send(webhook, post ? `❤️ Xでいいねしました\n\n${outgoingURL}` : 'X → Discord連携テスト成功！');
  if (result.retrySeconds) await api.storage.local.set({cooldownUntil:Date.now()+result.retrySeconds*1000});
  if (post) {
    if (result.ok) history[post.id] = {at:Date.now(),state:'sent'};
    else if (result.definite) delete history[post.id];
    // タイムアウト等は配信済みか不明なので予約を2分保持する。
    try { await api.storage.local.set({history}); }
    catch { return {ok:false,error:'送信後の履歴保存に失敗しました。Discordを確認してください。'}; }
  }
  return result;
}
api.runtime.onMessage.addListener((message,sender,respond) => {
  serial(() => handle(message,sender)).then(respond, () => respond({ok:false,error:'処理に失敗しました。拡張機能を再読み込みしてください。'}));
  return true; // Chrome / Firefox共通の非同期応答形式
});
api.action.onClicked.addListener(() => { api.runtime.openOptionsPage().catch(() => {}); });
