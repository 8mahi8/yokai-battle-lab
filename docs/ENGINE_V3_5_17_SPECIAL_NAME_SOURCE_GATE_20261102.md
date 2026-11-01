# 妖怪ウォッチ2 V3-5-17｜必殺技名の出典ゲートと実行技の照合（2026-11-02）

## 目的
本人提供の『妖怪ウォッチ2』原作対戦動画の一次観察記録には、**技名表示→固有カットイン→実際の命中/効果→通常戦闘へ復帰**がある（[Match01: 00:43–00:52、00:55–01:05](./ORIGINAL_PVP_VIDEO_20261027_MATCH01_OF04.md)）。技固有名を不正に表示したり、対象数をヒット回数として創作してはならない。

現行V3-5-16は24技の正規データと6体レンタル名を保持し、通常攻撃1HitずつのHP・数値を整合させた。しかし `ui/match-stage.mjs` は **単に発動妖怪の席番号が同じという理由でレンタル6体の必殺技名を表示**していた。実験用カスタム妖怪が同じ番号を使うと、実際には異なる技でも「あかねこ：火花乱れ爪」等と誤認させる可能性があった。

この工程では原作キャラの追加や原作内部係数の推定はせず、**Host確定技の出典・実効果と表示名の一致だけ**を修正。

## 既存の原作資料の再確認

- [レベルファイブ公式：妖怪とバトル](https://www.youkai-watch.jp/yw2/game/game06.html)：ウォッチ操作・必殺・零式。対戦の正確なモーション時間は示さない。
- [攻略大百科：妖怪ウォッチ2・鼻血ボンバー](https://gamepedia.jp/youkai-yw2/specials/3820) と[たらりんの妖怪一覧](https://gamepedia.jp/youkai-yw2/monsters/387)：敵全体/威力100×1。既存の `content/yw2-soultimate-reference.mjs` にカスタム研究用として定義済み。同技の他シリーズ記録に異なる威力・ヒット数があるため、**YW2以外を混ぜない**。
- [原作対人研究](https://note.com/tombow_yw/n/n1e4cf179d2d9)：相手側のモーション中の表示保留の研究。時間・通信遅延の厳密な証拠ではない。
- 原作「ひゃくれつ肉球」の命中数は既存の `content/yw2-original-reference-pack.mjs` で 5/7 の資料不一致として管理しており、変更しない。
- 本工程でも本人元MP4原本を直接開いたわけではなく、[過去の実フレーム観察](./ORIGINAL_PVP_VIDEO_20261027_MATCH01_OF04.md)を参照。

## コードで確認した原因・修正

1. `ui/match-stage.mjs` の `mb-special-title` は、`referenceSoultimate` 以外では常に `soultimateDisplayTitle(flash.actor)` を呼んでいた。**同じA1/B1という席番号なら研究カスタムでもレンタル名が出ていた。**
2. `presentation/soultimate-visual-profiles.mjs` は名前・スキル・技効果カテゴリでレンタル絵を選ぶが、**同じ名前とカテゴリで威力/範囲/状態効果を変えたカスタム技**を厳密には排除しなかった。
3. `projectSoultimateVisual` が、Host snapshotの正規化された `caster.special` と `RENTAL_SOULTIMATE_MOVES[index].definition` の **kind/scope/power/damageKind/status effect/level** を照合。レンタル技と実行技が一致する場合だけ既存のvisualプロフィールを返す。新しい戦闘値を再定義していない。
4. `ui/match-stage.mjs` に `specialTitleFromPlan(plan)` を追加し、`planActionChoreography` が検証した **source-backed原作研究技**なら「原作技の研究：名称」、**同じ技定義の純正レンタル**なら従来の独自必殺技タイトル、それ以外は **「ひっさつわざ」** と表示する。
5. 上画面のカットインと下画面の発動説明に **同じ検証済み技名** を使う。従来の6体レンタルの名称・エフェクト/戦闘結果・サークル・操作・妖気・ゲーム時計・Firebase通信には変更なし。
6. `tests/v3-5-17-special-name-source-gate.test.mjs` でHostを実行した6種類のレンタル必殺がすべて従来の名称、同一キャラ名/技種で威力だけ変えたカスタム技が汎用名、原作出典のある「鼻血ボンバー」が研究名になること、画面接続・Host状態不変を検証。

## 結果と未検証

- コミット：`5559929`（Stage表示ゲート）、`b083e75`（技同一性照合）、`ec75183`（専用自動テスト）。
- **Node / Chromium Stage / Firebase Friendsの最終結果はGitHub ActionsのこのHEADで確認**する。CI実行中をPASSと報告しない。試験結果は後続引き継ぎに追記。
- これで原作の技モーション・原作の必殺Hit数/威力・アニメの厳密な時間が再現完了したわけではない。
- 学校のSafari実機2台・Google Sites稼働版は今回未検証・未変更。本番Firebase Rules/Auth/DB、GitHub main、Drive配布も未変更。

## 次 V3-5-18

今回は命名の不整合を実在するHost証拠から防いだ。次は既存の `ActionOutcome` / `SoultimateHitLedger` / `scenePlan` で表現できる**原作の技固有ヒット列と、現在の画面の1Hit表示の差**を整理して、単一の有意な改善点があれば改修する。根拠のない5/7ヒット選択・架空の追加技名・カットイン秒数変更はしない。

**全体フェーズ V3-5 進行中。**
