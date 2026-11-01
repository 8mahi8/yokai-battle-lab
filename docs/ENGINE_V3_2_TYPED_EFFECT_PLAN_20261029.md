# 妖怪ウォッチ2対戦 Engine V3-2｜型付き技EffectPlanの第一段階（2026-10-29）

## 位置づけ・完成条件

**ゲームエンジン先行**のV3ロードマップで、前工程の共通HP/Status Commit、KO、6スキルHookを土台にした。キャラ・技を追加する前に、**既存の単一技マスター → 型付きEffectPlan → ホストの既存効果確定**という通路を作る。

これは**原作の数値やEffect優先順位を新たに確定する工程ではない**。既存6体24技の各値は `fixture`。原作のHit数やモーション時刻が未知の必殺を通常1Hitとして扱わない。今回、元MP4を再生したとは主張しない。

学校の通信は**Firebase Realtime Database／認証なしFriends**、ホスト判定。Supabaseや匿名認証への移行はしない。開発ブランチ以外には変更を加えない。

## 実装内容

| ファイル | 内容 |
| --- | --- |
| `engine/typed-effect-plan.mjs` | `compileTypedEffectPlan(move)` と `commitTypedEffect(plan,committer,payload)` を追加。既存の技マスターから型・対象・Hit型・根拠を固定し、既存の `EffectCommitter` の `commitDamage`/`commitHeal`/`commitStatus` のみを呼ぶ。任意JS実行なし、乱数使用なし |
| `engine/combat.mjs` | **内蔵レンタル6体だけ**の通常技・妖術・とりつくのEffectPlanを対戦開始時に作成。通常の行動結果を計算したあと、最後の正規状態確定を型付きPlan経由にする。自動行動選択、命中、威力式、対象選択、割り込み、KO、妖気、行動時間は従来通り |
| `tests/typed-effect-plan-v3.test.mjs` | 全18普通技の登録、無効の形の拒否、3種の正規Commit、4 seed×研究モデルON/OFFの**旧処理との完全な各手snapshot/event比較を行うテストを新設** |

実行対象：
- **通常攻撃**6技（damage）
- **攻撃妖術**4技（damage）
- **回復妖術**2技（heal）
- **とりつく**6技（status）

計18技。`rental-move-master.mjs` 24技中、残り**必殺技6技は未移行**。対象の複数性・Hit数不明・吸収/蘇生/ダメージ＋状態等が共存するため、この段階の1-effect形へ黙って変換せず、`unsupported`として拒否する。研究必殺技・零式つつく・おはらい・HP-over-time tick・Soul移動は旧ホストルールを維持する。

### 既存動作を守る具体的な仕組み

- 新規データ台帳を複製しない。既存の `RENTAL_MOVE_MASTER` が唯一のauthoring source。
- データの `slot/category/targetScope/power/hitPattern/statusEffect/evidence/sourceRefs` を検証して凍結。攻撃＋状態などの**未対応の複合効果は拒否**し、黙って片方を落とさない。
- ステータス適用時は `target.id` と `statusEffect/sign` をPlanの定義と照合し、不正なタイプは実際の状態を書き込む前に拒否。
- デフォルトレンタルだけをPlan経由にし、研究/カスタム `teams` は明示的に旧経路へ。新キャラ追加を自由にする工程（V3-4）はまだ先。
- Planは既存の計算済みダメージ/回復量を受け取るだけ。これまでのRNG抽選数、`skillHooks`、`EffectCommitter`、`KO`、正規スナップショットのフィールドは変えない。

## 検証の厳密な区別

**今回手元で確認したもの**：接続GitHubの実ソースを取得し、原本 `rental-move-master` と依存技データをV8で評価。**24技を実際に組み立て、18技の型付きPlan・6件の必殺拒否、18のCommit委譲、5不正形の拒否、合計78のチェックとコード/テストのJS構文チェックがPASS**。新モジュールの単体基本動作に関する独立確認である。

**追加したが正式実行の成功をまだ確認できていないもの**：`node --test tests/*.test.mjs`、自然6対6の完走、`tests/typed-effect-plan-v3.test.mjs` の8 seed/flag組合せ各手の旧新状態比較、Chromium上画面/下画面、Firebase Friends no-Auth RTDB emulator 2 iframe、Google Sites用単体HTML生成、学校iPad Safariの2台接続。

前工程の[719/719 Nodeテスト](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40840254872)／[Chromium](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40840255136)／[Firebase Friends](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40840226006)は**この差分を含むHEADの合格ではない**。今回の環境では接続GitHubのWorkflow履歴取得がpull_request-triggeredのみで、push起点の新結果を確認できなかった。CIが失敗・成功したと推測で報告しない。

## 次の仕事（ゲート順）

1. **正規CI/ブラウザ/通信の受入を必須化**。新しいheadに対応するGitHub Actionsの結果・失敗ログを確認し、失敗があれば先に修正。必要な場合は手元Node環境で `node --test tests/*.test.mjs` と `node tools/normal-match-endurance.mjs` を走らせる。
2. **データと効果の統合範囲を広げる**。既存 `RENTAL_MOVE_MASTER` と `combat-catalog` の同一技IDを使い、必殺の `targetScope`・ヒット数・複合効果を「対象選択Plan」「各対象の打撃/追加効果列」に分離。ただし原作未確定のhit回数を自動的に1へ置換しない。
3. **DoT/継続回復・Soul・Interrupt/Poke/Purifyの共通Effect規約へ移行**。先に元コード・原作根拠を監査し、変更のたびに同じseedと入力列の状態/イベントを比較する。
4. V3-3で原作の行動順・妖気・相手視点の表示保留を研究し、V3-4で任意キャラの技ID登録だけで追加できるゲートへ進む。

**今回**：18通常技→型付きEffectPlan→正規Commitへの統合。V8 78チェックPASS／正式CI結果未確認。

**全体のどこ**：V3-2進行中（共通Effect/KO/Skill/通常技）。V3-3〜5未完。

**本人の作業**：現時点では不要。本番・学校サイト・main・Firebase Rules/DB・Driveは無変更。
