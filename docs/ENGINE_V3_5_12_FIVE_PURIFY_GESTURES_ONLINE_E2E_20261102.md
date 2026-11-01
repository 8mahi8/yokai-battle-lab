# 妖怪ウォッチ2 V3-5-12｜5種類のおはらいを実Firebase無認証2席で試験（2026-11-02）

## 今回の課題選択

本プロジェクトは原作『妖怪ウォッチ2』対人戦のように学校iPad Safari上で友達と遊ぶことが最終目的。**原作の操作種別**は参考資料の[ゲームエイト戦闘システム紹介](https://game8.jp/youkai-watch2/505163)が「つぶせ・連打・こすれ・まわせ・斬れ」の5種類と列挙している。一方、既存エンジン`engine/purify-input.mjs`は既にこの5タイプを実装済みだが、オンライン2席での終了までの試験は**pop＝紫の玉をタップ**だけだった。

これは**4/5の操作経路がブラウザの実通信／Pointer処理では未受入**という現実的な懸念。以前の原作録画の1視点は必殺や円形操作を示すが、今回MP4実体を直接視聴していないため**原作操作の指軌跡や必要な回数を実測できない**。新ルールを作らず、現存機能の実ブラウザ試験を拡充した。

## 実装・テスト変更

1. `lab/sites-embed-online-entry.mjs`：厳密に`__YW_EMULATOR_MODE__&&__YW_FRIENDS_MODE__`かつlocalhost内の同一originの`srcdoc`から親URLの`?purifycycle`が見える場合だけ、**従来の`?purify`用と同じ正規Host負とりつき再現編成**を開始する。通常の`--friends`、学校Sitesで配布するHTML、原作ロジック/ゲームバランスには手を加えない。
2. `tools/sites-online-smoke.mjs`：新`?purifycycle`で実RTDB EmulatorのHost/Guest2つの別`srcdoc` iframeを結び、**本当のHost`advanceAuto()`によるB1への負とりつき→Guestサークル回転→B1後衛→ゲストの実おはらい入力**まで実施。**既存`purificationSerial`で選ばれる5タイプ**を同一部屋・同一対象の4回の中止と再開始で順に取得する。テストコードから`kind`を捏造・強制選択しない。

   - `pop`：出現した最初の紫の玉へ実`PointerEvent(pointerdown/up)`、Host ACKと操作進捗、最後まで終了していないことを確認→中止。
   - `mash`：中央の実`pointerup`タップでHost ACK/進捗→中止。
   - `rub`：`pointerdown/move/up`の実通信でこすり進捗→中止。
   - `spin`：円の右から右下方向へ`pointerdown/move/up`しHost ACK/回転進捗→中止。
   - `slash`：SVG上の本当の`challenge.slashPoints`から1→2→3本の斬りを`pointerdown/move/up`で実行、**最後は本当のHost`purification`イベントが発生しB1の負とりつきが消え、ゲスト画面も表示解除**されるまで検査。
   
   **4種類の操作は途中進捗＋中止まで、最後の斬れは終了まで**であり、全5種類それぞれの「完了成功」を証明したとは誇張しない。点や線の座標は**Hostが配った試験challenge**と描画パッドの実寸から計算し、ホスト状態の直書きや擬似ACKは使わない。QR/画像の検証ではなく、実DOMにPointerイベントをディスパッチするブラウザE2E。

3. `tools/chrome-realtime-qa.mjs`：Chrome DevToolsの試験URLを元々`/qa?purifycycle`がホワイトリストに無いので拒否していた。ここだけ**ローカル127.0.0.1の新しい試験URL**を足す。遠隔ブラウザ・本番通信・ログインでは使えない制限を維持。
4. 元の`?purify`（5紫タップ→完了）、`?charge`、`?gcharge`、`?fullmatch`、`?onegame`は削除せず実行。旧オンラインの進行順や状態を勝手に上書きしていない。

## 検証結果（テスト実装/機能コードHEAD `73f21279389e37b0d4d51320827260a2d93be0b2`）

- **[Node 950/950 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41325027151)**。
- **[実Chromium Stage 16/16 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41325020257)**。
- **[Firebase No-Auth 2席 + 10/22保存の過去Rules再現、全工程2回PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41325027081)**。両試行で`SITES-FRIENDS-PURIFY-CYCLE-PASS all five real Host chosen modes, actual Pointer input/ACK, four cancels and final slash cleanse`が記録された。同時に従来の通常必殺2正規行動・零式G6行動・pop5タップ解除・6体KO試合・13Host行動の通常/G/おはらい/勝敗通しまでPASS。本番Firebase read-only GET HTTP200、**本番Firebaseルームへの書込みは試みない**。
- 最初の新テストは`tools/chrome-realtime-qa.mjs`の厳格なローカルURL許可一覧に`purifycycle`がないため、Chrome起動前に拒否された。**ゲームの障害ではなくQA入口漏れ**と確認して許可一覧だけ修正した。[上記最終CI](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41325027081)で完全成功。ポップ/連打の`pointerdown`はHost commandを送らず、`pointerup`の`tap`だけがACKされるため、その動作に合わせて試験側のACK待ちを区別した。

## 未検証・制限

**学校iPad Safari 2台は未試験**。現結果はLinux上の実Chromium・2つの`srcdoc` iframe・認証なしFirebase RTDB Emulator通信。iPad固有のSafari PointerEvent/TouchEventイベント列や指とSVGサイズ、実際の回線遅延、原作のジェスチャーの厳密な閾値・時間・表示見た目は証明していない。チャージ`spin/trace/align`の実2席E2Eもまだ残る。原作のジェスチャー操作の数値閾値は既存の研究仮値であり、このQAでは一切調整していない。

GitHub **開発ブランチのみ更新**。学校Google Sitesの直接貼付稼働HTML、Firebase本番Security Rules/DB/Auth、main、Google Drive配布ファイルは未変更。10/22保存の過去Rules写しには2026-11-08 00:00 JSTの時限許可があるが、**現本番Rulesと同じかは未確認**なので推測で本番Rulesを変更しない。

## ロードマップ

**V3-5-12 終了／V3-5全体は未完**。次の具体的なサブ工程 **V3-5-13：必殺チャージ残り3種（円回し・軌跡なぞり・時計合わせ）のローカルFirebase No-Auth実2席/本物のTouch/Pointer試験**。実機試遊と本人提供MP4原本再アクセスの機会があればそれを最優先し、元動画の内容を見たふりをせず改善を判断する。
