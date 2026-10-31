# Phase23-C｜Firebase Auth/RTDBローカル2席・権威snapshot publish失敗の実Chrome受入
更新: 2026-10-25 JST
開発ブランチ: `feat/phase1-action-circle-lab-20261023`

## 1. 全体の設計上の位置
原作PvPのルール・研究（Phase21/22）→ 正規ゲームホスト `engine/match-protocol.mjs` → **Phase23 Firebase同期/ACKの品質保証** → Phase24 旧iPad Safariの実機と Google Sites 「コードを埋め込む」への単一HTML/CSS/JS直貼り。

**今回の目標は原作の不明な必殺技フレーム値を仮導入することではなく、正規ゲームホストで入力が一度成立したのにFirebase snapshotだけ書き込めなかった場合のブラウザ表示・ACK復旧の真偽を確認すること。** 旧 `researchCounterTiming` 等は本番ホストでOFFのまま。

## 2. 見つかっていた問題
前段Phase23-BのNode統合テストは、ホストがゲスト入力を適用した後に `publishSnapshot()` が一度失敗すると、ゲストが同じ入力番号で再送してもホストが重複として無視するため、**ゲスト再送だけではACKを復旧できない**と確認した。ホストが最新状態の `retryPublish()` を行うのが正しい。

しかしPhase23-Bではその挙動を**Chrome内の実DOM＋Firebase Auth/RTDBローカルエミュレーター2席**で一貫して実証する専用テストがなかった。

## 3. 変更内容
1. **`lab/firebase-match-stage.html`**（localhost専用研究HTML）に明示的な `?phase23c=1` のときだけ `__phase23c.failNextPublish()` を用意。この関数は**次のホストpublish呼出しを1回だけ拒否するアダプタ境界の故障注入**。Firebase本番設定・SDK・セキュリティルールの改変ではなく、**実SDK経由でゲスト入力を送った後、ホストのローカル研究アダプタだけがpublish失敗**する状況を再現。
2. ホストの `onSnapshot` と `onError` に `updatePresence()` を連携し、戦況を受信した瞬間/再配信失敗後の `dirty` 状態に応じて**ホスト向け「未反映の戦況を再送」ボタン**が現在の状態を反映するようにする。テスト用フックは`phase23c`なしでは作成しない。通常のレンタル6体/原作ルールの変更なし。
3. **`tools/firebase-charge-smoke.mjs`**：従来のFirebase Auth+RTDB実Chrome2席で「必殺6タップのACK、Soul両画面一致、Firebase SDK `goOffline`→`goOnline`→次の輪回転ACK」の後に、新たなブラウザ受入を実行。まずホスト・ゲストの前衛3体とrevisionが一致することを確認し、`failNextPublish()`を注入。ゲストのホンモノの画面操作から右回転を送信し、ホスト内部のrevision・前衛は1回変化、ゲストは古い前衛のまま・ACKなし、`dirty:true`であることを確認。
4. さらにゲスト側の再送ボタンを押してもホストで二重回転が発生せず、ゲストは引き続き未ACKであることを確認。続いてホストの**画面上の再配信ボタン**を押して `retryPublish()` を実行すると、`dirty:false`、`lastPublished`更新、ゲストの権威ACKと実DOMの前衛が一致することを確認。ホストrevisionの増分が**ちょうど1**であることを必須とした。

**今回の改善の核心は「UIは通信送信済み・戦闘命令の成立・Firebaseへのpublish完了・対戦相手の受信を混同しない」こと。** この仕組みは本番のクラウド通信断すべてを再現できた、という意味ではない。意図的なアダプタレベルの失敗を本物の2ブラウザとRTDBエミュレーター通信で通したテスト。

## 4. テストの証拠と残りのリスク
- [Firebase実2ブラウザ/Auth/RTDBローカルエミュレーター QA **PASS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40165732704)：33件のSecurity Rules、実ブラウザ2席と必殺チャージ・オフライン復帰・1回publish失敗→元の番号のACKを取り戻す受入を含む。結果ログの `FIREBASE-CHARGE-PASS` は新しいPhase23C検証を通過した最終判定。
- 同コミットの[Node469/469＋研究Chromium](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40165732709) と[本家風ステージ/指操作Chromium](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40165732668)も成功。
- `phase23c`の故障注入は研究localhost限定で、製品・学校向けページ・Firebase rules・ホストの正規ゲーム処理は改変しない。
- **証明していないこと:** 実クラウドRTDB自体のサーバーエラーや大きな遅延、物理的に異なる2台の学校旧iPad Safari、Google Sitesの貼り付け制限、原作3DSの確定フレーム、完全なタブ終了後の試合復旧。

## 5. Phase24 の準備と次のゲート
- [Google Sites公式ヘルプ：HTML/CSS/JavaScriptのコード埋め込み](https://support.google.com/sites/answer/90569?hl=en)はHTML・CSS・JSを直接入力し、JSは`<script>`、CSSは`<style>`で囲む方式。URLを入力してWebページを埋め込む手順とは別。**君の公開方式はコード直接貼り付け**であり、GitHub Pagesのiframeを代替としない。
- 現研究画面 `lab/firebase-match-stage.html` は localhost のエミュレーターを使い、CSSが外部相対パス・JavaScriptが `import` 分割モジュールになっているため、そのままGoogle Sitesのコード欄に貼る完成ファイルではない。
- Phase24-Aで**一つのHTMLへゲームUI/JS/CSSをバンドルするビルド**と、オンラインルーム用の実際の設定を安全に注入する設計が必要。**本番Firebaseの実行・設定・課金・クラウドデータの変更は本人の承認なしに行わない**。ビルド後にCode Embedで貼るのは本人が行う。
- 旧世代iPad Safari上で画面・回転・4種必殺指操作・2席ACKを確認できるまでは「学校で遊べる公開版が完成」と断言しない。

**編集した対象:** 開発ブランチ `feat/phase1-action-circle-lab-20261023` の `lab/firebase-match-stage.html`, `tools/firebase-charge-smoke.mjs` と進捗資料のみ。main、既存Googleサイト版、本番Firebase、費用・閃光魂初期OFFは未変更。
