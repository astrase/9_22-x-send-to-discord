/* URL検証・投稿DOMからのURL抽出・重複判定の共通処理。 */
(() => {
  const DEFAULT_HOURS = 24;
  function postURL(value) {
    try {
      const u = new URL(value, 'https://x.com');
      if (u.protocol !== 'https:' || !['x.com', 'twitter.com'].includes(u.hostname) || u.username || u.password || u.port) return null;
      const m = u.pathname.match(/^\/([A-Za-z0-9_]{1,15})\/status\/(\d+)(?:\/(?:photo|video)\/\d+)?\/?$/);
      if (!m) return null;
      return { id: m[2], url: `https://x.com/${m[1]}/status/${m[2]}` };
    } catch { return null; }
  }
  function webhookURL(value) {
    try {
      const u = new URL(value.trim());
      if (u.protocol !== 'https:' || u.hostname !== 'discord.com' || u.port || u.username || u.password || u.search || u.hash) return null;
      if (!/^\/api(?:\/v\d+)?\/webhooks\/\d+\/[A-Za-z0-9_-]+\/?$/.test(u.pathname)) return null;
      return u.href.replace(/\/$/, '');
    } catch { return null; }
  }
  function hours(value) { const n = Number(value); return Number.isFinite(n) && n >= 1 && n <= 8760 ? n : DEFAULT_HOURS; }
  function duplicate(record, now, windowHours) {
    return !!record && now - record.at < (record.state === 'pending' ? 120000 : hours(windowHours) * 3600000);
  }
  function findPost(article) {
    // 日時アンカー自身のrole="link"は正常。親の引用カードだけを除外する。
    const links = [...article.querySelectorAll('a[href]')].filter(a => {
      if (a.closest('article') !== article) return false;
      if (a.getAttribute('data-testid') === 'quoteTweet') return false;
      for (let parent = a.parentElement; parent && parent !== article; parent = parent.parentElement) {
        if (parent.getAttribute('data-testid') === 'quoteTweet' ||
            parent.getAttribute('role') === 'link') return false;
      }
      return true;
    });
    const dated = links.filter(a => a.querySelector('time'));
    const candidates = (dated.length ? dated : links).map(a => XLD.postURL(a.href)).filter(Boolean);
    const unique = [...new Map(candidates.map(p => [p.id,p])).values()];
    return unique.length === 1 ? unique[0] : null; // 推測して別の投稿を送らない
  }
  function fixupURL(value) {
    const post = postURL(value);
    return post ? post.url.replace('https://x.com/', 'https://fixupx.com/') : null;
  }
  globalThis.XLD = {findPost, fixupURL, postURL, webhookURL, hours, duplicate, DEFAULT_HOURS};
})();
