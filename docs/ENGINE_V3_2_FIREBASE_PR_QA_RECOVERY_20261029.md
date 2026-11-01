# 妖怪ウォッチ2対戦｜V3-2 Firebase Friends 実Emulator・Google Sites HTML PR CI合格（2026-10-29）

## 原因と方法
既存`.github/workflows/phase37-firebase-friends.yml`は開発ブランチpush時に`engine/**`等の変更で発火する。ただしGitHub連携側`fetch_commit_workflow_runs`はPR起動のみを返していたため、**結果が空＝テスト未実施**とは限らなかった。

開発ブランチ`e9f75f6ba2afcd09c3c5a8155d43597c388bba83`にて既存ワークフローへ読み取り専用`pull_request`トリガー（mainベース・変更パス制限）を追加。元のpush triggerと`workflow_dispatch`、Firebase操作・テスト本体は一切変更なし。Workflowは`permissions: contents: read`のまま。main、公開学校サイト、実Firebase DB/Rules/Auth、Driveは変更しない。

## 正式成功したQA
- **[GitHub Actions Phase37 Firebase Friends no Auth QA — run 40897292624](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40897292624)：Job success／全step success**。同SHAで[Research battle unit tests — run 40897292655](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40897292655)も成功。
- Node source/HTML build：エミュレータ版289,917bytes、学校Firebase Friends版289,710bytes、いずれも74 source modules、外部SDK2本。GitHubログ`SITES-ONLINE-BUILD-PASS`×2、`FIREBASE-FRIENDS-BUILD-PASS`。
- アプリ内に`firebase-app-compat.js`と`firebase-database-compat.js`があり、**Firebase Auth（`firebase-auth-compat.js`・`signInAnonymously`）とSupabase依存がない**ことをビルドガードで確認。
- **実Firebase Realtime Database Emulator**を`demo-yokai-lab`として起動。ルーム作成、2席占有、ゲスト入力、ホストが正規状態を確定し送信、ACK/スナップショット一致を確認（`FIREBASE-FRIENDS-COMBAT-REGRESSION-PASS`、`FIREBASE-FRIENDS-NOAUTH-PASS`）。他サービス領域、不正ルームID、権限外書込に対する`permission_denied`は、拒否検証で想定内。
- **Chromium real two-iframe inline HTML**：認証なしの実ルーム接続、ホスト/ゲスト2画面、権威ある入力ACK、ホスト自動clockの停止/再開、4つの埋め込み横幅で`SITES-FIREBASE-FRIENDS-EMULATOR-PASS`。
- 以前使用した期限付きFirebase Rulesのコピーを**本番ではない別のEmulator**に読み込み、当時のルール`now < 1794063600000`（2026-11-08 00:00 JSTまで）と比較一致・二画面Smoke再成功。これは**2026-11-08以降に本番書込できる保証ではない**。
- 最後に本番Firebaseの予約済み非ルームキーへ、**一回の匿名GETのみ**：`FIREBASE-SCHOOL-READONLY status=UNAUTH_READ_HTTP_OK httpStatus=200`。ログに`readOnly:true`、`bodyInspected:false`、`writeTested:false`、`schoolSafariTested:false`を明記。DBへの書込・ルール変更は未実施。
- 同SHAの研究用CI：`node --test tests/*.test.mjs`・自然6vs6耐久4seed・実Chromium browser-smoke全工程成功。以前`6cc44050...`の正式run [40896818659](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40896818659)でNode **771/771 pass**のログも記録済み。

## まだ未達と次の工程
- **学校iPad Safari実機2台におけるGoogle Sites埋め込みの実通信・実タップ・フレーム表示**は未検証。Emulator+ChromiumがPASSでも学校ネットワーク、Safari、外部SDK、Google Sites枠を保証できない。
- 原作必殺技の時間・各画面の視覚固定/同期、KO/スキル順、行動ゲージ等の正確さは正式CIで証明されない。本人提供原作対戦動画の実ファイルは本作業では直接再視聴していない。
- 最新学校公開コードへの自動デプロイは**しない**。本番RTDBとRulesは**変更しない**。実際の学校試験に向けて、V3-3で時間/表示の明文化、V3-4で技とスキルをデータIDへ整理、V3-5で本当に2台で遊ぶ最終試験を計画。
- **現在地：V3-2後半・正式回帰QAとFirebaseオンライン基盤の自動検証ゲートが整った**。これはゲーム完成・原作完全再現の宣言ではない。

### 証拠の読み方
- 正式検証対象コードSHA：`e9f75f6ba2afcd09c3c5a8155d43597c388bba83`。
- この資料またはロードマップのdocs-onlyコミット後、GitHub PRのHEAD SHAが新しくなることがある。**検証済みコミットを新しいHEADと取り違えない**。新しいエンジンコード変更には新しいCIログが必要。
