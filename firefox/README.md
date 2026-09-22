# Firefox版

Firefoxの「一時的なアドオンを読み込む」では、このフォルダーの `manifest.json` を選択してください。

親フォルダーの `manifest.json` はChrome用（`background.service_worker`）です。このFirefox版は `background.scripts` を使用するため、Firefox 156でサービスワーカーが無効な環境でも読み込めます。

詳細な使い方は親フォルダーのREADMEを参照してください。
