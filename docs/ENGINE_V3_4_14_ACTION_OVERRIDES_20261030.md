# 妖怪ウォッチ2再現｜V3-4-14 原作行動制限の研究用実戦統合

2026-10-30 JST。GitHub開発ブランチ `feat/phase1-action-circle-lab-20261023`。**学校Google Sites直接貼付HTML、main、本番Firebase、Driveは未変更**。

## 原作調査（各作品の記述を取り違えない）

- [Mt. Wildwood／Attitudes YW2](https://mtwildwood.net/attitudes.php?g=yw2) の「How a Yo-kai picks its action」：**(1)サボり判定 → (2)4種類の基本行動重み → (3)Attitudeルールを上から最初の1件だけ適用 → (4)全体/個人のスキル上書きによる行動禁止・強制 → (5)残った重みから抽選**。overrideとして「Forgot to Guard がいれば両側ガード禁止」「Pacifist はガード固定」「Chatty がいれば両側妖術禁止」「味方前衛全員HP満タンなら回復妖術は選ばれない」と説明。
- [Wazzat YW2](https://mtwildwood.net/yw2/yokai/wazzat) と [Houzzat YW2](https://mtwildwood.net/yw2/yokai/houzzat)：**Forgot to Guardは両陣営に作用**。[古い原作2のMedallium記録／Wazzat](https://mtwildwood.net/yokaiMedallium/yokaiWazzat.html)は**後衛でも発動**と明記。Wazzatの旧詳細ページではForgot to Guardがある場合Pacifist妖怪は攻撃・妖術・とりつきへ戻る、と説明。**「Pacifistなら必ずガード」は「Forgot to Guardが無いとき」に限る**。
- 本ソースはファンによる解析・実測であり、原作3DSの全条件を動画1フレーム単位で検証したものではない。特に「スキル封印中」・「KO後に効果が消える細かい境界」の根拠を全作品で同一と仮定しない。今回は**研究用モデルとして生存中のみ有効**。完全な原作SkillSeal/装備による継承/Skill ID登録は未実装。

## 設計判断：新しいAI抽選・Skillシステムを作らない

- `engine/selection.mjs`に純粋関数`applyYw2ActionOverrides(weights,{forgotToGuard,pacifist,chatty,healingTechnique,allAlliesFull})`を追加。既存`actionWeights`のAttitude倍率の後で**1回だけ**適用し、既存`pickAction`（乱数消費は1回）を引き続き利用する。
- **優先順位**：(a) Forgot to GuardがあればGuardの重み0、(b) それが無い時に限りPacifistはGuardの重みだけ1に固定、(c) ChattyはTechniqueの重み0、(d) HP満タンの味方に対する回復妖術も重み0。態度倍率でTechniqueやGuardが増えていても最後に上書きされる。
- 全候補の重みが0になるような不自然な**明示研究編成（Guard 100%なのにForgot to Guard等）**では研究用安全fallbackとしてAttack 1へ固定。**原作で同じように処理されるという確証はない**。極端なfixture用であり、現実の原作キャラに新ルールとして適用しない。
- `engine/combat.mjs`：`createCombat({teams, researchYw2ActionOverrides:true})`が必要。custom `teams`メンバーの`researchActionOverrideSkill`を`'forgot-to-guard' | 'pacifist' | 'chatty'`に限定して厳格検証する。これは**原作の持ち主IDを認証した実スキルマスターではなく、原作効果を試すための研究ラベル**。既存`skill`はPlaytestSkillとしてそのまま保持し、二重Skill効果へ昇格させない。
- `choice(actor)`では両チームの現`squads.flat()`の生存者にForgot to Guard/Chattyが存在するか確認。**前衛・後衛を問わず**研究用に両チームの行動抽選へ適用。Pacifistはその所有者自身にだけ適用。生存判定を毎行動行うため、KO後の抑制はスナップショット実装で観測可能。回復Techniqueの既存HP満タン禁止は保持。
- `researchYw2ActionOverrides:false`の場合は一切新しい効果を使わず、通常6体のAI・乱数・試合state/journal/通信契約は維持。研究ラベルを持つカスタム試合をフラグ無しで起動した場合は**明示的に拒否**。本番オンライン`MatchProtocol`の厳格なオプションallowlistは研究フラグを引き続き拒否。Firebase Security Rules/Authや接続方式は変更しない。

## 自動テスト・正式CI

新規`tests/v3-yw2-action-override-skills.test.mjs` **8件**：
1. 性格倍率の後にForgot to GuardでGuardを抑制し、研究フラグOFFでは旧AI重みを保持。
2. Pacifist単独でGuard固定、Forgot to Guard併存時にはGuard禁止が優先（Chattyとの組み合わせも含む）。
3. 後衛のChattyにより両チームの妖術が禁止され、回復妖術にも例外を作らない。
4. 味方前衛全員HP満タン時の回復妖術禁止と、選択肢全部0になる特殊fixtureの安全fallback。
5. 実`createCombat`の6vs6で**A6（後衛）にForgot to Guard→両側の前衛がGuard不可**、130行動試験。
6. 実`createCombat`でPacifist本人がGuard固定、B6（後衛）Chattyで両チームTechnique不可、複数seed/実自動行動。
7. 未対応スキル値/フラグ無し編成/学校オンライン研究フラグ禁止のfail closed。
8. 従来6体Lab/School×3seed `MatchProtocol`正規stateとjournal replayの一致、通常`createCombat`でflag OFFの厳密seed parity。

- **検証コードSHA `6d686950ca12456c447cf967d93acea79c5de700`**：[Research battle unit tests #40940737598](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40940737598) **Node 888/888 PASS, fail0, skip0**、自然6vs6耐久/実Chromiumで零式つつく・Soul移動・カウンター輪操作もSUCCESS。
- [Phase37 Firebase Friends noAuth QA #40940737588](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40940737588) **全job SUCCESS**。本物のFirebase RTDB Emulatorで認証なし2席/24 host auto/ACK/正規state一致、ゲスト切断復帰/再送冪等、8 host行動の公開遅延と正規順序ACK、実Chromium2 iframeと4種類の埋め込み幅、Google Sites用**未配布**inline HTML build（76 modules）すべて合格。本番Firebaseへは予約済み非ルームキーGET1回のみ（HTTP200、本文未閲覧・書込0）。
- **学校Safari実機2台、ユーザー提供の3DS動画のフレーム単位比較はまだ未実施**。CI成功と学校版の完成は同じではない。

## ロードマップ・次工程

**V3-4-14：原作行動制限を研究用AI・実戦へ接続しテスト済み。まだ原作全キャラの正式Skill/状態/AI再現ではない。**

次V3-4-15では、新しく追加した研究ラベルをむやみに増やすのではなく、**実際の原作キャラにSkillマスターとして書かれた値から有効なpassive判定を導出する統合**、またはSkill封印による一部無効化/生存・後衛の条件を原作資料に基づいて実装する。既存`CombatCatalog`と共通Skill hookパイプラインを再利用し、キャラごとの重複コードは作らない。

原作ジバニャンの「ひゃくれつ肉球」hitCount5/7は`disputed`のまま。学校公開・GitHub main/実本番Firebase Rules/DB/Auth/Drive無変更。引き継ぎ時は最新ロードマップとこの記録を優先。
