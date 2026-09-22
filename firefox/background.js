// Discord への通信と重複送信の管理を行います。Webhook URL はログに出しません。
const api = globalThis.chrome ?? globalThis.browser;

const STORAGE_KEYS = {
  webhookUrl: "discordWebhookUrl",
  recentSends: "recentSends"
};
const DEDUPE_WINDOW_MS = 10 * 60 * 1000;
// true にすると、いいね解除の検知時に重複記録を削除します。
// その後もう一度いいねすると、すぐでも再送できます。
const ALLOW_RELIKE_AFTER_UNLIKE = true;
// storage.local への書き込み前に同時クリックが来ても二重送信しないためのメモリ上のロックです。
const pendingSends = new Set();

function storageGet(keys) {
  return new Promise((resolve, reject) => {
    api.storage.local.get(keys, (value) => {
      const error = api.runtime.lastError;
      if (error) reject(new Error(error.message));
      else resolve(value);
    });
  });
}

function storageSet(value) {
  return new Promise((resolve, reject) => {
    api.storage.local.set(value, () => {
      const error = api.runtime.lastError;
      if (error) reject(new Error(error.message));
      else resolve();
    });
  });
}

function isWebhookUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "discord.com" &&
      /^\/api\/webhooks\/\d+\/.+/.test(url.pathname);
  } catch {
    return false;
  }
}

function cleanRecentSends(recent, now = Date.now()) {
  return Object.fromEntries(Object.entries(recent || {}).filter(
    ([, sentAt]) => Number.isFinite(sentAt) && now - sentAt < DEDUPE_WINDOW_MS
  ));
}

async function sendWebhook(webhookUrl, content) {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, allowed_mentions: { parse: [] } })
  });
  if (!response.ok) throw new Error(`Discord returned HTTP ${response.status}`);
}

async function sendLikedPost(postUrl) {
  if (pendingSends.has(postUrl)) return { sent: false, reason: "duplicate" };
  pendingSends.add(postUrl);
  try {
    const data = await storageGet([STORAGE_KEYS.webhookUrl, STORAGE_KEYS.recentSends]);
    if (!isWebhookUrl(data[STORAGE_KEYS.webhookUrl])) {
      throw new Error("Discord Webhook URL が設定されていません。");
    }
    const now = Date.now();
    const recent = cleanRecentSends(data[STORAGE_KEYS.recentSends], now);
    if (recent[postUrl]) {
      await storageSet({ [STORAGE_KEYS.recentSends]: recent });
      return { sent: false, reason: "duplicate" };
    }
    await sendWebhook(data[STORAGE_KEYS.webhookUrl], `❤️ Xでいいねしました\n\n${postUrl}`);
    recent[postUrl] = now;
    await storageSet({ [STORAGE_KEYS.recentSends]: recent });
    return { sent: true };
  } finally {
    pendingSends.delete(postUrl);
  }
}

api.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    if (message?.type === "liked-post") return sendLikedPost(message.postUrl);
    if (message?.type === "unliked-post" && ALLOW_RELIKE_AFTER_UNLIKE) {
      const data = await storageGet(STORAGE_KEYS.recentSends);
      const recent = cleanRecentSends(data[STORAGE_KEYS.recentSends]);
      delete recent[message.postUrl];
      await storageSet({ [STORAGE_KEYS.recentSends]: recent });
      return { removed: true };
    }
    if (message?.type === "test-webhook") {
      const data = await storageGet(STORAGE_KEYS.webhookUrl);
      if (!isWebhookUrl(data[STORAGE_KEYS.webhookUrl])) {
        throw new Error("有効な Discord Webhook URL を先に保存してください。");
      }
      await sendWebhook(data[STORAGE_KEYS.webhookUrl], "X → Discord連携テスト成功！");
      return { sent: true };
    }
    throw new Error("不明なメッセージです。");
  })().then(sendResponse).catch((error) => sendResponse({ error: error.message }));
  return true;
});

api.action.onClicked.addListener(() => api.runtime.openOptionsPage());
