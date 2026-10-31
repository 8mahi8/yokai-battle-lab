# 妖怪ウォッチ2 エンジン V3-4-6｜ジバニャン「まえのめり」KO発火粒度の原作照合

2026-10-30 JST。**原作の資料で確認できる発火規則を、研究用custom戦闘でだけ実装**。学校向け6体固定レンタル・現行の対戦ネットワークには反映していない。

## 調査：資料のゲーム版を必ず区別する

- [攻略大百科 ジバニャン（YW2）](https://gamepedia.jp/youkai-yw2/monsters/272)：Skill「まえのめり」は敵撃破で攻撃ちからが上がる。通常攻撃「するどいつめ」10×2、火花の術20、ひゃくれつ肉球20×5と表記。
- [Game8 ジバニャン（YW2）](https://game8.jp/youkai-watch2/497000)：敵撃破で攻撃力がアップ。Lv99基準値 HP322/STR153/SPR90/DEF108/SPD165。
- [game-cap ジバニャン（YW2）](https://game-cap.com/youkaiwatch2/data/youkai_jibanyan.html)：敵撃破後5ターンの力/妖力上昇、ひゃくれつ肉球20×5。
- [Mt. Wildwood ジバニャン（YW2の欄）](https://mtwildwood.net/yw2/yokai/jibanyan)：**同じ行動で複数体を倒してもSkill発動は1回**、Skillが封じられた状態や持ち主が倒れた時は発動しないと記述。STR/SPRが2段階、5回の行動にわたり上昇するとの研究値。20×7ヒットと記載。
- **注意点**：Mt. Wildwoodの同一ページにはYW1・YW2・YW3の3作品が続けて載っている。YW2欄のLv99値は**HP322/STR153/SPR90/DEF108/SPD165**でGame8と一致する。別作品のLv99値を参照した「この2サイトは能力値が食い違う」という途中の見解は**誤読のため撤回**する。
- **ひゃくれつ肉球の5 vs 7ヒットは未解決**。公式の実機動画/ゲーム版パッチの実測なしに20×5/20×7のどちらも選ばず、既存`YW2_ORIGINAL_REFERENCE_INDEX`の`disputed`のままにする。原作の必殺ヒット数を本番UI/サーバー計算に入れていない。
- Skillの条件自体は複数資料で確認できたが、**詳細な発火/持続タイミングの対戦中の3DSフレーム観察はまだ無い**。他スキル効果によるKO/Skill封印を含む実戦細部は留保。現在`SKILL_TRIAL`の実行値は既存のfixtureであり、対戦中の演出秒数を証明しない。

## 実装：KOの処理を「敵1体ごと」から「1回の行動」へ制限するオプション

- `engine/skill-hook-pipeline.mjs`：`createSkillHookPipeline(...,sourceYw2Momentum:false)`を追加。ホストに**1回の解決処理の境界を示す`beginResolution()`**を追加。オプトイン時は同一解決中の`momentum`発動はキャスターにつき1回。別の行動や必殺の解決では別扱い。キャスターHP0の場合は発動しない。
- `engine/combat.mjs`：`createCombat({researchYw2Momentum:true,teams:[...],enableRentalSkills:true,researchSpecialEffects:true})`で初めて有効。自動行動の開始時と手動必殺技の効果解決開始時に`beginResolution()`。既存`KnockoutLifecycle`のKO確定・カウンター、`EffectCommitter`のHP/damage/RNG、同じ`SKILL_TRIAL`の能力上昇数値/残り行動数、全Game snapshot形式に**変更なし**。
- オンライン`MatchProtocol`の`checkOptions`は`enableRentalSkills`や`researchYw2Momentum`などの研究オプションを拒否する厳密な契約を**維持**した。学校版/本番Firebaseの処理・表示は一切変わらない。将来オンラインで原作スキルとして採用するなら、全旧レンタル/任意Skillの準拠確認の上で、別のプロトコル承認・実通信QAが必要。
- 旧`sourceYw2Momentum:false`では**複数KOに対して発動イベントが複数個になる従来の挙動を保存**する。ただし原作研究モードでは1回に抑制するため、イベント数と正規eventId通番は変わる。ダメージ/妖気/HP/相手のKO数は変えない。

## 自動検証

`tests/v3-yw2-momentum-ko-scope.test.mjs`新規7件：
1. 同一解決で3体KO通知が来てもSkill発動は1回だけ。
2. 別解決なら5回の所有者行動の残りを刷新。新規発火した行動で誤って1を減らさない。
3. HP0のスキル持ち主は発火しない。
4. デフォルトの従来スキルフック挙動は維持。
5. 実`createCombat`で**必殺全体攻撃→2体以上の実KO**を発生させ、KO数に対して発動1回と残り5を確認（対象HPや命中乱数の結果はfixtureで、3体必ずKOするとは決めつけない）。
6. 同じseedの旧/研究モードで、HP/Soul/KO/必殺の効果ペイロードが一致し、差はSkillのイベント件数とその結果のイベント通番のみ。
7. デフォルトの研究フラグ不使用・不正な研究オプションの拒否・初期オンライン契約の研究フラグ拒否。

初回テストの失敗は、命中乱数により3体でなく2体KOしたのに必ず3体KOとしたテスト前提と、オンラインへ研究オプションを通そうとしたテスト条件によるもの。次のCIでは修正した。イベント数の差による**eventId通番のずれは正常**であり、HPと必殺の効果ペイロードのみ厳密比較した。

## GitHub Actions 正式ゲート

- 合格対象コード SHA：`6e6d5bed7913d9f25ca52a77f71e861a6be9e84e`。文書のみの後続コミットとは区別する。
- [Research battle unit tests #40926608857](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40926608857) **全job SUCCESS：Node 836/836 PASS、fail 0、skip 0**。新7件（1KOイベント/同一行動3KO、再KO更新、死んだ持ち主、旧レンタル不変、実戦複数KO、HP/RNG比較、onlineオプション拒否）、自然6v6 endurance、ChromiumのZero Poke/Soul/カウンター操作も合格。
- [Phase37 Firebase friends noAuth QA #40926608821](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40926608821) **全job SUCCESS**。Google Sites用未配布HTML build（76 modules/297,831 bytes）、実Firebase RTDB Emulatorで2席/24 host行動/ACK/正規state一致、切断復帰、publish遅延8行動、Chromium2iframe 4埋め込み幅すべて成功。本番Firebaseは予約済み**非ルームキーGET1回（HTTP200、本文は閲覧せず書込0）**のみ。
- 3回のCIが必要だった理由：(a)テストが「乱数があっても必ず3体KO」を仮定していた、(b)オンラインで未承認の研究オプションを要求していた、(c)Skill発火数が変わるためeventId通番が変化するのに、通番まで旧モードと同一を要求していた。**どれも旧オンライン契約を壊さず、戦闘ペイロードの比較とテスト期待だけを適正化**して全件合格。
- 完成保証ではない：物理学校iPad Safari 2台/実Google Sites埋込、原作ゲーム動画の本体、実原作3DSでの複合KO/効果解除のフレーム比較はまだ実施していない。

## 継続する作業

1. **ジバニャン通常攻撃10×2（確認済み）**を、原作キャラ用のデータ駆動戦闘inputへ安全に通す。原作数値HP等はLv99基準条件の違いに留意し、未検証のAI性格/回避/とりつきエンジンへ推測値を入れて「原作再現済み」としない。
2. ひゃくれつ肉球の5×7争点を、3DS対戦映像/同版数値解析の一次情報からさらに照合。**hitCountの候補を確定仕様として実行しない**。演出中の各ヒット時刻・処理対象のロックは別途実測する。
3. 最初の実在キャラを2席対戦に入れる前に、全技/Skill/性格AI/KO/技レベル/表示IDを共通catalog/MoveEffectPlanへ通す。元の学校レンタル6体、本番Firebaseは無変更。

**現在地：V3-4-6 「まえのめり」の研究用KO粒度を実戦エンジンへ実装。原作ジバニャン全技の実戦再現・学校試遊は未完。** 原作動画本体・学校Safari iPad2台の直接試験は未実施。
