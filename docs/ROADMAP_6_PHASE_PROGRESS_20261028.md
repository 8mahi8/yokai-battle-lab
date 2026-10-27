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
| **Phase 1** | **戦闘基盤の統一** | **進行中（1.8 完了）**：通常攻撃・妖術・とりつくに加え、6必殺の種別/対象/威力/追加状態を単一技データからホストへ供給。単発/多段は未確認のため`unknown`。旧/新シード比較で結果一致 | 次Phase1.9：既存6スキル台帳の発動条件をホスト処理へ段階接続→ActionOutcomeの正規結果へ。原作の技別ヒット列はPhase2で動画観察とともに実装 |
| Phase 2 | 戦闘ルールを原作へ近づける | 後続（現在は一部の研究ルール・試遊値が存在） | 単発/多段/範囲、妖術、回復、とりつく、必殺、スキル、性格等をルールごと検証。元データ確度を維持 |
| Phase 3 | 行動順と戦闘の時間 | 後続（現行は待ちポイント研究＋ホスト2600ms固定） | 原作に準拠した論理行動順とモーション/操作タイミングの対応を確認 |
| Phase 4 | 操作と対人戦特有の仕組み | 後続（下画面ミニゲームとサークル等の既存実装あり） | おはらい/必殺/つつく/零式と**双方の表示保留**を原作局面で検証 |
| Phase 5 | 上下画面/アニメーション | 後続（見た目の研究版あり） | 技別カットイン・命中順・状態・HP・結果を動画と比較 |
| Phase 6 | オンライン総合/学校試遊 | 後続（Firebase Friends試遊基盤とChrome QAあり） | Firebaseホスト/ゲストの判定一致と学校Safari 2端末の操作・長試合が実証される |

**「進行中/後続」は研究や既存試作品が存在しない意味ではない**。現在の仕事の優先レーンを示す。個々の機能はPhaseをまたいで縦切り実装し、テストする。

## 今回した作業（Phase1 / サブステップ1.8：必殺技の統一マスター・実ホスト接続）
- **技定義の一元化**：新`content/rental-soultimate-moves.mjs`に6体の必殺技（通常ダメージ/ドレイン/バフ/ダメージ+状態変化/蘇生+回復/デバフ）の型・対象・Power・付与状態を記録。全て**試遊fixture**。範囲に複数対象がいても**多段ヒットではない**。元ゲームの打数が確認できていないダメージ系は`hitPattern:{type:'unknown',count:null}`、攻撃以外の技は`none,0`。
- `content/rental-roster.mjs`にあった個別の5つの`special`直書きを除去、共通マスターから互換用`special`を生成。`content/rental-move-master.mjs`は技のID/対象/型/状態情報を上記単一ソースから生成。
- **戦闘エンジンへ接続**：`engine/catalog-soultimate-spec.mjs`でキャラ・5能力・スキル・技ID・Power・対象・追加状態/不明HitCountの整合を厳密検査。`engine/combat.mjs`のホスト必殺効果解決は新`catalogSoultimateResolution`使用時マスターの技定義を採用。元のHP/KO/Soul/状態/計算式/乱数は変えず、レンタルの開発版`MatchProtocol`で既定true、custom teamはfalse。
- **試験**：新`tests/phase1-8-soultimate-catalog-host-parity.test.mjs`に5ケース追加。6種の必殺を実際に発動し、旧/新のホスト結果・HP・状態・勝敗を同seed比較。**[研究単体654/654＆耐久PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40603028705)**、**[実Chromium Stage/Gesture/Result PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40603028781)**。途中の1件失敗は状態ダウンの実験フラグ不足で、テスト条件を修正して通過。既存ゲーム本体のルール制限は緩めていない。
- **原作**：[Mt Wildwood YW2 Moves](https://mtwildwood.net/yw2/moves) と [攻略大百科の必殺一覧](https://gamepedia.jp/youkai-yw2/specials)を確認、**敵一体/複数と1hit/多hitを明確に分離**。本人提供MP4第1試合の従来観察記録と第2試合の実フレームサンプルを再確認。録画の全打数/アニメ時間の確定は未実施。
- **未完**：必殺ごとの本物の多段/全体命中回数・原作数値、スキルの実行効果統合、学校Safari二台対戦。**学校Google Sites稼働版・GitHub main・Firebase本番ルール/DBは無変更**。全証拠：[Phase1.8](./PHASE1_8_SOULTIMATE_MASTER_HOST_PARITY_20261028.md)。

## 次する作業（Phase1 / サブステップ1.9）
**固有スキルの共通台帳→ホスト発火条件/効果の縦切り接続**。最初の1スキルについて従来の戦闘結果と同seed比較し、ほかの5スキルへ安全に展開。特殊技の多段ヒットは別レーンで原作の録画と資料に一致した段階で実装する。学校試遊は実機の受け入れ条件が揃うまで保留。

## 前回の作業（Phase1.7）

## 今回した作業（Phase1 / サブステップ1.7：とりつく共通データ化）
- `content/inspirit-effect-master.mjs`：現行の研究用7効果のID・正負・分類・未確定持続を共通管理。`content/rental-inspirit-moves.mjs`：6体のとりつき効果（sleep / strength-up）、対象、仮レベル1を単一の著者データへ移した。**原作の確定技名/確率/時間ではない**。
- `content/rental-roster.mjs`で従来の`inspirit`を共有ソースから互換生成。`content/rental-move-master.mjs`は正負・対象・状態IDを台帳から構築。`engine/selection.mjs`のAI対象飽和判定も同じ正負辞書を参照。
- `engine/catalog-inspirit-spec.mjs`が名前/5能力/スキル/技/レベル/対象を起動時に照合し、`engine/combat.mjs`の本物のホスト行動へ接続。組込みレンタルで新方式を既定使用、customでは旧方式。旧のRNG・命中/耐性・おはらい・ledger・Soul・勝敗を変更しない。
- `tests/phase1-7-inspirit-source-and-host.test.mjs`を6テスト追加。**Node 649/649 PASS**、複数seed×学校/研究で旧/新のイベント・HP・状態・勝敗一致、良悪とりつきの実発動とターゲット検査。独立[Chromium実画面QA PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40601602766)。ただし[単体ワークフロー全体](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40601602650)はChromium browser-smokeの起動タイムアウトで失敗（Node検査は全合格）。[後続Research Unit 649/649・耐久・ブラウザスモーク全SUCCESS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40601951502)を確認。途中Chromeタイムアウトの失敗履歴も残す。
- 原作調査：[Mt Wildwood YW2 Inspirits](https://mtwildwood.net/inspirits.php?g=yw2)、[攻略大百科 おはらい](https://gamepedia.jp/youkai-yw2/archives/1397)。本人の原作動画は[Phase1.6の一部フレーム実見記録](./PHASE1_6_TECHNIQUE_CATALOG_AND_ORIGINAL_VIDEO_REVIEW_20261028.md)を参照、**今回とりつきの正確な持続・命中/抵抗率を動画から新規確定してはいない**。
- 全証拠・コード・次工程：[Phase1.7](./PHASE1_7_INSPIRIT_EFFECT_MASTER_AND_PARITY_20261028.md)。学校Sites稼働版、GitHub main、本番Firebase Rules/DBは無変更。

## 次する作業（Phase1 / サブステップ1.8）
**必殺技の共通マスター化**。単体・範囲と単発・多段を区別し、追加効果・回復・蘇生・ドレインの専用処理を整理する。原作動画の技シーンを直接検証できた範囲と、外部資料で確認できる範囲を分ける。既存ゲームの実戦結果と同seed比較してからホストへ接続する。

## 前回の作業（Phase1.6）

## 今回した作業（Phase 1 / サブステップ1.6：攻撃・回復妖術の実ホスト接続）
- **共通技のデータ一元化**：`content/rental-technique-moves.mjs`に6体の試遊用妖術威力/攻撃・回復/仮neutral属性/ダメージ技ヒット数を一箇所で記述。`rental-roster`の`techniquePower`/`technique`は互換自動生成。`rental-move-master`は妖術の`category, power, hitPattern, element, targetScope`を技ソースから作成。
- **戦闘エンジンの実移行**：`engine/catalog-technique-spec.mjs`でキャラの全5能力/名前/技/スキルと台帳が一致することを厳密検査。`engine/combat.mjs`では新`catalogTechniqueResolution`のとき攻撃・回復妖術の威力/種類/属性/ヒット数を台帳から取得し、既存の命中・ダメージ・回復・Soul・勝敗をそのまま利用。組込み6体は`match-protocol`既定true、custom teamsは従来動作。
- **自動テスト**：`tests/phase1-6-technique-source-and-host.test.mjs`に5テスト追加。[**Research Unit 643/643 PASS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40600243250)、[**Chromium Stage/Gesture/Result QA PASS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40600243175)。学校/研究・複数seedで**両方の妖術（攻撃/回復）を実際に発生**させ、旧方式・新方式のHP/妖気/イベント/勝敗が一致。
- **今回の重要な違い：ユーザー提供原作動画を実ファイルから直接レビューできた**。4つの元MP4の存在/尺を`ffprobe`で確認し、2,3,4本目の一部フレームを抽出・目視。技別カットイン/サークル/状態文字などを観察。全編を観察したとは言わず、妖術の原作威力・回復式・対象・時間は未確定。詳細は[Phase1.6原作動画・実装証拠](./PHASE1_6_TECHNIQUE_CATALOG_AND_ORIGINAL_VIDEO_REVIEW_20261028.md)。外部技資料・Type Objectも照合。
- **未完**：とりつく・必殺技の効果データソースは旧ロスタに残存。学校Safari2台の実機試験は未実施。原作数値はあくまで`fixture`。学校Sites稼働版・GitHub main・本番Firebase Rules/DB・Drive配布は無変更。

## 次する作業（Phase 1 / サブステップ1.7）
**とりつくの共有効果マスター化**（良/悪・対象・状態効果ID・レベル/解除条件）を原作資料と本人の録画で確認する。未知の持続ターンや発生率を原作確定とはしない。既存戦闘解決を維持してデータ駆動化し、同seed・同入力で旧/新を比較する。その後必殺/スキルへ。

## 前回の作業（Phase 1.5）
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
