# 妖怪ウォッチ2対戦｜全履歴・コード再監査によるV3-2引き継ぎ（2026-10-29）

> 引き継ぎ元 `6fd4e4adb0e9b3c61f8a2328ccba99eb3031822e`、開発ブランチ `feat/phase1-action-circle-lab-20261023`。本資料は過去の資料の再読・現在のコード閲覧・既存GitHub Actions実ログ確認であり、本家との完全一致、新規のコード実装や学校Safari実機QAの証明ではない。

## 1. 読み直した資料・経緯（直近だけを信じない）

- **最初の合意と旧体験**：[`HANDOFF_20261023`](./HANDOFF_20261023.md)、[`HANDOFF_LATEST_20261024`](./HANDOFF_LATEST_20261024.md)、[`PHASE1_10_FOUNDATION_INTEGRATION_AUDIT`](./PHASE1_10_FOUNDATION_INTEGRATION_AUDIT_20261028.md)。初期のシミュレーター・オンライン実験・原作再現の方針変遷を区別。閃光魂、育成、ランキング、履歴/リプレイは初期範囲外。
- **設計転換の根拠**：[`ARCHITECTURE_V2`](./ARCHITECTURE_V2_SOURCE_FIRST_FULL_BATTLE_BLUEPRINT_20261028.md)、[`ADR_0002`](./ADR_0002_ORIGINAL_PVP_CORE_REARCHITECTURE_20261028.md)、[`ENGINE_V3_ARCHITECTURE`](./ENGINE_V3_ARCHITECTURE_SOURCE_FIRST_20261029.md)、[`ROADMAP_6_PHASE_PROGRESS`](./ROADMAP_6_PHASE_PROGRESS_20261028.md)。個別技/場面実装を増やす前に一つのホスト状態所有・共通効果・ID登録に集約する。
- **実対戦とUI不満**：[`PHASE43_SCHOOL_20261027_REAL_USER_PLAYTEST_FIXES`](./PHASE43_SCHOOL_20261027_REAL_USER_PLAYTEST_FIXES.md)、[`PHASE2_REFOCUS_FIREBASE_FRIENDS_ACCEPTANCE`](./PHASE2_REFOCUS_FIREBASE_FRIENDS_ACCEPTANCE_20261029.md)、[`SCHOOL_NETWORK_SOURCE_OF_TRUTH`](./SCHOOL_NETWORK_SOURCE_OF_TRUTH_20261029.md)。**2026-10-27の旧Firebase Friends V2は学校Google Sites＋Safari2台で対戦成功**。回転タッチ、行動の分かりにくさ、零式、妖気速度に問題。V3/現行V3-2を学校で再試験した意味ではない。
- **動画の出自**：[`HANDOFF_ARCHIVE_AUDIT_AND_VIDEO_ACCESS`](./HANDOFF_ARCHIVE_AUDIT_AND_VIDEO_ACCESS_20261028.md)、[`PHASE49_USER_SUPPLIED_ORIGINAL_PVP_VIDEO_REVIEW`](./PHASE49_USER_SUPPLIED_ORIGINAL_PVP_VIDEO_REVIEW_20261027.md)、[`PHASE51_ORIGINAL_FOUR_MATCH_DEEP_RESEARCH`](./PHASE51_ORIGINAL_FOUR_MATCH_DEEP_RESEARCH_20261027.md)、[`MATCH01_SECOND_PASS_INPUT_AND_TIMELINE`](./MATCH01_SECOND_PASS_INPUT_AND_TIMELINE_20261027.md)、[`PHASE1_6_TECHNIQUE_CATALOG_AND_ORIGINAL_VIDEO_REVIEW`](./PHASE1_6_TECHNIQUE_CATALOG_AND_ORIGINAL_VIDEO_REVIEW_20261028.md)。過去の担当が原MP4実フレームを見た報告は存在する。後期の2〜4試合は**部分的なフレーム観察**もあるが、全編・双方視点・内部時刻の実証ではない。今回元動画の現物は取得できていない。録画の編集字幕・合成画面を原作UIと誤認しない。
- **行動ポイントと妖気**：[`PHASE21C_INITIAL_ORDER_SOURCE_AUDIT`](./PHASE21C_INITIAL_ORDER_SOURCE_AUDIT_20261025.md)、[`PHASE21D_B_SOUL_RATE_TABLE_AUDIT`](./PHASE21D_B_SOUL_RATE_TABLE_AUDIT_20261025.md)、[`PHASE21D_C3_PHASE22A_PVP_POKE_SOULTIMATE_RESEARCH`](./PHASE21D_C3_PHASE22A_PVP_POKE_SOULTIMATE_RESEARCH_20261025.md)、[`PHASE31_POKE_PVP_SOURCE_AUDIT`](./PHASE31_POKE_PVP_SOURCE_AUDIT_20261026.md)、[`PHASE22D_COUNTER_ENDURE_CUTIN_UNCERTAINTY`](./PHASE22D_COUNTER_ENDURE_CUTIN_UNCERTAINTY_20261025.md)。開幕同着優先、魂移動先・量・確率、二我慢時のカットイン対象確定タイミングは未確証。以前の妖気24条件研究は候補式23/24一致で**1条件不一致**。原作式と断言不可。
- **V3実装履歴**：[`ENGINE_V3_1_ACTION_TIME_BOUNDARIES`](./ENGINE_V3_1_ACTION_TIME_BOUNDARIES_20261029.md)、[`ENGINE_V3_2_SHARED_EFFECT_COMMIT`](./ENGINE_V3_2_SHARED_EFFECT_COMMIT_20261029.md)、[`ENGINE_V3_2_KO_SKILL_LIFECYCLE`](./ENGINE_V3_2_KO_SKILL_LIFECYCLE_20261029.md)、[`ENGINE_V3_2_PASSIVE_ROLL_HOOKS`](./ENGINE_V3_2_PASSIVE_ROLL_HOOKS_20261029.md)、[`ENGINE_V3_2_TYPED_EFFECT_PLAN`](./ENGINE_V3_2_TYPED_EFFECT_PLAN_20261029.md)、[`ENGINE_V3_2_COMPOSITE_SOULTIMATE_PLAN`](./ENGINE_V3_2_COMPOSITE_SOULTIMATE_PLAN_20261029.md)、[`ENGINE_V3_2_SPECIAL_IMPACT_COMMIT`](./ENGINE_V3_2_SPECIAL_IMPACT_COMMIT_20261029.md)、[`ENGINE_V3_2_HIT_TURN_SOUL_LIFECYCLE`](./ENGINE_V3_2_HIT_TURN_SOUL_LIFECYCLE_20261029.md)。効果とその適用、KO、被弾後、継続、妖気を徐々に移したが、まだ最終形ではない。

## 2. 今回実コードから確認した境界

- `engine/match-core.mjs` は`createCombat`の**単一入口**。まだ独立した新しい状態owner/reducerとして旧`combat.mjs`を置換していない。旧`combat.mjs`は約1226行で戦闘の主要RNG・ターゲット・特別効果の分岐が残る。
- `engine/typed-effect-plan.mjs` では通常3枠18技を不変の型付き効果に翻訳。攻撃、回復、状態異常の型を検証するが、**対象・命中・威力算式・乱数そのものは既存Resolver**。 `engine/soultimate-effect-plan.mjs`で必殺6種の形状を型検証、`engine/special-impact-commit.mjs`等が一部の確定へ接続。全技が一つの汎用Effect実行器になったわけではない。
- `engine/combat.mjs`の `applyResearchSpecial` に、ソースPlanのない特別なimpactの最終枝 `else target.hp=impact.hpAfter` が残る（引き継ぎ元コード約745行）。**実際に到達するimpact型・カスタム研究契約を調べてから**共有HP確定へ移す。無条件にコード置換しない。
- `engine/combat.mjs` の `pokeInput` は約890〜945行に、プレイテスト/研究の `soul.setSoul(enemy.id,...)` と `soul.addSoul(recipient.id,...)` の**二重の直接移動処理**が残る。標準のPoke報酬比率49/50/1、35魂移動、固定の受取先は原作数値ではなくfixture。最終目標は共通Soul移動Commitにして重複排除・RNG/正規state/イベントを旧版と同一に保持すること。
- `engine/hit-aftermath.mjs` と `engine/owner-turn-effect-lifecycle.mjs` の明示的なphase順は、**旧試遊用の確定結果を保存**したものであり、原作内でチャージ中断・KOスキル・DoTの発火順が確定したことを意味しない。DoTがHP1スキルを発動しないのも旧式兼暫定。
- `engine/action-soul-accrual.mjs` が3つの**試験用増加モード**を集約。対人原作の妖気の増え方の実装完了ではない。原作プレイヤー資料では妖怪や技による速度差、行動時の微増が述べられるので、全員への固定加算等を本家値と呼ばない。
- `engine/skill-hook-pipeline.mjs` は既存スキルカタログを参照し、会心、守り、HP1、生存後、KO後、お世話の一部共通処理を提供。持続回数・回復率・同一フレームでの処理順は原作未確証。

## 3. 証拠と限界

| 対象 | 引き継ぎ時点で確認できたこと | 限界 |
| --- | --- | --- |
| **最新HEAD `6fd4e4a`** | [Node Research Unit PASS（753件）](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40876564303)、[Chromium Stage PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40876564311)。両jobのstepsとログも確認。自然6体対戦耐久・Chromium research smokeもログでPASS。 | 現物の学校iPad Safari 2台試験ではない。 |
| **現行Firebase Friendsコード** | 本体改修を含む先行コード [Firebase AuthなしRTDB 2iframe PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40876180174)、[Google Sites単体HTML build PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40876180124)。後続コミットはテスト・資料追加で本体コード不変更と前担当が記録。 | `6fd4e4a`のそのSHAで両CIが起動したという意味ではない。今回本番通信・Google Sitesへの実設置なし。 |
| **途中失敗** | [Node FAIL](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40876079152)は試遊Soulと研究用Soulの禁止された同時指定をテストが使ったもの。後続の753件全合格で解消。[Stage FAIL](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40876148595)はChrome起動失敗・broken pipe／周辺バスエラーがログに残る。後続のStageは合格。 | 単一成功で全実行環境のフレークがゼロになったとは言わない。 |

**外部資料再照合**：LEVEL-5公式の[バトル機構](https://www.youkai-watch.jp/yw2/game/game06.html)、[Mt. Wildwood YW2 Turn Order](https://mtwildwood.net/turn-order.php?g=yw2)（前衛wait/行動後および交替後3×速度重み）、[攻略の虎 YW2 Battle](https://toragame.com/youkai2/kihon/battle.php)（前後衛・Gわざの隣接妖気消費と零式つつく）、[たくトンボの対人戦研究](https://note.com/tombow_yw/n/n1e4cf179d2d9)（表示保留と妖気速度の実戦研究）。出典が裏付けるカテゴリのみ使用。原本動画・二視点フレームタイム・未検証の値は補完しない。

## 4. 次の作業（独自機能追加ではない）

1. **V3-2残処理の棚卸し**：`combat.mjs`のPoke Soul transfer、特殊impactの最後の直書きHP、継続/KO/スキル割込、`soul.mjs`既存set/addをひとつの責務表に並べて、原作上の確証とlegacy互換を区別する。
2. **最初の安全な実装単位**：Soul移動の一回だけのcanonical transfer APIを提案し、playtest/research両ルートの重複を廃止する。原作未確証の量・受取先・発動率は変更しない。入力検証と失敗時の状態不変、受け手満タン/敵Soul不足/本人KO/同時入力をテスト。
3. **決定性とライブ通信のゲート**：新旧同seed/同コマンドのcanonical snapshot・event配列・Soul・KO・行動順の一致を検査し、Node全件/自然試合/Chromium Stage/Firebase Friends no-Auth 2iframe/Google Sites単体HTML buildを独立に確認。CIのPASS文言ではなくstep/実DOM結果を見る。
4. 未確認の原作ルールの**発火順・妖気正規式・Poke recipient**を、公式・対人プレイヤー・以前の本人提供動画観察記録で継続研究。今のfixtureを無根拠に変更しない。
5. V3-2完了後は V3-3（原作の論理行動順・妖気・seat可視性）、V3-4（妖怪・技・スキルID追加のみ）、V3-5（Firebase Friends全試合・学校Safari実機）へ。

## 5. 絶対に変更しないものと現地点

- 学校公開Google Sites埋込版、`main`、Firebase本番Rules/DB/Auth、Google Drive。通信方式は**Firebase RTDB / AuthなしFriends**のまま。Supabase・匿名Authへ戻さない。
- `V3-0`＝既存互換固定済、`V3-1`＝単一外部入口・時計分離まで、**`V3-2`＝共通効果移行の後半（未完）**、`V3-3〜V3-5`＝未完。今回は文書とコード/CIの閲覧・外部資料照合まで。新戦闘コード・新テストは未実行。本人操作は現時点で不要。
