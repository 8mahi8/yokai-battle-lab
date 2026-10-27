# 妖怪ウォッチ2 オンライン対戦再現｜最新引き継ぎ【2026-10-27 Phase50】

> **動画2〜4の再読込試行（2026-10-27）**：[障害の切り分けと復旧手順](./ORIGINAL_PVP_MATCH02_TO04_VIDEO_ACCESS_RETRY_20261027.md)。MP4は登録確認済だが、`container.exec`、`python.exec`、可視Pythonの全てが短い最小コマンドにも`ClientError`。**動画を読めたとは扱わない**。第1試合の既存画像は再読できた。映像の再送を先に求めず、実行環境の復旧を優先。



> **新しい研究入口（Phase51調査、コード変更なし）**：[原作4試合の再現差分・外部資料の深掘り](./PHASE51_ORIGINAL_FOUR_MATCH_DEEP_RESEARCH_20261027.md)、[第1試合のタッチ操作を秒刻みで再解析](./MATCH01_SECOND_PASS_INPUT_AND_TIMELINE_20261027.md)。P0は「戦場が操作モーダルで隠れる」「おはらい完了モーションが演出されない」「表示保留/回転と入力の時間構造が未完成」。4試合のうち2〜4は受領済みだがMP4解析環境のエラーで未視聴。**実動画4試合の比較完了とは宣言しない。**


> **2026-10-27追記：本人から追加の原作対戦動画4試合分を受領。** 第1試合のみ実フレーム観察を完了、第2〜4試合は解析環境の読み込みエラーで映像未観察。コード/公式マニュアル/対戦資料の突合は [4試合提供の監査](./ORIGINAL_PVP_FOUR_MATCH_IMPLEMENTATION_AUDIT_20261027.md)、第4試合の受領状況は [MATCH04](./ORIGINAL_PVP_VIDEO_20261027_MATCH04_OF04_INTAKE.md) に記録。全4試合を視聴したと扱わない。学校公開版・ゲームコード未変更。


> この文書が Phase50 以降の新しい入口。詳細な原作動画観察は [Phase49](./HANDOFF_LATEST_20261027_PHASE49.md)・[動画タイムコード記録](./PHASE49_USER_SUPPLIED_ORIGINAL_PVP_VIDEO_REVIEW_20261027.md)、設計全体図は [PROJECT_MAP_AND_PROGRESS](./PROJECT_MAP_AND_PROGRESS.md)。今回の変更詳細は [Phase50](./PHASE50_BATCHED_ACTION_PRESENTATION_GUARD_20261027.md)。

## 目的・絶対条件
- 友達同士、学校iPad SafariのGoogle Sites直貼りHTMLで『妖怪ウォッチ2』1vs1体験をできるだけ忠実に再現。内部コード一致は不要。見た目・操作・戦闘・原作特有の読み合いを優先する。
- レンタル6体同一構成。前衛3体／後衛3体、サークル、妖気、必殺/G、おはらい、零式、ピン、つつく。初期版に閃光魂は入れない。ノーモーション必殺は専用技ではなく表示保留等の自然な結果として再現する。
- 音声・ミニマップ・ランキング・ログ回収不要。原作で不明の仕様・確率・実時間は確認済みとしない。
- GitHub main、学校Google Sites実稼働版、既存Drive配布、Firebase本番DB/Rules/Authを勝手に変更しない。
- ユーザーの「任した」は調査・実装・自動テスト・画面QA・**開発ブランチGitHub保存**の許可。学校稼働版への反映は別途ユーザー操作。

## 最新開発ブランチと現在地
Repo: https://github.com/8mahi8/yokai-battle-lab
Branch: `feat/phase1-action-circle-lab-20261023`
前Phase49の節目commit: `3c25d6573dd0fa1993304557e86bf54ae43ace1e`

### Phase49まで（原作動画を観測済）
- 本人提供の編集済みPvP MP4（約3分36秒）のフレームを確認済み。原作ビデオ素材自体はリポジトリへ転載しない。01:12/01:28の大型必殺カットイン、00:37の円形ピン、良悪とりつき等の観察はタイムコード付きPhase49に記載。
- `engine/combat.mjs` に試合内単調増加`eventId`、`presentation/action-choreography.mjs` に表示専用の3段階タイムライン、`ui/match-stage.mjs` にフィールドアニメ・予備動作中HP保持・命中時の反映。
- キャラの技名を `content/presentation-labels.mjs` へ分離、パッシブスキルの実発火だけを表示、学校Friendsは原作未確定のサボり仮値有効化。
- Phase49独立CI [598/598 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40502497892)。学校SafariのPhase49以降は実機未確認。

### 今回Phase50で実装・GitHub保存
- `ui/battle-cue-sequence.mjs` 新規。ホスト確定`eventId`で複数イベントを抜け落ちなく読む。状態/スキルイベントを偽の攻撃にしない。
- `ui/match-stage.mjs` に表示用FIFO。技・必殺の再生中に次のスナップショットが届いても通常は演出を中断せず、最大4件まで順次再生。
- 大量の取りこぼしを伴う復帰では最後の行動へ視覚的に追いつき、古いHPを「直前HP」として誤用しない。非表示ページの演出キューは破棄。
- `tests/phase50-batched-action-cues.test.mjs` 新規6テスト。**通信・ダメージ・勝敗・妖気計算・固定2600msホストクロックは一切変更していない**。
- 修正途中でPhase48スキル表示QAが落ち、**大量イベント時の古い演出キュー**が原因と判明。最新行動へ同期するよう修正し、画面QAを再成功させた。

## 検証済み事実
- 現開発版で[Research battle unit 604/604成功](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40507882048)＋4seed自然終了＋研究用Chromium戦闘画面QA。
- 現開発版で[Chromium Phase14 Stage QA 成功](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40507882130)。原作動画由来の必殺カットイン/ピン、実発火パッシブ、タッチ等の既存受入を含む。
- [Firebase Emulator + 2実Chrome対戦接続QA 成功](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40507863836)（Phase50の同じ実装コード。後続の文書コミットだけ別）。
- 旧Supabase実通信QAの一部は不安定・失敗。現在の学校Friends版は**Firebase RTDB（認証なし）**であり旧Supabaseテストの成功を学校対戦の条件にしない。
- いずれも**実学校Safari 2台／実Google Sites新版直貼り／本番Firebase write の証明ではない**。本人提供動画との原作フレーム単位一致も未実証。スクリーンショットはActions Artifactsへ出力されるが、今回担当は出力された画像ファイルそのものを手元で開く目視比較までは完了できていない。

## 次担当の優先作業（Phase51〜）
1. 学校Friends版の **固定2600ms自動進行** と技ごとの表示長／ゲスト遅延を計測し、双方の再生キューが長試合でどう推移するかを2 Chrome + Firebase EmulatorでQA。最初から内部時間一致を宣言しない。
2. 攻撃/妖術/とりつき/回復/ガード/サボり/必殺を「誰の、どんな技が、誰に効いたか」動きと命中タイミングで識別できる品質へ。画像を自分で開いて改善。
3. 原作の行動待ちポイント・演出中のサークル回転・対戦相手画面の**表示保留**を外部記録と照合。ノーモーション必殺を独立のボタンで作らない。
4. バージョン付きGoogle Sites用Friends単体HTML/TXT候補を別名で生成・検証・必要ならDriveへ個別保存。実稼働版／main／Firebase Rulesの更新は本人が指定するまで禁止。
5. 報告は「今回した作業／次にする作業／全体設計の場所」、そして自動テストとSafari実機確認を分ける。

重要な参考：[原作PvP動画レビュー](./PHASE49_USER_SUPPLIED_ORIGINAL_PVP_VIDEO_REVIEW_20261027.md)、[Phase44再設計](./PHASE44_ORIGINAL_BATTLE_REBUILD_PLAN_20261027.md)、[Phase50実装](./PHASE50_BATCHED_ACTION_PRESENTATION_GUARD_20261027.md)、[対戦研究者によるノーモーション/行動ポイント](https://note.com/tombow_yw/n/n1e4cf179d2d9)、[MDN Page Visibility](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)。
