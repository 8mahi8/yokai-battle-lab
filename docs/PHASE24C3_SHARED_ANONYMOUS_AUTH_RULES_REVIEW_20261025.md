# Phase24-C3｜既存Firebase共用＋匿名認証の非破壊Rules統合準備（2026-10-25）

## 今回確定した方針
ユーザーから「匿名認証の採否は任せる」と委任。**プレイヤーのログイン操作を不要にしたまま、内部ではFirebase匿名認証を維持**する。BRAWL/小国戦線IIIがすでに使う**`mygame-df915`の既存Realtime Databaseを共有**し、妖怪対戦専用パス`/yokaiRoomsV1`を使う。新Firebaseプロジェクトは作らない。課金、既存BRAWL/小国戦線、学校Googleサイトを変更しない。

**公式仕様上の重要な注意**：Firebase Realtime Databaseの[Security Rules](https://firebase.google.com/docs/rules/rules-behavior#realtime_database)は上位`.read/.write`の許可が子へ継承される。もし既存ルールにルートの`true`や`auth !== null`等、条件付きで許可し得る規則がある場合、`yokaiRoomsV1`以下で後から細かく制限できない。**実Rulesを確認せず「認証があるから安全」とは言えない。** さらに`.validate`や`$wildcard`の競合は人間のレビューを必須とする。

## 今回実装
1. `tools/preview-shared-rtdb-rules.mjs`（**新規、ネットワーク操作ゼロ**）
   - 入力：**実際にFirebase Consoleからエクスポートした現在の** Rules JSON と、このrepoの`network/emulator/database.rules.json`（既存の33権限テストで検証した妖怪専用Rules）。
   - 出力：元Rulesを変更せず、**`/yokaiRoomsV1`だけ増やしたレビュー用の別JSONファイル**。既存ルートと他ゲームパスはJSオブジェクトレベルで完全保持。入力・出力を同じパスにはできず、作成済みのレビュー用ファイルも上書きしない。
   - **保守的に拒否**：ルート`.read/.write`が定数falseでない、未確認のルート`.validate`、ルート`$wildcard`、`yokaiRoomsV1`が既に存在する、独立Rulesがルート読書きを拒否していない、入力JSON形式が不正。推測で既存権限を狭めたり上書きしたりしない。
   - 本番Firebaseへのデプロイ命令・Auth設定変更・接続先URLや認証情報は存在しない。
   - 将来の使い方（**現在の実Rulesを取得できた場合に限る**）：`node tools/preview-shared-rtdb-rules.mjs --base current-myfirebase.rules.json --out proposed-myfirebase.rules.json`。**出力を自動的にデプロイしない**。
2. `tests/shared-firebase-rules-merge.test.mjs`（**新規5件**）：
   - サンプルBRAWL/小国戦線ルートを保持して`yokaiRoomsV1`だけ加える。
   - 親の広すぎる権限を拒否。
   - 親`.validate`、ルートワイルドカード、ルートの衝突を拒否。
   - 研究用Rules不正を拒否。
   - ファイルでのプレビューと入力/出力上書き禁止を検証。
3. `tests/firebase-shared-rules-emulator.cjs`（**新規**）：本物のローカルFirebase RTDB Emulatorで**合成した旧ゲーム権限を含むRules**と妖怪対戦のRulesを統合した結果を16条件で検査。BRAWL相当/小国戦線相当パスの書込・読出が従前通り可能。妖怪対戦では、未ログイン部屋作成禁止、匿名Authでホストが作成、ゲスト参加、第三者の座席奪取/権威戦況偽装禁止、ホストのみ試合開始・戦況反映、ゲスト本人のみ入力を確認。**これはシミュレーション用合成Rulesであり`mygame-df915`の実Rulesではない。**
4. `.github/workflows/phase14-firebase-browser.yml`：新規のエミュレーター統合テストを従来のAuth+RTDB/Chrome2席に追加。

## 完了したテスト
- [Node **484/484**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40179904769)（以前の479＋5）
- [Auth+RTDB Emulator・16件共有Rules + 既存33件権限 + Chrome2席成功](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40179904784)。`SHARED-FIREBASE-EMULATOR-PASS 16`, `EMULATOR RULES PASS 33`, `FIREBASE-STAGE-PASS`, `FIREBASE-CHARGE-PASS`を確認。
- 同じローカルエミュレーター上の独立試験で、先行テストが作った部屋番号`654321`と衝突したため、共有Rules試験を別の`876543`へ変更。最終runはPASS。
- 本物の学校iPad、Google Sites編集/埋め込み、`mygame-df915`のAuth・Rules状態は**未検証**。実クラウド読書き/課金変更は実行していない。

## 次の作業
- **本人の操作はまだ必須ではない。** 開発ブランチでできる原作一致度の研究・視認性等は引き続き進められる。
- 実オンラインHTMLを作る前に、既存`mygame-df915`のFirebase Web公開設定（apiKey/authDomain/appId/databaseURL）、匿名Authが有効か、**現行RTDB Rules**を確認する必要がある。現行Rulesがルート許可などの場合は**ツールが停止するので勝手に修正しない**。旧ゲームを破壊せず両立できる方式を改めて設計する。
- 承認された設定でテスト版を生成してから、本人がGoogle Sitesのコード欄に直接貼り、学校旧iPad Safariで友達と二端末を確認する。元ゲームの未実測タイミングを先に確定扱いしない。

**GitHub開発ブランチだけを変更**。`main`・既存Googleサイト・既存RTDB・Firebase Auth/Rules・クラウド利用枠・料金は変更なし。
