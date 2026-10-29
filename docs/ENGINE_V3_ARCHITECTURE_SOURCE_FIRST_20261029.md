# YW2対戦｜ゲームエンジンV3 再設計ADR（2026-10-29）

**状態：V3設計決定・V3-0完了。V3-1はコマンド分離＋実行/予測の行動ポイント共通化＋3時間領域の診断契約＋単一MatchCore入口まで実装・回帰合格。内部の状態/Effect/原作の時刻同調は未完成。**

## 0. いま方針転換する理由／本人の完成条件

本人から「しっかり調べてる？ 一個ずつ再現するんじゃなくゲームエンジンを作るところから」と指摘。従来の「動画の一場面→単独技の専用処理→単独UI演出」という順序は、全体ルールの状態遷移と、各技/キャラの作用点、対人戦での駆け引きをまとまった仕組みとして再現できない危険がある。**以後は技を1件増やすより先に、整合した戦闘エンジンへ統合する。**

合格定義：**原作『妖怪ウォッチ2』の対人戦ルールをなるべく忠実にした1vs1**。学校iPad Safari、Google Sitesへ単体HTML貼り付け、既存の**Firebase Realtime Database・認証なしFriends**、ルーム番号。身内用・無料。育成・Flash Soul・ログ/リプレイ機能・大量のキャラは初期版から除外。既存の本番Google Sites版、main、Firebase本番Rules/DB、Driveは本人の明示依頼まで変更しない。

なお「元動画を今見た」などの主張は禁止。今回の原作動画はGitHub内の時刻付き既存解析記録を参照したのみ。技効果・行動ポイント等の推測と確証は必ず分離する。

## 1. 事前に照合した資料（証拠と限界）

### 原作ゲームの権威的説明
1. LEVEL-5公式『[妖怪とバトル](https://www.youkai-watch.jp/yw2/game/game06.html)』：ウォッチ零式、Gわざ、チャージ、つつくの公式画面。**細部の内部処理や対戦の命中計算は掲載されない**。
2. [妖怪ウォッチ2攻略の虎｜バトル](https://toragame.com/youkai2/kihon/battle.php)＋[game-e 妖怪レンズ](https://game-e.com/youkai-watch-2/battle/youkai-lens.php)：3前衛/3後衛、敵ピン、必殺、後衛おはらい、ウォッチ零式、Gわざ・つつくの操作。**操作の種類の根拠として使い、タップ回数・確率の根拠にしない**。
3. [たくトンボ｜妖怪ウォッチ2対戦の基礎テクニックと仕様](https://note.com/tombow_yw/n/n1e4cf179d2d9)：妖気の差、モーション中に相手のサークル切替/チャージが即見えないこと（ノーモーション必殺）、カットイン中の対象変更、行動ポイント。**対戦経験に基づく研究であり、内部実装の全てを確定する公式仕様ではない**。記事内も倍率に一部不確実性を明記。
4. [たくトンボ｜育成の知識](https://note.com/tombow_yw/n/nfb9184c724cd)：素早さと行動ポイントに関する実戦推定。**確定計算式としてコードに直書きしない**。
5. 本人の既存動画解析記録 [MATCH01第二巡](./MATCH01_SECOND_PASS_INPUT_AND_TIMELINE_20261027.md) と [学校2026-10-27試遊](./PHASE43_SCHOOL_20261027_REAL_USER_PLAYTEST_FIXES.md)。時刻付きの上下画面/敵味方視点、実物フィードバックを優先する。元MP4の直接再視聴は本工程で未実施。

### 設計の外部参考（このゲームへ巨大エンジンを導入しない）
6. Epic公式 [Gameplay Ability System Overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/understanding-the-unreal-engine-gameplay-ability-system)：Abilityを「開始/進行/終了」、資源コスト・効果・持続・中断・演出に分ける。**Unreal自体を導入する案ではない**。
7. [Flowstate ADR｜Authoritative Multiplayer Architecture](https://github.com/project-flowstate/flowstate/blob/main/docs/adr/0001-authoritative-multiplayer-architecture.md)：入力・権威エンジン・描画/ネットワークを分離し、状態遷移を決定的に保つ。**Firebaseは現在のまま**。

## 2. 実際のGitHub監査：既存基盤は捨てず整理する

調査対象開発ブランチ：`feat/phase1-action-circle-lab-20261023`（2026-10-29）。

- `engine/combat.mjs` **約1185行**：`createCombat`が通常攻撃・回復・技・とりつき・Soul・おはらい・つつく・必殺・一部カウンター・KO・スキルを横断。多数の`research*`と`catalog*Resolution`フラグが1つの巨大関数に混在。**責務集中**がリスク。
- `engine/phase1.mjs` **約256行**：サークル・待ち点・行動順管理。現行`waitCostFromSpeed`および最初の前衛待ちは原作との完全一致未証明。`turn`の行動順と、ミリ秒を使うプレイヤーの回転/必殺チャージ/相手に見える時刻の境界が分散。
- `engine/selection.mjs` **75行**：4種類の行動の条件付き重み、性格による優先。スキルや受動効果と単独で複合検証されていない箇所がある。新妖怪を増やすと条件が増殖しやすい。
- `engine/inspirit.mjs`・`soul.mjs`・`purify-input.mjs`：独立した正規状態は存在する。**効果が発動する順序や強化/弱化のhook規約が未統一**。将来全てを設計し直すより入口/出口を一本にする。
- `content/combat-catalog.mjs`、`rental-move-master.mjs`等：不変のキャラと4枠技ID参照という**良いデータ駆動基盤は既に実装済み**。捨てない。ただしデータが示す`effect`を共通で実行するレイヤーが未完成で、`catalog...Resolution`という個別の変換経路を多数持っている。
- `engine/match-protocol.mjs` **約305行**：入力正規化、seatごとのseq、host ACK、状態fingerprint、再現可能journal/リプレイ。**維持する強み**。`network/firebase-match.mjs` **約292行**：現在のFirebase Friends transport。書き直さない。なおjournalはテスト用内部機構であり、友達向けの履歴・リプレイUIを作るという意味ではない。
- `engine/presentation-timeline.mjs`：相手視点への遅延を模した**研究オプション**。一方`presentation/action-choreography.mjs`・`ui/match-stage.mjs`側にも時間/演出を制御する部品がある。**戦闘確定状態と「まだ相手が見ていない状態」は別々に扱う必要**。
- `ui/match-stage.mjs` **約1034行**：上下画面/ジェスチャー/ソースイベントの演出が集中しがち。UIの専用ロジックは維持しても、効果判定・行動順の決定をUIへ移さない。

**重要な訂正**：「Phase1完了」は当時の内部統合テスト完了であり、原作忠実で拡張性ある統一エンジン完成とは意味が異なる。既存の694件PASSも「原作完全再現」を証明しない。

## 3. 新アーキテクチャ（いきなり全面書換えしない）

```text
[immutable content: yokai / move / skill / evidence]
         ↓ validated ruleset + optional research ruleset
[authoritative MatchCore (one simulation owner)]
  ├─ State: teams, wheel, HP, stats, Soul, statuses, action points,
  │         pending inputs, battle phases, pending impacts, winner
  ├─ Command reducer: input validation → eligible? → deterministic changes
  ├─ Scheduler: logical action points and time/phase transitions
  ├─ Choice: eligible actions → ordered attitude/skill priorities → RNG
  ├─ Effect pipeline: target → hit/crit/guard → effect hooks → damage/
  │                   heal/status/Soul → KO/interrupt → win
  └─ Events: ordered, versioned, source-of-truth outcomes + timing stamps
         ↓
[Seat View Projector: A/B visibility, delayed opponent information]
         ↓
[Animation / lower-touch UI (never changes canonical state)]
         ↑ intents                  ↓ snapshots + ACK + events
[Existing Firebase Friends no-Auth Transport]
```

### 共通インターフェース（V3の設計案、まだ実装済みではない）

```js
createMatch({seed, rulesetId, rosters, catalog});
applyInput({side, clientSeq, action, receivedAt});
advance({elapsedLogicalTimeOrClockPoint});
snapshotCanonical();
projectView({side, visibleAt});
exportAuditJournal(); // internal deterministic QA, not a friend replay feature
```

- **単一の真実**：HP、status、Soul、前衛配置、攻撃先を変更できるのは`MatchCore`だけ。`ViewProjector`はその時点の確定状態を表示するだけ（敵側表示は、原作モーション仕様に沿って遅延が起きてもよい）。ネットワークは認証なしFriendsだが、**ホストのみ判定する**。
- **現状と違う点**：行動処理を個々の`if(kind==='...')`と`if(skill==='...')`追加で伸ばさない。例外なく共通の**Effect / Hook API**を通し、攻撃・妖術・とりつき・必殺は同じ対象選択/命中/ダメージ/継続判定基盤を共有する。
- **派生状態の区別**：`canonicalState`は対戦の真の結果。`seatVisibleState`はモーション中の敵表示遅延・一時的な上画面用表示。`UIAnimationState`は数字の飛び方/見た目の秒数。ユーザーの勝敗判定を変えるのは`canonicalState`だけ。
- **時間を一度定義**：`logicalActionPoints`＝妖怪の行動順、`hostInputTime`＝サークル操作/必殺入力、`motionVisibilityWindow`＝表示が進まない/遅れる時間。これらを混同しない。同じホストの確定イベントには`eventId`/`actionSeq`/`hostClock`の意味を明記し、再接続で再生済みの過去演出が出ないようにする。
- **大規模ECS/Unity/Unrealの採用は不要**。既存iPad単体HTMLと少人数オンラインの要件なら、**小さなJSモジュール+状態遷移+データ駆動**で十分。

## 4. データ定義は「追加キャラでエンジンを触らない」を原則に

### 妖怪（authoring catalog）
```js
{ id, name, baseStats, tribe, attitude, skillId,
  moveIds:{attack,technique,inspirit,soultimate} }
```

### 技（typed effect, composable）
```js
{
  id, category, targetPolicy, costPolicy, actionTimingPolicy,
  effects:[
    {type:'damage',sourceStat:'strength',element:'neutral',
     power:/* source verified */,hits:/* source verified */},
    {type:'applyStatus',statusId:'speed-down',chance:/* verified */}
  ],
  evidence:{level:'verified|observed|research|unknown',sourceIds:[...]}
}
```

### スキル（イベントhookで発動）
```js
{ id, trigger:'beforeAction|beforeHit|afterHit|beforeKO|afterKO|onRotate',
  conditions:[...], effects:[...],priority:/* explicitly designed ordering */ }
```

これは確定仕様ではなく**要求する設計形**。実装時に、`conditions`/`effects`の許可型を厳密なユニオンで定義し、自由にJavaScriptを埋め込む技能は初期には認めない。技の命中回数や属性/対象/必殺数値の不明箇所は`unknown`のままにし、推測で埋めない（既存ゲームを動かすためのfixtureは別表で管理）。

### エンジンが共有すべきhook順（**案**・原作順未検証）
`eligibility → target → beforeAction → beforeHit → accuracy/crit → guard/resistance → beforeDamage → HP/status/Soul mutations → interrupt/KO → afterHit → afterAction → win → event record`。
**原作の割り込み・技同時タイミングが不明な箇所はまだ優先順位を確定しない**。まずhook間で何が観測され何を変更できるかの契約を固定し、原作証拠から順序を詰める。未知の作用順でゲームの勝敗が変わる場合、原作忠実と表示しない。

## 5. 原作資料と真偽の管理表（効果に紐づく共通ルール）

`evidence`：
- **official/source-confirmed**：3DS版公式解説に記載。
- **cross-source-confirmed**：独立した3DS版資料で一致。
- **observed-in-original-video**：本人の録画にその操作/表示が写る。
- **competitive-research**：経験者の対戦研究（式やフレーム未検証）。
- **fixture/unknown**：ゲームのための試験値／未解明。

絶対ルール：**資料の種類・ゲームの版を持たせる**。例：「妖気の自然蓄積」は原作あり、「14タップでおはらい完了」はfixture。「相手側のサークル表示がモーションに遅れる」は対戦研究根拠あり、「何msか」は未確証。攻撃係数やジバニャンの20×5/7など版・資料が割れるHit数は確証まで保留。

## 6. 実装順：エンジンを作り切ってからキャラ/演出を増やす

### V3-0 現行エンジンの固定と互換証拠（この工程を開始）
- 現行`createMatchProtocol`→`createCombat`の**canonical snapshot/hash、ホストcommand、state invariants、KO/サークル/6体、決定性/replay**を、複数seedで固定した本番フラグの回帰テストにする。現在のルールが**原作と同じと言うテストではない**。
- 変更は開発ブランチのみ。稼働中のFirebase Friends単体HTML/学校Google Sites版は変更しない。

### V3-1 単一のCore状態と時間/phase契約
- `clock/soul/status/skills`の独立正規状態を`MatchCore`一箇所のAPIの内側で所有する。原作対戦で必要な`logicalActionPoints`、サークル入力、必殺チャージ/妨害/KO、相手への表示窓を分ける。**まず新APIが既存と同一試合結果**、修正が必要なところは原作証拠つきで差分を承認可能にする。

### V3-2 共通Effect Resolutionとtrigger順
- 物理・妖術・回復・とりつき・必殺を共通ActionIntent→Effect流水へ移す。Damage/Heal/Status/Soul/Interrupt/KO/Poke/Purifyの計算ロジックを重複させない。6種のスキルをhook registryへ移動。**各移行で旧版と新版のseed試合の差分を照合し、既存既定が壊れないことを証明**。

### V3-3 原作の行動ポイント/妖気/相手表示
- 最優先で**行動順・妖気回収/必殺の間隔・モーションと相手視点**を検証する。対人の読み合いを決めるため、技を追加する前にこの部分の原作研究を詰める。一次映像で確かめられない値は研究資料の仮定としてラベルを付けて管理。

### V3-4 データ駆動コンテンツ移行
- 既存6体を一つのカタログとその4技ID/スキルID/性格IDへ統一。新しい妖怪は**追加データ＋テスト**のみで戦闘器/ネットワーク/UIは原則触らない。技一覧表を先に定め、キャラ実装を開始するのはこの段階を通してから。

### V3-5 エンジン完成ゲート（*見た目は後*）
- 6v6実試合で、前後衛交替、AIの全行動、guard/interrupt/状態異常、Soul・必殺/G・つつく、KO・勝敗、2視点で**一貫したエンジン状態**が得られる。
- AIの性格/行動優先の再現も`selection.mjs`を共通ルール表に改め、キャラ固有例外を条件として追加できる。
- 通信は今のFirebase Friendsを**アダプター**として継続。ローカルhostとFirebase-hostで同じ入力列の状態hashが一致する。Google Sites埋込2席Chromium→最後に学校Safari2席。

### その後
- V3を境にキャラ増加・技数値照合・原作カットインの表示合わせを集中的に行う。フレーム単位アニメの改修も**ゲームエンジンの状態→投影**からしか受け取らない。

## 7. 各PR/工程の必須ゲート

1. **ゲームエンジンが何を共有できるようになったか**を報告（技の新規数ではない）。
2. 原作資料をいつ・どの版で確認したかと、矛盾・未確定を分離。
3. 同一seed/入力列による**旧版と新版の効果/状態の差分**を検証。意図しない差分は移行不合格。
4. 一つの完全な6v6、2席A/Bの勝敗/KO、通信ACK/再接続の回帰。
5. Google Sites相当の実Chromium画面・Safari対応の操作。画像を見た証拠を使ってバグ検証。Chrome成功とSafari実機成功は区別。
6. **開発ブランチ限定**。main、Google Sites公開、Firebase本番設定、Drive保存は禁止（本人が依頼する時だけ）。
7. 作業後のユーザー報告：**今回作業／次作業／ロードマップ現在地**。

## 7A. V3-0/V3-1最初の実コード変更（後続追記）

- `tests/engine-v3-migration-baseline.test.mjs`に**4 seedで6+6、front/bench、HP/Soul、pin、host commandのACK/クールダウン、同一入力で同一hash/snapshot、journal再計算**の2テストを追加。現行の「変更してはいけないルール基準」が作られた。[コード`b528ecbe9a`：Node **696/696** PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40785090725)、[同版 Stage Chrome PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40785090679)。
- さらに`engine/match-protocol.mjs`の**既存コマンド正規化とHost→Combat呼出**を、独立`engine/match-command-kernel.mjs`（約92行）へ移した。公開API`normalizeMatchCommand`は既存ファイルからそのままre-export、3秒ルール/ホスト時刻取得/seq/ACK/hash/戦闘判定は不変。`match-protocol.mjs`は約305行→**228行**。これはエンジンV3入口の第一歩であり、まだ`combat.mjs`本体を分割したわけではない。
- 抽出は**仕様変更でなく既存と同じJS本体の移設**。既存のFirebase Friends adapterはこのmatch protocolを引き続き使うので、通信方式は変わらない。V3-1中の他の責務（時間・状態）はこれから実装する。
- **コード抽出後の最終受け入れ `aedb76a4b6`**：[Node **696/696**・自然6体戦闘耐久PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40785361654)、[実Chromium Stage PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40785361641)、[**Firebase Friends no-Auth RTDB emulator＋Google Sites相当の実Chromium二画面 PASS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40785361637)、[単体HTML build PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40785361639)。本番学校Safari実機は未実施。

## 7B. V3-1行動ポイント・時間領域の共通処理

詳細は[**Engine V3-1 Action/Time Boundaries**](./ENGINE_V3_1_ACTION_TIME_BOUNDARIES_20261029.md)。

- `engine/action-timeline-core.mjs`の`advanceLogicalAction`が、真の前衛行動`phase1.step`と非破壊の将来予測`phase1.predict`の両方で呼ばれる。これまで二重に書かれていたwait→対象選択→次waitは一本化。**既存値を変えるリファクタではない**。
- `engine/core-time-domains.mjs`の`sampleHostInputMs`と`inspectCoreTimeDomains`で、**論理行動ポイント／ホスト入力ミリ秒／モーション可視ミリ秒**の概念を固定。後者は診断用であり、対戦プロトコルのsnapshot/hashは今までどおり。phaseラベルは表示診断のための抽象化であり、原作の厳密なフェーズを確定したわけではない。
- [Node **705/705** PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40836091285)、[実Chromium Stage PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40836091245)、[Firebase Friends no-Auth 2画面/RTDB PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40836331560)。学校実iPad最新版未試験。
- **V3-1の残件**：現行`combat.mjs`がまだHP/Soul/Status/技能/KOを束ねる大きな状態オーナーであり、統一Effect/状態遷移規則へ抽出していない。新キャラ大量追加を始める段階ではない。

## 7C. MatchCore正規状態入口への移行

- [V3-1の詳細/根拠/テスト](./ENGINE_V3_1_ACTION_TIME_BOUNDARIES_20261029.md)。`engine/match-core.mjs`が既存`createCombat`を唯一作成・所有する。`match-protocol.mjs`は`applyNormalizedCommand`/自動行動/正規スナップショット/将来予測をその入口へ委譲し、通信上のsequence/ACK/journalだけを担当。**snapshot/hash/元ルールは完全互換、Firebase Friendsは引き続き認証なしRTDB。**
- [Node **707/707**・旧プロトコルと新Coreの4seed結果一致](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40836968526)、[実Chromium Stage PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40836968607)、[Firebase Friends2画面/実Emulator PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40836923783)。
- **残るもの**：Core境界の内部には旧`combat.mjs`の個別状態管理がある。次はHP/status/Soul/KO/skill hooksを共通Effectへ段階抽出する。現状だけで「原作忠実な完成エンジン」とは言わない。

## 7D. V3-2共通Effectのcommit移行

- [**V3-2 source-first Effect Commit**](./ENGINE_V3_2_SHARED_EFFECT_COMMIT_20261029.md)：`engine/effect-commit.mjs`の`createEffectCommitter`を、`engine/combat.mjs`へ実接続。通常Hit/必殺/つつくのダメージ、通常妖術/技能/必殺の回復、状態異常登録が**同じ正規状態確定レイヤー**を通る。
- 技別のHit/命中・属性・乱数・ターゲット選択・KO・中断のロジックは従来の計算を維持。スキル「どひょうぎわ」は全直接ダメージの共通の生存hookに組み込んだ。登録後の`syncCanAct`も共有している。既存の`commitDamage/commitHeal/commitStatus`は技データの効果リゾルバではなく**commitの一段**である。
- [Node **712/712** PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40837995784)、[実Chromium PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40837995888)、[Firebase Friends no-Auth 2 iframe PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40837911108)。
- 次は**Hit/割り込み/KO/skill各段階を共有hookへ移行**し、最終的に追加キャラの4技ID/skillIDを既存データカタログから流す。原作の不明な優先順位は未確証として留保する。

## 7E. V3-2共通KO/Passive Skill Hookの段階移行

- [**KO・スキルの契約・原作出典・実装・719テスト結果**](./ENGINE_V3_2_KO_SKILL_LIFECYCLE_20261029.md)。
- `engine/knockout-lifecycle.mjs`へ通常/必殺/つつくの死亡後副作用を統合。HP0確認→行動可否・KO実績・スキル・Pin更新を既存順で処理（**本家がまったく同じ順序とは未確認**）。
- `engine/skill-hook-pipeline.mjs`へ`afterEnemyKO`と`afterAnyAction`を統合。**発動トリガーのauthoring sourceは既存`content/skill-catalog.mjs`**。一度だけHP1で耐える効果は共通Damage Commitに残し、KOと混同しない。
- [Node **719/719**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40840254872)、[Stage Chromium PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40840255136)、[Firebase Friends RTDB 2 iframe PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40840226006)。
- **残るV3-2**：Critical/Guard/LastStandの実行hook規約の完全共通化、Effect Planとカタログ統合、KO後以外の同時発動順の原作根拠確認。**V3-2完全完成・原作戦闘完全再現とは呼ばない**。

## 7F. V3-2 会心・ガード・生存Hookも共通化（2026-10-29 引き継ぎ後）

- 詳細：[ENGINE_V3_2_PASSIVE_ROLL_HOOKS_20261029](./ENGINE_V3_2_PASSIVE_ROLL_HOOKS_20261029.md)。
- `skill-catalog.mjs` の単一trigger台帳から、`sharpCrit`・`critImmune`・`guardBreak`・`lastStand` を共通Hook経由で実行。通常戦闘の `combat.mjs` を接続、旧計算式・RNG/イベント順を変えずに移行。専用テストを2件追加。
- **V8で最新の純粋Hookを158条件実行して旧式との一致PASS**。これは正式なNode全件/Chromium/Firebase 2端末の合格ではない。更新コードの最終CI結果は未確認。直前の719件PASSは以前のHEADのもの。
- 次：現在のHEADでNode/自然6体戦闘/Chrome/Firebase Friendsの正規回帰確認 → 旧新版seed完全差分 → typed EffectPlan。原作の正確な発火優先/倍率は依然研究課題。まだV3-2完成ではない。

## 7G. V3-2 型付き技EffectPlanの部分実統合（2026-10-29）

- 詳細：[ENGINE_V3_2_TYPED_EFFECT_PLAN_20261029](./ENGINE_V3_2_TYPED_EFFECT_PLAN_20261029.md)。
- 既存6体24技の正本`RENTAL_MOVE_MASTER`から、**通常攻撃6、攻撃妖術4、回復妖術2、とりつく6**の計18技をimmutableなPlanへ編成し、正規`EffectCommitter`で実処理。新しい技・キャラや未確認の原作数値は加えない。
- 6必殺は対象数・多Hit/複合効果の特殊構造を持つので、**未知hitCountを単一Hitに偽装せず未移行**。カスタムrosterも従来経路。
- 実ソースから全24技を組み立て、18 Plan/6特殊拒否/Commit/無効入力のV8**78チェックPASS**＋combat/test構文PASS。同じseedの既存挙動と比較するNodeテストを新設したが**最新HEADの正式CI/Chromium/Firebase実行結果は未確認**。旧719 PASSを流用しない。
- V3-2残り：正式CIゲート、特殊技の複合Plan、DoT/Soul/Interrupt/Poke/Purify統合と元原作の順序根拠。キャラ追加容易なV3-4やオンライン学校Safari完成とは呼ばない。

## 8. 今回の決定

**E1-B単独のオンラインおはらい演出拡張、トホホの砲、個別Soultimate追加などのfeature単位ロードマップを凍結**。これまで積んだコード/動画解析/テストは保存。優先順位は**V3-0→V3-1→V3-2→V3-3→V3-4→V3-5**に切り替える。原作動画の局面は今後の統合受入テストとして再利用し、実装順序を決める一単位にはしない。
