const api = globalThis.chrome ?? globalThis.browser;
const input = document.getElementById("webhook-url");
const status = document.getElementById("status");

function storageGet(key) { return new Promise((resolve) => api.storage.local.get(key, resolve)); }
function storageSet(value) { return new Promise((resolve) => api.storage.local.set(value, resolve)); }
function send(message) { return new Promise((resolve) => api.runtime.sendMessage(message, resolve)); }
function setStatus(text, error = false) { status.textContent = text; status.className = error ? "error" : "success"; }
function validWebhook(value) { return /^https:\/\/discord\.com\/api\/webhooks\/\d+\/.+/.test(value); }

(async () => { input.value = (await storageGet("discordWebhookUrl")).discordWebhookUrl || ""; })();
document.getElementById("save").addEventListener("click", async () => {
  const url = input.value.trim();
  if (!validWebhook(url)) return setStatus("Discord Webhook URL の形式を確認してください。", true);
  await storageSet({ discordWebhookUrl: url });
  setStatus("保存しました。");
});
document.getElementById("test").addEventListener("click", async () => {
  const response = await send({ type: "test-webhook" });
  setStatus(response?.error || "テストメッセージを送信しました。", Boolean(response?.error));
});
