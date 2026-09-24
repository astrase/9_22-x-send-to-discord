const api = globalThis.browser || globalThis.chrome;
const form = document.querySelector('#form');
const status = document.querySelector('#status');
const webhook = document.querySelector('#webhook');
const hours = document.querySelector('#hours');
const enabled = document.querySelector('#enabled');
const useFixup = document.querySelector('#use-fixup');
async function request(message) {
  const result = await api.runtime.sendMessage(message);
  if (!result?.ok) throw new Error(result?.error || '拡張機能を再読み込みしてください。');
  return result;
}
async function busy(task) {
  [...form.elements].forEach(el => el.disabled = true);
  try { await task(); } catch (error) { status.textContent = error.message; }
  finally { [...form.elements].forEach(el => el.disabled = false); }
}
busy(async () => {
  const {settings} = await request({type:'LOAD'});
  webhook.value = settings.webhook || '';
  hours.value = settings.hours || 24;
  enabled.checked = !!settings.enabled;
  useFixup.checked = settings.useFixup === true;
});
form.addEventListener('submit',event => {
  event.preventDefault();
  busy(async () => {
    await request({type:'SAVE',webhook:webhook.value.trim(),hours:Number(hours.value),enabled:enabled.checked,useFixup:useFixup.checked});
    status.textContent = '設定を保存しました。';
  });
});
document.querySelector('#test').addEventListener('click',() => busy(async () => {
  status.textContent = '送信中…';
  await request({type:'TEST'});
  status.textContent = '✓ Discordにテストメッセージを送信しました。';
}));

// テーマはWebhook設定とは独立して即時保存する。
const theme = document.querySelector('#theme');
const themeLabel = document.querySelector('#theme-label');
function applyTheme(dark) {
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  theme.checked = dark;
  themeLabel.textContent = dark ? 'ダークモード' : 'ライトモード';
}
applyTheme(matchMedia('(prefers-color-scheme: dark)').matches);
theme.disabled = true;
api.storage.local.get('theme').then(data => {
  if (data.theme === 'dark' || data.theme === 'light') applyTheme(data.theme === 'dark');
}).catch(() => { status.textContent = 'テーマ設定を読み込めませんでした。'; })
  .finally(() => { theme.disabled = false; });
theme.addEventListener('change',async () => {
  const dark = theme.checked;
  applyTheme(dark); theme.disabled = true;
  try { await api.storage.local.set({theme:dark ? 'dark' : 'light'}); }
  catch { status.textContent = 'テーマを保存できませんでした。'; }
  finally { theme.disabled = false; }
});
