# 妖怪ウォッチ2対人再現｜6段階ロードマップ進捗の単一入口
最終更新：2026-10-28。**各開発作業の終わりに更新**。新しい担当AIはこの文書・最新引継ぎ・V2全体設計の順に確認する。
**本プロジェクトはオリジナルキャラ6体で、原作の対人戦術と体験を可能な限り忠実に再現する**。優先度はルールと操作の忠実度＞演出品質＞キャラ追加。

## 毎回の報告ルール（本人からの確定依頼）
**必ず次の3つをユーザーに報告する。**
1. **今回した作業**：何を確認/実装/テストしたか。証拠（GitHubコミット、Actions、原作動画の時刻等）と、未検証点を区別。
2. **次する作業**：次の具体的な1工程、その理由と完了判定。
3. **ロードマップの現在地**：Phase 1～6のどこ、どのサブステップ、何が未完か。「作業進捗」と「原作再現度」を混同しない。
本番Google Sites稼働HTML、GitHub main、Firebase本番Rules/DB、旧Drive配布は本人の明示依頼まで更新しない。

## ロードマップ
| Phase | 目的 | 2026-10-28時点 | 次の受け入れ条件 |
|---|---|---|---|
| **Phase 1** | **戦闘基盤の統一** | **進行中（1.5 完了）**：6体のキャラ定義を4つの技ID参照に正規化、全24技の共通マスターへ解決。物理Power/HitCountを単一ソース化し旧ロスタは計算生成。戦闘結果不変 | 次はPhase1.6：妖術の威力/攻撃・回復種別を技マスターへ直接移し、旧/新の全試合シード比較。とりつく/必殺の効果情報は続く工程で移行 |
| Phase 2 | 戦闘ルールを原作へ近づける | 後続（現在は一部の研究ルール・試遊値が存在） | 単発/多段/範囲、妖術、回復、とりつく、必殺、スキル、性格等をルールごと検証。元データ確度を維持 |
| Phase 3 | 行動順と戦闘の時間 | 後続（現行は待ちポイント研究＋ホスト2600ms固定） | 原作に準拠した論理行動順とモーション/操作タイミングの対応を確認 |
| Phase 4 | 操作と対人戦特有の仕組み | 後続（下画面ミニゲームとサークル等の既存実装あり） | おはらい/必殺/つつく/零式と**双方の表示保留**を原作局面で検証 |
| Phase 5 | 上下画面/アニメーション | 後続（見た目の研究版あり） | 技別カットイン・命中順・状態・HP・結果を動画と比較 |
| Phase 6 | オンライン総合/学校試遊 | 後続（Firebase Friends試遊基盤とChrome QAあり） | Firebaseホスト/ゲストの判定一致と学校Safari 2端末の操作・長試合が実証される |

**「進行中/後続」は研究や既存試作品が存在しない意味ではない**。現在の仕事の優先レーンを示す。個々の機能はPhaseをまたいで縦切り実装し、テストする。

## 今回した作業（Phase 1 / サブステップ1.5：キャラID参照と24技マスター）
- **実装済**：`content/rental-character-move-refs.mjs`がキャラ6体について4技IDとスキルIDを保持。`content/rental-move-master.mjs`が24件の技定義を一元管理し、`content/rental-yokai-definitions.mjs`がID参照の一次データから旧V1のフル技定義を**互換生成**する。`content/combat-catalog.mjs`は参照-onlyキャラとmoveMasterを直接入力として、4技ID→実技定義への照合を行う。
- **攻撃威力の実単一ソース化**：旧`RENTAL_SQUAD`内の`attackPower`リテラルを削除。`content/rental-attack-moves.mjs`のみで6体の攻撃威力を定義し、旧`attackPower`プロパティは生成。攻撃回数は全員1ヒットのfixtureを保持。原作のヒット数と主張しない。
- `techniquePower`、とりつく、必殺技の効果元データは**依然レガシーロスタを著者ソースに使う移行途中**。4技の「参照」は整理したが、4技全部の実値を独立させたわけではない。原作動画第1試合の既存観察記録は継続利用。2～4試合目の映像は未直接確認。
- **検証済**：最新実装コミット`14ae7c688`の[Research 638/638 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40597123520)、[Chromium Stage/gestures/results PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40597123947)。誤技ID・誤スロット・欠損・重複・不変性、旧/新の学校用シードホスト結果一致を検査。学校iPad Safari2台/PNG自体の人間の目視確認は未完。学校Sites稼働版・main・本番Firebase Rules/DB未変更。
- 本作の原作値はまだ`fixture`。原作再現が数値で向上したとは言わず、「原作資料から正確な技値を後で投入しやすくなった」段階とする。
- 詳細・出典・実装・未完：[Phase1.5移行記録](./PHASE1_5_MOVE_MASTER_AND_CHARACTER_REFS_20261028.md)。

## 次する作業（Phase 1 / サブステップ1.6）
**妖術（攻撃/回復）を次の技カテゴリとして直接技マスターに格納・戦闘処理に接続する。** 現行の`techniquePower`・`techniqueHits`・`technique`の重複を減らしつつ、同一シードの命中/回復/HP/妖気/勝敗を維持する。技の原作値が不明なら`fixture`のまま。続けてとりつく・必殺へ段階展開。

## 前回の作業（Phase 1.4）
## 今回した作業（Phase 1 / サブステップ1.4：ホスト攻撃と共通技台帳を接続）
- 既存レンタル6体の`moveId`を`engine/catalog-attack-spec.mjs`で名前・5能力・技威力・ヒット数・スキルIDと厳密照合し、実ホストの通常物理ダメージ解決に**共通move.power/hitPattern.count**を渡した。計算式/ターゲット/乱数/HP/妖気/勝敗は旧コードを利用。
- `engine/combat.mjs`に明示ブール`catalogAttackResolution`を追加。カスタムチームへ誤IDを付けない（指定カスタム＋明示trueは拒否）。`engine/match-protocol.mjs`は**組込レンタルでは開発版既定true**、カスタム指定では既定false。ゲストの通信コマンドからは変更不可。
- `tests/catalog-attack-host-parity.test.mjs`で**複数seed×学校/研究**の旧（false）・新（true）ホスト全試合状態と攻撃結果を比較。レガシー算式/カスタム編成/標準版既定の動作も確認。旧Sourceデータと新Catalogの威力/命中回数が異なる場合は**起動時に拒否**。**まだ旧`rental-roster`に移行互換の威力の二重定義が残る**。
- 外部資料ではYW2の技固有威力・ヒット数を確認。[Mt. Wildwood (Statiking)](https://mtwildwood.net/yw2/yokai/statiking)、[Game Programming Patterns Type Object](https://gameprogrammingpatterns.com/type-object.html)を参照。**本人提供動画1試合目の以前のフレーム観察記録**は戦闘表示の一次資料として参照したが、今回元MP4を新たに直接視聴していない。残り3試合も未観察。
- **検証**：コミット`8f2dafebf`の[Research 633/633 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40552398719)、[Chromium Stage QA PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40552398778)。旧Supabase QAで一部の公開スナップショット待機タイムアウトはあったが、現行学校Firebase Friendsと混同しない。学校Safari実機2台では未検証。
- 途中`attackPower`を分岐内だけで宣言してしまい他の行動時にReferenceErrorとなった。**変数の可視範囲を修正し、設計境界テストを緩めず、633件全合格まで再検証**。失敗の記録も[Phase1.4証拠](./PHASE1_4_CATALOG_ATTACK_HOST_PARITY_20261028.md)に保持。
- 今回の変更は「原作の値に合わせた」わけではなく、**正しい原作数値を採用したとき、技定義から本計算へ反映できるようになった**という進捗。Google Sites稼働版・main・本番Firebaseは不変更。

## 次する作業（Phase 1 / サブステップ1.5）
**キャラ定義の4技を共通moveId参照へ正規化**し、技ごとの全フィールドの二重管理を減らす。その後、1体ずつ戦闘へ接続する。成功判定は旧/新同seed戦闘の命中・HP・妖気・KO・勝敗一致、および学校向けFirebase基盤の既存QA成功。原作動画の未閲覧3試合がアクセスできれば優先して直接確認する。

## 前回の作業記録（Phase 1 / 1.3）
## 今回した作業（Phase 1 / サブステップ1.3：動画根拠の命中順表示）
- ユーザーから再強調：「本人が提供した原作プレイ動画も**重要な一次資料**」。資料照合表：[Phase1.3動画・実装の証拠](./PHASE1_3_USER_VIDEO_HIT_EVIDENCE_20261028.md)。
- **一次観察記録の再読**：第1試合00:44–00:52、01:29–01:35の「ひゃくれつ肉球」カットイン→複数ヒットの順次表示を確認。トホホの砲など別の技とは演出・効果が違う。1試合目の**以前に実フレームを観察した記録**に基づく。**今回新たに元MP4を直接再生できたわけではなく、2～4試合目は依然として実フレーム未確認**。Files検索でMP4を取得できず、コンテナ/ローカルPython環境も起動できなかった。映像の時間値・回数は確定しない。
- **実装**：`presentation/action-choreography.mjs`でV2の`hitResults`から表示用`hitIndex/currentHit/nextHitAtMs`を投影し、`ui/match-stage.mjs`がヒット境界で対象の命中/MISS/数字/HPを順次描画する。**予定攻撃数ではなく実記録されたヒットだけ**。既存のimpact表示時間を均等分割するのは**試遊仮タイミング**、原作同等ではない。
- ヒット途中の`hpBefore/hpAfter`はホストのヒット記録からのみ取得。新しいダメージ/ヒット数/状態変化を作らない。戦闘エンジン、RNG、行動順、Firebase wire、学校本番は不変更。
- テスト：単一実行ヒット（KOで後続なし）、MISS→命中、HP変化、表示境界を`tests/action-outcome-v2.test.mjs`に追加。GitHub Actions **[研究単体 627/627 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40550496995)**。同じUI実装コミット`477033242`の[Stage Chromium QA PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40550338560)、[Firebase emulator QA PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40550338614)、[Sites Emulator QA PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40550338538)を確認。後続の`6079d441`では表示コードは変更せずコメントと単体テストを修正。後続の[最新Stage再実行](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40550496951)は確認時点で実行中のため成功扱いにしない。
- テスト途中の静的純粋性検査は追加コメントの`window`語に反応して失敗。時間依存APIはコードに使っておらず、コメント修正後に627件成功。失敗を緩めたり無視していない。
- **残作業**：具体的な本家ヒット間隔、原作の多段必殺の正確な回数と技固有の表示、学校iPad Safari実機、原作4試合を使った画面目視比較は未完了。

## 次する作業（Phase 1 / サブステップ1.4）
**共通技データの最初の通常攻撃を実際のホスト解決処理へ段階接続**する。旧版と同じseed/入力で命中・ダメージ・HP・乱数・勝敗が変わらないことを比較する。合わせて、元MP4の再アクセスが可能になった段階で第2～4試合のフレームを優先して観察し、原作の命中・効果・操作の採用根拠を増やす。学校Sites稼働版は勝手に差し替えない。

## 前回の作業記録（Phase 1 / 1.2）
## 今回した作業（Phase 1 / サブステップ1.2：ActionOutcome V2）
- **共通戦闘結果の契約**を`contracts/action-outcome-v2.mjs`へ独立させた。戦闘計算と描画の双方から参照でき、`presentation/`が`engine/`を直接importしない。現行のアーキテクチャ境界テストを保持。
- V2スキーマは`schema=2`、`eventId`（戦闘イベントID）、`actionId`（論理行動ID）、`actorId`、`moveId`、`actionKind='attack'`、`moveEvidence`、`outcome.hits`（命中順/会心/HP前後/実ダメージ）、`effects=[]`、`winner`を保持。
- **見えていない事実を創作しない**：原作で未確定の数値を付けず、旧戦闘エンジンが確定した`multiHit.hits`以外から新ヒットを追加しない。各ヒットの前後HP連続性、MISSの0ダメージ、総ダメージ一致、KO後に追加ヒットがないことを契約として検証。状態変化や妖気変化はこの研究版の攻撃イベントに命中別の確定情報がないため、`effects=[]`のまま（将来別途実装）。
- `presentation/legacy-attack-to-v2.mjs`は従来イベントの**非破壊変換**。整合しない内容/別キャラの試遊データなら`null`へ倒す。Firebase送信に`schema=2`の本体変更を強制しない。
- `ui/match-stage.mjs` → `ui/battle-vfx.mjs` → `presentation/action-choreography.mjs`まで**V2の不変結果を読み取り専用で渡す**。旧画面イベントと併存し、従来画面表示・集計ダメージを変えない。`scenePlan.actionOutcomeV2`とDOMの`data-outcome-schema`で自動QA可能。
- `tests/action-outcome-v2.test.mjs`を追加。MISS、KO中断、ありえないHP/偽状態の拒否、未知キャラ拒否、旧スナップとの不変性、実ホスト→実画面演出の一気通貫など**6ケース**。過去の619テストに追加。
- **実行と演出の時間はまだ独立していないヒット表示の段階**：1ヒットごとのメタデータは保存済みだが、映像上は従来の集約ヒット演出を続ける。原作ヒット間隔の秒数は未確定。
- 今回の変更は**戦闘イベントの翻訳と表示側の検証**であり、旧ホストのRNG、HP、妖気、行動順、Firebaseの通信契約、学校Google Sites版、mainを変えていない。
- **検証済**（契約モジュールを`contracts/`へ分離したコード、コミット`fe70ca419`）：[Research Unit 625/625 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40548481623)、[Chromium Stage QA PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40548481738)、[Firebase emulator QA PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40548481443)、[Sites online emulator/build QA PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40548481405)。
- **注意**：今回のFirebase QAには旧匿名認証を利用する研究経路も含まれる。学校向けの**AuthなしFriends実戦2台**をこの合格だけから断言しない。学校Safari実機未検証。現在の表示は旧画面の集計ヒットで、ヒットごとのアニメ再生はまだ。原作の時間は未確定。
- **途中の失敗も記録**：`presentation/action-choreography.mjs`から`engine/`へ共通契約を直接importしてしまい、[アーキテクチャ境界テストが失敗](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40548270683)。テストを弱めず、`contracts/action-outcome-v2.mjs`へ移動し、以後625件全合格で再確認。

## 次する作業（Phase 1 / サブステップ1.3）
**最優先は新V2結果を参照して命中ごとに見せる処理の設計と原作比較**。ただしヒット間隔や追加効果の裏付けがない箇所は再現済みとはしない。並行して、攻撃処理本体の1技を新しい共通技データで処理できるよう移行し、同一seedの従来結果と比較する。次に特殊攻撃の共通化を始める。

## 前回までの作業記録（Phase 1 / 通常攻撃の最初の縦切り）

### 実装
- 新規 `presentation/legacy-attack-outcome.mjs`：原作への裏付けのない命中を増やさず、既存ホスト`attack`イベントの`multiHit.hits[]`から**命中/会心/HP前後/ダメージの記録済み事実のみ**を抽出。現行レンタル6体の識別ID・名前・5ステータス・技威力を正規台帳と照合できた場合にだけ`moveId`を付与。カスタムチーム・データ欠落・矛盾する記録は`null`へ倒す。
- `ui/match-stage.mjs`：表示用`makeStageView`でイベントを**複製し、投影だけを追加**。オンラインの`MatchProtocol`や`game.snapshot()`は不変更。原作風の画面で`data-move-id`/`data-recorded-hits`を追跡できるが、内部技IDをユーザーに表示しない。
- `ui/battle-vfx.mjs`：従来の単発集計キューに`moveId`と順序のある`hitResults`を追加。描画演出は従来のまま。
- `presentation/action-choreography.mjs`：**既存ホストの結果のみ**を保持する表示計画メタデータ。今回はヒット別の独立アニメーションはまだ無し。
- `tests/legacy-attack-outcome.test.mjs`：2ヒット、MISS→KO途中停止、既存イベントの改変なし、カスタムチーム拒否、古いイベント互換、**実`createMatchProtocol`→`makeStageView`→`latestBattleCue`→`planActionChoreography`**の通しを確認。

### 原作との関係
- 現行レンタルの攻撃・ヒット回数は**試遊用fixture**。原作のジバニャン等の必殺ヒット数を推定・付与しない。
- 現在の正規ホストイベントの`amount`と`multiHit.hits`を再現/転写するだけ。戦闘効果処理・ホスト時間・Firebase・サークル入力は変更しない。**原作再現度が数値的に上がったと断定しない**。
- この`legacy-attack-projection-v1`はV2の正規`ActionOutcome`の代わりではなく、**V2へ段階移行するための読み取り専用アダプタ**。

### 品質・証拠
- 初版通しテストコミット`3a412a3a`： [Research unit 619/619 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40546323564) ＋ [実Chromium Stage QA SUCCESS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40546323613)。
- 最終の識別照合修正 `97a115e` まで含む[研究単体 619/619 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40546708006)・[実Chromium Stage QA成功](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40546708048)を確認した。カスタムチームの数値偽一致もテスト済み。
- Google Sitesの学校iPad 2台はこの新コードで未検証。GitHub ActionsのChromium描画QAが実Safari検証の代わりとは限らない。

## 以前の次工程（V2導入前に記した計画）
1. **ActionOutcome v2の正規スキーマを、旧ホストイベントと無矛盾なデータに絞って定義**し、通常攻撃の1ヒットを新形式にしたときも同じゲームの決定的状態・ヒット結果を保持できるテストを追加。
2. 次に通常攻撃の単発→多段で**命中ごと表示**をつなぐ。画面表示側で架空のダメージを生成しない。
3. 原作資料と実際の第1試合のタイムコードを使い、ヒット間隔・動作時間を確定できるところと未確認なところに分ける（相手視点は保留）。
4. Firebase実2ブラウザと学校Sitesビルドを再検証してから初めて配布候補とする。本人の依頼なしに学校版は差し替えない。

## 参考
- [ARCHITECTURE_V2 全体設計](./ARCHITECTURE_V2_SOURCE_FIRST_FULL_BATTLE_BLUEPRINT_20261028.md)
- [ADR-0004 技スキル台帳](./ADR_0004_MOVE_SKILL_REGISTRY_V1_20261028.md)
- [HANDOFF_LATEST](./HANDOFF_LATEST_20261027_PHASE50.md)
