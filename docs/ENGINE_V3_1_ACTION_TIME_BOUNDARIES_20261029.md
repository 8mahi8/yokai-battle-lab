# 妖怪対戦 Engine V3-1｜行動ポイント/入力時間/表示時間の共通化（2026-10-29）

## 位置づけ
**V3-0の既定の戦闘結果/6対6/API/Firebase Friendsを固定したうえで、V3-1の最初の実装を実施。V3全体、状態所有の一元化、共通Effect pipelineの完了ではない。**

ユーザーが優先を求めたのは「一技ずつの再現」ではなく「拡張可能な原作ベースの戦闘エンジン」。原作の未確証な行動順・演出タイミングをこの工程で推測して直すのではなく、**数値の根拠と実行の責務を分離**して次の研究/置換ができる状態へ進める。個別の新技/キャラ/原作演出専用機能は追加しない。

## 外部資料照合（本家3DS版と区別）
1. [Mt. Wildwood / Turn Order（YW2 94行のSpeed表）](https://www.mtwildwood.net/turn-order.php?g=yw2)：前衛のwait counterが低い妖怪が行動、行動後は行動wait×Speed weight、交換で前衛へ出た妖怪は3×Speed weight。**ただし同値時の優先順位、特定スキル発生時の例外、動画内の視覚フレームはこの表だけでは確定しない**。現行`phase1.mjs`の表と関数をこの工程では変えない。
2. [たくトンボ｜妖怪ウォッチ2対戦の基礎テクニック](https://note.com/tombow_yw/n/n1e4cf179d2d9)：サークル入力が**相手側の表示に即時反映されず**、モーション後に初めて反映され得る（ノーモーション必殺の背景）。また行動ポイントによる先後を説明。ただし記事自体が初期前衛やFlashの係数に未確実性を記載。**表示を止めるms/フレーム値や対戦特有の割り込み順序を作り込まない**。
3. [LEVEL-5公式『妖怪とバトル』](https://www.youkai-watch.jp/yw2/game/game06.html)：ウォッチ零式、Gわざ/チャージ、つつくの操作根拠。公式画面だけでホスト時間と行動ポイントを同一視する根拠にはならない。
4. [Apple GameplayKit / Entity & Component guide](https://developer.apple.com/library/archive/documentation/General/Conceptual/GameplayKit_Guide/EntityComponent.html)：シミュレーション更新と画面描画の責務分離の外部設計参考。**iPadでGameplayKit等のネイティブエンジンを導入するという意味ではない**。

## 実装差分（開発ブランチだけ）
- `engine/action-timeline-core.mjs` を新設。**`advanceLogicalAction(active,{actionWait,openingPriority})`という一つの待ちポイント遷移器**。実際の行動と予測の両方が、最低waitの抽出→全前衛wait減算→同値順の選択→opt-inのFlash優先/skip処理→次waitのセット→opt-in commitを同じコードで行う。`validateActionWait`も集約。通常AI stepにブラウザ時刻を渡さない。
- `engine/phase1.mjs` は`step`・`predict(5)`の重複した行動ポイント計算を削除し、上記共通関数をそれぞれ使用。`predict`は独立コピーだけを進め、現行本戦の状態・乱数・時計を変更しない。もとの順番で`step`がaction counterを増やす。従来の`waitCostFromSpeed`/初期乱数・サークル交換の待ち方は**一切変更なし**。
- `engine/core-time-domains.mjs` を新設：
  - `logical-action-points`＝`clock.turn/pointsElapsed`（待ちポイント。ミリ秒ではない）。
  - `trusted-host-monotonic-ms`＝任意のプレイヤーサークル入力にだけホスト側で取る時刻（現行の3秒制限用）。
  - `presentation-ms`＝モーション表示をブロック/解放する研究用時計。**行動ポイントとは変換しない**。
  - `inspectCoreTimeDomains`＝readonly診断projection。戦闘phaseは`battle-active`/`touch-active`/`finished`の非権威的な診断ラベルで、今の原作phase遷移を実装済みとは言わない。
- `engine/match-protocol.mjs`のサークル入力時間取得を`sampleHostInputMs`へ移管。**ホストでだけ**時刻を取得し、重複ACK・不正seat・sequence gap/loopでは時刻を取り直さない。以前と同じホストtimeがjournalに入り、再実行できる。`inspectTimeDomains()`をデバッグ専用APIとして追加。ただし**`snapshot()`形式・version・hash・Firebaseの通信形式・公開HTMLを一切変更しない**。
- `.github/workflows/phase37-firebase-friends.yml`で`engine/**`を自動監視。共通エンジンのどの新しいファイルも変更の都度、**認証なしFirebase Friendsの本物の2 iframe / RTDB emulator回帰**を起動する。旧Supabase/Auth workflowを再有効化していない。

## 本家再現に関する厳密な区別
| カテゴリ | 現状 |
|---|---|
| 6前衛の待ちポイント方式 | Mt.Wildwood資料に合致する基本コンセプト。本工程は挙動の保存と統合 |
| 初期waitの乱数、Speed表 | 現行YW2資料ベース。ただし今工程では新規の表全体再検証なし |
| 行動wait=3や交換後wait | 原作資料に根拠あり。ただし全ての技や例外に適用できるわけではない |
| 同じwait時の両側優先 | **現行テスト固定の規約。原作未証明** |
| 回転後3秒の待ち | 現行のプレイ用ルール。正確な3DS内部frame origin未確証 |
| モーション中の敵視点遅延 | 実戦資料と動画に根拠あり。現在の研究presentation機能と実際のFirebase Friendsの視界が完全一致したわけではない |
| `inspectTimeDomains()` | **開発用の診断契約。権威的な時間やアニメーション同期機構ではない** |

## 検証証拠
- `tests/action-timeline-core-v3.test.mjs`：同値tie、純粋論理ポイント、研究優先行動、12行動×4seedの実行/予測一致・非破壊。
- `tests/core-time-domains-v3.test.mjs`：3種の時計の分離、プレゼン研究時間、touch状態、ホストしか入力時刻を取得しないこと、invalid host clock/重複ACK、ネットワークsnapshot/hash維持。
- V3-0の既存互換テストはそのまま。**Node全705件PASS** [GitHub Actions 40836091285](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40836091285)、[本物ChromiumのStage/タッチ/おはらいPASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40836091245)、[Firebase Friends no-Auth 2画面の通信・同期PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40836040888)。最後の通信CIは同じ実コードだが、追加テストファイルより前のコミット`94aec8db63`を検証した。CIの`engine/**`変更時自動実行範囲拡大も別途確認。
- Chromium合格は学校実機Safari2台/学校ネットワーク合格と同義でない。

## 次のV3-1へ必要な作業
1. **正規state owner API**：wheel/HP/status/Soul/pending action/winnerの変更を厳格な1-ownerからのみ行うよう既存`createCombat`と各subsystemのアクセス境界を整理。途中は旧ホスト/新ホストで同じseed＋コマンドのhashと全勝敗までのトレースが合うことをゲートにする。
2. **ActionIntent・Effect pipeline**：攻撃・妖術・とりつき・必殺技・つつく・guard/KO/スキルhookを増やしても、キャラ固有のifを巨大な`combat.mjs`へ追加しない構造へ。これはまだ未完成。順序の未確定は原作研究が揃うまで`unknown`として記録。
3. **対戦視点の遅延**：原作モーションに連動する`seatVisibleState`と正規stateの分離を、2人の実入力列で比較。ノーモーション専用ハックは作らない。
4. このあとデータで妖怪/技を追加しやすくする。**先にエンジンを整えてから追加**。学校版・main・本番Firebase Rules/DB・Driveは本人の依頼があるまで未変更。

**この工程で「V3エンジン完成」とは呼ばない。V3-1のタイムドメイン/行動順共通化が完了、正規state ownerとEffectは次工程。**
