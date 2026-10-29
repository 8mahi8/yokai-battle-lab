# 妖怪ウォッチ2 Engine V3-4-8｜ジバニャン「しびれるお札」レベル2とすばやさ低下・行動時計

最終更新 2026-10-30 JST。対象：開発ブランチ `feat/phase1-action-circle-lab-20261023`。本番Google Sitesに配る対戦の調整ではなく、**既存戦闘エンジンで原作の効果を研究する独立オプトイン**。

## 外部根拠（原作 YW2 と他作品を混同しない）

- [攻略大百科／ジバニャン(YW2)](https://gamepedia.jp/youkai-yw2/monsters/272)、[Game8](https://game8.jp/youkai-watch2/497000)、[game-cap](https://game-cap.com/youkaiwatch2/data/youkai_jibanyan.html)：とりつき「しびれるお札」はすばやさを下げる。
- [Mt. Wildwood／Jibanyan YKW2](https://mtwildwood.net/yw2/yokai/jibanyan) と [Inspirits YKW2](https://mtwildwood.net/inspirits.php?g=yw2)：Slow Down（しびれるお札）は**SPD down・レベル2**、効果は**Speed×0.7**。負のとりつきは通常、浄化されるか戦闘終了まで**持続**。
- [Stat Changes YKW2](https://mtwildwood.net/stat-changes.php?g=yw2)：ステータス変化の2段階減少は**×0.7**。原作の命中式や行動順はSPDと関係するが、**付与時点で既に積んでいたウェイトを原作が具体的に何point調整するかは未確定**。
- [Turn Order（YW2表）](https://mtwildwood.net/turn-order.php)：素早さから次の行動までの待ち時間/コストを導く。今回新たな実秒換算/アニメーションmsは導入しない。

## 実装したこと（既存レガシー経路へ追記だけ）

- **研究用原作データ** `content/yw2-original-reference-pack.mjs`：ジバニャンのinspiritに source-backed `level:{status:'documented',value:2,sourceIds:['jibanyan_mtw']}` を追加。`content/yw2-source-intake.mjs`が「status move以外のlevel禁止」「不正レベル拒否」「未解決は未解決」を検証する。
- **研究キャラ** `content/yw2-jibanyan-normal-moves-lab.mjs`：既存の`buildJibanyanNormalMoveLab({includeSpeedDown:true})`のみ**3技原作由来**になる。通常攻撃10×2/火花の術20火属性は維持し、別の新しい`inspirit`技をmasterへ1件登録。status `speed-down`、negative、単体敵、Level2、0 damage hitsで、名前とレベルのURL sourceRefsを保持。**Soultimateは依然としてfixture**、性格/命中耐性/Skill量/未確認の演出は原作準拠を主張しない。オプションを付けない既存モードの原作技2種/24技fixtureの挙動は変わらない。
- **共通ステータス** `content/inspirit-effect-master.mjs`の既存分類に`speed-down`を追加。 `engine/damage-model.mjs`の`deriveStatStage(statuses,'speed')`と既存の`statStageMultiplier(-2)=0.7`を共有。別の状態/数値定義辞書は作らない。
- **共通行動時計** `engine/phase1.mjs`：`clock.setEffectiveSpeed(id,newSpeed)`を提供。既存の`waitCostFromSpeed`で**次の行動リチャージ用cost**を更新する。既に溜まった`wait`、`turn`、`pointsElapsed`、乱数消費を巻き戻さない。`clock.predict`は更新後のcostを読む。開始済み待ち時間の即時再配分は**暫定fixture仮説**として意図的に未実装。
- **戦闘** `engine/combat.mjs`：`researchSpeedInspirit:true`は**明示custom teams + researchDamageModel**でだけ有効。既存のStatusLedgerに負の`speed-down`を投入すると、共通`effects.commitStatus`→`syncCanAct`からそのactorの**時計速度だけ`Math.floor(baseSpeed * statStageMultiplier(-2))`に変更**。素のキャラ基本SPD/HPは書き換えない。負ステータスは既存Ledgerのpersistent挙動を利用し、`purify(side,id)`成功時に時計速度・costを元へ戻す。通常の敵AIが選ぶInspirit経路にも対応。研究フラグなしのゲームでは、speed-downを使用しようとすると拒否する。
- **完全な原作再現とは別**：負のとりつきの耐性/命中の絶対値・複数デバフのスタック、付与瞬間に溜まっていた行動待ち時間の修正、Speedステータスによる攻撃命中率への波及、原作モーション、学校Safari実機2台での挙動は別途確認する。特にSpeed低下と命中率の連携は**今回の研究用モデルではまだ未対応**。この制限を意図的に明記する。

## テスト

新規 `tests/v3-yw2-speed-down-clock.test.mjs` **6件**：
1. 実原作研究moveのLevel2、source、ダメージなし、負status、以前の通常2技の無変更。
2. Stat -2＝0.7と時計コスト再計算。現在のwait/RNG/turnを保持。戻せば元の時計完全一致。
3. 実`createCombat`でLevel2 status適用→時計SPD165→floor(165×0.7)=115、persistentで35行動後も持続、ベンチでのPurify後は165に戻る。
4. HP/基本statを変えずclockだけ変える。不正flag/sign/level拒否。
5. 原作Level未確定/不正入力はfail closed、無条件に試験値を作らない。
6. 既存Lab/Schoolレンタル両方×3 seedで、試験データ読込前後の`MatchProtocol`/ハッシュ/ジャーナルを同じ結果に維持。オンライン研究flagは元の厳格な`checkOptions`契約で拒否し、Firebaseへ有効化しない。

初回CIでは旧テストが元Inspirit 7種に個数固定していた点と、原作試験でreverseしたB6を旧同位置のB4と比較した点で**2つのテスト期待値が失敗**。新6件の中心機能テストは最初から通過し、既存のルールを変えずにテスト前提を訂正して正式CI再実行。

**正式検証対象コードSHA `7bbdcf9f0f3b4b8e5b6256cf0a2b5e169a7b2c0e`**：[Research battle unit tests #40929350968](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40929350968) **Node 849/849 PASS、fail 0、skip 0**。自然6vs6耐久試合と実Chromium操作も全job SUCCESS。[Firebase Friends QA #40929351028](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40929351028)は**全job SUCCESS**。実RTDB Emulator2席で24 host行動/ACK・正規snapshot完全一致、切断復帰、8 host行動分の公開遅延、Chromium 2iframe/4埋め込み幅、Google Sites用**未配布**HTML build（76 modules）と期限Rules別EmulatorもPASS。本番Firebaseは予約済み非ルームキーへのGET1回HTTP200のみ（本文未閲覧、書込なし）。

## 次にやること

**V3-4-9**は「Speed↓が命中率の計算/相手の行動順へどのように波及するか」の原作資料と現行エンジンの差を確認し、**現在のwaitの再配分を推測で確定しないまま**、根拠が立つ数値からエンジン共通計算へ接続。ここまでの原作ジバニャンの技は3/4（必殺技は5hit対7hit文献衝突が未解決）。本家SkillのSeal、正確なAI/乱数・装備/性格、原作動画フレーム/実機Safariは未完。**V3-5オンライン本番への新キャラ導入はまだ実施しない**。

main・公開HTML・本番Firebase DB/Rules/Auth・Driveは一切変更しない。Draft PR #1上の開発ブランチのみ。
