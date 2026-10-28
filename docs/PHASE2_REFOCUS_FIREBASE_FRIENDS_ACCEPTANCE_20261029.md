# 軌道修正：原作の対戦体験 × 現行 Firebase Friends 実操作ゲート（2026-10-29）

## この文書の目的

本人の「任した。色々ズレてた気がするからしっかり軌道修正してね」への対応。研究技を追加する前に、**実際に友達と1vs1対戦して、原作のような行動判断ができる**完成基準に戻す。

**唯一の学校向け通信**：Firebase Realtime Database / **Firebase AuthenticationなしFriends** / 6桁ルーム / Google Sitesに直接コード貼り付け。GitHub Pagesは学校では使わない。既存レンタル6体で、育成・閃光魂・履歴/リプレイ・追加のログインは初期対象外。

本人の2026-10-27学校iPad2台試遊では**旧Firebase V2の部屋対戦は成功**。一方でサークル指ドラッグ、行動の見え方、零式中央切替、行動傾向、妖気テンポを要改善と評価。以後の最新版が実機で合格した証拠はまだない。[学校フィードバック](./PHASE43_SCHOOL_20261027_REAL_USER_PLAYTEST_FIXES.md)。

## なぜ直近の「PASS」を信用しすぎていたのか

1. **旧Supabase5本・旧Firebase Auth3本がpushで自動実行**され、現行の学校方式でないエラーを現在のリスクとして報告。開発ブランチ上のworkflowを**manual dispatchのみ**へ。旧コードと失敗ログは削除しない。
2. 現行Firefox…ではなく**Chrome Chromium**の`tools/sites-online-smoke.mjs`も、以前は`--dump-dom`に含まれる**JavaScript本文の`...PASS`文字列を`includes`で探しており、画面の実結果がWAIT/FAILでも誤って成功判定できた**。これは重要な品質欠陥。
3. 初回の厳密DOM検証で、`!el()?.disabled`は要素が`null`でも`!undefined===true`となり、ページの初期化前にクリックしてエラー。**要素が実在してdisabled===false**を必須に変更。
4. エミュレーター専用ビルドでは`location.hostname`がlocalhostかで判定したが、Google Sites形式の`iframe.srcdoc`自身は`about:srcdoc`。**同一オリジンのローカル親がlocalhost/127.0.0.1の場合だけ**許可し、遠隔親は従来どおり拒否。
5. さらに`--virtual-time-budget=35000`でタイマーを早送りしながら実Firebase通信を待っていたので、JSだけ先へ進みルーム作成前に仮想時間切れのタイムアウトになり得た。**Node22の標準WebSocket＋Chrome DevTools Protocolの`Runtime.evaluate`で、実時間のブラウザ#result文字列を監視**する方式へ移行。CDPでゲーム状態は書き換えない。
6. viewport QAのiframeの既定2px枠線で、指定1024pxと内部の`documentElement.clientWidth`がズレた。テスト枠線をゼロにして実際の測定幅と整合させた。

**重要：これらの修正は従来のPASSを自動的に再認定するものではない。** 実ブラウザの新版CIが完了するまで、現行Friends 2席の合格とは記録しない。

## 修正した実受け入れの流れ

現在の`tools/sites-online-smoke.mjs --emulator-friends`は**localhost上で二つの実Chromium `iframe.srcdoc`**を起動し、以下を「最終結果の画面DOM」から証明する。

1. Firebase app+databaseの2つだけをロード、匿名Authをロードしない。部屋作成と6桁コード、ゲスト参加、ホスト開始とゲスト自動接続。
2. 2席の本物のレンタル6体ずつ表示とホスト/ゲストの接続表示。ゲームの手動ステップや研究チートを公開しない。
3. 1024/820/568/390px相当の各埋込iframeで、上画面と下画面・サークル・コマンドの表示とタップ座標の到達を検証。
4. **ゲストサークル右回転**→両画面の正規ACK `B 1` →前衛変更。直後の回転禁止→正規ACK `B 2` とクールダウン表示。悪い操作で配置が変わらないこと。
5. **ゲスト「ねらう」→A2をタップ**→両画面に`B 3` ACK、ゲスト画面の敵A2に**本当のピン照準**。
6. ホスト自動行動→ゲストに行動/ターンが送信される。ゲストの切断中は進行一時停止し、復帰で同じ試合が再開する。停止後にはゴースト進行なし。
7. 最終の`<strong id="result">...`の**実DOM `textContent`**が完全な`SITES-FIREBASE-FRIENDS-EMULATOR-PASS ...`になって初めて成功。WAITやFAIL、スクリプト本文のPASS文字列は不合格。CDP経由の実時間監視でサーバー通信とJSタイマーを早送りしない。

安全条件：localhost専用の`network/emulator/firebase.friends-noauth.json`でのみ実行し、本番RTDBはCIで読み書きしない（独立の本番読み取り検証は過去ログどおり許可）。同じフレームを2つ表示するだけでなく、**本当に二つの独立Firebaseクライアントが同じホスト結果を受け取ること**を確かめる。

## 今回のコード差分

- `tools/browser-qa-result.mjs`、`tests/browser-qa-result.test.mjs`：偽PASSを拒否する純粋なDOM検証と回帰。
- `tools/chrome-realtime-qa.mjs`：実時間CDPで結果要素を読み取る（Node22 WebSocket、追加npm依存なし）。
- `tools/sites-online-smoke.mjs`：2画面の実操作/ピン/表示/同期、成功判定厳格化、ローカル埋込の幅検証。
- `lab/sites-embed-online-entry.mjs`：研究用エミュレーターsrcdocのlocal parentだけを安全に許可。**学校用`--friends`（本番RTDB）ではこの条件は実行されない**。
- `.github/workflows/phase24-sites-online.yml`、`phase14-firebase-browser.yml`、`firebase-room-emulator.yml`：旧Auth利用時のCIは手動実行へ保存。既存のSupabase5本もすでに手動のみ。唯一の現行Firebase自動統合QAは`phase37-firebase-friends.yml`。

## 次にやること：実際の1ゲームでの原作再現度の改善

Firebase2席の厳密QAが通った後、**第1試合の原作映像`MATCH01_SECOND_PASS_INPUT_AND_TIMELINE_20261027.md`にある「連打！→おはらい完了→サークル復帰（00:15–00:20）」**を第一候補として、(a)既存レンタルの実ホスト操作、(b)上下画面を遮らないタッチ操作、(c)ホスト/ゲストの表示整合、(d)実Chromium動画/画像まで通す。原作から確証のない追加ヒット数やステータス数値を作らない。

次候補は**「ねらう/つつく」と上画面の照準同期（00:32–00:38）**、および必殺入力→カットイン→連続数字→戻り（00:40–00:52）。原作動画は今回新たに実ファイルへアクセスできていないため、録画を新しく直接目視した主張はしない。

**学校Google Sites稼働版・GitHub main・本番FirebaseのRules/DB/Auth・既存Drive配布は変更しない。**
