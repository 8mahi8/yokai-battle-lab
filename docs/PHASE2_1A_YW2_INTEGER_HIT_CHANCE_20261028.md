# Phase 2.1A｜原作の整数命中率を本物の攻撃・妖術に適用
2026-10-28 / 開発ブランチ `feat/phase1-action-circle-lab-20261023`

## 状態と結論
**Phase2.1の最初の縦切り（2.1A）は実装・テスト完了。Phase2.1全体・Phase2全体は進行中。**
今まで `engine/hit-model.mjs::yw2HitProbability` は、原作の命中計算式自体は使っていても、**すばやさ差で生まれた小数％を切り捨てずに判定**していた。元ゲームでは、すばやさ部分を切り捨て、通常物理ではさらに命中補正後を切り捨てて整数0～99の乱数と比較する。

今回、実ホストの`engine/combat.mjs`がすでに呼び出していた`yw2HitProbability`の返す確率を修正し、**通常攻撃と攻撃妖術の既定の実戦処理に適用**した。**RNG呼出し回数・技の威力/属性・ターゲット/HP・Soul・通信/画面インターフェースを再設計していない。** 原作と不一致だった1つの処理順だけを変更。したがって特定の同seed戦闘は命中結果が変わりうるが、保存したコマンドとseedからの再実行は決定論的である。

## 原作根拠（確定/未確定の区別）
- **主根拠**： [Mt. Wildwood「Hit Chance」](https://mtwildwood.net/hit-chance.php)（YW2 game data analysis）。共通のすばやさ部分は`98+(攻撃者Speed−対象Speed)/5`を75～98の間に収める。**例：Speed85→151は84.8でも、原作の命中率は84%**。物理命中補正が掛かる場合も整数へ切り捨て。原作判定乱数は整数0～99、`roll<threshold`で成功。妖術は物理技の命中補正を受けない。
- 同資料の「84×0.4→33%」は**複数のGassy Sphereスキルの追加命中係数**の例。現在の`moveAccuracy`引数は**物理技そのものの0.5～4倍だけ**を表すため、この0.4を技固有の倍率として勝手に代入しない。今回の実用テストは`84×0.5=42`で符号を確認。**Gassy Sphere相当の複数スキル命中低下はまだ未実装で、2.1B以降の原作仕様確認へ回す。**
- [Mt. Wildwood「Damage Formulas」](https://mtwildwood.net/damage.php?g=yw2)では、通常攻撃と妖術の計算式・会心式・多段の能力値配分は既存`damage-model.mjs`へ多くが反映済み。ただし`2026-09-16`の[2台の3DS実測による日本語の式検証](https://note.com/atoato429429429/n/nfefe8749d432)は、妖術の防御係数/会心倍率等で異なる推測を記載。「原作完全一致」とは断定できないため、**今回の実装でダメージ式/属性倍率を変更していない**。
- 元の6体は**完全にオリジナルレンタルキャラ**であり、技別Power、技固有命中倍率、属性耐性は`fixture/unknown`のまま。原作妖怪の具体的な技名/数値を転用していない。

## 本人が提供した原作対戦MP4の直接観察
このターンに元`ScreenRecording_10-27-2026 21-10-49_1.mp4`（約126.83秒）を直接読み取り、**第1試合52～70秒と114～117秒のフレームを複数抽出してコンタクトシートで目視**。52～58秒に通常の対戦/技演出、59～61秒に「トホホの砲」の技固有の大きなカットイン、62～70秒に戦場＋下画面の円形サークル、114～117秒にも上画面の3体と下画面操作を確認。**1秒間隔の静止フレームだけでは命中率の母数、MISS確率、ダメージ乱数を確定できない。** 命中の整数処理は上記原作解析資料を直接の根拠とする。

動画/画像の実物はGitHubに掲載しない。本人の提供物は今後も原作挙動の**一次資料**として大切に扱い、映像で確かめられた結果と統計/内部式を意識して区別する。

## 実装したコード
- **`engine/hit-model.mjs`**：`base=Math.floor(clamp(98+(attackerSpeed-targetSpeed)/5,75,98))`、`attack probability=Math.floor(clamp(base*moveAccuracy,0,100))`、`technique probability=base`。既存`rollPercent`はそのまま（整数thresholdでは`unitRoll*100<threshold`が0～99整数の抽選と同じ）。通信で送る`hitResearch`の形式も変わらない。
- **`tests/hit-model.test.mjs`**：旧の「97.8%を保持する」テストを原作根拠「97%へ切り捨て」に修正。85 vs151の84%、物理技0.5で42%、妖術には技命中補正が載らない、低いすばやさでの75%下限、高いすばやさでの98%上限、乱数境界を追加。
- **`tests/phase2-1-original-hit-quantization.test.mjs`**（新・3テスト）：資料例・整数0～99を横断した境界テスト。通常レンタルの**実ホスト戦闘（5seed×最大95行動）**で通常物理/攻撃妖術を複数回実際に発動させ、出力の`hitResearch.base/probability`が整数かつ計算値と一致、両プレイヤーのイベント同一、ジャーナル再現（seed・入力・RNG順の再実行）を検証。
- **中間テスト失敗と修正**：一度元Wikiにある0.4の**スキル合成倍率**を技固有`moveAccuracy`引数へ誤代入したため0.5下限検証で失敗。また、ホストの行動イベント直後に隣接回復スキルのイベントがあるため、`events.at(-1)`が行動と一致するとは限らない。スキル合成は未実装と明示し、`turn/actor`で正しい行動イベントを特定するテストに修正。ゲーム側の有効入力検査やスキル判定を緩めていない。

## 最終テスト証拠
**最終ゲームコード＋テストコミット `c8360dbe4`**：
- [Research battle unit **667/667 PASS**＋通常レンタル耐久試合PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40645583960)
- [Chromium Stage 16/16＋実画面・ジェスチャー・両視点結果PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40645583976)
- 本体の原作命中率修正のみのコミット`7f51de4c3`に対し[Firebase Emulator browser QA PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40645193643)、[Google Sites 1HTML offline build PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40645193723)、[Sites online sandbox QA PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40645193559)。**最終の新コードはその後テストだけ変更**している。
- **学校Safariでの2端末対戦はまだ未確認**。Firebase Emulator browser QAの研究用匿名認証と、学校AuthなしFriendsの実機保証は区別。

## 次の仕事（Phase2.1B）
1. すでにある`damage-model.mjs`と原作解析資料を**検証対象を分けて**照合。技の威力・ヒット数・属性耐性・会心と乱数幅のうち、研究資料が一致し、実元動画/対戦条件でも検証可能な一つを選んで実装。**異なるゲーム（初代/3/バスターズ）の式を混ぜない**。
2. 特に未実装の**技固有命中率×場の複数スキル効果**は、原作のスキル組合せを確認した後、`moveAccuracy`と別にデータ/計算段階を追加する。現在のオリジナル6体のどれもそのスキルを持たないため、仮の倍率を無断で足さない。
3. 引き続き原作動画でHIT/MISS/ダメージ数字のシーンを追い、画面演出と本体計算を分けて検証。Phase2.1B→2.2必殺→2.3とりつく/スキルの順。

## ロードマップの現在地
**Phase1/6は前回完了、Phase2/6は進行中（2.1A「命中率の整数処理」完了、2.1Bは次）。** Phase3時間、Phase4操作、Phase5演出、Phase6学校実機オンラインは未完了。
