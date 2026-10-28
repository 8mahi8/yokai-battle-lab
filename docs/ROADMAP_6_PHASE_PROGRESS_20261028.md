# 妖怪ウォッチ2対人再現｜6段階ロードマップ進捗の単一入口
最終更新：2026-10-29。**各開発作業の終わりに更新**。新しい担当AIはこの文書・最新引継ぎ・V2全体設計の順に確認する。
**本プロジェクトはオリジナルキャラ6体で、原作の対人戦術と体験を可能な限り忠実に再現する**。**2026-10-28 本人が最終目標を再確認：「送った原作対戦動画のように『妖怪ウォッチ2』を実際に遊べること」**。操作・ルール・戦闘中の見え方・進行テンポ・画面遷移を一体のゲーム体験として優先する。キャラの大量追加や独自改善は後回し。元動画に含まれる実況編集字幕や通知はゲーム原作のUIと取り違えない。

## 最上位の完成定義（本人の原作対戦動画をゲームとして再現する）
- **見るだけのデモでも計算式だけが似ている戦闘でもなく、プレイヤーが動画と同様の判断を実際に行える1vs1**にする。上画面の3vs3自動戦闘を見ながら、下画面の6体サークル回転・ターゲット選択・必殺チャージ・おはらい・零式/G/つつくを原作と同様の因果関係で操作できること。
- **動画にある1場面を受け入れ試験にする**。原作映像の「操作前→操作→技の準備→カットイン/命中または状態効果→画面復帰」を、実装の同一種の行動を操作した画面と並べて比較し、差を具体的な未完項目として記録する。多段と複数対象を区別し、スキル/ガード/とりつき/KO・回復/妖気の意味と順序も一致させる。
- **対人の読み合いを結果として再現する**。行動順・サークル待ち・時間的制約・相手画面の表示保留が十分に再現され、その結果として既知の対戦テクニックが原作と同じ理由で自然に発生すること。ノーモーション専用の独自ボタンや効果は追加しない。
- **友達と完成した試合を通せること**。学校iPad Safari上のGoogle Sites直接貼りHTML + Firebase Friendsのホスト/ゲスト2台で、開始→各操作→戦闘と表示同期→6体KO→勝敗まで違和感なく実試遊できること。Chrome・Node・エミュレーターのテストだけでは完成と呼ばない。
- **再現の根拠と留保**：原作動画の「実フレーム観察」、公式/解析資料、対戦者経験、試遊fixtureを区別。映像から内部乱数・ダメージ式・相手の画面・全ヒット数を断定しない。本人提供動画の全編実ファイルに未アクセスのときは既存観察記録までを根拠とする。動画の編集字幕と原作UIを区別し、元動画や画像を公開GitHubへ転載しない。
- **開発中の優先順位**：工程は6段階を維持するが、フェーズ順に見た目を完全放置するのではなく、原作の1つの行動を「戦闘事実→両視点表示→実操作」まで小さく通して確認する。テスト件数や内部コード再現そのものではなく、**プレイ可能な動画体験との一致**を最終評価とする。



## 毎回の報告ルール（本人からの確定依頼）
**必ず次の3つをユーザーに報告する。**
1. **今回した作業**：何を確認/実装/テストしたか。証拠（GitHubコミット、Actions、原作動画の時刻等）と、未検証点を区別。
2. **次する作業**：次の具体的な1工程、その理由と完了判定。
3. **ロードマップの現在地**：Phase 1～6のどこ、どのサブステップ、何が未完か。「作業進捗」と「原作再現度」を混同しない。
本番Google Sites稼働HTML、GitHub main、Firebase本番Rules/DB、旧Drive配布は本人の明示依頼まで更新しない。

## ロードマップ
| Phase | 目的 | 2026-10-29時点 | 次の受け入れ条件 |
|---|---|---|---|
| **Phase 1** | **戦闘基盤の統一** | **完了（1.10 総合監査通過）**：6体×4技・6スキルの正規台帳→ホスト処理→攻撃V2・両視点UIの通し監査。蘇生必殺の古い対象参照を修正。原作数値はfixtureが多く残る | Phase2へ移行：原作の一次映像・文献で技ごとの本当の命中数/Power/効果を検証してから1技ずつ忠実化。学校Safari本番テストは後段 |
| **Phase 2** | **戦闘ルールを原作へ近づける** | **進行中（2.2C-1：資料一致2技の1Hit×全体／単体をcustom実ホストと実Chromiumで証明／全原作数値は未確証）**：2.1A整数命中率＋2.1B原作確認済みの通常ガード50%・強化ガード25%をホストの物理/妖術に適用。GuardBreakは物理限定。組込6体は無変更、custom研究入力で確証 | 次2.2C-2：本人原作動画にもある「トホホの砲」の1Hit×敵全体＋速度ダウンを資料照合し、Speedデバフが行動順/時間に作用する原作の根拠を調査→研究ホストで検証。ひゃくれつ肉球5/7矛盾は保留、未検証のデバフは見た目だけで実装済みと言わない |
| Phase 3 | 行動順と戦闘の時間 | 後続（現行は待ちポイント研究＋ホスト2600ms固定） | 原作に準拠した論理行動順とモーション/操作タイミングの対応を確認 |
| Phase 4 | 操作と対人戦特有の仕組み | 後続（下画面ミニゲームとサークル等の既存実装あり） | おはらい/必殺/つつく/零式と**双方の表示保留**を原作局面で検証 |
| Phase 5 | 上下画面/アニメーション | 後続（見た目の研究版あり） | 技別カットイン・命中順・状態・HP・結果を動画と比較 |
| Phase 6 | オンライン総合/学校試遊 | 後続（Firebase Friends試遊基盤とChrome QAあり） | Firebaseホスト/ゲストの判定一致と学校Safari 2端末の操作・長試合が実証される |

**「進行中/後続」は研究や既存試作品が存在しない意味ではない**。現在の仕事の優先レーンを示す。個々の機能はPhaseをまたいで縦切り実装し、テストする。

## 2026-10-29 Phase2.2C-1 完了｜原作資料で一致した1Hit技2種を研究ホストへ
- [ソース4本・変更ファイル・各テスト・受入条件・原作から残る差分](./PHASE2_2C_SOURCE_BACKED_SOULTIMATE_SHAPES_20261029.md)。『妖怪ウォッチ2』鼻血ボンバー：威力100×1・敵全体（攻略大百科 + game-cap）／大切断：210×1・敵1体（攻略大百科 + game-e）。**これらは技の形のみが資料で一致する**。原作の入力条件、実命中/会心RNG、カットイン秒数、元キャラ外観の再現が完了したとは言わない。ジバニャン20×5/7の資料矛盾は未解消。
- **開発**：新`content/yw2-soultimate-reference.mjs`で出典と効果形を別台帳化、明示custom roster + opt-in`researchYw2Soultimate`のみでA1へ研究用技を割当。既存ホストの**本当の命中/会心/HP/KO**を1回×複数対象または1回×1対象で処理し、`contracts/soultimate-hit-ledger-v1.mjs`の1hit検証へ。原作の出典一致回数は`referenceSoultimate.hitCount=1`、戦闘実行用の元Hit台帳は`originalHitCount:null`を維持し、原作全計算再現という誤認を避ける。研究用カットインは「原作技の研究：技名」と区別。**標準レンタル6体・学校Friends/Google Sites公開版は無変更**。
- **実証**：最新コード`fc66a0e292` [Node **691/691**・自然6体戦闘耐久・研究Chrome PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40721184570)、[実Chromium Stageで原作参考技2種の**それぞれの技名・対象・画面数字・HP表示が実ホスト結果と一致** PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40721184436)。以前の必殺/おはらい/サークル/2視点勝敗QAもPASS。コード本体最新UI変更`ede60c7aa7`に対するFirebaseブラウザエミュレーター・Google Sites HTML生成も成功。
- **残余の別レーン長時間QA**：[Supabase normal-paced 60 actions run](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40721025699) は`PACED-MATCH-WAIT`のまま不成功だった。現時点では**テスト/ネットワーク/ゲームのどこが原因か不確定**なので、フェーズ全般の完璧な長時間オンライン動作を宣言しない。再実行での原因切り分け対象。
- **次**：2.2C-2は本人原作動画にも出た「トホホの砲」の**単発×敵全体＋SPDダウン**。本家のSPD変化が残り待ちポイント・順番にどう反映するか調べ、原作の因果を再現できる仕組みを優先。学校iPad実機2台は未試験。Google Sites版、main、Firebase本番Rules/DB、既存Driveは無変更。

## 2026-10-29 Phase2.2B-2 完了｜試験用カスタム実ホストhit列を実画面へ
- [原作の5/7Hit数矛盾、実装対象、試験証拠・未完一覧](./PHASE2_2B2_CUSTOM_SOULTIMATE_REAL_HITS_20261029.md)。Mt. Wildwoodのジバニャン20×7と攻略大百科／日本語攻略リストの20×5は資料で矛盾しており**本家のHit数は未確証**。本人の原作動画は今ターン直接アクセス不可のため、過去の第1試合動画観察記録を参照（動画全フレームを新しく視聴したとは主張しない）。
- **コード変更**：`engine/combat.mjs`に明示カスタム6×2 roster + 研究用ダメージモデル・必殺効果を必須とするopt-in`researchSoultimateHitCount:2..9`を追加。**既定null**（学校レンタル6体の仕様と戦闘結果は無変更）。実カスタム必殺の1発ごとにHost HP・命中・会心・ガード・既存LastStand・KO打ち切りを適用し`researchSoultimateHits`を記録。
- **契約と描画**：新`contracts/soultimate-hit-ledger-v1.mjs`で不変型／各打HP・MISS・KO後禁止・予定hitの不足禁止を検証。`ui/match-stage.mjs`/`ui/battle-vfx.mjs`/`presentation/action-choreography.mjs`で、対象数と別に`specialHitIndex`を表示。既存`SoultimateImpactLedger`（対象ごとの最終効果）とは独立。新`tests/phase2-2b2-soultimate-real-hit-ledger.test.mjs`がカスタム実ホスト3打×3対象・KO打ち切り・改ざん拒否・デフォルト互換を検証。
- **ゲーム本体最新コードSHA `41fc220452`の証拠**：[Node **687/687**・自然6体耐久＋研究用Chromium SUCCESS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40719822331)、[実Chromium上下画面/全操作/両視点結果、カスタム実ホスト**9回の命中/HP表示** SUCCESS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40719822217)。ログ`PHASE22-REAL-HOST-PER-HIT-DOM-PASS nine host hit/HP states`。
- **初回失敗と再検証**：初回687件中686合格でplanned回数を偽装できる検証穴を発見し、KOでない対象には全予定hitを要求するよう修正。最終687/687合格。最新研究ブラウザ初回起動タイムアウトもジョブ内再試行で成功。いずれも失敗履歴を維持。
- **次**：2.2Cにて一次映像と原作資料が揃った技から標準技へ落とす。学校Safari本物2台・最新Google Sites Friends版・実本番Firebaseは未試験。GitHub main／Google Sites版／Firebase本番設定・DB／Drive配布は変更しない。

## 2026-10-29 Phase2.2B-1 完了｜実ホストの必殺HP/状態記録→画面へ
- [詳細なソース差・今回のホスト→表示一貫性・残る未完成](./PHASE2_2B_HOST_IMPACT_LEDGER_AND_SOURCE_GAP_20261029.md)。本家ひゃくれつ肉球20×7（Mt. Wildwood）と20×5（攻略大百科ほか）の資料矛盾は未解消。原作の「トホホの砲」は攻略大百科で30×1・敵全体+すばやさDOWN。**同じ対象への連続hitと、複数の対象への単発結果を混同しない。**
- **ゲーム品質改善**：`contracts/soultimate-impact-ledger-v1.mjs`を新設。実ホスト必殺の各対象HP before/after・増減量・状態抵抗/適用を不変で検証し、`ui/match-stage.mjs`/`ui/battle-vfx.mjs`/`presentation/action-choreography.mjs`から表示。相手の再接続/古いスナップでも、該当技の原記録を使って段階HP表示できる。**ゲームの本当のHP・Soul・行動順・ルーム通信やレンタル必殺の未知hitCountは変えていない。**
- **同一コードSHA `0bfce781050`の実行証拠**：[Node683/683、6体自然耐久、研究ブラウザSUCCESS（attempt 2）](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40714382531)、[実Chromium Stage/全ジェスチャー/勝敗/3体の実ホストHP逐次表示 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40714382565)。研究unit初回はNode合格後Chromium起動タイムアウトでFAIL、同一run再実行で成功した事実を区別。テストfixtureの初回依存設定不足も修正済。
- **未完**：元原作MP4をこの作業で直接再生できていない。本家の正しい各技Hit数・対象配分・状態の順序は未証明。学校Safari 2台最新版・実Google Sites Friends公開版も未検証。
- **次**：2.2B-2原作一次映像と資料で確認できた技から**「対象ごとの結果」とは別の「一撃ごとの実ホストhit列」**を段階導入。原作ルールの未確証部分を仮定で埋めない。本番Google Sites・GitHub main・Firebase Rules/DB・Drive配布は未変更。

## 2026-10-28 Phase2.2A 完了｜必殺技ターゲット表示と本家hit数の厳密区別
- [詳細な原作資料の5/7 hit記述差、既存本人動画の時刻、実装・試験・留保](./PHASE2_2_SOULTIMATE_TARGET_VS_HIT_VISUAL_TIMELINE_20261028.md)。原作「ひゃくれつ肉球」はMt. Wildwood YW2が20×7、攻略大百科 YW2が20×5と記載し、この時点で数値は確定しない。「トホホの砲」は資料上30×1で敵全体+素早さDOWN。**敵3体に命中＝3連撃ではない**。
- **実装**：`presentation/action-choreography.mjs`に`specialTargetIndex/currentSpecialImpact/nextSpecialImpactAtMs`、`ui/match-stage.mjs`にターゲット毎の浮動結果/表示前HPの保持。全て**プレゼン専用**、ホストダメージや妖気/行動順・未確証`hitPattern`は一切変えない。敵3体の順表示テンポは研究用の仮設定で本家実時間ではない。
- **最終コードコミット`608947f988`の証明**：[Node 680/680 + 完走耐久 SUCCESS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40707841601)、[実Chromium Stage/全操作/結果 SUCCESS、加えて必殺3体B1→B2→B3の**1対象ずつ浮動数字**DOM実描画PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40707841744)。実ホストが起こした必殺効果→3対象cue→画面時間割りの独立Node検査も追加。ただし**Chromium3体表示はプレゼン用fixture、原作MP4の連撃実測ではない**。
- **次**：Phase2.2B：原作動画でhit/target/状態変化を実時刻再照合し、元資料間のヒット数矛盾を解消できた技から個別hit ledgerを開発。学校Google Sites公開版、main、本番Firebase Rules/DB、旧Drive配布は未変更。最新版学校Safari2台は未試験。

## 2026-10-28 Phase2.1C-2 完了｜原作ルール研究コードの新回帰証明
- **実装差分**：学校用Firebase Friendsの認証なしRTDBテストに、ゲストの輪操作ACK→ホスト実戦24行動→ゲストへ正規状態配布→snapshot完全一致の回帰を追加（ゲーム本体は変更なし）。テスト実装初回の`game.turn`参照ミスで一度失敗し、正しい`game.clock.turn`へ修正、再試験成功。
- **同じ最終コードSHA `4a63bef846`のテスト実績**：[Node 677/677 + 6体自然耐久 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40705027981)、[実Chromium上下画面/全ジェスチャー/両視点結果 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40705027869)、[Firebase Friends認証なしRTDB + 2 iframe実Chromium + 24行動正規状態同一性 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40705028114)。
- [Phase2.1Cの差分・確証・留保・QA詳細](./PHASE2_1C_TECHNIQUE_ELEMENT_AND_DAMAGE_FORMULA_MATRIX_20261028.md)。**Phase2.1C-2のQAゲートは完了**だが、原作データの矛盾（Wiki式vs実測推定式、Play/Penetrate未確証併用順序）、元MP4の今ターン直接未観察、学校Safari最新版未検証は残る。
- **次**：Phase2.2技固有の「対象が複数」≠「多段ヒット」を原作映像＋技資料に照合し、実戦結果のhit列と見た目の命中順へ段階適用。学校Google Sites稼働版・main・本番Firebase・Drive配布は触らない。
- **実画面も確認**：[Phase2.2へ渡すChromium PNG4枚の実目視・原作動画との差分監査](./PHASE2_2_VISUAL_EVIDENCE_GATE_FROM_REAL_CHROMIUM_20261028.md)。通常行動でキャラ自身の動きが小さい一方、必殺カットインが大きく出ていることを確認。これはLOCAL研究画面の静止画像であり、学校Friends Safari版・連続動画の検証ではない。

## 2026-10-28 引き継ぎ後の履歴・動画の横断監査（コード無変更）
- [引き継ぎ過去資料80件以上の横断監査／元動画5本のアクセス状態／原作再現の未完一覧](./HANDOFF_ARCHIVE_AUDIT_AND_VIDEO_ACCESS_20261028.md)。Phase10～51とPhase1/2、学校の2026-10-27実機試遊、オンライン方式の変遷、ユーザー動画の直接観察履歴を再読。古い資料の「2～4試合未視聴」は2026-10-28 Phase1.6の一部実フレームレビューで一部更新されたが、全編フレーム比較は未完。**今回元MP4はアクセス不可、直接再生したと主張しない。**
- **本工程は資料照合と保存のみ。ゲームコードとテスト数は不変。次工程は2.1C-2の新コミットNode/Chromium/Firebase回帰証明。** 旧学校V2の2台成功と新開発版の実機未試験を区別。Google Sites稼働版・main・本番Firebase・Drive配布は無変更。

## 最新作業（Phase2 / サブステップ2.1C-1：属性Play/Penetrateを研究ホストへ）
- **[詳細な原作比較マトリクス・実装・未検証点](./PHASE2_1C_TECHNIQUE_ELEMENT_AND_DAMAGE_FORMULA_MATRIX_20261028.md)** を追加。Mt. WildwoodのYW2妖術ダメージ式と2026-09-16実機推定式の差を、1hit・通常/会心・Defense/criticalDefense・乱数・属性の条件で整理。通常時の理論差は `(Power+Spirit)/210 - Defense/350` で、係数の恣意的置換は行わない。
- **原作に根拠ある部分だけ縦切り実装**：新`engine/element-model.mjs`で対象耐性、該当属性Play 0/1/2ソース、Penetrateを分離。`engine/combat.mjs`からcustom研究チームの実ホスト妖術へ接続。組込6体に原作未確認の能力を付けず、通常スナップを保つ。`engine/damage-model.mjs`の属性上限だけ3×1.4へ拡張。研究用の新5テストを`tests/phase2-1c-technique-element-original-rule.test.mjs`に追加。
- **検証状況**：GitHubから取得した実ソースの純粋計算部分はV8で**最新8条件PASS**（当初9条件の研究後に、PenetrateとPlayの同時適用順が未証明と分かり、組合せを明示拒否するよう修正）。ただし**新コミットのNode全テスト/Chromium/FirebaseエミュレーターCI成功は未確認**で、Phase2.1Cはまだ完了扱いしない。672/672とChromium PASSは**以前の2.1Bでの結果**。今回は原作元MP4の新規フレーム確認はできていない。学校Safari2端末も未検証。
- **次**：Phase2.1C-2 新コミットのCI・ブラウザ・Firebase回帰確認、原作動画が取得可能なら実フレーム照合。式の差は原作実測で決着するまで未解決のまま。
- **保護範囲**：Google Sites稼働版、GitHub main、本番Firebase Rules/DB、Drive配布物は無変更。

### 前回：Phase2.1B

## 今回した作業（Phase2 / サブステップ2.1B：強化ガード25%の実ホスト適用・式の根拠比較）
- [詳細な原作根拠・最新コード・試験記録](./PHASE2_1B_YW2_GUARD_BOOST_AND_FORMULA_RESEARCH_20261028.md)。[Mt. Wildwood YW2 Guarding](https://mtwildwood.net/guarding.php?g=yw2)で**通常ガード×0.5、強化ガード×0.25、GuardBreak貫通**を確認。ダメージ式は[Mt Wildwood YW2 damage](https://mtwildwood.net/damage.php?g=yw2)と[2026-09-16実機2台の推定式](https://note.com/atoato429429429/n/nfefe8749d432)で妖術係数に僅差があるため、**式全体を推測で置換していない**。YW1の「ガード中はダメージ乱数なし」とYW2の記載も混同しない。
- **コード実装**：`engine/damage-model.mjs`に省略可能`guardBoost`（Boolean）＋`guardFactor`を導入。実`engine/combat.mjs`で**custom編成だけに`guardBoost:true`を明示でき、guard中なら物理/妖術ともダメージ25%**。物理だけGuardBreakでガード軽減を無視。旧研究ダメージOFF経路も同じ。組込6体には無根拠に強化ガードを付けず、旧snapshotに新キーを勝手に入れない。
- **新テスト5件**：`tests/phase2-1b-guard-boost-original-rule.test.mjs`。通常半減・強化1/4・物理貫通・妖術非貫通の値、3seedの研究用**本物のガード行動/攻撃/妖術**とseedリプレイ、非Boolean拒否と組込6体の互換性を検証。
- **最終コード/testコミット`868f9e5f8`**：[Research Node **672/672 PASS＋耐久PASS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40652761991)、[本物のChromium Stage/Gesture/MatchResult PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40652762022)。ホスト実装SHA`2a719cee2`の[Firebase Emulator browser QA PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40652708751)、[Google Sites Online QA PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40652708498)、[offline 1HTML embed PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40652708527)も確認。学校Safari2台の実戦はまだ未検証。
- **本人原作動画**：今回は元MP4の新規フレーム直接閲覧ができなかったため、[Phase2.1Aの直接元動画の観察記録](./PHASE2_1A_YW2_INTEGER_HIT_CHANCE_20261028.md)を継続一次資料として使用。係数0.25の根拠は動画ではなく上記解析資料。原作バスターズ・YW3のダメージ式は採用しない。Google Sitesの学校稼働版・main・本番Firebase Rules/DB・Drive配布は無変更。

## 次する作業（Phase2 / サブステップ2.1C）
物理/妖術ダメージの原作Wiki式と日本の3DS実機推定式の差を、**技ごとの威力・ヒット数・ステータス・会心・ガード・属性・乱数幅**で条件付け、検証可能な誤差マトリクスを作る。元素Play（×1.2／2ソースで×1.4）・Penetrate（耐性1未満を無視）も原作資料に沿って効果ID/場スキルと対象耐性を分離し、嘘の倍率を勝手に組込レンタルに足さない。本人の原作動画のガード/ダメージHITシーンを時系列で照合する。

## 前回の作業（Phase2.1A）

## 今回した作業（Phase2 / サブステップ2.1A：原作の命中率を整数に量子化）
- **原作資料に基づく実ゲームルール修正**：[Mt. Wildwood Hit Chance](https://mtwildwood.net/hit-chance.php)によると、Speed85対151の命中率は84.8→**84%へ切り捨て**、物理技の命中補正を掛けた結果も整数へ切り捨てて0～99の乱数と比較。従来の`engine/hit-model.mjs`は小数の確率で直接比較していた。**`base=Math.floor(clamp(...))`と`probability=Math.floor(clamp(base*moveAccuracy,...))`を実装し、ホスト実戦の通常物理/攻撃妖術に適用**。RNGを追加消費していない。元6体のPower/効果はfixtureのまま。
- **比較の注意**：元資料の追加スキル`Gassy Sphere`6体で合成0.4倍という例は、物理技の`moveAccuracy`が0.5～4倍という別の定義。混同してテストに0.4を入れた初回は失敗したが、**本体の有効範囲を緩めず、別の追加スキル係数は未実装と明示**してテストを修正した。Action末尾の隣接回復skillイベントを最後の`action`と取り違えたテストも行動ID検索に改めた。
- **単体/統合テスト**：`tests/hit-model.test.mjs`を実例へ更新、新`tests/phase2-1-original-hit-quantization.test.mjs`で3ケースを追加。5個のseedで物理・妖術をホストで実発動、`hitResearch`に整数境界が記録され、2座席の表示・ジャーナル再演算の値が一致。**[Research Unit 667/667 PASS＋耐久PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40645583960)**、**[実Chromium Stage/Gesture/Result PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40645583976)**。[Firebase Emulator browser QA](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40645193643)とSites Offline/Onlineビルドも本体変更コミットで通過。
- **原作の一次資料**：本人提供の原作MP4第1試合52～70秒・114～117秒の元フレームを**今回直接抽出し、目視レビュー**。技の専用演出・戦場・サークルの同時表示は確認できるが、単独動画から0～99の命中乱数・母数は検証できない。解析資料をダメージ/命中アルゴリズムの根拠とし、**映像を技名/場面遷移の一次資料**として扱う。
- 原作のダメージ式はすでに`damage-model.mjs`へ多数実装されているが、外部で異なる実測推定もある。**ここで式や技の威力を勝手に置き換えない**。本件の詳しい証拠：[Phase2.1A](./PHASE2_1A_YW2_INTEGER_HIT_CHANCE_20261028.md)。Google Sites学校稼働版、GitHub main、本番Firebase Rules/DB、Drive配布は変更していない。

## 次する作業（Phase2 / サブステップ2.1B）
通常攻撃・妖術について、[Mt. Wildwood YW2ダメージ資料](https://mtwildwood.net/damage.php?g=yw2)と[2026年9月の実機対戦ダメージ検証](https://note.com/atoato429429429/n/nfefe8749d432)をゲームの版/技カテゴリ/会心/属性の条件ごとに照合し、**確実に原作と一致する1項目**を絞ってホストに適用。次の未実装スキル係数は技命中倍率と混同しない。本人原作動画の打数・HIT/MISS連続フレームも引き続き一次資料として調べる。今後も1変更ごとにNode、Chromium、Firebaseの結果を別々に報告する。

## 前回の作業（Phase1.10）

## 今回した作業（Phase1 / サブステップ1.10：総合監査完了・Phase2移行判定）
- [完全なPhase1.10監査・コード修正・原作直接動画レビュー](./PHASE1_10_FOUNDATION_INTEGRATION_AUDIT_20261028.md)を作成。6キャラ×4技と6スキル→各catalog spec→ホストの真のHP/Soul/status/KO→現行`events`→2座席表示→物理攻撃専用ActionOutcome V2→演出計画のつながりを確認した。
- **実装上の穴を修正**：`combat.mjs`で必殺技の**効果定義は共通マスター**なのに、蘇生のためにKO後衛を含める対象選択だけ**旧`caster.special.kind`**を読んでいた。`special-effects.mjs`に`researchSpecialAllies(spec,wholeTeam,livingFront)`を追加し、実ホスト効果と対象の双方で**同一解決済みspec**を利用。HP/乱数/回復式は不変。
- 新`tests/phase1-10-integrity-audit.test.mjs`で4ケース追加。誤キャラ参照を避け、旧`caster.special`を意図的に不一致にしたKO後衛蘇生テスト、複数seedの**ホスト→両座席View→ActionOutcome V2→演出→決定論的journal再実行**を検査。原作未確認の全技は`fixture`のまま、必殺のヒット数`unknown`を維持。
- **最終実装/testコミット`c0373b91`**：[Research Node **664/664 PASS＋耐久試合 PASS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40642251110)、[Stage Chromium/gesture/結果 **PASS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40642251099)。本体修正コミット`a6ebc727`の[Firebase emulator QA成功](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40642200382)と[Sitesビルド成功](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40642200314)も確認。**Firebase Emulatorでは匿名Auth研究経路を含むため、学校AuthなしFriends Safari実機2台の動作保証と混同しない**。
- 本人の**原作MP4実ファイルから直接3フレームを抽出/目視**：第2試合90秒で「ザ・無表情」専用カットイン、第3試合90秒で複数数字＋状態表示、第4試合110秒で「敵が行動しなくなる」効果と下画面を確認。いずれも瞬間の一次資料で、打数・持続/計算式・動作時間は未判明。勝手に`documented`へ昇格していない。
- **判定**：Phase1はソフトウェア基盤の範囲で完了、Phase2へ進む。**原作再現が完成した/学校公開が完了したとは言わない**。Google Sites稼働版、GitHub main、本番Firebase Rules/DB、Drive配布は変更なし。

## 次する作業（Phase2 / サブステップ2.1）
**原作の戦闘ルールを1技ずつ実証して修正**：まず物理攻撃または妖術のうち、元動画と信頼できる資料で威力・ヒット数・属性/命中挙動が確認できる技を1種類選ぶ。キャラは引き続きオリジナルレンタル6体。記録するのは原作のルール上の根拠と、現在fixtureとの差分、seed/画面の回帰検証。原作の不明数値を後付けしない。続いてPhase2.2必殺多段/範囲、2.3とりつく/スキル効果、2.4実戦統合を順に進める。

## 前回の作業（Phase1.9）

## 今回した作業（Phase1 / サブステップ1.9：固有スキルIDからホスト実処理へ）
- **既存6スキル** `momentum`（KO後強化）、`care`（隣接回復）、`sharpCrit`（会心率）、`critImmune`（会心無効）、`lastStand`（致死1回耐え）、`guardBreak`（物理ガード無視）の`skillId/trigger/effect`を`content/skill-catalog.mjs`から検証し、現行ホストの判定場所へ接続した。**原作の倍率や持続数値はfixtureで、変えていない**。
- 新`engine/catalog-skill-spec.mjs`：名前・5能力・スキル・6種類の発火条件・効果が共通カタログに一致するか戦闘開始時に検証。不一致/誤カスタムIDは拒否。`engine/combat.mjs`は`catalogSkillResolution`時に正規IDから求める`skillFor`を既存のKO/ダメージ/急所/ガード/回復処理に渡す。`engine/skill-effects.mjs`の隣接回復だけ任意`skillOf`を受け取れるよう拡張。**新イベントバスやタイマーを追加しない**。
- `engine/match-protocol.mjs`では組込みレンタルの開発版で既定true、明示カスタムteamはfalse。ゲストからの切替は不可。イベントや通信wireの形式は変更なし。
- `tests/phase1-9-skill-catalog-host-parity.test.mjs`で6件追加。ID/trigger/effectの整合・誤データ拒否・6枚隣接・学校/研究複数seed・Pin入力・skillイベント・旧ダメージモデルまで一致を確認。**[研究単体660/660＋耐久PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40640840994)**、**[Chromium Stage/Gesture/Result PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40640840904)**。
- 原作調査は[攻略大百科スキル一覧](https://gamepedia.jp/youkai-yw2/skills)と[ゲームの匠スキル一覧](https://youkai-gh.g-takumi.com/skill_list.php)、[Game Programming Patterns Event Queue](https://gameprogrammingpatterns.com/event-queue.html)。本人提供動画は以前の観察記録を参照し、**今回MP4の新規全フレーム検証を行えたとは言わない**。正確なスキル係数・発火順位は未実証。
- 詳細：[Phase1.9 実装と外部根拠](./PHASE1_9_PASSIVE_SKILL_CATALOG_HOST_PARITY_20261028.md)。学校Google Sites稼働版・GitHub main・Firebase本番Rules/DB・Drive配布は無変更。

## 次する作業（Phase1 / サブステップ1.10）
**Phase1戦闘基盤の総合点検**：6体→4技とスキルID→ホストの効果→`ActionOutcome`→画面/通信の依存関係が正しいか確認。現在`ActionOutcome V2`は通常攻撃だけなので、スキルを勝手に攻撃Hit列へ捏造して統合しない。全レーンの原作証拠`observed/documented/fixture/unknown`を照合し、Phase2へ移るために残る仕様を優先付けする。学校iPad実機二台の検証は適切な時点で本人に依頼する。

## 前回の作業（Phase1.8）

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
