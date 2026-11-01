# Phase2.2B-1｜実ホスト必殺技のHP・状態異常の正規記録を上下画面へ

2026-10-29 JST｜開発ブランチ `feat/phase1-action-circle-lab-20261023`
最上位目標は本人提供の原作『妖怪ウォッチ2』対人戦動画のように、学校iPad SafariのGoogle Sitesで友達と戦えること。**現在は未完成であり、動画・ルール・演出の完全一致を宣言しない。**

## 今回の原作再調査と確証の限界

- [Mt. Wildwood YW2 ジバニャン「ひゃくれつ肉球」](https://mtwildwood.net/yw2/yokai/jibanyan)：**20×7**（各hit計算式も記載）。
- [攻略大百科 YW2 ジバニャン](https://gamepedia.jp/youkai-yw2/monsters/272)：**20×5**。別の日本語攻略資料も5回記載。**ヒット数は矛盾したまま**。どちらかを原作真実としてレンタル6体や戦闘エンジンに適用しない。
- [攻略大百科 YW2 「トホホの砲」](https://gamepedia.jp/youkai-yw2/specials/3826)：**30×1・敵全体・すばやさDOWN**。**単発×敵複数**と、1対象への多段攻撃は独立した概念。
- [本人提供原作第1試合の過去フレーム観察記録](./MATCH01_SECOND_PASS_INPUT_AND_TIMELINE_20261027.md)：00:44–00:46「ひゃくれつ肉球」カットイン→00:47–00:51数字が時間差で表示、00:59–01:05「トホホの砲」状態変化。本作業では元のMP4実ファイルを直接再取得・再生できていないため、これらは**以前の担当が実フレームを確認した記録の再照合**であり、当日の実目視とは主張しない。
- 3DSの内部命中抽選数・対象分配・各種ステータス効果の先後や正確な演出秒数は未確証。**ソース未確定の新しい実ダメージ・連撃数を作らない**。

## 今回コードで実際に通した範囲

- 新規 `contracts/soultimate-impact-ledger-v1.mjs`：ホストの`special`イベントに**既に記録されている**`targetId`・`hpBefore`・`hpAfter`・`amount`・`deltaHp`・`statusEffect`・`applied`・`resisted`を、immutableな厳密型`Soultimate Impact Ledger v1`として投影。HP差とダメージ、回復、復活条件、状態異常の抵抗との矛盾は拒否。**originalHitCountは常にnull**。これは「1人に何発命中したか」の台帳ではなく「各ターゲットに最終何が起きたか」の正規台帳。
- `ui/match-stage.mjs`：ホスト正規スナップショットを読み取るステージ投影だけに台帳を追加。相手の前衛3体への結果を順番に映す間、**同じ実イベントの`hpBefore/hpAfter`を表示時刻に使う**。前のネットワークsnapshotを失った場合でもその技の記録から表示を再構成できる。ホストの実HP・戦闘ターン・Soul・Firebase通信は無変更。
- `ui/battle-vfx.mjs` → `presentation/action-choreography.mjs`：正規台帳を画面キューに運び、**イベントID・発動者・対象順・効果種・表示ダメージの相互整合をチェック**。嘘の命中回数や新たな追加効果を推測しない。以前の旧イベント表示は互換維持。
- 新 `tests/phase2-2b-soultimate-host-ledger.test.mjs`：6体すべての**実ホスト必殺**からダメージ・回復/復活・バフ/デバフ（抵抗も）を取得し、`host → view → cue → choreography`の正規記録が完全一致することを検証。壊したHP・状態フラグ・target・表示ダメージは拒否。
- 研究ページ`lab/match-stage.html?review=real-special-ledger`と`tools/stage-smoke.mjs`：**実ホスト**からA1必殺を実行して実Chromium上に投影。敵B1→B2→B3の浮動数字が各時刻1人分だけ表示され、各対象の画面HPが**その時点のホスト`hpAfter`と一致**するか、表示DOMを20ms間隔で観測。旧`?review=special`の固定数値フィクスチャとは独立した品質検証。

## 実際の回帰検証・失敗も記録

- 最終ゲーム/QAコードコミット：`0bfce781050bd96f2df5f9515d6bd631ed53636d`。
- [GitHub Actions／Node全683件PASS・自然6体戦闘耐久PASS・研究ChromiumブラウザPASS（再実行attempt 2）](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40714382531)。
- [GitHub Actions／実Chromium Stage・全ジェスチャー・両視点結果、3体の固定target表示、**3体の実ホストHP表示もPASS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40714382565)。実ログ：`PHASE22-REAL-HOST-HP-LEDGER-DOM-PASS 3 canonical target HP transitions`。
- 初回`a92e999c702`のNode試験は、テストfixtureに`researchStatInspirits:true`を欠いていて失敗。ゲーム本体の挙動と区別し修正。
- 最終コードSHAの**研究unitワークフロー初回**はNode683 PASS/耐久PASS後にChromium研究画面の**起動タイムアウト2回**でFAIL（ゲーム判定のエラーではなく実ブラウザ起動時）。同一runの**attempt 2を明示再実行して全ジョブSUCCESS**。古い失敗履歴を消さない。
- 学校Safari二端末・本物のGoogle Sites埋込・本番Firebaseへの今回の最新コードでの通信は未検証。元MP4フレームとの重ね合わせ比較と、複数対象＋各対象多段hitの本家忠実性も未完。

## さらに必要な次工程

**Phase2.2B-2：確証のある技だけに「一撃ごとの実ホストhit ledger」を導入する。** 本家hit数/対象分配・ガード/回避/会心/状態ダメージ順序が確認できない技は`unknown`を維持。今回の`SoultimateImpactLedger`（結果単位）と将来の`SoultimateHitLedger`（打撃単位）は別フィールドにし、**対象3体を3ヒットと偽らない**。動画の連続フレームを再取得できる場合は先に目視照合する。

原作の「上画面戦闘を見ながら下画面の操作」という体験、入力中の上画面の保持、原作に特徴的な全キャラ別カットインと戦術発生条件は別フェーズで継続。Google Sites稼働版、GitHub main、Firebase本番Rules/DB、旧Drive配布は変更しない。
