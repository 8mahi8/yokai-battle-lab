# Architecture V2 — 原作の戦闘を丸ごと再現するための実装設計（2026-10-28）

**状態：現行コード実体を確認した全体設計案。新ルール・新タイマーのゲーム本体実装はまだ。**
依頼：「妖怪・技だけでなく、対戦ゲームの全容を踏まえ、**効率的かつ原作に近いコーディング設計**を組めないか」。
**答え：可能。今後は個別モジュールを増やすだけではなく、実際の戦闘の縦切り実装と実戦動画の受け入れ試験に集中する。**
設計でのゴールは**「同じ操作と状況から、原作らしい判断・命中・画面遷移が発生する」**こと。原作ROMの内部ソースを模写することでも、テスト件数やファイル数を増やすことでもない。

## 0. 譲れない条件
- 学校iPad Safari / Google SitesへのHTML/CSS/JS**直接埋め込み**、Firebase RTDBで2人の身内対戦、無料。
- 既存のAuth無しFriends接続、ルーム番号、ゲスト入力ACK・ホスト単一権威は維持。**匿名認証の追加・ログイン・復帰用の余計な画面・履歴保存・ランキングは禁止**。
- 最初は双方同じ**オリジナルレンタル6体**。キャラのオリジナル性と原作対戦ルールは両立。
- 閃光魂は初期段階から除外。育成・大量妖怪・装備選択の複雑化はしない。原作にない「ノーモーション必殺ボタン」も禁止。
- **main / 学校Google Sites稼働版 / 本番Firebase Rules・DB・既存配布ファイルは変更しない**。開発ブランチ`feat/phase1-action-circle-lab-20261023`で進め、実機で合格した候補のみ明示的に昇格する。

## 1. 今すでに分かったゲームの全体モデル
### 1.1 妖怪の定義（静的）
- 1体 = ID・名前・種族・ランク・HP/ちから/ようりょく/まもり/すばやさ・属性相性・性格（行動傾向/まじめさ）・4技（こうげき/ようじゅつ/とりつく/必殺）・固有スキル。装備は初期6体では固定/なしでよい。出典・確信度を管理する。
- 新`content/yokai-definition.mjs`, `content/rental-yokai-definitions.mjs`, `content/skill-catalog.mjs`, `content/combat-catalog.mjs`は**著者用のデータ台帳**として作成済み。**いまの戦闘結果にはまだ接続していない**。
- **次の改善**：`MoveDefinition`はキャラごとに丸ごと内包せず、**共通`moveId`→正規技マスター**に定義する。キャラは技ID4つとスキルIDだけを**参照**する。現在`combat-catalog`は同内容同IDの重複を許可するが、「キャラ側にフル技定義を複製しておく」構造は後で二重管理になる。既存`combat-catalog`への移行アダプタを用意してから正規化し、古いリースの結果を破壊しない。
- 技の効果は単発/多段/全体/回復/バフ/とりつき/蘇生等で**同じ基本構文を再利用**する。ただし原作の特殊技で通常構文に載らないものは「小さな専用`handlerId`」を認める。**巨大な抽象DSLや任意コード実行/evalを導入しない**。

### 1.2 試合中の状態（動的）
- **正規`BattleState`**：試合ID/seed、各妖怪の現在HP・妖気・状態変化/継続時間・行動待ち値、前衛3/後衛3のサークル配置、ピン、ウォッチ形態、必殺チャージ・おはらいの処理状態、スキルの消費フラグ、勝敗。
- **入力状態**：タッチ中の一時UI、スワイプ軌跡、チャージミニゲーム進行など。入力が受理された時のゲーム結果はホストだけが決める。**指の生座標を戦闘本体の長期状態に溜めない**。
- **正規バトル結果**：技の1ヒットごとの命中/会心/軽減/HP前後/追加状態・妖気増減/スキル発火/KO。これは**画面・ネット通信とは独立した事実**。
- **表示状態**：上画面のポーズ/ヒット数字/テキスト、下画面のサークルまたはミニゲーム、**プレイヤー視点別の見え方**。確定HPを表示側が再計算・増減してはならない。

### 1.3 対戦ループ
1. 二人の入室→両者同じ6体→前衛3/後衛3。
2. 行動順は**待ちカウンタ/Speed**に従う（既存`engine/phase1.mjs`を使う）。通常技・性格・サボり・ターゲットで**自動行動の内容**を決める。
3. 並行してプレイヤーがサークル、ピン、ウォッチ切替、必殺、おはらい、つつくを操作する。**必殺やおはらい中でも上画面の戦闘は継続**。
4. 動作開始→命中/効果確定→スキルや追加状態→勝敗判定。**行動結果を決める順序と画面で見る時間を分離**。
5. 対戦相手に見える**サークル・準備の表示がモーション中に保留**される研究仕様がある。相手視点を独立に投影するが、相手の真の状態を改変しない。
6. 全妖怪のHPが0になった側の敗北→両者に同じ正規勝敗→結果画面。

## 2. 推奨アーキテクチャ（**1つのエンジン＋薄い境界**）
```
   authoring content (Characters, Moves, Skills, Sources)
                      │ build/validate once
                      ▼
                Compiled Catalog
                      │
  local touchscreen ──┴──► Intent {side,command,seq}
                               │
                               ▼
                       Match Protocol (existing)
                        host-only dispatch/ACK
                               │
                               ▼
                         BATTLE CORE
     ┌───────────────────────────────────────────────┐
     │ Combat State (HP/Soul/Status/Party/Skills)    │
     │ logical Wait Scheduler (phase1)               │
     │ input rule state machine (charge/purify/poke)  │
     │ action selection AI and deterministic RNG    │
     │ Resolve Move + ordered effect/skill hooks     │
     └──────────────────┬────────────────────────────┘
                        │ authoritative state
                        │ ordered outcomes (IDs)
             ┌──────────┴─────────────────┐
             ▼                            ▼
        RTDB snapshot                 Per-seat View Projector
        (host → guest)                      │
             │               ┌────────────┴────────────┐
             └──────────────►│ allowed presentation     │
                             │ and visibility timeline   │
                             └────────────┬────────────┘
                                          ▼
                              Animation Player (client)
                               upper screen / lower watch
```

### 2.1 役割と実際に変更するファイル
| 境界 | 責務（どこまでが正しい） | 再利用/変更 |
|---|---|---|
| **Content** | 妖怪・技・スキルのID/定義/原作根拠、同定義の一意性、静的検査 | `content/*` V1を正規`moves[id]`に移行。**戦闘のHP変更は禁止** |
| **Match Core** | 純粋にseed/入力/前状態→**次の確定状態と結果**。Wait、性格、妖気、連打判定、技効果、スキル、勝敗 | `engine/combat.mjs`を`battle-state`/`action-selection`/`move-resolution`/`status-and-skill`等**必要になった箇所だけ抽出**。今すぐ全部細分化しない |
| **Command/Clock** | プレイヤー入力の順序とホスト唯一の実時間参照、ホストの行動発生判断 | `engine/match-protocol.mjs` と `ui/host-auto-clock.mjs`を維持、2600ms仮時計とWait行動順は**別の設定** |
| **Transport** | 二人のルーム/seat、ゲストintentの送受信、重複抑制、ホスト正規snapshot配布 | `network/firebase-room.mjs`/`firebase-match.mjs`を維持。**演出や敵の回転表示保留をRTDBの通信遅延だけで再現しない** |
| **Presentation** | 事実から技固有のモーション、ヒット単位の数字、状態表示/カットインの開始と終わり | `presentation/action-*.mjs`、`ui/battle-cue-sequence.mjs`を段階更新。**HP・RNG・ターゲット判定はしない** |
| **Player View/UI** | 自分の操作進行と相手に見える配置（表示保留）、3vs3上画面/サークル下画面、タッチイベント | `ui/match-stage.mjs`から必要な投影・入力部だけ抜く。**原作仕様としての表示保留**とネット遅延を区別する |

**責務は6つあっても、6つの大規模フレームワークを新造しない。** 現在のモジュールを動かしながら境界を少しずつ整える。ブラウザ上の一方の操作がフリーズしても、ホストのHP計算が画面ロジックに引きずられないこと。

## 3. 次の最優先コントラクト：`ActionOutcome v2`
実行と演出を繋ぐ**一つだけの共通言語**を作る。下は構造例で、原作の数値・演出時間を確定したサンプルではない：
```js
{
  schema: 2,
  eventId: 120,             // 試合内で一意・単調増加
  actionId: 58,             // 通常攻撃/必殺の一連の行動を束ねる
  actorId: "A1",
  moveId: "move:example",
  actionKind: "soultimate",
  outcome: {
    hits: [
      {sequence:0,targetId:"B1",hit:true,critical:false,
       hpBefore:100,hpAfter:82,damage:18},
      {sequence:1,targetId:"B1",hit:true,critical:false,
       hpBefore:82,hpAfter:65,damage:17}
    ],
    effects: [
      // statusEffect, statDelta, soulDelta, skillTriggered, KO...
    ],
    winner: null
  }
}
```
- **`hits.length` は正規の攻撃試行数**。`targets.length`とは独立。同時3体攻撃を勝手に「3段技」と解釈しない。
- 必殺、通常攻撃、妖術、回復等は共通の`outcome`で表す。ただし回復とバフは`hits:[]`、`effects:[]`を使い、**ヒット数ゼロが発動回数ゼロを意味するわけではない**。
- `eventId`（戦闘事実）、`actionId`（一連の技）、`revision`（同期版）、`clientSeq`（入力受付）は混同しない。
- `phase`（予備/ヒット/復帰）や画面表示秒数は`ActionOutcome`に入れず**PresentationPlan**のみに持たせる。原作特有の相手側反映保留は**PerSeatVisibility**で持つ。
- ダメージ・HP/妖気・状態付与はホストで1回だけ確定。各端末は受信結果から`timeOffsetMs`に合わせて**表示用HP**だけ切り替える。プレゼンテーションが遅れても正規HP・勝敗は変わらない。
- **特定の技にだけ専用演出**を指定し、汎用技を勝手に多段化しない。連打のヒット間隔や固有ポーズは原作フレーム/資料が足りるまで`unknown`。

## 4. 効率的な技・スキル実装方法：共通プリミティブ＋限定フック
1. **共通効果種**：`dealDamage`（単体、複数打の試行を許す）、`healHp`、`applyInspirit`、`changeStatStage`、`restoreSoul`、`revive`、`guard`等。キャラが独自「行動クラス」を所有するのでなく、`moveId`が検証済みの効果形式を指す。
2. **ターゲット判定**：`oneEnemy`、`frontEnemies`、`oneAlly`、`frontAllies`、`teamAllies`など。ピン/属性/身代わり/スキルによる変更も戦闘本体で最終決定。UIでHPのターゲットを決めつけない。
3. **固有例外（スキル）**： `beforeDamage`、`onCriticalRoll`、`onKO`、`afterAction`等の**少数の明示フック**を許す。ただし呼ぶ順番をドキュメントとテストで固定し、予期しない重複発動・無限連鎖を防止。`eval`/任意スクリプト/API側からの動的効果実行は無し。
4. **技/スキルの元データ**は`catalog`に1回だけ置く。後から増やすとき基本は**技のデータ+そのカテゴリのテスト**。原作に本当に特殊な処理がある場合に限り新handlerを1つ追加。
5. **キャラ/技の確信度** `observed`（録画時刻）/`documented`（説明書/資料）/`fixture`/`unknown`を維持。確定したと書くフィールドに出典URLか映像時刻がなければCIで拒否。

**注意**：汎用効果を増やしすぎて「何でも書ける言語（DSL）」にしない。1技のためにルールエンジン全体を書き換えなくてよいこと、原作の戦術を壊さないことが目的。

## 5. 時計と相手視点の再現
**時計が3つ**ある：
- `logicalWait`：速度と初期待ち・行動後待ち・交代後待ち。現行`phase1.mjs`は参考資料で計算可能。**ミリ秒とは違う**。
- `hostWallClock`：どの時点で次の確定行動/入力期限/回転受付を許すか。現行2600msは仮。原作実時間と混同しない。
- `localPresentationClock`：技カットイン/状態表示/数字/硬直の流れ。各端末の描画フレームや非表示iframe停止と独立した正規同期。

**表示はプレイヤー別**：
- `visibleSelf`：自分のサークル・チャージ操作・おはらい画面は操作入力に応じて更新。
- `visibleOpponent`：相手の輪や必殺準備は、原作モーションにより保留され得る。**どのイベントをいつ開示するか**だけ制御し、確定`BattleState`は変えない。
- `battleStage`：実際の命中/HP/演出の開始点を全員の同じ正規結果から投影。
- 戦闘モーション中に自分のサークル回転が受理されても、**相手画面への表示反映が後になる場合がある**という競技者の知見を、今後元動画/複数視点で検証する。意図的な表示保留とFirebase同期遅延を混同しない。表示保留の正確な解除条件は`unknown`のまま。
- 固定ステップ物理演算用の複雑なECS/物理ゲームループはこの戦闘の要件ではない。**決定論的な行動順イベント**を使い、描画は`requestAnimationFrame`で表示だけ進める。背景タブ/iframeでrAFが一時停止するのを想定。

## 6. 重要な設計判断（やらないこと）
- **Firebaseを全面作り直さない**。既に対戦できている身内用の通信基盤を守る。正式なサーバーや匿名認証を追加しない。
- **Canvas/WebGL/Phaserへ先行移行しない**。現行DOM/SVGで実現不能だと実機計測で証明してから判断。
- **原作でない先回り補助/独自仕様を加えない**。次5行動の研究UIは学校で隠す、閃光魂なし、勝手なスキル効果や技数を追加しない。
- **全ファイルを書き直さない**。`engine/combat.mjs`約55KBと`ui/match-stage.mjs`約46KBは大きいが、巨大だから全部作り直すのは危険。**目の前の縦切りで1箇所抽出**を積み重ねる。
- **毎回新しい研究専用サブエンジンを増やさない**。`ADR-0002～0004`で台帳は揃っている。次に書くコードは**既存オンラインゲームの戦闘へ接続する具体的な1技**から。
- **リプレイ閲覧、永続履歴、観戦、復帰アカウント、独自ログ解析サービス等は追加しない**。開発中の一時的なseed固定/テスト用ジャーナルは可。

## 7. 段階移行の実行単位（失敗時の戻し方）
**STEP 0 / 現行を固定・新設計の整合チェック**
- 現行ブランチのコード構成と実学校配布の差を区別。基準は`Research Unit 614/614`とStage Chromium、Firebase Emulator/2ブラウザ、Friends HTML構築。ただし学校Safari2台の新版試遊は未確認。
- `engine/combat.mjs`→`ui/match-stage.mjs`→Firebaseへの依存は今の挙動を維持しておく。

**STEP 1 / 最初の縦切り（最優先、機能を増やさない）**
- 現在の通常攻撃1技を選ぶ。`legacy attackPower/attackHits`と`catalog.moveId`が表す仕様をアダプタで一対一対応。
- 結果を新`ActionOutcome v2`へ変換する**薄いアダプタ**を置き、**旧状態・ダメージRNG・ゲストスナップ・勝敗は変更しない**。変換結果の`hpBefore/hpAfter`は根拠ある旧確定状態からのみ取得。取れない項目は`null`で明示し、**都合のよい値を生成しない**。
- `1回の攻撃→結果→画面に対応する数字`の通しブラウザテスト。旧/新イベントが混在する途中は`schema`と互換アダプタを厳密に分け、二重演出しない。

**STEP 2 / 行動結果の共有処理を有効化**
- 通常物理の単発/多段を同じ定義と解決器へ移す。次に妖術（単発攻撃/回復）、とりつく、スキル発火。
- **必殺技**は既存`engine/special-effects.mjs`が`multi-hit processing`未実装を明記しているため、`multiTarget`と`multiHit`を切り分けた技別処理に移行。
- `single-target multi-hit`、`multi-target single-hit`、`status-only`、`revive-heal`を別ケースとしてテスト。未確定の原作回数/威力は仮値と表示。

**STEP 3 / 演出・操作・双方画面**
- 同じ`ActionOutcome`から1ヒットずつ表示。技ごとの固有カットインと命中順を**動画のタイムコード**で照合。
- 下画面`idle/commandSelect/challenge/completion`などの小さな状態を整理し、おはらい中も上画面が見える状態を維持。
- **プレイヤー別Visibility**と時間軸を後から足して、原作競技者が説明する表示保留→ノーモーションを自然発生させる。原作資料が不明な部分はテスト仮説扱い。

**STEP 4 / オンライン・学校の合格**
- Firebase Emulatorホスト/ゲスト2ブラウザで、同じ正規HP・妖気・結果、ゲスト連打による二重アクション防止、モーション中のサークル/チャージ/おはらい、通信更新中の指DOM保持を検査。
- Google Sites埋込の校内Safari 2台試遊で、実戦の動き・応答と負荷を確認。**本人による明示的な稼働版差し替えがあるまで学校のGoogle Sites版には手を入れない**。

## 8. 動画を使う受け入れテスト（今ある1試合目）
原作録画は**4本受信済み、現物フレームの観察ができたのは1本目のみ**。2〜4本目の検証は未完了で、勝手に「分析済み」と記録しない。

| ゴールデン場面 | 何が再現できたら合格か | 現状 |
|---|---|---|
| 00:15–00:20 連打おはらい | 上画面の戦況表示を隠さず、下画面で**連打→完了→通常サークル** | Stageは操作画面を下段に分離済、完了動作は不足 |
| 00:32–00:38 ねらう | 上画面の丸い照準、下画面での対象選択と結果が一致 | 一部UIあり、元動画と操作順比較未完 |
| 00:44–00:52 ひゃくれつ肉球 | **その技が多段だから**、技固有カットイン→複数の命中数字/HP反映→復帰 | 既存必殺は共通仮モデル、技固有の正規命中数未確定 |
| 00:59–01:05 トホホの砲 | 別のカットイン/攻撃効果/素早さダウンを**効果処理と同期** | 仮イベントと原作が未一致 |
| 01:44–01:50 大ガマ変化の術 | 技別の固有ポーズ/場面転換/発動結果 | 汎用カットイン依存、未完 |
| 01:54 MISS / 02:01–02:06 決着 | MISSを命中扱いしない、HPと勝敗がホスト/ゲストで一致 | 一部テストあり、動画同条件対比未実施 |

**設計に必要な資料が足りなければ`unknown`とし、数値やモーションを無理に決めない**。原作動画の1画面だけでは相手視点の可視性を確定できない。

## 9. テストと開発作業の進め方を変える
**今後1つの工程で行うのは、必ずこの順番：**
1. **Evidence**：原作映像/公式資料/競技者研究から**何が分かって何が不明か**を記録する。出典URL/動画時刻と確信度。
2. **Scenario**：1つの代表局面の入力→最終状態→発行イベント→相手視点→演出を**受け入れ仕様にする**。
3. **Implementation**：エンジンの既存コードを最小限変更し、定義/結果を繋げる。余計な新機能や先回りする別ゲームモードは追加しない。
4. **Verification**：seed固定試験、旧版/新版の結果比較、実Chromium + Firebase二窓、自分で画面/PNGの実物レビュー、最終的に学校Safari。**CI全通過だけで原作再現度100%とは主張しない**。
5. **Handoff**：何を実装/観測/保留したかを最新引継ぎ入口に追記。学校配布物は依頼時だけ更新。

**Definition of done**は、設計ファイルを作ったことではなく「**原作の該当シーンと比較して、同じ判断で同じ種類の結果/操作/表示が出ることを自分で再現できた**」。
まだ原作に不明な数値は完全一致宣言せず、`fixture`として区別。

## 10. 参考資料と判断理由
### 原作系
- [任天堂 YW2公式マニュアル（英語版）](https://csassets.nintendo.com/noaext/image/private/t_KA_PDF/manual-3DS-Yo-Kai_Watch_2_Fleshy_Souls) : 二画面/基本操作。
- [Mt. Wildwood — Turn Order](https://www.mtwildwood.net/turn-order.php) : Waitカウンタ、初期待ちと行動後の重み。**YKW1/2/3別欄を混同しない**。
- [Mt. Wildwood — Yo-kai Wheel](https://www.mtwildwood.net/yokai-wheel.php) : 回転時の待ち、Yaw2の4秒タイマーと対象戦闘未解析を区別。「オンライン4秒+次5秒」はYKW1欄なのでYKW2へ移植しない。
- [対人プレイヤー：モーションとサークルの表示保留](https://note.com/tombow_yw/n/n1e4cf179d2d9) : 競技者観察でありROM解析による全状況保証ではない。
- [本人提供動画の1試合目精査](./MATCH01_SECOND_PASS_INPUT_AND_TIMELINE_20261027.md)。
### コーディング系
- [Game Programming Patterns — Command](https://gameprogrammingpatterns.com/command.html) : 入力意図とその実行結果の責務分離。
- [Game Programming Patterns — Type Object](https://gameprogrammingpatterns.com/type-object.html) : キャラの種類ごとの設定を参照型として保持。
- [Game Programming Patterns — Event Queue](https://gameprogrammingpatterns.com/event-queue.html) : 時間差のあるアクションと表示の疎結合。**小さな局所キューだけ**。
- [Game Programming Patterns — Decoupling](https://gameprogrammingpatterns.com/decoupling-patterns.html) : 変更時の影響範囲の縮小。
- [Gaffer on Games — Fix Your Timestep](https://gafferongames.com/post/fix_your_timestep/) : シミュレーションと表示の時計を分離する考え方。**本作で物理固定ステップをそのまま導入する根拠ではない**。
- [MDN — Page Visibility](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API) / [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) : Safari iframeや非表示タブで描画時計は止まり得る。
- [Firebase RTDB web read/write](https://firebase.google.com/docs/database/web/read-and-write) : クライアントの書込み通知≠サーバー確定（ローカル先行通知に注意）。
### リポジトリの当該資産
`engine/combat.mjs`, `engine/phase1.mjs`, `engine/match-protocol.mjs`, `engine/presentation-timeline.mjs`,
`ui/battle-cue-sequence.mjs`, `presentation/action-choreography.mjs`,
`content/combat-catalog.mjs`, `lab/sites-embed-online-entry.mjs`,
`network/firebase-match.mjs`。前の[ADR-0002](./ADR_0002_ORIGINAL_PVP_CORE_REARCHITECTURE_20261028.md)、[ADR-0003](./ADR_0003_YOKAI_CHARACTER_DEFINITION_V1_20261028.md)、[ADR-0004](./ADR_0004_MOVE_SKILL_REGISTRY_V1_20261028.md)と矛盾する場合、**実装コードを確認し差分を明記して更新**する。
