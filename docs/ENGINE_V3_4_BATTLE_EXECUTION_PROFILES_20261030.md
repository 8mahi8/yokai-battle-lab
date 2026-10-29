# 妖怪ウォッチ2 対人戦エンジン V3-4-3｜Battle Execution Profileで7体目を実戦へ

2026-10-30 JST。**開発ブランチ限定。原作キャラ/原作技の再現完成ではない。**

## 前工程から解決したこと

- V3-4-1：キャラの`moveIds`4個＋`skillId`で共通のimmutable catalogから技/スキルを解決。7体目の**登録だけ**できた。
- V3-4-2：このcatalogの6体を`createCombat`/`createMatchProtocol`の既存実行入力へ変換、全シードで旧レンタルと完全一致。ただし7体目はSoul容量・複合必殺・Inspiritレベルの出典が揃わないため禁止。
- **今回 V3-4-3：実際の戦闘エンジンを変えずに、不足した設定を明示的な「Battle Execution Profile」としてキャラIDに結び付けた。** この別プロファイルで使えるのは、今のエンジンが実行できる既存Skill/Status/Soultimateに限る。

## 実装

### 追加エンジン

`engine/catalog-battle-profile.mjs`：
- `BATTLE_EXECUTION_PROFILE_SCHEMA=1`
- `validateBattleExecutionProfile(profile)`：`{schema,characterId,evidence,sourceRefs,soultimateRank,soulCapacity,inspiritLevel,special}`の8必須フィールドを明示。Soul容量は既存`soulCapacityForRank`のランク1〜4（100/150/200/250）と一致必須。Inspiritは1〜4。必殺は既存`validateSpecialSpec`で確認。`evidence`はfixture/documented/observed、確認済みと称する場合はsourceRefs必須。追加の未定義バトルパラメーターは拒否。
- `compileBattleProfileCharacter({catalog,characterId,profile})`：カタログ上の**明示されたキャラID**とプロファイルのIDが一致しない場合は拒否。4技をimmutable catalogから引き、攻撃威力/命中回数、妖術のheal/damage・属性、Inspirit符号・対象、必殺の種類/範囲/パワー/状態/未知ヒット数の形を実行可能な既存分類と照合する。
- スキルは現行の`PLAYTEST_SKILL_CATALOG`と一致する**既実装6タイプだけ**。新しくauthoringできた未実装スキルを戦闘効果として扱うことはない。HP/Stat/AI重み/Loafはcharacter定義と同じ単一ソースから取得。経験則や原作未確認の攻撃・反射・ターン時間を推測で追加しない。
- 戻り値は読み取り専用の旧combat member形。**新しい戦闘計算器・イベント形式・乱数・ゲームの公開UIを増やさない。**

### 既存V3-4-2の変換口との接続

`engine/catalog-battle-roster.mjs`の既存`compileCatalogTeamsForCombat({catalog,teamCharacterIds,school})`に任意`executionProfiles`を追加。

- 6体既存レンタル：**そのまま既存の5つのsource resolver/旧実行値完全照合経路**で処理し、任意profileでの上書きを禁止。
- その他の新規創作キャラ：そのIDの`executionProfiles[id]`が明示されている時**のみ**上記のプロフィール→既存battle入力処理を実行。IDを名前や似た能力値から類推しない。
- 2席×6人チーム、各席内6種の重複禁止、`createCombat({teams})`と`createMatchProtocol({battleOptions:{teams}})`で実際に動く。同じ創作キャラのIDは双方のチームに置ける。レンタルがある場合も元の6体はそのまま。
- 本番の友達向けルーム作成フローには**この任意引数をまだ接続しない**。新規の作者プロフィールから学校公開版へ無断で投入しない。

### 7体目の実例

`tests/v3-battle-execution-profile.test.mjs`で「うみねこ（試験用）」という**創作データ**をコンパイルし、既存レンタル「rental-01」の技3種を**参照だけで再利用**。新しい物理技のみ`new-playtest-character:attack`、威力47（fixture）。スキルは既存`skill:momentum`、Soultimateは実装済み`damage/front/power100/attack`をprofileに明示。妖気rank1=100、Inspirit level1の研究用値。これらを『妖怪ウォッチ2原作の7体目の技』と説明してはいけない。

テストで、先頭にこの創作キャラを置き、`giveSoul`→`prepareSoultimate`→`resolveSoultimate`を実行。敵HPへのダメージ・妖気消費と24+自動行動、さらに既存手書きロスターと一致するseeded対戦・オンライン`MatchProtocol`のACK/リプレイを検査。

## QA証拠

- **追加Nodeテスト7件**：プロフィール不正検出／7体目編成・全実行入力一致／実特殊技HPダメージ／seed4種×90行動分の完全戦闘パリティ／seed2種のオンライン試合とjournal replay／不足profileや攻撃設定矛盾・未実装skillの拒否／旧6体ロスター契約維持。
- コードSHA **`0731fd071c2e3e888dcb7af626db58f5636f945c`**：[Research battle unit CI #40921171174](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40921171174)：**Node 814/814件PASS、failure0**、自然6vs6耐久と実Chromium操作ジョブSUCCESS。
- [Firebase Friends noAuth #40921171183](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40921171183)：新しい制作機能が既存の学校オンライン2席/RTDBエミュ/Google Sites未配布HTMLの動作を変えないことを確かめる正式統合ジョブ。最終結果はrunの状態を見ること。
- 元の6体やseedによる戦闘コードは変更ゼロ。登録できる必殺効果は`engine/special-effects.mjs`がすでに対応している研究用8種。**ノーモーション・原作の正確な演出フレーム数・3回以上のサークル回転による対象変更には触らない。**

## 原作資料との区別・技レベルの注意

- [Mt. Wildwood, Soultimates (YKW2)](https://www.mtwildwood.net/soultimates.php?g=yw2)によれば、必殺技のランク1〜4の基本Soulポイントは**100/150/200/250**。今回の`soulCapacityForRank`もそのランク基本値を参照する。
- **ただし同じ資料では、技のレベル成長と成長タイプによって、技威力や必要妖気への補正があることも説明される**。今回の`Battle Execution Profile`は学校レンタルで育成を省いた固定ランクの実行用入力であり、技レベル1〜10やその必要妖気補正、個別の正確な原作技威力は**実装も検証もしていない**。
- [Mt. Wildwood, Soultimate Charge](https://mtwildwood.net/soultimate-charge.php)にはチャージ中断確率も整理されているが、追加キャラの中断補正を個別に推定する根拠にはしていない。既存戦闘エンジンのsource backed baselineとplaytest fixtureを混同しない。

## 次の工程（V3-4-4）

1. 必殺の`damageKind`や`statusLevel`など、今はexecutionProfile側にある追加情報を**move masterが唯一所有するための段階的schema更新**を検討。新実装と旧resolverで同じsource値を保つ。複雑なSoultimateほど、効果の階層化/検証不足を可視化する。
2. 現行の7体目は**登録＋明示profileによる研究用試合**に限る。学校用選択UIとキャラ固有イラストは未実装。原作の正確な妖怪・技を調査し、動かせると確認した技から徐々に追加する。
3. 最後にV3-5として元動画・学校Safari iPad実機2台、通信・演出UIを検証。main・学校公開版・本番Firebase Rules/DB/Auth・Driveには本人から具体的な依頼が来るまで変更しない。
