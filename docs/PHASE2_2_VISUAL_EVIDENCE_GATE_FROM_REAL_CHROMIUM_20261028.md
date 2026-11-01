# Phase2.2へ引き継ぐ実画像QA｜動画のように遊べるゲームを最終目標とする

2026-10-28｜開発ブランチ `feat/phase1-action-circle-lab-20261023`

## 今回初めて直接開いて観察した現物
[Phase14 actual Chromium stage QA / run 40705027869](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40705027869) の`phase14-original-engine-stage-preview` アーティファクト（ZIP約2.9MB）をGitHub Actionsから実取得し、解凍。**PNG画像4枚を実際に開いて目視**した。単なるDOM要素検査・テスト成功ログとは区別する。
- `phase16-ipad-landscape-preview.png`（1024×768）
- `phase17-special-cutin-preview.png`（1024×768）
- `phase46-action-windup.png`（1024×768）
- `phase46-action-impact.png`（1024×768）
- ZIPにはそのほかキャラクター一覧・ターゲット選択・零式G準備の画像があるが、今回の直接画像比較の対象は上記4枚。

**重要**：これらは`LOCAL 2-SEAT`の**開発・研究用Chromiumステージ**の画像であり、学校Google SitesのFriendsオンライン画面・iPad Safariの本物の撮影ではない。研究ボタンやデバッグ情報が写っていても、それが友達へ配布済み画面に存在すると主張しない。本人提供の原作MP4をこの作業中に新たに目視したわけではない（原作側は過去のタイムコード付き記録を参照）。

## 目視できた実際の状態／未解決ギャップ
1. **上下の役割分担はある**：上段で前衛3vs3、下段で6体サークルと`わざ/ねらう/おはらい/アイテム`。原作動画の戦闘と同時に操作パネルが見える骨格を持つ。操作できるかどうかは別の実ジェスチャーQAで検査済み。
2. **必殺のカットインは大きな専用レイヤーとして実際に表示される**：`phase17-special-cutin-preview`では上段戦場がキャラ拡大・専用背景・技名へ変わり、下段サークルはそのまま見える。原作録画[Phase49](./PHASE49_USER_SUPPLIED_ORIGINAL_PVP_VIDEO_REVIEW_20261027.md) / [第1試合](./MATCH01_SECOND_PASS_INPUT_AND_TIMELINE_20261027.md)の基本構成へは近づいている。ただし原作のポーズ・切替タイミング・技別演出の一致までは証明していない。
3. **通常行動の『何をしたか』はまだ画面から分かりにくい**：`phase46-action-windup.png`では「とりつく！」の短い表示、`phase46-action-impact.png`では対象/結果の表示が変わるが、両画像で前衛キャラの位置・大きさ・姿勢はほぼ同じ。**吹き出し文字と微細な状態変化に依存し、動作自体の予備→効果が絵として弱い**。これは過去の本人の学校試遊「妖怪が何をしているか分からない」と整合するが、今回のChrome画像はあくまで単一局面の静止画であり動いている時間全体を撮影したわけではない。
4. **技固有の命中連続表示は未証明**：画像にはジバニャンの`ひゃくれつ肉球`相当の「1打目→2打目→…」を別時刻に表示している証拠がない。既存`engine/special-effects.mjs`は冒頭に multi-hit 未実装と明記、レンタル必殺`hitPattern`はunknown。**複数対象1回と多段攻撃を混同しない**。
5. 画面の静止画像だけでは本物のiPadでの指操作遅延・表示のカクつき・2人の相手視点保留・演出秒数は計測できない。成功したNode/Chromeと原作体験との違いを維持する。

## Phase2.2以降に要求する受入条件
- 原作動画で確かめた`技ごとの発動宣言→予備動作→カットイン→一撃/状態→戦場復帰`を、まず原作の単発・多段・全体・支援カテゴリごとに切り分ける。
- `contracts/action-outcome-v2.mjs`、`content/rental-soultimate-moves.mjs`、`engine/special-effects.mjs`、`presentation/action-choreography.mjs`、`ui/match-stage.mjs`は既存資産。統一契約を段階移行し、根拠のない必殺命中回数や数値を作らない。
- **次回の実画面レビューでは1局面のwindup/impact静止画だけでなく、同じ技の連続フレームを確認**し、キャラ移動・命中数字・状態表示が差として見えるかを試験する。動画原本が使える場合は同じ種類の技の原作フレームと比較し、改変が原作由来か試遊仮設定か明記する。
- 動画/PNGの原本を公開GitHubへ転載しない。ここには観察した文字記録とGitHub Actionsの証拠URLだけを残す。

## 位置
Phase2.1C-2の最新コードは[Node677/677](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40705027981)、[Chromium実画面](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40705027869)、[認証なしFirebase Friends](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40705028114) PASS。**今回の画像目視監査はゲーム本体を変更していない**。原作への忠実度をテスト成功だけで完成判定しない。
