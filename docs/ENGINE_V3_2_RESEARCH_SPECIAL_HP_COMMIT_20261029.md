# 妖怪ウォッチ2対人再現｜V3-2 研究用必殺HP確定の共通化（2026-10-29）

## 位置づけ
前回のPoke妖気移動共通化に続き、`combat.mjs`の`applyResearchSpecial`に残る研究用必殺HP経路を監査。**本家の完全な効果・数値・発火優先順を新たに確定した改修ではない**。従来のRNG、対象選択、ヒット回数（未確認なら不明）、割り込み、KO、Soul、イベントを維持し、HPを確定する責務だけを単一EffectCommitへ整理する。

## 外部資料と未確認事項
- [Mt. Wildwood｜YW2 Soultimates](https://www.mtwildwood.net/soultimates.php?g=yw2)では技の種類によって**多段Hit、吸収→味方回復、蘇生、全体回復、持続状態**が存在する。例：StatikingのGiga Turbocharge、Elder BloomのFull Bloom。本資料は**効果カテゴリ**の根拠であり、現在のレンタル用研究値、フレーム内priority、独自のヒット数を正当化するものではない。
- 既存の`engine/special-effects.mjs`は`validateSpecialSpec`で8カテゴリを列挙し、`planResearchSpecial`の結果はHP変化5種（damage / drain / damage-status / heal / revive）と状態のみ2種（buff / debuff）に限定される。`revive-heal`は1人ごとの`heal/revive` impactを生成する。したがって以前の`else target.hp=impact.hpAfter`は**現在の合法プランからは到達不能な危険な汎用枝**であり、原作に必須な効果の未実装を示す枝ではなかった。
- 本人提供の元動画の実ファイルには今回も直接アクセスしていない。過去の観察報告は再視聴の証拠ではない。

## コード変更
1. `engine/special-impact-commit.mjs`に`commitResearchSpecialHp({impact,target,effects})`を新設。技IDのない研究用/参考用Planであっても、解決済みの効果種類・対象ID・HP値・量を検証したうえで**既存のEffectCommitter**へ渡す。
2. `engine/combat.mjs`の`applyResearchSpecial`において、カタログ6必殺は引き続き`commitPlannedSpecialHp`、研究用は`commitResearchSpecialHp`を使う。直接`effects.commitDamage/commitHeal`を呼ぶ二重ルートを削減。未知のHP impactには`RangeError`を出し、**直接代入による無検証のHP変更を廃止**。
3. `buff/debuff`の状態台帳への適用、`damage-status`の耐性判定、multi-hit個別ダメージ、被弾割り込み・KO発火順は変更しない。ここには原作未確定の挙動が残る。
4. `tests/research-special-hp-commit-v3.test.mjs`に4テストを追加：各効果の単一HP確定、不正な回復・負数・未知kindの拒否、カスタム研究用8定義のseed付き再現性。既存6必殺の`soultimate-effect-plan-v3.test.mjs`によるカタログ→旧ルート完全比較も継続対象。

## 実行確認の範囲
- Code Mode内の読み込んだ実GitHubソースを使うV8直接検証で**36条件PASS**（HP更新/入力拒否/非変更）。旧ロジックと共通Commitで、`planResearchSpecial`実生成の8定義から抽出したHP impact **14ケース一致**（damage, drain, damage-status, heal, reviveを含む）。
- 本変更の`engine/combat.mjs`と`engine/special-impact-commit.mjs`をJS構文チェック済み。新規4件テストはGitHubに追加済み。
- **未確認：最新HEADのNode全件/Chrome Stage/自然6対6耐久/RTDB Friends no-Auth 2iframe/Google Sites単体HTML build/学校Safari2台。**上記V8検証はNode全件やブラウザ実機QAの代替ではない。GitHub Actionsの該当PRコミット実行結果が取得できていないため、PASSと書かない。
- 原作仕様が不確定のままなのは、ターン/状態/KO優先、実時間と双方画面表示の差、発動数値、実際の多段Hit数等。

## 次工程・変更禁止
次は最新HEADの正式CIと、同seed同操作による旧新の完全snapshot/event/Soul/KO比較を確認。その後、V3-2の残る状態・効果分岐を責務表で棚卸し、原作検証が必要な項目をV3-3へ接続する。**V3-2進行中で未完成**。V3-3行動順/時刻、V3-4データ駆動、V3-5学校Safari試験は未着手。

`main`、学校Google Sites公開版、本番Firebase RTDB Rules/DB、Driveは無変更。本人作業は不要。
