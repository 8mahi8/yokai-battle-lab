# 妖怪ウォッチ2再現｜V3-4-12 原作Grouchy性格の行動ルール優先順

記録：2026-10-30 JST。開発ブランチ `feat/phase1-action-circle-lab-20261023`。**学校版/main/本番Firebaseは変更しない**。

## 既存V3-4-11から何が変わったか

ジバニャン（研究用）は原作で確認できた**基本行動重み Attack55 / Technique30 / Inspirit10 / Guard5**を`includeSourceWeights:true`で使える。しかし原作は**この4値をそのまま抽選するわけではない**。同版原作資料：[Mt. Wildwood: Attitudes YW2](https://mtwildwood.net/attitudes.php?g=yw2)には「上から最初に該当する条件の倍率を一度だけ適用する」ルールと、Grouchyの優先1〜10が掲載されている。YW1の例示「Jibanyan 50/35/10/5」とYW2の基本55/30/10/5を混同しない。

## 実装

- `engine/selection.mjs`：新`sourceYw2GrouchyWeights(actor,context)`は、既存の`actor.weights`にGrouchyの**最初の該当倍率**を掛け、`{rule,weights}`を不変値として返す。**別の乱数・別の行動選択器を導入しない**。
- 原作表で確認した10件は、(1)回復技があり味方が25%未満→妖術×3、(2)相手のAttackダメージ低下→物理×5・他Tech/Inspirit/Guardを抑制（データ渡しは明示された別効果のみ）、(3)相手が必殺チャージ→ガード×2、(4)自分の力が対象の最低守備を上回る→攻撃×3、(5)全対象に負のとりつき3個以上→負Inspirit×0、(6)全味方が敵のとりつきを受けている→正Inspirit×0.2、(7)全対象が味方の負Inspiritを受けている→負Inspirit×0.3、(8)(9)(10)味方全員の正Inspiritが3/2/1個以上→正Inspirit×0/0.2/0.3。ピンがある場合、原作表が指定する敵対象条件は**そのピン対象**で判定。
- `engine/combat.mjs`：**`researchYw2Grouchy:true`かつ明示`teams`**だけで有効化。元の`choice`が既に取得する実際の`livingFront`、ピンID、InspiritLedger、`soul.snapshot().pending`の相手のチャージを読み、既存`actionWeights`→`pickAction`を使う。source判定以外のレンタルAI既定動作は保持。Status由来で判定できる場合だけ`source`（味方/敵のとりつき発生元）も区別する。
- **原作の「Attack damage-down」と単なるステータス「strength-down」を同一効果と決めつけない**。`attack-damage-down`という明示効果を認識する入口・単体テストのみ提供。現行Combatのsupported Inspirit source/masterにはまだその独立状態が無いため、**本研究用試合でこのルール2を発生させられるとは主張しない**。
- 旧`actionWeights`のGrouchy/gentle/careful/cruel/brainyの研究fixture分岐は無変更。**`researchYw2Grouchy:false`では同じ行動/RNGを維持**。原作と異なる「現在のpositive/negative inspiredのスタックのルール」「対象のガード禁止Skill」「性格4択40/30/20/10の獲得/厳密ロールタイミング」「真面目さのLoaf数式」はまだ未対応。研究キャラの`personality`全体はfixture・`battleReady:false`を維持。オンライン`MatchProtocol`は研究オプション拒否、main/Google Sitesの学校版には適用しない。

## テスト・証拠

新規 `tests/v3-yw2-grouchy-priority.test.mjs` **7件**：
1. Rule1回復重視は相手のチャージ/ダメージ低下より優先。
2. Rule2/3のpriorityと敵のPinの扱い。
3. Rule4（力と相手守備の比較）とピン切り替え。
4. Rule5/7の敵への負のとりつき数と味方付与かどうか。
5. Rule6/8/9/10の味方へのとりつき/正バフの個数別倍率。
6. 元の`actionWeights`による条件付き倍率が実`pickAction`へ入ることと、旧fixtureのGrouchyを変えていないこと。
7. ジバニャンの原作3技・基本55/30/10/5と研究AIの合成`createCombat`、相手のSoultimateチャージ・Pin・同一seed再現、元6体Lab/Schoolオンライン試合とjournal replayの不変性、オンライン新研究flagの拒否。

**正式検証対象コード SHA `41d8d992197be574580d527768aebf4888465002`。**
- [Research battle unit tests #40934411455](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40934411455)：**全job SUCCESS、Node 874/874 PASS、fail 0、skip 0**。新7件・6vs6自然対戦の耐久と実Chromiumのタップ操作もPASS。
- [Phase37 Firebase Friends noAuth QA #40934411141](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40934411141)：**全job SUCCESS**。実RTDB Emulatorの2席・24ホスト行動ACK/正規状態一致、ゲスト切断・再接続後の重複再送処理、8ホスト行動の公開遅延と順序ACK、実Chromium2iframe/4埋込幅、Google Sites用**未配布HTML** build（76 source modules）を全検証。本番Firebaseは予約済み非ルームキーへのGET1回HTTP200（response body未閲覧、write 0）。本番Rules変更・学校公開HTML変更なし。
- これは**学校Safari実機2台・原作3DS動画のフレーム照合を実施したという意味ではない**。この2項目は別工程で必要。


## 次のV3-4-13

- 現在欠落している**原作の性格4候補の取得と、元のYaw2表にある条件をBattle内で正確に表現できないもの**を調査する。ひゃくれつ肉球5/7ヒットの文献食い違いについては依然として実機/一次資料が必要で、決め打ち禁止。
- 重複する手作りAIや新しいランダム処理を増やさず、現行の`actionWeights`/InspiritLedgerを再利用し、エンジン本体の実戦再現を優先。
- 学校iPad Safari実機2台、原作の提供動画本体、学校Google Sitesへの直接埋め込みはこの工程では未検証。main・Firebase本番Rules/DB/Auth・Driveを変更しない。
