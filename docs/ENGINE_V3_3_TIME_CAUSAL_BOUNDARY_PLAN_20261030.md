# 妖怪ウォッチ2対戦｜V3-2→V3-3 時間と因果順序の設計入口（2026-10-30）

## なぜ分離するか
忠実再現の重要な部分は「いつ数値が変わるか」だけでなく、相手から**いつ見えたか／何を操作できたか／どの前衛が狙われたか**。現在のコードは下記4つの時間・因果領域がそれぞれ独立している。全処理をひとつの時刻にまとめたり、必殺カットイン中に入力を禁じたりすると既知の対人戦術を破壊する危険がある。

## 現行コードの領域と既存の契約
1. **論理行動順（`engine/phase1.mjs`、`action-timeline-core.mjs`）**：Speed/初手wait/action costから、誰がいつ自動行動するかを決める。整数の待機ポイントが一次状態。これは現実のミリ秒ではない。根拠：[Mt. Wildwood YW2 Turn Order](https://mtwildwood.net/turn-order.php?g=yw2) では初手乱数、速度に基づく行動後wait、ほとんどの技のaction wait3、切り替え等のsystem action0が記載されている。オリジナル表は明示的にYW2部分を採用し、ゲーム1/3の行動ポイントと混同しない。
2. **効果の正規確定（`combat.mjs`、`effect-commit.mjs`、`hit-aftermath.mjs`、`knockout-lifecycle.mjs`、`skill-hook-pipeline.mjs`）**：直撃HPの前にLast Stand、各hitの後でチャージ割り込み、KO/ピン/撃破スキル。原因別`ordinary/special/poke`のKO順を`KO_CAUSE_POLICY`で明記。**現在の順序は研究用fixture**、原作のフレーム順の検証完了ではない。
3. **行動終了効果（`combat.mjs/step`、`owner-turn-effect-lifecycle.mjs`、`action-soul-accrual.mjs`）**：実装上は①通常行動内のHP変化→②owner HP継続効果→③action event→④Care/既存momentumのtick→⑤turn-inspirit event・view record→⑥行動妖気回収→⑦状態duration tick。持続効果がKOに関与する順、回復の直後に勝敗確定となる条件は原作未証明。勝手に順序を変えず、次工程では発火順の受入テストを用意する。
4. **相手への可視化とカットイン（`presentation-timeline.mjs`、`counter-window.mjs`、`wheel-coalescing.mjs`、`presentation/action-choreography.mjs`）**：論理入力を受理しても、相手のモーション中は見えないことがある。カットイン中のチャージ、前衛の視認/ロック時点、回転の繰り返しを別の表示時間で処理。**現状のmsは調整用fixture**。入力受理・効果確定・相手視点の公開を同時イベントと見なさない。

## 原作資料との対応
- [たくトンボ｜妖怪ウォッチ2 対戦の基礎テクニック](https://note.com/tombow_yw/n/n1e4cf179d2d9)：モーション中の回転/チャージが相手画面にはモーション終了時に初めて見える（ノーモーション）、カウンター必殺のターゲット判定はカットイン中完了かどうかで差異、未完了なら終了後約0.5秒という**プレイヤー観察報告**。内部フレーム値やホストのサーバー権威を証明する解析資料ではない。
- [Mt. Wildwood YW2 Turn Order](https://mtwildwood.net/turn-order.php?g=yw2)：速度・初手wait・行動waitのモデル。**行動ポイントと画面上のアニメーション秒数は別の軸**。
- [ゲームの匠：妖怪ウォッチ2スキル一覧](https://youkai-gh.g-takumi.com/skill_list.php)：`まえのめり`などスキルの発火条件・類型。KOスキルとピン・状態更新のミリ秒順までは裏付けない。
- 本人提供対戦動画の生ファイルの今回直接閲覧はできていない。実フレーム比較に必要な原本・timestampを憶測で埋めない。

## V3-3に入る前の必須テスト
- **同seed同操作の旧新完全集合**：hostの`snapshot`、`events`、両teamのSoul、状態、KO数と`match-protocol`の再生結果を比較。V3-2で実施した96ケースは効果単位だけであり、この検査の代用ではない。
- **入力が受理された時刻と画面へ現れた時刻を区別**：同じhostコマンド列を与え、presentation motionあり/なしで見えるイベントだけ変わり、HP/Soul/真の行動履歴が変わらないこと。
- **cut-in + 1/2/3回転**：1/2回の原作参考範囲は反映し、3回以上とcut-in前衛の変化は不明なら`counter-hit-indeterminate`としてHP未確定。誤って原作確定と称して攻撃しないこと。
- **時間単位の型を明示**：論理waitポイントと実画面msの変換は原作資料なしに定数式で直接結びつけない。V3-3ではこの境界を型/イベント層で固定し、仕様が検証できるまで現行研究設定を温存する。
- **テスト環境**：Node、自然6vs6、実Chromium、Firebase Friends no-Auth RTDB Emulatorの二席、学校iPad Safari2台とGoogle Sites埋め込み。学校はユーザーの明示許可なしで公開/本番変更しない。

## 決定
**V3-2を完成扱いせず、公式CIでKO原因ポリシーの無変化を確認したあとV3-3の「論理順／状態確定／表示公開」3時間面の統合契約テストから開始する。** 原作未確定のms/対象ロックをデータ駆動で仮定しない。現在のmain、学校サイト、本番Firebase、Driveは無変更。
