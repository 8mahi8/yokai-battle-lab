# 妖怪ウォッチ2 V3-5-11｜とりつき状態マークの「予備動作中に先行表示」修正（2026-11-02）

## 目的と根拠

本人から受け取った原作PvP動画の一次観察記録で、行動の発動モーション、影響・ダメージ・状態変化の描画、後続の戦場表示が**異なる段階**で確認されている。[原作動画 Match01](./ORIGINAL_PVP_VIDEO_20261027_MATCH01_OF04.md)の00:15–00:19、00:55–01:05、[別動画のPhase49](./PHASE49_USER_SUPPLIED_ORIGINAL_PVP_VIDEO_REVIEW_20261027.md)の00:44–00:48、01:04–01:10。これらは前担当による**提供MP4の過去の実フレーム観察**であり、今回原動画を直接開いていない。原作内部の状態確定タイムコード・厳密なフレーム秒数までは証明しない。

現行の`ui/match-stage.mjs`は、**すでにHostが確定した正規HP**を`stagedHealth`で`anticipation`中は命中前に戻して描画し、`impact`で新HPへ切替える。一方、`negative`と`positive`のとりつき状態マークは`makeStageView`の**確定済み正規状態**を`frontlineHTML`、`teamHTML`へ直接渡していた。そのため予備動作の最初のフレームから新しい「⚠」「↑」が表れてしまい、技の予備動作→命中→状態変化の視覚的因果と矛盾していた。

## 変更の範囲と理由

- `ui/match-stage.mjs`：従来の`stagedHealth`と同様、**正規`action.kind==='inspirit'`で前回`previousView`がある対象に限定**し、その`positive/negative`を表示専用`stagedConditions`へ保存。通常の`scenePhase==='anticipation'`だけ古い状態を`shownCondition(unit)`で描画、`impact`・`recovery`では**最新のHost確定状態**を描画。前のSnapshotがない再入室/バッチ配信時に**架空の前状態を作らない**。完了/新scene/画面非表示時は既存`cancelScene`から状態キャッシュをクリア。
- 該当する見た目は**上画面の敵/味方の状態バッジ・元のaria-label・状態表記と、下画面本人メダルの⚠**。`makeStageView`の正規`game.inspirits`、おはらい可否、ステータスによる戦闘効果、攻撃成功、通信Snapshot/Host/GUEST ACK、回転/必殺/G技等のゲームルール・時間は無変更。**原作内部の状態付与そのものを遅らせる修正ではない**。
- 前担当V3-5-10の**相手の輪/妖気のモーション中表示保留**も維持。今回の`stagedConditions`はとりつきの新規描画だけに絞り、追加のTimerや戦闘エンジンは導入していない。

## 回帰試験での発見と対応

1. `tests/phase49-video-derived-visual-contract.test.mjs`の静的検査は`unit.negative`と`unit.positive`を描画に直接使う設計を前提にしており、新しい`shownCondition`の導入で失敗。正規状態を直書きすることを要求するのではなく、**命中段階に連動する`shownCondition`と前状態の保存**が存在することを検査するよう変更。実表示順序は以下のブラウザE2Eで確認する。
2. `tools/sites-online-smoke.mjs`の認証なしRTDB Emulator二席`?purify`は、実ホストがピンされたB1に**正規の負とりつき**を成功させた後、**Hostの状態はマイナス確定なのにGuestサークルとHost敵フィールドにまだ状態マークがない**ことを`anticipation`で確認し、`impact`以降のマーク出現を観察してから既存の後衛おはらい5タップを完走する。
3. `?onegame`の全部入り13行動シナリオでは、先行アクションの演出キューがあるため「最新ホスト行動を受信した瞬間、必ず`inspirit`の`anticipation`である」というテスト仮定は成立しない。**前段`?purify`だけで時系列を厳密検査**し、`?onegame`はHost確定状態が両者の描画へ正しく到達するまで待つ役割に戻した。テストを通すためにシーン処理/通信を不自然に速めない。

## 最終CI結果：ゲーム/QAコード HEAD `34f34c15c3bc5d7b235f3bfc1745707d6abf2e5f`

- [Node 950/950 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41323466145)
- [実Chromium Stage 16/16 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41323465990)
- [Firebase No-Auth 実2席 srcdoc＋現行Emulator Rules＋2026-10-22の過去Rules再現 **2回連続すべてPASS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41323466038)：`SITES-FIREBASE-FRIENDS-EMULATOR-PASS`、`SITES-FRIENDS-CHARGE-PASS`（正規2行動+6Pointer）、`SITES-FRIENDS-G-CHARGE-PASS`（正規6行動+6Pointer）、`SITES-FRIENDS-PURIFY-PASS`（負とりつき→命中後表示→後衛おはらい5Pointer）、`SITES-FRIENDS-FULL-MATCH-PASS`（KO6体、控え、双方結果）、`SITES-FRIENDS-ONE-GAME-PASS`（同一試合で一連の13正規行動、通常必殺/G、勝敗）。
- 本番Firebaseへのread-only GET HTTP200。**本番書込みや実iPad Safari二台での指操作は未検証**。この検査はLinux Chromium + localhost Firebase Emulator二席であり、「本物の学校iPadで動作確定」とは主張しない。

## ロードマップと次工程

**V3-5-11 完了／V3-5全体は未完了**。次 **V3-5-12** は**実iPad Safariの2人試遊と原作の技発動・命中・状態表示の画面差**を優先し、実機を操作できない場合は原作動画の観察資料と実DOMの照合で確定的な違いだけを直す。原作内部の時間・確率/技効果が不明なまま、独断で2.6秒AutoClockやキャラ性能を調整しない。

ユーザーの許可なく学校Google Sitesの実稼働HTML、本番Firebase Security Rules/Auth/DB、学校配布Driveを変更しない。今回のコード・テストはGitHub**開発ブランチだけ**に保存。2026-11-08 00:00 JSTは保管済み**過去Rules写し**にだけ明記された期限であり、現在の本番Rulesと一致するかは未確認。
