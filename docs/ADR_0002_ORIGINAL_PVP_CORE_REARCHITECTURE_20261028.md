# ADR-0002｜原作の対戦体験を再現できる戦闘基盤へ段階的に組み直す（2026-10-28）

**状態：設計方針・移行計画。ゲーム実装は変更していない。**
前提：ユーザーが「開発基盤から見直した方がいい」と提案。直前の重要な指摘は**「ひゃくれつ肉球の連続ヒットは、その技が多段技だから。すべての必殺が多段演出ではない」**。
目的は「原作の対戦動画を見ながら同じ入力・判断・画面変化・戦闘結果を再現できる」ことであり、原作の内部コード一致でも、機能数・テスト件数の最大化でもない。

このADRは[ADR-0001](./ADR_0001_ORIGINAL_EXPERIENCE_FIRST_ARCHITECTURE_20261027.md)の**戦闘・通信・演出・UI分離方針を継承して具体化**する。全面書き直しや新フレームワーク導入の承認ではない。

## A. 現行コードを読んで確認したこと
| 領域 | 本当に存在する資産 | 基盤の欠陥／再現不足 |
|---|---|---|
| `engine/combat.mjs` | 1つのホスト決定論的ゲーム、妖気、HP、スキル、状態、おはらい、必殺、勝敗、判定処理 | 約55KBの1ファイルに多機能が混在。通常攻撃は`multiHit.hits[]`を持つが、必殺は別の`planResearchSpecial()`から`impacts[]`を返す仮モデル。**「対象が3体」≠「3連続ヒット」**。技IDと本物の段階的効果契約がない |
| `engine/phase1.mjs` | YW2のWait/Speedテーブルを使った前衛行動順モデル | これは**論理的な待ちポイント**。描画や実時間を表すものではない |
| `engine/match-protocol.mjs` | 片側唯一の計算、コマンド正規化、seq/ACK、ジャーナルの再現性 | アクション意味・結果データの不足を自動解消しない。入力とイベントの**プロトコル互換**を壊さず拡張する必要 |
| `network/firebase-match.mjs`・`network/firebase-room.mjs` | 友達の2端末の試遊で動いたFirebase RTDB部屋、ゲストのACK同期 | **再構築不要**。Firebaseはネット状態の配布手段で、アニメーションの時計や原作ルールではない |
| `lab/sites-embed-online-entry.mjs` | 学校Friends版の無認証2人対戦、Google Sites直貼りビルド | **固定2600ms**でホストが`advanceAuto()`を呼ぶ試遊タイマー。原作の行動モーション長・行動間の物理秒数とは別 |
| `ui/match-stage.mjs`・`lab/yw2-layout.css` | 上下画面、サークルの指入力、ピン、チャージ/おはらい、キャラSVG | 約46KBの画面コードにDOM生成・操作・スナップ表示・演出キューが同居。ホストの最終状態/画面上の過去アクション/相手に見える状態が混ざりやすい |
| `ui/battle-vfx.mjs`→`presentation/action-choreography.mjs` | 安定eventId、最新イベント/表示キュー、予備→命中→回復（仮の3相） | **8種共通の演出プリセット**だけ。実際の`moveId`と`hitResults[]`、被弾と状態更新の別タイミングを表示に結びつけていない。見た目のFIFOは対戦相手視点の表示保留を実現しない |
| `content/rental-roster.mjs` | 両者同じ6体、試遊データをファイルに分離 | 妖怪データには技効果の研究仮値が残り、**原作技ごとの確定仕様と仮値**の区別が型・テストにない |
| `engine/purify-input.mjs`, `engine/charge-input.mjs` | 5種類/4種類の入力判定がある | 閾値・配置・出現パターンは研究用。操作画面に原作の動きを付ける前に、入力・判定・画面状態を明確に分離したい |

**資料記載の訂正**：`createCombat`の直接デフォルトは`rotationCooldownMs=0`だが、**学校Friendsが利用する`createMatchProtocol`はデフォルト`rotationCooldownMs=3000`で上書きする**。`lab/sites-embed-online-entry.mjs`の`createMatchProtocol({battleOptions:{playtestSoulTuning:true,enableLoafing:true}})`はこの3000msを継承する。これまでの「学校Friendsでは指定なし→クールダウン0」という記載は誤り。**3秒が原作対人の厳密値であると断定もしない**。テストとコードからの確認と原作資料の裏付けを区別する。

## B. 改訂する基本設計（シンプルな6区画）
```
【原作仕様台帳 / Source Ledger】
       ↓          技/妖怪データ (moveIdで紐付け)
【Input State Machine】──intent──┐
     下画面の状態                     │
     選択→ミニゲーム→完了/取消       ▼
                              【Authoritative Combat】
【Logical Action Clock】─────→ 先行Wait・技効果・HP・妖気・状態・勝敗
                                     │
                        正規イベント (actionId, moveId, hitResults等)
                                     │
                  ┌──────────────────┴─────────────────┐
                  ▼                                    ▼
           【Firebase Transport】              【Presentation Planner】
           host authoritative, seq/ACK            原作に応じた技別演出計画
                  │                                    │
                  └────────────┬───────────────────────┘
                               ▼
              【Player View Projection + Renderer】
         自分から見た正規状態 / 相手に見える配置 / 演出
           上画面3vs3 + 下画面入力 (二画面を分離)
```
*これは概念図。新しいライブラリ、サーバー、認証、ECSや複雑な全域イベントバスを意味しない。* 
*ホストは一つ、ルーム作成→6桁参加→開始、同じレンタル6体、Google Sites直貼り、無料、無音を維持。*

### B1. 内容を決めるのは「技データ」＋「1つの戦闘ルールエンジン」
技を追加する時、**画面のif文・ネット通信・ダメージ計算を別々に書き足さない**。正規`moveId`に対して、対象数/命中構造/種別/属性/付与状態/原作資料ソースを定義し、ルールエンジンがその技を解決する。**確信度と未検証値を明示**して当て推量が原作値に化けるのを防ぐ。

例えば「単発全体攻撃」は`targets=[B1,B2,B3]`の**1撃種別**であり、`hitCount=3`を意味しない。「ひゃくれつ肉球」の正確な回数/威力は資料で確定するまで**未確定**。安易に8回などと埋めない。

`moveId`はレンタルの実際の技定義から参照。従来の`special.kind='damage'/'heal'... `等は**移行期間だけ互換アダプタ**で受け、最後は正規データに寄せる。

### B2. 戦闘結果の「連続ヒット」をイベントの正規構造にする
次期モデルでは、たとえば次の**型イメージ**を検討する（これ自体は仕様を確定したサンプル技ではない）：
```js
{
  schema: 2,
  actionId: 251,       // 1試合内の一意な論理行動ID
  actorId: "A1",
  moveId: "verified-move-id",
  category: "soultimate",
  result: {
    hitResults: [
      // 1つの攻撃試行/ヒットにつき正規情報を1件。
      // multiTarget と multiHit を同じカウントで表現しない。
      { index: 0, targetId: "B1", hit: true,
        damage: 25, hpBefore: 100, hpAfter: 75 }
    ],
    statuses: [],  // 状態効果の確定結果
    winner: null
  }
}
```
- 命中/ミス、会心、ガード、キャンセル、KO、状態の付与/解除、複数対象・複数打、**一撃ごとの攻撃順**が必要ならイベントに事実として載せる。数字・結果を描画側で計算しない。
- リアルタイム映像に合わせて**いつ命中表示を開始するか**はプレゼンテーション計画で別に定義。アニメ開始直後にHPが最終値になる問題を防ぐ。
- 既存`eventId` / 命令`clientSeq` / host`revision`は**異なる概念**。既存の保持・再送/重複防止を壊さず、`schema`互換を段階移行。
- 第1試合の「ひゃくれつ肉球」カットイン→フィールドの連続命中と、「トホホの砲」の状態変化を**異なる技定義・演出パターン**として扱う。

### B3. 時計は3つ、各々別の責務
1. **行動順クロック（論理）**：速度、待ちポイント、前衛交代/行動権の制御。`engine/phase1.mjs`の実測ソースに基づく資産を再利用。
2. **戦闘進行クロック（ホスト）**：いつ新しいルール上の出来事が発生するか。今の固定2600msは試遊用で、原作秒数とは確定していない。原作映像から対応づけを取るまで**変な任意値へ置換しない**。
3. **演出クロック（各端末）**：上画面のカットイン/命中数字/戻り。通信状態の遅延と描画フレーム低下を扱うが、**HPの権威を持たない**。

### B4. 自分の操作と「相手に何が見えるか」を分ける
- **確定戦闘状態**はホスト1つ。**自分側表示**と**相手側表示**は違っても良いが、ダメージ判定自体は分けない。
- 原作の相手モーション中に見た目が保留される研究対象（ノーモーション、カウンター等）は、戦闘エンジンの仕様とプレイヤー別画面投影で実装。**ノーモーションボタン**やスナップショット単純delayのハックは採用しない。
- ミニゲーム中も上画面の戦場が見えている。下画面の操作状態は`idle → choose-target → touch-challenge → complete/cancel → idle`などの明示的な小さな状態機械（独自巨大フレームワーク不要）。
- 通信が1回遅れたための「見えてない」と、**原作意図の表示保留**を混同しない。

## C. 何を残し、何を取り替えるか
| 維持 | 独立・移行 | いまは入れない |
| --- | --- | --- |
| Firebase RTDB（学校Friends/無認証）、部屋番号、Google Sites直貼りビルド、ホスト権威+seq/ACK | `combat.mjs`から技効果・行動選択・状態、`match-stage.mjs`から下画面タッチ・プレイヤー別表示・演出 | 新サーバー、新認証、パーティ育成、ランキング、履歴保存、リプレイUI、余計なログ集め |
| `phase1.mjs`待ちポイント研究、`match-protocol.mjs`基本コマンドと決定的テスト | **技ごとの正規イベント**、全体技vs多段技、相手視点の観測表現、演出状態 | Phaser/Pixi/Three.jsへの先行全面移行、無根拠な必殺ごと一律多段化 |
| 両者同一レンタル6体、もとのSafariタッチ・可視性対策 | 技ごとの証拠台帳、原作動画タイムコード、画面・操作受け入れ条件 | 研究だからといって通信レイヤーや学校公開版を壊す設計実験 |

## D. **移行方法は縦切り・段階的**（一気に作り直さない）
**Stage 0｜2026-10-28 現行版の固定**
- 開発ブランチの現在コードをベースラインとして固定識別。学校Google Sitesの現行稼働HTML、`main`、Firebase本番Rules/DB/旧Driveを保護。
- 既存604件の単体テスト、自然終局4 seed、Chromium上下画面/10タッチ/Firebase2窓のテストを**比較の出発点**として保存。既存テストが通ることは原作再現の証明ではない。
- 元の試合での「指操作→行動→表示→勝敗」観測点を一つずつ原作の根拠リンクへ結ぶ。

**Stage 1｜原作仕様台帳＋技ID/データ契約から**
- 6体のキャラ・必殺・通常攻撃/妖術・おはらいを最低限対象に、`status:observed/secondary/unknown/fixture`、video time、source URL、タッチ入力、ターゲット、結果、演出種別を記録。
- 1本目で実確認した連打おはらい、照準、3種の異なる必殺、同一の必殺再発動を最初の受け入れ例にする。2〜4本目MP4は受信済だが解析が失敗しているため**未観察**を維持。
- 技データスキーマと検査テストを先に作り、既存レンタルとの対応表をつくる。**不明な効果は存在したことにしない**。

**Stage 2｜戦闘の1アクションを縦に作り直す**
- まず**通常攻撃の1ヒット→複数ヒット**の結果契約を既存コードで同一にする（原作で多段と分かる技のみ）。
- 次に**単発必殺**と**技固有の多段必殺**と**補助/状態変化必殺**を同じ結果契約へつなぐ。変更前と後の同じシードで、意図しないダメージ・勝敗・妖気変化がないことをテスト。
- 現行`applyResearchSpecial`の全再設計を一気にせず、1種類に対応→保存→テストしてから次へ。結果/演出の責務混在を無くす。

**Stage 3｜表示と操作を分離**
- `ui/match-stage.mjs`から`watch-input-controller`、`battle-view-projector`、`animation-player`等の責務を抽出。ファイル名は仮。
- 原作第1試合の「おはらい中も上画面3vs3」「完了→サークル」について、DOMのリアル描画とタッチ操作で検証。
- 技に応じてカットイン/単発/多段/複数対象/状態を**同じ確定イベント**から構成し、描画のために余分なHP変更をしない。

**Stage 4｜対戦時系列と相手視点**
- ルール側の原作タイミング資料と実動画を追い、ホスト進行時計/行動ポイント/表示保留を順に近づける。
- Firebase Emulator 2 Chromeで**ホスト・ゲストそれぞれの表示と入力**を検査。タッチの途中に戦況更新が入っても操作DOMが失われない、2人のダメージ・勝敗が一致、表示遅れ中に重複行動しない。
- 原作で未確認の表示保留の正確な開始/解除条件は、結果を断定せずテスト仮説として保持。

**Stage 5｜学校iPad Safariで確認してから候補版にする**
- Chrome QAは実Safariの証拠ではない。Google Sitesコード埋め込み＋学校iPad 2台で操作・ヒット・チャージ/おはらい・長試合を確認。
- 新候補を別名でビルドできても**本人の指示なしに学校サイトの現行版へ反映しない**。

## E. 合格ゲート
- **Mechanics**：ひゃくれつ肉球が多段で、単発/範囲/状態技に偽の複数ヒットを付けない。実際の技種ごとの結果とKO処理が確定ルールで説明できる。
- **Visual**：1試合目の観察時刻と対応する動画で、操作の入口・下画面表示・上画面戦闘・完了・技別カットイン・命中順が連続して比較できる。
- **Multiplayer**：両者のHP/勝敗/妖気一致、コマンド重複処理なし、操作中のゲスト描画継続、正規状態と表示用状態の境界明確。
- **Regression**：604/604現存単体テストを維持し、新しい正規イベント/動画由来の受け入れ試験を追加する。古いテストが不適切なら、原作根拠と変更理由を記録して更新。
- **Release**：School Safari実機の試遊結果が取れるまで「原作再現完成」「オンライン完全安定」と言わない。

## F. 中長期の判断
- 原作再現の主な欠陥が**仕様不確実・技効果・時系列**なら、Canvas移行/新言語導入で解決しない。DOM/SVGの改良を優先する。
- 1つの`moveId`の導入のために巨大な新依存/ECS/抽象クラスや全域EventBusを増やさない。先に**正規結果と型/契約**を確定する。モジュール分割の目的は変更箇所を減らすこと。
- 動画の著作物はリポジトリへコピーしない。観察時刻、ルール、タッチ、実装差分だけ記録する。

## 参照
- 前ADR: [ADR-0001](./ADR_0001_ORIGINAL_EXPERIENCE_FIRST_ARCHITECTURE_20261027.md)
- 原作映像2巡目: [MATCH01](./MATCH01_SECOND_PASS_INPUT_AND_TIMELINE_20261027.md)、[Phase51深掘り](./PHASE51_ORIGINAL_FOUR_MATCH_DEEP_RESEARCH_20261027.md)
- GitHub実コード：`engine/combat.mjs`, `engine/phase1.mjs`, `engine/match-protocol.mjs`, `engine/special-effects.mjs`, `ui/match-stage.mjs`, `ui/battle-vfx.mjs`, `presentation/action-choreography.mjs`, `network/firebase-match.mjs`, `lab/sites-embed-online-entry.mjs`.
- *Game Programming Patterns*, [Command](https://gameprogrammingpatterns.com/command.html), [State](https://gameprogrammingpatterns.com/state.html), [Event Queue](https://gameprogrammingpatterns.com/event-queue.html) —入力意図・状態遷移・結果/演出の非同期分離。
- [Firebase RTDB Web read/write](https://firebase.google.com/docs/database/web/read-and-write) —スナップショットの受信・コミット完了の意味を区別。
- [MDN Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API), [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) —非表示iframeの描画停止・タイマー遅延。
