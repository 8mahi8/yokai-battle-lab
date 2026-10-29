# 妖怪ウォッチ2対戦再現｜V3-4-11 ジバニャンの原作基本行動重みを実AIへ接続

更新：2026-10-30 JST。開発ブランチ`feat/phase1-action-circle-lab-20261023`。学校公開HTML、main、本番Firebaseは未変更。

## なぜ今回は原作の基本AIを選んだか

- V3-4-10までは**ジバニャン原作の通常攻撃10×2、火花の術20・火、とりつき速度低下Lv2、スキル「まえのめり」一部**を研究用に動かせている。しかし動作AIには**架空レンタル`あかねこ`のweights [60,25,10,5]**をそのまま流用しており、実際に通常技/とりつき/ガードを選ぶ頻度が原作の初期値から異なる。
- [Mt. Wildwoodの**Jibanyan YKW2節**](https://mtwildwood.net/yw2/yokai/jibanyan)に記載された基本値は、**Attack55%, Technique30%, Inspirit10%, Guard5%**（順に50ではなく55、35ではなく30）。
- [Mt. Wildwoodの**Attitudes YW2節**](https://mtwildwood.net/attitudes.php?g=yw2)で、行動は(1)サボり判定 (2)4種類の基本重み (3)選ばれた性格・戦況による条件付き倍率 (4)スキル等の制限 (5)加重抽選の順。このため**基本重みを原作値にしても性格AI全体が再現済みとはいえない**。とくにMW同一ジバニャンページのYKW1には**[50,35,10,5]**という別作品の基本値も載る。YKW1・YKW2・YKW3を取り違えず、YW2固有の**55/30/10/5**を選ぶ。
- 『ひゃくれつ肉球』は国内攻略サイトの20×5とMW YKW2節の20×7が未解決のまま。現時点で技マスターへどちらかを原作確定として登録せず、**必殺は引き続きfixture**。Skill封印の具体的な状態遷移やフレーム上の扱いも未確認なので、架空の封印statusを導入しない。

## 変更ファイルと実装契約

1. `content/yw2-original-reference-pack.mjs`：既存原作研究レコード`yw2:jibanyan`へ任意`behavior.baseActionWeights`を`documented([55,30,10,5],jibanyan_mtw)`として追記。**行動割合はBattle AIそのものではなく、性格補正前の4重み**という意味を守る。Komasanやその他キャラには勝手に同じ値を埋めない。
2. `content/yw2-source-intake.mjs`：任意`behavior.baseActionWeights`の証拠`documented/disputed/unknown`とURLを既存`validateFact`で検査。documentedの場合は、4つの非負整数の合計100のみを許可。`getPreview(id).baseActionWeights`で参照でき、確証なしはnull。任意の新分岐や二重行動表は作らず、出典のない値が実戦へ昇格しないようにする。
3. `content/yw2-jibanyan-normal-moves-lab.mjs`：`buildJibanyanNormalMoveLab({includeSourceWeights:true})`だけで、文献documented重みを実`YokaiDefinition.personality.actionWeights`へ投影。既存`extendCombatCatalog`→`BattleExecutionProfile V2`→`compileCatalogTeamsForCombat`→`createCombat({teams})`を通り、**左右6体のうちジバニャンだけ**のAI基礎重みを修正。`includeSourceWeights:false`ならこれまでの研究fixture[60,25,10,5]を保つ。
4. **重大な境界**：original `baseActionWeights`はsource-backedでも、現在の`attitude:'grouchy'`自体は`あかねこ`から仮借用したもので、YW2本人の性格候補/選択/各種優先ルールの原作完成ではない。原作`loaf weight`と育成/真面目さによる実際のサボり確率も違うため、一方の説明だけを見て「5%のサボりを完全再現」としない。`provenance.personality='fixture'`、別の`researchProvenance.originalBaseActionWeights=true`で項目単位に区別し、`battleReady=false`を維持。元レンタル6体の行動重み/AI/オンライン通信の仕様は無変更。

## テスト

新規`tests/v3-yw2-jibanyan-original-base-weights.test.mjs`**6件**：
- YW2ジバニャンの確定55/30/10/5のURL・凍結と、他キャラには勝手に与えないこと。
- オプトインのYokaiDefinition/左右6体の`createCombat`に55/30/10/5が入り、旧レンタル60/25/10/5・性能・技等は変えないこと。
- 戦況による性格条件がない時の`actionWeights`が正確にsource基本値を返し、戦闘中は既存の4行動選択/RNGだけを使うこと。
- 不正な個数・合計・負の値・出典IDや資料間disputed/unknownを勝手に確定して戦闘に取り込まないこと。
- Lab/School×3seedの通常6体`MatchProtocol`状態、アクション、ジャーナル再生の完全一致。
- `battleReady:false`、未確定の必殺hit数`disputed: [5,7]`、人格全体のfixtureと原作3技+源資料AI基本重みの区別。

**検証コードSHA：`fb4b3b81b990aea779f91aa4ea2a83278283af8a`**
- [Research battle unit tests #40933150581](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40933150581) は**Node 867/867件PASS、fail 0、skip 0**、実6vs6耐久と実Chromiumの研究画面操作もSUCCESS。
- [Phase37 Firebase Friends no Auth QA #40933150215](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40933150215) は同じコードSHAの統合回帰ゲート。最終結論はActionsで確認して明記する。既存のFirebase Security Rules/Auth、学校公開版に変更を行っていない。

## 次工程 V3-4-12

- **優先候補：原作性格（Attitude）の選択条件と倍率**をソースのYaw2節に限定して、まずジバニャンの「キレぞう」に相当する戦況判断と基本重みの乗算順を原作資料から明確にする。`engine/selection.mjs`の部分的Grouchy処理はすでにあるため**新AIを二重に作らず、現在の分岐順と原作の差だけを埋める**。各効果が条件を満たした場合の行動頻度が大きく変わる可能性がある。
- ひゃくれつ肉球20×5 vs20×7を版別一次情報・実機で解決するまでは本家原作数値として実行しない。Skill封印・技Lv成長・原作のチャージ/カウンター/攻撃演出の3DS動画比較は別途。元ゲームで必要な複合AIが未完成のまま学校対戦へ新キャラを投入しない。
- 学校Safari iPad実機2台・ユーザー提供の動画本体はこの工程で未視聴。main、Google Sites直接貼付HTML、実Firebase DB/Rules/Auth、Google Driveに変更なし。Draft PR #1継続。
