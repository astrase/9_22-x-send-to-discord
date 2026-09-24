(() => {
  if (globalThis.__xldInstalled) return;
  globalThis.__xldInstalled = true;
  const api = globalThis.browser || globalThis.chrome;
  const pending = new WeakSet();
  function toast(text) {
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;right:20px;bottom:24px;z-index:2147483647;pointer-events:none;max-width:calc(100vw - 40px)';
    const shadow = host.attachShadow({mode:'closed'});
    const box = document.createElement('div');
    box.setAttribute('role','status');
    box.style.cssText = 'background:#172536;color:white;padding:14px 18px;border-radius:12px;font:14px/1.6 system-ui;box-shadow:0 4px 20px #0005';
    box.textContent = text;
    shadow.append(box); document.documentElement.append(host);
    setTimeout(() => host.remove(),5000);
  }
  document.addEventListener('click', event => {
    if (!event.isTrusted || event.button !== 0 || !(event.target instanceof Element)) return;
    const button = event.target.closest('[data-testid="like"]');
    if (!button || pending.has(button)) return; // unlikeボタンは対象外
    const article = button.closest('article');
    if (!article) { toast('投稿を特定できませんでした。投稿の詳細画面でお試しください。'); return; }
    const post = XLD.findPost(article);
    if (!post) { toast('投稿URLを取得できませんでした。投稿の詳細画面でお試しください。'); return; }
    pending.add(button);
    const group = button.closest('[role="group"]') || button.parentElement;
    let finished = false, timer;
    const observer = new MutationObserver(check);
    function finish() { finished = true; observer.disconnect(); clearTimeout(timer); pending.delete(button); }
    function check() {
      if (finished) return;
      const active = button.isConnected && button.getAttribute('data-testid') === 'unlike' ||
        group?.isConnected && group.querySelector('[data-testid="unlike"]');
      if (!active) return;
      finish();
      api.runtime.sendMessage({type:'LIKE',url:post.url}).then(result => {
        if (result?.skipped === 'disabled') return;
        if (result?.skipped) toast('この投稿は送信済みです（重複を防止しました）');
        else toast(result?.ok ? '✓ Discordに保存しました' : `Discordへの送信に失敗しました\n${result?.error || '設定を確認してください。'}`);
      }).catch(() => toast('Discordへの送信に失敗しました。Xのページを再読み込みしてください。'));
    }
    observer.observe(article,{subtree:true,childList:true,attributes:true,attributeFilter:['data-testid']});
    timer = setTimeout(() => { finish(); toast('いいねの反映を確認できなかったため送信しませんでした。'); },4000);
    check();
  },true); // イベント委譲によりSPA・追加読み込みに対応
})();
