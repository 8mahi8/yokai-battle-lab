# Engine V3-2｜必殺技の複合Effect Plan共通化・回帰（2026-10-29）

## 今回の狙い

前工程で既存6体×通常3種＝18技を `typed-effect-plan.mjs` の `damage/heal/status` に統合した。しかし必殺技6種は対象範囲・複合効果・複数ヒットが絡むため、何も検証せず普通の技1ヒットに変換できない。**「技ID・スキルIDだけを登録して追加できるゲームエンジン」への基礎**として、同じ技マスターから必殺技の意味と順序依存を宣言する共通Planを作る。

- 現行学校版は**Google Sites単体HTML + Firebase RTDB認証なしFriends**。main / 本番Firebase / 学校公開版 / Google Driveは変更しない。
- 原作で確認した**効果の類型**と、試遊用の**数値・発火優先順位**は区別。今回原作MP4を新たに直接再生したわけではない。
- 参照：原作『妖怪ウォッチ2』の技と必殺技研究 [Mt. Wildwood / YW2 Soultimates](https://mtwildwood.net/soultimates.php?g=yw2)、[Statiking / 吸収と多段](https://www.mtwildwood.net/yw2/yokai/statiking)、既存 [V3全体設計](./ENGINE_V3_ARCHITECTURE_SOURCE_FIRST_20261029.md)、[V3-2通常技](./ENGINE_V3_2_TYPED_EFFECT_PLAN_20261029.md)。

## 実装した共通レイヤー

| ファイル | 変更内容 |
|---|---|
| `engine/soultimate-effect-plan.mjs` | `compileSoultimateEffectPlan(move,definition)` で**既存の技マスター＋必殺の既存効果定義**から immutable な複合Planを構築。`assertSoultimatePlanMatches(plan,definition)` でカテゴリ・対象・**全正規化パラメータ**のずれを拒否 |
| `engine/combat.mjs` | 組込レンタル6体分の必殺Planを試合開始時に検証。実際に研究必殺を解決する際、旧`resolvedSpec`とPlanを照合してから既存`planResearchSpecial`へ渡す。**この工程ではHP変更・RNG・ターゲット・KO・Soul/Animationの実行順は変更しない**。カスタム編成・原作研究の特別技は旧ルート |
| `tests/soultimate-effect-plan-v3.test.mjs` | 六つの必殺技全類型、未知Hit数、複合効果、ソースの衝突拒否、既存ホスト必殺の実発動、ジャーナル再生。加えて*新キャラの設計例*として同じ型の「6ヒット攻撃」「回復」「単体蘇生」をキャラ固有分岐追加なしに型検査 |

現6種類の構造：

1. `damage`：ダメージ。Hit数が不明な場合は `null` のまま保持。
2. `drain`：ダメージ→**実際に吸収できたHPに依存した回復**。仮の割合は従来のResolverが保持。ターゲットは enemy_front と ally_front を混同しない。
3. `buff`：味方前衛への良いとりつき相当の状態。
4. `damage-status`：敵単体へのダメージと、**生存対象への追加悪い状態**。旧ホスト順は維持するが、これを原作内部順と断言しない。
5. `revive-heal`：味方6体への**復活＋回復の複合**。`combined-revive-heal` 一段階に留め、同じ回復を2回Commitしない。
6. `debuff`：敵前衛への悪い状態。

各Planは `targetScope`、`originalHitCount`、`hitPattern`、`sourceRefs`、`orderEvidence:'legacy-playtest-only'`、凍結された各stageを保持。Hit数や対象範囲の取り違い、power/statusEffectの矛盾はエラーとする。

### なぜ効果の実行を全面移管しないか

現行 `engine/special-effects.mjs` は複合効果を1つの対象向けimpactとして出し、`engine/combat.mjs` がHP確定→割り込み→KO→追加状態と原作**未証明の旧順序**で処理する。これをいきなりtypeごとに独立Commitすると、HPが二重増減したり多段中断やKOイベントの順序が変わる。**まず既存全24技の意味が一本のPlanに見えること・旧ホストと一致することを完了条件**とし、次は実行フェーズを差分比較しながら切り出す。

## 今回確認したCIと未検証範囲

- 先行版のNode 726/726は[Actions 40869870353](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40869870353)で**合格**。以前の725/726はテスト対象HP20の設定が漏れた**テスト期待値側の誤り**で、修正[3ed131509f](https://github.com/8mahi8/yokai-battle-lab/commit/3ed131509f243693b5a00474516c992800a46889)により解消した。
- 新しい複合Planの**正式Nodeテスト731/731 PASS＋自然6体対戦耐久＋研究ブラウザPASS**：[GitHub Actions 40870366576](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40870366576)（`15b6d35d4`）。後続の**文書のみ変更**した`d11351f2`でも[Node全件PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40870516831)。
- **実Chromium Stage/Pointer/Purify/Result PASS**：[Actions 40870366594](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40870366594)（`15b6d35d4`）、文書のみ後続も[PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40870516758)。
- **Firebase Friends no-Auth RTDBエミュレーターの実2画面通信PASS**：[Actions 40870222395](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40870222395)。**Google Sites単体HTML build PASS**：[Actions 40870222384](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40870222384)。いずれも最終**ゲームエンジンコード**`66b5648b1`での確認で、それ以降は専用テストと文書の追加のみ。学校Safari実機最新版は未確認。
- Chromiumエミュレーターでの「動いた」は学校のSafari実機2台の保証ではない。元動画と原作の数値・Hit順・演出秒数の照合は引き続き未完。

## 次の一手

1. **新しいHEAD**でNodeテスト全件・自然6体対戦・Stage Chromium・RTDB Friends 2 iframe・単体HTMLビルドを確認し、失敗があれば修正。
2. 複合stageの実行部分を、旧ホストのimpact列/Status/HP/Soul/KO順と**同一seed・同一入力で毎段比較しながら**V3-2共通化する。必殺のHit数が `unknown` の場合は自動的な1Hit決め打ちを禁止。
3. V3-3は行動ポイント/妖気/相手表示保留の原作再現、V3-4は任意キャラの4技IDとスキルID追加テスト、V3-5は学校2台の試合完走に進む。

**現在地：V3-2 進行中**（共通Effect Commit・KO・スキルHook・普通技型・必殺複合Plan）。**ユーザーの作業なし**、学校公開や本番Firebaseは変更しない。
