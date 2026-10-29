# 妖怪ウォッチ2対戦再現｜V3-4-5 原作資料の初回取込・出典別データパック

2026-10-30 JST。**原作の事実に基づく研究用データ**と、これまでの**仮のレンタル6体の戦闘数値**を明確に分ける。GitHub開発ブランチのみ作業し、main/学校公開版/本番Firebase/Driveに変更なし。

## 目的と現在の限界

V3-4-1〜4で、キャラ/4技/SkillのID参照、Soulランク、複合必殺、とりつきlevelの共通データ化が進み、創作7体目は既存の戦闘ハンドラで対戦できるようになった。**しかし現行6体は原作の実キャラではなく、fixtureであり、そのままでは原作忠実再現ではない。**

今回、初めて実際の『妖怪ウォッチ2 元祖/本家/真打』の**ジバニャン（No.135）**と**コマさん（No.142）**の固有技・Skill・研究値について、根拠リンクと食い違いの扱いをデータ化した。

## 参考資料（直接確認済）

- [攻略大百科｜妖怪ウォッチ2 ジバニャン](https://gamepedia.jp/youkai-yw2/monsters/272)：技・Skillの日本語名、こうげき10×2、火花の術20、ひゃくれつ肉球20×5。
- [Game8｜ジバニャン](https://game8.jp/youkai-watch2/497000)：Lv99基準ステータスHP322/ちから153/ようりょく90/まもり108/すばやさ165。日本語名/ランク/種族と照合。
- [game-cap｜ジバニャン](https://game-cap.com/youkaiwatch2/data/youkai_jibanyan.html)：ひゃくれつ肉球20×5と技名、レベル別データ。
- [Mt. Wildwood｜ジバニャン(YW2)](https://mtwildwood.net/ja/yw2/yokai/jibanyan)：各種効果とステータスの詳細。ただし**ひゃくれつ肉球を20×7と記載**し、国内資料の20×5と食い違う。Skill「まえのめり」の詳細も日本語の短い説明より範囲が広い（ちから・妖力2段階、5回行動）。
- [攻略大百科｜妖怪ウォッチ2 コマさん](https://gamepedia.jp/youkai-yw2/monsters/279)：パンチ15、火炎の術50、やけどさせる、とりつきHP持続減少、ひとだま乱舞100×1、隣の「うん」条件のSkill「あ」。
- [妖怪ウォッチ2 攻略データベース｜コマさん](https://gameconductor.com/yw2/jiten/detail/?no=265)：上記の技威力/名/Skill対象の独立照合。
- [Game8｜コマさん](https://game8.jp/youkai-watch2/497002) と [game-cap｜コマさん](https://game-cap.com/youkaiwatch2/data/youkai_komasan.html)：Lv99のステータスが各々HP310/103/162/114/149とHP321/112/171/120/157で違う。条件（個体値・性格・育成補正）の違いの可能性があるため、**数値の選択を保留**する。

これらはいずれも第三者の攻略・解析資料であり**原作のゲーム内画面を本工程で直接測定したものではない**。元のユーザー提供動画の本体もここで視聴できていない。1つの攻略サイトを無条件の真実として扱わない。

## 実装

### 研究用データを既存のゲーム本体と隔離

- 新規 `content/yw2-source-intake.mjs`：汎用`createYw2SourceIndex({sources,characters})`。各妖怪は`game:'yw2'`、研究用ID（`yw2:jibanyan`/ `yw2:komasan`）、表示名・ランク・種族、技4枠のラベル/威力/ヒット数/属性/効果、Skillのラベル/効果、HP・ちから・ようりょく・まもり・すばやさに対し、**情報ごとのsourceIds**を保持する。
- 根拠の状態は**documented / disputed / unknown**の3つ。documentedは1つの出典付き主張、disputedは値の異なる2つ以上の出典付き主張を必須にする。未知に値を推測で割り当てない。技名と妖怪のIDにもsourceRefs必須。競合・捏造・未引用はカタログ作成前に拒否。
- 新規 `content/yw2-original-reference-pack.mjs`：上記の2体8技+2Skillと出典URLを実データとして登録。単に名前を列挙した手順書でなく、ES modulesでインポート・検証できる共通データ。
- UI側で使える`YW2_ORIGINAL_REFERENCE_INDEX.getPreview(id)`を提供。妖怪名、ランク、種族、4技名、Skill名、出典から確定できたLv99基準数値、競合中の項目名を**読み取り専用**で返す。`battleReady:false`を強制し、今のレンタルロビーに勝手に出さない。
- **必須の研究留保**：ジバニャン必殺技`soultimate.hits`は**disputed {5,7}**、確定数null。Skill「まえのめり」の正確な2ステータス・段階・持続も元の日本語説明と解析資料で表現が違うため詳細はdisputed。コマさんの基準Lv99ステータスも文献間の値の差をdisputedとして保留。どの争点も戦闘結果には投入しない。
- 原作のスプライト・画像・動画・長い説明文はコピーしていない。Google Sitesや対戦UIを変更しない。**見た目のデータを読めるところまで**であり、原作モデルやモーション再現を終えたという意味ではない。

### テスト結果

新規 `tests/v3-original-yw2-research-source-pack.test.mjs` **7件**：
1. 原作2体の名前・ランク・種族・4技名・Skill名と、既存6体の研究キャラIDと明確に区別。
2. ジバニャンのLv99・10×2・火花の術20と、20×5 vs 20×7、Skill詳細がconflictのまま残ること。
3. コマさんの15/50/100×1の技とSkill「あ」、Lv99違いを勝手に1案へ確定しないこと。
4. 原作ID・技名・数値・状態・Skillのすべてに出典URLが存在すること。
5. 未引用の主張、偽の合意、架空の威力と重複キャラをfail-closed。
6. 入力を外部から変更しても保存済みの参照・表示は不変、各値のObject.freeze。
7. Lab/School両方×seed3種類の既存`MatchProtocol`で最大85行動とsnapshot/journalを比較し、**原作情報の追加によって既存の対戦結果・RNG・通信形式が変わらない**こと。

検証済コードSHA：`95bdc419c79155d0e59a59923322203c7a064fb8`。
- [Research Battle CI #40924463234](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40924463234) **Node 829/829 PASS、失敗0**、自然6vs6対戦と実Chromium研究画面操作もSUCCESS。
- [Firebase Friends no-Auth CI #40924462820](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40924462820) **全Job SUCCESS**。RTCではなくFirebase RTDB Emulatorで2席・24行動ACK・正規snapshot parity、再接続、publish遅延、実Chromium2iframe/4幅、Google Sites未配布HTMLビルド76 modulesすべてPASS。本番Firebaseへ予約済み非ルームキーGET1回200のみ、本文は見ず、書込・ルール変更なし。

## 次の実装 V3-4-6

単にデータ登録件数を増やさない。まず**ジバニャンのSkill発火条件「敵を倒すとパワー上昇」、通常の10×2攻撃とひゃくれつ肉球のヒット処理**について、同じゲーム版の実機資料・対戦動画と照合して争点を解決する。とくに20×5対20×7を原作と断言しない。エンジンがまだ実行できない能力は、新しい技を`documented`としてデータに持っていても**未実装**として扱う。

合意できる仕様が揃った最初の妖怪に対して、研究用reference ID → generic `YokaiDefinition` → generic authoring Skill/Move → battle actorの**変換・実行契約**を進める。現行6体のfixtureは原作と混同・上書きせず、別の原作再現用6人パーティとして段階的に検証する。未確認の見た目や動画フレーム・学校Safari iPad2台と実Google SitesのQAはV3-5。

**現在地 V3-4-5 研究用出典パック完了。V3-4原作キャラの戦闘実装はまだ未完。**  main/学校公開HTML/Firebase本番DB・Rules・Auth/Drive変更なし。Draft PR #1維持。
