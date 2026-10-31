# 妖怪ウォッチ2 1vs1｜Engine V3-3-3 Firebase再送・再接続・ACK整合性（2026-10-30）

## なぜ取り組んだか
V3-3-2は論理行動・HP確定・表示時刻の境界を対戦ホスト内で確認できた。一方、学校iPad2台をつなぐFirebase Friendsでは、**ゲストの操作がリモートRTDBへ書き込めたこと**と**ホストが適用し、相手画面へスナップショットが届いたこと**を別に判定する必要がある。Firebase Web SDKは書込時にローカルイベントを先に発火させ、サーバー確定前にUIに見えることがある。Webのオフライン書込はページを閉じると永続保証がない。

公式資料：
- Firebase [Read and Write Data on the Web](https://firebase.google.com/docs/database/web/read-and-write)：書込Promiseはサーバーへの確定、transaction更新関数は競合すると再試行される。ローカルイベントが確定前に発火する旨を記載。
- Firebase [Offline Capabilities for JavaScript](https://firebase.google.com/docs/database/web/offline-capabilities)：`/.info/connected`はクライアントごとの観測で、双方同時接続の証明ではない。再接続時の状態同期、onDisconnectはサーバー側登録で再接続後に再登録が必要。
- Firebase [JavaScript database SDK](https://firebase.google.com/docs/reference/js/database)：`goOffline()`/`goOnline()`と未送信書込の再接続後送信についての説明。

## 今回見つけた実装上の危険と修正
1. **旧attemptのエラー競合**：`network/firebase-match.mjs`の`createFirebaseMatchGuest.deliver()`で、古い書込Promiseが後からrejectした場合、すでにより新しい同一seqの`retry()`が進行していても`onError()`を発火できた。変更：結果判定だけでなく例外報告も`pending===current && delivery===attempt`でガード。**古いwriteが遅く解決しても、新しい試合の接続エラーとして誤通知しない**。未確定のwriteを実際にキャンセルしたとは主張しない。
2. **スナップショットのACK検証が弱い**：`receiveSnapshot()`で通信packetの`revision`と中身の`state.revision`の整合を比較していなかった。変更：session・nonnegative safe integer revision・state object・`state.revision===packet.revision`・`clientSequences[1]<=state.revision`をすべて検査し、不整合・欠落なら**ACK/表示更新を一切しない**。リモートのFirebase Rules保護や正式認証の代わりではなく、異常通知から誤った画面巻き戻りや成功表示を防ぐ防御策。
3. **既存設計は維持**：ゲストはstop-and-wait、次命令はホストACK後のみ送信、未ACKの元命令は同じseq+intentで明示再送、切断中は未送信のタップキューを廃棄、リアルタイム修復はホストの正規スナップショットの再受信。未確認のアニメーションmsや原作ルール、通信ハッシュ、RTDBパス変更なし。

## 検証した内容
- `tests/firebase-match.test.mjs`に**2件**新設。前回の再送Promiseが後からrejectしても最新attemptのUIエラーにはならず、1回のACKのまま受信できること。revision不一致・未来のguest sequence・別session・null packetは受信してもACKにしないこと。
- `tests/firebase-friends-noauth-emulator.cjs`に**実Firebase RTDB Emulator2席の再接続シナリオ**を増設：新規ルーム、両席でhost+guestのbridgeを作成→1件目をリモートACK→同じseq+intentを再送してもホストrevision増加ゼロ→ゲストの`goOffline`→ゲスト配送受付停止→ホストが3回auto行動してリモート状態更新→ゲストにはオフライン中の更新なし→`goOnline`→自動catch-upで正規state完全一致→同じ操作のACK重複なし→seq2の新しい操作を正常適用。
- コードSHA `5f69ab28c84b02315e59b15c814b4d702908884b`の[Node/Chromium GitHub Actions #40907604375](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40907604375)：**787/787 tests PASS、fail 0**、自然6体対戦、Chromium操作まで全step SUCCESS。新しい2テストもログ上個別PASS。
- 同SHAの[Phase37 Firebase Friends no Auth QA #40907604381](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40907604381)：**全step SUCCESS**。ログに`FIREBASE-FRIENDS-RECONNECT-ACK-PASS real RTDB offline catchup, idempotent resend, one ACK, new seq`。旧2席対戦24ホスト行動とACK/正規snapshot一致、リアルChromium 2iframe、Google Sites用75モジュール単体HTMLビルドも全てPASS。
- 本番Firebaseについては既存CIが予約済み非ルームキーの**匿名GET1回のみ**実施（HTTP200、body非閲覧）。本番で操作・書込・ルール変更なし。学校Safari実機2台とGoogle Sites実埋込は未検証。

## 注意・未完
- 今回検証したのは**接続中のブラウザが一時切断した後の同期**。**ブラウザの完全再起動・ホスト端末の再読み込み後の同じ試合の復元は実装していない**。現行ホストは正規スナップショットが残る既存ルームへの新エンジンの誤上書きを防ぐため、安全に再開拒否する。これを「断線復旧完成」と誤解しない。
- Firebase no-Auth Friendsは身内試遊用だが、セキュリティルールも完全な信頼性・チート対策も省略してよいわけではない。Rulesの変化、本番接続とSafariでは再検証が必要。
- 原作再現の進捗ではV3-3（時間・表示・通信）中盤。V3-4データ駆動のキャラ/技定義、V3-5原作動画との比較・学校Safari実機の最終QAは未完成。main、学校公開HTML、本番DB/Rules/Auth、Driveは変更しない。

## 次の工程
**V3-3-4**：ホストのスナップショットpublish失敗やリプレイ時、入力の受理→戦闘確定→公開revision→ゲスト描画の整合性を実RTDB2席でさらに確認。通信バッチのタイミングと表示保留の整合を検査し、実行可能な場合は独立した2画面「遅延ACK中のホスト自動進行」E2Eを追加。原作未確定の再送タイムアウトを勝手に変えない。
