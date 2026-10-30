# 妖怪ウォッチ2 Engine V3-5-5｜一試合の全操作・KO控え・結果まで（2026-10-31 JST）

## 結論／受け入れ条件

**V3-5-5 の戦闘ルール・一試合統合ゲートを完走。** 実行したのは (1) 1試合・一つのHost MatchProtocolに対し、とりつき→後衛おはらい→通常必殺→相手のサークルで控え前進→零式Gわざ→最後の3体KO→勝敗結果まで順序つきで成立すること、(2) 同じフローを **Firebase RTDB no-Auth Friendsの2席・Chromium srcdoc** で手動指操作として流すこと、(3) 別の実通信6対6で純粋な通常攻撃だけによる全KO/控え/勝敗を確認すること。

原作の正確な技威力・個体能力・3DSの秒単位・演出一致・学校Safari2台での動作までは確認していない。**V3-5全体は未完成**。ここで使ったシード/HP/妖気コスト/行動重みは **localhost専用QA fixture**（配布対象ではない）。学校版のキャラバランス変更とは扱わない。

### 確認済みCI

- 実装・テスト HEAD（QAソース修正）：`af182a09ccf849d9b3df97bbd453b4158ef27703`。
- **Node 949/949件成功**：https://github.com/8mahi8/yokai-battle-lab/actions/runs/41089362492 。一試合統合ログ：`V3-5-5-ONE-ROOM-COMPLETE-PASS initialAuto=10 waitB2=0 waitG=3 normal=tap G=tap revision=41 ownerActions=13`。
- **別のFirebase実通信6対6成功**：https://github.com/8mahi8/yokai-battle-lab/actions/runs/41088420666 の `SITES-FRIENDS-FULL-MATCH-PASS 7 real Host actions, six KO, 3 reserve substitutions, guest pin/rotation/Zero/Standard ACK, both final overlays and identical final revision`。
- **最新Firebase実通信2席／過去Rules再試験を含めて全工程 SUCCESS**：https://github.com/8mahi8/yokai-battle-lab/actions/runs/41090175095 。`SITES-FRIENDS-ONE-GAME-PASS 13 real Host actions, negative Inspirit, bench Purify 5 pointer ACK, normal B2 6 touch, Host 3 legal reserve rotations, Zero G B1 6 touch, all six KO and opposite two-seat results` をローカルの実RTDBエミュレーターで**2回成功**。既存の通常必殺・G・単独おはらい・通常6vs6を含む全ブラウザシナリオも二度通過。認証なしSDK/Rules/通信検査も成功。
- **最終HEADのNode・Stage CIも成功**：[Node 949件（同一コードHEAD）](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41090175098)、[Chromium Stage](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41090163180)。

## 原作映像の一次観察と現在の再現の照合

一次資料：[2026-10-27対戦動画 第1試合の過去担当目視観察](./ORIGINAL_PVP_VIDEO_20261027_MATCH01_OF04.md) からのチェック。元MP4本体は今回のセッションでは見つからず**今回直接視聴していない**。約126.83秒（約2分7秒）の動画からは、原作の全試合の標準所要時間を推定しない。

| 原作録画の時刻（約） | 現在の受入れ結果 | 完全再現の不足 |
| --- | --- | --- |
| 00:11〜00:15 前衛3×2/6体サークル | 6v6 Host戦闘状態、両席Stageで確認 | 本家キャラアート・UIデザイン、3DS実画角 |
| 00:15〜00:19 下画面おはらいの連打 | 本当の敵とりつき→後衛B1を5 Pointer操作で解除 | 選ばれる種類/玉配置/時間/報酬は研究値 |
| 00:24〜00:42 ピン・サークル・通常攻撃 | Host/Guest実入力ACK、継続Auto戦闘、同じ試合で輪/ピン | 通信・表示の原作正確な時刻は未測定 |
| 00:43〜00:52 ひゃくれつ肉球カットイン→連続命中 | 通常必殺の実Host効果、独立E2Eで両席カットインも確認 | 原作技/原作Hit数/キャラ固有演出は未一致 |
| 00:55〜01:05 トホホの砲と状態変化 | 技効果・状態管理の共通処理。別キャラ演出Profile実装は既存実績 | 元動画の技固有タイミング未確認 |
| 01:08〜01:23, 01:52〜02:00 KO青火・控え | 正規HP0、控え交代、青火と表示の既存Stage研究検証。今回の6vs6でも3控え移動が実際に起きる | 実機/原作の正確な表示秒数と双方タイミング |
| 02:01〜02:06 敗北/結果 | 本当の6体KO・勝敗、Host敗北/Guest勝利のStageを実Chrome二席で確認 | 原作結果UIの細部／原作シーケンス秒数 |

追加した明確な原作ルールの資料：
- [Game8『妖怪ウォッチ2』バトルシステム](https://game8.jp/youkai-watch2/505163)：前衛/後衛・狙う・おはらい・チャージ。
- [攻略大百科：妖怪ウォッチ零式](https://gamepedia.jp/youkai-yw2/archives/1873)：Gは発動者＋左右の妖気・通常2倍、隣が後衛でも可。
- [攻略の虎：戦闘の基本](https://toragame.com/youkai2/kihon/battle.php)：後衛でとりつきを解除、零式のつつくとG。

## 差分とテストの役割

- `lab/sites-embed-online-entry.mjs`：**`?fullmatch` と `?onegame` は `--emulator-friends` + localhost srcdocのみ**。前者はAのHP低/Guest通常攻撃強、後者はA先頭の本当の負とりつき／B自然Guardで妖気5を蓄積。いずれも**試合開始時のcustom teamsだけ**指定。Guestの入力はいつもどおりFirebase送信→Host正規エンジン、ホストの自動進行も既存 `advanceAuto` をそのまま呼ぶ。ゲームの隠しHP/状態注入APIは追加しない。配布用`--friends`は既存のレンタル6体/本番設定のまま。
- `tools/sites-online-smoke.mjs`：前工程の基本1vs1、通常必殺、G、おはらいを残した上で、`?fullmatch`（Host7行動で六体KO/3控え交代/両画面勝敗）と `?onegame`（**13 Host自動行動＋Guest本物のタッチ/両者輪回しで一つの部屋の1試合完遂**）を追加。確認するのは**両画面のrevision/ACK・本物の`special`/ `purification`イベント・最後の2つの反対結果**で、Fake DOM/勝敗の注入はしない。
- `tools/chrome-realtime-qa.mjs`：読み取り専用CDP許可URLは`127.0.0.1`の既知QAページ`?fullmatch` / `?onegame`だけ追加。外部ブラウザは対象外。
- `tests/v3-5-5-friends-full-match.test.mjs`：正規6vs6全KOと相手別勝敗、2つの通常レンタル試合進行サンプル、ジャーナル再演算。
- `tests/v3-5-5-one-room-complete-input.test.mjs`：**通常・G・おはらいが一試合で実Host状態に変化を起こし、全相手KO**。途中3体KOの後、Hostが自分のウォッチを**正規の`rotate`コマンド3回**で残り3体に交代する。ゲームルールを勝手に自動3体交代へ変更しない。

開発中に検出して直したのは**新規QAコードのJavaScript改行後`return`が空になるミス**、タップ対象が毎回新しい単一DOM要素になるのに6個の配列として参照したミス、初回KOから控え一括全3体前衛への誤仮定（実ゲームは輪を回して交代する）。**ゲーム本体に未確認の新仕様を加えていない**。

## 学校通常試合のテンポ：要試遊／推測と事実の区別

上記高速KOは試験用HP1/35の意図的なfixtureであり、学校の通常バランスではない。通常設定の同じレンタル6体でSeed12では**160行動後、10体KO・まだ勝敗なし**、Seed41では**121行動で決着**（今の`2600ms`固定AutoClockなら前者約6分56秒時点の継続、後者約5分15秒相当。ネットワーク一時停止等の追加時間を含まない）。通常バトルの長さ、ボタン待ち、勝敗発生率は学校友達の体験に直接響き得る。1本の原作動画約127秒との所要時間比較は条件不一致であり、数値だけでゲームを勝手に高速化しない。**次に学校で確認する価値が高い項目**。

## GitHub運用・次工程

- 開発ブランチ `feat/phase1-action-circle-lab-20261023`、Draft PR #1。GitHub本番mainおよび学校Google Sitesの直接貼付HTMLは更新していない。
- 本番Firebase Security Rules/DB/Authは変更なし、Google Drive配布なし。
- **次 V3-5-6（通常編成の実戦受け入れ/原作との質感比較）**：学校Safari実機2台での接続・入力/演出・試合進行・勝敗までの試遊、通常レンタル試合の長さと敵方操作の負担を計測。必要な場合だけ元動画の一次資料との比較に基づきテンポ・UI改善を設計して、承認されない原作ルール改変は実装しない。元動画が取得できるまで直接視聴済みとは言わない。
