# Phase32｜ゲスト初期戦況の受信安定化と通常テンポの実クラウド対戦QA（2026-10-26）

## 位置づけ・配布境界
前作業Phase31でSupabaseリアル2 iframeの基本通信E2Eが複数回ゲスト初期状態の待機でタイムアウト。一方、Phase28の合成ステータスによる高速6体KOから勝敗同期までのリアルSupabase QAは成功していた。従って「ゲストの受信が必ず壊れている」と断定せず、**起動順の競合、試験時のネットワーク待ち、購読取得の遅延**を切り分けた。
本人は**「Googleサイトに貼るやつちょうだい」まで開発だけ進める**。学校用に既に渡したPhase27 HTML、Google Sites公開版、main、Supabase実DB/RLS/Auth設定、Firebase別ゲームは変更しない。新しいHTMLは配布しない。

## 今回確認した原因候補（断定は避ける）
- 実Supabaseの失敗時画面で、**ホスト側の表示も「部屋番号を相手へ伝えてください」から進んでいない**ケースが発生していた。ホストのUIはローカルのonSnapshot時点で表示されるが、その後の**クラウドへの初期スナップショット保存が完了するより前に**テストがゲスト接続を押していた。
- 以前のブラウザ試験は「ホスト戦闘画面が出たら試合開始完了」と誤認していた。初期保存完了は成功メッセージ「ホスト開始。ゲストの戦闘接続を待っています。」で区別できる。
- ゲストの初期データはSupabase Realtime/Postgres Changesと1.5秒のpoll fallbackに頼っており、初期イベントを取りこぼしたときの独立した1回取得は無かった。ネットワークの厳密な根本原因（RLSかブラウザ仮想時間か一時遅延か）は完全には特定できていない。

## 差分実装
- network/firebase-match.mjs：ゲストのcreateFirebaseMatchGuest.start()で既存subscribeSnapshotsに加えて、アダプターがreadPublishedSnapshotを持つ場合に**1回だけ直接fetch**し、共通receiveSnapshot関数で処理する。最新 revision・session・ACKの同じゲートを使うため、**後から届いた旧初期取得で新しいターンを巻き戻さない**。一度の取得に失敗してもサブスクリプションを維持する。
- これは**進行中に参加した同一ルームの初期取得**の補強。ページ再読み込み/閉じた試合の復活ではない。
- tests/firebase-match.test.mjs：購読が初期行を届けない場合の直接取得、古い直接取得が遅く返る場合の順序保護、直接取得失敗後も購読が機能するケースを3件追加。
- tools/supabase-sites-browser-smoke.mjs, tools/supabase-sites-full-match-smoke.mjs：ホスト画面表示だけでなく、**初期保存の成功メッセージ確認後**にゲスト接続を開始。ゲストが接続処理に入ったことと、その後のステージ受信を別々のチェックにした。
- .github/workflows/phase25-supabase-browser.yml, phase28-full-match-supabase.yml：network/firebase-match.mjs と network/supabase-room.mjs の変更でも実クラウドテストを起動するよう修正。以前はネットワーク変更が一部CIのpath-filterにかからなかった。
- tools/supabase-sites-browser-smoke.mjsを拡張し、1ターンだけではなく**正規の1,500ms自動時計で最低5ターン**をゲストが受信してホストに追い付き、ホストOFF後に余計なステップが進まないことを確認する試験を追加。

## 成功した証拠
- [Node554/554件 PASS（新しい初期取得3テストを含む）](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40216082728)
- [Chromium実Stage/指操作/勝敗表示 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40216082776)
- [実Supabase通常2席 起動〜ゲストACK〜1ターン PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40216053282)
- [実Supabase高速6体KO〜勝敗同期 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40216082806)
- [実Supabase通常の5ターン連続通信・途中で双方一致](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40216218043)：**初回成功＋2回目も成功（別部屋番号の再実行、2/2件PASS）**。通常の1,500ms時計で5行動以上、ゲスト側の同じターン表示、入力ACK、ホストOFF後の不要行動なし、4ビューポート幅が成功。これは数分以上・全6体の通常テンポでの実機対戦を保証しない。

## これからの課題
- 通常5ターンの実クラウドQAが落ちたら、「ゲスト追い付き遅延／ホストの初期publish／クラウドHTTP遅延」を別々に診断。失敗を勝手に完了としない。
- 1,500ms時計での通常レンタル編成の**全6体KOまでの長時間**試合や、学校旧iPad Safari実機2台での通信・ラグは未検証。
- 原作の戦術（ノーモーション必殺・カウンター等）は、具体的な原作技の資料を先に調べてから差分実装。わからない**数値**のみ仮値を使う。
