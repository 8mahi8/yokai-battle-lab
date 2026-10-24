# 妖怪対戦ブラウザゲーム｜最新・正式引き継ぎ（2026-10-24）
> **Phase 16本家に寄せた上下2画面UI（2026-10-24）**: 君の指定「画面構成をなるべく本家妖怪ウォッチに寄せる」を受け、[Phase16実装・資料](./PHASE16_YW2_SCREEN_LAYOUT_20261024.md)を追加。上画面に敵前衛3体＋自分の前衛3体の対面戦闘、下画面に**自分の6体メダルサークル1つ**と四隅の**わざ/ねらう/おはらい/アイテム**を配置。本家のターゲット→敵選択、わざ→前衛メダル選択、おはらい→後衛メダル選択、零式ではねらう→つつく。公式対戦ルールに合わせアイテムは使用不可（UIもdisabled）。Gわざの本来の処理は未実装なので**普通の必殺チャージをGと偽らない**。背景と6キャラはオリジナルSVG/CSS。学校iPad横向きに備え1024×768向け縮小表示も作成、実Chromeスクリーンショット確認。 [Chrome UI＋タッチ成功](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40087862922)、[Node 370/370成功](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40087862906)、[Firebaseローカル2ブラウザ成功](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40087612059)。main/既存Googleサイト/本番Firebase未変更、物理iPad実機とGoogleサイトへの直接貼り付けは未検証。**以後、左右に2つの大きなサークルを並べる旧UIへ戻さない。**

> **Phase 15Aオリジナル2Dキャラ実装（2026-10-24）**: [成果記録](./PHASE15_ORIGINAL_2D_CHARACTERS_20261024.md)。君の「キャラのデザインは任せる・ドット絵に限定しない」を受け、本来の対戦UIの仮丸顔を廃止し、**あかねこ・こもれび・いしもり・すずかぜ・ほたる・くろがね**の異なる輪郭のオリジナル軽量SVGキャラ6体を実装。両チーム12枚と次の5行動に表示、前衛待機・攻撃・被弾・回復CSSアニメを追加。対戦エンジン・能力値は変更なし、タッチ入力時のキャラ再生成をキャッシュで抑制。[Node 370/370成功](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40083791925)・[実Chrome画面＋10タッチ操作＋2種類のスクリーンショット生成成功](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40083791984)・[2ブラウザFirebase Emulator通信成功](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40083791933)。一覧 `lab/character-gallery.html`。**完全なブラウザ再起動からの復元は不要とユーザーと合意**。短い通信断のみ自動再開、再起動後は新しい部屋で最初から。今後は演出/操作/学校Safari/Googleサイト直貼りの本来の完成版優先。急造別ゲームは使わない。main/公開版/本番Firebase変更なし。

> **Phase 14C切断検出とホスト再起動フェンス（2026-10-24）**: [資料](./PHASE14C_PRESENCE_RESTART_FENCING_20261024.md)。`watchPeerPresence`で相手接続状態を表示。ローカルFirebase実2ブラウザで**ゲスト回線切断→ホスト操作停止→回線再接続→同一試合を続行**するテストを通過（[CI](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40082321722)）。ホストの新規インスタンスが旧試合revision 0に巻き戻す危険を防ぎ、remote stateの存在時は試合を復元したふりをせず**開始拒否**。失敗時はfenceして入力停止。Node **368/368成功**（[CI](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40082426599)）。**完全なブラウザ再読込後の再参加・元の戦闘RNG復元・本番Firebase・学校iPad Safariは未完成**。main/公開版無変更。

> **Phase 14Bタッチ・通信安全性改善（2026-10-24）**: [検証・変更記録](./PHASE14B_GESTURE_SECURITY_20261024.md)。本来の対戦画面で実ブラウザPointerEventを使用し、**4種類の必殺チャージ・5種類のおはらい・零式つつく**をすべてクリア。指のキャンセルをタップと誤認しない、複数指の操作奪取を防止、時計合わせと鎖斬りの実目標を表示（[成功CI](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40072500872)）。またFirebase Rulesが同じ入力番号で別の操作に書き換えられる問題を直し、再送判定でJSONキー順の差を吸収。[実SDKエミュレーターの**32権限チェック＋通信ブリッジ成功**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40072775429)。学校Safari/切断復帰/本番Firebase/Google Sites公開は**未完成**。**急造学校簡易版は使用禁止**。

> **Phase 14A開発（2026-10-24）**: 本来のPhase11戦闘エンジンのsnapshotに次5行動予測を追加し、[サークル対戦画面](../lab/match-stage.html)と[同じ画面を使うFirebaseエミュレーター対戦](../lab/firebase-match-stage.html)を実装。6体×2陣営、HP・妖気、標準/零式、ピン、回転、必殺/おはらい/つつく操作UI。**急造したGoogleサイト用簡易版は本来の開発と無関係なので使わない**。 [Node+実Chromium画面操作QA](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40061681947)成功。さらに[本物のFirebase Auth+RTDBエミュレーター上の2独立ブラウザ画面E2E](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40061682008)成功：ルーム作成/参加・回転の双方同期・ホスト行動をゲストに反映。資料[Phase14 UI/E2E検証](./PHASE14_STAGE_QA_20261024.md)。**本番Firebase、学校Safari、Google Sitesコード直貼り、完全なタッチミニゲーム操作、切断復帰・視覚完成評価は未完成**。main/学校公開版未変更、無料と閃光魂OFFを維持。

> **Phase 13B（2026-10-24）**: [Firebase実SDK戦闘ブリッジとローカル2タブ研究画面](./PHASE13B_FIREBASE_MATCH_BRIDGE_20261024.md) を追加。ホストはPhase11戦闘を確定してFirebaseへ配信、ゲストはホストの`clientSequences[1]`によるACKを待つ方式。Node **360/360合格**、Firebase RTDB公式エミュレーターと**異なる2 SDKクライアント**でゲスト回転→ACK→ピンクリア→ACK→ホスト操作→自動行動進行まで検証成功（[Firebase CI](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40039540378)）。一度既存Chromiumが起動タイムアウトしたが、[最新の研究CI](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40039933027)は360 Nodeテスト＋既存ブラウザ研究テストすべて成功。ローカル2タブHTML実操作は未実施。本番Firebase/Googleサイト/実iPad未接続。**ゲストのACK待ち高速入力を最大48件バッファするキュー実装済み**。ホスト再起動、認証・切断復帰、実ブラウザ2タブE2Eは未完成。費用0円、閃光魂OFF、mainとGoogleサイト版は未変更。

> **Phase 13A実装（2026-10-24）**: [Firebase room adapter & SDK QA](./PHASE13A_FIREBASE_ROOM_SDK_QA_20261024.md) を追加。実Firebase互換SDK+匿名認証テストコンテキスト+ローカルRTDB Emulatorを用い、6桁ルーム作成→2人参加→ゲスト回転入力→ホスト戦闘エンジン処理→ゲスト戦況受信まで接続テスト成功。Security Rulesは28項目の許可/拒否検査と実SDK統合1件、計29チェック成功（[CI](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40037975858)）。Node単体テストは **355/355合格**。本物のFirebaseクラウドと学校iPad/Google Sitesは**未接続**。全モデルの初期閃光魂OFF、費用0円、main/既存Googleサイト版は不変。最新Chromium CIは一度ブラウザ起動タイムアウトがあるので、再実行結果を確認すること。

> **Phase 13の外部資料・横断リポジトリ調査（2026-10-24）**: Firebase公式資料に加え、BRAWL・小国戦線III・3Dサッカー・LEMON CLASHの通信コードとQA記録を確認。接続世代・ACK長時間未解決・ゲスト最新snapshotだけ適用・RTDB Security Rules / Emulatorの設計を [Phase 13比較資料](./PHASE13_FIREBASE_CROSS_REPO_RESEARCH_20261024.md) に保存。**これは調査フェーズでありFirebase実接続・新規ルーム・本番ルール変更は未実施**。実装前に公式原典と他repoの最新版を再検証する。

> **Phase 12追記（2026-10-24）**: `engine/match-relay.mjs` にホスト席分離・ACK再送・遅延snapshot破棄・再接続時seq同期・ハートビート失効の**トランスポート非依存コード**を追加。 `tests/match-relay.test.mjs` を含む **345/345 Nodeテスト合格**、既存のChromium research UI検証も成功（[GitHub Actions](https://github.com/8mahi8/yokai-battle-lab/actions/runs/39985207035)）。詳細は [Phase 12資料](./PHASE12_RELAY_RECOVERY_20261024.md)。**まだ実Supabase接続・2端末オンライン対戦・学校Safari E2Eは未完成**。以下のPhase 11記述は研究実装の土台として読む。main/Googleサイト版は未変更、初期版の閃光魂はOFF。

> **この文書が新しいチャットの入口。** 過去の `docs/HANDOFF_20261023.md` は企画初期の内容で、現在の実装状況ではありません。内容が競合する場合、この文書・最新の個別Phase資料・実際のコードとCIを優先してください。

## 0. 最初に読む順番
1. **この資料**：`docs/HANDOFF_LATEST_20261024.md`
2. **Phase 16本家風上下2画面UI**：[`docs/PHASE16_YW2_SCREEN_LAYOUT_20261024.md`](./PHASE16_YW2_SCREEN_LAYOUT_20261024.md)
3. **Phase 15Aオリジナルキャラ実装**：[`docs/PHASE15_ORIGINAL_2D_CHARACTERS_20261024.md`](./PHASE15_ORIGINAL_2D_CHARACTERS_20261024.md)
4. **Phase 14C相手切断とホスト再起動フェンス**：[`docs/PHASE14C_PRESENCE_RESTART_FENCING_20261024.md`](./PHASE14C_PRESENCE_RESTART_FENCING_20261024.md)
5. **Phase 14Bタッチ・通信安全性**：[`docs/PHASE14B_GESTURE_SECURITY_20261024.md`](./PHASE14B_GESTURE_SECURITY_20261024.md)
6. **Phase 14A本来の対戦画面と2ブラウザFirebase E2E**：[`docs/PHASE14_STAGE_QA_20261024.md`](./PHASE14_STAGE_QA_20261024.md)
7. **Phase 13Bオンライン戦闘統合**：[`docs/PHASE13B_FIREBASE_MATCH_BRIDGE_20261024.md`](./PHASE13B_FIREBASE_MATCH_BRIDGE_20261024.md)
8. **Phase 13A実装とSDKテスト**：[`docs/PHASE13A_FIREBASE_ROOM_SDK_QA_20261024.md`](./PHASE13A_FIREBASE_ROOM_SDK_QA_20261024.md)
9. **Phase 13外部資料・既存ゲーム比較**：[`docs/PHASE13_FIREBASE_CROSS_REPO_RESEARCH_20261024.md`](./PHASE13_FIREBASE_CROSS_REPO_RESEARCH_20261024.md)
10. **Phase 12通信基盤**：[`docs/PHASE12_RELAY_RECOVERY_20261024.md`](./PHASE12_RELAY_RECOVERY_20261024.md)
11. **Phase 11対戦コマンド**：[`docs/PHASE11_MATCH_PROTOCOL_QA_20261023.md`](./PHASE11_MATCH_PROTOCOL_QA_20261023.md)
12. **Phase 10基本戦闘**：[`docs/PHASE10_MULTI_HIT_INSPIRIT_HEAL_20261023.md`](./PHASE10_MULTI_HIT_INSPIRIT_HEAL_20261023.md)
13. **歴史・各Phaseリンク**：[`docs/DEVELOPMENT_STATUS_20261023.md`](./DEVELOPMENT_STATUS_20261023.md)
14. **実際のコード**：`engine/combat.mjs`・`engine/match-protocol.mjs`・`lab/phase2.html`・`lab/match-contract.html`・各 `tests/*.test.mjs`。

**Repository**: https://github.com/8mahi8/yokai-battle-lab  
**開発ブランチ**: `feat/phase1-action-circle-lab-20261023`  
**安定CI（2026-10-24確認）**: https://github.com/8mahi8/yokai-battle-lab/actions/runs/39974950920  
**CI実績**: **337/337 Nodeテスト成功、失敗0、skip0**。実リポジトリから ES Modules を読み込む **Chromium描画・操作テスト成功**（戦闘、必殺、つつく、おはらい5種類、研究属性・複数ヒット、2席コマンド処理、旧閃光研究画面）。

## 1. 君（引き継ぎ先AI）の役割
あなたは学校の古いiPad（Safari）で友達同士が遊ぶ**妖怪ウォッチ2の戦闘システムを研究・再現した、オリジナルキャラのブラウザ対戦ゲーム**の企画・開発担当。

ユーザーの「任せた」「任した」は、細かな確認を取らずに**外部資料調査→実装→テスト→目視／ブラウザ検証→GitHub記録**まで自律的に進めてよい意味。計画だけで終わらない。ただし**本番・公開の変更は勝手にしない**。ソースごとに「原作で確定／有力研究／仮数値」を分ける。

## 2. 絶対に維持する仕様・境界
- **初期版には閃光魂を入れない。** Phase 6の研究実装は研究用に残してよいが、通常・初期対戦の `researchOpeningPriority` は `null` のまま。無限閃光研究へ再び脱線しない。
- 友達との**1vs1**が目標。両陣営**同じオリジナルレンタル妖怪6体**、3体前衛＋3体後衛のサークル回転。育成・厳選・大量キャラ・ランク・リプレイ・戦闘履歴・対戦ランキングは初期版に不要。
- **無料厳守**。旧iPad Safari、横画面・低負荷・シンプルな操作・通信でゲスト側が固まらないことを優先。特に学校ではSafari/Google Sitesの表示差あり。
- **Googleサイト版**とは GitHub Pagesリンクの埋め込みではなく、**ゲームのHTML/CSS/JSコードをGoogle Sitesの「コードを埋め込む」に直接貼って、友達と遊べること**。GitHub Pagesは開発中の試遊用なら可。最後に**単一の自己完結したHTML／貼り付けコード**を作る（ZIPではなく各ファイルで渡す）。
- 現時点で本物のネット対戦は未完成。**main、既存Googleサイト版、稼働中のFirebase/Supabase設定を勝手に変更しない。** 新しい無料環境の準備が必要なら先に調査・設計・検証し、秘密鍵をブラウザや公開リポジトリへ絶対に入れない。
- 現行 `main/index.html` は古い2.5Dデモであり、Phase 11の対戦実装ではない。必ず**この開発ブランチ**を見ること。
- 画面改善は「次の5行動＋その妖怪の枠直下のゲージ」を中心に。エンジンを独自ATB方式へすり替えず、予測の不確実性を明示。既存の原作画面を無闇に情報過多へ変えない。
- 原作キャラの抽出モデルや画像・音楽は公開利用しない。初期版のアートは原作ではなく可愛い独自キャラでよい。UI/描画品質の完成は**見た目をAIが実際に確認してから**判断する。

## 3. 現在実際にある機能
- `engine/phase1.mjs`：seed付き決定的行動順／素早さ由来待機／前衛・後衛／サークル／次の5行動予測。
- `engine/selection.mjs`、`engine/combat.mjs`：4行動（通常攻撃・妖術・とりつき・ガード）、BOT戦闘、対象ピン、サボり、HP/勝敗、前衛KO時の補充。
- `engine/damage-model.mjs`、`engine/hit-model.mjs`：調査に基づく命中・クリティカル・属性・能力段階・ガード・1発ごとの複数回攻撃。**複数回ヒット時は「STR/Hit数を割るが防御値は各ヒットで全額引く」**に修正済み。
- `engine/inspirit.mjs`、`engine/turn-inspirit.mjs`：良い/悪いとりつき、睡眠、能力ダウン、仮の行動後HP増減（係数は未確定）。
- `engine/heal-model.mjs`：回復ばらつき研究、基礎回復式は**未確定の仮計算**。
- `engine/soul.mjs`：妖気／通常・零式ウォッチ／必殺・G技条件。
- `engine/charge-input.mjs`：4種類の必殺チャージタッチ研究。
- `engine/poke-input.mjs`：零式つつく、連続タップ、条件・研究用妖気吸収。
- `engine/purify-input.mjs`：おはらい5種類（つぶせ／連打／こすれ／まわせ／斬れ）、後衛限定、キャンセル。
- `lab/phase2.html`：**本物のバトルUIではなく1ブラウザ内の研究画面**。元データと仮の属性相性・回復・チャージの挙動を比較できる。
- `engine/match-protocol.mjs`：**オフラインの2席コマンド順序・重複再送防止・ログリプレイ**。hostが独占して行動順・乱数・状態を処理する設計。座席0/1は将来の**信頼できるホスト**がネット接続から割り当てる前提。
- `lab/match-contract.html`：**1台で2人分の操作を試すだけ**の通信契約ラボ。真のルーム番号・リアルタイム通信・別端末は**一切ない**。
- `engine/opening-priority.mjs`：閃光魂の隔離研究コード。初期版からは**OFF**。 `engine/wheel-coalescing.mjs` 等の変則・未確認仕様も原則研究フラグ下のみ。

## 4. 原作根拠とまだ未完成なこと
詳しくは各Phaseの資料に原文URLがある。特に:
- YW2の計算式とスキル： https://mtwildwood.net/damage.php?g=yw2 、https://mtwildwood.net/hit-chance.php 、https://mtwildwood.net/inspirits.php?g=yw2
- 妖気回復： https://note.com/ricosama0726/n/n14710bbe446c 。**「攻撃以外の本人の行動後、妖気+5」**を現在の研究オプションで採用。通常攻撃／妖術時の増減、魂装備・スキル・つつき報酬はまだ原作確定ではない。
- おはらい・必殺・零式／つつく： Phase 4,7,8 文書と各原作説明書リンクを参照。入力操作の必要回数・ゲージ・範囲の多くは**研究用の仮設定**。
- 残る原作再現課題：回復式・属性個体データ・継続HP減少率・技固有倍率とターゲット・妖気増減・チャージ後の特殊効果と時刻・1ヒットごとの演出/硬直タイミング・競技テクニックの成立検証。
- 重要：**337テストに通ったことは、原作と全数値が同一／2端末で安全・低ラグ／学校Safariで動作することの証明ではない。**

## 5. Phase 11のコード・テストとセキュリティ境界（最新）
- `createMatchProtocol({battleOptions})`、`dispatch(side,clientSeq,intent)`、`advanceAuto()`、`snapshot()`、`exportJournal()`、`replayMatchJournal()`。
- プレイヤー操作は回転・ピン・標準/零式切替・必殺/つつく/おはらいの**開始／タッチ／キャンセルのみ**。任意妖気注入・HP操作・強制KO・直接おはらい成功・乱数変更・勝手な行動前進は**ネット対戦のプレイヤーには絶対許可しない**。
- 各席で連番 `clientSeq`、ホスト全体で単調増加 `revision`。直近の同一コマンドの再送は同じACKを返し**重複適用しない**。失敗した操作でも形が正しければその順序を消費する。
- seedと確定コマンド履歴で**同一エンジン版に限り**完全な結果を再計算・照合。状態fingerprintは**デバッグ用の弱いハッシュ**で、認証・MAC・暗号ではない。
- **未実装**：サーバー／ルーム作成／2接続の本人確認／復帰・再接続／断線時の進行・通信重複・遅延・欠損・映像フレーム同期／権限分離・秘匿情報・リリース用配布。
- 現行コードの `dispatch(side,...)` は **sideを信頼できるホストが与える**設計の純粋エンジンAPI。ブラウザ内で呼べるだけではチート耐性も認証もない。送信JSONがsideを決めてはいけない。
- リプレイは研究機能で、ユーザー向け「戦闘履歴・リプレイ画面」を作る必要はない。

## 6. 次の担当AIが優先して進めること
**次の技術段階は実際の1vs1オンライン化への基盤づくり**。ただし初期戦闘を複雑化したり勝手に本番化しない。

1. Phase 11を実コードで読み、現在のGitHub Actions最新結果を確認。トランスポートから独立した `match-protocol.mjs` の入力／ACK／snapshot の契約を固定する。
2. **無料の分離された**接続基盤を比較。過去の候補は Supabase（希望）/ Firebase（他ゲームの実績あり）。どちらも無料枠・学校Safari・Google Sitesのコード貼り付け・ユーザーが許可する新規設定で完結すること。**無料だからといってそのまま認証された信頼できるホストがあると誤解しないこと**。
3. 接続の安全境界（ホスト認証、座席割当、相手の操作を勝手に送れないこと）、ルーム番号join、複数端末での順番確定、タイムアウト/退室/復帰、再送デュプリケート、受信側スナップショット順序・ゲスト停止検出を設計・テスト。
4. いきなり学校版を公開せず、まず**独立した2ブラウザ**での自動E2Eを整備し、擬似遅延・順序入れ替え・重複・欠損を検証。負荷・描画・旧iPadのラグを優先。実機ユーザー協力は自動テストで必要な準備ができてから。
5. 最後に**Google Sitesへコード直接貼り付けできる単一HTML**を生成。GitHubへ開発記録を残し、公開操作は本人に渡す。**GitHub PagesリンクをSitesに埋め込むのではない**。
6. 原作未確定の戦闘数式は別ラインで検証し、勝手に完成扱い／値の創作をしない。**初期版は閃光魂なし**。

## 7. 作業・テストの引き継ぎ方法
- GitHub連携で最新featureブランチのソースを読む。外部web研究は各機能直前に現行資料を確認。
- JavaScriptテストコマンド： `node --test tests/*.test.mjs` 。Browser CIは `tools/browser-smoke.mjs` を GitHub Actionsで実行している。既存CI： `.github/workflows/research-unit.yml`。
- テストで失敗した場合、原因分析→最小修正→再実行。結果を過去の成功回と取り違えない。最新CI成功の証拠を出す。
- `main`や外部本番をいじらずfeatureブランチに**コード・テスト・短い新Phase資料**を追加。AI自身のブラウザ検証を伴わない「見た目完成」宣言は禁止。
- 新チャットで「任した」なら、既存の説明をくどく繰り返さず**作業を実際に進める**。ユーザーの操作が必要なときのみ、何をすべきか最小手順で案内。

## 注記：初期版の到達状態
**戦闘の研究実装と同一ブラウザ内での2席順序実験まではある。実際に学校の2台の端末でオンライン1vs1を遊べる状態ではない。GitHub Actions 337/337成功、実機SafariとGoogle Sites直接貼り付けは未検証。**
