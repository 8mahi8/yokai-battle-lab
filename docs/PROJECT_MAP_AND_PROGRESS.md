# 妖怪対戦ブラウザゲーム｜設計全体図・現在地・次の一手（単一の進捗入口）

更新: 2026-10-24 JST
Repository: https://github.com/8mahi8/yokai-battle-lab
Development branch: `feat/phase1-action-circle-lab-20261023`
**現在: Phase 20A 完了 → Phase 20B 原作根拠の照合中。**
**必ずこのファイルを最新の一つの状態表として扱う。** 他の `PHASE*.md` / `DEVELOPMENT_STATUS` は当時の作業証拠と歴史であり、本文に「LATEST」とあってもこの現状を上書きしない。

## 0. 絶対仕様（ゴールは一つ）
学校の古いiPad Safariで友達と遊ぶ、**妖怪ウォッチ2の対人戦闘ルールをまず忠実に再現した**完全無料のブラウザ1vs1。既存戦術が成立することを原作資料・実際の検証と照合した後だけ独自改善する。初期は双方同じオリジナルレンタル6体、**閃光魂なし**。本家に寄せた**上3vs3戦場／下6体メダルサークル＋4コマンド**構成。ゲームの単一HTML/CSS/JSをGoogle Sitesの「コードを埋め込む」へ**直接貼る**（GitHub Pages URLのiframeではない）。`main`・既存Googleサイト版・本番Firebaseは勝手に変更しない。完全なブラウザ再起動後の自動復元はユーザー不要の判断。

## 1. システム全体の配置（縦につながる）
```text
[原作仕様 / 競技戦術の証拠]  ── Phase 1-10, Phase 21-22
              ↓
[戦闘の真実 / engine/*]  ── Phase 1-10研究、Phase 20統合、Phase 21検証
              ↓
[2席ホスト / engine/match-protocol.mjs]  ── Phase 11・18〜20
              ↓
[部屋と同期 / network/firebase-*.mjs]  ── Phase 12〜14、Phase 23安定化
              ↓
[本家風UI / ui/match-stage.mjs]  ── Phase 14〜18、Phase 24最終照合
              ↓
[学校 iPad Safari / Google Sites直接埋め込み] ── Phase 24実機・公開
```
**重要:** Phase番号が前でも「公開動作に統合済み」とは限らない。研究用 `createCombat` オプションと対戦用 `createMatchProtocol` **標準オプションを別々に確認する**。

## 2. フェーズと完了判定（5つの横断ゲート）
| フェーズ | 全体設計の箇所 | 既にあるもの | 次に必要な受け入れ判定 | 位置 |
|---|---|---|---|---|
| 1〜10 | 原作エンジン研究 | 行動順、4行動、とりつき、妖気、4チャージ、5おはらい、つつく、公式資料ベースのダメージ、各ヒット処理、独立研究用戦術 | 原作と確定できない数式を別扱いし実戦版へ段階統合 | **研究成果あり** |
| 11〜19 | ホスト通信・画面の土台 | 正規2席コマンド、Firebaseエミュレータ通信、上下画面、オリジナルキャラ、仮必殺効果 | デバッグ画面と実オンラインを混同せず、通信端末で検証 | **基盤あり** |
| 20 | 研究から正規1vs1への統合 | **20A: Phase9の攻撃/妖術ダメージモデル＋Phase10の多段処理がホスト標準ON**。必殺は別の仮効果。重複HTML IDも修正 | **20B**: 状態異常/回復を外部証拠で確認し、未確定数式はONにしない | **現在** |
| 21 | 原作ルール一致度 | 先行研究の予備データ | 行動頻度、妖気獲得量、技固有数値、回転制限の再現照合 | **次段階** |
| 22 | 原作PvP深層戦術 | Phase5にノーモーション必殺、連続回転、カウンター必殺の独立研究モデル | 本家の時刻・相手画面・被弾イベントと実戦統合テストが一致 | **未統合** |
| 23 | 本番向け1vs1同期 | Firebase Auth+RTDB **ローカルエミュレータ2ブラウザ成功**、短い回線断処理など | 実際のクラウド・権限・長時間同期・端末差を検証 | **基盤あり／本番未試験** |
| 24 | 学校iPad・配布 | 上下画面、指サークル、低負荷の原形 | **学校iPad実機Safari・Google Sites単一HTML直貼り・2端末実戦** | **未完成** |

## 3. 今回した作業（Phase 20A / 2026-10-24）
**目的:** 過去の研究を作り直さず、正式ホストが使う`createMatchProtocol()`へ原作根拠のある攻撃・妖術の計算を統合する。

**変更済み:**
- `engine/match-protocol.mjs` デフォルト: `researchDamageModel:true,researchMultiHit:true`。既存 `researchSpecialEffects:true` は個別妖怪の威力が**仮値**のまま。
- 過去の `engine/damage-model.mjs` と `engine/combat.mjs` のヒット単位処理を**再実装せず再利用**。
- `tests/match-phase20-integration.test.mjs` でホストの物理/妖術、3ヒット例、HP・急所・命中・再送・対戦ジャーナル再演・Firebase snapshot 128KiB制約。
- `ui/match-stage.mjs` の必殺演出DOMの重複IDを削除、`tools/stage-smoke.mjs` で再発検知。
- **デフォルトのオリジナル6体にはまだ多段攻撃の技属性を付けていない。** 多段処理がONと「3ヒット妖怪を正式採用」は違う。

**証拠:** [385/385 Node](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40099904901)、[実Chrome対戦画面](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40099904955)、[Firebaseローカル2ブラウザ](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40099646469)。最後のものはPhase20Aの最終HEADの再測定ではなく、今回有効化後の先行コミットの実験。実機Safari・実クラウド・Google Sites直貼りの合格を意味しない。
**資料:** [Phase20A監査・コード統合](./PHASE20_COMBAT_INTEGRATION_20261024.md)。

## 4. 次にやる作業（Phase20B／状態異常と回復の事実確認）
**最初に既存成果を見る:** `engine/inspirit.mjs` / `engine/selection.mjs` / `engine/turn-inspirit.mjs` / `engine/heal-model.mjs` / `tests/inspirit.test.mjs` / `tests/combat-turn-inspirit.test.mjs` / `docs/PHASE10_MULTI_HIT_INSPIRIT_HEAL_20261023.md`。

**再調査結果（2026-10-24):**
- [Mt.Wildwood YKW2 Inspirits](https://mtwildwood.net/inspirits.php?g=yw2) は、通常の良いとりつきが**30回の戦闘全体行動**で失効し、普通の悪いとりつきは時間切れなし、特定の技は本人行動回数を明記する、と説明。`engine/inspirit.mjs` で既に実装され、`tests/inspirit.test.mjs` が範囲テストを持つ。**再実装不要**。
- [Mt.Wildwood YW2 moves](https://www.mtwildwood.net/yw2/moves) では力ダウン、守りダウン、HP徐々に減少/回復は**種類・レベルごとに別技**。現在の`engine/turn-inspirit.mjs`にある**全マイナスHP効果へ一律5%/level**は完全な原作根拠がない。**標準ではOFFを維持**する。
- 回復技の種類と±10%のばらつきについて研究があるが、`engine/heal-model.mjs` の**回復基礎式 `(power+spirit)/3` は未確定**。理論式を仮値と明示したまま、`researchHealingVariance`はOFFを維持する。
- `damage-model.mjs` にある独自の段階倍率と、個別とりつきのレベルの対応も追加照合が必要。前の研究で作ったからというだけで全状態を自動有効化しない。

**20Bの受け入れ条件:** 対象ごとに「確認した原作ルール → 原作の参照URL/測定 → 既存コードとテスト → 通常ホストへ安全に統合できるか」を記載。未確定は研究用OFFとしたままにする。新たな根拠がなければ**既存コードを触らず、根拠の不足を事実として報告する**。本家の最新資料・プレイ録画が得られた場合だけ追加調査する。

## 5. 次フェーズへ進む条件と設計逸脱を防ぐルール
- **原作再現 → 対人戦術 → オンラインの安定 → 学校Googleサイト**の順を守る。画面装飾、独自ATB、次の5行動予測（UI標準ではOFF）、閃光魂、育成、ランキング、リプレイ、観戦は**現在のスコープに入れない**。
- 何かを「再現済み」と言うには、①資料と根拠の確信度、②戦闘コード、③再現テスト、④原作との比較ケースの4つが必要。**Node全件PASSは元ゲームとの一致を示さない**。
- 新機能の前に既存 `docs/` と `engine/` `tests/` を検索する。同じ研究を2回始めない。
- 少なくとも「原作確認済」「有力な非公式研究」「仮値」「未着手」を区別して記載。
- このファイルの **「今回」→「次」→「全体の設計のどこ」** を毎回作業終了時に更新し、GitHubとチャットの両方で報告する。大きい変更の際はここへ関連コード・run URL・次の受け入れ条件を残す。

## 6. 今後のチャット返信テンプレート（毎回、短くても必ず）
**今回**：XXを修正、実装／検証。テスト（n/n）・実機（済/未）。
**全体のどこ**：Phase NN / 何のモジュール。前段階は何が済み、後段階はまだ何が未完成か。
**次**：Phase NNの課題、採用条件・保留理由・君の作業要否。
**変更先**：開発ブランチ/Googleサイト版/実本番Firebase のどれを変えたか明記。
