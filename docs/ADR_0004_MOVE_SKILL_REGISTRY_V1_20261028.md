# ADR-0004｜技・スキルの共通台帳 V1 / 戦闘のルール移行を安全に始める（2026-10-28）

## 状態
**技・スキルのデータ台帳と検証テストを実装済み。技効果の戦闘実行処理はまだ新台帳に移行していない。**
先行：[ADR-0002｜原作体験から組み立てる段階的再設計](./ADR_0002_ORIGINAL_PVP_CORE_REARCHITECTURE_20261028.md) → [ADR-0003｜妖怪1体の定義](./ADR_0003_YOKAI_CHARACTER_DEFINITION_V1_20261028.md) → 本書。

## 外部資料から選んだ開発方針
1. [Game Programming Patterns: Type Object](https://gameprogrammingpatterns.com/type-object.html) では、種類ごとの挙動を大量のクラス継承で増やす代わりに「共有する**型データ**を参照する」方法を説明。**本作では1体の妖怪→技ID、スキルID→共通台帳**に適用。ただし原作内部プログラムの形を真似るという意味ではない。
2. [Game Programming Patterns: Component](https://gameprogrammingpatterns.com/component.html) では複数領域の責務を分ける利点と過剰分割のコストを説明。**今の用途では巨大なECS/グローバルEntity Busを作らず**、内容定義・正規判定・ネット通信・演出表示を分離する。
3. [Game Programming Patterns: Event Queue](https://gameprogrammingpatterns.com/event-queue.html) は「実行時の結果確定」と「遅れて再生する画面表示」を分離できる一方、巨大なグローバルキューは複雑になり得ると指摘。今の`actionId/eventId`を含む正規結果→既存の画面演出キューを**段階利用**し、別の全域キューは導入しない。
4. [MDN Object.freeze](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze) は`Object.freeze`が**浅い**ことを説明する。このためキャラ・技・スキルのデータは個別の子要素まで凍結した複製で保持し、試合中の変更を防ぐ。

## 技・スキルの台帳
- `content/skill-catalog.mjs`：
  - `PLAYTEST_SKILL_CATALOG`には現行6種の**スキルの説明ラベル**と発動タイミング・効果の**識別子**（数値ではない）を登録した。
  - `validateSkillEntry`がID、許可したトリガー/効果の型、参照情報を検査。
  - 6種はすべて`evidence: 'fixture'`：**「原作のスキル発動条件/確率が確定した」という意味ではない**。
  - 蓄積段階、発動ターン数、追加会心量などの暫定数値は新台帳に重複して書かず、既存`engine/skill-effects.mjs`の`SKILL_TRIAL`を**参照名で示す**。実際に運用する数値の持ち主は今のエンジン。
- `content/combat-catalog.mjs`：
  - `createCombatCatalog`は妖怪定義（固定4技）とスキル台帳を検証・統合する純粋な読み取り専用のコンストラクタ。
  - `getCharacter(id)`, `getMove(id)`, `getSkill(id)`で**同じIDを検索**できる。
  - 技IDを別キャラが共有するとき**定義の内容が一致すれば許可**するが、同じ技IDで攻撃威力や効果/対象が異なる場合は**即エラーで拒否**する。後勝ち上書きでルールが変わる事故を予防。
  - スキルIDの不在、定義の重複、記録されたトリガーと本体参照の矛盾はコンストラクタで拒否。
  - 既存6体の研究・学校用に `RENTAL_LAB_CATALOG`, `RENTAL_SCHOOL_CATALOG` を作成。各々**6妖怪×4技枠=24技ID、ユニークなスキル6種**。
  - 技IDの衝突拒否は**データの意味上の整合性**であり、ブラウザや通信のアクセス制御ではない。

## 既存スキルとの対応（**試遊実装**、原作忠実度の証明ではない）
| エンジンID | 試遊ラベル | トリガー識別子 | 効果識別子 |
|---|---|---|---|
| momentum | まえのめり型 | after_ko | temporary_strength_stage |
| care | おせわ型 | after_any_action | adjacent_ally_heal |
| sharpCrit | いっせん型 | on_critical_roll | bonus_critical_units |
| critImmune | つやつやボディー型 | on_defender_critical_roll | prevent_critical |
| lastStand | どひょうぎわ型 | before_lethal_damage | survive_at_one_hp_once |
| guardBreak | ガードくずし型 | on_guarded_physical_hit | ignore_physical_guard |

- `engine/skill-effects.mjs`の旧`RENTAL_SKILLS`公開APIは、`PLAYTEST_SKILL_CATALOG`から**生成して再公開**。既存コード内の二重スキル名定義を解消。実際のスキル発動計算、`SKILL_TRIAL`数値、HP/会心結果等は未変更。
- `content/rental-yokai-definitions.mjs`もスキル名称・トリガー・効果名を上記データから射影。値の確度は依然`fixture`、原作確定とは主張しない。
- キャラに同じ技を設定したら、`getMove(id)`からその共通定義が引ける。現実の「同技でレベルにより威力が違う」等を表現する必要があれば、**技の基底IDとレベル別実威力**を将来別のデータとして扱う。本V1で原作の技レベル補正を定義したわけではない。

## 検証
`tests/combat-catalog.test.mjs`を追加。6つのテストケースで以下を証明：
1. 6体×2モードの24技検索、スキル6個の検索・不変性。
2. スキル台帳の名前が元のエンジン公開APIと一致し、試遊数値の参照名が存在する。
3. 学校/研究は性格のみ変わり、技/スキル・能力は共有する。
4. 技IDが完全一致なら他の妖怪でも利用でき、同ID/異内容は拒否する。
5. 不明なスキル参照、重複ID、未裏付けの原作出典主張、無効トリガーを拒否する。
6. 呼び出し元の定義オブジェクトを変更してもコンパイル済台帳は影響を受けない。

初版のテストでは**参照先が同一のJavaScriptオブジェクト**であることを誤って期待して1件失敗。実装は元キャラデータを複製・凍結するため、正しい期待は**データとして同一の技定義**。テスト修正後に研究単体試験 **614件全合格**を確認。合否の最終CIは下記のリンクを参照。

- [修正後の614/614合格](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40534349204)（`9bb4df6cf`時点。共有名リファクタ前）
- 最新の公開API一元化も含む後続CI：`4b8b9efc`の [Research Unit](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40534532696)、[Chromium Stage](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40534532969)。**結果を確認するまで最新も合格とは宣言しない**。

## 次の実装（データ台帳ができたあと）
1. **技の実効果の分類**を設定する（普通の物理単発、多段物理、属性妖術、回復、とりつき、単発必殺、範囲必殺、必殺多段など）。カテゴリは元の戦闘式と原作技の確定資料と紐付け、**多対象≠多ヒット**を厳守。
2. 既存`engine/combat.mjs`の直接ハードコードを一気に消さない。最初に**1つの技について、現行結果と台帳に基づく結果が同じ**になる受け入れ試験を作る。
3. 技毎の`effect.handlerId`を小さな**既知効果ハンドラー**の辞書に対応させ、未確認の原作仕様や未実装ハンドラーは**明示的なエラー/未提供状態**として扱う。任意コード文字列やevalは使用しない。
4. スキルは**発動イベントと適用効果を別々にホストの正規イベント**へ記録し、`presentation/`は正規データを読むだけにする。
5. 元の資料には`ひゃくれつ肉球`の回数が矛盾している部分があり、2〜4試合目の原作実動画は未フレーム解析。数値を推測で確定しない。
6. Firebaseルーム・seq/ACK・古い学校Google Sites配布・GitHub main・Firebase Rules/DBは維持。新規依存ライブラリなし。

**完了基準は「技データを書くだけで原作を再現したと主張できる」ではなく、原作の技・その発動条件・計算結果・画面演出を独立した検証で整合させること。**
