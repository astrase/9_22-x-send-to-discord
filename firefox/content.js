// X は SPA のため、document 全体でクリックを捕捉します。
const api = globalThis.chrome ?? globalThis.browser;
const NOTICE_ID = "x-like-to-discord-notice";

function getStatusUrl(element) {
  const article = element.closest("article");
  if (!article) return null;
  const link = [...article.querySelectorAll('a[href*="/status/"]')].find((anchor) =>
    /^\/(?:i\/web\/)?[^/]+\/status\/\d+/.test(anchor.getAttribute("href") || "")
  );
  if (!link) return null;
  const match = (link.getAttribute("href") || "").match(/^\/(?:i\/web\/)?([^/]+)\/status\/(\d+)/);
  return match ? `https://x.com/${match[1]}/status/${match[2]}` : null;
}

function showNotice(text, isError = false) {
  document.getElementById(NOTICE_ID)?.remove();
  const notice = document.createElement("div");
  notice.id = NOTICE_ID;
  notice.textContent = text;
  notice.style.cssText = [
    "position:fixed", "right:20px", "bottom:20px", "z-index:2147483647",
    "padding:12px 16px", "border-radius:10px", "color:#fff",
    `background:${isError ? "#b91c1c" : "#166534"}`,
    "font:14px system-ui,sans-serif", "box-shadow:0 4px 14px #0005"
  ].join(";");
  document.documentElement.append(notice);
  setTimeout(() => notice.remove(), 3500);
}

function messageBackground(message) {
  return new Promise((resolve) => {
    api.runtime.sendMessage(message, (response) => {
      const error = api.runtime.lastError;
      resolve(error ? { error: error.message } : response || { error: "応答がありません。" });
    });
  });
}

document.addEventListener("click", async (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  // "like" は未いいね時のアクション、"unlike" は解除時のアクションです。
  const likeButton = target.closest('[data-testid="like"], [data-testid="unlike"]');
  if (!likeButton) return;
  const postUrl = getStatusUrl(likeButton);
  if (!postUrl) return;
  if (likeButton.getAttribute("data-testid") === "unlike") {
    messageBackground({ type: "unliked-post", postUrl });
    return;
  }
  const result = await messageBackground({ type: "liked-post", postUrl });
  if (result?.sent) showNotice("✓ Discordに保存しました");
  else if (result?.reason !== "duplicate") showNotice("Discordへの送信に失敗しました", true);
}, true);
