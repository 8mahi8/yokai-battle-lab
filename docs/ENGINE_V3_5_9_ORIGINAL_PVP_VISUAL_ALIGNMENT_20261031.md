# 妖怪ウォッチ2 Engine V3-5-9｜原作PvP一次観察とオンライン戦闘UIの差分照合（2026-10-31）

## 結論

学校のiPad Safariに向けた「原作動画のようにプレイできる」工程 V3-5 の**視認性・再現色**を、ユーザーが提供した原作動画の過去一次観察記録と現行コードから直接比較した。すでに実装・回帰済みの必殺カットイン、赤円型ピン、青いKOひとだま、行動ごとのフィードバックは**重複実装しない**。確認できた色の方向性の差2点だけを小さく直し、原作内部の時間・RNG・技仕様は変えない。

**今回の修正は見た目の再現であり、正確な原作RGB値やフレーム秒数を証明しない**。動画のMP4原本は今回直接再生していないため、下記の時間付き映像記録は先行担当が実フレームを観察した文字資料の参照である。

## 参照資料（一次・公式・補助を分離）

1. [提供原作動画 第1試合 00:24–00:42、00:43–00:52、01:08–01:23、02:01–02:06](./ORIGINAL_PVP_VIDEO_20261027_MATCH01_OF04.md)：赤いピン照準と標的、戦闘中の技ポップアップ、敵味方の表示、KO青い火、必殺カットイン、複数命中と結果画面。映像は実況編集付き、約126.83秒の単一例。
2. [別の提供原作PvP録画・Phase49：00:37–00:43、01:04–01:10、01:12–01:17、01:28–01:32](./PHASE49_USER_SUPPLIED_ORIGINAL_PVP_VIDEO_REVIEW_20261027.md)：**赤い円形ピン**、**緑色のスキル発動ポップアップ**、キャラ別大判必殺カットインと攻撃結果の順序。動画内の右側ウォッチや赤青字幕等、実況合成UIと原作UIは区別する。原動画には編集/カットがある。
3. [LEVEL-5公式『妖怪ウォッチ2』妖怪とバトル](https://www.youkai-watch.jp/yw2/game/game06.html)：前衛とサークル、零式G技とつつくの操作。これは原作の操作の存在を確認する公式出典であり、色の厳密なRGBや内部動作秒数の証拠ではない。
4. [対人経験者の「モーションとサークルの反映」](https://note.com/tombow_yw/n/n1e4cf179d2d9)：相手視点のサークル状態はアクション中に即反映されない可能性。経験記述であり、映像の二席同時観察による証明ではない。今回この特殊条件の通信方式を推測変更しない。

## 比較台帳

| 観察箇所 | 原作一次観察 | V3-5-8コード | V3-5-9処置 |
|---|---|---|---|
| Phase49 00:37–00:43／Match01 00:24–00:42 | 対象を囲う赤い円形照準 | `.mb-pin-reticle` の背景は赤系だが**外輪3pxは黄/金色 `#ffce83`** | **外輪を赤系`#ff6670`、輪の発光色を赤系**に変更。クロスヘア/円・対象追随は既存を保持 |
| Phase49 01:04–01:10 | 緑色のスキル発動ポップアップ | `.mb-passive-notice` は**青背景`#244460e8`、青い枠** | **緑背景`#214c3de8`、明るい緑枠`#a3e4a1`**に変更。Host確定スキル内容/位置/表示時間は変更しない |
| Phase49 01:12–01:17 / Match01 00:43–00:52 | 上画面ほぼ全面の技カットイン→命中/HP変化→フィールドへ | `.mb-yw2 .mb-special-flare` が上画面全体の独自SVGカットイン。実Hostのspecialイベントと`anticipation/impact/recovery`が分離 | **既存を維持**。原本のフレーム時間/原作技別ヒット数は未検証 |
| Match01 01:08–01:23 | KOで青い火、控え交代 | `frontlineHTML` の実KO HP=0で`.mb-ko-wisp`青い炎、正規Host控え交代で`.mb-arriving` | **既存を維持**。勝敗確定/HP処理はHost責務 |
| Phase49 01:04–01:10、Match01 00:55–01:05 | ガード・スキル・とりつき・回復や個別命中を区別 | `mb-action-callout`、`mb-passive-notice`、`visibleHit`、`specialImpactLedger`／`specialHitLedger`で表示を分離 | **既存を維持**。原作の全技と乱数/個別タイミングの一致は別課題 |
| Match01 02:01–02:06 | 敗北/結果へ | Host winner→両席別`projectMatchResult`、最後のsceneが終わった後の結果overlay | **既存を維持**。学校Safariで要実試遊 |

**色の近似を超え、独自の強化演出や新バトルルールを追加していない。** 公開された原作スプライトや動画のフレームをGitHubへコピーしていない。

## 変更内容

- `lab/yw2-layout.css`：赤の標的外輪・光彩と、緑のスキル通知背景/枠/文字に限定。教室画面/研究画面で共通のバトル描画CSSだが、**戦闘結果・通信には影響せず、他ゲームは対象外**。
- `tools/sites-online-smoke.mjs`：実Firebase RTDB Emulatorの学校形式`srcdoc`2席で、Guestが本物のHost承認ピン（B3 ACK）を受けた直後、`.mb-foe-line [data-unit=A2] .mb-pin-reticle`の**表示・CSS実計算色が明確に赤いこと**を検査。Host/Guest両座席の`#mb-passive-notice`も**green-tintedの実計算色**を確認。スキル発動を捏造するテスト用の戦闘書換えはしない。
- 前V3-5-8の**3種類の短iframeの必殺/Gタップ領域試験**、通常/G/おはらい・6体KO・1試合完結までのFirebase実二席E2Eは削除せず回帰。

## CI／留保

- 実装コミット`6c545a79c3fb271666f7cb7a9876202bd6aa4f80`、QA改良`5872c2f9dc58dd74e74d878f91490061eb03162e`。
- **[Stage Chromium](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41178471773)：成功**。
- **[Node 全回帰](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41178475495)：成功**（件数はログに従って記録）。
- **[Node 950/950 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41178817313)**（最新コードとテスト生成パーサの全回帰）。**[Chromium Stage 全16件PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41178817321)**。
- **[Firebase No-Auth RTDB Emulator実2席＋旧Rules再現が2回連続PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41178817458)**：Host受信済みGuest敵ピンの赤い円形`mb-pin-reticle`の**実計算CSS色をChromiumで検証**、両席の`mb-passive-notice`計算色も緑色と検証。以前からの円ドラッグ、狭枠チャージ、通常必殺、零式G、おはらい、6体KO・控え・勝敗がすべて2回成功。**本番Firebaseは読み取り専用GET HTTP200**、本番書込み・学校Safari実機2台は未検証。
- テスト中の修正履歴：最初の画面色検査スクリプト生成で`\\n`と`\n`を取り違えて、Chromiumが`ONLINE-EMBED-WAIT`のまま90秒タイムアウト（[修正前Run](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41178475668)）。**元ゲームのFirebase障害ではなくテスト用HTML内JavaScriptの構文エラー**。検査コードのエスケープを修正し、`node:vm.Script`で**生成済みQAスクリプトをChrome起動前にパースする予防策**を追加した。最終の[修正済み全通しRun](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41178817458)で成功。
- **検証済みコード・QA最終HEAD `2ee18dee20e295455763429f67b62d0792a0c154`**。この後は資料のみを更新。
- **学校Safari物理iPad2台で未検証**。本人からの原作MP4をこの工程で直接再視聴していない。GitHub開発ブランチだけ、Google Sites実稼働HTML、本番Firebase Rules/DB/Auth、main、Drive配布は無変更。

## 次V3-5-10

まず本物の学校iPadで「赤いピンが即時に分かるか」「スキル通知がフィールド内で妨げないか」「戦闘進行と入力に同期ずれはないか」「通常6対6が長すぎないか」を友達の試遊と原作元映像の比較で検証。重大な操作不具合があれば原作演出の微調整より優先する。**10/22保存のFirebase historical Rulesには2026-11-08 00:00 JSTの期限**があるが本番Rulesの同一性は未確認。無断で設定変更しない。
