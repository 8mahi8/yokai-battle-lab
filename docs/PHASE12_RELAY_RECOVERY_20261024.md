# Phase 12 — 通信中継・同期回復の独立実装（2026-10-24）

対象ブランチ: `feat/phase1-action-circle-lab-20261023`。**main と Googleサイト版は未変更**。開発費0円、初期版の閃光魂はOFFを維持。Phase 11の `engine/match-protocol.mjs` は変更せず接続する。

## 今回のコード

- `engine/match-relay.mjs`: `createMatchRelay({protocol,send,now})` で、ホストが2つの接続と席（0/1）を管理。接続IDは**認証済みのトランスポート側**から渡される。送信JSON中の `side` では席を決めない。
- `connect(connectionId,seat)`、`disconnect(connectionId)`、`receive(connectionId,packet)`、`advanceAuto()`、`sweep()` と `status()`。ホストだけが通常の自動行動を進める。
- `command` はACKとrevision付きの全状態snapshotを配信。受信コマンドは厳密なフィールド検査とUTF-8サイズ上限。未接続・席の乗っ取り・過大なJSONを拒否。
- `createMatchClientSync()` は操作seq、一つの未ACK操作、同じ操作の再送、再同期要求、古いsnapshotの破棄を担当。新しいsnapshotにはホスト側の既受理seqが含まれ、再接続時に次の操作番号を引き継ぐ。
- `ping` と `sweep` は接続停止の検出と退出通知の土台。タイマーは未搭載で、呼び出し元が周期実行する。

`tests/match-relay.test.mjs` は**実リポジトリのPhase 11 match-protocolをimport**して2席の接続を模擬。席偽装、クロス席送信、ホスト自動行動、ACK欠落、重複送信、snapshot順序入れ替え、再接続、異常JSON、ハートビート切断を検証する。これはまだ**別端末の実ネット通信ではない**。Nodeのテスト数はGitHub Actionsの完了結果を正とする。

## 守るべき境界と設計上の未解決

1. **認証前に `connect(connectionId,seat)` を呼んではいけない。** 実際のサーバーや信頼できる認証済みホストアダプターに接続ID→座席の割当を任せる。ブラウザの自称席番号、ルーム番号だけの所持、安易なクライアント側ホストの正当性は認証にならない。
2. 接続層はまだ実装していない。Supabase、Firebase、WebSocket、Edge Functionsは未接続。ルーム発行、匿名認証、正規の座席付与、接続復帰、別ブラウザE2E、Google Sites自己完結HTMLは未完成。
3. どちらの席にも**研究用の全状態snapshot**を配る。秘匿すべきゲーム情報の有無を確認し、公開前に座席ごとの表示状態に分ける。弱いfingerprintは通信認証ではない。
4. 毎コマンド後の全状態送信は、タッチ操作・複数ヒット・連打で高頻度になる。実際のネットでは送信バッチ化・差分化・最新revision優先・サイズ計測を追加し、旧iPadのフレーム落ちを避ける。
5. クライアントは未受信ACKを手動再送できるが、定期再送・ping・退出時処理は実通信アダプターの責任。ホストプロセス自体が落ちた場合の復旧・永続化は未実装。
6. `createMatchRelay` は**ホストが信頼できることを前提にしたプロセス内アダプター**で、クライアントがそのコードを動かせるだけでは認証済みサーバーと同等にならない。対戦エンジンのチート防止をうたわない。

## 無料ネットワーク基盤の外部調査（2026-10-24時点）

Supabase公式:
- https://supabase.com/docs/guides/realtime/pricing — Free: 月200万Realtimeメッセージ、同時接続ピーク200。無料枠超過時のFreeプランの課金は「-」となっているが、利用条件は導入直前に再確認。
- https://supabase.com/docs/guides/realtime/authorization — private channelにはRealtime Authorization / RLS / JWTが必要。
- https://supabase.com/docs/guides/realtime/broadcast — Broadcastは接続者へ配達する仕組みで、決定的なゲーム計算を信頼できるサーバーで自動実行するものではない。
- https://supabase.com/docs/guides/functions — Edge Functionsは短時間のサーバーレス呼び出しに向く。常駐ゲームループや状態の永続性は別途設計が必要。

**暫定方針**：新規Supabase環境を選定候補として調査継続。勝手にプロジェクト作成・DB設定変更・鍵の発行をしない。実ネット実装前に、匿名ユーザーと部屋ごとの席権限をRLS／サーバー側で成立させる計画を確定する。公開コードにsecret / service_role keyを置かない（公開用publishable keyと混同しない）。

## 次のPhaseに引き継ぐ具体作業

- 信頼できるルーム座席認証とサーバー権限（ホスト端末方式は信頼性・不正耐性上の制約を明示）を選ぶ。
- 分離された実通信環境で2ブラウザを接続。乱順、欠損、遅延、重複、1席復帰、古いiPadのバックグラウンド再開を故障注入する。
- ACK・全状態配信を小さくし、高頻度の指操作でもゲストが止まらない描画負荷を測る。
- Google Sitesの「コードを埋め込む」に直接貼る**自己完結HTML**を別ファイルとして生成し、本人の実機確認まで公開版を変更しない。
- 閃光魂は初期版に含めない。原作未確認の数式を勝手に確定させない。
