# レビュー・検証記録

2026-09-23

## 1. コードレビュー

設定画面・DOM検知・バックグラウンド送信・純粋な検証関数を分離。外部依存なし。設定画面から保存して有効化するまで自動送信しない。引用を含む曖昧な投稿URLは送らない。

## 2. バグになりそうな部分

送信を直列化し、複数タブから同じ投稿が同時に来ても履歴判定が競合しない。送信前の予約を保存し、Worker再起動直後の二重送信を抑止。HTTP 429はretry_afterの間、新規送信を止める。タイムアウト・5xxは配信結果不明として2分予約を保持する。通信失敗による勝手な自動再送はしない。

## 3. Chrome互換性

Manifest V3 service_worker、importScripts、Promise版storage/runtime API、return true + sendResponse方式。minimum_chrome_version 102。設定のstorageはTRUSTED_CONTEXTSに制限する。

## 4. Firefox互換性

Manifest V3 background.scriptsでcore.jsを先に読み込む。browser APIを優先し、Chrome用importScriptsは呼ばない。固定アドオンIDとデータ送信種別を宣言。最小140。一時読み込みの制約をREADMEに記載。

3・4はいずれも公式仕様との照合と静的検査、APIモックによる検証。実際のブラウザを起動した統合テストではない。

## 5. 権限・セキュリティ

storage / discord.comホスト権限のみ、content scriptはx.comに限定。メッセージ送信元ID・URL・フレームを検証。Webhook URLはDiscord HTTPSとWebhookパスに限定。リダイレクト、Cookie、referrer、メンションを無効化。外部コード・eval・inline scriptなし。Webhook URLをログ・通知・content scriptメッセージに含めない。

## 6. README

両ブラウザのインストール、Webhook作成、設定、確認、トラブル対処、秘密情報の扱い、DOM変更箇所、改修・再生成手順を記載。

## 7. 自動テスト

Node.js v24で12件成功。Node.jsの標準test runnerとvmを使用。外部通信はモックで置き換える。

- 投稿URL正規化、不正URL拒否
- Webhook宛先検証
- 再いいねの期限・予約期限
- 同一投稿の並行送信と成功履歴
- 設定APIの送信元制限
- テスト送信の本文
- HTTP 429時の待機と予約解除
- 無効時の抑止
- Chrome / Firefox名前空間でのいいね状態変化と解除の除外
- 偽クリック拒否

## 8. 未確認・制約

実際のXの現在のDOM、Chrome / Firefoxの拡張機能読み込み、ユーザーのDiscordチャンネルへの実送信は未確認。READMEの手動確認を実行する必要がある。DOMが想定と異なる場合にはcontent.jsを調整する。いいね表示の楽観的更新後にXが操作を取り消してもDiscord送信は取り消さない。通信中の強制終了等で厳密な一度だけの配信は保証できない。引用・メディアモーダル等でarticleや日時URLが特定できない場合は送信しない。

## v1.1.0 更新検証

Fixup変換をcore.jsに追加し、既存の投稿URL抽出関数を共通化。fixup.jsはShadow DOM内にコピーボタンを生成し、SPAの追加・削除をまとめて監視する。クリック時にURLを再取得するためarticleの再利用に対応する。clipboard権限は追加せず、ユーザー操作時の書き込みが拒否された場合は手動コピー欄を表示する。Fixup宛てのfetchやホスト権限は追加しない。

テーマは設定画面だけに適用。OS設定を初期値とし、保存済みの選択を優先する。storage.localの独立したthemeキーへ保存し、Webhook設定を上書きしない。キーボード操作とフォーカス表示に対応したrole=switchのチェックボックスを使用する。

既存12件にFixup変換とテーマ保存復元の2件を追加し、14件成功。実際のX上でのボタン配置、自動コピー、ブラウザでの外観と統合動作は未確認。

## v1.2.0：Fixupを設定画面に移動

X投稿へのボタン挿入と監視を行うfixup.jsを削除し、両ブラウザのcontent_scriptsから外した。設定画面にURL入力・変換コピーボタン・結果欄を追加し、converter.jsで処理する。ダーク／ライト切り替えとWebhook処理は維持。コピー成功・拒否時のフォールバック・無効URLの3件を追加し、自動テスト17件成功。実ブラウザの見た目・統合動作は未確認。

## v1.3.0：送信時のFixup変換チェックボックス

手動変換フォームとconverter.jsを削除。設定のuseFixupを保存・復元し、送信時にtrueならfixupx.com、falseまたは未設定ならx.comを使う。旧設定はOFFとして移行。重複判定は引き続き投稿IDを使用する。ON/OFFの保存・読出し・送信本文、切替時の重複抑止を検証。不要になった手動変換テスト3件を削除して新規2件を追加、全16件成功。実ブラウザ・Discord実送信は未確認。

## v1.3.1：投稿日時アンカーを誤って除外する不具合

findPostのclosest('[role="link"]')が、通常の日時アンカー自身にも一致して候補を全て落とす問題を修正。引用判定はarticle内の親要素だけを走査し、アンカー自身のroleは許可する。日時アンカー・引用親・quoteTweet・別article・曖昧候補を再現した5件の回帰テストを追加し、全21件成功。実際のユーザーのDOMは取得できておらず、実ブラウザでの復旧確認は未実施。
