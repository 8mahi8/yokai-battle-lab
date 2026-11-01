# Phase46｜行動イベントID＋実戦シーンの「予備動作→命中→戻り」縦切り

**狙い**：原作内部コードの一致でなく、妖怪ウォッチ2らしい見た目・操作感・システム・読み合いを再現する。Phase45で分離した「表示だけを決める基盤」を、学校向けと同じ戦闘レンダラーに接続する。**学校の公開Google Sites版・既存Driveファイル・main/Firebaseデータは変更しない**。

## 変更点
- `engine/combat.mjs`：スナップショットの全イベントに**試合内単調増加 `eventId`**を付与。固定80件の過去ログ窓がスクロールしてもIDは変わらない。乱数・ダメージ・ターン順/ホスト権威には一切触れない。
- `ui/battle-vfx.mjs`：基本行動・必殺・つつくのキューキーは `eventId` に基づく（過去のスナップショットには従来のフォールバックを残す）。二重再生を防ぐための描画キーであり、コマンドリプレイの処理ではない。
- `ui/match-stage.mjs`：`presentation/action-choreography.mjs` を実際の正規イベントに接続。`anticipation`（予備動作）→`impact`（攻撃・回復・状態変化）→`recovery`（元の位置へ）の3段階に分けて再生。旧式の画一的約1.9秒タイマーを置換。動作時間は `presentation/action-catalog.mjs` にある技カテゴリごとの**試遊仮値**。
- ダメージ・回復の対象については、**直前に画面で見えていたHPを予備動作の間保持**し、命中/発動フレームで正規スナップショットのHPを表示。ゲーム内部のHPを巻き戻したりダメージを再計算したりしない。メダルサークルとフィールドの両方に適用。
- ホスト/ゲスト両側で同じ確定イベントを見るだけ。通信プロトコル/Firebaseルールに演出用の制御命令を追加しない。
- `lab/yw2-layout.css`：攻撃・攻撃妖術・回復・とりつき・ガード・サボりを異なるモーションで表現。技と命中時は原作らしい区別を優先。とりつきはダメージ用ののけぞりと区別して専用状態表示。視覚運動を減らすOS設定は尊重。
- `document.hidden` になった際は**演出を廃棄して正規状態へ復帰**。ブラウザの停止された演出タイマーから古いHPや技を再生しない。MDNによると非表示タブ/iframeでは`requestAnimationFrame`が停止・timer遅延がありうるため、`performance.now` から画面再生位置を算出。
- `lab/match-stage.html?review=action-motion` と `tools/stage-smoke.mjs`：**実際の研究エンジンで進めた最初の行動**を、1024×768スクリーンショットの予備動作/命中表示として保存する。偽の対戦結果やダメージを注入しない。

## 検証
- `tests/phase46-event-identity.test.mjs`：長試合で80件窓がずれてもID安定、同じ特殊/つつくを再描画しない、効果種別の一貫性。
- `tools/stage-smoke.mjs`：実Chromiumで正規の1行動が**予備動作から始まる**こと、事前にダメージ数字が出ていないこと、既存のTouchEvent/PointerEvent/中央零式操作が生きていること。
- `tests/action-choreography.test.mjs`：表示のみの計画であり、判定・妖気・勝敗を変えない。
- **限界**：見た目の動きと秒数はあくまで試遊プロトタイプ。原作と比較した細かいモーションや実時間の録画測定は今後行う。2.6秒一定のホスト自動行動進行はそのままであり、**原作どおりの可変行動時間への移行は今回未達**。本番Safari旧iPad2台で新版を試していない。

## 参考にした外部資料
- 原作 [Game8 バトルシステム](https://game8.jp/youkai-watch2/505163)、競技者 [たくトンボ：対戦のモーションとサークルの読み合い](https://note.com/tombow_yw/n/n1e4cf179d2d9)
- [Game Programming Patterns / Event Queue](https://gameprogrammingpatterns.com/event-queue.html)（表示通知とルール処理を分離する、ただし大規模バスは不用）。
- [MDN / rAF](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)、[MDN / Page Visibility](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)。

## 次工程
1. 実ブラウザ画像を確認し、セリフ・効果マーカー・アニメ姿勢・HP更新を視覚レビュー。
2. 正規イベント表示の途中へFirebaseスナップショットが届くとき、過去の行動に戻らない／一方の画面だけ重ならないことを確認。
3. 現在の`2.6秒/一律tick`を修正して原作の行動進行と表示がより一致するよう計測する。
4. キャラ/技マスターデータの個別アニメ設定・状態異常表示・必殺技を強化。
5. それらが安定して初めて学校Google Sites貼付用の新しい別名版を用意する。


## 実施後の独立受入（2026-10-27 夜）
- [Phase46 専用 GitHub Actions #40490152340](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40490152340) **SUCCESS**。
- Nodeの全**589/589件PASS**、6体戦4seed自然終了、実Chromium操作/日本語画面QA PASS、攻撃準備と効果後の**1024×768実画像**を保存、Firebase Friends no-Authの直接Google Sites埋め込み単体ビルドを検証。
- [サークル操作＋画面QA #40489675531](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40489675531)もSUCCESS。既存Firebaseエミュレータ Chrome QAは[別CI #40489666125](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40489666125)にてSUCCESS。
- **スクリーンショット目視**：当初の中央「とりつく」表示が行動者とターゲットの上にかぶることを発見。左端の空き領域へ移し、命中失敗時は「MISS」で成功状態演出を出さないよう共通化、Chromium再撮影で重なり解消を確認。
- 研究用既存総合CIが一時失敗した例では、**589件は全件通っていたが別のlegacy Chrome browser-smokeがDBus/zygote起動タイムアウト**。よって「全ワークフロー成功」とは書かず、独立Phase46受入PASSを記録。
- **現在は開発ブランチの成果。** Google Sites貼り付け用新しいV4は**ビルド検査だけ**で配布保存していない。ユーザー学校サイト、Drive V3、GitHub main、本番Firebase Rule/DBも変更していない。
