# 妖怪ウォッチ2 V3-5-8｜学校Google Sites狭幅での下画面ジェスチャー受け入れ（2026-10-31）

## 結論／進め方

V3-5-7で実装済みの **44pxタップ面積・円回転／敵ピン誤抑止修正・Firebase実2席** は変更しない。今回は、学校のiPad（Safari）上でGoogle Sites HTMLを直接貼ったとき、**縦の短い埋込枠で必殺・G技チャージの下画面が切れる/タップできない危険**を主な未検証として切り分けた。原作忠実な2画面構成を維持し、**戦闘エンジン・HP/妖気/能力/AI・Firebase設定は無変更**。

### 確認資料

- 前工程：[V3-5-7 iPad指操作](./ENGINE_V3_5_7_FRIENDS_TOUCH_IPAD_20261031.md)。Firebase 2席で実TouchEventの円回転・ピン→同一試合のチャージ・G・おはらい・勝敗を検証済み、ただしチャージ中の短いframe高さまでは未検証。
- ソース：`ui/match-stage.mjs` のStage HTMLで`#mb-modal`は**下画面 `mb-lower-screen` の中**、`lab/match-stage.css`の後半で`.mb-yw2 .mb-lower-screen>.mb-modal{position:absolute;inset:0}`、`.mb-yw2 .mb-lower-screen .mb-modal-surface{max-height:100%;overflow-y:auto}`となる。これは同一ファイルの古い全画面用`.mb-modal{position:fixed;inset:0}`をより強い指定で正しく上書きし、原作の**上画面を覆わず下画面内でタッチ操作**する仕様である。
- [WebKit公式：Safari 15.4で`dvh`を追加](https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/)。最初にこの単位を旧Safariリスクと考えたが、**実際の本Stageでは`max-height:100%`が優先される**ため、この`dvh`は問題ではなかった。誤った`100vh`追加CSSと静的試験を即座に撤回し、無用な画面変更を残さず実ブラウザのDOMで確認した。

## V3-5-8で変更したもの

- **実装の主な差分は`tools/sites-online-smoke.mjs`の回帰テストだけ**。Firebase RTDB no-AuthのEmulatorとChromium上の実Google Sites型`srcdoc`2席で、本物のHost正規妖気蓄積→Guest必殺開始の後、Guest frameを`568×320`、`390×360`、`820×390`pxに変更。上画面には干渉せず、モーダルが正確に**下画面内に収まる**か、frameをスクロールした後に`中止`ボタンと光る点を実際に`elementFromPoint`でタップできるかを検査する。最後は通常サイズへ戻し、**同じ試合で6回の実Pointerタッチ→Host/Guestの正規ACK→妖気消費・必殺効果/両画面カットイン**に進む。G技も同じ短枠試験で実施し、既存おはらい・6体KO・勝敗の回帰を維持。
- **誤った中間変更は取り消し**：`lab/yw2-layout.css`へのviewport基準の`max-height:calc(100vh - 30px)`は下画面の仕様とずれるため除去。専用Nodeテストも削除。学校`--friends`のゲーム本体・描画CSSは、**前V3-5-7と同一**。仕様改変や意味のない短期対処を残していない。

## 結果の範囲（検証ログ）

- **Node[950/950 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41177796730)**（前ステップまでの950試験を維持）。
- **実Chromium Stage [PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41177796615)**。
- Firebase RTDB実2席の新3サイズ・通常/G・おはらい・KO結果、および保存した過去Rulesでの再試験はActionsで確認すること。**CIが完了するまでは成功と書かない**。

## 直近の重要な運用リスク（対応は承認事項）

- [GitHubの過去Rules写し](../network/emulator/database.historical-20261022.rules.json) は`now < 1794063600000`（**2026-11-08 00:00 JST**）でアクセスを許可する時限設定。10/22時点の資料であり、**今現在の本番Firebase Security Rulesが同じかは確認できていない**。本番でも同じなら11/8以降に接続不能が起き得る。これは**一般的なセキュリティ強化の提案ではなく、期限切れによる利用不能の具体的リスク**。ユーザーの明示的な許可なく本番Rules/Authを変更しない。既存の実通信テストは**ローカル Emulator**、本番通信チェックは**非破壊のread-only GETのみ**であり、実学校iPadの通信が11/8以降も有効とは証明しない。

## 学校の試遊に必要な最短受け入れ手順

1. **実際の学校Google Sitesで現在貼られているHTML版と、GitHub開発版は別物**。学校のHTMLは本人の明示依頼がない限り更新せず、開発版の修正が自動で学校版に入ったとみなさない。
2. 学校iPad Safari **2台**で6桁部屋作成・参加・両者開始、通常戦闘が自動進行すること、再読込なしで接続が保たれることを確認。
3. 両者で輪を指ドラッグ→すぐ相手の妖怪をピン指定（前回V3-5-7誤抑止の回帰）、標準/零式切替、必殺/Gのチャージ・負とりつき後の後衛おはらいを操作。下画面の中止・光る対象が画面から見切れないか、Google Sites内でスクロール可能か確認。
4. 実戦の**1試合の所要時間**（2.6秒×自動行動ではなく実際の壁時計）・途中停止/通信ズレ・キャラ表示/原作動画との目視差を記録。KO/控え交代/勝敗を双方で確認。学校端末2台はこのAIから実際には操作できないので**実機は未検証**。

## 次

**V3-5-9**：今回の短いGoogle Sites埋込と実2席回帰が通ったら、操作/表示の原作時系列に対する不足点を1つずつ研究で突き止める。学校実機での決定的な問題が優先。原作の時計・キャラ性能を推測だけで変更しない。GitHub開発ブランチとDraft PR #1を維持し、Google Sites稼働HTML、Firebase本番Rules/DB/Auth、main、Drive配布は触らない。
