# 妖怪ウォッチ2再現｜V3-4-15 原作キャラID → 出典付きスキル定義 → 既存の行動制限へ

2026-10-30 JST。開発ブランチ`feat/phase1-action-circle-lab-20261023`限定。学校で友達が遊ぶGoogle Sitesの直接貼付HTMLは変更しない。

## 原作資料（YW2を明示する）

- [Mt. Wildwood Wazzat YW2欄](https://www.mtwildwood.net/yw2/yokai/wazzat)と[Houzzat YW2欄](https://www.mtwildwood.net/yw2/yokai/houzzat)：両方が **Forgot to Guard** を持ち、戦闘中は両陣営がガードを**選択しなくなる**。複数の効果は重複しない。ページにはYW1/YW2/YW3欄が同居するので、**YW3の「封印中でも継続」までYW2へ無根拠転用しない**。
- [Mt. Wildwood 旧メダリウム Wazzat（YW2）](https://mtwildwood.net/yokaiMedallium/yokaiWazzat.html)、[Houzzat（YW2）](https://mtwildwood.net/yokaiMedallium/yokaiHouzzat.html)：スキルは**持ち主が後衛にいても発動**。
- [Game8 メゾン・ドワスレ YW2](https://game8.jp/youkai-watch2/496843)、[攻略大百科](https://gamepedia.jp/youkai-yw2/monsters/185)、[わすれん帽](https://3dsnote.com/youkai2/wasurenbou/)：和名は**まもりわすれ**、両陣営がガードしなくなる。キャラはそれぞれ原作**わすれん帽（Wazzat）とメゾン・ドワスレ（Houzzat）**であり、ジバニャンが同スキルを持つという意味ではない。
- [YW2 Attitudes](https://mtwildwood.net/attitudes.php?g=yw2)：性格の倍率をかけた後にスキルによる行動禁止を適用。V3-4-14の`applyYw2ActionOverrides`／`pickAction`は既にこの契約で実装済み。
- **未確定**：原作YW2のスキル封印が「まもりわすれ」を止めるか、アニメーションのどのフレームで持ち主KOが影響するか。特に**YW3の封印時挙動をYW2の実証として主張しない**。研究用エンジンは生存中/後衛発動・KO後停止の保守的なモデル。原作3DSの実機フレーム検証は別途。

## 実装（重複実装せず既存のマスター/選択器を活用）

- `content/yw2-original-action-skill-master.mjs`：新規**1件だけの共有skill** `yw2:skill:mamoriwasure`。和名・効果`forgot-to-guard`・対象`both_teams`・生存中の後衛有効`while_alive_including_bench`・非スタック・YW2出典URLをdeep frozen。原作所有者は**`yw2:wazzat`と`yw2:houzzat`**の2IDのみ。二者は同じSkillオブジェクトを参照し、キャラ別に同じ効果コードや効果パラメータをコピーしない。未登録の`yw2:jibanyan`などのSkill所有者推測は拒否。
- `engine/combat.mjs`：研究用custom `teams` の`sourceYw2CharacterId`（例`yw2:wazzat`）を共通マスターで解決して既存の`researchActionOverrideSkill='forgot-to-guard'`へ**自動投影**。`sourceYw2SkillId`と原作キャラIDを実戦状態に保存し、後衛・KO/アクティブ判定は**V3-4-14で完成している唯一の選択経路**を利用。`sourceYw2CharacterId`と手書き`researchActionOverrideSkill`を同時指定すると競合として拒否。追加RNG/独自ルーム・別のスキル実行系を作らない。
- **データ境界**：`sourceYw2CharacterId`を付けた研究ユニットは**まだ原作Wazzat/Houzzatの完全キャラではない**。技4枠、Lv99能力/耐性、性格AI、Soultimate等は**元の仮レンタルfixtureのまま**。今回のマスターが証明するのは**スキル所有と効果のみ**。後に実際のキャラの全4技と公式/資料付きStatsを`CombatCatalog`へ登録する時、同じSkill IDを再利用できる。原作キャラ選択画面・学校ロビーにこの2体はまだ未登場。
- 通常の6体・オンライン`MatchProtocol`は`researchYw2ActionOverrides`を使わず、原作スキルのresearch入力が無いので全く不変。Firebase Security Rules/Auth/DB/接続方法に手を加えない。前工程のPacifist/Chatty研究タグは出典付きの**正式所有者IDとの結合はまだない**ためそのまま研究専用に残す。

## 自動検証

新規`tests/v3-yw2-original-skill-owner-bridge.test.mjs` **7件**：
1. Wazzat/Houzzat双方が**一つのdocumented skillオブジェクト**を参照、immutable、owner別YW2出典。
2. 原作ID`yw2:wazzat`を**後衛A6**へ付け、前衛の両陣営が実戦100行動以上でガードを選ばないこと。
3. 原作ID`yw2:houzzat`を後衛B6へ付けても同じseedの同一効果とRNG/HP/イベント結果（原作IDの記録だけは異なる）。
4. 所有者がKOされた時に**他の所有者がいなければガードが復帰**。
5. Skillが出典付きでも技/基礎能力が自動的に原作値へ置換されず、fixtureを保持すること。
6. 誤ったowner、手動overrideとの競合、研究flag無し、通常onlineでの研究flag要求を拒否。
7. 元6体Lab/School×3seedの試合/Journal replay全一致。

最初のCIでテスト用Soultimate威力を`1000`に設定して**既存入力の上限999に拒否**された（実装バグではなくテスト条件ミス）。エンジン入力仕様を変更せず威力`999`へテストのみ修正。

- **正式コード/テストSHA `21a8654099997392eb1de4533b2be9407bd74461`**：[Research battle unit tests #40972019512](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40972019512) **全job SUCCESS、Node 895/895 PASS、fail0/skip0**。自然6vs6耐久、実Chromiumで零式つつく・妖気移動・カウンター輪の操作もSUCCESS。
- [Phase37 Firebase friends noAuth #40972019539](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40972019539) **全job SUCCESS**。実Firebase RTDB Emulatorで2席24ホスト行動/ACK・正規snapshot一致、切断再接続・再送冪等、8ホスト行動の公開遅延/正しいACK順序、実Chromium 2iframe/4埋込幅、学校用**未配布**inline HTML build（77 source modules）全PASS。本番Firebaseでは予約済み非ルームキーGET1回の**HTTP200（body未閲覧、write0）**だけ。
- このCIは学校Safari iPad実機2台の試験/本番Google Sites更新ではない。

## ロードマップと次

**V3-4-15：原作のスキル所有者IDと既存Skill効果の出典付き自動接続**。次V3-4-16の優先候補は、原作わすれん帽の**攻撃/妖術/とりつき/必殺技（良効果解除）の技マスター統合**または原作Wazzat/Houzzatの完全なスキル/AI一体化。元動画/学校iPad Safari2台の直接検証は別途。ジバニャンの必殺技20×5/20×7資料不一致、KOタイミング/SkillSealのYW2証拠は引き続き未解決。無根拠な特殊対策を増やさず、実際の原作戦闘完成を優先。

GitHub main、Google Sitesの直接貼付HTML、本番Firebase DB/Rules/Auth、Google Driveは変更せず。GitHub開発ブランチ+Draft PR #1に記録。
