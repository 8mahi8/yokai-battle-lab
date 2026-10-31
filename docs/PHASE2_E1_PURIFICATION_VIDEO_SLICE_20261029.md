# Phase E1｜原作動画のおはらい操作から下画面完了まで（2026-10-29 JST）

## 最終ゴールと何が実装できたか

本人の目的は、学校iPad Safari・Google Sitesに直接HTMLを貼り付け、**Firebase Realtime Database認証なしFriends**の1vs1で、原作『妖怪ウォッチ2』の動画と同様のルール・操作・上下画面・戦術が動くこと。研究ファイルや単独のテスト数の増加はゴールではない。

一次観察の既存記録 [MATCH01第二巡](./MATCH01_SECOND_PASS_INPUT_AND_TIMELINE_20261027.md) には、第1試合の **00:15–00:20：下画面紫「連打！」→「おはらい完了！」→サークル**の遷移がある。上画面はフィールドと状態変化を継続表示。**そのパネルが必ずおはらい操作か、連打の閾値が14なのか、完了テキストの正確な秒数は動画から未確定**。以前送付された元MP4実体には今工程で直接再アクセスできていない。録画フレームを再視聴したとは言わない。

## 既存の実装を確認し、重複開発を避けた

- Phase51で既に `ui/match-stage.mjs` の`#mb-modal`は`.mb-lower-screen`内に移動し、`lab/match-stage.css`の固有セレクターで `position:absolute`になっていた。**上画面を覆わないための修正は今回新規の発明ではなく既存を再利用した**。
- `engine/combat.mjs`は既に `beginPurify` → `purifyInput` → `statuses.purify` の実ホスト処理と`type:'purification', side,targetId,kind,removed`イベントを持っていた。原作に根拠のない新しい解除・乱数・妖気効果を作らない。

## 今回のゲームへの変更

1. `ui/match-stage.mjs`：**直近に新たに届いた、本人座席の実ホスト`purification`イベントで`removed.length>0`の場合だけ**、下画面の`#mb-purify-complete`に「おはらい完了！」と対象妖怪の状態解除メッセージを表示。部分入力のACK／開始成功／キャンセルは完了とみなさない。
2. 1.15秒で下画面の完了表示を隠し、元のサークルに戻る（**表示時間は研究用仮値、原作確定値ではない**）。上画面には手を触れない。途中で新しいジェスチャーが始まったり試合が終了したら完了表示を消す。
3. 認証なしFriendsでゲストが後からjoinして古いsnapshotを受け取っても、**初期時点の過去イベントは再生しない**。同じ通知の再送/反復描画でも重複しない。別の固定座席では他人の完了表示は出さない。座席切替／destroy時は表示タイマーを掃除。
4. `lab/match-stage.css`は`.mb-yw2 .mb-lower-screen > .mb-purify-complete`限定で紫系の短い完了演出。背景が下画面からはみ出さず、上画面フィールド/HP/戦闘の描画を妨げない。Reduced motionでアニメーションを抑止。

## 実ホストと実ブラウザの再現テスト

- `lab/match-stage.html?review=purify-e1` **開発ラボ限定**：原作再現の数値と混同しないよう実ホストの**後衛A4にテスト用の悪いとりつき`sleep`を研究APIで一回だけ設置**。これ自体はFriends本番へ入らない。
- 実際のUI「おはらい」→後衛A4選択→`beginPurify`→タッチpadへPointerEventを**13回**入力し、未解除・完了表示なしを確認。途中でホストの`step()`を発行して上画面が可視のまま下画面の入力を維持。**14回目の本物のタッチ**で`purifyInput`が`removed`を返してホストイベントを発行、負の状態が実際に消えた後だけ本人側の完了表示。時間経過でサークル復帰。
- 独立のプレイヤーB表示コンポーネントへ正規snapshotを渡しても**相手側にAの完了が出ない**、あとから参加するA画面で**過去の完了が再生されない**ことも実Chromiumで検証。
- `tools/stage-smoke.mjs`で上記の最終表示`#lab-state`を厳密DOM照合。テストのJSソースにPASS文字があるだけでは合格しない。
- **同一コード `25e7cca159`** [実Chromium Stage E1含め**SUCCESS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40783539449) 、 [Node**694/694**・レンタル6体自然戦闘耐久・研究Chromium**SUCCESS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40783539494)。
- **Firebase Friends現行UIコードに対して** [認証なしRTDB 24実行動 + 2-frame Google Sites相当のChromium（入室、ACK、ピン、切断復帰）**SUCCESS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40782778031)。これは本来の`purification`イベントを実Firebaseの2-frameで再現したテストではない。**E1の状態解除はホスト＋ブラウザ同一ページ実テスト**、Friendsは別の正規通信回帰。この二つを合体した試験として嘘をつかない。

## QAで見つかった古い欠陥も修正

厳密に`#result`を照合する検証へ変えた結果、古いStage QAが偽FAIL/偽PASSになり得た：
- 妖怪のSVGは12体メダル＋前衛6体の計18枚。旧テストはページ全体で12枚と数えていた → パネル別に12と6を検査。
- 現行上下2画面レイアウトでメダルSVGは約30–42pxなのに、旧テストは40px以上固定 → レスポンシブ基準へ。
- タッチ回転UIを検査するラボテストが、原作風の**ホスト3秒クールダウン**に連続で引っかかっていた → `?review=stage-gesture-lab`の**研究用ラボ限定**で`rotationCooldownMs:0`、実Firebase Friends標準の3秒制約は維持。
- 画面の実`<strong id=result>`は「`STAGE-PASS 詳細文字列`」なのに、旧テストで`STAGE-PASS`に完全一致を要求していた → 実結果のみの詳細付きPrefix照合に修正。
- 途中で変数`notice`が既存パッシブ通知と重複したため一度SyntaxError、直ちに`purifyNotice`へ修正してNode/ブラウザの回帰を最終合格。**中間コミットのCI失敗は消していない**。

## 未完と次工程

1. **本番Google Sites稼働版・main・本番Firebase Rules/DB・Drive配布物は変更しない**。学校iPad Safari2端末の最新UI試験は未実施。
2. 原作の真の連打閾値14／完了表示1.15秒は未実証、試験用数値であり原作再現率に加算しない。
3. 次のE1-Bは**実Firebase2席の片方の戦闘で合法に負のとりつきのある後衛を用意**して、実ゲスト`purifyStart`/連打`purifyInput`をホストがACKし、本人だけに完了が届くまで縦に証明する。ゲーム本体/学校版への非公式チート・状態注入を導入せず、テスト用ホストシードと状態生成を工夫する。もし準備が確定しなければ観測を保留する。
4. その次は第1試合00:32–00:38の`ねらう/つつく`上下照準同期、00:40–00:52の必殺→カットイン→ヒット列。原作動画の未確証の命中数や個別モーションは決め打ちしない。
