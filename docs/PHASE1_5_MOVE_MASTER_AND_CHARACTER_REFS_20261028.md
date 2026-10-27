# Phase 1.5｜キャラは技ID、技情報は共通マスターへ（2026-10-28）

**状態：実装・単体自動テスト済み。開発ブランチのみ。学校Google Sites稼働版、main、Firebase本番Rules・DB、Drive配布には変更なし。**

## なぜこの変更が必要か
Phase1.4ではホスト通常攻撃が`content/combat-catalog.mjs`を参照していたが、
- `content/rental-roster.mjs`のキャラ定義に攻撃Powerが直接書かれていた
- `content/rental-yokai-definitions.mjs`でも4技の効果と威力を構築していた
- `createCombatCatalog()`がインラインの技定義を持つ「キャラ」を受け取る形だった
という**技の管理場所が分散している構造**が残っていた。

外部研究：
- [Mt. Wildwood: YKW2 Moves](https://mtwildwood.net/yw2/moves) には、47種類の物理攻撃や技・妖術・とりつき等の共通技が一覧化され、「Batter」「Beat」のように**同じ技を複数妖怪が所持し得る**ことと、技固有のPower/ヒット数を確認できる。ここから**キャラは技IDを参照する、威力/回数は技の共通定義側へ置く**設計が妥当と判断。あくまで本作のオリジナル6体の威力はfixtureのまま。
- [Game Programming Patterns: Type Object](https://gameprogrammingpatterns.com/type-object.html) には、キャラ等の実体に種類の共有設定を重複させず参照する設計が説明される。全てに高機能なDSL・ECSを導入する必要はない。
- [本人提供の原作1試合目動画観察記録](./MATCH01_SECOND_PASS_INPUT_AND_TIMELINE_20261027.md)：多段必殺の連続表示や別技との違いを最重要の一次資料として保持。ただし今回の実装は**データ構造の整理**であり、原作の新しい威力・命中数や表示時間の確定はない。元動画MP4は今回新たに直接再生できず、第2～4試合の実フレームは未確認。

## 新しいデータの境界
```text
content/rental-attack-moves.mjs  <- 物理Power/HitCount の唯一の書込み先
         │
         ├── rental-roster.mjs         : 旧 combat 用 attackPower を生成
         │
         └── rental-move-master.mjs    : 共通24技の定義/技ID検索
                                            ▲
rental-character-move-refs.mjs  : 6体の ID / 技4枠のID / skillId
         │                                  │
         └── rental-yokai-definitions.mjs   : compact character refs
                     │                      │
                     └──── combat-catalog.mjs
                                │  4つのIDを検証し、1箇所の技定義を解決
                                ▼
                     getMove / getCharacter
                                │
                     engine/catalog-attack-spec.mjs
                                │
                     engine/combat.mjs
```

### 具体的なコード
1. `content/rental-attack-moves.mjs`（新）：6体の攻撃威力**55, 40, 45, 45, 45, 65**と`hits=1`を試遊用技マスターの物理基底情報として定義。`evidence:'fixture'`。**一部の原作妖怪の技を流用した確定値ではない**。
2. `content/rental-roster.mjs`（変更）：元のリテラルから攻撃威力6か所を外した。`RENTAL_ATTACK_MOVES[index].power`から従来の`attackPower`を生成。旧`createCombat`やカスタムチームは旧APIを維持。全員`hits=1`なので、もとに無かった`attackHits`を余分なプロパティとして追加せず、旧`??1`動作を守る。
3. `content/rental-character-move-refs.mjs`（新）：`{id,name,skillId,moveIds:{attack,technique,inspirit,soultimate}}`だけ。**威力や状態効果は含めない**。
4. `content/rental-move-master.mjs`（新）：各スロットの**24個の技定義**を凍結し、`rentalMoveById()`で参照。**複数対象≠多段攻撃**、現行必殺のヒット数が未確認なら`{type:'unknown',count:null}`を維持する。
5. `content/rental-yokai-definitions.mjs`（変更）：`RENTAL_YOKAI_REFERENCES_LAB/SCHOOL`を**キャラの本来のID参照定義**として生成。現在使われている`RENTAL_YOKAI_LAB/SCHOOL`は技IDを共通マスターから展開する**旧Schema V1互換の表示**に変更。ユーザーが変更できないようキャラ定義内部も再帰的に凍結。
6. `content/combat-catalog.mjs`（変更）：`createCombatCatalog({characters,moveMaster})`が参照onlyの`moveIds`を受け取り、**存在しない技ID、別種スロット、4枠不足、マスターの重複IDを検出したら拒否**。生成後の`getCharacter`/`getMove`等、既存のAPIは同じ。`RENTAL_LAB_CATALOG`・`RENTAL_SCHOOL_CATALOG`も新ID参照で組み立てている。カスタム/過去のフル技インライン定義入力は互換で受ける。

## 変えていないこと
- 戦闘エンジン、技の実ダメージ式、サークル、行動順、妖気、スキルの発火、表示時間、通信データ、Firebase接続とRulesは変更なし。
- `attackPower`が旧ロスタに表示されるのは**互換の計算済みプロパティ**であり、元の数値の二重記載ではない。
- `techniquePower`・`inspirit`・`special`など**残り3枠の実値の著者ソースはまだ旧`rental-roster.mjs`**。技マスターに展開しているが、これらはまだ原作仕様で検証済みの技マスターへの全面移行ではない。次の工程で順に別マスターへ移す。現在「4技とも完全に原作値へ一元化した」とは言わない。
- 自動テストの「全合格」は**既存ゲームの回帰安定性**の証拠であり、原作への忠実度/学校実機の安定性の証拠とは別。

## テスト
新規`tests/phase1-5-move-references.test.mjs`を追加して、
- 6妖怪×4技の参照IDと24技マスターの一意性、技種別の一致、`fixture`扱い。
- 単一の物理威力ソースから旧`attackPower`/カタログ/ホストが同じ値を得る。
- 2つの研究/学校カタログから作った従来キャラV1が参照式展開と**完全一致**し、`getMove`でも正しい内容。
- 存在しないID、型の異なるスロット、技枠欠落、技マスターの重複、ID参照キャラの変異が拒否される。
- 学校向けレンタル6体の`catalogAttackResolution:false/true`に対し、同seedの実ホスト結果とスナップが一致。

**コミット`14ae7c688`の[Research Unit 638/638 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40597123520)**。実Chromium Stage QAは[GitHub Actions run](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40597123947)で追跡（合否は確認時点で未完了。結果が出たらこの記録を更新）。
GitHub上でこれらの外部QAはnode/Chromium実行。ローカルコンテナは利用不能だったため実Safari iPad操作確認は今回できていない。

## 次する作業 / Phase 1.6
- **妖術（攻撃/回復）**を次の1種類として、現在の`techniquePower`・`techniqueHits`や`technique`の技側マスターへ移し、旧・新の固定seed全試合の結果・妖気・勝敗を比較。別の原作技を改変して挿入しない。
- 続いて`inspirit`・`soultimate`の効果構成も旧キャラから順に整理。**技固有の多段ヒットと対象複数は別**の正規契約で確認。
- コードの`import`依存と変更範囲を過剰に増やさず、各1工程で過去API互換を維持。画面PNG/DOM検証と本家動画照合も継続。
- Phase2以降の原作ルール研究、Phase3の時間/相手視点、Phase4操作、Phase5演出、Phase6学校iPad対戦は未完了。

**現在地：6段階ロードマップの Phase 1「戦闘基盤統一」内、Phase 1.5（技ID参照と攻撃威力の一元化）実装済み。**
