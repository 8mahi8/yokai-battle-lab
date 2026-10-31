# 妖怪ウォッチ2 Engine V3-4-22｜実Firebase二席で行動の受信・描画差を測定（2026-10-30）

## 結論と次の判断

学校向けの**認証なしFirebase Friends**と同じHTMLビルドから派生した**localhost限定RTDB Emulatorビルド**で、実Chromiumの`about:srcdoc` 2席の`eventId`ごとに確定状態の到達/描画時刻を計測。最新の検証済みCI 2試行（3行動ずつ）では、**ゲスト表示のホスト表示に対する差は11〜23ms（1試行中央値11ms、もう1試行中央値19ms）**。前の成功CI 2試行でも9〜18ms（中央値10ms/16ms）。単一PCのローカルRTDBエミュレーターでは**大きな表示ずれの実害は確認されなかった**。

**判断：新しい時刻同期サーバー、共通クロック、Firebaseペイロード変更は採用しない。** 実iPad Safari二台で通信・画面の体感ずれが確認されたときに再評価。それまでは**V3-5の全試合再現とゲーム体験の完成**へ戻る。これらの数値を学校の別端末・別ネットワークの通信遅延値と取り違えない。

## 確認資料・測定上の注意

- [Firebase公式：Read and Write Data on the Web](https://firebase.google.com/docs/database/web/read-and-write)：RTDBの購読は初期状態とデータ変更に対し非同期でコールバックされる。端末間の演出開始が同時になるという保証ではない。
- [MDN：Performance.timeOrigin](https://developer.mozilla.org/en-US/docs/Web/API/Performance/timeOrigin)／[High precision timing](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/High_precision_timing)：同じブラウザ内で異なるiframeの`performance.now()`の原点を`timeOrigin`で変換可能。**異なるiPad間の時計ずれはこの方法で解決できない。**
- [前工程V3-4-21](./ENGINE_V3_4_21_FIREBASE_MOTION_DELIVERY_20261030.md)：受信改訂の飛び/再接続でも古い相手円を演出全長隠し直さない研究表示契約。今回そこを学校用に有効化したわけではない。
- 観測した`host.receivedAt`はホスト自身の`onSnapshot`（戦闘確定後、Firebase publish前）であり、Guestの`receivedAt`はRTDB Listenerから`onSnapshot`に届いた時点。**両者差はホスト更新→Firebase送出→RTDB受信・キュー処理までを含むエンドツーエンド時間差**。純粋なネットワークRTTとは言えない。`renderedAt`は直後の`stage.render`関数が返った時点（画面のペイント完了/物理ディスプレイ表示の証明ではない）。

## 最小実装と本番切り離し

- `lab/sites-embed-online-entry.mjs`：**ビルド定数が`__YW_EMULATOR_MODE__ && __YW_FRIENDS_MODE__`のときだけ**、`window.__ywMotionTimingTrace`（直近64件、読み取り専用QA用）に新しいAction `eventId`、`revision`、同時まとめ受信数、`receivedAt`、`renderedAt`、描画中の`sceneEventKey`を保存。通常は元の`stage.render → updatePresence`にそのまま進む。戦闘・通信・ホスト時計や既存UI動作に介入しない。
- `tools/sites-online-smoke.mjs --emulator-friends`：既存の**2 iframe + 認証なしRTDB emulator + 6桁部屋/ゲスト操作ACK + 自動試合進行 + 回線切断・復帰 + 4画面幅**の実ブラウザQAで、対応する`eventId`の受信/描画サンプル3組以上を比較しログへJSONで出力。UIに隠し研究ボタンを追加しない。届いたActionが両席のSceneに一致するか、まとめ受信が無いかも記録する。
- `tools/build-sites-online.mjs`：**学校配布用`--friends`成果物には`__ywMotionTimingTrace`が一文字でもあればビルド失敗**。逆に研究用`--emulator-friends`に欠けていたら失敗。最初の実装は校内用成果物にこの識別子が残る不具合を検出し、明示的なビルド定数による除去に修正。**最後のコードCIでは両ビルドの分離を確認済み。**
- ネットワーク`network/firebase-match.mjs`、`network/firebase-room.mjs`、`engine/match-core.mjs`、Firebase Rules/DB/Auth・学校で稼働中のGoogle Sites HTML・GitHub mainには変更なし。作成された`dist`はCIの一時成果物で学校へ配布していない。

## 実測値（実RTDB Emulator + 実Chromium）

| 検証 | 比較された行動 | Guest表示−Host表示の範囲 | 中央値 |
| --- | ---: | ---: | ---: |
| [計測機能追加後の成功CI #41051989432](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41051989432) / Emulator Friends | 3 | 9〜12ms | 10ms |
| 同CI / 旧期限ルールを独立Emulatorで再現 | 3 | 15〜18ms | 16ms |
| [ビルド隔離修正済みCI #41052221741](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41052221741) / Emulator Friends | 3 | 11〜12ms | 11ms |
| 同CI / 旧期限ルールを独立Emulatorで再現 | 3 | 13〜23ms | 19ms |

最新6件の`eventId`は全てHost/Guestで一致、各行動の`sceneEventKey`も一致、Actionのまとめ受信は0件。Hostの`onSnapshot`到達→`stage.render`復帰は2〜3ms、Guestは1〜3ms。数値はこのCIランナー/同一ブラウザ/localhost RTDBの**観測結果であり、Safari iPadの性能を測ったものではない**。測定点はDOMペイント前である。

[最終コード Node全件CI](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41052219969)：前工程から929件の回帰を維持。[最終コード Stage Chromium QA](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41052219936)：通常の2画面・描画・操作回帰成功。[Firebase Friends実通信 QA](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41052221741)：ログ上ビルド分離/2 iframe実測/再接続・旧期限fixtureまで成功。

## 未検証と次工程

原作3DSの秒数、User提供原作動画を今回直接見たか、Safari iPad2台の**実通信の遅延分布**、物理フレーム間の見かけの同期、学校Google Sites実貼り付け、新V3の友達1試合完走は未確認。

**次 V3-4-23：新しい時計同期機構ではなく、既存6体の「開始→全操作→必殺/おはらい→敵KO→勝敗→再試合」を原作映像台帳に沿った一試合の統合受け入れ試験にまとめ、実画面と規則の未完成部分を優先順に抽出する。** 不明な原作フレーム/確率を推測だけで補完しない。必要な基盤だけを完成させてV3-5へ近づける。

開発ブランチ：`feat/phase1-action-circle-lab-20261023`。GitHubへの変更履歴を再開時の正規入口とし、学校版・本番DB/Rules・main・Driveは維持。
