# 妖怪ウォッチ2 対戦再現｜Engine V3-2：研究用必殺の全impact事前検証（2026-10-29）

## 位置づけと修正の理由
前工程で通常レンタル6体の必殺は `assertPlannedSpecialImpact` によって全impactを実行前に検証できていた。一方、研究用・カスタム技（`sourcePlan === null`）は、HP/Statusの共通Commit導入後も、impactごとの確定直前に検証していた。将来データを追加すると不正な後続impactの発見前に先行HPが変化する可能性があり、**共通Effectエンジンの責務として事前全件検証を揃える**。

- `engine/special-impact-commit.mjs` に `assertResearchSpecialImpact(impact,{casterSide,target})` を追加。HP/最大HP、実targetID、所属side、damage系整数amount、heal/reviveの回復範囲、buff/debuff/damage-statusの符号・Level1〜4・生存を検証。
- `engine/combat.mjs`：`planResearchSpecial`の結果を配列順に**1件も確定する前に**全件検証する。カタログ付きレンタル6体は既存のPlan検証、研究用は新しいpreflight関数を使う。旧スキル・RNG・割り込み・KOとイベント順序、旧研究用の技威力と対象選択は変更しない。
- `tests/research-special-hp-commit-v3.test.mjs`：以前のカスタム`defense-down`必殺テストが `researchStatInspirits` を設定しておらず、既存`applyInspirit`の入力条件に反していた。必要な `researchDamageModel:true` + `researchStatInspirits:true` を追加。**エンジンの正しい仕様とテスト側の不備を区別して修正**。
- `tests/research-special-preflight-v3.test.mjs`：全8カテゴリの合法18impact、後続不正impactによる全事前検証拒否、符号/対象/値/KO不正、カスタム必殺のseed決定性を扱う4つのNodeテストを追加。

## 原作根拠・研究領域の線引き
- [Mt. Wildwood｜Yo-kai Watch 2 Inspirits](https://mtwildwood.net/inspirits.php?g=yw2)：効果Lv1〜4、持続時間未指定のpositiveは全体30行動、negativeは基本無期限（明示の効果別例外あり）、とりつきの抵抗率が0〜100のルールがある。**ただし本改修は原作効果持続/抵抗値そのものの変更ではなく、既存値の適用前に型を検証する**。
- `engine/special-effects.mjs`内の8研究カテゴリはソースにある原作技カテゴリから着想を得た研究fixtureであり、正確な発動率、Hit数、時間/同時順、オリジナル6体の技数値は原作確定ではない。
- 原作動画の生ファイルはこの回にはアクセス・再視聴できていない。過去の観察記録を原本の直接視聴と呼ばない。

## 実施できた検証と未完
- GitHubから取得した**実ソース**の構文検査：`combat.mjs`と`special-impact-commit.mjs` PASS。
- V8上の事前検証関数の直接検査：**合法7・不正8＝15条件PASS**。
- 実際の`planResearchSpecial`が生成した全8カテゴリ**18impactのpreflight PASS**（damage、drain、damage-status、heal、buff、debuff、revive-heal、revive）。
- 上記は局所テスト。**追加したNode4件をNodeで実行したという意味ではない**。今回HEADにおけるNode全件・自然戦闘・Chromium・Firebase Friends noAuth RTDB 2iframe・Google Sites単体HTML build・学校iPad Safari実機2台は**未確認**。GitHubのcommit workflow検索コネクタは空配列を返し、GitHub Actionsの成功/失敗を裏付けられない。インターネットからのgit cloneもDNSで不可。
- 推奨実行：`node --test tests/research-special-hp-commit-v3.test.mjs tests/research-special-status-commit-v3.test.mjs tests/research-special-preflight-v3.test.mjs` に続いて全Nodeテスト、自然対戦耐久、実ブラウザ操作、Firebase2席、HTML build。出力と結果が見えてから完了と呼ぶ。
- 以前の`753/753`合格は**今回HEADの証明に転用しない**。正式新旧snapshot/event/Soul/KO比較もまだ実行していない。

## 次工程・現地点
**V3-2後半・未完**。最新HEADで正式CIを取得し、同seed・同操作の旧新完全比較を優先。次は残る影響範囲の重複や必要な時間領域の整理へ進む。V3-3（論理行動/表示時刻/妖気）、V3-4（キャラ/技/スキルID登録）、V3-5（Firebase Friendsと学校Safari2台）はまだ完了していない。main・学校Google Sites公開版・本番Firebase DB/Rules/Auth・Google Driveには変更なし。本人作業は現段階で不要。
