# 妖怪対戦ブラウザゲーム｜設計全体図・現在地・次の一手（単一の進捗入口）

更新: 2026-10-25 JST
Repository: https://github.com/8mahi8/yokai-battle-lab
Development branch: `feat/phase1-action-circle-lab-20261023`
**現在（2026-10-25）:** Phase20–22で根拠のある本家戦闘処理/4種の必殺操作・ゲストACKは正規2席へ実装。Phase23で切断・順序/再送・ホストdirty再配信のFirebase Emulator2席QA成功。Phase24A/BでGoogle Sitesへコード直接貼付の単一HTMLオフライン/オンラインを作成し、オンライン版はローカルFirebase Emulatorの2つのChrome iframeでゲームルーム/操作/ACK/断線復帰PASS。Phase24C1はホストだけが有効化する仮テンポ1500msの自動進行と切断/非表示/未publish時の一時停止を検証。Phase24C2は狭い埋込枠4サイズの操作ヒット、旧Safariの基本機能事前診断を検証。**今回Phase24C3:** 本人委任で**プレイヤー操作ゼロのFirebase匿名認証を継続採用**し、BRAWL/小国戦線IIIが既に使う**同じ`mygame-df915`のRTDBを共用**する（新プロジェクト不要）。ゲームの保存先は別の`/yokaiRoomsV1`。ただし既存RTDB Rulesを上書きせず統合する必要があるため、現行RulesのJSONを後から安全に読み取って**子ノードだけ追加するオフライン専用マージプレビュー**を実装。親`.read/.write`に許可され得るルールやroot wildcardがあれば停止。**[Node484/484成功](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40179904769)、[合成共有Rules16項目＋既存33項目/Chrome2席Firebase Emulator PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40179904784)**。実`mygame-df915`のRules/Auth/Web app構成/クラウドには未接続・未変更。Google Sites実編集、学校旧iPad Safari物理2端末、原作未測定の技/時間は引き続き未検証。
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
| 24 | 学校iPad・Google Sites直接埋込配布 | **24A/B:** 1ファイル貼付のオフライン/オンラインHTML、Firebase Auth+RTDB Emulatorと2Chrome iframeで実2席/権威ACK/断線復帰PASS。**24C1:** ホスト明示ONの仮テンポ自動進行、未接続/バックグラウンド/未publish時停止。**24C2:** 1024/820/568/390pxの狭いChrome埋込枠で4コマンド/輪の表示・実tapヒット、旧SafariのSecure Context/Pointer Events/Web Crypto/TextEncoder事前診断。**24C3:** 共用プロジェクト`mygame-df915`＋独立パス`yokaiRoomsV1`・匿名認証維持を決定。現在のRulesを後で読み込んで旧ゲームを保持した新JSONだけを生成するオフラインプレビュー追加。親read/write grant・wildcard衝突を保守的に拒否。Node484/484、合成共有Rules+Auth/RTDB実Emulator16権限チェック＋既存33チェック、Chrome本家UI/チャージともPASS | **次:** `mygame-df915`実Rules・Anonymous Auth状態・Web公開設定を確認し、既存ゲームを壊さない統合方法を合意してからHTMLビルド。学校旧iPad Safari2台/Google Sites編集画面で最終試遊。原作技タイミング数値は未確定のまま維持 | **ローカルコード・合成Rules・2Chrome QAまでPASS／実Firebase/本物のGoogle Sites/旧Safari実機は未試験** |

## 3. 今回した作業（Phase24-C3／2026-10-25）

**全体設計のどこ:** 原作研究エンジン（Phase20–22）→ ホスト権威・Firebase Room/Authと再送（Phase23）→ 単一HTMLのGoogle Sitesオンライン2席（Phase24A/B/C1）→ 旧Safari UI/タッチ検証（Phase24C2）→ **既存RTDB共有とプレイヤー操作不要の匿名Authを非破壊Rulesで両立する準備（今回C3）** → 本物のRTDB/Google Sites/学校旧iPad受入（次）。

**今回の方針決定:** ユーザーから匿名Authの採否を委任。Firebase Auth`signInAnonymously()`を現行コードのまま維持。BRAWL/小国戦線IIIは共用の`mygame-df915` RTDBを使い、妖怪対戦はすでに独立の`/yokaiRoomsV1`を使用する。**新Firebaseプロジェクトは不要**。ただし親の`.read/.write`に許可を与えている既存Rulesでは、子の匿名Auth専用`.read/.write`が安全な制限として効かない（[公式Firebase文書](https://firebase.google.com/docs/rules/rules-behavior#realtime_database)）。**本番の現行Rulesを見るまでは安全確認済みとしない。**

**今回の実装:** `tools/preview-shared-rtdb-rules.mjs`を新規追加。Firebase管理画面等で後から得られる**現行RulesをJSONファイルとして読み込むだけ**で、元のBRAWL/小国戦線データ権限を一切書き換えず、`yokaiRoomsV1`用ルールだけ加えた**別ファイル**を安全レビュー用に生成する。親で許可され得るread/write、未レビューのwildcard、親validateや既存`yokaiRoomsV1`衝突があれば自動拒否。**クラウドAPI、実Rules配備、認証設定変更、課金は0**。ソースファイルも生成物も上書き禁止。

**根拠と自動QA:** 新規`tests/shared-firebase-rules-merge.test.mjs`5件は旧ゲームRulesの保持・広い親許可の拒否・wildcard/validation衝突の拒否・元Rulesファイルの不変更を検証。さらに`tests/firebase-shared-rules-emulator.cjs`を追加し、本物の**ローカルAuth+RTDB Emulator**上で合成のBRAWL/小国戦線相当の従来の許可を保ちつつ、匿名Authで妖怪戦のホスト/ゲストだけが書込でき第三者は偽装できない**16項目**を検証。先行のEmulator試験と重複するルーム番号を分けた。**[Node484/484](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40179904769)、[合成共有Rules16検査＋従来33検査＋Chrome2席/必殺チャージの最終run](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40179904784) は全成功。** デモRulesを本番へ丸ごと上書きすることは禁止。

**詳細記録:** [Phase24-C3 既存Firebase共用・匿名Auth/Rules非破壊マージの受入](./PHASE24C3_SHARED_ANONYMOUS_AUTH_RULES_REVIEW_20261025.md)。

**本人の出番:** **現段階では不要**。本番ルールとWeb app公開構成の確認/配布段階で、本人が既存Firebase Consoleの現行設定を共有する操作が必要になる可能性がある。そのとき具体的に一回の操作を頼む。新しいFirebaseプロジェクト・契約は不要。

**変更先:** `feat/phase1-action-circle-lab-20261023`の開発ブランチのみ。`main`、現在の学校Google Sites版、既存Firebase/Rules/Auth、他ゲームのコード、料金は未変更。

## 4. 次にする作業（Phase24-C4／本物の学校ゲート）

1. **既存Firebaseの状態確認:** 共用`mygame-df915`について、公開用Web app設定（`apiKey`/`authDomain`/`appId`/`databaseURL`）、匿名Authの有効/無効、**現在のRTDB Security Rules**の3点を確定する。既存BRAWL/小国戦線の保存先と現在のアクセスを絶対変更しない。既存ルートで広く許可していて厳格なルールを子に追加できない場合は、危険なルールを強制配布せず構成を再検討。
2. **承認済みクラウドビルドとGoogle Sites実貼付:** 正しい公開Web設定と整合するRulesが用意されて初めて、現行`tools/build-sites-online.mjs`でFirebase接続済み直接貼付HTMLを生成する。Google Sitesの公開版は本人が貼付した場合のみ変更。
3. **学校旧iPad Safari 2台で試遊:** 同じ6桁部屋/メダル/4コマンド/指ジェスチャー/匿名Auth/自動行動/バックグラウンド停止/回線復帰、表示のスクロールや遅延/負荷を確認する。
4. **原作研究は平行継続:** 1.5秒の仮行動テンポ、零式の妖気取得先/量、ノーモーション・2我慢回転の原作フレームを未測定のまま正規へ混入しない。初期閃光魂は無し。

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
