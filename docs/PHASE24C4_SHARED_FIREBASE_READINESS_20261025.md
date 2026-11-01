# Phase 24-C4｜共有Firebaseの本番接続前チェック（2026-10-25）

## 目的と結論
妖怪対戦を学校iPad SafariとGoogle Sitesへ移す際、BRAWL・小国戦線IIIで既に使っている **Firebase `mygame-df915`**を再利用する。新規プロジェクト/課金は作らず、妖怪対戦の保存パスは既定の **`/yokaiRoomsV1`** に限定。プレイヤーにログイン操作は求めないまま、ブラウザ内のFirebase匿名認証 `signInAnonymously()` を利用。

現段階では **既存データベースの本当のSecurity Rulesと匿名認証設定は確認できていない**。公開GitHubにはFirebase Database URL（BRAWL・小国戦線で共通）の記録があるが、これは**現行Rulesを確認したことにはならない**。本番Firebase/既存ゲーム/学校Google Sitesには何も変更していない。

## 今回実際に作ったもの
- **`tools/audit-shared-firebase-setup.mjs`**（新規）: 現在のWeb config（JSON）・現在のRealtime Database Rules（JSON）・匿名Authのowner確認状態を**ローカルで入力するだけ**の監査。Nodeのみ利用、ネットワーク/クラウド呼出なし。Firebase projectIDが`mygame-df915`であるか、認証ドメインが`mygame-df915.firebaseapp.com`であるか、既知のRTDB URLがHTTPS・想定ホストのみか、必要な5設定値（apiKey/authDomain/projectId/appId/databaseURL）を保持しているかを確認。
- **既存Rulesとの組合せ検査**: `tools/preview-shared-rtdb-rules.mjs`の保守的な既存データ保護判定を再使用。親から広い読書きが降りてくる/親の検証・ワイルドカード・既に妖怪専用パスがある場合は警告して**停止**。Firebaseの[公式ルール継承仕様](https://firebase.google.com/docs/rules/rules-behavior)に従い、ルートが許可されていると子で拒否しても意味がないことを誤魔化さない。
- **機密扱い**: 監査出力へapiKey/appIdや他ゲームのRules全文を表示しない。代わりにエラーコードとローカルRulesの短いフィンガープリントのみ表示。実行してもFirebaseサーバーにアクセスせず、Auth/RDBの設定値を更新しない。監査が全PASSでも判定は**`owner_review_required`**に留まり、`safeToDeploy:false`のまま。GitHubへの誤コミット対策として`.gitignore`を新設し、`private/`、ローカル設定、Rule export/review、ビルド成果物、`.env*`を除外。
- **`tests/shared-firebase-setup-audit.test.mjs`**（新規7件）: 正常な架空設定、匿名Auth未確認/無効、他プロジェクト/RTDBへの誤接続、親Rulesの広い許可、既存妖怪Rules/wildcard競合、入力未取得、監査出力の伏字化、CLIでのローカルJSON読取・元ファイル非変更を検証。テストに実FirebaseのAPIキー・UID・課金/設定変更はない。

## 今後、Firebase Console画面を読み取れるようになった場合の正しい手順
**実操作が必要になった段階で本人へ一度だけ案内する。現時点で勝手にユーザー操作をしたとは言わない。**

1. [Firebase Console](https://console.firebase.google.com/)で既存の`mygame-df915`を選ぶ。**新規作成しない**。
2. **Authentication → Sign-in method → Anonymous** が有効かどうか**読むだけで確認**。未設定なら「有効にする」実変更は別の承認対象。
3. **Realtime Database → Rules** を開き、現在のRules JSONをコピーして`private/mygame-current.rules-export.json`などのGit非追跡ファイルへ保存。**Publishを押さない／既存Rulesを上書きしない**。
4. **Project settings → General → Your apps → Webアプリ → SDK setup and configuration → Config** から現在の公開用Web設定を確認。JSONファイルとして`private/mygame.local.firebase.json`に保存。Webアプリ登録がまだ無ければその事実を報告し、勝手に登録しない。公式[Web設定](https://firebase.google.com/docs/web/setup)では設定オブジェクトが必要。
5. オフライン監査（Node / ローカルでのみ実行）:
   ```bash
   node tools/audit-shared-firebase-setup.mjs \
      --web private/mygame.local.firebase.json \
      --rules private/mygame-current.rules-export.json \
      --anonymous-enabled unknown
   ```
   有効だと確認した場合だけ`unknown`を`yes`に変える。**監査結果を最終承認と混同しない**。
6. 監査でRulesが互換と判定された場合に限り、非破壊の差分**プレビュー**を`node tools/preview-shared-rtdb-rules.mjs --base private/mygame-current.rules-export.json --out private/mygame-merged.rules-review.json`で出す。ここでは**Firebaseに公開/反映されない**。反映前に、合成Rulesではなくその**実Rulesのコピーをローカルエミュレーターで試験すること**が後続の必須ゲート。

## 受け入れ・未受け入れの区別
- 受け入れ可能なもの：GitHub開発ブランチ上の診断器、誤コミット防止、架空RulesのNodeテスト、Firebase Emulator/Chrome2席の過去の試験。
- 受け入れていないもの：実`mygame-df915`のWeb config/Anonymous設定の確認、現行Rulesの検証、実Rulesの統合・クラウド公開、実Google Sites編集、旧iPad Safariでの1vs1。
- 親Rulesが広いときは**そのまま公開せず、既存ゲームとの共存方法を再設計**。所有者に知らせず既存Rules全体を置換しない。
- Flash魂初期なし、元3DSのノーモーション/カウンター/妖気数値未確定、仮1500msの研究用ホスト行動間隔は不変。

## 次
実Rules JSONとFirebase Web configが読めるようになれば、**実データではなくRules/Configの静的な読取内容だけ**で監査し、必要最小限の差分を構築・エミュレータでテストする。最終的なクラウド変更は本人承認後のみ。学校公開版のGoogle SitesへHTMLを貼る操作は本人。

**変更先**: `feat/phase1-action-circle-lab-20261023` GitHub開発ブランチのみ。main・Googleサイト版・実Firebase・匿名Auth・Rules・料金へ変更なし。
