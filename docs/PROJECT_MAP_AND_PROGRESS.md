# 妖怪対戦ブラウザゲーム｜設計全体図・現在地・次の一手（単一の進捗入口）

更新: 2026-10-25 JST
Repository: https://github.com/8mahi8/yokai-battle-lab
Development branch: `feat/phase1-action-circle-lab-20261023`
**現在（2026-10-25）:** 原作検証可能な戦闘エンジンとゲスト4種必殺/ACK（Phase20-22）、ローカルFirebase Auth+RTDBの2席再送/切断同期（Phase23）、Google Sitesへ直貼りする単一HTMLのオフライン/オンライン試遊（Phase24A/B）、ホスト仮テンポ自動進行と狭いiframeのChrome QA（Phase24C1/C2）は既存の研究スコープでテスト済み。**Phase24C3:** 新Firebaseプロジェクトは作らず、BRAWL/小国戦線IIIの既存`mygame-df915`とRTDBを共有し、妖怪ゲームは`/yokaiRoomsV1`で分離。プレイヤーはログイン操作不要で内部の匿名Authを継続。既存Rulesのパスを保持するオフラインRules統合プレビュー、Node484件＋Firebase Emulator合成共有Rules16条件がPASS。**今回Phase24C4:** ownerが後から取得する実Web config/現行Rules/匿名Auth有効状態を**Firebaseへ接続せず**照合する`tools/audit-shared-firebase-setup.mjs`を新規作成し、結果から公開用Web設定や既存Rules全文を漏らさない。GitHub誤コミット防止の`.gitignore`、新規7テストを追加。**[Node491/491 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40183151850)**。同じFirebaseの本番Rules/Web config/Anonymous有効状態はまだ取得できておらず、実クラウド接続・ルール変更・Google Sites編集・学校旧iPad Safariは未検証。次は本人確認できるWeb config/RTDB Rules/匿名Auth状態を読取で取得し、既存ゲームのルールと矛盾がないかをローカルで検査してからGoogle Sites実機ゲート。
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

## 3. 今回した作業（Phase24-C4／2026-10-25）

**全体設計のどこ:** 原作再現済み範囲の`engine/*` → ホスト権威・RTDBの`network/firebase-match.mjs` → Google Sitesの単一HTML2席・仮自動進行（Phase24A/B/C1）→ 旧Safari画面幅・タッチ（C2）→ 既存Firebaseの共用Rules統合（C3）→ **既存Firebaseの現行設定を非公開・無通信で監査し安全な試遊への準備をするフェーズ（今回C4）** → 本物のFirebase/Google Sites/学校旧iPad2台。

**今回した作業:** `tools/audit-shared-firebase-setup.mjs` を新規作成。後から本人がFirebase Consoleで確認できるWeb設定（Web appの`apiKey/authDomain/projectId/appId/databaseURL`）、現行RTDB Rules JSON、Anonymous Auth有効/無効/未確認を**ローカルだけ**で照合。`mygame-df915`以外のプロジェクトURL・認証ドメイン、広く許可する親Rules、同一ルートの競合、匿名Auth未確認をブロックし、`previewSharedRules()`の安全な子パス統合可否を確認。**実Firebaseへアクセスせず、Web設定キーや既存Rules全文を出力に含めない**。検証が全PASSでも`safeToDeploy:false`と`owner_review_required`を維持し、自動デプロイは絶対しない。さらにGitHubの`.gitignore`を作り、`private/`、オーナーのRules Export/Review、`*.local.firebase.json`、`.env*`、HTML生成物などをコミット対象から除外。

**検証:** `tests/shared-firebase-setup-audit.test.mjs`の新規7件は、架空Web configでの正常照合、別Firebase・不正RTDBホストの拒否、匿名Auth不明/無効、親Rules許可/ルート衝突の検出、ファイル無し安全拒否、ログ秘匿性、入力ファイル不変更を確認。**[研究・通信のNode全491件成功 #40183151850](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40183151850)**（旧484件＋新規7件）。既存のAuth+RTDB Emulator2席、JavaScript原作風画面操作のCIも保持。今回の検証は**本物の`mygame-df915`へ接続したものではない**。

**資料:** [Phase24-C4 本番Firebase前のローカル専用診断・owner確認の順路](./PHASE24C4_SHARED_FIREBASE_READINESS_20261025.md)。実Firebase Console画面では`Authentication → Sign-in method → Anonymous`が有効か確認、`Realtime Database → Rules`の現状をコピー、`Project settings → General → Your apps → Web App Config`を確認する。**読取だけ**でRulesのPublish/匿名ログインのEnableボタンは押さない。現行ルートが広い権限なら`yokaiRoomsV1`で独立した制限が効かないため、公開してから直すのではなく事前再設計する（[Firebase公式の親Rules継承仕様](https://firebase.google.com/docs/rules/rules-behavior)）。

**今回のユーザー操作:** まだ不要。実Rules/匿名Auth画面の確認は現物が必要になった段階で必要最小限の操作をまとめてお願いする。新規Firebaseプロジェクトや課金変更は不要。

**変更先:** GitHub`feat/phase1-action-circle-lab-20261023`のみ。main、現行学校Googleサイト版、本番Firebase/Auth/Rules、BRAWL、小国戦線III、料金は全て未変更。

## 4. 次にする作業（Phase24-C5／実Firebaseと学校試遊）

1. **既存`mygame-df915`を読む:** オーナーから現在のRTDB Rules JSON・Web App Config・Anonymous providerの有効状態を取得。GitHubに公開せず、一度だけローカル監査して広い親read/writeなどがないことを確認し、既存BRAWL/小国戦線のルールを保持。実Rulesを合成Firebase Emulatorで試験した結果がPASSしてから実利用案を最終提案。既存ルールに広い親権限があるなら無理に子のAuthルールを追加しない。
2. **本当のクラウドとSites配布:** owner承認後にだけ`mygame-df915`の必要な設定を変更。APIキー/公開Web configを使用したGoogle Sites用単一HTMLを作成するが、学内Google Sitesの公開は本人が貼付する。
3. **学校旧iPad Safari2台の受入:** 6桁部屋、匿名Auth、4コマンド、メダル輪、チャージ、ホスト自動進行、通信断/復帰、狭い埋込枠と描画ラグを実端末で試す。
4. **原作忠実性:** 1.5秒は仮テンポで未測定、ノーモーション/2我慢カウンター/零式つつく妖気数値を推測で標準実装に入れない。初期閃光魂無しの方針を維持。

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
