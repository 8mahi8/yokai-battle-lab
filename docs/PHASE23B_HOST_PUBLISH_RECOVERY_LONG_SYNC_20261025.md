# Phase23-B｜戦況Publish失敗・長時間ゲスト入力・再接続の受入QA

日付: 2026-10-25 JST
開発ブランチ: `feat/phase1-action-circle-lab-20261023`

## 1. 全体のどこを実装したか
原作再現の研究（Phase21/22）→ 既存正規2席ホスト`engine/match-protocol.mjs` → **Phase23 Firebase RTDB Auth/双方向ACK同期の耐障害性** → Phase24学校の旧iPad Safari/Google Sitesに**単一HTML/CSS/JS直接コード埋め込み**。

Phase22Dのノーモーション必殺/カウンター対象の正確な原作時間はフレーム未実測のため変更せず、研究用の800/500msは引き続き本番ホストへ統合しない。初期双方同一レンタル6体、Flash魂なし。

## 2. 実際に見つかった問題
- 権威ホストは`protocol.dispatch()`を実行してから`publishSnapshot()`でFirebaseへ反映する。通信や一時エラーで**戦況のpublishだけ失敗**すると、ゲストは次の入力へ進むための**ホストACKを得られず止まる**。
- ゲストの`retry()`は未確定の元`clientSeq`で再送するが、ホストの`processedGuest`がその番号を重複除外するため、**ゲストからの再送だけでは未配信の戦況を回復しない**。
- `createFirebaseMatchHost`には既に`status().dirty`と`retryPublish()`が実装されていたが、ブラウザの研究画面は**復帰時に呼び出しておらず、ボタンはゲスト入力再送のみに対応**していた。
- Firebase実エミュレーターの[既存QA](../tests/firebase-room-emulator.cjs)では、ホストの内部revisionが進んだ直後に**まだリモートへpublish中のrevision**を即比較していた。正常な非同期保存でも1 revision古いことがあり、失敗になった（実際のrun [40158597297](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40158597297)、remote6 vs internal7）。原作/ゲームロジック不具合ではなく**受け入れテストの同期不足**。

## 3. 今回した作業
**`lab/firebase-match-stage.html`**（研究ブラウザのみ）:
- presenceが「オンラインで、相手も接続」の状態へ**false→trueに復帰した時**、ホストの`dirty`が残っていれば`retryPublish()`を非同期実行し、ホストの**最新の権威戦況を再配信**。ゲーム命令の再実行はしない。
- 従来`retry`ボタンはゲスト専用だったが、ホストなら「未反映の戦況を再送」、ゲストなら「未確定入力を再送」のそれぞれの正しい用途へ切替。ホストはdirtyの場合、ゲストは未ACKの`pendingSequence`がある場合に限り、**2人ともオンライン時**だけ押せる。
- Firebase接続復帰しただけでリプレイ/ゲームロジックを推測して復元する仕組みではない。ブラウザ完全再起動でホストエンジンを復元する機能は追加しない。

**`tests/firebase-match.test.mjs`（新規3ケース）**:
1. **Publishだけ1回失敗**: ゲスト入力1回が権威ホスト内部で成立しているがゲストACKなし。ゲストが同じseqを再送してもホストは二重実行せずACKも復活しない。その後、ホスト`retryPublish()`で元の判定・hashを保ったまま最新状態を送信し、ゲストACKが復旧する。
2. **長時間/遅延**: 1回の`publishSnapshot`を遅延させ、その間に正規自動戦闘を120回進める。ホストのdirtyフラグにより最後のrevision121までまとめて追いつき、未保存の中間画面をゲストが見たと偽装しない。書込は120回分を逐次送らず少数回へまとめる。
3. **ゲスト操作90件**: ホストACKを一時遮断している間も操作FIFOは登録順を守り、再びACKが届いた後は91個の連番を飛ばさずホストで処理する。ジャーナル再演結果も一致。

**`tests/firebase-room-emulator.cjs`**:
- 既存の旧ホスト再起動拒否テストで、ローカルrevisionを取得したらまず`hostMatch.status().lastPublished`とゲスト側最新revisionが追いつくまで待ち、リモートの`readPublishedSnapshot()`を実際に確認してから再起動拒否を検証。非同期の遅延を、本当のデータ不一致として誤判定しない。

**`.github/workflows/phase14-firebase-browser.yml`**:
- `tests/firebase-room-emulator.cjs`と`tests/firebase-match.test.mjs`の変更も実Chromium + Auth/RTDB local emulator 2席QAを起動するトリガーへ追加。

## 4. テスト結果・証明範囲
- [Node469/469（新規3件）＋Chromium研究用QA](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40158643927)成功。正規戦闘Journalと同一入力番号ACKを検証。
- [Firebase室の実エミュレーターテスト（修正済）](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40158699516)成功。[2席Chrome Stage基本操作](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40158699530)成功。
- [本修正を含む最終2席Firebase Chromium/Emulator](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40158741445)の完了判定も確認すること。
- **定量の範囲:** 120回の正規自動行動と90件の入力を**Node/Injected transport**でストレス再現。これは120分の連続実端末ゲームや90人同時通信ではない。2席ChromeはFirebaseローカルAuth+RTDBであり、**学校旧iPad Safari・Google Sites直接埋込・本番クラウド・実Nintendo 3DS比較はいずれも未実施**。

## 5. 次の作業
1. **Phase23-C:** Chromeの実RTDB emulatorでホストの publish エラー/復帰時の`dirty`遷移を強制注入した受入E2Eを追加。通常通信と同じ権威ACK・二重消費防止を保証する。
2. **Phase24準備:** 学校旧iPad Safariでの上下画面とPointerEvent、メモリ、Google Sitesの「コードを埋め込む」ための1HTML/JSビルドの検討。現時点では直接埋込可能な公開版が完成したと宣言しない。
3. **Phase22D-C:** 原作ノーモーション/カウンターの同時刻2視点映像が得られるまで原作フレームは未確定として研究専用を維持。

**変更先:** `feat/phase1-action-circle-lab-20261023`のChrome研究UI、Node/Emulatorテスト、CI/進捗資料のみ。正規PvPの妖気・HP・回転・カットイン時間は変えていない。main、公開済Googleサイト版、クラウドFirebase、課金、Flash魂OFF方針に変更なし。君の操作は現時点で不要。
