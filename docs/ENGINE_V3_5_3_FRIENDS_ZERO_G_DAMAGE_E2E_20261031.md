# 妖怪ウォッチ2 Engine V3-5-3｜学校Friends零式Gわざの実Firebase二席・通常ダメージ回帰（2026-10-31 JST）

## 結論と現在地

**V3-5-3完了、V3-5全体は未完成**。前工程の通常必殺効果修正を維持し、認証なしFirebase RTDB Emulator / 同一Chromium内2つのGoogle Sites型 `srcdoc` iframe で、ゲストの輪回し→零式切替→3体分の本物の妖気蓄積→実タッチ6回→Host Gわざの正規効果・両画面カットインまで確認。**学校iPad Safari 2台・学校本番Google Sites・元MP4の直接逐フレーム比較は未検証**。

- ブランチ `feat/phase1-action-circle-lab-20261023`
- 本工程のコード・テストHEAD：`4677b9f0d342f07658ac6f7c3aa75d88ad9faacc`
- Node **944 / 944 PASS**（新規2件）：https://github.com/8mahi8/yokai-battle-lab/actions/runs/41085273783
- Stage Chromium **SUCCESS**：https://github.com/8mahi8/yokai-battle-lab/actions/runs/41085273863
- Firebase Friends No-Auth実2席 **SUCCESS**：https://github.com/8mahi8/yokai-battle-lab/actions/runs/41085283559
- 実E2Eの証拠文字列：`SITES-FRIENDS-CHARGE-PASS` と `SITES-FRIENDS-G-CHARGE-PASS`。直前コミット `9f12c699` の成功ログでも G は **6 canonical Soul actions / 6 real Guest touch ACK / Zero G 3-Soul / both cut-ins**：https://github.com/8mahi8/yokai-battle-lab/actions/runs/41085178944

## 原作との照合

- レベルファイブ公式：https://www.youkai-watch.jp/yw2/game/game06.html （零式Gわざ・つつく・必殺チャージ）
- 『妖怪ウォッチ2』零式解説：https://gamepedia.jp/youkai-yw2/archives/1873 （**発動者と左右の3体分の妖気**、左右が後衛でも可、通常必殺の**2倍**）
- Game8：https://game8.jp/youkai-watch2/504889 （Gわざは攻撃以外の回復/防御系も強化）
- 本人原作対戦動画は前担当の時刻付き観察台帳を参照。ただし**今回は元MP4を直接再生していない**。技ごとの原作確率、正確な威力数値、ヒット数、秒数は未確認。研究・試遊fixtureを原作確定と呼ばない。

## コード変更

1. `lab/sites-embed-online-entry.mjs`：元からある localhost 限定 `?charge` の正規 Host QA fixture を、`?gcharge` でも使用可能にする。どちらも `__YW_EMULATOR_MODE__&&__YW_FRIENDS_MODE__` のビルド時条件が必要。**学校の `--friends` HTMLには運転テスト用APIを出さない**。本番の戦闘処理、Firebase認証/ルール、6体バランスは無変更。
2. `tools/sites-online-smoke.mjs`：`?gcharge` 実ブラウザ経路を追加。ゲストが輪を1つ左へ回して B6/B1/B2 を前衛にする（Host ACK B1）→零式へ切替（Host ACK B2）→ **本物の正規 Guard を6行動**して3体妖気100%→ B1で G 6タップ（Host/Guest B3〜B9 のACK）→全3体の妖気0%→正規 Host `special.mode='g-tech'` / 敵HP減少→双方のカットインと同じ技名。通常 `?charge` も同じ既存テストで継続実行。
3. `tools/chrome-realtime-qa.mjs`：CDP read-only/local URL ホワイトリストに**localhost `/qa?gcharge` のみ**追加。任意URLや本番ブラウザへCDP接続できない制限を維持。
4. `tests/v3-5-3-friends-zero-g-damage-regression.test.mjs`：①後衛B6を含むGの消費対象/倍率2/Host HP実変化、標準技ではB6/B2を消費しないこと、②Friends本番戦闘フラグを使った3シード各最大125行動の正規6vs6で決定性/HP境界/ジャーナル再演算/Stage両席投影を検証。**Nodeの `giveSoul` はユニットテスト専用**で、実Firebase E2Eでは使っていない。

## 実際の検証と副作用

- **Node 944件成功**、新規2件のうちG比較で `powerMultiplier:2` と通常必殺より大きい Host HPへの実ダメージが成立。
- **Firebaseローカル実通信二席成功**、計3シナリオ（通常試合/通常必殺/Gわざ）。Gは6行動で3体の妖気を貯め、6件のタッチ ACK、両者の効果表示を確認。実RTDB Emulatorを使い、ゲスト画面だけの架空更新ではない。
- 実ブラウザの同一PC・同一Chromium / RTDB Emulator成功と**学校iPad Safari2台/本番ネットワークの成功は別**。
- V3-5-2で ONにした `researchDamageModel` の**コード上の副作用は変えていない**。今回は自然な6体戦闘の決定性、HP境界、Stage表示の回帰を追加したが、実際の友達とのダメージバランスや原作数値一致を証明するものではない。試遊で要確認。
- 本番Google Sites、`main`、Firebase本番 Rules/Auth/DB、Drive配布物は一切更新していない。配布版の新規保存は本人の明示依頼まで行わない。

## 次工程 V3-5-4

既存 `purifyStart` / `purifyInput` / Host status ledgerを流用。**負のとりつき→後衛へ回転→ゲストのおはらいタッチ完了→Host本当の状態解除→二席で同じ確定画面**を Friends No-Auth RTDB Emulatorの実HTML/Chromiumで受け入れる。新たな通信方式、独自おはらい効果、原作未確認数値の改変を作らない。

次いでGわざ・おはらい・必殺・自動戦闘を1試合通して原作動画の観察台帳と比較する。学校Safari2台の試遊は未検証として報告。
