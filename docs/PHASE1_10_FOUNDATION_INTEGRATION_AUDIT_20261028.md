# Phase 1.10｜戦闘基盤統合監査・原作ルール再現（Phase 2）移行判定
更新日：2026-10-28 / 開発ブランチ：feat/phase1-action-circle-lab-20261023

## 判定
**Phase 1.10 完了。Phase 2（原作対人ルールの忠実化）への研究・実装着手を許可。**
これは**ソフトウェアの基盤移行と既存ゲームとの決定論的一致が検証された**という判定。原作への完全一致、オンライン学校Safari実機2台の対戦保証、すべてのActionOutcome正規化完了を意味しない。Google Sites稼働版、main、本番Firebase/Rules、Drive配布には**変更なし**。

## 実コード監査と修正
### 経路A｜静的データ・参照の出所
```text
rental-character-move-refs (6体のID×4技＋skillId)
    → rental-move-master (技本体 24)
       ← rental-attack-moves
       ← rental-technique-moves
       ← rental-inspirit-moves / inspirit-effect-master
       ← rental-soultimate-moves
    → rental-yokai-definitions (school / labの性格を反映)
    → combat-catalog (4技＋固有スキル一意照合)
    → catalog-{attack,technique,inspirit,soultimate,skill}-spec
    → combat.mjs の既存の本物の効果解決フック
```
- 6体×4技・スキル6件のIDはカタログ内で重複なし。すべて`evidence:'fixture'`。原作で裏付けられていない数値を`documented/observed`に昇格させない。
- 既存`rental-roster.mjs`の旧API形式は互換生成が残る。**「通常物理/妖術/とりつく/必殺/スキルのフックはデータ駆動」でも「原作計算式は完成」ではない**。
- カスタム編成のID誤対応を防ぐため、組込レンタルだけで正規カタログフラグを既定ON、明示`teams`はOFFにしている。

### 経路B｜ホスト戦闘・イベント・表示
```text
MatchProtocol (入力seq / ACK / host唯一の権威)
    → Combat (seed/RNG/Wait/HP/Soul/status/KO/勝敗)
    → snapshot(game.events + eventId + 正規状態)
    → makeStageView(両視点・表示専用、正規状態に書かない)
    → 通常物理に限る legacy-attack-projection → ActionOutcome V2
    → battle-vfx / choreographyFrame → 数字・臨時HP・画面演出
```
- `contracts/action-outcome-v2.mjs`は**現在`actionKind:'attack'`の記録済み命中専用**。必殺・回復・とりつく・スキル発火を嘘の`hits[]`へ変換しない。特殊技は旧確定`impacts`、スキルは独立した`type:'skill'`の正式イベントを保持。
- 同seedの通常攻撃ヒット列→両視点表示→演出計画→戦闘状態の不変性を新テストで通して検証。HOST/Guestの各表示は同じ`events`を読むが、自分の時計と操作は別。表示タイミングからHPを再計算しない。
- Phase1.3の命中別表示間隔は**既存impact枠の仮等分**。本家動画から得た1ヒット秒数ではない。Phase3・5までに研究が必要。
- 通信の`clientSeq`/revision/ACKと対戦中の行動`actionId`/確定`eventId`を混同しない。旧supabase版と学校Firebase Friends版は**別経路**であり片方の合格をもう片方の認証仕様の証明に使わない。

### 発見した実装問題と修正（Phase 1.10）
- 問題：`engine/combat.mjs → applyResearchSpecial()`で、`planResearchSpecial`へは**共通台帳から取得した必殺の効果定義**を渡していた一方、蘇生/全回復のためにKO後衛を含めるかどうかは**旧`caster.special.kind`**を見て決めていた。現在の同一fixtureでは結果一致するが、技定義が将来変化した時、旧と新で選択対象が不整合になる。
- 修正：`engine/special-effects.mjs`に読み取り専用`researchSpecialAllies(resolvedSpec, wholeTeam, livingFront)`を追加。`combat.mjs`で一度確定した**同じ`resolvedSpec`を効果計算にも対象選択にも使う**。元のホスト効果式、HP変化、クリティカル/耐性RNG、勝敗、入力仕様は変更しない。
- 新テスト：わざと`caster.special`を別の古い技へ偽装し、新しく確定した`revive-heal`なら**KOした後衛（例A5）を含める**一方、通常の前衛技なら含めないことを検査。この修正は先行`sourceOfTruth`の意図を実コードへ完遂するもの。

## 自動検証／ビルド
- 実装+新テストコード`c0373b91c8`：**[Research Unit 664/664 PASS + 6体耐久試合 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40642251110)**。
- **[本物のChromium Stage／Gesture／両側Result QA PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40642251099)**。
- 修正した同ゲーム本体コード`a6ebc72781`時点で[Firebase Emulator browser QA成功](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40642200382)、[Google Sites offline build QA成功](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40642200340)、[Sites build QA成功](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40642200314)。今回その後に追加されたのは統合テストなので、ゲームの戦闘/描画/通信実装は同じ。
- **最終のテスト厳格化・資料更新後の再検証**：[Research Unit 664/664 + 耐久/ブラウザスモーク全SUCCESS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40642761285)、[Chromium Stage/Gesture/Result全SUCCESS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40642761274)。実スキル発火も通し試合で必須確認した。ゲームのホスト本体は先の`a6ebc727`から変更なし。
- **注意**：Firebase Emulator browser QAは匿名認証の研究シナリオを含み、学校の**AuthなしFriends実機2台接続の合格を意味しない**。iPad Safariの実機検証は未実施。またCIが生成した実画面PNG自体の目視レビューを今回行ったとは主張しない。
- **独立した既知の失敗**：過去の[Supabaseを使う1.5秒ペースの60行動長試合QA](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40642200385)は`PACED-MATCH-WAIT`となりFAIL。旧Supabase系の試験であり、学校のFirebase Friendsとは別の通信実装。今回のPhase1台帳修正で解消したと断言しない。Phase6のオンライン統合時にはFirebase Friendsを実2ブラウザ・学校Safari実機で独立に確認する。

## ユーザー提供原作対戦録画の一次資料再確認
**元MP4を直接読み、実フレームを抽出して確認した。** 以前のレポートを転載しただけではない。
- ファイル：`ScreenRecording_10-27-2026 21-10-49_1(2).mp4`の**約90秒**の実フレームで、上画面に「ザ・無表情」という**技名付きの大きな専用カットイン**、下画面に小さなサークルUIを確認。**これが技の全モーション長を示すわけではない**。
- ファイル：`ScreenRecording_10-27-2026 21-10-49_1(3).mp4`の**約90秒**の実フレームで、上画面の対象3体・複数のダメージ数字（例：82、91）・状態変化を示す文字とマーク、下画面の操作表示を確認。**1発の攻撃が何回当たったかを1フレームから断言しない**。
- ファイル：`ScreenRecording_10-27-2026 21-10-49_1(5).mp4`の**約110秒**の実フレームで、上画面に「敵が 行動しなくなる」という効果文・紫色の演出があり、下画面には円形の操作UIが表示されている。**発生率・持続時間・画面反映時間の根拠にはならない**。
- 第1試合の[過去の詳細観察](./MATCH01_SECOND_PASS_INPUT_AND_TIMELINE_20261027.md)（00:44–00:52ひゃくれつ肉球等）も引き続き一次資料として保持。
- 原本の録画・画像をGitHubへ公開しない。今回は**3つの瞬間をピンポイントに直接目視**した。録画の全編を見たとは書かない。

## 外部情報の確認
- [妖怪ウォッチ2 対戦の動き・モーションの相手視点保留（たくトンボ）](https://note.com/tombow_yw/n/n1e4cf179d2d9)：サークルの相手視点反映が技モーション終わりまで保留され得る。これが**ノーモーション必殺**へつながる。ブラウザの通信ラグと同一視せず、Phase3/4でペアの表示投影を分離する。
- [妖怪ウォッチ2 基本バトル（ゲームエイト）](https://game8.jp/youkai-watch2/505163)：前衛/後衛、4種のパワーチャージ、おはらい、サークル、ピン。今の仮のタッチ仕様を原作の実シーンと比較する入口。
- [Game Programming Patterns — Type Object](https://gameprogrammingpatterns.com/type-object.html)、[Event Queue](https://gameprogrammingpatterns.com/event-queue.html)：カタログと効果解決器の分離、戦闘真実と表示をイベントとして分離。新たな巨大ECSやReact改築は必要ない。

## Phase2への引継ぎ優先順位（原作一致を受け入れ条件に）
1. **2.1 通常技・妖術・対象/命中/ダメージ**：原作の技別Power・ヒット数・属性/クリティカルの研究証拠を技マスターへ反映。`fixture`から`documented`への昇格は出典付きの数値だけ。少なくとも1技の旧/新原作比較を動画と式で成立させる。
2. **2.2 必殺技**：対象複数と同一敵への多段ヒット、Gわざ、状態/回復/蘇生・KOとの相互作用を**元動画の実フレーム系列**に照らす。複数対象を連続ヒット数と取り違えない。技ごとの独立解決履歴をホストに保存する必要がある。
3. **2.3 とりつく・スキル・能力変化**：上昇/減少倍率・発動順・発動できる局面・持続/おはらいの根拠を収集。時刻表示やアニメーションの長さとは独立に正規状態を更新する。
4. **2.4 進行の検証**：原作に近い入力/状態条件で勝敗、状態/妖気、前衛/後衛の操作が壊れないことをシード試験とChrome画面、Firebase emulatorで証明。

ただしPhase3（行動待ちポイント・相手画面のモーション保留）、Phase4（操作の仕様と深い対人テク）、Phase5（カットイン/外観比較）、Phase6（学校2台試遊）も引き続きロードマップの後段。Phase2では**原作研究から実装→差分比較→証拠更新の縦切り**で進める。原作に根拠のない便利機能、匿名認証、復旧UIなどは加えない。

## 今回/次/現在地
- **今回**：全レーンのデータ→ホスト→V2通常攻撃→表示の監査、必殺蘇生対象選択の旧データ二重参照修正、4つの統合テスト、元MP4から3つの原作フレームを直接見てギャップ管理、既存ルール/画面テスト緑。
- **次**：Phase2.1の最初の**具体的な原作技・命中/効果1件**を一次映像と文献で確定し、ホストの結果・表示へ実装・回帰試験。安全な優先候補は「単発物理/妖術の威力・命中ロール」を証拠付きで正確化すること。数値の裏付け不足なら違う確証がある技から開始。
- **現在地**：**6段階ロードマップ Phase1/6「戦闘基盤統一」完了（1.10監査成功）。次はPhase2/6「原作ルールの忠実化」へ着手。**
