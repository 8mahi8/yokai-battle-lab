# Phase39｜Firebase Friends 認証なし版：学校試遊用TXT/HTML生成検証（2026-10-26）

## 実施した作業
前チャットからのFirebase移行方針を引継ぎ、2026-10-26のPhase38成果を元に**通常のルール期限変更は後回し**として、学校iPadでの試遊を先に進める。

- 既存開発ブランチ `feat/phase1-action-circle-lab-20261023` から `node tools/build-sites-online.mjs --friends` をGitHub Actions上で実行。
- BRAWL/小国戦線と同じ `https://mygame-df915-default-rtdb.firebaseio.com/`。Firebase AuthもSupabaseも使用しない。SDKはfirebase-app-compatとfirebase-database-compatの2本のみ。
- 結果コードの長さ約**191,017 bytes**。コード埋込に必要なscript/style/2人参加UI/戦闘UI/勝敗画面が存在することをassertで確認。戦闘ロジックは独自に削らず既存エンジン。
- **Node 576/576 PASS**、`PHASE39-FIREBASE-FRIENDS-PASTE-GATE-PASS`、`PHASE39-TXT-HTML-DELIVERY-BRANCH-PASS`。 [GitHub Actions実行ログ](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40331826369)
- **Google Sites直接貼り付け用コードはTXTとHTMLを別々に出力**し、同一バイト内容であることを`cmp`で検証。
  - TXT：[YW2 Firebase Friends PASTE.txt](https://github.com/8mahi8/yokai-battle-lab/blob/release/sites-firebase-friends-20261026/delivery/YW2_Firebase_Friends_20261026_GoogleSites_PASTE.txt)
  - HTML：[YW2 Firebase Friends PASTE.html](https://github.com/8mahi8/yokai-battle-lab/blob/release/sites-firebase-friends-20261026/delivery/YW2_Firebase_Friends_20261026_GoogleSites_PASTE.html)
- 保存先は配布専用ブランチ `release/sites-firebase-friends-20261026`。開発ブランチ `main`、Google Sites公開版、Firebase本番DBのRules/Auth/データ、Supabase本番設定は変更なし。

## 実環境ゲート
1. 2026-10-22に共有されたRTDB Rulesを模擬したローカルFirebase EmulatorでChromium 2 iframeが成功（Phase38）。
2. 2026-10-26の同一Firebase URLへの**未認証GETはHTTP200**（読み取り経路のみ確認、本文なし）。
3. しかし**Google Sites実iframeで学校Safari旧iPad2台からの本番書込みは未検証**。「学校で動く」と断定しない。
4. 実Rules全文取得・リアルタイム通信安定度・Firebaseの使用量・2026-11-08以降の書込可否は未確認。期限が元ルールのままなら2026-11-08 00:00 JSTで従来の読書き許可は失効。
5. 学校試遊の際は**旧版を残したまま別テストページにTXTコードを貼る**こと。ルームを2台で作成/参加して通常操作と勝敗まで確認する。現行ページの置換は本人の判断。
6. **Google Driveへのアップロードは未完了**。接続済みDriveに旧版ファイルは存在するが、現在のファイルアップロードには新規`file_uri`が必要で、この作業のGitHub Actions成果物からDriveコネクタへ直接引き渡す手段は確認できなかった。旧Driveファイルを上書きしない。GitHubのTXT/HTMLリンクが正式な今回の配布実物。

## ルール期限の扱い
ルール期限は利用者が「いつか直す」として後回しにした。**期限自体は停止/延長されていない**。2026-11-08前に利用継続を決める場合、Firebase Consoleの現行Rulesを再確認し、他ゲームも含めて必要な変更を慎重に実行。全公開の無期限延長を安易に勧めない。
