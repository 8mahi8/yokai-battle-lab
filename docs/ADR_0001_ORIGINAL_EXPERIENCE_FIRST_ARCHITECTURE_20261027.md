# ADR-0001｜妖怪ウォッチ2対戦体験を再現するための開発基盤（2026-10-27）

状態：**採用した設計方針**。Phase45実装は「動作演出の純粋な計画生成＋単体試験」まで。**学校サイトでの全面入替、UIの演出再生配線、通信スキーマ変更はまだ行っていない。**

## 意図・完成の定義

ユーザーが定めた最重要基準：**原作の内部コードを真似る必要はない。見た目、操作感、ゲーム体験、対人戦のシステムを可能な限り『妖怪ウォッチ2』に近づける。**

- *体験パリティ*: 相手を見てサークルを回す、ねらう、妖気を見て必殺、おはらい等を選ぶ判断が本家と似ている。
- *視覚パリティ*: 上下画面、アクションの予備動作・命中/発動・硬直・スキル表示が、原作の技の種類を識別できる。
- *ルールパリティ*: 妖怪ごとの役割・行動順・とりつき・妖気・スキル・サボり・ターゲット・勝敗を本家の**結果と選択**に近づける。内部計算法一致を必須としない。
- *技術の成立*: Google SitesにHTML/CSS/JSを直接埋め込み、学校のiPad Safari 2台で友達と無料で遊べる。旧安定版とmainを勝手に変更しない。
- *根拠レベル*: 原作で直接確認／攻略・上級者による情報／開発者仮値の3段階。正確な計算式・確率・モーションフレームを検証なしに断言しない。

## 事実確認：いまのコードベースの再利用対象

- `engine/phase1.mjs`: seed付き行動順・前衛交代・待機ポイント研究
- `engine/combat.mjs`: HP/妖気/性格/状態/必殺/勝敗の権威ある計算。ファイルが巨大で、将来の個別効果追加では**段階的な分割が必要**。今すぐ全書換えは危険。
- `engine/match-protocol.mjs`: ホスト唯一の計算、端末間コマンド順とACK/seq検査。ここは引き続き守る。
- `network/firebase-room.mjs` と `network/firebase-match.mjs`: 学校で実接続成功した無認証Friendsルーム。**入れ替えない**。Firebaseは相手への通信・同期用であり、画面演出のクロックではない。
- `ui/match-stage.mjs`,`lab/yw2-layout.css`: DOM/SVGによる上下2画面表示、タップ/サークル操作、単体HTMLへのバンドル。演出とUIが密着しすぎており将来の整備対象。
- `engine/presentation-timeline.mjs`: ノーモーションの表示保留に関する研究。**ネット対戦へ直接コピペ/投入しない**（入力/ゲストの見え方/欠落/再接続を個別検証）。
- `tools/build-sites-online.mjs --friends`: 既存Google Sites直接貼付の完成品を再現ビルドできる。**この配布方式を保つ**。

## 目指す4階層 + データ

```
データ定義（妖怪・技・行動演出・参照根拠）
               │
プレイヤー入力 ─┤
       ┌───────▼─────────────────────┐
       │ 1. ルール/戦闘シミュレーション │
       │ 決定的な状態遷移、対戦結果     │
       └───────┬─────────────────────┘
               │ 確定イベント + 正規スナップショット
       ┌───────▼─────────────────────┐
       │ 2. オンライン通信アダプタ      │
       │ ホスト計算→Firebase→ゲストACK│
       └───────┬─────────────────────┘
               │ 同じ確定結果を両画面へ
       ┌───────▼─────────────────────┐
       │ 3. 演出の計画 / 再生           │
       │ 予備→効果→戻り、ローカル描画  │
       └───────┬─────────────────────┘
               │ 表示状態のみ（HP変更不可）
       ┌───────▼─────────────────────┐
       │ 4. 2画面レンダラ + 操作UI      │
       │ DOM/SVGや将来の描画方式       │
       └─────────────────────────────┘
```

**責務の境界を絶対に越えないこと**
1. 演出・画像のコードはHP/妖気/ターン順/勝敗/確率を決定しない。
2. 通信の遅延や接続再開は、ダメージ/行動を**再実行させない**。同一イベントの重複描画は判定に影響しない。
3. 動画・UIの速度を変えてもルールの結果が変わらない。表示が遅れたときだけ描画を正規状態へ追いつかせる。
4. 技・妖怪の違いは**データ宣言**を基本にし、新しい技ごとに通信・UIの多段ifを増やさない。
5. サークル操作中はそのタッチ対象DOMを再生成しない。Pointer/Touch取消処理を検証する。
6. バックグラウンド・非表示iframeでrequestAnimationFrameが停止することを前提に、**画面の時計とホストのルール時計は別**。Page Visibilityで表示のみ停止/正規状態へ復帰し、非表示画面がゲーム結果を独断更新しない。

## Phase45の最初のコード（今回実装した狭い試作）
- `presentation/action-catalog.mjs`：攻撃、攻撃妖術、回復、とりつき、ガード、サボり、つつく、必殺の**ポーズ種・仮演出ミリ秒**をデータで宣言。
- `presentation/action-choreography.mjs`：既にエンジンが解決したイベント→**予備動作(anticipation)／効果(impact)／戻り(recovery)**の不変な演出計画に変換。`choreographyFrame(plan, elapsedMs)`は表示上の段階だけを返す。
- `tests/action-choreography.test.mjs`：8種の明確な動き、HP計算の汚染なし、命中/回復/とりつき/失敗の効果型、実際の `ui/battle-vfx.mjs` との互換を検証。
- **重要**：演出の仮秒数を元作の値と誤認しない。純モジュールを作っただけではゲーム画面の表示はまだ変わらない。次工程で対戦プレゼンテーションへ段階的に接続する。
- 既存の無認証接続/ルーム/Google Sites版・Firebase Rules・mainには変更を入れない。

## Phaser/Pixi/Canvas全面移行の判断
現状はDOM+SVGで一定程度動いている。短時間・無料・古いSafari・Google Sites直接貼付の要件から、**今は全面移行しない**。3DS再現の必要な演出品質を既存DOMで作れるかを、複数のアクションと長時間オンライン実機で確認してから判断する。新たな依存・初期ロード・iframeのフォーカス・端末タッチ互換を検証できないまま描画エンジンだけ導入しても戦闘品質は保証されない。

移行を検討する条件：
- DOM/SVGでは標準の妖怪アニメーション6体を滑らかに再生できず、端末ブラウザ計測で明確な問題がある
- 3D/大量パーティクル/複雑な深度合成等、Canvas/WebGLへの実際の必然性ができた
- 移行候補でタッチ/iframe/通信/Google Sites単体HTML/長時間戦が同等に動く

## 次に実装するときの安全な順番

1. **原作の通常攻撃・妖術・回復・とりつき・ガード動画を照合し**、演出動作と見た目の差を整理。原作の処理とブラウザ内部の設計は切り分ける。
2. **表示専用イベントIDを正規化**する。現在 `latestBattleCue` の一部キーは `events.slice(-5)` の「配列位置」に依存し、イベントが追加/スライドすると同一行動の再演出が起こり得る。特に `special`/`poke` は独立した安定IDがない。まず戦闘イベントへ**単調な発行番号**を付け、旧スナップショットに互換処理を付けて回帰試験する。
3. スナップショットとイベントの差分を受ける**小さい表示キュー**を作る。入力シリアル/ネットワークseqとは混同しない。再接続時は古い演出を延々再生せず正規状態へ復帰。
4. 1アクション（攻撃）だけ、原作に近い**予備→接触→被弾数字→戻る**をテスト描画で再生。次に妖術・回復・とりつき・ガードへ拡張。
5. **画面表示用HP/状態**と正規HP/状態を区別し、ヒット表示時に見かけのHPが動くようにする。ただし戦闘/送信の判定は正規状態のみ。
6. 2台ゲスト差・タッチ継続・画面停止/復帰・二重描画・再接続時の同期ずれを実ブラウザ/エミュレータで検証する。
7. 既存V2/V3と新版を同条件で比較して、初めてGoogle Sites用の新配布TXT/HTMLを**別ファイル名で**生成する。学校の既存ページは本人の操作まで保持。

## ソースと設計判断の根拠
- Robert Nystrom, *Game Programming Patterns*, Component https://gameprogrammingpatterns.com/component.html, Event Queue https://gameprogrammingpatterns.com/event-queue.html, Decoupling https://gameprogrammingpatterns.com/decoupling-patterns.html 。関心を分離すること、不要な全域イベントバスを増やさないことを参考。全機能をECS化することは求めない。
- MDN, requestAnimationFrame https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame 、Page Visibility https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API 、touch-action https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action 。描画タイミング/非表示iframe停止、タッチの取消。
- Firebase, RTDB Web offline https://firebase.google.com/docs/database/web/offline-capabilities 、Web Read/Write https://firebase.google.com/docs/database/web/read-and-write 。復帰時の正規スナップショット同期、通信が先にローカル通知される場合のACK区別。
- Phaser https://docs.phaser.io/phaser/concepts/time ：Time / Timelineはゲーム演出設計の参考例。**ゲームへ導入済みだとは書かない。**
- 本repo独自一次データ：`engine/phase1.mjs`、`engine/combat.mjs`、`engine/match-protocol.mjs`、`network/firebase-*.mjs`、`ui/match-stage.mjs`、`engine/presentation-timeline.mjs`。
- 原作比較の入口は [Phase44原作体験再設計](./PHASE44_ORIGINAL_BATTLE_REBUILD_PLAN_20261027.md) と [原作仕様監査](./YW2_PVP_FIDELITY_AUDIT_20261027.md) を継続参照。
