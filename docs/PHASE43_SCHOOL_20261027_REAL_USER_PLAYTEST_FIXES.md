# Phase43｜10月27日学校2人実機試遊・Safari操作/戦闘視認性改善

## 実機フィードバック（本日ユーザー本人による、開発者の機械テストではない）
**初めてGoogle Sites埋め込みで友達と対戦できた**。すなわち旧Firebase Friends V2の実学校ネット接続導線は動作。ただし重大な改善点：
1. iPadでサークルを指で回せない（左右ボタンしか使えなかった）
2. 妖怪が何をしているか全然分からない。もっと長い行動モーションと遅いテンポが必要
3. 零式切替は原作同様サークル中央ボタン
4. 攻撃ばかり見える。性格・行動傾向と行動の見え方を確認
5. 妖気の増加が遅すぎる。原作らしい溜まり方を研究し、暫定改善

## 原作ソースと確証区分
- [レベルファイブ公式・妖怪ウォッチ2の戦闘](https://www.youkai-watch.jp/yw2/game/game06.html)（基本戦闘、零式、Gわざ）
- [攻略の虎・原作零式](https://toragame.com/youkai2/chart/06.php)（**サークル中央丸い部分に触れる**と標準/零式を切り替え）
- [攻略大百科・妖怪ウォッチ2性格](https://gamepedia.jp/youkai-yw2/archives/1454)、[Game8性格](https://game8.jp/youkai-watch2/503411)（荒くれは物理、ずのう的は攻撃妖術、情け深いは回復、非道は妨害、動じないはガード等に**傾向**。原作の具体的選択確率は未証明）
- [Game8妖気ゲージ](https://game8.jp/youkai-watch2/504498)、[攻略大百科必殺](https://gamepedia.jp/youkai-yw2/archives/1482)（原作では妖気が**戦闘中に自然に溜まる**、ランク/技/相手状態/固有スキル/魂が影響。コードの+18は本人試遊向け仮値で**原作の正確な内部値ではない**）
- 公式アニメーション秒数・画面表示フレームは**未測定**。以下の2.6秒/1.9秒/2.3秒は本日の操作性フィードバックによる初回試遊調整。

## 実装したこと（学校Friends経路）
- `ui/match-stage.mjs`: 指のTouchEvents専用ルート(`touchstart`/`touchmove`/`touchend`/`touchcancel` passive:false)を追加。ペン/マウスPointerEventは維持。回転ジェスチャ中、メダルDOMを一切作り直さない（Firebaseからのスナップショットが来てもタッチイベントのターゲット喪失を防ぐ）。完了時だけホスト認可の`rotate`を送信。タップ、指キャンセル、指複数は回転しない。
- `lab/yw2-layout.css`: メダルボタンを含むサークルの`touch-action:none`（共通`button{touch-action:manipulation}`に勝つ詳細セレクタ）、タッチ長押し選択を禁止、リングだけのプレビュー。
- サークル中央の固定「輪」装飾を、**標準↔零式の実ボタン**に変更。四隅の`わざ/Gわざ`と`ねらう/つつく`も従来のホストコマンドで同期。旧別置ボタンは隠すがIDを保持（旧QA互換）。UI中央に日本語の現在モードを表示。
- 同`ui/match-stage.mjs`: 行動者・行動種別・対象・数字をバトルフィールド中央で大きく表示（通常行動用）。必殺専用カットイン中はこの表示を**重ねない**。モーションは通常1900ms、必殺2300ms、CSS約1650msまで可視化、タイムアウト後に表示を消す。
- `lab/sites-embed-online-entry.mjs`: **学校用ホストのみ1500ms→2600ms**で進む。原作時刻とは断言しない。サンドボックス・旧研究の標準クロックは変更なし。
- `engine/playtest-soul-tuning.mjs`: 友達用の攻撃・攻撃妖術の妖気付与を**+8→+18**に増やした。原作の自然回復の正確な方式は未再現、今後の調査対象。非攻撃本人+5とつつく999暫定0.1%は維持。
- `engine/combat.mjs`,`engine/selection.mjs`: 元の研究用レンタルfixtureはそのまま維持し、**playtestSoulTuning:trueだけ**でレンタル6体の行動重みを物理/回復/防御/妖術/回復/とりつきに分け、原作の性格傾向を反映（厳密確率ではない）。ずのう的/非道の傾向補正分岐を追加。2人が同一チームの公正さを保持。
- 開発段階で描画結果を実画像チェックし、カットインと行動表記の重複が発生したため別々にする修正も反映。

## 根本原因・検証の意味
ブラウザ2画面の実戦中は戦況の更新で`#mb-team*`のinnerHTMLが頻繁に入れ替わる。旧`pointerdown`→`pointermove`の途中でiPad指ターゲットが消滅し、ブラウザ独自のスクロール/タッチ取消にも弱かった。新方式は両方を対策。
- [Phase14 browser QA](https://github.com/8mahi8/yokai-battle-lab/actions/workflows/phase14-stage-qa.yml)：実ChromiumでペンPointerEventsだけでなく、**ネイティブTouchEventを組み立てて触る→途中でUI再描画→離す→ちょうど1回の原作回転**を確認。センター実ボタンとGわざ表示も確認。
- [Research battle unit tests](https://github.com/8mahi8/yokai-battle-lab/actions/workflows/research-tests.yml)：戦闘/通信プロトコル回帰、原作値の認定ではない。
- [Phase14 Firebase two-iframe emulator QA](https://github.com/8mahi8/yokai-battle-lab/actions)：ルーム参加/ゲスト入力/ACK/一時停止復帰の実Chromium確認。
- **残る不確実性**：この修正版の学校の旧iPad Safari端末2台＋現場Google Sites実機テストは未実施。ChromiumのTouchEventエミュレーションが実Safariを100%保証しない。さらに行動タイミングは原作の録画フレーム解析が必要。

## 今後の研究
原作の戦闘テンポを録画から測定、個別技モーションを長短分けて見せる、妖気の自然蓄積/ランク差/とりつき対象ボーナス等を実証する。次の校内試遊で「輪ドラッグ」「中央零式」「防御/とりつき/回復/妖術」「約2.6秒ごとの更新」「妖気が溜まる感覚」を再評価して微調整する。原作再現前の別ゲーム化はしない。

## V3 リリース受け入れと Google Drive 実保存
- **Google Sitesに貼るTXT**: https://drive.google.com/file/d/15nuR52ZJSxEyuA09gW8MPOmhPBePuidu/view?usp=drivesdk
- **同一内容のHTML**: https://drive.google.com/file/d/1MSvwv8HGbFCLPggbrN-nLMXkmk7jPOQ9/view?usp=drivesdk
- 保存先: https://drive.google.com/drive/folders/1xgKahjwoESrIam0JnbqUYivEQ2vyqiXO （既存V1/V2を残した）。
- [Phase43最終 CI #40422630040](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40422630040) **SUCCESS**。576/576戦闘回帰、レンタル6体4seed自然決着、実ChromiumでTouchEvent/ペン・中央切替・途中DOM再描画のテスト、Google Sites用の単体HTML生成と配置/依存検査まで通過。
- 生成実物のTXT/HTMLそれぞれ**196810バイト**、ZIP展開前/後の実バイト同一、SHA256 `254e2eb80b4b654d9754cd7eb7fc1e3878b6bc6039d717b65e4ed36e4341f0da`。Git Blob SHA `4f60c3fb77f22a2ef1260788126170c595cb47a9`。Google Driveに別ファイルで保存し、両方のサイズ・MIME (`text/plain`/`text/html`)・親フォルダをDriveから読み戻し確認。
- 固定リリースブランチ: `release/sites-firebase-friends-20261027-v3-touch-tempo`。
- **これをGoogle Sites「埋め込む→コード」に貼るまでは、旧Google Sites版が表示されたまま**。既存サイトのHTMLや本番Firebaseルール・データ、GitHub main は変更していない。
- V3を本人と友人が学校のiPad2台で実機再テストした結果は**未到着**。Chromeの擬似TouchEvent成功は旧Safariの完全な実機保証ではない。

