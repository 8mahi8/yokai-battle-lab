# 妖怪ウォッチ2 オンライン対戦再現｜最新引き継ぎ【2026-10-27 Phase50】

> **2026-10-28｜Phase 1.6 完了：攻撃/回復妖術のデータ一元化＋実ホスト計算接続、原作MP4直接レビュー**：必ず本人に「今回した作業・次する作業・6段階ロードマップ現在地」を報告。[最新ROADMAP](./ROADMAP_6_PHASE_PROGRESS_20261028.md)と[Phase1.6実装・原作動画の証拠](./PHASE1_6_TECHNIQUE_CATALOG_AND_ORIGINAL_VIDEO_REVIEW_20261028.md)を参照。新`content/rental-technique-moves.mjs`が6体の攻撃/回復妖術のPower/Type/中立属性/hits（全部**試遊fixture**）を単一ソースにし、旧ロスタ属性は派生、`rental-move-master`はIDから読み出す。`engine/catalog-technique-spec.mjs`は元レンタルと台帳が同じ5能力/技能/威力/属性か照合、`engine/combat.mjs`は新`catalogTechniqueResolution`で台帳を実ダメージ/回復式へ渡す。built-inレンタルの開発版`MatchProtocol`では既定true、custom teamsはfalse。旧・新seedの正規HP/Soul/勝敗結果一致。[研究単体 **643/643 PASS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40600243250)、[Chromium画面・タッチ・結果 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40600243175)。**今回、ユーザー提供MP4 4本の実物ファイル確認に成功し、2・3・4本目の元動画から一部フレームを抽出し直接目視**（ただし完全レビューではなく、技威力/正確な回復式/ヒット間隔は未確定）。Google Sites稼働版・main・Firebase本番Rules/DB・Drive無変更。学校Safari2台未検証。次は**Phase1.7 とりつくの効果IDと良/悪/対象条件を原作録画/資料で確認しながら共有マスターへ移す**。旧Supabase実ブラウザQAの一部タイムアウト失敗を学校Firebaseの成功証明と混同しない。


> **2026-10-28｜Phase 1.5 完了：6体×4技ID参照の正規化＋攻撃Power単一ソース化**：最新資料は[PHASE1_5_MOVE_MASTER_AND_CHARACTER_REFS_20261028](./PHASE1_5_MOVE_MASTER_AND_CHARACTER_REFS_20261028.md)、最新の[6段階進捗管理](./ROADMAP_6_PHASE_PROGRESS_20261028.md)。新`content/rental-attack-moves.mjs`に6体通常攻撃の試遊Power/Hit数を一元化し、従来の`rental-roster.mjs.attackPower`は生成する。`content/rental-character-move-refs.mjs`でキャラは**4技のID＋スキルIDのみ**、`content/rental-move-master.mjs`に24技本体を置く。`rental-yokai-definitions.mjs`で研究/学校の`RENTAL_YOKAI_REFERENCES_*`を一次著者データ化し、旧V1`RENTAL_YOKAI_LAB/SCHOOL`は互換生成。`createCombatCatalog({characters,moveMaster})`は参照IDの欠損・スロット不整合・重複を拒否して**ホストが使うカタログをID参照式から直接生成**。最新コミット`14ae7c688`の[Research **638/638 PASS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40597123520)＆[Chromium Stage/Gesture/Result QA PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40597123947)を確認。**妖術、とりつく、必殺の威力/状態などはまだレガシーロスタ由来**で技マスターへの変換途中。原作の新しい数値は採用していない、本人動画は以前の観察記録のみ、学校Safari2台未検証。次Phase1.6は妖術攻撃/回復データの本格一元化と同seed比較。main/学校Sites稼働版/本番Firebaseは無変更。毎回の報告は**今回・次・ロードマップ現在地**の3点。


> **2026-10-28｜Phase 1.4 完了：共通技DB→実ホスト通常攻撃解決**：毎回必ず「今回した作業・次する作業・6段階ロードマップの現在地」を報告。今回の原作/技データ/コード調査とテストは[PHASE1_4_CATALOG_ATTACK_HOST_PARITY_20261028](./PHASE1_4_CATALOG_ATTACK_HOST_PARITY_20261028.md)に保存。新`engine/catalog-attack-spec.mjs`が現行レンタル6体の技Power/HitCountを共通`content/combat-catalog.mjs`から引き、名前・5能力・威力・攻撃回数・スキルIDを比較。異なる場合は拒否。組込レンタルの開発版`MatchProtocol`では`catalogAttackResolution:true`を既定にし、`combat.mjs`の実物理攻撃解決ループへ`attackPower/attemptedHits`を渡す。**既存RNG・ダメージ式・HP/妖気・相手選択・対戦通信の仕様は変更しない**。カスタム`teams`はlegacy経路維持。旧/新の複数seed試合が完全一致。[Node 633/633 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40552398719)、[Chromium stage/gesture/result PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40552398778)。途中ReferenceError修正済み。**原作の数値は現時点ではfixture、元MP4の今回直接確認なし、学校Safari2台未検証**。学校Sites稼働版・main・Firebase本番Rules/DB未変更。次はPhase1.5「キャラが技IDを参照する形へ正規化・重複威力値の段階除去」。最新進捗は[ROADMAP_6_PHASE_PROGRESS_20261028](./ROADMAP_6_PHASE_PROGRESS_20261028.md)。


> **2026-10-28｜Phase 1.3 / ユーザー提供原作動画を最優先の観察証拠に**：本人から「送った動画も資料そのもの。必ず確認する」と再強調。[PHASE1_3_USER_VIDEO_HIT_EVIDENCE_20261028](./PHASE1_3_USER_VIDEO_HIT_EVIDENCE_20261028.md)に、過去に実フレームを確認した1試合目00:44–00:52/01:29–01:35の個別命中表示と、他必殺の違いを記録。**このターンで元MP4の再生には成功していない**（Files検索0件、コンテナ/Python実行も不可）。2〜4試合目は未フレーム確認、原作の正確な秒数やヒット回数を推測しない。Phase1.3実装は`action-choreography`の表示専用`hitIndex/currentHit/nextHitAtMs`、`match-stage`の記録済みヒット順のMISS/ダメージ/HP表示。均等間隔は**原作を証明するものではなく既存impact時間を分割する暫定UI**。Research [**627/627 PASS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40550496995)、実画面Stage QAは同じUIコード`477033242`で[PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40550338560)（後続コミットはテスト・コメント・ドキュメント）。学校Safari実機・元動画との実フレーム比較は未確認。次はPhase1.4「共通技データからホスト物理攻撃1技を解決して旧版と同seed比較」。報告は毎回、**今回の作業・次の作業・ロードマップの現在地**の3点。学校Sites稼働版とmain/本番Firebaseは不変更。


> **2026-10-28｜Phase 1.2 完了：ActionOutcome V2の独立契約と実試合接続**：以後の各返答も必ず**今回の作業・次の作業・6段階の現在地**を報告。最新入口は[ROADMAP_6_PHASE_PROGRESS_20261028](./ROADMAP_6_PHASE_PROGRESS_20261028.md)。`contracts/action-outcome-v2.mjs`は攻撃命中の共通型/不変性/HP連続性/KO中止/MISSと総ダメージ一致を検証し、`presentation/legacy-attack-to-v2.mjs`で既存ホスト結果からだけ変換。旧イベントを変更せず`makeStageView`→`battle-vfx`→`action-choreography`へ**V2の読み取り専用データ**を渡す。途中、表示`presentation/`が`engine/`をimportする設計境界違反を修正して契約を`contracts/`へ移動。最新コード`fe70ca419`の[Research Unit **625/625 PASS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40548481623)、[Chromium Stage PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40548481738)、[Firebase emulator QA PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40548481443)、[Sites build/emulator QA PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40548481405)。**一部QAは旧匿名Auth経路であり、学校のAuthなしFriends+Safari実機の完成証明ではない**。次はPhase1.3「実ヒットごとの表示へ移す設計・原作比較」及び「新データを1技の解決器へ段階接続して同seed比較」。main/学校Sites稼働版/本番Firebaseは無変更。


> **2026-10-28｜6段階ロードマップ確定・Phase1最初の縦切り実装**：ユーザーが「作業完了ごとに**今回した作業・次する作業・ロードマップの現在地**の3つを必ず報告」と指定。[進捗の単一入口・報告形式](./ROADMAP_6_PHASE_PROGRESS_20261028.md)を確認すること。Phase1（戦闘基盤統一）進行中：既存ホスト物理攻撃`multiHit.hits`を原作仮値のまま、正規台帳の技IDへ照合→`makeStageView`→`battle-vfx`→`action-choreography`まで**読み取り専用**で貫通。原作で確定した数字と誤認させない。カスタムチームは5能力/威力を確認できない限りIDを割り当てない。最新コード`97a115e`の[Node 619/619 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40546708006)、[Chromium Stage QA PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40546708048)。次は**ActionOutcome v2の正規契約と通常攻撃1技の段階移行**。独立ヒットアニメ表示はまだ未実装、ホスト戦闘・Firebase通信・main・学校Google Sites稼働版は無変更。


> **2026-10-28｜最上位アーキテクチャV2設計**：ユーザーが「原作対戦の全体像を踏まえ、効率的・原作に近い開発基盤を設計できるはず」と指摘。既存ファイルを直接監査し、[ARCHITECTURE_V2_SOURCE_FIRST_FULL_BATTLE_BLUEPRINT_20261028](./ARCHITECTURE_V2_SOURCE_FIRST_FULL_BATTLE_BLUEPRINT_20261028.md) に**1つのホスト権威戦闘コア、共通技ID、命中単位のActionOutcome、Logical Wait/Host Wall/Client Presentationの3時計、相手別の表示保留、下画面入力をつなぐ実装順**を確定した。まず旧通常攻撃1技を正規データからヒット結果・表示まで貫く縦切りにし、**新しい未接続研究モジュールを増やさない**。元のFirebase Friends/Google Sitesの配布方式を維持。**このターンは設計資料のみ、戦闘ソース、main、学校Sites稼働版、本番Firebase変更なし。テストは過去合格の614件が直近の既知ベースラインで、新しいルール実装の検証はまだ。**


> **2026-10-28｜ADR-0004：技・スキル台帳V1**：`content/skill-catalog.mjs`に6つの試遊スキルの発動トリガーと効果識別子を宣言、`content/combat-catalog.mjs`で既存6体×4技の24技IDを衝突・参照の検査付きで検索可能にした。学校/研究両モードに適用。エンジンのスキル**名称**は台帳を唯一の情報源に変更（数値/発動判定/ゲームの結果は不変更）。[設計・外部資料・移行計画](./ADR_0004_MOVE_SKILL_REGISTRY_V1_20261028.md)、[614件PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40534532696)、[実Chromium QA成功](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40534532969)、[Firebase emulator QA成功](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40534489173)。**新台帳の戦闘判定への接続は次工程。学校公開版・main・Firebase本番無変更**。


> **2026-10-28｜ADR-0003：オリジナル妖怪キャラ定義V1**：原作の4技（攻撃/妖術/とりつく/必殺）+固有スキル+5能力+種族/ランク+2軸性格+属性/装備を別フィールド化。新規 `content/yokai-definition.mjs`（検証・不変コピー）、`content/rental-yokai-definitions.mjs`（既存6体の学校/研究両定義）、`tests/yokai-definition-schema.test.mjs`（6体/24技ID/未知値/多段と範囲の区別/深いimmutability）を追加。[ADR-0003 完全設計](./ADR_0003_YOKAI_CHARACTER_DEFINITION_V1_20261028.md)。**いまは戦闘エンジン未接続、学校版・main・Firebase本番無変更**。コミット`4c3e8c493`のResearch Unit [608/608 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40531692654)＋Stage QA [SUCCESS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40531692592)。資料だけの後続コミットは別検証。


> **2026-10-28｜基盤再設計判断（ADR-0002）**：本人が「原作再現のため開発基盤を見直す」と提案。新たな設計入口は [ADR-0002｜原作PvPコアの段階的再編](./ADR_0002_ORIGINAL_PVP_CORE_REARCHITECTURE_20261028.md)。既存Firebase Friends/ホスト権威/Google Sites直貼りを維持し、正規の技ID→ヒット結果→演出・プレイヤー別表示を段階抽出する。**この段階は設計と現状監査のみ。戦闘コードやGoogle Sites公開版は変更していない。** また学校Friendsの回転制約は`createMatchProtocol`既定**3000ms**。Phase51研究の旧記述「指定なし→0」は訂正済み。原作での正確な値は未検証。


> **Phase51実装済（2026-10-27）**：原作映像で見える上画面の戦闘を、チャージ・おはらい操作が隠してしまう問題を解消。`#mb-modal`を下画面内に配置し、タッチ中の上画面更新を実ブラウザで確認。[実装とQA記録](./PHASE51_LOWER_SCREEN_GESTURE_PRESENTATION_20261027.md)。初回Stage QAは失敗→コード未変更で再実行し **Stage/Pointer10種類/勝敗 PASS**。Research 604/604 PASS。2〜4試合目の動画実フレームは依然未取得。**main・学校Google Sites稼働版・本番Firebaseは未変更。**


> **動画2〜4の再読込試行（2026-10-27）**：[障害の切り分けと復旧手順](./ORIGINAL_PVP_MATCH02_TO04_VIDEO_ACCESS_RETRY_20261027.md)。MP4は登録確認済だが、`container.exec`、`python.exec`、可視Pythonの全てが短い最小コマンドにも`ClientError`。**動画を読めたとは扱わない**。第1試合の既存画像は再読できた。映像の再送を先に求めず、実行環境の復旧を優先。



> **新しい研究入口（Phase51調査、コード変更なし）**：[原作4試合の再現差分・外部資料の深掘り](./PHASE51_ORIGINAL_FOUR_MATCH_DEEP_RESEARCH_20261027.md)、[第1試合のタッチ操作を秒刻みで再解析](./MATCH01_SECOND_PASS_INPUT_AND_TIMELINE_20261027.md)。P0は「戦場が操作モーダルで隠れる」「おはらい完了モーションが演出されない」「表示保留/回転と入力の時間構造が未完成」。4試合のうち2〜4は受領済みだがMP4解析環境のエラーで未視聴。**実動画4試合の比較完了とは宣言しない。**


> **2026-10-27追記：本人から追加の原作対戦動画4試合分を受領。** 第1試合のみ実フレーム観察を完了、第2〜4試合は解析環境の読み込みエラーで映像未観察。コード/公式マニュアル/対戦資料の突合は [4試合提供の監査](./ORIGINAL_PVP_FOUR_MATCH_IMPLEMENTATION_AUDIT_20261027.md)、第4試合の受領状況は [MATCH04](./ORIGINAL_PVP_VIDEO_20261027_MATCH04_OF04_INTAKE.md) に記録。全4試合を視聴したと扱わない。学校公開版・ゲームコード未変更。


> この文書が Phase50 以降の新しい入口。詳細な原作動画観察は [Phase49](./HANDOFF_LATEST_20261027_PHASE49.md)・[動画タイムコード記録](./PHASE49_USER_SUPPLIED_ORIGINAL_PVP_VIDEO_REVIEW_20261027.md)、設計全体図は [PROJECT_MAP_AND_PROGRESS](./PROJECT_MAP_AND_PROGRESS.md)。今回の変更詳細は [Phase50](./PHASE50_BATCHED_ACTION_PRESENTATION_GUARD_20261027.md)。

## 目的・絶対条件
- 友達同士、学校iPad SafariのGoogle Sites直貼りHTMLで『妖怪ウォッチ2』1vs1体験をできるだけ忠実に再現。内部コード一致は不要。見た目・操作・戦闘・原作特有の読み合いを優先する。
- レンタル6体同一構成。前衛3体／後衛3体、サークル、妖気、必殺/G、おはらい、零式、ピン、つつく。初期版に閃光魂は入れない。ノーモーション必殺は専用技ではなく表示保留等の自然な結果として再現する。
- 音声・ミニマップ・ランキング・ログ回収不要。原作で不明の仕様・確率・実時間は確認済みとしない。
- GitHub main、学校Google Sites実稼働版、既存Drive配布、Firebase本番DB/Rules/Authを勝手に変更しない。
- ユーザーの「任した」は調査・実装・自動テスト・画面QA・**開発ブランチGitHub保存**の許可。学校稼働版への反映は別途ユーザー操作。

## 最新開発ブランチと現在地
Repo: https://github.com/8mahi8/yokai-battle-lab
Branch: `feat/phase1-action-circle-lab-20261023`
前Phase49の節目commit: `3c25d6573dd0fa1993304557e86bf54ae43ace1e`

### Phase49まで（原作動画を観測済）
- 本人提供の編集済みPvP MP4（約3分36秒）のフレームを確認済み。原作ビデオ素材自体はリポジトリへ転載しない。01:12/01:28の大型必殺カットイン、00:37の円形ピン、良悪とりつき等の観察はタイムコード付きPhase49に記載。
- `engine/combat.mjs` に試合内単調増加`eventId`、`presentation/action-choreography.mjs` に表示専用の3段階タイムライン、`ui/match-stage.mjs` にフィールドアニメ・予備動作中HP保持・命中時の反映。
- キャラの技名を `content/presentation-labels.mjs` へ分離、パッシブスキルの実発火だけを表示、学校Friendsは原作未確定のサボり仮値有効化。
- Phase49独立CI [598/598 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40502497892)。学校SafariのPhase49以降は実機未確認。

### 今回Phase50で実装・GitHub保存
- `ui/battle-cue-sequence.mjs` 新規。ホスト確定`eventId`で複数イベントを抜け落ちなく読む。状態/スキルイベントを偽の攻撃にしない。
- `ui/match-stage.mjs` に表示用FIFO。技・必殺の再生中に次のスナップショットが届いても通常は演出を中断せず、最大4件まで順次再生。
- 大量の取りこぼしを伴う復帰では最後の行動へ視覚的に追いつき、古いHPを「直前HP」として誤用しない。非表示ページの演出キューは破棄。
- `tests/phase50-batched-action-cues.test.mjs` 新規6テスト。**通信・ダメージ・勝敗・妖気計算・固定2600msホストクロックは一切変更していない**。
- 修正途中でPhase48スキル表示QAが落ち、**大量イベント時の古い演出キュー**が原因と判明。最新行動へ同期するよう修正し、画面QAを再成功させた。

## 検証済み事実
- 現開発版で[Research battle unit 604/604成功](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40507882048)＋4seed自然終了＋研究用Chromium戦闘画面QA。
- 現開発版で[Chromium Phase14 Stage QA 成功](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40507882130)。原作動画由来の必殺カットイン/ピン、実発火パッシブ、タッチ等の既存受入を含む。
- [Firebase Emulator + 2実Chrome対戦接続QA 成功](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40507863836)（Phase50の同じ実装コード。後続の文書コミットだけ別）。
- 旧Supabase実通信QAの一部は不安定・失敗。現在の学校Friends版は**Firebase RTDB（認証なし）**であり旧Supabaseテストの成功を学校対戦の条件にしない。
- いずれも**実学校Safari 2台／実Google Sites新版直貼り／本番Firebase write の証明ではない**。本人提供動画との原作フレーム単位一致も未実証。スクリーンショットはActions Artifactsへ出力されるが、今回担当は出力された画像ファイルそのものを手元で開く目視比較までは完了できていない。

## 次担当の優先作業（Phase51〜）
1. 学校Friends版の **固定2600ms自動進行** と技ごとの表示長／ゲスト遅延を計測し、双方の再生キューが長試合でどう推移するかを2 Chrome + Firebase EmulatorでQA。最初から内部時間一致を宣言しない。
2. 攻撃/妖術/とりつき/回復/ガード/サボり/必殺を「誰の、どんな技が、誰に効いたか」動きと命中タイミングで識別できる品質へ。画像を自分で開いて改善。
3. 原作の行動待ちポイント・演出中のサークル回転・対戦相手画面の**表示保留**を外部記録と照合。ノーモーション必殺を独立のボタンで作らない。
4. バージョン付きGoogle Sites用Friends単体HTML/TXT候補を別名で生成・検証・必要ならDriveへ個別保存。実稼働版／main／Firebase Rulesの更新は本人が指定するまで禁止。
5. 報告は「今回した作業／次にする作業／全体設計の場所」、そして自動テストとSafari実機確認を分ける。

重要な参考：[原作PvP動画レビュー](./PHASE49_USER_SUPPLIED_ORIGINAL_PVP_VIDEO_REVIEW_20261027.md)、[Phase44再設計](./PHASE44_ORIGINAL_BATTLE_REBUILD_PLAN_20261027.md)、[Phase50実装](./PHASE50_BATCHED_ACTION_PRESENTATION_GUARD_20261027.md)、[対戦研究者によるノーモーション/行動ポイント](https://note.com/tombow_yw/n/n1e4cf179d2d9)、[MDN Page Visibility](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)。
