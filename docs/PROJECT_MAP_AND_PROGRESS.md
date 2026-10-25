# 妖怪対戦ブラウザゲーム｜設計全体図・現在地・次の一手（単一の進捗入口）

更新: 2026-10-25 JST
Repository: https://github.com/8mahi8/yokai-battle-lab
Development branch: `feat/phase1-action-circle-lab-20261023`
**現在（2026-10-25）:** 学校旧iPad Safari・Google Sitesコード直貼りの1vs1を、まず原作寄せで再現する目標は不変。Phase20-22エンジン/必殺/ACK、Phase23 Firebase Auth/RTDB Emulatorの通信復旧、Phase24の直接貼付用HTML/仮自動進行/Chrome多画面幅操作試験は引継ぎ済み。**今回のPhase25:** ユーザー許可でSupabaseを今後の**本命通信基盤**に選び、既存のSupabase Free `3d-soccer-online` に**妖怪専用の`yw_rooms_v1`/`yw_states_v1`/`yw_inputs_v1`/`yw_presence_v1`テーブルを実作成**、RLS/ゲスト座席取得トリガー/権威revision更新フェンスを適用。Supabase Security Advisorの警告0件。GitHubにSupabase版ルームadapterと既存原作UI・2席engineをつないだコード、**Google Sitesへ全文直貼り可能な約175KB単一HTMLビルダー**を追加。[Node495/495 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40192833077)＆[Supabase HTML生成CI PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40192833057)。**ただし実クラウド2席の初回QAは`Anonymous sign-ins are disabled`で認証段階から先へ進めなかった**（[実Supabase Auth試験 #40192624538](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40192624538)）。本物のルーム/戦況/操作データは生成していない。Supabase接続プラグインからAnonymousプロバイダーを有効化するAPIが提供されていないため、**本人がDashboardのAnonymous Sign-Insを一度有効化する必要がある**。これを受けてから本番クラウド2席QA→学校Google Sites/旧iPad試遊へ進む。Firebase版・`main`・学校公開版・3Dフットサル既存テーブルは変更なし。詳細[Phase25の実装と未完境界](./PHASE25_SUPABASE_HANDOFF_20261025.md)。
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
| 25 | Supabaseを本命とする実DB・オンライン通信 | **実Supabase Free既存project`itqimlgnrjikaamstdlp`へ反映:** `yw_rooms_v1`,`yw_states_v1`,`yw_inputs_v1`,`yw_presence_v1`の4表/RLS/宿主guest UID検証/row-level更新フェンス。安全警告0件。**GitHub:** `network/supabase-room.mjs`、`lab/sites-embed-supabase-entry.mjs`、`tools/build-sites-supabase.mjs`、独立単一HTML生成（約175KB）、ゲームエンジンとACKを再利用。Node495件＋GitHub HTMLビルドQA PASS。SQLトランザクションで模擬authenticated host/guest RLS通過→ROLLBACK済 | **残件:** Project AuthのAnonymous Sign-Insが無効。実クラウドAuth QAで明示エラー。本人がproviderをEnable→再度実2席クラウドRoom/ACK/auto検証→Google Sites直接貼付/旧学校iPad Safariでラグ・操作最終試遊 | **Supabaseテーブル＆RLS/HTML作成までは完了／実クラウド2席未合格（匿名Auth設定が障害）** |

## 3. 今回した作業（Phase25／2026-10-25）

**全体設計のどこ:** 原作資料→`engine/match-protocol.mjs`でホスト権威の1vs1→**実ネットワークバックエンドをSupabaseへ切替（今回）**→同じ`ui/match-stage.mjs`の上下画面と4コマンド→Google Sites「コードを埋め込む」→学校旧iPad Safari/友達と2端末試遊。

**実作業:** 本人から「普通に動く前提で作っていい」と委任を受け、研究版のFirebaseから**新しい主軸Supabase**への移行コードをGitHub dev branchに追加。Supabase既存Free `3d-soccer-online`のDBに4つの`yw_*`専用テーブル/アクセス権/RLS/hostguest更新フェンスを**実適用**。既存のサッカー関連テーブルを上書きしていない。最初のSECURITY DEFINER RPCがSecurity Advisorで1警告となったため、**削除してRLS＋SECURITY INVOKERトリガーへ変更後、Advisor警告0件**を再確認。`network/supabase-room.mjs`は2席room/session/host state/revision/guest intent/seq/presenceとRealtime＋poll fallbackを実装。`lab/sites-embed-supabase-entry.mjs`は従来の戦闘stageと自動行動を再利用。`tools/build-sites-supabase.mjs`は未設定の安全HTMLまたは**設定済み単一オンラインHTML約175KB**を生成（CDNはPinned Supabase JS1件、キーは公開用`sb_publishable_`のみ）。

**自動試験:** [495/495のNodeテスト](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40192833077)に合格。[Google Sites用Supabase単一HTML生成とpublishable key監査 #40192833057](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40192833057)合格。実Supabaseで`authenticated`相当のホスト/ゲストUIDに設定したSQL単一TransactionでRoom→Guest取得→Start→Snapshot→Guest入力を書き、**ROLLBACKして試験データ0行**を確認。**これは実Authサインイン成功の証拠ではない**。

**未完・障害:** 実Supabase2席の初回GitHub Actionで[**`Anonymous sign-ins are disabled`**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40192624538)を確認。SDKの匿名ログイン開始段階で止まるので、Google Sites/旧Safariで実利用可能とまだ言えない。既存Supabaseプラグインの操作一覧に**Auth Anonymousを有効化する機能はない**。本人がDashboard `3d-soccer-online → Authentication → Sign In / Providers → Anonymous Sign-Ins → Enable`の1設定を有効にする必要がある。料金プラン変更や新Project作成は不要。**本人が有効にしたとは仮定しない。** その後同じ2席実クラウドQAを回してから学校配布判定。

**詳細:** [Phase25 Supabaseで新たに作成したもの・実Authの未合格理由](./PHASE25_SUPABASE_HANDOFF_20261025.md)

**変更先:** GitHub `feat/phase1-action-circle-lab-20261023` ＋既存Supabase`3d-soccer-online`の**妖怪用4表/RLS/トリガー**。**Firebase、本番Google Sites、GitHub main、3Dサッカー用データ、課金には変更なし**。

## 4. 次にする作業（Phase25-B/学校実機ゲート）

1. **必須の1手:** Supabaseダッシュボードで`3d-soccer-online`の匿名サインイン機能を有効化。SupabaseプラグインにこのAuth設定編集機能がないため君の操作が必要。**新しいSupabaseプロジェクト・料金追加不要**。
2. **僕の仕事:** 実クラウドでホスト/ゲスト匿名Auth、6桁ルーム/ゲストclaim、RLS、操作ACK、ホスト自動行動と切断・復帰をテスト。成功したのちに開発ブランチのコードを再レビューし、学校用貼付HTMLを完成と判断する。テスト用ルームはクリーンアップする。
3. **学校本人の試遊:** `sites-supabase-online-code.html`の全文をGoogle Sites「コードを埋め込む」へ**直接**貼り、古いiPad Safari2席で指タッチ・輪回転/技チャージ/ラグ/同期/描画を確認。GitHub Pages iframe URLでの公開ではない。
4. **元3DS技とテンポ:** 1500ms自動行動は仮テンポ、カウンター/ノーモーション/零式妖気数値は未確定のまま。閃光魂初期オフも維持。Firebase版はバックアップとして保管。

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
