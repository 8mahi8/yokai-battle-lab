# 妖怪ウォッチ2対戦｜Engine V3-2 効果単位の新旧差分回帰（2026-10-29）

## 目標と検証の線引き
前工程の研究用必殺HP/状態共通化と全impact事前検証が、既存ルールを変えないことを**固定seedの旧実行契約との比較**で担保する。対象は旧 `applyResearchSpecial`のHP/状態dispatch（`EffectCommitter`、`InspiritLedger`を利用）と新`commitResearchSpecialHp`/`commitResearchSpecialStatus`/`assertResearchSpecialImpact`。**戦闘ホスト全体の旧新比較ではない**。時間管理・打撃後処理・KOスキル発火・通信・リプレイ一致は今回の証明範囲外。

## 実装
- `tests/research-special-differential-v3.test.mjs`を新設。旧ブランチの効果確定ロジック相当（HP攻撃/回復は`effects.commitDamage/commitHeal`、状態は`effects.commitStatus`、抵抗の乱数は効果の前後で旧順序）を**比較用オラクル**に保存。
- 新経路では8カテゴリ共通の事前全impact検査と共通HP・状態Commitを通す。**実際の`planResearchSpecial`の出力**を元にしており、架空の技別ifを追加するものではない。
- 8カテゴリ（damage, drain, damage-status, heal, buff, debuff, revive-heal, revive）×3 HP初期構成（通常、味方KO、敵瀕死）×4 seed（1、7、42、20261029）の**96ケース**について、効果単位のHP/最大HP一覧、InspiritLedger全件、impact event array、実際に消費したresist乱数回数、勝敗値を`deepEqual`で比較する。追加で`damage-status`がKOした敵には追加状態を入れず、余計な抵抗乱数を消費しないケースを個別確認。
- 初期seedの比較だけでなく、`planResearchSpecial`、`EffectCommitter`、`InspiritLedger`、共通Commit関数は**GitHubの実ソースをロード**して実行。独立したオラクル側だけが旧HP/Status配線を模倣している。

## 実行結果・誠実な限界
- 2026-10-29最新ブランチ `3ab1059...` のGitHub実ソースを読み込み、Code Mode V8でNodeテスト本文を実行（`node:test`と`assert.deepEqual/equal/ok`に相当する小さな実行アダプタ）し、**96/96新旧一致、KO時の状態抑制もPASS**。
- この検証は**正式なNodeテストランナー実行ではなく、JSランタイム上の同等のテスト本文実行**。ここから最新HEADのNode全件/Chromium/Firebase RTDB Friends 2iframe/Google Sites単体HTML build/学校Safari2台の成功は推論できない。GitHubコネクタのWorkflow一覧は対象commitについて空で、CI合格証拠は未取得。
- `engine/combat.mjs`においてHPの直接代入は今回のキーワード監査ではヒットしない。通常攻撃/多Hit/研究必殺/Pokeは共通`effects.commitDamage/Heal`またはそのアダプタを使用。状態の`statuses.purify`は台帳専用の削除ルートとして残る。副作用の優先順を変えずに統一する余地があるが、原作確認前に機械的に移さない。
- `tests/research-special-differential-v3.test.mjs`の`node --test`を正式CIで実行し、その結果を既存の標準6体/MatchCore/Firebase/Safari試験に接続することが次の受入基準。

## 外部資料と未確定の原作仕様
- [Mt Wildwood｜YW2 Inspirits](https://www.mtwildwood.net/inspirits.php?g=yw2)：正負とりつき、抵抗値、Lv1..4、持続期間の基本規則。比較対象の`resistance`値自体はあくまで研究用テストfixtureであり原作レンタル個体の実値ではない。
- [Node.js test runner](https://nodejs.org/api/test.html)：この比較テストは標準`node:test`対応で作成。CI実行結果の代わりとしてV8結果を表示してはいけない。
- ユーザー提供動画の生ファイルには今回直接アクセスしていない。動画内における時間差、発動フレーム、対象固定、KOと演出の順序は未検証。

**現在：V3-2後半（未完成）。** main、学校公開HTML、本番Firebase Rules/DB/Auth、Google Driveは変更なし。ユーザー操作不要。
