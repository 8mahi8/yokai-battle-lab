# 妖怪ウォッチ2 V3-5-13｜必殺チャージ未受入3種のFirebase無認証2席・完走E2E（2026-11-02）

## 目的／原作根拠

『妖怪ウォッチ2』には「まわせ！」「打て！」「なぞれ！」「あわせろ！」の**4種類**の必殺チャージがあり、ランダムに選ばれる。特に**なぞれ！は3回、あわせろ！も3回**の成功が必要という攻略資料を確認した：[ゲームエイト 必殺技の使い方と妖気ゲージの回復方法](https://game8.jp/youkai-watch2/504498)、[攻略の虎 バトルについて](https://toragame.com/youkai2/kihon/battle.php)。後者は時計の針を合わせてから指を離す必要性にも言及。**原作の正確な指の軌跡、角度許容値、進行速度は未計測である**。前の本人提供原作MP4を今回直接再視聴しておらず、記録済みの[元動画観察台帳](./ORIGINAL_PVP_VIDEO_20261027_MATCH01_OF04.md)および[Phase49](./PHASE49_USER_SUPPLIED_ORIGINAL_PVP_VIDEO_REVIEW_20261027.md)を参照。

`engine/charge-input.mjs`は既に`spin/tap/trace/align`を4種類ともデータ駆動で実装していた。V3-5-12時点の**認証なしFirebase二席の実ブラウザ完走**では、既存seed12の`tap`のみ全6タップ＋真の必殺発動まで成功していた。残り3種類は、Nodeモデルだけでなく**学校に貼るsrcdoc構成で実際に操作を完了できるか**未確認。誤って新しいルールや操作を作らず、この受入ギャップを優先した。

## 変更範囲

1. `lab/sites-embed-online-entry.mjs`: **localhost Firebase Emulator + Friends + about:srcdoc のQA専用`?chargecycle`**だけ、既存`chargeQaMode`の`RENTAL_SQUAD`ガード編成・妖気容量5を保持し、`seed:14`を選ぶ。`seed12`の既存`?charge`/`?gcharge`は変更しない。これは**原作RNGの分布を調整したものではない**。実`engine/charge-input.mjs`の`chooseChargeKind`がseed14、Guest側トークン1/2/3でspin→trace→alignを選ぶ。ゲーム本体/攻撃仕様や通常学校Friendsの編成・RNGは無変更。
2. `tools/sites-online-smoke.mjs`: `?chargecycle`は同じローカル部屋のHost/Guest本物の`srcdoc`iframeで、**本当のHostガード行動による妖気蓄積→Guest必殺開始のHost ACK→実ブラウザの`PointerEvent`→Guest/Host両方のコマンドACK→必殺チャージ完了→ホストの`special`イベント→B1妖気消費→さらに正規行動で妖気を貯め直す**サイクルを、3種類とも順に完走。3回の必殺で相手HPが本当に変わることも確認。合計14のHost正規ガード行動が試験中に必要となった（実行ログ）。
   - `spin`：半径0.32の円を12サンプル/回転で回し、Host trialが規定の2回転に達するまでpointerdown→pointermoveを繰り返す。時計回りの小刻みな操作（瞬間ワープ禁止）。完了後はパネルが閉じていてもPointer解放を送る。
   - `trace`：Hostが発行した`challenge.path`とGuest画面のSVGを確認し、3度のなぞりを本物のpointerdown/move/upとHost ACKで成功させる。`challenge.count`の進捗も各回検査。最後の`pointerup`は必殺が既に完了した場合は余計な入力にならないよう扱う。
   - `align`：Hostが指定した3つの`clockNumber`について、実際の針始点から目標の数字方向へPointer移動して**1回ごとに指を離す**。3回成功後の必殺発動を確認。画面のSVGガイド、Host trialの`count`を照合。
   - どのモードも`challenge.kind`と`guided.token`を**Host実スナップショットから取得**。試験側で必殺成功に書換、Soul増加、ダメージ付与、偽ACKの生成は一切しない。対戦参加者に見えるチャージUI自体は既存のまま。
3. `tools/chrome-realtime-qa.mjs`: `127.0.0.1`限定のCDP試験URL許可一覧へ`?chargecycle`のみ追加。遠隔Chrome/外部URLは対象外。通常学校配布ビルドはこの試験入口を使わない。
4. 既存テストは全部残した。以前の正規`tap`6回/零式G、前Phaseのおはらい5種・pop完遂、`?fullmatch` 6体KO、`?onegame`一試合通し・勝敗表示、通常VS過去RulesのFirebase二席を回帰実行した。

## 見つかった問題と修正

初回の新たなFirebase試験は**spinの正規完了後**、操作画面が消えたので試験ヘルパーがゼロ寸法のパッドへの`pointerup`解放を拒否して失敗。これはゲーム側では**終了時にパネルが閉じる正常動作**だった。テストヘルパーを`!expectAck&&type==='pointerup'`の場合にのみ表示寸法チェックを緩め、完了後も最後の指離しを扱えるよう修正（余計なHost入力はしない）。このテスト専用修正で2条件とも最終PASS。**ゲームルールや描画コードの改変は不要だった**。

## 最終CI結果（検証済みテスト/ソースHEAD `71c77f4d0aa48e30d439a0cdcec21971abf19553`）

- **[Node 950/950 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41326495148)**
- **[実Chromium Stage 16/16 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41326490328)**
- **[Firebase No-Auth RTDB Emulator＋実Chromium二席 `srcdoc`、通常Rules／保管済み過去Rulesの2条件すべて全試験PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41326490366)**（別同一HEADワークフローも [PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41326495213)）。どちらのRulesでも`SITES-FRIENDS-CHARGE-CYCLE-PASS three real Host selected spin/trace/align power charges, all Pointer gestures, ACK, Soul spent and three true Specials (14 real Soul guard actions)`。通常/gcharge、purify/pop、purifycycle、fullmatch、onegameも各2回PASS。本番Firebaseへのread-only GET HTTP200、**本番DBへの書込みは未実施**。

## 完了判定の限界・次工程

- **4種類の既存必殺チャージについて、実Chromium+Firebase二席の全入力/完了/技発動が一通りPASS**。一方、**iPad Safari実機2台のタッチ入力・学校Google Sites埋込の表示と回線品質は未試験**。実際の人間の指で再現したわけではなくChromium上のシミュレートしたPointerEventを使用。原作の正式な指軌跡・数値閾値・時間を証明していない。
- 次 **V3-5-14**：既存の`touchstart/touchmove` fallback、`pointercancel`等のSafari端末で起こりやすい操作の中断・再開を、実際の学校iPad Safari二台試遊が可能なら最優先。できなければ現行仕様とUI/原作録画の観察資料から**起こり得る重要な不整合のみ**確認し、必要なら試験を足す。チャージ以外の原作未完成要素もロードマップに沿って優先順位を再評価。原作の行動間隔や必殺威力を動画の編集タイミングから推定して勝手に変更しない。
- **GitHub開発ブランチだけ更新**。学校Google Sitesの貼付HTML、Firebase本番Security Rules/Auth/DB、main、Drive配布は無変更。保管済み2026-10-22 Rulesに書かれた期限は**2026-11-08 00:00 JST**だが、現本番Rulesとの同一性は未確認。ユーザー許可なくRules変更しない。**V3-5全体・原作完全再現は未完了**。
