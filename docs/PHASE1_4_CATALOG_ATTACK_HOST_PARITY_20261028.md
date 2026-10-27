# Phase 1.4｜共通技データをホスト物理攻撃に接続（2026-10-28）

**状態：実装と検証済み（開発ブランチ）。本番稼働のGoogle Sites版・main・Firebase Rules/DBは未変更。**

## ゴールと根拠
Phase1.1～1.3では、戦闘結果を表示用にV2へ変換していたが、攻撃威力とヒット回数の実際の計算は旧`actor.attackPower`/`actor.attackHits`から読み込んでいた。このため、技の共通定義を編集するだけでホスト結果を変える基盤にはなっていなかった。

今回、**通常のオリジナルレンタル6体の「こうげき」だけ**を対象に、`content/combat-catalog.mjs`の`move.power`と`move.hitPattern.count`を、既存の`engine/combat.mjs`の**本物の攻撃解決ループ**へ接続した。多段かどうかは技固有データに従う。連続ヒットがすべての必殺技に共通するという意味ではない。

### 照合した外部資料
- [Mt. Wildwood：YW2 ステータス/技別例](https://mtwildwood.net/yw2/yokai/statiking) — 原作2では通常攻撃でも多段/単発が技により違う。技PowerとHit数はキャラ単位で固定すべき数値ではない。**原作キャラの技威力をオリジナル6体へ勝手に移植しない**。
- [Mt. Wildwood：ダメージ式と多段ダメージ](https://www.mtwildwood.net/damage.php?g=yw1) — YW2タブの「1 hit」と威力・ヒット数の説明を別バージョンと混同せず解釈する。**このPhaseではダメージ公式に手を入れない**。
- [Game Programming Patterns：Type Object](https://gameprogrammingpatterns.com/type-object.html) — キャラが固定のクラス群を持つより、共有のタイプ/技定義を参照する設計。**実行ルールとデータの混同を避け、旧式との互換アダプタを段階移行**。
- [第1試合本人提供動画の一次観察記録](./MATCH01_SECOND_PASS_INPUT_AND_TIMELINE_20261027.md)：ひゃくれつ肉球00:44–00:52、01:29–01:35での固有の多段表示。**今回、MP4原本を新たに直接閲覧したとは言わない**。第2～第4試合の実フレームも未確認。原作の正確な攻撃回数/時間を推測しない。

## 実コードの変更
1. **新規`engine/catalog-attack-spec.mjs`**：固定レンタルの表示名・5能力・技威力・攻撃回数・スキルIDと共通台帳の`moveId`を**対戦開始時に照合**。1件でも不一致なら誤ID/仮の効果へ静かにすり替えずエラーとする。利用できる技スペックは**読み取り専用**（`moveId`, `power`, `hits`, `evidence:'fixture'`）。
2. `engine/combat.mjs`：`catalogAttackResolution`ブールフラグ追加。通常レンタル6体のみ対応、任意`teams`を指定したカスタム編成と併用禁止。実ホストの通常物理攻撃ループで`attackSpec.power`、`attackSpec.hits`を使い、元の`calculateOneHit`／レガシー`baseDamage`と同一RNG/命中/会心/守り/クリティカル/KO/中断/妖気式は**そのまま再利用**。
3. `engine/match-protocol.mjs`：旧・新比較用のホスト初期オプション`catalogAttackResolution`を許可。**通常の組込み6体では開発版の既定true**、独自`teams`指定では既定false。テストでは明示true/falseを指定して旧/新を比較できる。クライアント送信コマンドからの切替は依然拒否。ジャーナルの初期設定にも記録し、同設定で再演算できる。
4. **まだやらないこと**：必殺・妖術・とりつく・スキルの解決器への移行、原作数値への調整、正式な動作時間、追加キャラや装備選択、Firebase認証/Rules変更。新しいゲーム内操作はない。

### このPhaseでデータ二重管理をすべて消したわけではない
現行`content/rental-roster.mjs`には互換の`attackPower/attackHits`が残る。Phase1.4では**それらと新共通データの値の一致を検証した上で、実計算のpower/hitsは台帳から取得する**。今後はキャラが技IDだけを参照し、旧固定威力のフィールドを段階廃止する。ただし原作からまだ確認できていない6体の値は`fixture`であり、これを原作確定値として扱わない。

## 自動・ブラウザ検証
新規 `tests/catalog-attack-host-parity.test.mjs`：
- 6体×学校/研究の技ID、威力、ヒット数、凍結、証拠レベル`fixture`を検査。攻撃威力やステータスだけ違う同名カスタムキャラへ技IDを誤対応させない。
- 複数シード×学校・研究の**ホスト実試合の通常攻撃と戦闘状態をフレーム順に比較**。`catalogAttackResolution:false`（従来）と`true`（台帳から読み取り）で`advanceAuto`受領結果/イベント/HP/KO/パーティスナップショットが一致する。
- 旧ダメージ計算モードでも一致することを確認。
- 組込レンタルの既定true、カスタム編成の既定falseと、ゲストからの無効な切替コマンド拒否を確認。
- **最終コード`8f2dafebf`**： [研究単体 **633/633 PASS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40552398719)、[実Chromium Stage QA **PASS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40552398778)。この段階はiPad Safariでの二台試遊ではない。
- **組込レンタルでカタログを既定使用するコード`02fcf4f81`**について、[Firebase Emulator Chromium 2ブラウザQA成功](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40552356140)、[オンラインSites用ビルド/Emulator QA成功](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40552356497)も確認。これらは最後の`8f2dafebf`の**テストだけを追加する前のコード**だが、適用されるゲーム本体の挙動は同じ。**Firebase QAは旧匿名認証研究経路のため、学校AuthなしFriends実機2台の証明とは区別する**。
- 旧Supabase二iframeの長時間QAで一度「host snapshot publish timeout」による失敗があった。同一路線の異なる試行では成功も観測されている。学校向けFirebase Friendsの再現保証とも、今回のカタログ攻撃による新バグ確定ともみなさない。
- **途中の失敗を記録**：当初、局所スコープ内だけで宣言した`attackPower`が行動イベントのメタ情報で参照され、攻撃以外でReferenceErrorが多数発生。`attackPower`を行動分岐より前へ移し、研究単体633/633合格を再確認。テストを緩めず修正。

## 次する作業（Phase 1.5）
**キャラの技参照を正規化**：今の「キャラオブジェクト内へ4技の全定義を複製」する構造から、**共有moveId→共通技マスターの辞書**に段階的に移す。最低1体の通常攻撃でキャラ定義から古い`attackPower`を参照しなくても、同一結果を出せることを示す。その後に妖術・とりつく・必殺へ1カテゴリずつ拡張。新しい原作数値の調査・動画の観察はPhase2以降も継続。

### ロードマップ位置
**Phase 1/6：戦闘基盤の統一 / 1.4 通常物理のホスト本計算への接続完了。** Phase2原作ルール再現・Phase3時間・Phase4対人操作/相手視点・Phase5技別カットイン・Phase6学校実機の各段階は未完了。**原作忠実度が今回だけで向上したという証拠ではなく、原作へ合わせやすい構造になったという成果**。
