# Phase 2.2｜必殺「対象数≠ヒット数」：本家対戦動画からの逐次表示基盤

2026-10-28｜学校向け最新開発ブランチ `feat/phase1-action-circle-lab-20261023`

## 目的：本家の「カットイン→戦闘場へ復帰→対象ごとの結果表示」を遊べる形へ
本人は**送付済み原作対戦動画のように『妖怪ウォッチ2』で友達と戦えること**を最上位の完成定義に指定。第1試合の既存実フレーム監査 [`MATCH01_SECOND_PASS_INPUT_AND_TIMELINE_20261027.md`](./MATCH01_SECOND_PASS_INPUT_AND_TIMELINE_20261027.md) では **00:44〜00:46カットイン→00:47〜00:51複数の数字と対象が時刻をずらして表示**。ただし今ターン原本MP4はアクセス・再視聴できていない。既存の本人提供動画レビューは一次観察の**過去記録**であり、ヒット数の実測証明とは別。

## 2026-10-28 新たに照合した外部資料

| 技（原作のキャラクター） | ターゲット | 連撃数 | 根拠・制約 |
| --- | --- | --- | --- |
| ジバニャン「ひゃくれつ肉球」 | 敵全体 | **外部資料に20×7と20×5の食い違い** | [Mt. Wildwood YW2日本語版](https://mtwildwood.net/ja/yw2/yokai/jibanyan)・[英語版](https://mtwildwood.net/yw2/yokai/jibanyan)は20×7と各hit式を掲載。一方、[攻略大百科 YW2](https://gamepedia.jp/youkai-yw2/specials/3961)と[Yo-kai Watch Fandom YW2](https://yokaiwatch.fandom.com/wiki/Jibanyan)は20×5と記載。**どちらが正しいか断定しない**。5/7を現在のオリジナル6体に転用しない |
| トホホギス「トホホの砲」 | 敵全体 | 30×1と記載 | [攻略大百科 YW2](https://gamepedia.jp/youkai-yw2/specials/3826)は「30×1・敵全体・素早さDOWN」。複数の対象が表示されても、技自体は1回攻撃の例。元動画記録は00:59〜01:05カットイン→複数人への素早さ低下演出 |
| ユーザーゲームのレンタル6体の攻撃必殺 | `enemy_front`または`single_enemy`、技固有 | **全てunknown** | [`content/rental-soultimate-moves.mjs`](../content/rental-soultimate-moves.mjs)の`hitPattern: {type:'unknown',count:null}`を維持。効果・威力も`fixture`で、本家キャラの数値を直接流用しない |

※ WEBサイトの攻略テーブル同士の一致だけではゲーム内部のヒット抽選/各対象への配分/映像の時間差まで証明できない。対象3人の一括効果と、対象1人への3連続攻撃と、対象3人への7回抽選を区別する。

## 今回の実装範囲（プレゼンテーション専用）
1. `presentation/action-choreography.mjs` の `choreographyFrame()`：既存ホスト`special`イベントの`impacts`から、表示用の`specialTargetIndex`・`currentSpecialImpact`・`nextSpecialImpactAtMs`を算出。**既存`hitIndex/currentHit`とは別フィールド**。可視対象は順番にひとつずつとし、同一impact区間を均等に区切る。時間は**試遊用の仮設定**で、原作3DSの秒数・対象命中順とはまだ主張しない。ホスト結果・ダメージは変えない。
2. `ui/match-stage.mjs`：同じプレゼン時刻に従って両メダルと上画面の対象へ一つの結果を浮かべ、ターゲットが変わるとレンダーキャッシュを更新。前の戦闘状態を持つ場合は未表示対象のHPを一時的に保持し、表示タイミングで新HPへ移す。**ホストSnapshot/勝敗結果はすでに確定済み**で、演出が実ダメージを順次発生させるわけではない。
3. `tests/phase2-2-soultimate-target-vs-hit-timeline.test.mjs`：実ホスト`createCombat`が発動したA1の`special`を取得→`latestBattleCue`→`planActionChoreography`→全3ターゲットの連続表示を検証し、`hitResults=[]`・`hitIndex=null`・原作未確定`hitPattern`維持を確認。MISS・単対象・ゼロ対象・時間境界・不変性も検証。
4. コードとテストはすべて**開発ブランチのみ**。本番のGoogle Sites、main、Firebase Rules/DB、Drive配布に変更なし。

## 完了した回帰テスト
- [Node 680件中680件 PASS + 自然レンタル試合耐久](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40706955174)
- [実Chromium一般Stage／ジェスチャー／勝敗QA PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40706955093)
- **確認していないこと**：実Safari 2台、Friends学校埋込の今回変更後の独立2端末試験、必殺の現物ターゲット時間差を実Chrome画面録画した直接QA、元動画の全コマhit確定。上記のChromium一般回帰がPASSでも特定の多対象タイムラインを全フレームで目視したとは扱わない。

## 次の受入ゲート
- 本家動画の同じ種類の必殺について、各対象ごと・各hitごとの数字と効果の**観察された順番**を細かく分離。元映像に写らない画面外ダメージや乱数は推定で補わない。
- 実ホスト必殺に `SoultimateOutcome`型の**原作ルールに確証ある一撃ごとhit ledger**ができたら、`specialTargetIndex`とは独立した`specialHitIndex`を増設。現在の3ターゲット表示＝3ヒットと置換しない。とりつく・ダメージ＋状態は効果適用順の根拠も研究する。
- 実Chromiumで同じ必殺の`impact`初回→中間→最後の実画面3枚を採取、本人提供動画の対応場面と目視比較。モデル値の対戦テンポも本家に合わせていく。
