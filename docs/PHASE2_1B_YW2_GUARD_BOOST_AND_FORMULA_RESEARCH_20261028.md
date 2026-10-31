# Phase 2.1B｜原作のガード強化・技計算式の証拠比較
2026-10-28｜`feat/phase1-action-circle-lab-20261023`

## 現在の判定
**Phase2.1Bの確証のある1項目「強化ガード×0.25」を本物のホスト処理まで実装・検証済み。** ただし物理/妖術のダメージ式全体・正確な属性/技Power/命中スキル補正の完全再現は引き続きPhase2.1C以降の課題。今回学校向けレンタル6体の能力/技/ガード強化付与条件は**一切変更しない**。学校Google Sites稼働版・GitHub main・本番Firebase Rules/DB・Drive配布は変更しない。

## 原作資料の比較（新たに閲覧・内容を直接照合）
### 強化ガード：原作資料から明確
- [Mt. Wildwood: Guarding（Yo-kai Watch 2の行）](https://mtwildwood.net/guarding.php?g=yw2)：
  - 通常ガード時の被ダメージ ×0.5
  - ガード強化時 ×0.25
  - `Guard Break` / `Tongue Twister`はガード効果無視
  - `Jar Guard`などの固有スキルは単純なガード強化と**別枠の上書き係数**
- **重要**：上記ページの「Guarded hits have no random spread」は**Yo-kai Watch 1の見出しに書かれている**。Yo-kai Watch 2の行には明記されていない。現行コードのガード中の乱数停止をこの原作2出典だけで新たに証明したとは言わない。既存コードの乱数処理は変更していない。
- `Guard Break`は物理ガードを貫通し、`Technique`を無条件で貫通すると解釈しない。既存の6スキル台帳では「physical-hit」のフックに接続済み。
- まだ原作の「ガード強化を何の操作/とりつき/効果で獲得し、何秒/何行動持続するか」は未確認。**組込6体に勝手に強化を与えない。**

### 通常/クリティカルダメージ式：異なる資料がある
- [Mt. Wildwood: Damage of one hit / YW2](https://mtwildwood.net/damage.php?g=yw2)：
  - 物理通常 `(Power×Hits+Strength)/Hits/2 - Def/4`、会心は`(Power×Hits+Strength)/Hits/1.5 - criticalDef/10`
  - 妖術通常 `element × (X/10 + X/3 - Def/7)`、会心`element × (X/5 + X/2.5 - criticalDef/14)`（`X=(Power×Hits+Spirit)/Hits`）
  - 結果は1〜999に収まる、非ガード時におよそ±10%程度の乱数幅
- [2026-09-16 3DS 2台での実機検証（本家ver2.1/真打ver1.2）](https://note.com/atoato429429429/n/nfefe8749d432)：
  - 30〜120回/条件のダメージ観測から推定した式。記事自身が誤差の可能性を明記
  - 妖術通常 `(Power+Spirit)×3/7 - Def×7/50`、妖術会心`(Power+Spirit)×0.6 - Def×3/40`
  - 例：Power90・Spirit200・Def130 の単発妖術では、Wiki式の基礎値は`(290/10 + 290/3 - 130/7)≈107.10`、実機推定式は`(290×3/7 - 130×7/50)≈106.09`。**差が1程度あり得る**。記事は推定係数であり、各技/版・会心条件を揃えた原作ダメージの再実測なしに決着できない
  - 原作2の物理会心はWiki式と実機推定式で同等（STR+Power）×2/3−Def/10だが、超会心は別
- 結論：このPhaseでは**原作の物理/妖術基礎ダメージ式を推測で置換しない**。`engine/damage-model.mjs`の式は引き続き`yw2-wiki-formula-research`、原作100%検証済みとは言わない。
- [Mt. Wildwood: Weak & Strong Elements（YW2）](https://mtwildwood.net/elements.php?g=yw2)：キャラごとの弱点/耐性の乗数が妖術にのみ適用。攻撃側のFire/Water/etc Playは×1.2（2ソースで×1.4）、Penetrateは1未満の耐性を1扱い。**オリジナル6体にPlay/耐性/貫通の原作名を勝手に割り振らない**。次工程で能力→対象への掛かり方を別モジュールに整理する価値がある。

## 実装したコード（既存レンタル挙動を保つ）
1. `engine/damage-model.mjs`：
  - `calculateOneHit`に省略可能な**`guardBoost=false`**（bool）を導入。ガード中は通常×0.5、強化時×0.25、物理のGuardBreakなら×1を使用（妖術は貫通しない）。
  - 実計算で使った**`guardFactor`**を結果に記録。命中・会心・乱数・属性を改変せず、虚偽の複数hitを生成しない。`Jar Guard`の追加係数は未知なので未実装。
2. `engine/combat.mjs`：
  - **custom/team入力で明示した`guardBoost:true`だけ許可**。非boolean拒否、`false`または未指定なら組込レンタルの従来のゲーム状態スナップに新規フィールドを追加しない。
  - 本物の通常物理/攻撃妖術ホスト処理に`guardBoost:target.guardBoost??false`を渡した。レガシーダメージ研究OFF経路でも×0.25を尊重。GuardBreakは元々物理限定のためその区別も保つ。
  - **強化ガードが原作の何のとりつき/スキルから発動するかは未実装**。許可するのは調査シナリオ用の明示編成だけ。通常の6体で付与されると誤解しない。
3. 新`tests/phase2-1b-guard-boost-original-rule.test.mjs`：
  - 通常ガード50%・強化ガード25%・物理貫通100%を厳密な数値で検査。
  - 妖術も強化ガードで軽減する一方、物理専用GuardBreakで妖術が貫通しないことを検査。
  - **customチームの本物のホスト対戦を複数seedで進行**し、相手が実際にガードしている間の攻撃/妖術双方が`guardFactor=0.25`でダメージを受け、同seedの2つのホストのHP/イベントが完全一致することを確認。
  - 旧ダメージ経路のガード軽減・入力型検査・既定レンタルのスナップに未承認の強化フラグが追加されないことも確認。

## テスト結果・未検証
- **最終ゲームコード＋5テスト：コミット`868f9e5f8`**：
  - [**Research Unit 672/672 PASS＋レンタル6体耐久試合PASS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40652761991)
  - [**本物のChromium Stage 16/16＋Gesture＋両視点MatchResult PASS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40652762022)
- ホスト実装コミット`2a719cee2`にて[Firebase Emulator browser/Stage/Charge QA PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40652708751)、[Google Sites online sandbox QA PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40652708498)、[Google Sites offline 1-file embed QA PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40652708527)。それ以降は研究用テストだけ追加、ゲーム本体の内容は同じ。
- **学校iPad Safari同士2台の最新AuthなしFriends実機対戦は未検証**。上記Firebaseエミュレーターは匿名認証を使う別の旧研究経路も含むため、学校でそのまま動く根拠とは言わない。
- **ユーザー提供原作MP4**：前Phase2.1Aの[本人動画を直接見た記録](./PHASE2_1A_YW2_INTEGER_HIT_CHANCE_20261028.md)を確認。**今回の作業では元MP4の新規視聴を実行できなかった**ため、今回の新しいガード軽減係数の出典を「動画を見た」とは書かず、上記の原作解析資料に限定する。動画の「ガード」表示だけでは係数0.25を確定できない。

## 次する作業：Phase2.1C
原作Wikiと実機推定式の違いを実機環境・技レベル・非会心/会心・同対象の前提でケース分割し、**検証可能なダメージ条件マトリクス**を作る。まだ未実装の原作**属性Play/貫通**も、対象耐性とアタッカー側の場スキルを**別の係数レーン**として設計。少なくとも1条件で正しい情報が揃うまでは現在の本体ダメージ式を置き換えず、ソースが十分な効果だけ縦切り実装する。
- 原作動画には各攻撃のHUDとフレームを対応付け、ダメージ数字・クリティカル/ガード文言・上下画面の状態を抜き出す。1フレームから内部式を推測しない。
- 引き続き **Phase2.1A/B完成、Phase2.1Cへ**。Phase2.2は必殺技の正式なHit列、Phase2.3はとりつき/スキル発火、Phase3〜6は後段。

## 毎回の3項目
1. 今回：原作2×0.5/0.25/GuardBreakの根拠を照合し、研究用custom編成で実ホストに実装。672テスト＋Chromium＋Firebase/Sitesの各QA合格。
2. 次：Phase2.1C 原作ダメージ式の相違点を条件付きで解明、属性Play等の正規係数を調査。
3. 現在：6段階ロードマップ **Phase2（原作ルールの再現）／2.1B完了、2.1C次**。
