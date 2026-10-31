# 妖怪ウォッチ2 Engine V3-4-21｜Firebase遅延・再接続時の相手サークル誤保留を防ぐ（2026-10-30）

## 目的／原作研究との境界

V3-4-20は既存`engine/presentation-timeline.mjs`を利用し、研究画面に「相手のサークル/Soul表示をモーション中保留する」機能を作った。しかし、ホストとゲストは**異なるSafariのローカル時計**でモーションを開始する。Firebase Friendsは`revision`と`eventId`を送るが、ホスト上でモーションを開始した**共通時刻の原点**を送らない。

原作根拠：[たくトンボ『妖怪ウォッチ2対戦の基礎テクニックと仕様』](https://note.com/tombow_yw/n/n1e4cf179d2d9)では、モーション中のサークル操作やチャージが相手の画面には直ちに反映されないという対戦経験が説明される。ただし正式な表示制御の3DS内部コード、秒数、フレーム境界は未確認。本人提供の2026-10-27動画は両席同時収録ではないため、それらを独立に確認する根拠にはならない。

外部技術資料：[MDN `performance.now()`](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now)では各閲覧コンテキストの`timeOrigin`基準の単調時計と説明される。`performance.now()`の**数値を別iPad同士で比較できるわけではない**。[Firebase公式 Realtime Database documentation](https://firebase.google.com/docs/database/web/read-and-write)ではクライアントのリスナーが同期した状態変更を受信するが、**全クライアントのユーザー画面のアニメーション開始時刻が一致する保証ではない**。

## 実コードを監査して見つかった具体的な問題

- `network/firebase-match.mjs`ではHostだけが`createMatchProtocol`を進めて`publishSnapshot`する。Guestは`revision`の単調増加をチェックして最新の状態を受け取り、同じ/古い改訂は捨てる。ここは正しく動作中なので変更不要。
- ローカル画面の`ui/match-stage.mjs`は新しい`eventId`のActionを受信した時点で`performance.now()`からモーションを開始する。**Hostがrev1で行動→rev2で相手がサークル回転し、Guestがrev0からrev2だけを受信すると**、最新の相手サークルが分かっているにもかかわらずrev0のサークルをさらに全モーション時間隠してしまい得る。
- Hostの時刻をGuestで再構成できない現状で、推測のネットワーク遅延msやクライアント間の`performance.now()`直接比較を入れても厳密に解決したことにはならない。小規模の学校対戦に必要のない複雑な時刻同期サーバー等も追加しない。

## 実装：古い相手サークルを誤ってもう一度隠さない

- **新規`ui/seat-motion-delivery.mjs`**：`assessSeatMotionDelivery({previousView,currentView,freshCues,skipped,sceneActive})`。相手表示の保留を許すのは、前回の正規Snapshotが存在し、**revision差が正確に1、新しい行動演出が1つ、履歴欠落なし、まだ別の演出を再生していない、未決着**のときだけ。旧/同一revision、間引きされたイベント、まとめ受信、画面初参加/再接続、試合終了では保留しない。
- **`ui/match-stage.mjs`**：研究モード`researchOpponentVisibility:true`だけでこの判定を呼び、`beginScene`に`allowOpponentHold`を渡す。通常の戦闘結果・HP/状態・Soul消費・ホストの自動行動・入力・Firebase送信形式・`eventId`や`hash`は変更しない。従来の演出キュー自体は継続、誤保留だけを抑える。研究用`stage.getStatus().motionDelivery`に`reason`とrevision差を表示するデバッグデータを提供。
- `tests/v3-4-21-firebase-motion-delivery.test.mjs`：**実`createFirebaseMatchHost/Guest` + `createMatchProtocol`**とメモリ上の遅延ルームで(1) rev1未着のままrev2まとめ配送、(2) rev1到着後の本人/相手別サークル更新、(3)再接続したGuestがrev2初着・遅いrev0/重複rev2無視、(4)改訂逆行/複数演出/スキップ時は表示保留禁止を比較。ラボ専用の通信間引きであり、実学校Firebaseの回線を変更しない。
- `lab/match-stage.html?review=seat-motion-gap-v3` + `tools/stage-smoke.mjs`：Chromium実DOMでrev0→rev2だけ配送されたGuest視点を再現。Bが**A2,A3,A4を即表示し、古いA1,A2,A3を再固定しない**ことをテスト。従来のV3-4-20順次到着・回転→表示保留→解放、ブラウザ画面のタッチと操作QAも継続。

## できたこと／まだできていないこと

**できた**：研究モードで最新Snapshotと矛盾した相手サークルの誤保留を減らした。既存の無認証Friends通信、リアル2席、通常の学校向けビルドは現状維持。

**未完**：revision差1でもGuestの通信遅延はゼロとは限らない。両席ローカルアニメーションの開始/解除時刻を完全一致させるには**ホスト起点の表示境界メタデータ＋各端末で共有可能な時計基準**の実証が必要で、現在は厳密な原作秒数の証拠がない。まして本家の特定技のカットイン秒数と一致したわけではない。**ここで無条件に学校向けFriendsへONにしない。**

## テストと証拠

- [Research CI（V3-4-21テスト追加後）](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41050085643)：**929/929 pass, 0 fail**（新規4件）。
- [Phase14 Stage CI（**最終Chromium実DOM・全job成功**）](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41050226846)：既存の通常戦闘/実PointerEvent/おはらいE1/二席のモーション保留に加え、**V3-4-21-GAP-PASS：rev0→rev2の飛び受信でも旧サークルを再固定しない**とログで確認。
- [Firebase Friends no-Auth QA](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41050085717)：既存の二席回帰は成功。通信間引きは上記のメモリRoom試験で実施し、本番DB・Rules・認証は変更していない。
- 学校のiPad Safari 2台、実際のGoogle Sites埋め込みでの表示の時刻同期、元動画との同時比較は**未実施**。

## 次工程 V3-4-22の判断

この仕組みを実用化するなら、まず**実2iframe/RTDB Emulatorで同じ確定`eventId`を受け取る時刻の差**をリスナー側のローカル計測で可視化し、通信ラグがゲーム体験に影響するかを測る。観測結果によって、ホストの視界メタデータを最小限追加する案と、現状の表示固定なしで遊ぶ案のコスト/操作性を比較する。不要なら複雑な時刻同期は採用しない。

開発は`feat/phase1-action-circle-lab-20261023`へ保存済み。GitHub main・学校Google Sites直接埋め込みHTML・本番Firebase Rules/DB/Auth・Google Drive配布を変更していない。
