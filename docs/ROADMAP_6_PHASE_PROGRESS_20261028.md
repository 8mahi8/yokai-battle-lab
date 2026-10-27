# 妖怪ウォッチ2対人再現｜6段階ロードマップ進捗の単一入口
最終更新：2026-10-28。**各開発作業の終わりに更新**。新しい担当AIはこの文書・最新引継ぎ・V2全体設計の順に確認する。
**本プロジェクトはオリジナルキャラ6体で、原作の対人戦術と体験を可能な限り忠実に再現する**。優先度はルールと操作の忠実度＞演出品質＞キャラ追加。

## 毎回の報告ルール（本人からの確定依頼）
**必ず次の3つをユーザーに報告する。**
1. **今回した作業**：何を確認/実装/テストしたか。証拠（GitHubコミット、Actions、原作動画の時刻等）と、未検証点を区別。
2. **次する作業**：次の具体的な1工程、その理由と完了判定。
3. **ロードマップの現在地**：Phase 1～6のどこ、どのサブステップ、何が未完か。「作業進捗」と「原作再現度」を混同しない。
本番Google Sites稼働HTML、GitHub main、Firebase本番Rules/DB、旧Drive配布は本人の明示依頼まで更新しない。

## ロードマップ
| Phase | 目的 | 2026-10-28時点 | 次の受け入れ条件 |
|---|---|---|---|
| **Phase 1** | **戦闘基盤の統一** | **進行中**：キャラ/技/スキル台帳V1と、既存通常攻撃→検証済みActionOutcome V2→画面演出まで接続。既存のホスト計算は未変更 | 次は正規技定義を使う物理攻撃解決器へ**段階移行**し、同seedの結果を比較。現状V2は既存ホスト結果の読み取り契約 |
| Phase 2 | 戦闘ルールを原作へ近づける | 後続（現在は一部の研究ルール・試遊値が存在） | 単発/多段/範囲、妖術、回復、とりつく、必殺、スキル、性格等をルールごと検証。元データ確度を維持 |
| Phase 3 | 行動順と戦闘の時間 | 後続（現行は待ちポイント研究＋ホスト2600ms固定） | 原作に準拠した論理行動順とモーション/操作タイミングの対応を確認 |
| Phase 4 | 操作と対人戦特有の仕組み | 後続（下画面ミニゲームとサークル等の既存実装あり） | おはらい/必殺/つつく/零式と**双方の表示保留**を原作局面で検証 |
| Phase 5 | 上下画面/アニメーション | 後続（見た目の研究版あり） | 技別カットイン・命中順・状態・HP・結果を動画と比較 |
| Phase 6 | オンライン総合/学校試遊 | 後続（Firebase Friends試遊基盤とChrome QAあり） | Firebaseホスト/ゲストの判定一致と学校Safari 2端末の操作・長試合が実証される |

**「進行中/後続」は研究や既存試作品が存在しない意味ではない**。現在の仕事の優先レーンを示す。個々の機能はPhaseをまたいで縦切り実装し、テストする。

## 今回した作業（Phase 1 / サブステップ1.2：ActionOutcome V2）
- **共通戦闘結果の契約**を`contracts/action-outcome-v2.mjs`へ独立させた。戦闘計算と描画の双方から参照でき、`presentation/`が`engine/`を直接importしない。現行のアーキテクチャ境界テストを保持。
- V2スキーマは`schema=2`、`eventId`（戦闘イベントID）、`actionId`（論理行動ID）、`actorId`、`moveId`、`actionKind='attack'`、`moveEvidence`、`outcome.hits`（命中順/会心/HP前後/実ダメージ）、`effects=[]`、`winner`を保持。
- **見えていない事実を創作しない**：原作で未確定の数値を付けず、旧戦闘エンジンが確定した`multiHit.hits`以外から新ヒットを追加しない。各ヒットの前後HP連続性、MISSの0ダメージ、総ダメージ一致、KO後に追加ヒットがないことを契約として検証。状態変化や妖気変化はこの研究版の攻撃イベントに命中別の確定情報がないため、`effects=[]`のまま（将来別途実装）。
- `presentation/legacy-attack-to-v2.mjs`は従来イベントの**非破壊変換**。整合しない内容/別キャラの試遊データなら`null`へ倒す。Firebase送信に`schema=2`の本体変更を強制しない。
- `ui/match-stage.mjs` → `ui/battle-vfx.mjs` → `presentation/action-choreography.mjs`まで**V2の不変結果を読み取り専用で渡す**。旧画面イベントと併存し、従来画面表示・集計ダメージを変えない。`scenePlan.actionOutcomeV2`とDOMの`data-outcome-schema`で自動QA可能。
- `tests/action-outcome-v2.test.mjs`を追加。MISS、KO中断、ありえないHP/偽状態の拒否、未知キャラ拒否、旧スナップとの不変性、実ホスト→実画面演出の一気通貫など**6ケース**。過去の619テストに追加。
- **実行と演出の時間はまだ独立していないヒット表示の段階**：1ヒットごとのメタデータは保存済みだが、映像上は従来の集約ヒット演出を続ける。原作ヒット間隔の秒数は未確定。
- 今回の変更は**戦闘イベントの翻訳と表示側の検証**であり、旧ホストのRNG、HP、妖気、行動順、Firebaseの通信契約、学校Google Sites版、mainを変えていない。
- **検証**：最新のResearch unit・Chromium Stage・Firebase Emulator・Google SitesビルドのGitHub Actionsリンクは下に追加し、完了後は成功/失敗を正確に記載。Chromium QAはSafari実機ではない。

## 次する作業（Phase 1 / サブステップ1.3）
**最優先は新V2結果を参照して命中ごとに見せる処理の設計と原作比較**。ただしヒット間隔や追加効果の裏付けがない箇所は再現済みとはしない。並行して、攻撃処理本体の1技を新しい共通技データで処理できるよう移行し、同一seedの従来結果と比較する。次に特殊攻撃の共通化を始める。

## 前回までの作業記録（Phase 1 / 通常攻撃の最初の縦切り）

### 実装
- 新規 `presentation/legacy-attack-outcome.mjs`：原作への裏付けのない命中を増やさず、既存ホスト`attack`イベントの`multiHit.hits[]`から**命中/会心/HP前後/ダメージの記録済み事実のみ**を抽出。現行レンタル6体の識別ID・名前・5ステータス・技威力を正規台帳と照合できた場合にだけ`moveId`を付与。カスタムチーム・データ欠落・矛盾する記録は`null`へ倒す。
- `ui/match-stage.mjs`：表示用`makeStageView`でイベントを**複製し、投影だけを追加**。オンラインの`MatchProtocol`や`game.snapshot()`は不変更。原作風の画面で`data-move-id`/`data-recorded-hits`を追跡できるが、内部技IDをユーザーに表示しない。
- `ui/battle-vfx.mjs`：従来の単発集計キューに`moveId`と順序のある`hitResults`を追加。描画演出は従来のまま。
- `presentation/action-choreography.mjs`：**既存ホストの結果のみ**を保持する表示計画メタデータ。今回はヒット別の独立アニメーションはまだ無し。
- `tests/legacy-attack-outcome.test.mjs`：2ヒット、MISS→KO途中停止、既存イベントの改変なし、カスタムチーム拒否、古いイベント互換、**実`createMatchProtocol`→`makeStageView`→`latestBattleCue`→`planActionChoreography`**の通しを確認。

### 原作との関係
- 現行レンタルの攻撃・ヒット回数は**試遊用fixture**。原作のジバニャン等の必殺ヒット数を推定・付与しない。
- 現在の正規ホストイベントの`amount`と`multiHit.hits`を再現/転写するだけ。戦闘効果処理・ホスト時間・Firebase・サークル入力は変更しない。**原作再現度が数値的に上がったと断定しない**。
- この`legacy-attack-projection-v1`はV2の正規`ActionOutcome`の代わりではなく、**V2へ段階移行するための読み取り専用アダプタ**。

### 品質・証拠
- 初版通しテストコミット`3a412a3a`： [Research unit 619/619 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40546323564) ＋ [実Chromium Stage QA SUCCESS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40546323613)。
- 最終の識別照合修正 `97a115e` まで含む[研究単体 619/619 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40546708006)・[実Chromium Stage QA成功](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40546708048)を確認した。カスタムチームの数値偽一致もテスト済み。
- Google Sitesの学校iPad 2台はこの新コードで未検証。GitHub ActionsのChromium描画QAが実Safari検証の代わりとは限らない。

## 以前の次工程（V2導入前に記した計画）
1. **ActionOutcome v2の正規スキーマを、旧ホストイベントと無矛盾なデータに絞って定義**し、通常攻撃の1ヒットを新形式にしたときも同じゲームの決定的状態・ヒット結果を保持できるテストを追加。
2. 次に通常攻撃の単発→多段で**命中ごと表示**をつなぐ。画面表示側で架空のダメージを生成しない。
3. 原作資料と実際の第1試合のタイムコードを使い、ヒット間隔・動作時間を確定できるところと未確認なところに分ける（相手視点は保留）。
4. Firebase実2ブラウザと学校Sitesビルドを再検証してから初めて配布候補とする。本人の依頼なしに学校版は差し替えない。

## 参考
- [ARCHITECTURE_V2 全体設計](./ARCHITECTURE_V2_SOURCE_FIRST_FULL_BATTLE_BLUEPRINT_20261028.md)
- [ADR-0004 技スキル台帳](./ADR_0004_MOVE_SKILL_REGISTRY_V1_20261028.md)
- [HANDOFF_LATEST](./HANDOFF_LATEST_20261027_PHASE50.md)
