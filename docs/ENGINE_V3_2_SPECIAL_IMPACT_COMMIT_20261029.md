# 妖怪ウォッチ2対戦 Engine V3-2｜必殺Effectの正規HP Commit移行（2026-10-29）

## ねらいと原作根拠の境界

V3-2の次工程として、すでに作成済みの複合必殺`SoultimateEffectPlan`を**実際のHostの効果確定**へ接続する。原作で存在する効果の類型（攻撃、吸収回復、蘇生＋回復、追加状態）と、現在ゲームが使っている**Playtest仮値**を区別する。

原作外部資料：
- [Mt. Wildwood｜Yo-kai Watch 2 Statiking](https://www.mtwildwood.net/yw2/yokai/statiking)：「吸収ダメージを味方に分配」型と、多段攻撃の存在を確認できる。実際のレンタル6体の威力やHit数に転記しない。
- [Mt. Wildwood｜Yo-kai Watch 2 Elder Bloom](https://mtwildwood.net/yw2/yokai/elder-bloom)：「蘇生＋回復」型を確認できる。こちらも現在の仮レンタル`revive-heal`が原作で何％かの証明ではない。

**この段階では元の本人提供動画の生MP4は直接視聴できていない**。未知の必殺hit数、割り込み時刻、ダメージ式、状態の倍率・適用順は仮説のまま保存する。

## 今回の実装

### 新規：`engine/special-impact-commit.mjs`

- `assertPlannedSpecialImpact(plan,impact,{casterSide,target})`：計画済みの**技カテゴリ→effect stage→impact kind**を検証。対象IDと味方/敵の向きを照合。buff/debuff/damage-statusでは状態名・正負・Lvを検証。drain回復には`linkedDrain`、蘇生＋回復には`linkedReviveHeal`を要求。不正値を**HP変更やRNG消費の前**に拒否。
- `commitPlannedSpecialHp({plan,impact,target,casterSide,effects})`：計算済みダメージ/回復だけを**唯一の既存`EffectCommitter`**へ渡す。`damage / drain / damage-status` は`commitDamage`、`heal / revive` は`commitHeal`。status-onlyはHPを書き込めない。新しいHP式・ランダム処理・独立した蘇生用HP変更は作らない。

### 変更：`engine/combat.mjs`

- 原作未確定の時間・乱数・行動選択・ターゲット計算・Gパワー倍率は旧ホストが実行。
- 必殺impact列生成後、**実際に1件でも確定する前に全impactを検証**する。誤ったtarget/status/linked種別/HP量が混ざれば不正試合を進めない。
- 標準レンタル6体の必殺の`damage/heal/revive`の実HP確定を`commitPlannedSpecialHp`へ通す。該当impactのAmount/HP/Last Stand再計算、Interrupt、KO、追加状態、Soul、イベント書式は**従来の関数・順序を保持**する。
- **カスタム編成**、原作資料に基づく研究限定special、仮多Hit研究の既存分岐は旧処理を維持。status-onlyの結果も既存の`applyInspirit`が実際に確定する。今回新しいstatus apply順は決めない。

### 新規：`tests/special-impact-commit-v3.test.mjs`

- 全6必殺のHP/Status候補8類型の事前検証（攻撃、吸収攻撃、吸収後回復、強化、攻撃＋悪状態、味方蘇生、通常回復、弱体）。
- 実`EffectCommitter`を利用したダメージ→回復→復活の**各一回だけのHP Commit**の確認。
- ターゲットID・敵味方・状態名・不正Lv・不正HP・linked効果不在などを拒否し、失敗後もHP・Commit回数が不変。
- 既存`tests/soultimate-effect-plan-v3.test.mjs`で**標準6必殺の実発動と旧編成の結果・完全snapshot/event比較**を継続。

## 検証・残課題

- 変更前の基準HEAD `ffaa93a8` でNode+Chromium Stage PASS。
- 実コミット`c2e53863`（Hostへ新Commit接続）の[Node全件PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40872213185)、[Chromium Stage PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40872213076)、[Firebase Friends no-Auth RTDB二画面PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40872213138)、[Google Sites単体HTML build PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40872213206)。
- `8e6b7e0`で実行前の全impact HP妥当性検証を追加。`18d17e0`で不正effectsの回帰テストを追加。**最新SHAの正式Node実行は対象CIを見てから確定報告する**。
- まだ未移行：必殺の状態確定をStage dispatcherまで引き上げること、各hitと中断/生存/KO順序統合、DoTとターン終端効果、Soul/poke/purifyの全共通Effect化。現在の順序は原作の忠実な再現とは言い切れない。
- 最終受入：Node全件/耐久/Chromium/Firebase二画面/単体HTML/学校Safari実機。**学校実機最新版は未試験**。

**現在：V3-2の正規HP Commit境界は移行済み（status部分は旧ホスト）**。V3-3は原作行動順・妖気・相手表示時刻、V3-4はキャラ追加汎用化、V3-5は学校実機。
**公開main・学校Google Sites・本番RTDB Rules/DB・Driveには触らない。ユーザー操作不要。**
