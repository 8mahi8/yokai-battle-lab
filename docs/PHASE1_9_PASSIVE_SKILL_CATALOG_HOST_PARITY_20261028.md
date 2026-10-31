# Phase 1.9｜固有スキル6種の共通台帳→ホスト発火処理への接続
2026-10-28 / 開発ブランチ `feat/phase1-action-circle-lab-20261023`

## 結果と範囲
**Phase1.9完了（開発版のみ）**。すでに`content/skill-catalog.mjs`へ登録されている固有スキル6種の**skillId / trigger / effect / provenance**を対戦開始時に厳密照合し、ホストの実行フックが解決済みのスキルIDを使うようにした。旧戦闘式、乱数の呼び出し、対象/判定/イベント順、HP、Soul、表示、オンラインwireの仕様は変更しない。

**重要**：スキルを全部新規実装したわけではない。既存の研究用スキル処理を「登録済みの共通スキルIDに基づいて選ぶ構造」へ移行した。実際の原作忠実度や全技の発動順再現は、これだけでは証明できない。

## 外部資料・原作一次観察
- [妖怪ウォッチ2 スキル一覧（攻略大百科）](https://gamepedia.jp/youkai-yw2/skills)、[ゲームの匠（YW2スキル一覧）](https://youkai-gh.g-takumi.com/skill_list.php)で、特に`どひょうぎわ`（致死攻撃時の耐久）、`いっせん`（会心頻度）、`つやつやボディー`（会心無効）、`ガードくずし`（ガード無視）、`おせわ`（隣への自動回復）など、**スキルにより発火条件が異なる**ことを再確認。これは**元ゲームの正確な倍率、処理順を確定する証拠ではない**。
- [Game Programming Patterns — Type Object](https://gameprogrammingpatterns.com/type-object.html)、[Event Queue](https://gameprogrammingpatterns.com/event-queue.html)：共通定義と実行処理を分離し、確定した`skill`イベントだけを後から画面が表示できるようにする。本工程では既存`events.push()`の順序を変えず、新しいイベントバス/非同期処理は導入しなかった。
- **本人提供の原作対戦動画4本も一次資料**。[第1試合の直接観察記録](./MATCH01_SECOND_PASS_INPUT_AND_TIMELINE_20261027.md)、[第2〜4試合の部分フレーム直接レビュー記録](./PHASE1_6_TECHNIQUE_CATALOG_AND_ORIGINAL_VIDEO_REVIEW_20261028.md)を継続参照。ただし、この工程では元MP4の新たな全フレームレビューに成功していない（コンテナ起動不可）。特定のスキルの発動タイミングを映像に照らして新規確定したわけではない。

### 技能の位置と対応する既存ホスト処理
| レンタルskillId | 台帳trigger | 元の研究実装の処理 | 原作の検証状態 |
|---|---|---|---|
| `skill:momentum` | `after_ko` | 敵をKOした後に本人のちから段階を一時上げる | 付与段階・持続はfixture |
| `skill:care` | `after_any_action` | 両陣営の隣接6枚リングの生存味方へ行動境界で回復 | 回復2%はfixture |
| `skill:sharpCrit` | `on_critical_roll` | 物理/妖術の急所確率に研究用加算 | 確率加算はfixture |
| `skill:critImmune` | `on_defender_critical_roll` | 急所判定で受け手の急所無効を判断 | 研究式は未原作一致 |
| `skill:lastStand` | `before_lethal_damage` | HP0になる直前、試合中1度HP1で耐える | 既存研究ルール維持 |
| `skill:guardBreak` | `on_guarded_physical_hit` | ガード中の敵へ物理攻撃するとき軽減無視 | 既存研究ルール維持 |

厳密には、「データ台帳がtriggerを定義する」だけで、原作と完全に一致する実時間順でスキル演出が再生されるわけではない。

## 変更ファイル
1. `engine/catalog-skill-spec.mjs`（新）：
   - ゲーム内のレンタル6体に対し、`skill:<legacyKey>`、`trigger`、`effect`、名前・5能力・skill IDを`RENTAL_LAB/SCHOOL_CATALOG`と照合。
   - すべて`fixture`。既定の6トリガー/効果対応と矛盾した場合には**起動前に拒否**し、原作情報を推測して上書きしない。
   - `{characterId,skillId,legacyKey,trigger,effect,evidence}`の凍結データのみ返す。戦闘計算/乱数には介入しない。
2. `engine/skill-effects.mjs`：`careOnOwnerTurn/careAtActionBoundary`に省略可能な`skillOf`読み取り関数を追加。指定なしでは**旧`member.skill`と同じ**。技ID経由でもリングの隣接効果の対象・回復値・処理順は同一。
3. `engine/combat.mjs`：`catalogSkillResolution`フラグを新設。組込レンタルだけ初期化時に6体×2のスキルと発動条件を検証、`skillFor(member)`経由で**KO後、致死前、会心ロール、会心無効、ガード判定、隣接回復**を解決。既存の`triggerKOAbility`、`resolveLastStand`、`critSkillBonus`、`careAtActionBoundary`の**元の場所・既存イベント**を保持。
4. `engine/match-protocol.mjs`：普通の組込レンタル対戦で`catalogSkillResolution:true`を既定にし、`teams`を明示するカスタム編成は従来処理false。ゲストからのネットワークコマンドによる切り替えは拒否。

## テスト
新規`tests/phase1-9-skill-catalog-host-parity.test.mjs`で6ケース：
- 全6体のスキルID/trigger/effectがカタログと一致し、fixtureタグと不変性を維持。
- キャラ改竄、ステータス不一致、不正trigger/未知ID、custom teams、非booleanを拒否。
- 開発版標準/legacy/カスタム初期化条件とゲストからの勝手な切替拒否。
- 隣接回復の元の6枚リングと両陣営の回復順・量が`skillOf`導入前後で一致。
- 学校/研究モードで複数seed・Pinコマンドを使い`advanceAuto`の**全戦闘結果・HP・Soul・skillイベント・KO・勝敗**が旧/新一致すること、実試合の回復発火を確認。
- 旧式ダメージモデル/スキル無効時にも一致。

**最終ゲーム実装＋テスト commit `40bb8e929`**：
- [Research battle unit tests：**660/660 PASS**＋6レンタル耐久試合 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40640840994)
- [実Chromium Stage/Gesture/Match Result：**PASS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40640840904)
- 追加の旧Supabase/Firebase実ブラウザCIは別経路なので、その結果を検証せずに学校2台の完成証拠にしない。

## 未完と次工程
- **Phase1.10：Phase1統合点検**。6キャラ→4技＋スキルID→ホスト結果→ActionOutcome/画面のイベント契約を通しで監査し、二重データ・タイミング・本当に原作裏付けのある数値と`fixture`の境界を整理。**スキルイベントもActionOutcomeへ統一するか**は現在の`ActionOutcome V2`がattack限定なので、データを捏造しない形で新たな契約として設計する。
- 次の**Phase2：原作対人ルールを本格的に調査・実装**。必殺の本物の連続ヒット、サークル/動作中の見え方、能力・スキルの発動/解除・蓄積順序などを、本人MP4実フレームと原作外部資料に照合。いまの研究式はあくまで実装仮値。
- 学校Safari2台、AuthなしFirebase Friendsの最終実機は未確認。GitHub main、学校Google Sites稼働版、Firebase本番Rules/DB、Drive配布には触れない。

**ロードマップ現在地：Phase1/6「戦闘基盤統一」の1.9完了。次は1.10統合点検。**
