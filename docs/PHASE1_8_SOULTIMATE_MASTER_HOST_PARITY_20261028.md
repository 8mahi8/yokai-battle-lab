# Phase 1.8｜必殺技の共通データ化と実ホスト処理への接続
2026-10-28 / 開発ブランチ `feat/phase1-action-circle-lab-20261023`

## 状態
**Phase 1.8 実装・自動検証完了。** オリジナルレンタル6体の必殺技をキャラ別の旧`special`直書きから分離し、必殺効果を共通データマスターから読み込んで既存のホスト解決器に渡す。原作の対戦ルールへ合わせる準備であり、原作の必殺威力・打数の完全再現という意味ではない。

## 原作の調査と本人録画
- [Mt. Wildwood YW2技データ一覧](https://mtwildwood.net/yw2/moves)：Soultimate/Attack/Technique/Inspirit等の技種別、威力とヒット数は技ごとに定義され、詳細は未確定の値を区別している。
- [攻略大百科 妖怪ウォッチ2 必殺技一覧](https://gamepedia.jp/youkai-yw2/specials)：例えば`155×1 敵一体`と`20×7 敵複数`の双方が載る。この証拠から **targetScope（敵一体/敵前衛/味方前衛/味方全体）とhitPattern（1回/複数回/攻撃命中のない技/unknown）は独立**とする。対象人数をヒット回数と見なさない。
- [本人が送った原作録画の第1試合観察記録](./MATCH01_SECOND_PASS_INPUT_AND_TIMELINE_20261027.md)：ひゃくれつ肉球に連続する複数のヒット演出、ほかの必殺には別カットイン。正確な1発あたりの秒数・打数はこの観察だけでは確定しない。
- [原作録画第2～4試合の直接部分レビュー](./PHASE1_6_TECHNIQUE_CATALOG_AND_ORIGINAL_VIDEO_REVIEW_20261028.md)：元MP4のフレームに大ガマ変化の術・氷結地獄などの技カットインやサークル・状態表示を確認。今回もローカルの第2試合サンプル・コンタクトシートの**実画像を再確認**した。ただし特定シーンの前後全フレームを計測しておらず、これらを本ゲームの攻撃数や威力の確定資料として採用していない。
- [Game Programming Patterns: Type Object](https://gameprogrammingpatterns.com/type-object.html)：キャラごとの専用クラス/効果記述を増やさず、同一技IDの定義を共有する。既存効果解決器を維持した段階移行を行う。

## 6つのレンタルSoultimate / すべてplaytest fixture
| Rental | Effect | Scope | Power | Hits |
|---|---|---|---:|---|
| あかねこ | 通常ダメージ | 敵前衛 | 100 | **unknown** |
| こもれび | HP吸収→味方回復 | 敵前衛 | 80 | **unknown** |
| いしもり | ちからアップ（level2） | 味方前衛 | なし | 攻撃ヒットなし |
| すずかぜ | 単体ダメージ＋ようりょくダウン（level2） | 敵1体 | 145 | **unknown** |
| ほたる | 全味方の回復＋KO蘇生 | 味方全6体 | 85 | 攻撃ヒットなし |
| くろがね | まもりダウン（level2） | 敵前衛 | なし | 攻撃ヒットなし |

**「unknown」は攻撃回数が1である、ゼロである、無数であるのいずれも意味しない。** 現在の`engine/special-effects.mjs`は攻撃対象ごとに**単一の研究用集計impact**を生成する。命中処理の正式な繰り返しではない。`heal`／`buff`／`debuff`／`revive-heal`等の`none,0`は「攻撃判定のヒット列を持たない」の意味であり、技の発動回数ではない。

## 実装したコード
1. 新規`content/rental-soultimate-moves.mjs`を6つの必殺技効果の**唯一の著者ソース**にした。旧の`special`の必要パラメータ、対象`targetScope`、命中`hitPattern`、`evidence:'fixture'`を区別して凍結。
2. `content/rental-roster.mjs`内の5つの重複`special:{...}`直書きを除去し、共通マスターから**互換用の旧`special`**を生成。1番目は従来と同じ**暗黙の既定ダメージ必殺**を維持する。
3. `content/rental-move-master.mjs`の必殺技`category/power/targetScope/statusEffect/hitPattern`も共通マスターからコンパイルし、既存6体×4技=24技のAPIを壊さない。
4. 新規`engine/catalog-soultimate-spec.mjs`は名前・5能力・スキルID・技ID・技種別・対象・威力・追加効果・未確定命中パターンと、従来の`validateSpecialSpec`に渡る内容の一致を検証し、矛盾時は起動を拒否。カスタムキャラへ誤IDを付けない。
5. `engine/combat.mjs`は新しい`catalogSoultimateResolution`研究フラグで、実`applyResearchSpecial`に渡す効果定義を共通技から取得する。**対象選択、攻撃/回復/蘇生の実計算、状態耐性RNG、Soul消費、G倍率、KO、Cut-in判定、オンライン通信は従来のコードを維持**。
6. `engine/match-protocol.mjs`：通常組込みレンタル6体では既定true、カスタム`teams`が明示される場合はfalse。ゲストはコマンドで切り替え不可。`main`/学校Google Sites公開版/本番Firebase Rules/DBは変更していない。

## 自動テスト／証拠
新規`tests/phase1-8-soultimate-catalog-host-parity.test.mjs`：
- 全6必殺の型・対象・Power・状態変化・未知のヒット数・凍結・旧`special`との互換一致を検証。
- カスタム改竄・旧／新モード切替を検証。
- 実ホストでソウル満タン→必殺準備→効果発動の**6効果全種（G・状態変化を含む土台）**を、旧／新の同シードで結果・HP・状態・イベント・勝敗まで比較。
- さらに通常戦闘の自動行動も複数シードで比較。
- 初回654中1件失敗：`damage-status`の状態異常を適用するため既存研究の`researchStatInspirits/researchDamageModel`が必要。**テスト用研究オプションだけ明示追加**して最終654/654合格。ゲーム本体の`applyInspirit`制限は一切緩めていない。

[最終実装＋テスト`5b97f84e5`のResearch Unit **654/654 PASS／耐久試合PASS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40603028705)。
[実Chromium Stage／ジェスチャー／両側勝敗表示 **PASS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40603028781)。
同一ゲームコードの[Firebase Emulator Browser QA](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40602770622)および[Sites online/offline builds](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40602770702)は成功。ただし学校SafariのAuth無しFriends実機2台での最新版対戦にはまだ本人テストがない。

## 未完了／次の仕事
- **Phase1.9**：スキルの`PLAYTEST_SKILL_CATALOG`を実際のホスト発火フックへ段階接続。通常攻撃・必殺技とスキルの発動の優先順位を一元化し、ホストの結果とクライアントへの演出を分ける。1技能を縦切りで移し、同シード比較する。
- 必殺技の正式な多段/単発・各ヒットの命中/会心・対象変更の仕様はPhase2で**原作動画をフレーム単位で再調査したあと**にのみ実装する。特に対象数を攻撃回数と勘違いしてはいけない。
- 原作忠実度の改善はここからが本格。**Phase1.8は「原作を適切なデータ構造で再現できる基礎」の完成であり、必殺技の原作挙動を完全実装したという評価ではない。**

現在地：**6段階ロードマップのPhase 1 戦闘基盤統一 / 1.8完了、次1.9。**
