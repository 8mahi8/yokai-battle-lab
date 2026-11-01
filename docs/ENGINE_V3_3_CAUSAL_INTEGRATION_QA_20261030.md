# 妖怪ウォッチ2 対人再現｜V3-3-2 時間・効果・相手表示の試合単位統合QA（2026-10-30）

## 目的
V3-3-1で`timeDomains()`（論理action-points、ホストevent ordinal、研究用display ms）を読み取り可能にした。しかし、このAPIだけでは**モーション中の入力と戦闘の確定が一致するか**、予定時刻のcounter hitが二重発火しないか、V3-1との読み取りがずれないかを証明できない。変更済みの戦闘ルールをさらに触る前に、正式Node/Chromium/Firebase環境で再現可能な受け入れゲートを追加する。

## 実装
- `tests/v3-time-causality-integration.test.mjs` を新設。新規Nodeテスト**5件**。
  1. **試合状態完全一致**：Seed [1,7,42,212,8192,20261030] × 研究ダメージモデルon/off = **12通り**。双方同seed/同操作、片方だけ長い表示モーションを開始。その後、妖気付与→必殺準備→相手のサークル回転→必殺確定→零式切替→自動12行動。返値および表示領域だけを除いた**戦闘snapshot全体**を各行動で比較。HP、妖気、KO、スキル、Inspirit、イベント、論理時計、行動優先などは全て一致。モーション終了時の表示開放でも戦闘snapshotが変化しないことを確認。
  2. **V3-1/V3-3互換**：既存`inspectCoreTimeDomains`と新`timeDomains()`の論理行動数・ポイント・表示時刻が一致。ホストの最後のイベント通番とsnapshot`eventId`も一致。両研究モードについて各4行動確認。
  3. **早期カウンター必殺**：cut-in開始→チャージ→相手回転→チャージ完了。予定`hitAt`直前はHP不変、境界到達時のみ必殺効果とcounter-hitイベントが1回ずつ確定。0ms再実行で二重HP変化しない。
  4. **遅延カウンター必殺**：予定`hitAt`とサークル回転入力が重なった場合、既存ルールどおり**先に前の面へ命中**させ、その後で回転。0ms再実行で二重ヒット無し。**これは現ホストの再現契約であり、原作のフレーム優先順を完全確定したものではない**。
  5. **未確認の3回以上の回転＋我慢2消費**：既存の`counter-hit-indeterminate`を保ち、HPを変えず、実命中をでっち上げず、理由を複数保持する。表示進行自体が架空HPを生まないことを確認。
- **既存エンジンコードや原作仮定値は今回変更0**。これは時間ドメインの統合**テスト追加**であり新しい遊びの仕様実装ではない。V3-1とV3-3の2つの診断APIは対象が異なる：前者はホスト入力msを含むプロトコル監査、後者は戦闘内部のevent通番/表示保留キューの診断。双方の共有する時計値をクロスチェックして二重管理のズレを防ぐ。

## 参照した資料と確からしさ
- [たくトンボ｜妖怪ウォッチ2 知って得する対戦の基礎テクニックと仕様のだいたい全て](https://note.com/tombow_yw/n/n1e4cf179d2d9)（2026-08-03）：他者の演出中にサークル回転や必殺チャージを行っても相手画面への反映が遅れる（ノーモーション）、カウンター必殺のチャージ終了がcut-inの内外かで命中面が変わる、終了後約0.5秒など**熟練プレイヤーの経験則**。実際の実装内部、厳密なフレーム/ネットワーク遅延や3回以上回転の一意なターゲットは証明されない。
- [Mt. Wildwood｜YW2 Turn Order](https://www.mtwildwood.net/turn-order.php?g=yw2)：速度・初期wait・行動ポイント。画面アニメーションmsへの変換は資料では確定できていない。
- 君が以前送った元動画はこのターンで直接再視聴できていないので、プレイヤー観察や既存テストを動画原本確認と混同しない。

## 正式実行結果
- 対象コードコミット：`9f98e4f6a499cbab01b03f60ad3f8ca6bc293db4`。
- [Research battle unit tests — GitHub Actions run 40905841527](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40905841527)：**Node 785/785 PASS、fail 0**。今回の5件をGitHub runnerの正式`node --test tests/*.test.mjs`で実行したログを直接確認。自然6体対戦を勝敗確定まで実行する耐久テストと、実Chromium DOM/タップ研究UIも全step成功。
- [Firebase Friends no Auth QA — GitHub Actions run 40905841822](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40905841822)：**全ジョブSUCCESS**。Google Sites用HTML build（75 source modules、Friends本番向けの未配布HTMLは291,959 bytes）、ルーム/認証なしRules、24 host actionsとACK・canonical snapshot parity、Chromium実2iframe対戦、四種の埋め込み横幅、旧期限ルールを独立Emulatorで再現した2iframe確認までPASS。本番FirebaseへのGET1回はHTTP200（予約済み非ルームキー、本文非閲覧、書き込みゼロ）。**本番Firebase Rules/DB/Authを変更していない**。
- 学校iPad Safari実機2台、Google Sitesへの実際の公開と本番Firebaseの読み書き、元動画の厳密な比較は実施していない。

## 次工程
次は、**ホストのコマンドの受理→ACK→正規HP変更→対戦相手へ見える順序**を独立した2席のFirebase通信記録と照合し、再送・切断・表示保留でも対戦状態が巻き戻らない契約テストを追加する。原作不明の対戦入力遅延やモーション秒数を推測で埋めない。V3-3はまだ途中。開発ブランチとDraft PR #1に限定し、main/学校公開版/本番Firebase/Driveは変更しない。
