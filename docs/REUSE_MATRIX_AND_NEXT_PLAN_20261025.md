# 妖怪ウォッチ2対戦再現｜重複開発防止マトリクスと次の計画（2026-10-25）

> **【後続決定 2026-10-25】** [Phase26試遊用仮値](./PHASE26_PLAYTEST_SOUL_TUNING_20261025.md)を優先。未確認の妖気数値は仮値で試遊し、感想に応じて一元調整。**研究用の原作確定と試遊用仮値は異なる**。古いタスクの「妖気数値は原作実機で確認できるまで導入禁止」は、正規原作数値の確定時の基準として残すが、ユーザーが明示承認した試遊版仮値には適用しない。


> **目的**: 新担当がPhase1〜25で既に調査・実装・テストしたものを「未着手」と誤認しない。まず既存の証拠→実装→テストを確認し、足りない部分だけ差分で直す。本書は [再監査引き継ぎ](./HANDOFF_VERIFIED_20261025.md) / [全体進捗](./PROJECT_MAP_AND_PROGRESS.md) を補完する。未実装・原作未確定を根拠なく「完成」にしない。

## 1. 現物照合の範囲と現在地
- GitHub開発ブランチ`feat/phase1-action-circle-lab-20261023`の **227ファイルの構成**（うち`docs/`64、`engine/`23、`tests/`81）を列挙。Phase1〜25の各研究資料・初期引き継ぎ・原作再現優先資料・最新監査の**全64資料の内容**を再閲覧。戦闘エンジン23ファイル、現行の通信経路・UI・HTMLビルダーの機能/オプションとテスト構成を照合。
- 基準となるコードHEADは `7bfc083b7b3de677744aabffa80ad891a4c4488a`（2026-10-25）。この後のコミットは文書整備であり、コードへの機能変更はしていない。 [Node 497/497 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40195497455) / [Chrome stage gesture PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40195497517) / [Supabase 2 iframe cloud E2E PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40195497511)。これは実iPad二台や原作3DSの厳密再現を意味しない。
- `main`の研究用キャラデモ、`docs/DEVELOPMENT_STATUS_20261023.md`と過去の「LATEST」「Next」表記は歴史的スナップショット。PR #1はPhase25まであるがDraft/未マージ。最新の現在地を古い資料で巻き戻さない。

## 2. 実装再利用マトリクス（新規に作り直さない）
| 項目 | 既にある具体的なもの | 本当の残件と扱い |
|---|---|---|
| 行動順・輪 | `engine/phase1.mjs`には94行速度・初期待ち研究、前後衛6体輪・回転・クールダウン。Phase1/21A/B/21C資料、`tests/phase1.test.mjs`,`match-phase21-rotation-clock.test.mjs`他 | **原作実測は未完**: 同着、初手権、前衛登録の効力、継続待ちとフレーム境界。速度表を再作成しない。正式ホスト`match-protocol.mjs`は3秒回転制限標準。 |
| 自動行動と通常技 | `engine/combat.mjs`,`selection.mjs`,`damage-model.mjs`,`hit-model.mjs`。Phase2/3/9/10/20統合資料、`combat*.test.mjs` | 命中・技別数値・回復等の**原作確度**を上げる。新たな戦闘エンジンを作らず、既存モデルに根拠付き差分。 |
| とりつきとおはらい | `engine/inspirit.mjs`,`turn-inspirit.mjs`,`purify-input.mjs`; Phase3/8/10/20B、`combat-purify.test.mjs`,`match-phase20b-inspirit.test.mjs` | 5タッチ種・現行2席統合あり。継続毒/回復の**仮HP式は既定OFF**。ステージ低下はホストに統合済み。 |
| 妖気回復・G技 | `engine/soul.mjs`,`charge-input.mjs`,`match-protocol.mjs`、Phase4/18/21D/22B/22C、`match-protocol-charge.test.mjs` | 通常ホストに**非攻撃本人行動+5**の根拠付き方式あり。攻撃/妖術からの増加、グレード別細値・補正は未確定。両隣3人G技消費は既存実装。|
| 必殺効果 | `engine/special-effects.mjs`と`combat.mjs`、Phase4/19/22B/22C、`combat-special-effects.test.mjs`,`match-special-effects-active.test.mjs` | 発動・チャージ・消費・HP効果はあるが**個別技威力はresearch-fixture**。原作技別データが裏付けられるまで完成扱い禁止。|
| 零式つつく→妖気 | `poke-input.mjs`のタッチ12回研究、`combat.mjs`の標準つつく、Phase7/21D-C1/C2/C3/22A、`phase22-poke-soultimate-cycle-lab.test.mjs`,`phase21d-poke-soul-trace.test.mjs` | **つつく操作自体は実装済み**。Soul吸収先・量・発生確率は不明。研究用`researchPokeSoulTransfer`は正式ホスト既定でOFF。連射研究テストは「原作で連射可能」の定量証明ではない。 |
| ノーモーション/カウンター | `presentation-timeline.mjs`,`counter-window.mjs`,`wheel-coalescing.mjs`; Phase5各資料・Phase22D-A/B、`counter-window.test.mjs`,`combat-counter.test.mjs`ほか | **研究モデルは既に存在**。二我慢/カットイン中の回転確定フレーム・両側モーション実測が不明。原作資料が揃うまでは正規`match-protocol`への統合をしない。 |
| 閃光魂 | Phase6の研究モデルとテスト`opening-priority.mjs`, `tests/phase1-opening-flash.test.mjs` | **初期版に入れないユーザー決定済**。研究成果は保持するが、次の機能として復活させない。 |
| レンタルキャラ・画面・指入力 | `combat.mjs`の6体、`ui/character-art.mjs`,`match-stage.mjs`,`wheel-gesture.mjs`,`lab/yw2-layout.css`; Phase14〜18、`tests/match-stage.test.mjs` | 初期同一レンタル6体＆本家風上下2画面、4コマンドは**既存**。独自の5行動予測は本番UIでOFF。ゲーム上の不具合がない限り美術の作り直し・新キャラ量産を先行しない。 |
| 戦闘ホストと同期 | `engine/match-protocol.mjs`,`network/firebase-match.mjs`,`network/supabase-room.mjs`; Phase11〜14・23・25、`tests/match-protocol.test.mjs`,`tests/supabase-room.test.mjs` | ホスト確定、`clientSeq`冪等、ACK、revision、再配信/切断時未送信破棄は実装済み。Supabase本番2 iframe E2E PASS。**長時間/異端末/旧Safari切断復帰は別ゲート**。 |
| Supabase/Auth/RLS | Phase25の`yw_*_v1`4テーブル、`supabase/yw_pvp_security_v2.sql`、`network/supabase-room.mjs` | 過去の`Anonymous sign-ins are disabled`は最新E2E通過により**現在の設定依頼ではない**。現Supabase Advisorの5 WARNは実警告（匿名Authの4/共通パスワード保護1）、内容を分類して扱う。テスト行が残るため不用意に消さない。 |
| Google Sitesコード | `tools/build-sites-supabase.mjs` → `dist/sites-supabase-online-code.html`（約175KB）。Phase24/25、`tools/supabase-sites-browser-smoke.mjs` | **ビルダーは完成・HTMLを生成できる**。実Google Sitesへの貼り付けと学校旧iPad Safari実機2席の動作は未検証。GitHub Pages URLの埋め込みではない。 |

## 3. 次の作業順（新たなフェーズ番号や実装は「重複監査」後だけ）
1. **原作再現の穴を優先順に並べる**。まず通常オンラインホストの`createMatchProtocol()`に実際に適用される値と、`createCombat()`の研究オプションを別表で確認。Phase21Dの**攻撃/妖術に伴う妖気回復量とつつく報酬**を最初の調査重点にする。既存の24ケース観測表・比較器に新しい裏付けがあれば追記。確証がない間はコードの仮値を本番ONにしない。
2. **原作の基本ループを改善する差分**：初手/同着/行動テンポ・数値、通常/零式チャージ・G技・おはらい/状態効果の具体的な再現証拠。ひとつずつ既存`engine/*`と`tests/*`に最低限の変更で統合。「テストを増やすだけで原作一致」と主張しない。
3. **高度な競技戦術の研究を継続**：Phase5/22Dのノーモーション/カウンター/2我慢はモデルがあるため、原作の両視点映像等の新しい確証で境界が判別できた箇所に限って正式統合を検討。
4. **ネットワーク品質の未検証だけ追加**：現実に通ったSupabase 2 iframe E2Eをベースに、遅延・**同じページを開いたままの短い通信中断**・タイムアウト・長時間・後片付けをテスト。**ページ再読み込み・タブ閉鎖・ブラウザ再起動後の以前の対戦への復帰はユーザー不要のため開発しない。**Firebase Phase23の既存失敗注入テストをSupabaseに無意味に再実装しない。学校Safari2席は最後に本人が試遊。
5. **学校Google Sites配布の準備**：最新HTMLを再生成/テストし、元ゲームとのルール差と未検証部分を正直に表示して本人に直接貼付用コードを渡す。本人が貼るまで`main`・実Googleサイト版を勝手に変更しない。

## 4. 二度手間を防止する着手ゲート（今後のAIに必須）
1. 新タスクの名称と既存対応フェーズをまず探す：`docs/PHASE*.md`、`engine/*`、`network/*`、`ui/*`、`tests/*`の対応箇所を明示する。
2. **状態を4種類に分類**：`A=原作根拠+実戦統合+試験済`、`B=実装/試験済だが原作仮`、`C=研究・比較器のみ`、`D=何も未着手`。B/CをDと扱って作り直さない。
3. **既存と差分の契約**：既存モジュール名・既存テスト・既存根拠URL・原作の不足証拠・今回直す差分と合格条件を着手前に揃える。原作資料がなくB→Aへ進めないときは、実装を憶測で進めず別の独立未検証ゲートへ移る。
4. 開発作業後は Node全件/Chrome/UI/通信関連CIの成功と、実機が未検証なら未検証と記録。チャットでは必ず**今回／全体のどこ／次／本人の出番・変更先**を報告する。
5. 開発ブランチ/PRのまま進める。`main`・学校Googleサイト版・他ゲーム/本番Firebase/Supabase DBへの変更範囲を確認する。今回の監査は文書だけでゲーム本体のコードは変えない。

## 5. 重複を招いた過去の記述について
- `docs/HANDOFF_LATEST_20261024.md`、`docs/DEVELOPMENT_STATUS_20261023.md`、`docs/PHASE25_SUPABASE_HANDOFF_20261025.md`等の本文内には、当時の「次はPhase X」「未実装」という言葉が残る。日付を見ず最新のタスクとして再投入しない。
- `main/README.md`由来のキャラ研究デモと、Phase14以降の本体戦闘を混同しない。
- ブラウザ/NodeテストのPASS、原作再現のPASS、旧iPad実機のPASSは相互に代用できない。

## 2026-10-25研究進捗：Phase21D-B3（追加事実）
- [特殊技4例の原典再監査](./PHASE21D_B3_NAMED_SPECIAL_RECHARGE_20261025.md)を追加。既存`engine/phase21d-soul-rate-evidence.mjs`に4名の条件（うち3名の容量は「?」）と独立動画解説の追加回復観測2件を保存。**新しい別エンジンは作成せず**既存比較コードを拡張した。
- [Node503/503](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40201933897) PASS。オンライン正式`createMatchProtocol()`の妖気計算・通常戦闘・学校サイトは変更しない。
- **残る原作証拠**：攻撃/妖術後の妖気増分、つつくの確率・受取先・量、3名の「max?」の実上限、既存130の13vs14差。動画や実機の独立観測がなければ本番の仮数値を増やさない。

## 2026-10-25 追記｜Phase21D-B4までの再利用境界
- **今回実際に追加したのは既存の`engine/phase21d-soul-observation.mjs`への`auditDamagingActionSoulPair`だけ**。[資料](./PHASE21D_B4_ATTACK_SOUL_BONUS_AUDIT_20261025.md)と新規`tests/phase21d-attack-soul-pair.test.mjs`（10件）に紐づけ。原作資料に通常攻撃/妖術の確定ポイントはなく、攻略資料が報告する「サボり/悪いとりつき中の敵への攻撃は妖気が増えやすい」は定性的な主張。比較器は同一条件が揃えば**観測差だけ**返し、推測で正規Soul量を変えない。
- 最新[Node513/513](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40202609186)・[Chrome指操作](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40202609177)成功。**次に原作の生データが得られない限り、同じ数値を繰り返し推測しない**。既存の通信復帰・旧Safari/Google Sites前検証など独立に進められる未完ゲートを優先してよい。
