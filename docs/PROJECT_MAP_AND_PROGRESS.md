# 妖怪対戦ブラウザゲーム｜設計全体図・現在地・次の一手（単一の進捗入口）

更新: 2026-10-25 JST
Repository: https://github.com/8mahi8/yokai-battle-lab
Development branch: `feat/phase1-action-circle-lab-20261023`
**現在（2026-10-25）:** Phase20/21の根拠ある原作操作とPhase22B/Cの4種必殺/ゲストACKは正規2席へ実装。Phase23A/B/CでFirebaseローカル2席の通信断/古いFIFO破棄/ホストdirty再配信/ACK復旧を検証。Phase24A/BでGoogle Sites「コードを埋め込む」用の単一HTML（オフライン/オンライン）を実装、オンラインは設定無しでクラウド接続しない版・localhost限定Firebase Emulator版・明示承認を要する実クラウド設定版を分離。Phase24C1でホスト明示ONの研究用自動進行（1500ms仮値、断線/非表示/未保存時一時停止）をChrome2席で検証。**今回Phase24C2-Aでは、生成された実オンラインHTMLをChromiumのiframe.srcdocで横幅1024/820/568/390pxに縮め、上下画面・輪・4コマンドの視認性、横方向はみ出し無し、実要素ヒットテストに全合格。旧SafariのPointer Events/安全HTTPS/暗号用乱数/TextEncoderをFirebase Auth開始前にチェックし、不足時に理由を日本語表示する機構を追加。[Node479/479 #40176060547](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40176060547)、[Chrome2席ローカルFirebase＋4画面幅 #40176060551](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40176060551)とも成功。**本物の学校iPad Safari、Google Sites実編集画面への貼付、実クラウドFirebase、原作未確定値は依然未検証。次は本人が許可したFirebase実接続と物理iPad 2台での受入ゲート。
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
| 24 | 学校iPad・Google Sites直接埋込配布 | **24A/B:** 研究用一台オフラインと2席Firebaseオンラインを単一HTML化。未設定/localhost Emulator/本人承認済みクラウドの安全3モード。**24C1:** ホストのみ明示ONの自動進行、接続中・画面前面・Firebase最新publish済み/未勝敗時のみ1500ms仮テンポで実行、断線・非表示・未保存/勝敗時は停止。**24C2-A:** Chrome iframe.srcdocで1024×768、820×620、568×520、390×760の4サイズを実測。上画面、下メダル、輪、回転ボタン、4コマンドが表示され横はみ出し無し、`elementFromPoint`で実タップ対象が他のUIに遮られないことを確認。旧SafariのHTTPS/Pointer Events/Web Crypto/TextEncoder不足を通信開始前に報告し中止する。Node479/479+Chrome2席Firebase Emulator PASS | **24C2-B:** 実Google Sitesのコード入力/保存・ページ表示、本人承認済み独立Firebase Auth/専用`yokaiRoomsV1` RTDB Rules、本物の学校旧iPad Safari 2台の接続/縦画面/横画面/タッチ/フレーム負荷/断線の最終ゲート。未測定の原作行動間隔は推測しない | **Chromeの寸法・実タップヒットとローカル2席はPASS／Safari実機・Google Sites編集・実クラウド未検証** |

## 3. 今回した作業（Phase24-C2-A／2026-10-25）

**全体のどこ:** 原作正規`match-protocol`（Phase20-22）→ Firebase通信の権威ACK/同期（Phase23）→ Google Sitesへコード直貼りするオンライン単一HTMLとホスト自動進行（Phase24A/B/C1）→ **狭い埋込枠と古いSafariへの互換性・実タップ位置の受入（24C2-A）** → 最後に学校旧iPad Safariと本人承認済みFirebase/Google Sites本物で検証（24C2-B）。

**今回修正/追加:** `tools/sites-online-smoke.mjs`の実Chrome+Auth/RTDB Emulatorの2席`iframe.srcdoc`試験へ、**1024×768、820×620、568×520、390×760**の4フレームを追加。実`documentElement.clientWidth`/scrollWidth、上画面・下画面・B輪・回転ボタン・4コマンドが横枠内/非ゼロサイズかを判定。タッチ位置が見た目だけでなく操作対象へ当たるか`document.elementFromPoint`で確認。どのサイズでもPASS。対戦部屋/権威ACK/3秒輪ロック/自動行動ON→切断中停止→復帰→手動OFFも同じ最終QAで引き続きPASS。

**Safari事前診断:** `ui/sites-browser-capabilities.mjs`新規。Google Sites iframeの中の`isSecureContext`、`PointerEvent`、`crypto.getRandomValues`、`TextEncoder`をローカルで確認し、足りない機能を日本語で表示。`lab/sites-embed-online-entry.mjs`でFirebase匿名Authを開始する前に拒否し、非対応の旧Safariが半分だけ動いた状態で部屋を作らない。`tests/sites-browser-capabilities.test.mjs`を新規5件追加し、正常/Pointer Events無し/HTTPS・乱数無し/TextEncoder無し/全機能無しを確認。

**技術資料との照合:** [Google Sites公式](https://support.google.com/sites/answer/90569?hl=en)はHTML/CSS/JS直接埋込をサポートするがコード文字数上限や古いiPad Safari実動作を保証していない。[Pointer Events互換性表](https://caniuse.com/pointer)では古いiOS Safari 12.5以前は非対応、iOS Safari 13は部分対応で、学校の実OSバージョンは未確認。Firebaseの`Persistence.NONE`は[公式](https://firebase.google.com/docs/auth/web/auth-state-persistence)に従いメモリだけに保持（ページ再読み込みで消える）ので、完全再起動後に同一試合へ復帰する機能はない。リダイレクトログインの他社Cookie問題と今回の**匿名Auth**は混同しない。

**受入結果:** [**Node479/479**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40176060547) 全件合格（従来474件＋5件）。[**実Chrome 2席 Google Sites型iframe幅4通り＆Firebase Emulator #40176060551**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40176060551) 成功、設定未登録時の安全な通信拒否・架空の公開設定しか用いないクラウド生成ゲートもPASS。**本物のGoogle Sitesへの貼付、実クラウド、iPad実機、旧Safariメモリ・性能は一切試験していない**。

**詳細記録:** [Phase24-C2埋込画面幅とSafari起動前機能診断](./PHASE24C2_EMBED_WIDTH_AND_OLD_SAFARI_PREFLIGHT_20261025.md)。

**変更先:** GitHub開発ブランチ`feat/phase1-action-circle-lab-20261023`のみ。main、学校のGoogleサイト版、本番Firebase・料金・資格情報は未変更。本人の作業はまだ必要なし。

## 4. 次にする作業（24C2-B・原作照合残）
1. **本人の承認済みFirebaseを最終接続:** 独立の無料枠Firebaseプロジェクト/Auth匿名/RTDB専用`yokaiRoomsV1`セキュリティルールと公開Web configが揃うまで、クラウド設定済みHTMLを実際に生成・配布・接続しない。誰かの既存ゲームのDBを無断で流用せず、課金変更しない。
2. **本物の学校旧iPad Safari 2台:** Google Sitesで**「コードを埋め込む」へHTMLを直接貼付**できるか・編集欄のサイズ上限・iframeの縦方向高さ、SDK読み込み、匿名Auth、6桁ルーム接続、操作/4コマンド/自動進行/切断復帰/低スペック描画を本人の実機試遊でチェック。実公開操作は本人が行う。旧SafariのOSバージョンがわからなければ、そのまま非対応だと推測しない。
3. **原作深層戦術:** ノーモーション/カウンターの原作ロック時刻、零式つつく妖気受取数値、研究用1.5秒の行動進行テンポは未測定として維持。閃光魂は初期に入れない。学校の操作感が確認できてから原作忠実性とテンポ調整を進める。
4. **動作負荷:** iPad実機を使うまで、Chromeのフレーム幅・Node結果をiPad Safari実測性能と混同しない。必要なら研究用描画スロットリング／旧端末を模した長時間描画試験を追加。

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
