# 妖怪ウォッチ2対戦再現｜Engine V3-4-20：席別・相手サークル表示保留の最小研究統合（2026-10-30）

## 完成条件と今回の線引き

本来の目的は原作の対人戦の**読み合いを、学校のiPad Safari上で操作可能な戦闘として再現**すること。原作「ノーモーション必殺」は専用ボタンで実装してはいけない。サークル/チャージ入力が受理されても、相手画面の状態がモーション終端まで見えないため自然に生じる戦術。

- [たくトンボ「妖怪ウォッチ2対戦の基礎テクニックと仕様」](https://note.com/tombow_yw/n/n1e4cf179d2d9) の「モーションとサークルの反映」：長いとりつきモーション中にサークルを回したり必殺チャージしても、**相手視点での反映はモーション終端**にまとめられ得る。根拠は熟練対戦者の実戦解説であり、ゲーム内部フレームの証明ではない。
- [MDN Page Visibility API](https://developer.mozilla.org/ja/docs/Web/API/Page_Visibility_API)：背景タブ/iframeのタイマー・requestAnimationFrameは制限され得る。ページ非表示・再表示時に古い演出を取り続けるのでなく、正規状態へ戻ることが重要。
- [本人提供の2026-10-27原作動画の既存観察台帳](./PHASE49_USER_SUPPLIED_ORIGINAL_PVP_VIDEO_REVIEW_20261027.md) は上画面での別モーションと下画面操作の並行を示す。ただし**本人動画で2人の相手画面を同期観測したものではない**。今回も元のMP4を直接再生したわけではない。
- **制限：** 3DSの正確なミリ秒・技別演出終端・両席の同期元・チャージのどの段階が可視か・強化解除の可視優先順・画面内ステータス更新時点は**未確証**。今回`ACTION_VISUAL_CATALOG`の演出時間をあくまで研究fixtureとして利用する。既存オンライン対戦の通信タイミング/入力を勝手に遅らせない。

## V3-4-19から再利用した基盤と新しい責務

`engine/presentation-timeline.mjs`：既存の`beginMotion/advance`はモーションの時間とブロック終端を扱える。これを捨てて別のタイマー/サーバー/共通状態ストアを作らない。

- **新規`ui/seat-motion-visibility.mjs`**：renderer-private `createSeatMotionVisibility({seat})`。表示中の行動の`eventKey`と`durationMs`、直前の`makeStageView`から**相手側だけの表示基準**を保存。`begin → advance(elapsed) → finish`を既存Timelineへ委譲し、`project(view)`が凍結するのは**相手の3前衛配置、回転位置、Soulゲージ/わざ準備表示、相手のWatchモードの表示**のみ。自分の円は即更新、相手のHP/状態異常/KO/勝敗/イベント/予測・入力合法性は**常に正規ホストデータ**。矛盾に気づいた時も戦闘判定側を書き換えない。
- **`ui/match-stage.mjs`**：`researchOpponentVisibility:true`だけで研究機能を有効化。Phase50 FIFOとV3-4-19現在演出`eventId`から`beginScene`の前回可視状態を保存、シーンの`advanceScene`で解放。通常の`view`は常にcanonicalのままで、`shownView`だけを上画面敵前衛とメダル描画に使用する。見えている相手をタップしても認可/入力は**旧MatchCore**が確定する。標準のオフライン/学校Friends画面の既定値は**falseで変更なし**。
- **新しい試合/背景復帰**：`cancelScene`、非表示、ユーザーの席切替、`destroy`で待機中の相手可視状態を破棄。新しい試合でイベントログが空（`maxId=0`）になっても**以前の戦闘モーションを保持しない**不具合を既存表示コードに修正。タブ復帰や再接続で古い表示を延々見せない。
- **テストページ**：`lab/match-stage.html?review=seat-motion-v3`。ゲーム自体と同じ`createMatchProtocol`で2DOM席を描画。Aがモーション演出中にBが正規`dispatch(rotate)`→Aは旧B1/B2/B3を表示、B本人/hostはB2/B3/B4、演出終了後AもB2/B3/B4、さらに新戦闘再開時の凍結解除まで検査。
- これで原作の**表示保留の原因を再現するための画面側最小枠組み**ができた。ただしモーション保留を実際のFirebase Online両席へ**標準適用していない**。一方の端末のタイマーによる独立判定では完全に同時解放できないため、正式化する前に通信由来のイベント境界とホスト可視タイムスタンプの設計を確定する必要がある。

## 回帰・確認

- `tests/v3-4-20-seat-motion-visibility.test.mjs`：5テスト。実MatchProtocolのホストと自分のB円回転即時／Aの表示保留、HP/状態/勝敗の正規性、まとめ更新の最後の前衛へ即時再同期、タブ終了/時間スキップ/再開、invalid入力拒否と正規ハッシュ非変更。以前の920件を維持。
- `tools/stage-smoke.mjs`へ**実Chromiumの2席同時表示テスト**を追加。ゲームの権威エンジンを使い、2席のホスト状態と画面を突き合わせ、画面が更新されないまま停止しないことを検証。さらに**モーション中の新しい試合開始**で旧敵前衛/ロックが残らないことを検証。
- 開発中の最初の920+5件では`advance(-1)`がモーション非実行時に無検証で返る1件を発見→検証順を修正。**途中失敗を最終成功と偽らない**。最終機能コードに対し[Research unit CI #41048530149](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41048530149) **925/925件全合格・失敗0**。[Chromium Stage QA #41048530125](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41048530125) **全段成功（モーション中相手表示保留→解除→試合再起動を実DOM確認）**。[Firebase Friends 2席QA #41048538273](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41048538273) は同一実装コミットの最終結果を確認する。前の同等戦闘コードは[2席QA #41048381335](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41048381335)成功。
- 学校iPad Safari2台での実機試験なし。Google Sites配布中のHTMLは変更なし。**Chromium成功≠Safari実機成功、研究画面成功≠本番オンラインの表示遅延完成**。

## 次に優先する工程：V3-4-21

今回の枠組みを不用意に学校公開へONにせず、ホスト確定イベント（`eventId`、モーション開始/解除）とローカル演出時間・Firebase snapshot受信タイミングとの違いを診断・レビュー。必要なら**正規イベントに非権威の表示境界メタ情報**を付け、ホスト/ゲストの演出窓が接続遅延/切断復帰でどうズレるか実2iframeで再現。原作の未確認フレームは推測で埋めない。最初に普通の6体戦が楽しく遊べる操作・同期を守る。

保存先：GitHub dev branch `feat/phase1-action-circle-lab-20261023`。main・学校稼働HTML・本番Firebase Rules/Auth/DB・Drive配布は未変更。