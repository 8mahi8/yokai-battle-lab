# 妖怪ウォッチ2 対戦エンジン V3-4-2｜登録キャラID→6人戦闘ロスター変換

2026-10-30（日本時間）。**実装済み・正式CI合格**。対象は現時点で信頼できる6体のレンタルfixtureのみ。原作未確認の数値・キャラ能力やヒット数を勝手に確定させない。

## 目的と今回の結果

V3-4-1は`createCombatCatalog`/`extendCombatCatalog`で7体目のauthoring登録まで可能になった。しかし`engine/combat.mjs`の入力は、5ステータスに加え`soulCapacity`/`soultimateRank`/`special`複合効果/`inspiritLevel`/AI行動重みとLoaf/`skill`、攻撃・妖術の旧フィールドを持つ。登録できたデータを即座に対人戦で使わせると、これらの既定値が推測で埋まる危険がある。

そこで**技・スキル・Stats・性格をcatalogから読み、まだ移行されていない実行条件は既存6体の実装と完全照合**する、厳密なread-only変換口を導入した。新しいダメージ式、別の試合シミュレータ、キャラIDの自動推測は作っていない。

### 新しいAPI

- `engine/catalog-battle-roster.mjs` → `compileCatalogTeamsForCombat({catalog,teamCharacterIds,school})`。
- `teamCharacterIds`は2陣営それぞれ**6つの明示ID**。それぞれ重複を禁止。IDの順序を変えればA1..A6 / B1..B6へのキャラ割当もその順序になる。同じ名/見た目からIDを推定しない。
- Lab/Schoolの既存immutable catalogの技・Skill・5Stats・personalityを見て、`{name,skill,speed,maxHp,strength,spirit,defense,attitude,weights,loafChance?,attackPower,attackHits?,techniquePower,technique,techniqueHits?,techniqueElement?,inspirit,inspiritLevel?,special?}`を生成。すべて**既存6体の引数と深い値で一致**することを最後に照合。原作ではなく開発済みのfixtureと一致するという意味。
- マスター値は`resolveRentalAttackSpec`、`resolveRentalTechniqueSpec`、`resolveRentalInspiritSpec`、`resolveRentalSoultimateSpec`、`resolveRentalSkillSpec`の**既存5つの検証器**を再利用。技・スキルの値や順序を別ファイルにコピーしない。Soul rankや複合必殺は現行の`RENTAL_SQUAD`/`RENTAL_SOULTIMATE_MOVES`との一致検証を残し、未確認の入力を作らない。
- `Object.freeze`した配列・キャラ記録・重み・specialを返す。新しいステータスや技への登録データが存在しても、**未認証の実行内容を持つ7体目はこのAPIでfail-closed**。catalogに登録できることと戦闘で使用できることは別。
- 既存の`createCombat({teams:...})`と`createMatchProtocol({battleOptions:{teams:...}})`に直接与えられる。**本番オンラインのデフォルト起動経路は従来どおり**。旧`catalog*Resolution`がcustom team時に禁止される規約は変更していない。

### 使用例

```js
import {compileCatalogTeamsForCombat} from './engine/catalog-battle-roster.mjs';
import {RENTAL_SCHOOL_CATALOG} from './content/combat-catalog.mjs';
import {RENTAL_CHARACTER_MOVE_REFS}
 from './content/rental-character-move-refs.mjs';
import {createMatchProtocol} from './engine/match-protocol.mjs';

const ids=RENTAL_CHARACTER_MOVE_REFS.map(x=>x.id);
const teams=compileCatalogTeamsForCombat({
 catalog:RENTAL_SCHOOL_CATALOG,
 school:true,
 teamCharacterIds:[ids,[...ids].reverse()]
});
const match=createMatchProtocol({
 battleOptions:{seed:212,teams,playtestSoulTuning:true}
});
```

上記は**検証済み6体の並び替え**を試せるだけで、新しいキャラの実装完了やオンラインロビーのデッキ選択UI実装を意味しない。

## 検証証拠

- `tests/v3-catalog-combat-roster.test.mjs`**新規6件**：
  1. Lab/Schoolで、6体×両席の生成結果が従来の実行inputと深く一致・不変。
  2. 明示したIDの任意順に並べた2陣営で、該当の名前・性能を保持し戦闘が実行可能。
  3. **Seed 5種×Lab/School 2条件＝10設定×最大100自動行動**。旧`createCombat`に対して戻り値・完全な`snapshot`・HP・Inspirit・妖気・KO・効果・RNG・行動時計・イベントが各行動で一致。
  4. **Seed 3種×Lab/School 2条件**。`createMatchProtocol`の入力としてコマンド（Pin、回転、watch）→最大110 auto行動までの`dispatch`戻り値・revision・ACK・hash・予測・full snapshotが一致。両方の`exportJournal`はそれぞれ再実行PASS。
  5. データ登録された新しい7体目は、既存の選択6体と混同されず、実装されていない複合効果を推測せず拒否する。拡張catalogに既存6体が残る場合は引き続き動く。
  6. School/Lab参照混同、重複/不足ID、5Stats・Skill・技を変えた改ざんcatalogは戦闘開始前に拒否。
- 検証済みコードSHA `903d5c1e610be45cda5c383ea2fd84e46691d100`。
- [正式 Research battle CI #40919914710](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40919914710)：**Node 807/807 PASS**、自然6vs6耐久、実Chromium UI操作すべてSUCCESS。
- [正式 Phase37 Firebase Friends no-Auth CI #40919914672](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40919914672)：**全job SUCCESS**。2席Firebase RTDB Emulatorで24行動のACK/正規snapshot一致、切断→復帰、公開遅延8行動、Chromium実2iframe、4埋込幅、単体Google Sites HTML build 76モジュール成功。本番Firebaseには従来の読取プローブGET1回のみ（HTTP200、非ルームキー、本文非閲覧、書込なし）。
- main、公開Google Sites、Firebase本番DB/Rules/Auth、Driveに変更なし。Draft PR #1の開発ブランチにのみ保存。

## V3-4-3の課題と完了条件

この変換は**6体fixtureにしか認証されていない限定アダプタ**。新キャラの戦闘を本当に支援するには、共通データ定義に以下の未移行フィールドを明示的に含めるか、型付き実行プロファイルを別のauthoring契約として登録する必要がある：`soultimateRank/soulCapacity`、複合`special`の`damageKind`/対象/状態/レベル/復活、`inspiritLevel`、スキル発火/数値（SkillHookは既存タイプだけ）、`attackAccuracy`/Critical/Guardなどの能力、正規のAI行動重みとLoaf provenance、表示UIの技名/キャラ画像ID。マスター自身が複合効果をまだ完全に所有していないため「登録したら自動でどんな必殺でも実行可能」とはしない。

次の**V3-4-3**はこれらのメタデータを**ソースを重複させずにコンパイルする共通BattleProfile schema**を追加し、すでに存在する6体の研究用数値を先に表現・完全一致確認する。そのうえで7体目の**対応済み既存Skill/Status/Soultimate効果だけ**を使ったcustom試合が可能かを検証し、まだ未確認の原作技効果は保留する。

原作動画とのフレーム比較・学校Safari iPad実機2台・本番実通信書込・ホストの完全再起動復帰は未検証。V3-4全体・原作完全再現は未完成。
