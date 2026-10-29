# 妖怪ウォッチ2対戦｜Engine V3-2 被弾後・持ち主ターン・妖気の共通処理（2026-10-29）

## 目的と適用範囲

既存の `combat.mjs` で、通常攻撃、必殺技、多段研究、継続とりつき、妖気に個別分岐していた**効果発火順序（phase/lifecycle）を明示し、今の対戦結果を維持したままモジュール化**する。既存の `MatchCore` とホスト権限、`EffectCommitter`、`SoultimateEffectPlan`、`SkillHookPipeline`、`KO Lifecycle` は再利用する。

対象は**開発ブランチのみ**。学校のGoogle Sitesの現在公開HTML／main／本番Firebase RulesとDB／Google Driveに変更なし。

## 外部根拠と仮説の区別

1. **原作確認あり**：『妖怪ウォッチ2』のチャージ中断率は被弾回数ごとに基本8、12、18、35%となり、ダメージ/最大HPや会心が加算される。資料：[Mt. Wildwood Soultimate Charge（YW2）](https://mtwildwood.net/soultimate-charge.php?g=yw2)。既存の`chargeInterruptChance`に当該式がある。**対象技の固有ボーナス・完全無効例は原作個体ごとの検証が必要**。
2. **原作確認あり**：プラスのとりつきは基本30行動（全員の行動数）、マイナスは原則時間制限なし。ただし効果によって例外がある。資料：[Mt. Wildwood Inspirits（YW2）](https://mtwildwood.net/inspirits.php?g=yw2)。既存`InspiritLedger`は`globalActions/ownerTurns/persistent`を区別する。
3. **原作確認あり**：HP継続減少と回復のカテゴリは存在。資料：[Mt. Wildwood YW2 Inspirits](https://mtwildwood.net/inspirits.php?g=yw2)。一方、**継続減少の`5%×レベル`、増減相殺の段階、端数とKOへの優先順は仮説**。とくに継続減少で根性系スキル・チャージ割り込み・撃破時スキルが発動するかは未確定。今回数値の変更やその自動発動を追加しない。
4. **妖気蓄積の正確な法則**は未確定：現`playtestSoulTuning`は友達対戦用の速度調整、`researchSoulGainPerAction`と`researchSoulRecoveryMode`は研究モード。原作正規数値を証明する資料として扱わない。

以前ユーザーが別チャットで提供した原作動画はこの実行中には直接再生できていない。過去の観察資料を原本の新規視聴と呼ばない。

## 実装

### `engine/hit-aftermath.mjs`

通常攻撃/妖術、研究用必殺の各ヒット、必殺の対象ごとの結果を**1個の`createHitAftermath`から明示的に実行**。

| 処理モード | 現在の合法処理順 | 注意 |
|---|---|---|
| `afterOrdinaryHit` | HP確定後→チャージ割り込み→KO Hook→ピン更新 | KO可能性は実際のHPゼロで判定 |
| `afterSpecialStrike` | 多段研究の各実ヒット→割り込みだけ | KO Hookは対象の複合impact完了まで待機。重複中断抽選をしない |
| `afterSpecialImpact` | 必殺の1対象確定→必要なら中断→KO Hook（after-skill）または蘇生後の行動可否同期 | 従来の普通攻撃と必殺のKO Skill vs CanAct順序の差を保持 |

抽選値・ダメージ数式・ピン・受けたダメージ・スキルの発動優先順は変更しない。**現在のフレーム内優先順は旧ゲームの研究実装であって原作で検証済みの順序ではない**。

### `engine/effect-commit.mjs` + `engine/owner-turn-effect-lifecycle.mjs`

継続HP効果に独立の`commitTimedHp`を追加。`loss`はHPを下限0へ、`regen`は最大HPへ制限する。これを普通の`commitDamage`から**明確に分離**し、現在の試遊仕様通り、継続HP効果だけでは`Last Stand`等の普通の被弾フックを発動しない。ここは**原作未確認**であり、忠実再現と断言しない。

`applyHpTick(actor)`は前から使っている`calculateTurnInspirit`の確定結果を同じHPへ適用し、HP0になった場合のみ行動可能性とピンを同期。`expireAfterAction(actorId)`は既存`InspiritLedger.tick`を使う。**旧順序を維持**：行動確定→継続HP計算→勝敗・行動イベント→Careスキル→行動表示→妖気増加→とりつき残りターン減算。

### `engine/action-soul-accrual.mjs`

妖気の3つの**既存の**増加モードを、`afterAction`1か所に集約。内部で`PLAYTEST_SOUL_TUNING`を使い、二重のキャラ・技データや独自の計算式を作らない。現在の順序にある`Care`より後、持ち主の状態異常期限切れより前に実行する。

- `researchSoulGainPerAction>0`：旧仕様通り生存中の全員に増加（控えを含む）。
- `playtestSoulTuning`：行動種別と弱体/サボり中相手への攻撃成功を見て試遊用の値を加算。`action.soulPlaytest`の出力構造も同じ。
- `researchSoulRecoveryMode:'owner-nonattack'`：旧試験用の非攻撃行動＋5を維持。**原作の完全なSoul計算式を意味しない**。

## テスト方針・確認できた結果

- 新規`tests/hit-aftermath-v3.test.mjs`：通常→中断→KO、必殺の多段/単発の抽選重複防止、蘇生同期、不正入力を遮断。さらに組込レンタルと明示的な旧編成の**8組のseed×flagの完全snapshot/event比較**。
- 新規`tests/owner-turn-effect-lifecycle-v3.test.mjs`：実`EffectCommitter`での継続損失/回復、KO同期、30全体行動、持ち主ターン限定、持続negative、旧`calculateTurnInspirit`の数値一致、研究6対6の同seed比較。
- 新規`tests/action-soul-accrual-v3.test.mjs`：3つの増加モード・控え含む12体・弱体命中とミス・KO除外・キャラの上限・9条件（3モード×seed3種）で試合全体snapshot/event一致。不正な同時指定は開始時に拒否。
- **[被弾後移行Node全743件PASS＋対戦耐久とブラウザsmoke PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40875026671)**、[同版のChromium Stage QA PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40875026733)。同一実エンジン版[Firebase no-Auth RTDB 2 iframe PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40874955225)、[Google Sites単体HTML build PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40874955184)。
- **初回Soulテストの失敗は、もともと`createCombat`が禁止していた「試遊用+全員一律Soul追加」の不正な同時指定をテストに書いてしまったことが原因**。テストを修正し、`action-soul-accrual.mjs`単体でも排他的な設定を拒否するよう統一。修正版`ed28512553`で**[正式Node 753/753 PASS + 自然6体対戦耐久 + ブラウザsmoke PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40876209404)**、**[Chromium Stage QA PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40876209175)**。Google Sites単体HTML buildはゲームコードの追加に対して[PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40876180124)。Firebaseの最新エンジンコードの試験は別の実行状況として判定し、成功前にはPASSと報告しない。
- 現在のテストはNode、Chromium、RTDBエミュレーター。**学校Safari実機2台で最新版を試したわけではない**。

## 次の工程・課題

1. この差分の正式Node/ブラウザ/Firebase/GitHub Sitesビルドを確認、失敗時は原因を修正し、旧新snapshot/event比較を守る。
2. V3-2の**原作由来が未確定**なもの（KOと永続Statusの優先、DoTによるKO/生存パッシブ、charge時の各技追加中断ボーナス、Soul回収と移動）をソース根拠とユーザー提供原作動画・原作試遊に照らして明文化。
3. `combat.mjs`の残り分岐（直接HP変更やSoul移動が残る研究専用Poke・Cut-in）を**重複実装を増やさず**共通Commitに編入。
4. V3-3：元原作の行動ポイント、妖気と相手の表示時間。V3-4：任意の妖怪を4技ID＋スキルIDから読み込み、6体固有判定を不要にする。V3-5：オンライン学校Safari実機。

**本人作業要否：いまは不要。** 本番公開やmain変更なし。
