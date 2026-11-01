# ADR-0003｜オリジナル妖怪のキャラ・技・スキル共通定義 V1（2026-10-28）

**状態：データモデルV1実装＋検証。現行の原作研究中の戦闘エンジンはまだこのモデルを使っていない。**
前提：君が「妖怪ウォッチのキャラは何で構成されているのか、まずキャラの共通設計を考えよう」と決めた。**オリジナルキャラ6体、原作の対人戦ルールの再現**を両立する。名前や絵は原作のものに依存しなくてよいが、攻撃・妖術・とりつき・必殺・スキル・性格・種族陣形等の組み合わせ方は原作を参照する。

## 原作で確認できた構成とソース（推測で穴埋めしない）
- [攻略大百科：妖怪の能力・ステータス画面の見方](https://gamepedia.jp/youkai-yw2/archives/1446) — 名前と種族、ランク、Lv/経験値、元祖・本家の派閥、妖気、HP、装備、**ちから/ようりょく/まもり/すばやさ**、性格の二軸、スキル、4アクション（**こうげき／ようじゅつ／ひっさつ／とりつく**）。
- [攻略大百科：性格](https://gamepedia.jp/youkai-yw2/archives/1454) — **前半7段階**がサボりやすさ、後半が行動の取りやすさ。固定の学校試遊用`loafChance`と原作での「超まじめ・すなお…」の7段階を**同一の値として扱わない**。
- [ジバニャン（YKW2）を機構・条件別に説明するMt. Wildwood](https://mtwildwood.net/ja/yw2/yokai/jibanyan) — 攻撃と必殺の**別々の複数打**、技ごとの妖気消費など。**一方で**[攻略大百科のジバニャン](https://gamepedia.jp/youkai-yw2/monsters/272) と [ゲーム攻略](https://game-cap.com/youkaiwatch2/data/youkai_jibanyan.html) は `20×5` のひゃくれつ肉球を記載し、Mt. Wildwoodには `20×7` の表示もある。**情報に食い違いがあるため、オリジナル技の固定7回等は採用しない。** ゲームのバージョン、技レベル、記事の対象、技変更などを確認する。
- 任天堂公式マニュアルや既存原作動画の目視結果：[Phase51深掘り](./PHASE51_ORIGINAL_FOUR_MATCH_DEEP_RESEARCH_20261027.md)、[第1試合のタイムコード](./MATCH01_SECOND_PASS_INPUT_AND_TIMELINE_20261027.md)。2〜4試合目はファイル受領済み・フレーム未観察。

## 1. 妖怪1体の固定定義（V1）
`content/yokai-definition.mjs` に `YOKAI_DEFINITION_SCHEMA=1` と `validateYokaiDefinition()`、`defineYokai()` を追加。

| 分野 | フィールド | 役割 |
|---|---|---|
| 識別 | `id,name` | 内部不変IDと表示名は別 |
| 分類 | `tribe,rank,faction` | 種族/ランク/派閥、6体の値は**未確定ならnull** |
| 能力 | `stats:{hp,strength,spirit,defense,speed}` | 5能力。元のレンタル数値はあくまで試遊fixture |
| 属性 | `resistances` | 属性ごとの相性テーブル。まだ確定していないので**null** |
| 性格 | `personality:{seriousnessTier,attitude,actionWeights,loafChancePercent}` | **前半7段階**と**後半の行動傾向**を区別。行動比率や%は仮値。既存の学校・研究プリセットは別 |
| 技 | `moves:{attack,technique,inspirit,soultimate}` | 4枠固定で、各々が独立した**move ID**を持つ |
| スキル | `skill:{id,displayName,trigger,effect,evidence}` | 技4枠とは**別の常時/条件付き能力**。現行コードのskill名は移行IDだが発火仕様は要実証 |
| 装備 | `equipment` | 魂と装備は**キャラの技でない**。初期固定レンタルの装備数・中身は未確定（null） |
| 根拠 | `provenance` | `observed`（原作動画直接）、`documented`（資料）、`fixture`（試遊仮値）、`unknown`（未確認） |

**固定定義と対戦状態を分ける**：HPの現在値、妖気残量、悪/良とりつき、ガード中、行動待ち、サークルの位置、装備/魂の実戦補正は戦闘状態側に置く。このV1には可変フィールドを持たせない。

## 2. 技の共通形式（重要）
各技：
- `id`：キャラに依存する移行用ID（将来の共通技マスターでは共通moveIdに統合可）
- `slot`：attack / technique / inspirit / soultimate
- `displayName`：技名（**原作/オリジナル技名が未設定ならnull**）
- `category`：ダメージ・回復・とりつき・バフ/デバフ・蘇生・吸収など
- `power`、`element`：不明ならnull
- `targetScope`：一体か、前衛全員か、味方チームか
- `hitPattern:{type,count}`：1回 / 複数回 / 打撃ではない / 未確認。**複数対象を複数ヒットと絶対に混同しない**。
- `statusEffect`：追加のとりつき/弱体化がある場合の研究ID
- `evidence`：根拠レベル

**必殺の多段攻撃は技固有**。ジバニャンのひゃくれつ肉球を手本に全必殺を連打表示にするのは誤り。技の実命中回数は本家の資料や動画で確認してから採用する。現在の研究`special`は正規hit countを持たず、単発として見えても`hitPattern:'unknown'`と`count:null`のままにした。
- `技の対象が3人`は**3対象**であり、`3ヒット`ではない。
- `buff`や`heal`を「0ヒット」の`type:'none'`とし、**動作回数0**と混同しない（命中判定がないという意味）。
- 物理・妖術の既存`attackHits/techniqueHits`は個別の試遊データとして取り込む。データが無い場合は現行エンジン同様、既定1回。**原作の正確な命中数とは呼ばない**。

## 3. スキル設計
- 6体の現行スキルID (`momentum, critImmune, lastStand, sharpCrit, care, guardBreak`) を `skill:...` として保持。
- `trigger`/ `effect` は **null**（まだ共通効果モデル・発火条件を確定していない）。現行コードには研究実装があるが、その意味と原作仕様の一致は別問題。
- スキルの実処理を分離する際は `trigger=KO確定時/被弾時/命中時/毎行動境界...`、`effect=確定ルールへの変化` 等の共通語彙で扱う。その時、正規イベントにもスキルの発動結果を記録する。
- ガードは**通常の行動選択**。Gわざ/つつくは**妖怪ウォッチ側操作**。スキル定義へ混ぜない。

## 4. 既存6体への実物変換（戦闘は変えない）
`content/rental-yokai-definitions.mjs`
- `RENTAL_YOKAI_LAB` と `RENTAL_YOKAI_SCHOOL` の**両方**に6体を射影。
- 6体: `あかねこ / こもれび / いしもり / すずかぜ / ほたる / くろがね`。
- HP,ちから,ようりょく,まもり,すばやさ、4行動、スキルIDは既存 `RENTAL_SQUAD`から派生。学校版の性格/行動ウェイト/loaf%は別の `SCHOOL_RENTAL_PERSONALITIES`から派生。
- 種族/ランク/派閥/属性耐性/装備/まじめさ段階は**安易に割り当てない**。 `null` と `unknown` を使用。
- この6体の新定義は**まだ`engine/combat.mjs`にも通信にも組み込んでいない**。古い戦闘が動くことを守るため、まずは並列の読み取り専用定義を構築。

## 5. テスト
`tests/yokai-definition-schema.test.mjs`：
1. 6体×学校/研究で4技枠が存在、move ID24種がユニーク、ステータス・技・skill ID一致。
2. 学校/研究の性格のみがモードによって異なり、基本のキャラidentityと技が同一。
3. 不明分野に嘘の値を入れずnullを保持。
4. `type:multi,count:1`、`type:unknown,count:7`、`type:single,count:3`、重複技ID、証拠レベル捏造、性格の数字異常を拒否。
5. `defineYokai()`が深い不変コピーで、元レガシーロスターに影響を及ぼさない。

既存[研究単体/画面/通信CI](../.github/workflows/research-unit.yml)は**戦闘コード未変更**を検証。最新GitHub Actionsリンク/確定結果は完了後に追記する。

## 6. 次の段階（データベースを増やす前に）
1. 原作種族・ランク・性格と陣形の**役割**を明確にし、オリジナル6体に割り振る際の**バランスと戦術意図**を決める。種族を勝手にランダム付与しない。
2. 攻撃/妖術/とりつき/必殺の**共通技マスター**と、`skillId`ごとの発動イベント・効果の辞書を作る。その前に原作情報が競合した時の扱いを記録。
3. 最初の1体を**完全にデータ駆動**で実装し、原作の`入力→技ID→判定→ヒット・効果→描画`を1縦切りで再現。
4. 旧エンジンと新データの変換アダプタを比較テストし、戦闘結果を変えず段階導入。パーティ編集・育成・装備選択は初期学校版に追加しない。

## 安全な範囲
開発ブランチ`feat/phase1-action-circle-lab-20261023`のみ。GitHub`main`・学校Google Sites稼働版・Firebase本番Rules/Auth/DB・既存Drive配布への変更なし。実動画2〜4本目も今回のデータ設計のために「新たに見た」とは主張しない。

関連：[ADR-0002 戦闘基盤再設計](./ADR_0002_ORIGINAL_PVP_CORE_REARCHITECTURE_20261028.md)、[既存の姿](./PROJECT_MAP_AND_PROGRESS.md)。
