# Phase 2.2B-2｜必殺技の「1発ずつ」を実ホストの結果として動かす研究基盤

記録日 2026-10-29（JST）／開発ブランチ `feat/phase1-action-circle-lab-20261023`。**学校公開Google Sites版・main・本番Firebase・配布済Google Driveは一切変更しない。**

## 本人からの最上位基準

本人の元録画と同様に、友達と遊べる『妖怪ウォッチ2』PvP体験を目標とする。**本工程は必殺の命中処理の技術的な縦切りであって、本家の再現完成ではない**。以前送付されたMP4の実フレームにはこの作業では再アクセスできていない。既存のタイムコード付き一次観察記録 [第1試合第二巡](./MATCH01_SECOND_PASS_INPUT_AND_TIMELINE_20261027.md) が示す「ひゃくれつ肉球：00:44–00:46カットイン→00:47–00:51複数のダメージ数字」とブラウザ版を今後同一場面で比較する。

## 原作資料の照合と実装の境界

- [Mt. Wildwood / YW2 ジバニャン「Paws of Fury」](https://mtwildwood.net/yw2/yokai/jibanyan)：20×7、各打で`(Power+Strength÷Hits)÷2−Defense÷4`、命中・会心・ばらつきの個別説明あり。
- [攻略大百科 / YW2 必殺「ひゃくれつ肉球」](https://gamepedia.jp/youkai-yw2/specials/3961)、[昔からの日本語YW2リスト](https://enjoi.sakura.ne.jp/youkai-watch2/youkai_list4.html)：20×5と記載。**技の5/7矛盾未決着**。古い作品/強化版/別妖怪の技を混在させず、確定したものとして学校レンタル6体にコピーしない。
- 3DS原作の各打の命中RNG・相手1体への連撃か全体への打撃配分・状態付与の適用順・カットイン秒数は実映像＋本家データで未実証。既存`engine/damage-model.mjs` と `engine/hit-model.mjs`はYW2 Wikiの**研究式**であり、ここでの3連撃は**完全にカスタム用fixture**。

## 今回実装したコード

1. `engine/combat.mjs`に **`researchSoultimateHitCount`**（nullが既定、2～9の明示整数）の実験設定を追加。**任意の追加数値を学校レンタルへ黙って適用しないため、`teams`でカスタム6×2編成を明示し、`researchSpecialEffects:true`／`researchDamageModel:true`を指定した場合のみ許可**。学校版・既存戦闘・既存必殺は全て既定nullで結果変更なし。
2. 上の研究設定で実際の`kind:'damage'`の必殺が発動すると、`calculateOneHit`・`yw2HitProbability`・`yw2CriticalProbability`を共有し、**1発ごとに本当にホストのHPへ`applyDirectDamage`**。命中MISS・会心・ガード・既存ラストスタンド・チャージ中断・KO以後残りhitの省略を既存ホスト関数につなぐ。`researchSoultimateHits`に`sequence,targetId,targetSequence,hit,critical,damage,hpBefore,hpAfter`を記録。まとめる1対象の`impact.amount/hpAfter`は、個別hitによる実HP結果から求める。**本家のHit数や確率を実証したものではない**。
3. 新`contracts/soultimate-hit-ledger-v1.mjs`：上の実ホスト出力から**別のhit台帳**を検証/凍結して表示へ渡す。直前の`soultimate-impact-ledger-v1.mjs`（対象ごとの集計・状態効果）と混ぜない。hitごとのHP連続性、MISS時0ダメージ、KO後の未発動hit禁止、対象HPに整合する合計、**KOしていない対象で予定hit数を減らせないこと**を検査。不正改ざんを拒否。
4. `ui/match-stage.mjs`→`ui/battle-vfx.mjs`→`presentation/action-choreography.mjs`：`specialHitLedger`を、既存の対象impactとは別メタデータとして投影。各打の実ダメージ数字・回避・実HPを段階的に表示。`specialHitIndex`（同じ敵への何発目）と`specialTargetIndex`（対象何体目）は**別**で、異なる対象数を連続打撃数として扱わない。旧来の通常必殺/通常攻撃は互換維持。表示時間だけは試遊の仮値、ホストの時計・勝敗は変更なし。
5. 新`tests/phase2-2b2-soultimate-real-hit-ledger.test.mjs`：カスタムA1で**3発×B1/B2/B3の実打撃9結果**、ヒットごとのHP総和とKOによる残り打撃の省略、変造したダメージ・HP・回数の拒否、既定レンタルで一切hit回数が勝手に生えないことを検証。
6. 実際の`lab/match-stage.html?review=real-special-hit-ledger`と`tools/stage-smoke.mjs`を使い、**開発用カスタムでホストが発動した3連撃×3対象を実Chromium上に表示**。DOMを12msサンプルし、`specialHitIndex`の1～9各フレームについて前衛の表示数字/MISS/対象/画面HPがホストの正規hit行と一致することを観測。単なる静止テキストや計算式のテストではない。

## GitHub Actionsで実際に確認した証拠

最終ゲーム/QAコード：`41fc220452572eed0804dc177d2c50c50b9f30d0`。
- [Node **687/687 PASS**・自然6体戦闘耐久・研究Chromiumブラウザ全ジョブSUCCESS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40719822331)。研究ブラウザ初回起動はタイムアウト後、同一ジョブの再試行で成功（ログに失敗行は残す）。
- [実Chromium上下画面/サークル/必殺/勝敗・9回の本物ホストヒット表示 **PASS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40719822217)。ログ `PHASE22-REAL-HOST-PER-HIT-DOM-PASS nine host hit/HP states`。以前からの対象3体結果と姿勢・ジェスチャー・結果画面も回帰PASS。
- 初回テストコミット`aac36cb6ca`では687中686合格、1件は偽のplannedPerTarget=9を実3発と誤認する契約検証穴。**`45117ed67c`で「KOしていないなら全予定hitが存在する」不変条件を実装して解消し、別runにて687/687成功**。失敗を成功と偽らない。

## 技術的な受け入れ結果／未完

- **完了**：実ホストが各打でHP更新し、そのログを型検証してブラウザが1発ずつ正確に表示する一貫した仕組み。KO打ち切り、ダメージ合計、対象とhitの別扱いを確認。
- **未完**：本家の5/7ヒット差の確証／キャラごとの真の技威力、実際の複数対象への連撃配分、原作元動画とChrome映像のフレーム比較、原作特有の個別ポーズ・特殊効果のタイミング。本物のGoogle Sites＋学校iPad Safari 2台の新開発版検証とFirebase本番実通し試験は未実施。
- **研究以外には非適用**：オリジナルレンタル6体の`hitPattern:{type:'unknown',count:null}`はそのまま、`researchSoultimateHitCount`はデフォルトnullのまま。標準Friends用の各技威力・行動バランス・通信形式に新しい連撃は一切追加されていない。

## 次の工程：Phase 2.2C／原作のひとつの技を実証して標準モードへ

資料の版・対象・ヒット数をそろえた原作の実戦観察で**一つの技**のHit数と対象・命中/演出順が確かめられたら、現状カスタムのみの「実ホストhit→画面」を**根拠付き技データ**へつなぐ。原作の因果が不明なまま「3hitを5/7hitに変えるだけ」の実装は禁止。本家動画にあるスキル/演出と下画面の操作独立も引き続き照合する。
