# 妖怪ウォッチ2再現 Engine V3-4-10｜「まえのめり」発動後の必殺技ダメージ反映

2026-10-30 JST、GitHub開発ブランチ `feat/phase1-action-circle-lab-20261023` 限定。**原作仕様の根拠が足りない箇所を推測で完成扱いしない。**

## まず現在地とV3-4-9から引き継いだ事実

- V3-4-9で、ジバニャンの「しびれるお札」による研究用SPD Lv2減少と、行動時計/通常攻撃・妖術/研究用多段必殺の命中計算を同一effective Speedに統合。オンライン6体の状態同期を維持して856/856 Node PASS。
- 原作ジバニャン研究パックでは通常攻撃「するどいつめ」10×2、火花の術20・火、しびれるお札SPD↓Lv2まで既存エンジンで試験実行可能。**ひゃくれつ肉球の20×5 vs 20×7が未解決**、原作キャラ4技完成や本番ロビー導入はまだ行っていない。

## 原作照合と判断

1. [Mt. Wildwood ジバニャン(YW2)](https://mtwildwood.net/yw2/yokai/jibanyan) のYW2固有節に「まえのめり（Adrenaline）」は敵を倒した行動の終了によってちから・妖力の**+2段階（×1.2）/本人5行動**、1回の行動で複数KOしても発動1回、Skill自体が原因のKOや本人KO時・Skill封印中は非発動と記載。[攻略大百科](https://gamepedia.jp/youkai-yw2/monsters/272)、[game-cap](https://game-cap.com/youkaiwatch2/data/youkai_jibanyan.html)も敵KOで上昇、5行動という大枠を支持する。**原作演出の何フレーム目で強化がダメージに適用されるかは未実機検証**。
2. 既存`engine/combat.mjs`の通常攻撃/妖術には`skillMomentumStage(skillBoosts.get(actor.id))`が使われていたが、**研究用`applyResearchSpecial`の多段必殺1ヒットごとの`calculateOneHit`にはこの+2段階が渡されていなかった**。KOして強化が有効なはずの次の必殺でもダメージが増えない、原作への接近を阻む具体的な欠落。
3. 根拠にある「KOを起こした行動で1回発動」から、**KOを起こした同じ必殺技の残りヒットや別対象へその場で上昇を適用する根拠はない**。演出時刻不明のため、今回の研究ルールでは**その必殺開始時点のboostを固定**し、効果が新規発生した場合は**次回以降の行動**から有効にする。これは原作の完全実機実測ではなく、慎重な研究モデル上の境界。
4. [攻略大百科](https://gamepedia.jp/youkai-yw2/monsters/272) と [game-cap](https://game-cap.com/youkaiwatch2/data/youkai_jibanyan.html)は「ひゃくれつ肉球20×5」、[Mt. Wildwood](https://mtwildwood.net/yw2/yokai/jibanyan)は**20×7**のまま。情報差の原因を調査したが、確証のある版別ゲーム内実測は得られない。**採用値を決めず研究パック`disputed`のまま**。固定seedで試験する`researchSoultimateHitCount:2`は**仮のfixtureで、ひゃくれつ肉球の原作ヒット回数を示さない**。
5. 誤読再発防止：[Mt. Wildwood ジバニャンページ](https://mtwildwood.net/yw2/yokai/jibanyan)には複数作品の節があり、**最初のYW1節**に「SPD×0.8（Lv2）」、**YW2節**に「SPD×0.7（Lv2）」がある。[YW2 Stat Changes](https://mtwildwood.net/stat-changes.php?g=yw2)でも-2段階は**×0.7**。V3-4-8/9で実装済みの×0.7は正しい。一括抽出だけで別作品の記述を混ぜない。

## 実装・保守

- `engine/combat.mjs`の**研究専用`researchYw2Momentum:true`のときだけ**、`applyResearchSpecial`開始時に既存`skillMomentumStage(skillBoosts.get(caster.id))`を一度計算（`soultimateMomentumStage`）。各ヒットの`calculateOneHit`の攻撃側statStageを`deriveStatStage(statuses.list(caster.id),'strength' | 'spirit') + soultimateMomentumStage`（-8..8 clamp）へ渡す。通常技と同じ関数で計算する。KOを起こした後にboostが追加されても**その必殺技の残り対象のstageは変わらない**。
- 旧fixture6体`researchYw2Momentum:false`では`soultimateMomentumStage=0`。既存のdamage/hit/crit/RNG/イベント/スクリーン/通信形式に**一切の変更なし**。研究用スキル旗は従来どおり`MatchProtocol`のallowlistで拒否され、学校向けRTDBへは入らない。
- `engine/skill-effects.mjs`の既存`SKILL_TRIAL.momentumStages=2`と`momentumOwnerTurns=5`は**YW2原作研究資料でも支持される**ため、古い「YW1のみでYW2未確認」という注釈を訂正。共通の既存定義を使い続け、数値を別辞書に複製しない。
- **未実装**：原作のSkill封印状態が`SkillHookPipeline`に適用される条件、Soultimateの非多段ResearchEffectPlanの威力式、原作フレームごとのKO/Skill発動表示、ひゃくれつ肉球のヒット数、技レベル成長、原作AI/性格。Skill-sealを実機資料なしの架空statusとして勝手に追加しない。

## 自動テスト・公式CI

新規`tests/v3-yw2-adrenaline-soultimate-stage.test.mjs` **5件**：
1. スキル+2段階/本人5行動と共通`statStageMultiplier(2)=1.2`、ダメージ増加。
2. seed複数の実`createCombat`で**同一必殺内の1体KO→後続対象はまだ未強化**、既存skillなし対照群と全Hit/crit/HP・Soulが一致。
3. 次の必殺技の各Hitで**スキル発動前後だけダメージ増加**、Hit/critical/乱数の一致。
4. 旧研究フラグOFFのSoultimate結果は変更なし。
5. Lab/School既存6体のMatchProtocol 3seed×2条件で全正規state/replay/ACK不変、オンラインallowlistは研究フラグ拒否。

- **実装・新テスト検証コードSHA `6a6746cf946fbe71648dcfbb8ff50448d6df4b99`**：[研究CI #40931768460](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40931768460) **Node 861/861 PASS、0 fail/skip、自然6vs6耐久・実Chromium UI操作もSUCCESS**。[Firebase Friends noAuth QA #40931768252](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40931768252) **全job SUCCESS**。実RTDB Emulator2席24host auto/ACK・正規state一致、断線復帰、8host action公開遅延、Chromium 2iframe/4画面幅、Google Sites用HTML 76 modulesを未配布build。本番Firebaseの予約済み非ルームキーGET1回だけ（HTTP200、body未閲覧、writeなし）。
- 追加の注釈更新コードSHA `412998198403becf3a68cb61377b349b51eba79a`：実行コード・テストに変化なし。正式CIはこのSHAの実行を別途確認（本行は確証のあるコードrunと区別）。

## 次のV3-4-11優先順位

原作の実戦再現度を重視して、**(a)「ひゃくれつ肉球」5/7ヒット、広範囲攻撃のヒット先決定・演出の一次資料照合、(b) 原作Skill封印とKO後発動タイミングのゲーム内検証、(c) 原作キャラ4技の実戦追加と対戦UI/2席同期**を順に検討。新しいフレームや確率を作り込むより、原作との具体的な相違を埋める。バトルエンジンの骨格やFirebaseを作り直さない。

学校iPad Safari実機2台・前にユーザーが送った原作動画そのもの・本番Google Sites HTML埋込は未検証。main/学校公開HTML/本番Firebase DB/Rules/Auth/Driveへの変更なし。
