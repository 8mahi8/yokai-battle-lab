# Phase22D-C / Phase23-A｜原作演出の未確定時間とFirebase切断中ゲスト待機操作の抑止
**日付** 2026-10-25 JST / **開発ブランチ** `feat/phase1-action-circle-lab-20261023`

## 1. 全体設計における位置
原作3DSのノーモーション・カウンター・輪回転の根拠（Phase22D）→ 既存研究エンジン`engine/presentation-timeline.mjs`／`engine/counter-window.mjs`（**通常2席に未統合**）→ 実装済み正規2席ホスト`engine/match-protocol.mjs`→ Firebase Auth/RTDBの部屋と同期（Phase23）→ 旧iPad Safariの実機／Google Sitesへの**単一HTML直接コード埋め込み**（Phase24）。

今回は原作の正確な映像秒数やノーモーション同期機構は**依然測定できていない**ので、研究用800ms/500msを通常戦闘へ足さず、**既存のオンライン通信安定化**に集中した。

## 2. 公式Firebase資料による通信仕様の確認
- [Firebase公式 Web RTDBオフライン書込](https://firebase.google.com/docs/database/web/read-and-write)：オンライン切断中でもクライアントはローカル書込イベントを発生させ、接続回復後に書込を同期し得る。書込完了と**実際に戦闘ホストで操作が成立したこと**は別。
- [Firebase公式 Web JS presence](https://firebase.google.com/docs/database/web/offline-capabilities)：`/.info/connected`は**そのクライアント固有のオンライン状態**。相手の接続はonDisconnect / presenceで別途観測する。接続が切れている状態で仮に事前タップ列を蓄積し続けると、回復後に遅れて実行され、実戦体験を壊す懸念がある。
- **前段のアーキテクチャ**：`network/firebase-match.mjs`はゲストがホストの権威`clientSequences[1]`を待つ**stop-and-wait**と、最大48件の高速指入力FIFOを実装。Phase22Cの`completed` ACKは途中タップ成功/実際の必殺発動を区別。前段のFirebaseローカル2ブラウザ6タップは合格済み。
- **原因**：アプリはpresenceがオフラインでも、すでにFIFOへ蓄積された未送信コマンドを破棄／無効化する仕組みがなかった。手元のボタン操作を拒否しても、内部待機列の古いタップが後から流れる余地があった。

## 3. 実装した対処（数値・戦闘ルールは変更なし）
**`network/firebase-match.mjs`**
- `setDeliveryEnabled(boolean)`追加。presenceが切れるとゲスト側の**未送信FIFOだけ破棄**、以後の`submit`/`enqueue`/`retry`を`connection_paused`でブロック。
- **送信済みの1操作は保持**。そのFirebase書込は断線前にサーバーへ到着している可能性があるため、消す／番号を加算して別命令として再送することはしない。再接続後にプレイヤーが権威側の画面を見て`retry()`を押せば**同一clientSeq・同一intent**で再送でき、ホストの重複入力防止で二重効果を防ぐ。
- `setDeliveryEnabled(true)`で新入力を再許可。すでに適用済みでACKが遅れていたなら自動でクリアされる。**未送信キューの古い入力は再現しない**。同状態設定は何度実行しても新たな破棄を起こさない。
- `status().deliveryEnabled`で状態を表示できる。ホストの権威状態、プレイヤー操作の順序、対人ルールに変更なし。

**`lab/firebase-match-stage.html`**
- Firebase `watchPresence`と`watchPeerPresence`が示す**「自分がオンライン、かつ相手もオンライン」**状態をもとにゲストの`setDeliveryEnabled`を更新。
- 切断時に破棄した未送信操作数を表示し、**送信済みの1件はACKまたは明示的な再送で確認できる**と知らせる。切断中は既存の`2P PAUSE`表示、操作・再送ボタンは無効。接続復帰後、同じ対戦を再開できる。
- この画面はFirebaseのローカル研究エミュレーター専用。ユーザーが遊んでいるGoogle Sites版は変更していない。

**`tests/firebase-match.test.mjs`（新規3件）**
1. 複数の高速タップがFIFOにある間の切断：未送信2件を破棄、送信済みの1件は権威ACKを待ち、古いウォッチ切替は勝手に適用されず復帰後の新しい操作のみを送れる。
2. 送信済み1件のACK欠落：切断中の`retry()`は拒否、復帰後は**同一番号で再送**、ホストは1回だけ回転、Journalの決定性維持。
3. presenceが複数回切り替わっても古い操作が流れず、boolean以外の不正入力は拒否。

**`tools/firebase-charge-smoke.mjs`（実Chrome／ローカルFirebase試験強化）**
- 先行の**匿名アカウント2席で6タップ→途中5ACK・最後1ACK→双方ゲージ0**の確認に追加して、ゲスト側Firebase SDKを実際に`goOffline`、ステージが`2P PAUSE`になることと切断中の輪回転が**ホストの前衛3体／revisionを変更しない**ことを検査する。
- `goOnline`で再接続したあと、同じタブで新しい輪回転を実施し、**次のclientSeqが権威ホストのACKへ進む**ことを確認。通信に使うのはFirebase Auth+RTDBローカルエミュレーターのみ。
- DOM試験では前衛を誤って空リストと比較しないよう、`mb-bench`で判定して**前衛3体であることも必須**とした。

## 4. 品質・証明範囲
- [Node466件（新規3）／研究Chromium](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40157857872)：全件合格（後続runも確認）。
- [本家風ステージChrome指操作](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40157931400)：成功。
- [Firebaseローカル2席Chrome・断線復帰テスト](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40157931502)：最初の強化版で成功。前衛3体検査を強めた最新版は [Actions](https://github.com/8mahi8/yokai-battle-lab/actions) で判定。
- **注意**：このブラウザ試験は1つのローカルChromium内の2つの独立iframe＋Firebaseエミュレーター。学校の実際の古いiPad Safari／モバイル回線での接続断・Googleサイト直貼りは**未確認**。本番Firebaseも使用していない。
- 完全なブラウザ再起動後の試合自動復元は設計の対象外。今回改善したのは**タブが生きたままの一時的な回線断復帰**。
- Firebase SDKがすでにローカルに受けた書込を取り消すものではない。切断前に送信された1件の可能性は残るので、**同じclientSeqで権威ACKまで確認**する仕様。

## 5. 次の実装・検証
1. **Phase23-B**：実2ブラウザで一時的な接続断が起きたときのインフライト入力の重複抑止と、再送ボタンの操作性。より長い試合・旧iPadのSafari/Google Sites埋込での端末差とフレーム負荷。
2. **Phase22D-C残**：2015年のノーモーション両視点映像について、時間同期できる元フレームを入手できる場合だけカウンター対象フレームと表示遅延を測り、原作との比較根拠を増やす。**800ms/500msを原作値扱いしない**。
3. **Phase24**：学校旧iPad Safari実機を使い、プレイヤー2人の同一ルーム、タッチ操作、通信エラー復帰を最終確認。Google Sitesへ単一HTML/CSS/JSをコード直接埋込するのはユーザーの公開操作。

**変更先** GitHub開発ブランチ`feat/phase1-action-circle-lab-20261023`のみ。main、学校Googleサイト公開版、本番Firebase、費用、閃光魂初期OFFの方針は変更なし。現段階で君の操作不要。
