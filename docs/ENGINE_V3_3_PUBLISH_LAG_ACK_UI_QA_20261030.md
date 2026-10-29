# 妖怪ウォッチ2対人再現｜V3-3-4 ホスト公開遅延・ACK・相手画面因果のQA
最終記録：2026-10-30（JST）

## 研究背景と検証した契約
Firebase RTDBはローカル書込イベントを**サーバー確定より先**に配信できる。ゲームでは`guest.sendIntent()`が成功しただけで効果成功を表示してはいけない。ホストが認めた正規revision/lastCommandOutcomesを受け取り、その結果をACK・表示の根拠にする。

Firebase公式：
- [Web read/write](https://firebase.google.com/docs/database/web/read-and-write)：ローカル書込イベントとリモートサーバー同期が異なるタイミングで起きる。Webブラウザを閉じた後、未同期の書込は保存保証されない。
- [Web offline and presence](https://firebase.google.com/docs/database/web/offline-capabilities)：/.info/connectedは**クライアントごと**の接続状態。onDisconnect登録は接続ごとに注意が必要。

**V3-3-4の受け入れ条件**：ホスト内ではコマンド処理・論理行動・ダメージが先に進むことがある。一方、host->Firebaseへのスナップショットpublishを保留中、ゲストの`revision`・ACK・表示ステージのゲーム状態は**最後に受信した正規snapshotにとどまる**。publishを解放したらguest側は先頭入力seqをACKし、FIFOの次コマンドを送信、連続したhost stateへ追いつく。単純なローカル応答やwrite成功をACKに使わない。入力数×描画/公開数の肥大化は回避する。

## 実装した検証（今回はゲームコード／バランス値の変更なし）
1. `tests/firebase-match.test.mjs` に**2件のNode回帰テスト**。
   - **出版遅延**：ホストpublishをテスト用Promiseで止める。guest入力1の正規処理後、ホストが24回自動行動。ゲストの`revision/ACK/stage`は初期版のまま、入力2はFIFO待機。解放後に2件ACK[1,2]と最終revision26/双方snapshot一致、ホストpublications<=4を検証。正規イベントとhost publishの集約。戦闘再生journalも成功。
   - **出版失敗からの修復**：1回だけホストpublishで例外を投じる。ゲストには正規ACK/結果表示を出さない。ホストが続行した次のpublishで、正規状態と先頭ACKが復旧し、失敗がUI上の架空ルール成功を作らない。シード付き戦闘journal再生も成功。
2. `tests/firebase-friends-noauth-emulator.cjs`に、既存の再接続QAとは別に**新規ルーム（827397）・実Firebase RTDB Emulatorの2クライアント**を追加。JavaScriptホストアダプタの`publishSnapshot`を**通信の直前で1回だけ**止め、そこ以外は実Emulatorを通す。8回のホスト自動行動中もゲストはrevision0・未ACK・旧画面を維持。解放後のACK[1,2]、revision10、guest最終表示stateのhost完全一致、表示revision単調増加を検証。`FIREBASE-FRIENDS-PUBLISH-LAG-PASS`ログで再実行可能。
3. 今回、新しい通信方式・時間制御・独自ゲームルール・スナップショット構造・Firebase Rulesを追加/変更していない。既存のストップ＆ウェイト、ACK後FIFO、ホスト正規publish、失敗時dirty維持、出版のcoalescingの**実装が意図どおりかを確認**した。

## GitHub Actionsの正式証拠
- 対象コードSHA：`71e0095ac8d5f78c82941ff418d28b086a43fb87`（これ以降の文書更新とは区別）。
- [Research battle unit tests run 40910421158](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40910421158)：**Node 789/789 PASS、fail 0、skipped 0**。追加2件、6体vs6体自然決着耐久、実Chromium研究UIの操作（Soul/Poke/Purify/ホストゲスト）を含む全job SUCCESS。
- [Phase37 Firebase Friends no-Auth QA run 40910420953](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40910420953)：全job SUCCESS。ログで`FIREBASE-FRIENDS-PUBLISH-LAG-PASS`、従来の`FIREBASE-FRIENDS-RECONNECT-ACK-PASS`、`FIREBASE-FRIENDS-COMBAT-REGRESSION-PASS`、実Chromium 2iframe QA `SITES-FIREBASE-FRIENDS-EMULATOR-PASS`×2、Google Sites単体HTML build（75 modules）を確認。
- 本番Firebaseへの確認は既存CIの予約済み非ルームキーへの**匿名GET一回**だけ：HTTP 200、DB本文非閲覧・書込0。main・公開Google Sites・本番Rules/DB/Auth・Google Drive変更0。

## 再現度と課題
- エミュレーターの**実ネットワークSDK**は使っているが、送信前ホストpublishのゲートはテスト注入した遅延。学校の実電波品質やSafariの負荷・iPad2台を再現したものではない。
- エミュCIが成功しても「オンラインゲーム完成」ではない。ホストの完全なタブ再起動後に対戦を復元する機能はない。
- さらに「相手画面にいつ演出が反映されるか」の原作3DSのフレーム時刻は未確認。今回保証できるのは**正規ゲームの通信・ACK・視点stateの一貫性**であり、**原作動画のカットイン表示の正確な秒数の再現ではない**。
- ユーザー提供の原作動画原本はこの工程で直接視聴できていない。
- 現在地：**V3-3第4工程（通信因果の統合ゲート）完了／V3-3全体は未完成**。

## 次の工程
V3-3の通信の土台はかなり検証できたため、これ以上単純なテストを無限に積むのでなく、**V3-3-5として正規イベント→表示イベントの順序とカットイン中の「入力受理/HP確定/相手公開」を整理して、V3-4の技・状態・キャラのデータID契約へ引き渡す**。原作の具体的な演出時間や未知のカウンター対象ルールは出典確認まで研究fixtureのまま維持。mainは変更せずDraft PRで進める。
