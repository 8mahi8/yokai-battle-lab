# 妖怪ウォッチ2 Engine V3-5-4｜学校Friends「悪いとりつき→後衛おはらい」の実Firebase2席E2E（2026-10-31 JST）

## 結論

**V3-5-4完了／V3-5全体は未完成。** 同じ2人対戦で、敵の本当の自動とりつきによりB1へ負状態を与え、ゲストが自分のサークルを回してB1を後衛に下げ、タッチ操作5回でおはらいして**正規Hostから状態を解除**、ホスト・ゲスト両画面が同じ結果を表示するところまで完走。Firebase Realtime Database **認証なしFriends** の**localhost RTDB Emulator＋同一Chromium内2つのGoogle Sites型srcdoc iframe**で確認した。学校SafariのiPad2台、本番Google Sites貼付、実本番Firebaseでの最新版対戦は**未検証**。

- コード・テストHEAD：`06248728bc2c3d0759a11053070ff39782321b50`
- Node **946/946 PASS**（新規2件）：https://github.com/8mahi8/yokai-battle-lab/actions/runs/41086694292
- Stage Chromium **SUCCESS**：https://github.com/8mahi8/yokai-battle-lab/actions/runs/41086684935
- Firebase Friends no-Auth実2席 **SUCCESS**：https://github.com/8mahi8/yokai-battle-lab/actions/runs/41086694176
- ブラウザ実測マーカー：`SITES-FRIENDS-PURIFY-PASS 1 canonical enemy actions, Host negative Inspirit, guest bench rotation, 5 real Pointer taps and ACK, authoritative status removal and UI feedback`。同一QAで通常必殺 `SITES-FRIENDS-CHARGE-PASS` と零式G `SITES-FRIENDS-G-CHARGE-PASS` も通過。

## 原作調査との対応

- Game8： https://game8.jp/youkai-watch2/505163 — 悪いとりつきの妖怪を後衛へ下げ、下画面おはらいのタッチ操作で解除。操作方式5種類の説明。
- 攻略大百科：https://gamepedia.jp/youkai-yw2/archives/1397 — 後衛に下げておはらいを選び、玉つぶし・なぞりなどを完了。
- 攻略の虎：https://toragame.com/youkai2/kihon/battle.php — 原作の負状態とおはらいの主な操作。
- **原作での確定条件（後衛＋悪いとりつき＋タッチで解除）**は既存`engine/combat.mjs` / `engine/purify-input.mjs` と照合した。テストで5つの玉をつぶす初回の`pop`操作は**開発用fixture**であり、原作の玉の位置・難易度・原作秒数の一致を意味しない。原作MP4自体の今回直接視聴なし。

## 実装内容

1. `lab/sites-embed-online-entry.mjs` に localhost / `--emulator-friends` / `?purify` 専用の決定的な**試験編成**を追加。A側の本物の通常行動が`sleep`（悪いとりつき）を優先し、B側はガードを優先する。**Host `advanceAuto()` だけが状態異常を発生**させ、ブラウザが`applyInspirit`やSnapshotの直接書込を行うことはない。既存の`?charge`/`?gcharge`に使うlocalhost専用 driverを再利用し、通常学校用`--friends`コードには渡さない。`researchStatInspirits`等の正規ホスト研究設定は保ち、本番のレンタル編成と勝敗ルール・Firebase方式は変更していない。
2. `tools/sites-online-smoke.mjs` に実ブラウザ・本物のゲスト入力経路 `/qa?purify` を追加。Hostが敵B1へ本物のピン入力、正規の敵自動とりつき1行動によりB1が負状態となり、GuestがB1を後衛へ回転、`おはらい`選択→B1を指で選ぶ→`pop` 5回Pointer入力。それぞれHost/Guest両席の操作番号ACKを確認。1〜4回目は負状態が残り、5回目で**Hostの`purification`イベント+removed配列が確定し、両席の悪いとりつきマークが消え、ゲストへ「おはらい完了！」表示**。
3. `tools/chrome-realtime-qa.mjs` はCDP監視の localhost 専用許可URLへ`/qa?purify`だけ追加。外部サイト/browserへの拡大はなし。
4. `tests/v3-5-4-friends-purify-causal-regression.test.mjs` に2件：①上記と同じ試験編成を`MatchProtocol.dispatch`経由で実施し、開始だけでは解除されない・負状態は入力完了時だけ消える・両視点投影・ジャーナル再演算一致、②無効な対象/未開始/同一入力の重複処理の不変性。既存おはらい5種類の操作単体試験は削除していない。
5. `tests/v3-5-2-friends-special-effect-regression.test.mjs` の**過去のエミュレーター専用driver名に依存した静的検査**を現行`touchQaMode`へ追随。最初のNode失敗はその静的検査の更新漏れであり、修正後946件PASS。実ゲームの効果フラグ検査は維持。

## 分離・注意点

- 成功したのは**E2E用の確実に負とりつきが発生する研究編成**。学校での通常レンタルの行動確率・命中/抵抗の正確な原作再現や、試合中いつでもおはらいが成功することの保証ではない。
- 同じFirebaseテストで通常必殺・Gわざの旧ケースも回帰成功。実ブラウザ画面は同じChromium内であり、学校Safari2台の通信遅延、Google Sites埋込側のSafari制限は別途必要。
- **変更しない**：Google Sitesの学校稼働HTML、GitHub main、本番Firebase Security Rules/DB/Auth、Google Drive配布。新しく学校に貼るHTMLも配布していない。Firebase/認証方式の変更は不要。

## 次：V3-5-5（全試合の戦闘体験・原作照合）

バラバラに合格した「輪回し、ピン、通常必殺、Gわざ、おはらい、KO/控え、勝敗」を、**正規6対6の1試合**へまとめて受け入れ、場面の因果と双方表示を確かめる。テストfixtureだけでなく通常レンタルの勝敗・自動進行の自然な長さを測定し、前担当の**本人提供原作動画の時刻別観察台帳**と比較。原本MP4が手元にないときは直接視聴済みと報告しない。

原作で技ごとのヒット数や時刻を確証できないものは仮値扱いを維持。学校iPad Safari2台での最終試遊は後続の受け入れ条件。
