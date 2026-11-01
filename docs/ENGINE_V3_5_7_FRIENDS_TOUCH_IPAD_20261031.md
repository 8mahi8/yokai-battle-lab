# 妖怪ウォッチ2｜Engine V3-5-7：学校iPad向けサークル操作・タップ面積の実通信受入（2026-10-31）

## 目的と判断

学校の Google Sites に単体HTMLを貼り、iPad Safariで友達と本当に操作するための **輪回転／敵ピン／必殺／おはらい／零式の指操作** の改善。前V3-5-6で確認した通常編成1試合の放置テンポ（5〜10分以上になり得る）は原作の実秒数と未照合であり、**戦闘時計・AI・能力・原作ルールは変えない**。

学校で起こりやすい「指で円を回そうとしてページがスクロールする」「小さい回転/キャンセルボタンを外す」「回転直後の敵選択が効かない」に限定した。

- [Apple公式のボタン設計](https://developer.apple.com/jp/design/human-interface-guidelines/buttons)：基本的に操作のヒット領域44×44pt以上を目安。ここで44CSS pxは**学校iPadの通常viewport scaleでのおおよその対応であり、Safari実機で確証した実測ではない**。
- [MDN touch-action](https://developer.mozilla.org/ja/docs/Web/CSS/Reference/Properties/touch-action)：ページ側のpanと独自の指ドラッグを競合させないため、対象のサークル領域にのみ `touch-action:none`。**画面全体のスクロールは禁止しない**。
- [原作動画の時刻別観察](./ORIGINAL_PVP_VIDEO_20261027_MATCH01_OF04.md)：対戦中もピン、サークル、チャージが短時間で切り替わる。別録画[Phase49](./PHASE49_USER_SUPPLIED_ORIGINAL_PVP_VIDEO_REVIEW_20261027.md)でも円操作とピンが連続する。**この工程で本人動画MP4の原本は直接視聴していない**。

## 問題の切り分け／実装

1. `lab/yw2-layout.css`：学校向けStageに限定してサークルへ `touch-action:none`、Apple推奨の大きさに沿うようサークル左右回転ボタン・フッターのキャンセル/解除・ジェスチャー中止ボタンの高さを **44px以上**へ。既存`@media(min-width:701px) and (max-height:820px)`が回転ボタンを最小25pxに縮めていた問題を上書き。リサーチ画面・他ゲームには作用しない。
2. `ui/match-stage.mjs`：友達対戦には `mb-friends-stage` class、研究モードのStageには追加しない。これによって共通描画と研究画面の設定を分離し、`createMatchProtocol`の計算や描画ループ・Firebaseはそのまま。
3. `tools/build-sites-online.mjs`：`--friends` の接続ボタン/部屋入力の高さを44pxに、研究`--emulator`とセットアップ版には影響させない。
4. **操作バグの根本修正** `ui/match-stage.mjs`：指でサークルをドラッグした直後のSafari互換クリックを消すための`suppressWheelClick`が、**自分の輪だけでなく相手の輪の妖怪選択タップも460ms間消していた**。Firebase実Chromeテストで`TouchEvent`によるGuest回転後に`B1`→`B2`の正規ACKまで進む一方、直後の敵A2ピンを押しても`B3`にならない再現を確認（[修正前のFirebase試験](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41169819674)）。重複クリック抑止に`suppressWheelSeat`を持ち、**直前に指で回した本人側の輪**からの余分なクリックのみを無視する。敵輪のタップ／原作の「ねらう」に相当する選択は通し、重複回転抑止と460msは維持。タイムアウトを伸ばしたり試験のクリックを遅らせてごまかしていない。

## 検証の明確な区別

- `tools/sites-online-smoke.mjs`：原作と同様のGoogle Sites直接HTML埋込に近い **同一Chromiumで2つの実`srcdoc` iframe＋本物の認証なしFirebase RTDB Emulator**。画面幅 **1024×768、820×620、568×520、390×760** の4条件で、2方向回転、選択解除、通常必殺、おはらい、ピン、中央零式切替、前衛B1・後衛B4の各コマンドの **ヒット領域44×44px以上・要素の中央タップが他要素に遮られない・必要ならスクロールしてアクセス可能** を判定。サークルは `touch-action:none`、それ以外の下画面は`auto`を検査。
- 同じブラウザの既存接続QAで `[data-rotate=1].click()` を**JavaScript`TouchEvent` `touchstart→touchmove(約60°)→touchend`** に置換。Guestの本物の`rotate`→Host承認/両席状態反映と、すぐ次の重複回転の3秒クールダウン拒否、続く敵A2へのピン（以前は消されていた）まで確認する。他の通常/G必殺、おはらい、KO・勝敗・切断後復帰のE2Eは削除しない。
- **Chromium内で合成したTouchEventは学校のiOS実機Safariの物理指操作と同じではない。** 実際のタッチの捕捉・指/ペン・セーフエリア・iPad固有のタッチアクションは未実証。特にGoogle Sitesに実際に貼り付けた画面のサイズ/スクロール/通信は別途人間の試遊を必要とする。

## CI・作業保存

- 修正コードHEAD：`f42c7ea848b35d20d8bb5a968cb673acd76c0b6a`。
- **Node [950/950 SUCCESS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41169963907)**（今回のStage UI変更を含む）。**[Chromium Stage SUCCESS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41170016291)**。
- **[Firebase No-Auth RTDB Emulator実2席＋旧Rules再現＋読み取り専用本番疎通が全工程SUCCESS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41169963805)**：実Chromium 2つの`srcdoc` iframeで、4画面幅の44pxタッチ領域と`touch-action`/中央ヒット検査 → **実TouchEvent円回転のHost+Guest ACK → 即時の敵ピンB3 ACK** → 再クリックのクールダウン拒否 → Host自動進行・再接続の回帰をすべて通した。別シナリオの通常必殺、G、負とりつきのおはらい、通常6vs6、**同一試合の全部入り完走**も**2回連続PASS**。
- ランナーでのFirebase SDK CDN読み込み失敗が**古いコミットの一部試験**（例：[41169764747](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41169764747)）に出た。これはHostが`Firebase SDKが読み込まれていません`と明示して初期化しないケースで、最新コードの実2席回帰は合格。学校のSafariでCDNが確実に読み込まれる保証にはならず、実機確認が必要。
- **学校Google Sites直接HTML、GitHub main、本番Firebase Security Rules/Auth/DB、Google Drive配布物は変更していない**。開発ブランチ `feat/phase1-action-circle-lab-20261023` のみ。

## 次 V3-5-8

実Chromiumのタッチヒット検証が通っても、**iPad Safari実機2台でのスクロール・接続と一試合操作、友達同士の試合時間・原作動画との見た目差は未検証**。次は試遊で本当に起こりやすい操作/表示問題を優先。原作の標準試合時間を映像1本から捏造したり、認証/通信方式を無闇に作り直したりしない。
