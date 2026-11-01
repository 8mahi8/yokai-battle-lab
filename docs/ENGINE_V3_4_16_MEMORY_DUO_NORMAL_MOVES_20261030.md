# 妖怪ウォッチ2再現｜V3-4-16 わすれん帽・メゾン・ドワスレの原作通常技＋共通スキル接続

2026-10-30 JST。対象：`8mahi8/yokai-battle-lab`の開発ブランチ`feat/phase1-action-circle-lab-20261023`。原作の4技全部を再現したと誤解させず、**研究版の一部再現**として管理。Google Sitesで学校に配布済みのHTML、main、Firebase Rules/DB/Auth、Google Driveは変更しない。

## 原作のYKW2限定資料

- [Mt. Wildwood Wazzat YW2節](https://www.mtwildwood.net/yw2/yokai/wazzat)、[攻略大百科 わすれん帽](https://gamepedia.jp/youkai-yw2/monsters/184)、[Game8](https://game8.jp/youkai-watch2/497052)：**かみつく(Bite) 威力15/1 hit**、**つむじ風の術(Whirlwind) 風20/1 hit**。Lv99基準HP252/STR76/SPR150/DEF87/SPD192。Battle behaviourの基礎配分**Attack10 / Technique55 / Inspirit30 / Guard5**。
- [Mt. Wildwood Houzzat YW2節](https://www.mtwildwood.net/yw2/yokai/houzzat)、[攻略大百科 メゾン・ドワスレ](https://gamepedia.jp/youkai-yw2/monsters/185)、[Game8](https://game8.jp/youkai-watch2/496843)：**くらいつく(Chomp) 威力45×2**、**竜巻の術(Tornado) 風50×2**。日本語サイトの技一覧は総合威力45/50と記載しヒット数を示さないが、Mt. Wildwoodの**YW2節**は明示的に`×2`と説明。Lv99基準HP332/STR99/SPR187/DEF156/SPD185。基本配分**Attack5 / Technique60 / Inspirit25 / Guard10**。
- [原作Skill owner/共通マスター](./ENGINE_V3_4_15_SOURCE_ACTION_SKILL_BRIDGE_20261030.md)：2体とも「まもりわすれ」で、味方と敵のガード選択を抑制、後衛でも有効（所有者が生存する場合）を研究実戦で前工程実装済み。
- 原作効果が異なる部分は正確に区別：**わすれん帽**とりつき「記憶を食べる」=相手が味方へ攻撃し得る混乱、必殺「スグワスレ〜ル」=敵の良いとりつき解除。**メゾン・ドワスレ**とりつき「記憶をしまう」=味方への誤攻撃、必殺「記憶にございません！」=敵前衛を混乱させる。元エンジンは現時点でこの2種の原作処理を実装していない。
- Mt. WildwoodのページにはYW1/YW2/YW3/Busters等の情報が連続する。**WazzatのLv99値250等はYW1、252がYW2**。3DSの実機フレーム単位・技成長レベル別検証は未実施。

## 実装と現在の責務

新規`content/yw2-memory-duo-normal-lab.mjs`：2体の**原作4技/スキル/基礎数値の出典と研究値**をimmutable`YW2_MEMORY_DUO_SOURCE_INDEX`へ追加。原作スロットごとに`documented`/ `unknown`を区別し、`getPreview(id).battleReady=false`を維持。キャラIDは`yw2:wazzat`/`yw2:houzzat`。

`buildYw2MemoryDuoNormalLab({index?})`で元資料から**確定した2技×2体のみ**を拡張技マスターとしてコンパイルし、既存`extendCombatCatalog`へ追加。共通の`BattleExecutionProfile V2`と`compileCatalogTeamsForCombat`から実`createCombat({teams})`入力を構築する。元原作データと戦闘での実行値が別コードに重複しない設計。未知/矛盾/不正技数値や技所有者の衝突は**戦闘開始前に拒否**。

`compileYw2MemoryDuoTrialTeams`は仮レンタル6体×両チームのうち**それぞれ2体を研究用Wazzat/Houzzatに置換**し、前工程の`sourceYw2CharacterId`から**原作所有者ID → 共有`yw2:skill:mamoriwasure` → 既存`researchYw2ActionOverrides:true`**のルートを利用。属性は風、多段hitは共通の既存ループ、元の6体/通常のonline`MatchProtocol`は変更しない。新たな特殊技エンジンやRNG/通信の二重実装なし。

**重大な未完成事項**：この2体の`Inspirit`と`Soultimate`は、資料上原作の名前/効果を登録したものの、実戦入力は**別物の仮レンタルfixture**を借用。キャラの`provenance.moves='fixture'`、`provenance.skill='fixture'`（旧ラボ互換のパッシブ欄）、`provenance.personality='fixture'`、`battleReady=false`のまま。原作Skill自体は別マスターから実装し、原作owner IDを戦闘に保存する。属性相性/原作ダメージ式・技レベル成長・性格4候補・Loaf・装備・魂容量の一部もfixture。**実戦画面で正規原作2体として公開していない**。

`createCombat({teams:compileYw2MemoryDuoTrialTeams(),researchYw2ActionOverrides:true,researchDamageModel:true,researchMultiHit:true})`で明示研究のみ使用。学校の通常MatchProtocolは研究フラグを拒否し続ける。

## 正式テスト

新規`tests/v3-yw2-memory-duo-normal-lab.test.mjs`**6件**：
1. 2体の原作4技名前/主要効果/原作Lv99能力/基本重みと未対応スロットの分離。
2. 読み取り専用8キャラ/28技カタログ（既存6体24技＋2体4技）と技能別出典・資料の確証区分。
3. 両側6人のうちWazzat/Houzzatは原作技/基準数値/基本行動重みとSkill owner IDの一致。
4. 3seedの実自動6vs6で**2hit物理/風妖術の既存Hitループを通り、原作2体の共通Skillが両陣営のGuardを抑制**。
5. 元資料のdamage/skillの値がunknownや相互不一致ならFail Closed。
6. 通常6レンタル×Lab/School×3seedの同一正規状態・MatchProtocol journal replay不変、研究flagなしや通常onlineでの原作Skill導入拒否。

**検証コードSHA：`01d55eea91dac5bb31cc1c37699f2600d8e7ae5a`**。
- [Research battle unit tests #40972890661](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40972890661)：**Node 901/901 PASS、fail 0、skip 0**。自然6vs6耐久・実ChromiumでPoke/Soul移動/カウンター操作すべてSUCCESS。
- [Phase37 Firebase Friends QA #40972890715](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40972890715)：**全job SUCCESS**。本物のRTDB Emulator 2席24host行動ACK/正規snapshot同期、切断復帰/冪等再送、8host行動の公開遅延、実Chromium 2iframe/4幅、学校用**未配布**HTML build **77 modules** を確認。実Firebase本番は予約済み非ルームキーへの**GET1回 HTTP200、本文未閲覧・write0**のみ。

## V3-4-17以降

**次は「原作混乱」の共通状態処理**を研究する。味方を誤攻撃する確率と誰を対象にするか・行動の種類・そのターンの行動時計/攻撃命中/解除や他のとりつきとの優先順位を[Mt. Wildwood YW2 Inspirits](https://mtwildwood.net/inspirits.php?g=yw2)や原作実機資料から確認し、元のStatusLedger/MatchCore/EffectCommitterを再利用。**即席の別な状態異常を当てはめない**。次にわすれん帽の敵正バフ解除、メゾン・ドワスレの敵全体混乱を共通の効果計画で扱えるようにする。原作ヒット数/マルチ対象仕様とUIの3DS動画比較、学校iPad Safari2台/実Google Sites埋込の実機テストは未済。ジバニャン「ひゃくれつ肉球」20×5 vs20×7は引き続きdisputed。

main・学校公開HTML・本番Firebase DB/Rules/Auth・Google Driveへの変更なし。Draft PR #1継続。
