# 妖怪ウォッチ2 Engine V3-4-9｜速度とりつきと命中率の共通化

2026-10-30 JST。開発ブランチ `feat/phase1-action-circle-lab-20261023` の研究機能。**学校の既存6体やGoogle Sites貼り付け済みHTMLは変更しない。**

## 原作資料と発見した実装漏れ

- [Mt. Wildwood – Hit Chance (YW2)](https://mtwildwood.net/hit-chance.php?g=yw2)：**基本命中率 = clamp(98 + (attackerSPD − targetSPD)/5, 75, 98) を整数化**。Attack は移動固有の `accuracy` 倍率を乗じて再度整数化、Technique はその物理技倍率を使わない。攻撃/妖術だけがミスし得る。この資料は原作ゲームデータの解析を根拠にする第三者研究資料で、直接の3DS実機検証は別途必要。
- [Mt. Wildwood – Jibanyan YW2](https://mtwildwood.net/yw2/yokai/jibanyan) と [Stat Changes YW2](https://mtwildwood.net/stat-changes.php?g=yw2)：ジバニャンの「しびれるお札」レベル2は**SPD×0.7**。2026-10-30 V3-4-8までに研究用状態異常と行動時計には反映済みだった。
- **問題点**：`engine/combat.mjs`内の通常攻撃/妖術と複数ヒットの研究必殺技は、`yw2HitProbability`に`actor.speed/target.speed`という**元のキャラ基本値**を渡していた。時計の`clock.setEffectiveSpeed`には低下後のSPDを渡しているため、速度低下が行動順だけに反映され、**命中率には効いていない**不整合があった。

## 実装（既存の関数・状態を再利用）

`engine/combat.mjs`にのみ最小限の修正。既存の`deriveStatStage(statuses.list(id),'speed')`と`statStageMultiplier`を再利用する局所`effectiveSpeed(member)`を新設し、**同じ値を以下の3か所で共有**：
1. `syncCanAct`で`clock.setEffectiveSpeed`に渡すSPD。既存の`waitCostFromSpeed`で未来のaction cost更新に使う。
2. `step()`の通常 Attack/Technique 両方の`yw2HitProbability`に渡す攻撃側/防御側SPD。既存の多段技では**各ヒットにこの値**を渡す。既存hit chance helperの式と乱数抽選回数は一切変更しない。
3. `applyResearchSpecial()`の**明示設定された研究用多段必殺**の各ヒットで使用する攻撃側/防御側SPD。Soultimateの実際の20×5 vs 20×7といった原作未確定部分には触れない。

`researchSpeedInspirit:false`（通常6体/初期学校用）は元の`member.speed`をそのまま返し、**従来のHP・スキル・行動順・RNG・journalを完全に維持**。研究用`researchSpeedInspirit:true`は従来どおり明示`teams`と`researchDamageModel:true`が必要。通常学校ルームの`MatchProtocol`オプションallowlistはこの研究フラグを拒否したまま。

**重要な非対応項目**：速度状態付与時に既に積んだ`wait`を遡及的に変更する仕様は原作未確認のため今回も**保持**。命中率と時計costに同じ速度を使うことは検証済みだが、原作のステータス切捨て順、命中/回避Skill・装備、負のとりつき複数の重ね方、時刻/演出フレームの精度全てが保証されたわけではない。HP回復/復活やソウル/被ダメージ計算を新しい基盤で作り直さず、既存のバトル効果コミッターをそのまま使う。

### 具体例

基本SPD140の攻撃側 vs 基本SPD210の相手：
- 低下なし：`floor(98+(140−210)/5)=84%`
- 攻撃側の速度Lv2低下：`140×0.7=98`、`floor(max(75,98+(98−210)/5))=75%`
- 防御側の速度Lv2低下：`210×0.7=147`、`floor(98+(140−147)/5)=96%`
- Attack固有精度0.5なら後者`floor(96×0.5)=48%`、Techniqueでは物理技の0.5補正を受けず`96%`。

## 正式テストとCI

新規`tests/v3-yw2-speed-hit-integration.test.mjs` **7件**：
1. 上記原作計算式の命中率値とAttack/Technique差。
2. 実`createCombat`で速度低下した攻撃側の**行動時計SPDと通常攻撃ヒット率**一致。既存per-hit複数命中判定経路の維持。
3. 相手のSPDを下げると攻撃側命中率が上昇すること。ベンチでのPurify後に時計SPDが戻ること。
4. 攻撃・防御双方が低下した時のTechnique命中率が、現在の時計SPD差だけに依存し物理moveAccuracyの影響を受けないこと。
5. 研究用`researchSoultimateHitCount:2`のseed11種で、**statusによるSPD低下を入れた試合**と**同じ値を基本SPDに持つ手書き比較試合**の命中・Critical・HPダメージ出力が一致。元の未低下SPDの試合とは、少なくとも1つのseedで差を確認。
6. 原作3技研究ジバニャン（するどいつめ10×2、火花の術20、しびれるお札SPD×0.7）と既存共通戦闘の直接連携。
7. レンタル6体のseeded戦闘完全一致、オンライン`MatchProtocol`のsource/journal/replay一致、研究フラグを通常ルームが拒否すること。

**正式検証コードSHA：`d77d7e3659ec56f59544a1f80d7bf68ce6542ef4`。**
- [Research battle unit tests #40930516650](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40930516650)：**Node 856/856 PASS、fail 0、skip 0**、6vs6自然対戦耐久と実Chromium研究UI操作も全job SUCCESS。
- [Phase37 Firebase Friends no Auth QA #40930516684](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40930516684)：**全job SUCCESS**。RTDB Emulator 2席/24 host auto/ACK/正規snapshot一致、接続切断→復帰、8 host auto公開遅延と順序ACK、Chromium実2 iframe・4埋込幅、Google Sites用未配布HTML build（76 modules）を検証。本番Firebaseは予約済み非ルームキーGET1回（HTTP200、本文非閲覧・write0）。学校Safari実機2台での確認ではない。

## ロードマップの位置と次の開発

**V3-4-9 完了。V3-4原作キャラ・全技・Skill・AI再現は未完。**

続く **V3-4-10** は同じ原作に裏付けられた速度低下の**命中・未来行動順への波及を出典・コード上で一体として検証済み**になったため、同じテストを増やすだけでなく、残る本質的な問題――(a)原作の「ひゃくれつ肉球」**20×5 vs 20×7**の根拠衝突解決、(b)原作Skillの発火・封印、(c)性格AI/技レベル/原作UIという未再現機能――の優先度を比較し、**再現度に最も効く実装**を進める。特に不明の待ちゲージ即時補正/3DS動画と演出を出典なしで確定しない。

学校Safari実機2台・ユーザー動画の直接比較・学校Google Sites貼付けHTML・本番Firebase通信試遊は未検証・無変更。main、学校公開HTML、本番Firebase DB/Rules/Auth、Google Driveへの変更なし。Draft PR #1 の開発ブランチに記録済み。
