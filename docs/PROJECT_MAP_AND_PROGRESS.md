# 妖怪対戦ブラウザゲーム｜設計全体図・現在地・次の一手（単一の進捗入口）

更新: 2026-10-25 JST
Repository: https://github.com/8mahi8/yokai-battle-lab
Development branch: `feat/phase1-action-circle-lab-20261023`
**最新の現在地（2026-10-25再監査）:** [再監査済み正式引き継ぎ](./HANDOFF_VERIFIED_20261025.md)。開発は**Phase25（Supabase 1vs1 / 学校Google Sites用HTML）**。HEAD `7bfc083b7b3de677744aabffa80ad891a4c4488a`で[Node497/497 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40195497455)、[Chromium戦闘画面・指操作PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40195497517)、[実Supabase・同一Chromium内2 iframeの匿名認証/部屋/操作ACK/自動行動・4画面幅E2E PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40195497511)。旧`Anonymous sign-ins are disabled`は過去の失敗であり現在のブロッカーではない。学校実Google Sites・旧iPad Safari2端末の試遊、原作3DSとの定量一致、通信の長時間復帰は**未検証**。実DBは4表ともRLS有効で、Security Advisor最新取得は**5 WARN**（匿名認証に関係する4件・漏えいパスワード保護OFF 1件）なので過去の「0件」を現況と混同しない。ゲームテスト用の残存行あり。学校Googleサイト版・GitHub `main`・本番Firebaseは今回無変更。原作再現を独自改善より優先する方針は不変。
> **重複実装防止の必読資料**: [Phase1〜25 既存成果の再利用マトリクス・次の作業計画](./REUSE_MATRIX_AND_NEXT_PLAN_20261025.md)。新作業の前に対応コード・既存テスト・原作未確定点を照合し、研究済み機能を別名で作り直さない。

> **Phase21D-B3 妖気研究の最新差分（2026-10-25）**：[名前付き特殊技4件・元資料の不確実性・新6テスト](./PHASE21D_B3_NAMED_SPECIAL_RECHARGE_20261025.md)。既存の24観測値・Soul回復の通常ホスト規則は維持。**Node503/503 PASS**（[実行ログ](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40201933897)）。予測に必要な上限値が原文で「?」の3体は未確認のまま。第1段階の妖気回復・零式つつくの定量原作一致は引き続き未完成。今回の変更は研究モジュール・テスト・資料だけで、Supabase/Gサイト/`main`に変更なし。\n\n> **原作妖気研究 Phase21D-B4（2026-10-25）**: [原作資料・攻撃と妖術の妖気比較・残された実測ゲート](./PHASE21D_B4_ATTACK_SOUL_BONUS_AUDIT_20261025.md)。攻略資料の「サボり/悪いとりつき中の相手への攻撃で妖気増加」は定性的情報のみ。既存`engine/phase21d-soul-observation.mjs`に**同一条件2観測の比較器**を追加。新10テストを含め[Node513/513 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40202609186)、[Chromiumステージ・実指操作PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40202609177)。原作の攻撃/妖術の回復ポイントは引き続き未確定。**正規オンラインのSoul計算・Supabase設定/DB・Googleサイト版・`main`は変更しない。**

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
| 23 | 本番向け1vs1同期 | Firebase Auth+RTDB **ローカルエミュレーター2Chrome**、33権限チェック・必殺6タップACK、23Aのオフライン古い操作FIFO破棄と同一番号再送、23Bの権威dirty再publish・120行動書込集約・91入力順序検証。**23C:** 実Chrome2席で研究ホストアダプタに一度だけpublish故障注入。ゲストの本物の輪操作はホスト内部1回だけ実行され、未配信間はゲスト画面が進まず、同番号再送でも二重回転せず、ホスト再配信ボタンで同じrevisionを公開するとゲストの前衛・ACKが追いつく。Node469/469、Chrome2席Firebase QA PASS | **Phase24-A:** Google Sites HTML/CSS/JSを直接貼るためのバンドルとSafari互換ゲート。実クラウド/学校2端末での長時間ネットワーク・負荷検証は未実施。22D原作フレーム調査は別途継続 | **研究アダプタ故障注入→実Chrome2席ACK復旧 PASS／物理iPad・本番Firebaseは未検証** |
| 24 | 学校iPad・Google Sites直接埋込配布 | **24A/B:** CSS/JSとホスト/ゲストRTDB通信を直貼りHTMLへバンドル、Chrome2iframe+Firebase Auth/RTDB Emulatorで実2席ルーム/輪/チャージ/ACK/断線復帰PASS。**24C1/C2:** ホストのみ自動行動ON（1500ms仮間隔、断線/画面非表示/未publish時停止）、Chrome iframeの横幅1024/820/568/390pxで上下画面・実タップヒットPASS、旧Safari最低機能を開始前に検査。**24C3:** 既存`mygame-df915`を共用、`/yokaiRoomsV1`のみ別ルート・匿名Authはプレイヤーに操作不要のまま採用。合成共有Rulesの16条件をFirebase EmulatorでPASS。**24C4:** Web config/現行Rules/匿名Authオーナー申告を無通信で監査するツール新設、広い親RTDB権限や別プロジェクト設定をブロック、APIキー・Rulesをログへ出さず、共有Firebase設定の誤コミットを除外。Node491/491 PASS | **次:** 既存Firebase ConsoleでWeb config/匿名Authの有無と**現行RTDB Rules**を読み取り確認、出力した案をローカルエミュレーターで事前検証（実Rulesのデプロイは別承認）。実Google Sites編集/学校iPad Safari 2台で実験。原作未確定テンポ/技効果は別途研究 | **ローカルの既存プロジェクト照合器・Chrome2席QAはPASS／本番Firebase・実Google Sites・旧iPad Safariは未検証** |
| 25 | Supabase本命・実クラウド1vs1基盤 | 開発ブランチの戦闘engineを再利用、4つの`yw_*`表/RLS/host guest分離、約175KBの直貼りHTML生成。**Node497/497、Chrome研究UI・本番Supabase 2 iframe E2EすべてPASS**。過去の匿名Auth OFF障害は解消を観測 | **残:** 実Google Sites・学校旧iPad Safari2席・長時間切断復帰・原作3DS技値/妖気/フレーム照合。クラウドQAの残存テスト部屋は勝手に消さず後片付け設計。Advisor5 WARNは匿名運用を考慮して別途レビュー | **ブラウザクラウドE2EはPASS／学校実機・原作一致は未検証** |

## 3. 今回した作業（Phase25再監査・2026-10-25）

**全体設計のどこ:** 原作研究→`engine/match-protocol.mjs`（ホスト権威）→`network/supabase-room.mjs`（本番通信）→`ui/match-stage.mjs`（上下2画面）→Google Sites直接HTML貼り→学校旧iPad Safari試遊。

**確認した事実:** 正規開発ブランチの実ファイル・GitHub Actions最新ログ・実Supabaseプロジェクト状態を再照合。497件のNodeとChromium UI・ポインタ操作PASS、実Supabase匿名Authを使った2 iframeオンライン操作同期PASS。4表RLS有効、Project ACTIVE_HEALTHY。Supabase Security Advisorは最新**5 WARN**。2 room / 2 state / 2 input / 4 presenceのテスト行が残る（読み取り専用集計）。旧文書の「Auth disabled」「警告0」「495 tests」「クラウド対戦未実施」は現状を表していない。詳細とリンクは[再監査済み正式引き継ぎ](./HANDOFF_VERIFIED_20261025.md)。

**実施していないこと:** 学校実Google Sites/旧iPad Safariでの1vs1、原作3DSと完全一致する戦闘検証、長時間通信保証。今回GitHub文書を更新する以外、戦闘コード/Google Sites本番/Supabase DBやAuth/Firebase/mainを変更しない。

## 4. 次にする作業（Phase25以降）

1. **担当AIの仕事:** 原作再現の未確定領域（ノーモーション必殺、妖気量・受取先、同値行動順、カウンター/2我慢、技別数値）を既存資料と外部根拠から再検証。新機能の前に既存研究を検索してから原作との比較テストを増やす。
2. **担当AIの仕事:** 実Supabase 2 iframe E2E成功を基準に、通信切断/復帰・長時間操作・試験部屋クリーンアップと旧Safari最低機能を検証する。現DBのテスト行を無確認で削除しない。最新Advisor警告を匿名サインイン前提とパスワード認証部分に分類して扱う。
3. **本人の出番（後段）:** 学校の旧iPad実機で試せるだけのHTML/手順/ブラウザQAを担当AI側で整えてから、Google Sites「コードを埋め込む」へ全文を貼り、友達と旧Safari2席の操作・同期・ラグを確認してもらう。**今は本人にAuth設定操作を頼まない。**
4. **現在の変更先:** GitHub開発ブランチの引き継ぎ文書のみ。`main`・Googleサイト版・既存Firebase・Supabase DB・他のゲームは変更しない。

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
