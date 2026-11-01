# 妖怪ウォッチ2 忠実再現｜V3-5-21 原作全体多段必殺の確認と会心フィードバック

2026-11-02 / 開発ブランチ `feat/phase1-action-circle-lab-20261023`

## 1. 調査・判断

前工程[ V3-5-20](./ENGINE_V3_5_20_MULTITARGET_SOURCE_CONFLICT_AND_RECOVERY_20261102.md) でブシニャンの「かつおブシ斬り」に **25×10 / 20×10 / 22×9**という資料不一致が残り、さらに敵前衛3体へのヒットの配分とKO後再標的化は不明だった。V3-5-21で以下を追加調査。

- [Mt. Wildwood 本家YW2・ブシニャン](https://mtwildwood.net/yw2/yokai/shogunyan)に記載されるBonito Blade 22×9は、ゲーム内の実Hit対象順/KO後の転送ルールの証拠ではない。
- [攻略大百科・ブシニャン](https://gamepedia.jp/youkai-yw2/monsters/459)、[game-cap](https://game-cap.com/youkaiwatch2/data/youkai_bushinyan.html)、[game-e](https://game-e.com/youkai-watch-2/youkai/322.php)の「敵複数/敵全」はダメージ対象の種類であり、「各敵へ10回」とは明記していない。
- 原作の**対人戦**実録候補 [ゲーム動画ともとも・「妖怪ウォッチ2 通信対戦！ブシニャン軍団！かつおブシ斬り強い！」（2014-10-24）](https://www.youtube.com/watch?v=mdS7Q0XebCU) を発見した。ただし現在の環境で映像フレーム自体は閲覧できておらず、技の打撃配分・相手HP推移/KO後対象の裏付けとは**していない**。
- [Mt. Wildwood の本家YW2クリティカルの定義](https://www.mtwildwood.net/critical-hits.php?g=yw2) は通常の技と独立した会心判定を確認できる。しかし画面上の正確な文字色や「会心」ポップアップの位置・表記が原作にどうあったかまでは本資料からは未確定。

**結論：全体多段必殺の9/10Hitを敵3体それぞれに適用するなど、根拠のない戦闘ルール追加はしない。** データ・承認済み6体を維持し、ゲームプレイ中の分かりにくい既存表示をホスト確定情報のみで改善。

## 2. 発見した本物の表示欠落

`engine/combat.mjs` の通常Hitと研究必殺Hitは **1Hitごとの `hit` / `critical` / `damage` / `hpBefore` / `hpAfter`**を既に記録していた。
`presentation/action-choreography.mjs` はその会心フラグを保持していたが、`ui/match-stage.mjs` の `visibleHit` が `critical`を落としており、`visualReactionClass` は常に通常 `mb-hit` としていた。結果、会心が判定されても画面上の数字・行動説明では区別できなかった。

## 3. 最小実装

1. `ui/match-stage.mjs`：Host確定の現在通常Hit／研究必殺Hitの `critical===true` のときだけ、`visibleHit` に `critical:true` を伝搬。`mb-action-label` とコールアウトで会心の瞬間を「クリティカル」と明示。攻撃終了後のrecoveryでは再強調しない。旧単発行動には元Host `action.critical` フォールバックを使用。
2. `ui/battle-vfx.mjs`：命中したDamageのcriticalだけ `mb-hit mb-critical` にする。MISS（批判的なフラグが紛れても）や回復・強化・状態異常には適用しない。旧単発のHost側 `critical:true` だけ任意フィールドとして伝搬。ダメージ額の大小からクリティカルを推測しない。
3. `lab/match-stage.css`：ホスト確定の会心数字を淡い金色、通常被ダメ数字は既存の赤色、回復は既存の緑色。**これは試用プレゼン色であって原作と色一致を証明したものではない。** 新しいアニメ/音声/戦闘時間変更なし。
4. `tests/v3-5-21-host-critical-hit-feedback.test.mjs`：任意の大ダメージだけでは強調されない、ホストの実行で出た会心結果を両席の `hitResults` / `SoultimateHitLedger` に維持し、偽の状態変化や攻撃数の増殖がないこと、`action-label`/CSSの接続を検証。
5. `lab/match-stage.html?review=real-attack-critical` と `tools/stage-smoke.mjs`：研究用カスタムチームのHost実3Hit／高会心確率で生まれた現実のcriticalイベントを、Chromium DOMで全Hitの数字・critical色/非会心色・説明ラベル・各HitのHP・recoveryで数字の再発なしまで確認する。**学校6体を強化するものではない**。

## 4. 実行結果と未確認

- この節を作成した時点では最新コミットのCIは実行中。コードHEADのNode、Chromium Stage、Firebase Friends 2席を順に確認し、**終了したものだけPASSと追記**する。
- 原作技の総Hit数・敵への分配・KO後の再標的化・3DS原作の正確な会心ラベル/色は未確認。
- 学校iPad Safari実機2台の試験・原作MP4フレーム直接分析はしていない。
- main、学校のGoogle Sites内の直接HTML埋め込み、Firebase Security Rules/Auth/DB、Google Drive配布は未変更。

## 5. 次工程

- **V3-5-22**：コード変更コミットのCI確認が最優先。原作対戦動画のフレームで打撃配分を確かめられたら、**現行Hostの1Hitごとの正規ルールと再現データを比較**してから設計。原作対戦のリズム・入力許可・操作感と学校iPad実機の確認も優先。
- 元ゲームで観測していない命中配分・守備判定・秒数を試作品から原作仕様へ昇格させない。根拠がない場合は十分証拠がある他の技や重要なUI不具合を優先。

**ロードマップ：V3-5継続、未完成。**
