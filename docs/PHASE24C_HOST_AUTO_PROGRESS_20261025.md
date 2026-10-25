# Phase24-C1｜Google Sites 2席オンラインのホスト専用自動行動パイロット（2026-10-25）

## 全体でどこを実装したか
原作再現エンジンの`createCombat.step()` → 正規ホストの`createMatchProtocol().advanceAuto()` → Auth+RTDBの`createFirebaseMatchHost().advanceAuto()` → **Phase24-C1のHTML埋め込み版ホスト自動進行UI** → 学校旧iPad Safari/実Google Sites・正確な時間調整。

Phase24Bまでの研究画面では、ホストが「研究用：次の行動」を手で押さなければ進行しなかった。オンライン版として自然に対戦できるよう、既存のホスト権威処理を**明示ONのタイマで起動し、複数の失敗条件に応じて進行を止める**パイロットを実装。

**重要：1.5秒ごとという進行間隔は研究用の可変な仮値であり、妖怪ウォッチ2実機の行動発生間隔を測定した値ではない。** 動作確認が目的。元3DSの必殺カットイン/ノーモーション/2我慢例外は原作の未確定を維持し、追加タイミングを正規戦闘に入れていない。

## 実装したコード
1. `ui/host-auto-clock.mjs`（**新規**）: `createHostAutoClock({step,canAdvance,getWinner,intervalMs,schedule,cancel,onUpdate,onError})`。単一のタイマだけ起動。ホストが明示的にONしないと実行しない。終了時に破棄する。ゲーム勝敗が確定したら自動的にOFF。規則適用失敗/例外時はタイマを停止し、エラーを画面へ返す。テスト容易なようフェイクタイマ関数を注入できる。実時間の蓄積に基づく「追いつき実行」は一切しない。
2. `lab/sites-embed-online-entry.mjs`: A/Bオンラインのうち**seat=0のホストのみ**に自動進行ON/OFFを設け、`match.advanceAuto()`を単一の正式入口として呼ぶ。実行許可条件:
   - ホスト・ゲストがどちらもonlineプレゼンスを示す
   - ホスト戦闘開始済み、ホストの古いセッションでない
   - **Firebaseに最新の権威revisionが保存済み**：`dirty===false && lastPublished>=revision`
   - ホストのdocumentが非表示でない
   - `game.winner===null`
   いずれかが成り立たなくなったらON状態でも**一時停止して1ステップも進めない**。接続復帰後、古い時間の分をまとめて再実行することなく新たなパルスから再開する。ゲストは自動進行を操作できない。
3. `tools/build-sites-online.mjs`: ローカル・設定なし・承認済みクラウドの3ビルドの共通UIに`自動進行 OFF/ON/一時停止`ボタンを追加。クラウド設定の承認ゲート、Firebaseエミュレーター接続先の混入拒否、Google Sites直接HTML/JavaScriptバンドル方式は維持。
4. オンライン配布画面の`#mb-step`「研究用：次の行動」デバッグ操作は**ホスト・ゲスト両方で非表示/使用不可**とし、ホスト研究自動タイマのみがゲームをステップ進行できる。オフライン1台2席研究版のUIには変更しない。

## 追加の自動テスト
- `tests/host-auto-clock.test.mjs`（**新規5件**）:
  - ON前は進まない。最新snapshotが未保存の間は追加ステップなし。
  - 120パルス分の切断・バックグラウンド操作中に0進行、復帰直後も時間を「追いつき消費」しない。重複タイマ作成なし。
  - 勝者が出たらタイマ停止、再開禁止。
  - 未接続時のON拒否、数値が異常な秒数を拒否、dispose後の再始動拒否。
  - 内部ステップでエラーの場合は停止し、エラー内容を表示側へ伝える。
- `tools/sites-online-smoke.mjs`: 実Chromeの**2つのGoogle Sites型`iframe.srcdoc`**＋Firebase Auth/RTDBローカルエミュレーターで、匿名UID/6桁部屋/ゲスト回転の権威ACK/3秒回転拒否から**ホスト自動進行 ON→ゲストのターンが1以上に進む→ゲストSDKをofflineにするとその後1.7秒以上進まない→onLineで同じゲームに復帰すると自動再開→OFFで1.8秒以上進まない**まで実DOMで試験する。ゲストには自動進行ボタン非表示、双方研究専用手動ステップも非表示を検査する。
- `.github/workflows/phase24-sites-online.yml`既存の2ブラウザWeb SDKテストを変更された`ui/host-auto-clock.mjs`と`tools/sites-online-smoke.mjs`でも自動実行。`research-unit.yml`は新規テストをglobで自動収集する。

## 受け入れ範囲（最終CI参照）
- Nodeの戦闘/通信/ホストクロック試験は**474件（従来469件+新規5件）**合格。Phase24CのChrome/Firebase実エミュレーター2席で自動進行のON・一時停止・復帰・OFFを検証。
- **本物のGoogle Sites管理画面への貼り付けではない**。Chrome `iframe.srcdoc`の同一ブラウザ内2frame検証であり、異なる旧iPad Safariや本番Firebase接続を証明していない。
- フルの原作再現ではなく、技/妖気/ノーモーション/カウンターの未測定値は保留。性能・通信遅延の評価も学校旧iPad実機が必要。
- Hostがページを閉じると現在の権威ゲームを継続/自動復元できない（従前と同じ仕様）。ブラウザ非表示時は安全側で止める。対戦中の時間経過をゲームの外部時計が処理する仕組みはない。

## 次の開発
1. 実クラウドへの**独立/本人承認済みFirebase設定＋専用RTDB rules**を用意し、匿名Auth+Google Sites実iframe originが許容されるかを確認。クラウド実利用に関する本人の承認/設定がない場合は接続不可の未設定版を維持する。
2. 学校の古いiPad Safari 2台でゲーム画面高さ・上下レイアウト・タッチUI・ホスト/ゲスト同期・断線/前面復帰の現実の操作を検証。本人がGoogle Sitesへ直接コード貼付して初めて実公開と呼ぶ。
3. **原作の自動行動間隔を実機根拠で測る**か、学校向けの仮テンポとして本人の感想から調整する。1.5秒を原作忠実と断定しない。ノーモーション必殺や妖気の未測定条件は別の研究フェーズで継続。

**変更先:** `feat/phase1-action-circle-lab-20261023`のみ。`main`/学校Googleサイト版/実クラウドFirebase/課金/初期閃光魂OFFは変更なし。現時点でユーザーの必須操作なし。
