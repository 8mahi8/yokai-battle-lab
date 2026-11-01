# Phase24-B｜Google Sites直接貼付オンライン1vs1の通信入口・設定隔離・ローカル実ブラウザQA

実施日: 2026-10-25 JST  
対象: `feat/phase1-action-circle-lab-20261023` 開発ブランチのみ  
最終確認CI: [Phase24オンライン版の全経路QA #40174083143](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40174083143)

## 全体の設計上のどこ
原作忠実再現のエンジン (Phase20/21/22) → ホスト権威`engine/match-protocol.mjs` → Firebase room/guest ACK (Phase23A/B/C) → **Google Sites「コードを埋め込む」の単一HTMLオンライン入口 (Phase24B)** → 本物のGoogle Sites/学校旧iPad Safari/クラウドへの接続・2台試遊（Phase24C）。

原作カウンター・ノーモーションの未確定msや閃光魂は今回も正規に追加していない。現UI内の「研究用：次の行動」は手動ホスト進行であり、常時自動進行する最終ゲームプレイとは区別する。

## 今回実際に追加したコード
1. **`lab/sites-embed-online-entry.mjs`**：既存の`network/firebase-room.mjs`、`network/firebase-match.mjs`、正規`createMatchProtocol`、`ui/match-stage.mjs`を再利用。単一HTMLでもホスト／ゲストを別Auth匿名UIDにし、6桁ルーム番号・部屋作成／参加／開始・本来の12体/4コマンド・1席分のサークル・ゲスト命令ACK・3秒回転ロック・再接続・重複入力防止を使用。Firebaseの`/.info/connected`と相手のpresenceで接続中のみゲーム操作を許し、断線中の未送信キューを破棄し、ホストがdirty戦況を復帰時/手動で再発行できる。
2. **`tools/build-sites-online.mjs`**：`esbuild@0.25.12`でgame/network/UIをSafari13ターゲットの**単一IIFE JS**へバンドルし、上下画面CSSを1個の`<style>`へインライン化。**Google Sitesの「Embed code」欄へ丸ごと貼る形式**で`dist/*-code.html`と単体プレビュー用`*-preview.html`を生成。Firebase compat SDK 10.8.0の3本は設定済みモードだけに含める外部CDNなので、「完全ネットワーク不要の単一ファイル」ではない（通信対戦のためネットワークは必要）。GitHub Pages URLのiframeへすり替えていない。
3. **安全な出力モード**：
   - `node tools/build-sites-online.mjs`: 初期設定なし。`dist/sites-online-setup-code.html`。1ファイル約170713 bytesで、**認証/APIアクセス/外部SDKを一切開始せず**「接続設定が未登録」を画面に表示。これだけでは友達とのオンライン対戦不可。
   - `node tools/build-sites-online.mjs --emulator`: **`dist/sites-online-emulator-qa-code.html`**。プロジェクト`demo-yokai-lab`、Firebase Auth(9099)/RTDB(9000)のローカルエミュレーター専用で、実ブラウザの`localhost`/`127.0.0.1`以外は初期化前に拒否。**このHTMLはGoogle Sitesに貼らない。GitHub Actionsでもダウンロード用アーティファクトに含めない**。
   - `YW_CLOUD_BUILD_APPROVED=1 node tools/build-sites-online.mjs --config path/to/public-firebase.json`: 将来、本人の明示許可済み独立Firebaseプロジェクトの**公開Web構成**（apiKey、appId、RTDB URLなど）と、先に手動で検証したRulesがある場合のみ、**HTMLの生成だけ**許可する。実クラウド設定の読込/生成は今回一度も実行していない。ビルドスクリプトはGitHub内既存`network/emulator/database.rules.json`をクラウドへ公開しない。API keyはブラウザ公開値であって認証/秘密ではない。実セキュリティはAuth＋Firebase Database Security Rulesで行う。
4. **`tools/sites-online-smoke.mjs`** と **`.github/workflows/phase24-sites-online.yml`**：生成した**実HTML断片を2つの`iframe.srcdoc`へ挿入して本物のChromeで操作**。Auth/RTDBエミュレーターをバックエンドとして、ホスト部屋作成→ゲスト6桁参加→正規`createMatchProtocol`で開始→双方12体/4コマンド→ゲスト回転→ホスト側の前衛反映/権威ACK→直後の2回転目を3秒クールダウン拒否→ホスト手動1ステップ同期→ゲストSDKオフライン→ホストの進行ブロック→SDK復帰→同一試合の継続まで確認。デフォルトの設定無し版も、実Chrome iframeで**部屋作成禁止・外部SDKなし・明示したセットアップ待ち画面**を検証。接続先は全てローカルエミュレーター。

## テストとソース
- [#40173549741](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40173549741) **SITES-ONLINE-BUILD-PASS** setup 171218 bytes／27 modules、emulator 171662 bytes／28 modules、**SITES-ONLINE-SETUP-PASS / SITES-ONLINE-EMULATOR-PASS**。CI artifactsには**未設定でネットワーク起動しない安全な2ファイルだけ**を14日間保存。
- 既存の[Node研究テスト](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40173549689)と[原作風Chrome/UI/指操作](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40173549698)も成功。
- [Google Sites公式ヘルプ](https://support.google.com/sites/answer/90569?hl=en)はコード直接埋込（CSS `<style>`, JS `<script>`）を説明。今回の`srcdoc` QAは**本物のGoogle Sitesへの貼付を証明しない**。
- [Firebase公式プレゼンス/オフライン](https://firebase.google.com/docs/database/web/offline-capabilities)にある、接続中の自分固有の状態と`onDisconnect`を引き続き尊重。
- 本番のクラウドFirebase設定、RTDBルール配備、認証許可ドメイン、学校旧iPad Safari、Google Sites実編集・Safari iframe制限、データ利用量の現実的推計は**未検証・未実施**。
- 学校iPad Safari上でFirebase Authの匿名UIDがサイトの埋込文脈で使用可能かは**実機で初めて判定**。`signInWithRedirect`を使っていないためリダイレクトAuthの問題と混同しない。

## 次の受け入れ条件
1. **Phase24-C:** 設定済みクラウドHTMLを作る前に、本人が使用に同意した無料枠の独立Firebaseプロジェクト/Auth匿名認証・専用`yokaiRoomsV1`ルールを確認。API configを固定のコードへ注入し、手動でGoogle Sitesへ貼り付け（**公開操作は本人**）。クラウドを無断作成/設定/課金/デプロイしない。
2. 学校の旧iPad Safariで本当に同一の6桁ルームへ2端末から入れるか、サークル回転、4コマンド、チャージ入力、断線復帰、発熱/ラグ/相手側のリアルタイム表示を試す。サイトのコードサイズと外部Firebase SDK読み込みも最終ゲート。
3. 原作PvP忠実性の別ゲート（21D妖気、22Dノーモーション/カウンター時刻、元ゲームの技効果/速度/カットイン）は引き続き未完。研究用の仮数値は本番へ未導入。

**変更先:** GitHub開発ブランチのみ。`main`、既存Googleサイト版、実Firebaseのプロジェクト/DB/料金、学校内配布は変更なし。現時点の本人の必須操作なし。

## 最終追試：公開設定の混入防止ゲート（Phase24B補強）
- `tools/sites-online-build-gate.mjs`を新規追加。`YW_CLOUD_BUILD_APPROVED=1`なしでは **偽の設定JSONでもクラウド用HTMLを生成禁止**。架空の公開設定でのみビルド成功するが外部サービスには一切アクセスせず、異なるAuthドメイン/RTDBホストは拒否。
- エミュレーターの接続先 `127.0.0.1:9099` が静的なクラウドHTMLに残っていたため、`lab/sites-embed-online-entry.mjs`の条件を**ビルド時の定数 `__YW_EMULATOR_MODE__`へ直接適用**し、クラウド設定版では研究用コードを削除するよう修正。
- [**最終 #40174083143 PASS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40174083143): `SITES-ONLINE-CLOUD-GATE-PASS`、未設定ビルド170713 bytes、エミュレーター専用171529 bytes、未設定時の接続ブロックChrome検証、実Firebase Emulatorの**2つのGoogle Sites型iframeで部屋作成/操作/拒否/切断復帰**の全て成功。
- 最終コミットの既存[Node戦闘研究469/469](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40174083179)と[本家風ステージChrome](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40174083120)も成功。
- **未検証は変わらない**: 本当のGoogle Sites入力欄、旧iPad Safari、実クラウド・RTDBルール配備は試験していない。研究専用エミュレーター版は配布しない。
