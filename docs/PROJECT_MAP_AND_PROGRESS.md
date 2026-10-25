# 妖怪対戦ブラウザゲーム｜設計全体図・現在地・次の一手（単一の進捗入口）

更新: 2026-10-25 JST
Repository: https://github.com/8mahi8/yokai-battle-lab
Development branch: `feat/phase1-action-circle-lab-20261023`
**現在: Phase20A/B・21A/Bの根拠ある部分は正規2席へ統合。21C同着・21Dつつく妖気吸収・22D原作ノーモーション/カウンター確定フレームは未測定のため研究専用。22B/Cの必殺チャージとゲスト権威ACKはFirebaseエミュレーター2Chromeで成功。23Aは回線断中の未送信タップFIFOを破棄し送信済み1件のみ同一番号で安全に再送。**Phase23-Bでは「ゲスト入力はホストで処理済みだが戦況publishだけ失敗し、ゲストACKが復旧しない」経路を特定。ブラウザのホスト再接続時にdirty戦況を再publishし、ホスト向け手動再配信も追加。Node469/469で一時Publish失敗→同一revisionのACK復旧、120連続戦闘状態の書込集約、91連続ゲスト入力順序を検証。FirebaseエミュレーターQAの非同期publish待ち漏れも修正、実Chrome2席のゲートが成功。** 次は23Cの実ブラウザでのホストpublish失敗/復帰注入E2Eと24旧iPad Safari・Google Sites直接HTML埋込準備。
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
| 20 | 研究から正規1vs1への統合 | **20A: Phase9攻撃・妖術＋Phase10ヒット別処理。20B: DEF/STR/SPR能力低下を継続HP効果と分離してホストON**。両方とも個別技値は仮。 | 保留: 回復基礎式と毒/再生HP係数は原作確証までOFF。元の6体に多段技未付与。 | **根拠がある範囲は統合済み** |
| 21 | 原作ルール一致度 | **21A/B:** 3秒回転制限・ゲスト拒否。**21C:** 94行速度表＋初手比較器（原作同着は未完）。**21D-A/B:** 妖気24条件と矛盾分析。**21D-C1/C2:** 正規ホストつつく/12体妖気観測。**21D-C3:** 2014年通信対戦の「妖気を奪われたあと必殺」記録と2020年の連続吸収/複数必殺の戦術編成を確認（どちらも数値未取得）。 | 妖気受取先・回収量・発生確率を元の対人映像で照合し、数値が固まるまで通常版へ追加しない | **原作PvP定性資料と研究試験あり／数値未検証** |
| 22 | 原作PvP深層戦術 | Phase5ノーモーション・回転・カウンターの独立研究。**22A:** 仮妖気回収による研究用連射。**22B:** 正規ホスト4種チャージ/G技。**22C:** ゲストACKとChrome Firebaseローカル2席6タップの同期PASS。**22D-A/B:** 2我慢のcut-in回転例外は原作ロック時刻を未確定とし仮HPを止めた。cut-in中の前衛候補と仮想時刻64記録、3回以上回転との二重原因保持、2015年の両視点ノーモーション実験候補映像を特定。Node463/463、Chromeステージ・Firebase Emulator 2席PASS | **22D-C:** 2015年両視点映像から同期したフレーム時刻が実測できるときにだけ反映。2我慢例外の回転中ロック時刻、3回以上回転と追加効果は未定。Phase23/24旧iPad Safari実機・Google Sites直接コード貼り付け | **定性資料・研究診断・ブラウザ通信QA済／3DS実フレームと本番公開未検証** |
| 23 | 本番向け1vs1同期 | Firebase Auth+RTDB **ローカルエミュレーター2Chrome成功**、33権限チェック、必殺6タップ/途中ACK/最終ACK。**23A:** 断線中の未送信入力FIFO破棄、送信済み1件のみ同じclientSeqで再送、実SDKのオフライン→再接続確認。**23B:** ホストで入力を処理したがsnapshot publishが失敗した場合、ゲスト再送のみではACK復旧不可と判明。ホストがdirtyな権威状態を復帰時/手動で再publish可能。注入失敗→ACK復旧、120自動ターン非同期書込集約、ゲスト91連番ストレス、Emulatorテストのリモートrevision待ち修正。Node469/469、実Chrome FirebaseエミュレーターPASS | **23C:** 本物の2ブラウザChrome＋実Firebase Emulator上でホストpublishの失敗/復帰を意図的に再現するQA。Phase24: 学校旧iPad Safari/Google Sites直接コード埋め込みの2実機最終ゲート | **試験環境の短期断線・権威ACK復旧パスはある／本番Firebase・旧iPad実機未試験** |
| 24 | 学校iPad・配布 | 上下画面、指サークル、低負荷の原形 | **学校iPad実機Safari・Google Sites単一HTML直貼り・2端末実戦** | **未完成** |

## 3. 今回した作業（Phase23-B／2026-10-25）
**全体のどこ:** 原作の行動・必殺（Phase21/22）→ 実装済み正規`engine/match-protocol.mjs` → **Phase23のFirebase Auth/RTDB非同期publish/ゲストACKの信頼性** → Phase24学校旧iPad Safari・Google SitesへHTML/CSS/JSを**直接コード埋込**。研究用演出時間を通常ルールへ導入しない。

**見つけた問題:** ホストがゲスト入力を正しく処理しても、Firebaseへの`publishSnapshot`だけ失敗するとゲストACKが来ない。ゲストは安全な同じ`clientSeq`で再送できるが、ホストは重複を除外するため、**ゲスト再送だけでは保存できなかった戦況が復活しない**。`createFirebaseMatchHost`には`dirty`/`retryPublish()`が元からあるのに、画面から呼べなかった。別件でFirebase Emulatorのホスト再起動拒否テストが、リモートへの**非同期保存完了より前のローカルrevision**を比較して不安定になっていた。

**今回修正した実装:** `lab/firebase-match-stage.html`のpresenceが未接続→2席オンラインに回復したとき、ホストの`dirty`が残っていれば最新の**権威戦況だけを再publish**（コマンド・妖気・HPを再実行しない）。従来の「未確定入力を再送」ボタンはゲストなら従来の同一seq再送、ホストなら「未反映の戦況を再送」で残ったdirty snapshotを発行する役割に分岐。通信エラー時も正規2席に戻るまで操作禁止。正規PvPの戦闘・原作未確定値は無変更。

**テスト追加3件:** `tests/firebase-match.test.mjs`に(1)一時snapshot書込失敗→ゲストはpending→同一入力再送でもホスト二重実行0→ホスト`retryPublish`後だけACKが復活、(2)一件のpublishを意図的に遅延している間に**120回の正規自動行動**を実行、最新revision121へまとめて追いつく、(3)ACKを一時遮断してゲストから**91個の連番入力**（初回+待機90）を送信、順番維持・重複なし・Journal再現一致。**[Node469/469＋研究Chrome PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40158741443)**。

**Firebase E2E修正:** `tests/firebase-room-emulator.cjs`でホスト内部revisionを即リモート版と比較していたのを、`lastPublished`・ゲストrevision・実`readPublishedSnapshot`が追いつくまで待機した後に新しいホストを拒否する検証へ変更。実際の[旧失敗](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40158597297)は「remote6 vs in-memory7」の非同期テスト競合。[**修正後のFirebaseエミュレーター研究QA PASS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40158699516)。`.github/workflows/phase14-firebase-browser.yml`で`tests/firebase-room-emulator.cjs`/ゲスト橋テスト変更も**実Chrome2席QAを再実行**するようにした。[**最終Chrome 2席/エミュレーター PASS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40158741445)。研究画面/4チャージ/指操作[ChromeステージもPASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40158741435)。

**詳しい検証記録:** [Phase23-Bホストpublish復旧・120回行動・91件FIFO・Emulator QA修正](./PHASE23B_HOST_PUBLISH_RECOVERY_LONG_SYNC_20261025.md)。

**証明範囲:** **120回自動行動/91件入力は注入遅延を含むNode上の試験**であり、実旧iPad Safariで長時間試遊したとは言わない。Chrome2席はローカルFirebase Auth/RTDBエミュレーター。**本番Firebaseクラウド・Google Sites HTMLコード直接貼付・原作3DSフレーム**は未確認。

**変更先・君の操作:** GitHub開発ブランチ`feat/phase1-action-circle-lab-20261023`の研究ブラウザ画面・テスト/CI・docsだけ。main、学校Googleサイト公開版、本番Firebase、料金、閃光魂初期OFF方針は一切変更なし。君の操作不要。

## 4. 次にする作業（23C→24、22D原作比較残）
1. **23C:** Firebase Emulator＋2Chromeでホストの状態publish失敗を強制的に再現し、dirty再配信・ゲストACK・二重入力防止を実DOMで受入。ネットワーク速度/物理iPadの挙動とは区別。
2. **24:** 旧iPad Safariでの上下2画面、指タップ・サークル回転・低メモリ挙動、2席ルーム通信。Google Sitesへの単一HTML/CSS/JS**直接コード埋め込み**の実装・ビルドゲートが必要。GitHub Pages iframeでは代替しない。
3. **22D:** ノーモーションの2015年の2視点原作映像の両方のフレームを同期取得できるときだけ切替時刻を照合。仮の800/500msやカウンター未確定対象は研究用のまま。
4. **21D:** 零式つつくの妖気回収量/受取先、攻撃/妖術によるSoul回復数値は元3DS実測なしに標準版へ採用しない。

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
