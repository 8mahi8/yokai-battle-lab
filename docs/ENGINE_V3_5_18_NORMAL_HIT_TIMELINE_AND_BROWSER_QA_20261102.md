# 妖怪ウォッチ2｜Engine V3-5-18：原作動画の連続命中表示・通常攻撃Hit共通化（2026-11-02）

## 優先した問題

本人提供の原作PvP録画の過去フレーム観察（[Match01](./ORIGINAL_PVP_VIDEO_20261027_MATCH01_OF04.md)、00:43–00:52と01:28–01:37）では、**必殺カットイン → 複数のダメージ数字・HP推移 → 戦闘復帰**が確認されている。また[Phase49観察記録](./PHASE49_USER_SUPPLIED_ORIGINAL_PVP_VIDEO_REVIEW_20261027.md)には赤いダメージ数値・緑の回復数値・スキルとダメージの区別が記載される。**この作業中に元のMP4を直接再視聴したわけではない**。

外部確認：[攻略大百科『ひゃくれつ肉球』](https://gamepedia.jp/youkai-yw2/specials/3961)は20×5、[Mt.Wildwood Wiki『ジバニャン（YKW2）』](https://mtwildwood.net/ja/yw2/yokai/jibanyan)は20×7と食い違う。既存 `content/yw2-original-reference-pack.mjs` の `disputed` を維持し、5回または7回を採用していない。さらに異なるファンゲーム・TV版の情報を本家YW2の根拠として混ぜない。

## 確認したコード上の差分

- `ui/match-stage.mjs` は `sceneHitIndex` と `shownHp` で通常攻撃のHP・数字を既存Hostの1Hit単位で更新。先行V3-5-16で画面下行動説明も現在ヒットに合わせた。
- しかし共通 `presentation/action-choreography.mjs` の `choreographyFrame().impacts` は、**SoultimateのHitLedgerなら個別Hitを返す一方、通常攻撃の `hitResults` が存在しても最終合計 `plan.impacts` を返していた**。将来の技固有演出がこの契約を使うと初撃に全ダメージを表示する。
- `presentation/legacy-attack-outcome.mjs` は**レンタル6体の正規Move ID**を持つ場合にしか通常Hit列を投影しない。将来、研究用カスタム技にHit数を与えても、出典を捏造せず共通表示で確認する経路がなかった。
- `lab/match-stage.css` の数値色は通常ダメージが淡黄色、回復が緑。動画観察の赤ダメージ・緑回復という区別に合わせる余地があった。

## 今回の実装

1. `presentation/action-choreography.mjs`：Host確定 `currentHit` があれば `choreographyFrame().impacts` も **その1Hitの targetId/hit/damage のみ**返す。従来の `plan.impacts`（合計・Host元帳）を維持、Hit記録がない従来イベントは従来表示にフォールバック。**必殺の「3対象」と「3ヒット」は混同しない**。イベント処理・乱数・HP・Soul・タイマー・通信は無変更。
2. `presentation/legacy-attack-outcome.mjs`：Host event `multiHit.hits` の連続HP/実損害/Hit/Miss/クリティカル/実行回数を検証し、**技名や技IDを付けない**共通 `projectRecordedAttackHits(event)` を追加。既存 `projectLegacyAttackOutcome` も同じ検証を共用する。
3. 正規レンタル技のカタログIDは、発動者本人の **authored attackHits** が正規の技定義と一致する場合だけ与える。Host実イベント `multiHit.planned` の値は昔から別の検証fixtureで任意の正規実行回数となり得るので、**技定義のHit数と強制一致させない**。初回CIではこの制約を取り違え、既存V2のテスト8件を破壊したが、`bc118633` で根本原因を修正し、後続Node CIで再合格を確認。技定義のHit数を原作証拠とみなすものではない。
4. `ui/match-stage.mjs`＋`ui/battle-vfx.mjs`：固有レンタル技として照合できない**カスタム通常攻撃**でも、Host確定Hit列だけを出典なし汎用攻撃として読み取り、舞台・HP・数字・行動ラベルに使う。正規レンタルの `ActionOutcomeV2` 経路は維持。
5. `lab/match-stage.css`：攻撃命中の数値を赤、回復の数値を従来の緑に維持。原作動画の色カテゴリに近づける**描画変更のみ**。
6. `tests/v3-5-18-recorded-hit-presentation.test.mjs`：Host実戦データによるカスタム3Hit・両席表示、hit/miss、改ざん拒否、元Host snapshot不変、旧単発攻撃フォールバック、原作録画の数値色カテゴリを検証。
7. `lab/match-stage.html?review=real-attack-hit-ledger`＋`tools/stage-smoke.mjs`：実戦エンジンの3Hit記録から、Chromium DOM上で全3Hitの表示・対象HP・ラベル・赤数値・技ID未捏造が一致するか観察する専用受入ケースを追加。**試験用カスタムチームのみ**。学校対戦用6体への付与ではない。

## テストと公開の区別

- **変更前のHEAD `2b41426`**：Node/Chromium/Firebase2席すべて成功確認。
- **開発途中 `8ab99fb`**：Node失敗（V2原契約との衝突）。テストを削除せず正規V2互換性を復元する修正 `bc118633` を実施。CIはこのように各HEADで区別。
- **後続 `bc118633`**：少なくともNode CIは成功、残る最終HEADのCI結果は実行後に正確に記録する。**最終3系統の成功はCIの完了前には宣言しない**。
- 学校iPad Safari実機2台・元動画原本の再視聴は未実施。本番Firebase Rules/Auth/DB、本番学校Google Sites HTML、GitHub main、Drive配布を変更していない。
- 過去保存のFirebaseルール写しには2026-11-08（JST）期限があったが、本番設定との同一性は未確認。Rulesは明示許可なく変更しない。

## 次のV3-5-19候補

原作の大きいギャップは、**技固有の命中列・モーション・試合テンポの忠実性**。本家データとMP4の未確認部分を埋めるための実証が必要。出典が一致した技から、既存 `ActionOutcome` / `SoultimateHitLedger` と共通 `Choreography` で再現できる表現を増やす。独立資料に矛盾する5/7ヒット数、元動画から証明できない正確なミリ秒は確定しない。

**ゲームエンジンV3-5は進行中・原作完全再現未達。**
