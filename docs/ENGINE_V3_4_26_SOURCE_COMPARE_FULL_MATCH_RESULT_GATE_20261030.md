# Engine V3-4-26｜原作資料比較・実ホスト6vs6を2画面で開戦から決着まで表示（2026-10-30）

## 原作資料の根拠と未確認

公式と二次資料を現工程で再確認：

- [レベルファイブ『妖怪ウォッチ2』公式「妖怪とバトル」](https://www.youkai-watch.jp/yw2/game/game06.html)：零式Gわざの前衛妖気/チャージ/発動、零式つつくの一連の原作画面。現在の開発版に新機能を推測追加する根拠とはしない。
- [レベルファイブ公式「通信機能が大幅にパワーアップ！」](https://www.youkai-watch.jp/yw2/communication/com02.html)：友達と対戦し、試合最後まで戦って勝敗に至る原作の通信対戦体験。
- [Game8「バトルシステムと戦闘のコツ」](https://game8.jp/youkai-watch2/505163)：6体サークル/3前衛、ピン/必殺/おはらい（タッチ動作）の原作説明。
- [原作PvP研究：モーション中の相手前衛の見え方](https://note.com/tombow_yw/n/n1e4cf179d2d9)：相手画面のサークル/必殺準備表示の保留が読み合いに関係する。しかし開始/終了の具体的フレームは非公開・未検証。既存`researchOpponentVisibility`は通常FriendsではOFFのまま、理由なしにONにしない。
- 本人提供原作対戦動画（過去に直接観察して作られた[第1試合のフレーム台帳](./ORIGINAL_PVP_VIDEO_20261027_MATCH01_OF04.md)）：00:11〜00:15は3前衛/6体サークル、00:24〜00:42はピン/自動攻撃、00:43〜00:52は必殺カットイン→着弾、01:08〜01:23はKO青い火/控えの登場、02:01〜02:06は敗北→結果画面。**このターンに動画MP4本体を直接開いて再生したわけではない**。動画の編集字幕をゲームUIとしてコピーしない。原作で「KO演出の終了と結果画面」の具体的待ち時間が何msかは不明であり、本工程の閾値を本家の内部値とは呼ばない。

### 比較から見つけた実際の問題

V3-4-25までの`ui/match-stage.mjs`は、Hostの確定Snapshotに`winner`が立つと**結果Overlayをその`render()`の前半で即表示**していた。一方、最後の行動は同じ`render()`の後半で非同期`planActionChoreography`を開始する。そのため**画面側では最後の攻撃・KO青い火・控えの前衛を見届けるより先に大きな結果画面が重なる**。試合結果は正しくても一試合の体験に大きな差があった。

## 修正した内容：Host判定と視覚演出を混同しない

- `ui/match-stage.mjs`：結果テキスト（A勝/B敗、6体KO）は**即時にHost winnerに基づき更新**、`data-match-finished`も即時にtrue（すべての入力は即拒否）。ただし**現在の確定済みAction/Poke/Soultimateの`scenePlan`がある間、または`pendingCues`が残る間**はOverlayだけ非表示。最後の実攻撃/KOを表示し終わると既存の`advanceScene→cancelScene→render`から自動で結果を表示。
- **初めて開く時点ですでに終了した試合**は過去Eventを再生しない既存規約を維持しており、演出Queueが空なので結果Overlayを**その場で表示**。切断中の再接続で古い攻撃を再上映しない。
- `scenePlan`はゲーム真実ではなく表示専用。結果Overlayの表示待機は**ゲーム進行の停止・MatchCore/Host時間・HP/KO・サークル回転・オンラインACKの遅延を一切意味しない**。ホストイベントの到着順・戦闘/スキル順・勝敗・通信payload・Firebase Rules/Auth/DBに変更なし。

## 新しい真の6vs6 Chromium二席の通し受入ゲート

`lab/match-stage.html?review=full-match-v3` と `tools/stage-smoke.mjs` に自動テストを追加。これまでの**最初と最後に分かれた部分テストを、1つの実ホスト試合の全Snapshotで連続DOM投影**して検証：

1. 同じ元のレンタル6体で強弱/攻撃比率だけ変えた**テスト専用fixture**を使い、本物の`createMatchProtocol`で敵6体全KOまで9行動実行（独自戦闘エンジンや偽のwinnerは使用しない）。A・B各独立`createMatchStage({seat:0/1})`に毎行動の正規Snapshotを配信する。
2. 開始時：双方の上画面3体＋操作側の下画面6体が描かれること。中盤：正規イベントを伴うKOと、前衛全滅後の本物の自動控え入れ替えを検出（CI計測3件ずつ）。宿敵の6体KOとA勝利がHostに実際に記録される。
3. Hostが勝者を確定させた**直後も**、両画面の結果Overlayは隠され、ゲーム自体は終わっている。演出の最後の`eventId`が両画面で`impact`に到達し、青いKO火が見えること。演出の途中で結果Overlayを見せることは失敗とする。
4. その後アニメーションQueueが空になると、Aは「勝利！」Bは「敗北…」、同じHost最終ターンを表示。**一度も途中のSnapshotを受け取らず、ゲーム終了後に入ったB席**は、古い演出を再生せず敗北Overlayを即表示。元の`winner-a/winner-b`画面QAも退行しない。
5. 接続やブラウザ遅延に備え、既存のbounded catch-up/FIFO規約を壊さない。古い大量Eventのすべてを演出することを保証する試験ではなく、**画面が最後の本物の行動を完了してから結果に至る**試験。

## 証拠と限界

- [**本実装のPhase14 ChromiumステージQA** #41059871488](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41059871488)：`V3-4-26-FULL-MATCH-DOM-PASS 9 host actions 3 observed KO 3 reserve changes`、従来の`V3-4-25-KO-RESERVE-DOM-PASS`、`PHASE22-REAL-HOST-HP-LEDGER-DOM-PASS`、`MATCH-RESULT-PASS`も同時合格。
- [**Node 940/940 PASS** #41059880932](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41059880932)。V3-4-26は新たな戦闘ruleを追加していないため、Nodeの既存940件に加えて実Chromiumの統合受入ゲートを増やした。
- [**Firebase認証なしFriends 2席・RTDB Emulator QA** #41059880917](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41059880917) 成功。**この新しい通し試験そのものは単一Chromium内のホスト二席描画**であり、学校の別iPad・本番Firebaseに相当する別ネットワーク同期の全試合ではない。
- 既存の**6体はオリジナルレンタル**で、原作キャラの技/発動モーションと数値は未達。戦闘間隔2.6秒、KO火の形/維持時間、勝敗画面の実3DSタイミング、相手画面のモーション保留は**本家の実測ではなく研究・仮設定**。
- 本人の元MP4へこの工程ではアクセス不可。学校iPad Safari二台/Google Sites直接貼り付けの実プレイ/原作動画との画面横並び比較は未実施。**単なるCI成功と原作完全再現を同一視しない**。

## 次工程の優先順位

次は**V3-5の受け入れ段階への移行準備**を優先。個別CSS演出を増やし続けず、まず開発中の実際の学校配布形式（Friends単体HTML、Safari操作の前提）で、**プレイヤーが行うサークル/ピン/チャージ/おはらい/G・つつく→試合決着**の対戦経路と、原作動画のフレーム台帳の差を実画面から整理する。エミュレーター2席と学校実iPad2台を別証拠として扱い、実機試遊で気になる処理を優先する。原作未確認Hit数/時刻を推測で採用しない。

変更先は開発ブランチ`feat/phase1-action-circle-lab-20261023`のみ。学校Google Sites稼働HTML、main、本番Firebase Security Rules/Auth/DB、Google Drive配布物は変更しない。
