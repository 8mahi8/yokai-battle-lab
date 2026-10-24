# Phase 13 設計前調査 — Firebase・既存ゲームの通信実装比較
2026-10-24 / 対象: 妖怪対戦（初期1vs1、レンタル6体、閃光魂なし）

> **調査・設計ゲートのみ**。本ファイルの追加はFirebase接続、ルーム作成、オンライン実機対戦を意味しない。main、Google Sites版、実Firebase、他リポジトリのファイルは変更しない。費用0円。

## 調査対象（既存コード・実験記録を確認）

### 1. BRAWL — Firebase Emulator と通信品質
- [network/emulator/README.md](https://github.com/8mahi8/brawl-bot-playtest/blob/main/network/emulator/README.md)、[network/README.md](https://github.com/8mahi8/brawl-bot-playtest/blob/main/network/README.md)、[FRIENDS_TRANSPORT_DECISIONS](https://github.com/8mahi8/brawl-bot-playtest/blob/main/network/FRIENDS_TRANSPORT_DECISIONS.md)。
- ローカルFirebase RTDBエミュレーター + Rulesで2席/4席を分離し、他人の入力、未来/古いシーケンス、HP改ざん、切断前のconnectionId、旧roundを拒否するテストを持つ。
- [V4.4通信差分](https://github.com/8mahi8/brawl-bot-playtest/blob/main/network/BRAWL_V44_FIREBASE_POSITION_DELTA.md)：全体 `value` 購読から位置ごとの `child_changed` 等への切替を検証。通信受信・JS処理・描画の負荷を分離して測定。学校Google SitesではCloudflare Worker直結が失敗したとの開発記録があり、Firebase RTDB継続の判断。
- **採用**: Firebase Emulatorで認証/Rules・重複/逆順/越境アクセスを先に実証、実端末ネット計測は別ゲート。
- **非採用**: FPSの位置更新80ms/500ms、弾先行表示、2vs2の4人キューを、ターン主導の妖怪対戦へ無条件に移植しない。

### 2. 小国戦線III — ゲスト停止・状態反映
- [online-net.js](https://github.com/8mahi8/shokoku-sensen/blob/perf/online-guest-snapshot-diagnostics-20261020/online-net.js)、[ゲスト性能研究](https://github.com/8mahi8/shokoku-sensen/blob/perf/online-guest-snapshot-diagnostics-20261020/docs/ONLINE_GUEST_PERFORMANCE_20261020.md)、[ホスト・ゲスト差分修正](https://github.com/8mahi8/shokoku-sensen/blob/perf/online-guest-snapshot-diagnostics-20261020/docs/HOST_GUEST_PARITY_FIXES_2026-10-23.md)。
- ホストが戦闘進行を決め、ゲストは順序番号/ラウンド付きスナップショットを適用。古い・別ラウンドデータを排除。
- ゲストに状態が続々届いても描画前に**最新の1件に集約**する `pendingRemote` / `requestAnimationFrame` パターンを確認。同期停止監視、再取得、描画FPSと受信頻度の切り分けも実装。実機ラグ全解消を証明するものではない。
- **採用**: 大量の旧snapshot適用を省き、revisionの単調増加と再同期を守る。通信が止まったのか描画だけ止まったのか別々に計測。
- **注意**: 状態取得時にルーム認証/Rulesを迂回しない。REST予備取得の要否は認証とSDK挙動を考慮して決める。

### 3. 3Dサッカー — Firebaseの切断時不具合
- [Firebase V3候補・修正履歴](https://github.com/8mahi8/3d-soccer-online/blob/dev/firebase-rtdb-v1-20261022/docs/FIREBASE_V3_CANDIDATE.md)。
- `onDisconnect` のACKを得てからオンライン表示に移る設計、再接続時に座席IDを再検証する実装候補。
- **V3.2の実装上のバグ**: `state.set()` Promiseが未解決のまま切断するとbusyフラグが戻らず、次の送信が始まらない。改修後は通信epoch/送信serial・timeoutで切断前のコールバックを区別し、最新だけを再送。あくまでモック再現であり実Firebaseで起きたという意味ではない。
- **V3.3**: 同じ部屋番号を再利用した際、旧セッションのseqが新規試合を止めるため、新しいsession世代を持たせた。sessionは**認証用秘密ではない**。
- **採用**: roomIdとは独立のsession/match世代、切断時のin-flightの隔離、有限timeout、旧ACK・旧snapshotによる巻き戻しの禁止。
- **運用上の確認**: 当該資料には2026-10-22時点で既存Firebase RTDBルートの匿名read/writeが期限付きで、**2026-11-08頃に失効するという本人確認記録**あり。現行Rulesをこの調査から検証したわけではないので、接続・変更前にFirebase Consoleで再確認する。既存プロジェクトのルートRulesを上書きしない。

### 4. LEMON CLASH — 権限/結果照合の別アプローチ
- [online-protocol.js](https://github.com/8mahi8/lemon-clash/blob/dev/ipad-hand-ui/src/online-protocol.js) と [online-app.js](https://github.com/8mahi8/lemon-clash/blob/dev/ipad-hand-ui/src/online-app.js)。
- コミット/公開（commit–reveal）による同時ターン入力の秘匿、前状態と公開行動からの整合照合。Firebase内オブジェクトのキー順が違っても意味上等しいか検査。
- **非採用**: 妖怪対戦は時間進行するサークル/タッチ入力なので、同時ターン式commit–revealをメイン通信に流用しない。将来の不正検知・検証には参考となる。

## Firebase公式資料（実装時に再照合）

1. [Realtime Database Web read/write](https://firebase.google.com/docs/database/web/read-and-write) — リスナー/transaction、特定パスでの購読。
2. [Offline capabilities / presence](https://firebase.google.com/docs/database/web/offline-capabilities) — `/.info/connected`、`onDisconnect()`、接続ごとのpresence。登録成功を待ってからonline=true。
3. [Database Security Rules](https://firebase.google.com/docs/database/security) — `auth.uid` に対応したread/write/validate、最上位Ruleの意図せぬ広域許可に注意。
4. [Anonymous Authentication](https://firebase.google.com/docs/auth/web/anonymous-auth) — 個人のGoogleログイン不要な匿名UID。
5. [Database performance](https://firebase.google.com/docs/database/usage/optimize) — リスナーを深いパスへ、通信量・頻度を計測しながら変更。
6. [Local Emulator Suite RTDB](https://firebase.google.com/docs/emulator-suite/connect_rtdb) — **demo project** のローカル環境でRules/多接続を検証。本番データを書かない。

## 妖怪対戦への採用設計（初期案）

- **接続**：Firebase RTDB + Firebase Anonymous Auth、ユーザーの操作は既存 `engine/match-protocol.mjs` の許可コマンドへ限定。
- **データの分離**：新名前空間 `yokaiRoomsV1/{roomCode}` など、既存ゲームと別。 `meta`（version、session、hostUid、guestUid、status）、`inputs/{uid}`（clientSeq＋intent）、`state`（host revision + game snapshot）、`presence/{uid}`（接続状態）を候補とする。**実運用の構造はRulesとの整合を確認してから確定**。
- **席と権限**：最初に認証UIDを得てからトランザクションで席を確保。サーバー側Security Rulesで各UIDが自己入力のみ書けるよう検査。ホストUIDだけに状態書込許可。勝手な出席・相手コマンド偽装・巨大入力を拒否。公開できる設定値（SDK apiKey）と秘密の管理鍵を区別。
- **権限の限界**：ホスト側ブラウザで決定的エンジンを走らせる選択は「身内対戦向け」。Firebase Rulesはホストが嘘のHPを計算する行為までは防げない。ホストが落ちた時は暫定的に試合一時停止を基本とし、無条件の権限乗換えをしない。
- **入力整合**：既存Phase 11〜12の `side`・`clientSeq`・`revision`・ACK重複排除・古いsnapshotの無視を維持。加えて `matchSession` / `hostEpoch` / `connectionEpoch` などで**同番号の別試合と別接続**を区別。
- **復旧**：Firebase `onDisconnect` を先に登録、`/.info/connected` を監視。SDK未解決書込があっても無限busyにならないbounded timeoutと、復帰後に古いACKが新試合を巻き戻さないガード。
- **受信**：ゲストは更新をrevision順に検査、画面反映はフレーム単位で最新snapshotだけ。入力ACKは状態適用と区別。5行動予測等のレンダリングは原作エンジンの表示と分離。
- **Google Sites**：外部URLを埋め込むのではなく、最後に直接貼り付け用の単一HTMLを生成する。初期版の閃光魂OFF、費用0円。

## 作業・テストの順番（先に必要なのは実通信でなく再現可能な失敗試験）

1. Phase 12アダプターの入力契約を固定し、座席/認証/ルーム世代の状態機械を単体で実装。
2. Firebaseローカルエミュレーター＋公式SDK＋デモ用RulesのCIを準備。匿名UID2人・3人目拒否・相手操作・無認証の拒否、room二重作成競合を検証。
3. 2独立ブラウザで作成→参加→両方の操作→ホスト進行→同一HP/勝敗を照合。
4. 遅延・逆順・旧session・ACK欠落・長時間未解決Promise・ホスト切断・Safari休止復帰を故障注入。
5. 状態payload byte数、snapshot受信頻度、適用処理時間、ACK往復、描画フレームを計測。失敗時のエラーコードを区別。
6. 実Firebase検証は**新規の隔離環境または明示許可された専用パス**のRulesが正しいと確認してから。既存サービス/本番Rules・main・Googleサイト版を勝手に操作しない。

**総括**: BRAWLのRulesエミュレータQA、3Dサッカーの未解決書込/旧セッション対策、小国戦線のsnapshot最新1件化を中心に採用。FPSの位置同期や同時ターンのcommit-revealを機械的にコピペせず、妖怪対戦の離散操作/ホスト確定に合わせて作る。
