# Phase48｜原作の基本「サボり」と自動スキルを学校PvPへ載せる（2026-10-27）

## 目的
学校で実際に対戦できたが「妖怪が攻撃しかしない」「妖怪ウォッチとして完成度が低い」という本人の体験から、映像が手に入らないまま場当たり的なCSS調整をするのではなく、**原作ルールで確認できる自律行動の種類と、それが見える演出を先に整える**。

## 外部ソースと確信区分
- [攻略の虎：性格](https://toragame.com/youkai2/kihon/seikaku.php) の **原作情報**：性格は「前半のまじめさ」と「後半の行動傾向」に分かれる。前半はサボりやすさ、後半は何をしやすいかに関係する。**正確なサボり確率%の記載はない**。
- [Game8：妖怪ウォッチ2 バトルの仕組み](https://game8.jp/youkai-watch2/505163) の **公開攻略**：前衛3体が自律行動し、プレイヤーはサークル・ねらう・わざ・おはらいを操作する。
- [たくトンボ：対戦モーションと読み合い](https://note.com/tombow_yw/n/n1e4cf179d2d9) の **熟練者解説**：長い演出中の対戦相手への表示保留が読み合い・ノーモーションに関係する。
- 研究対象のYouTube映像は [Phase47](./PHASE47_ORIGINAL_PVP_VIDEO_EVIDENCE_GATE_20261027.md) に記録し、原作フレーム取得はbot制限で失敗。**秒数の原作一致を主張しない**。

## 判明した現行ソフトの不一致
1. `engine/combat.mjs` の `enableLoafing` はオプションで、元の学校Firebase Friends入り口では `{playtestSoulTuning:true}` のみ渡していた。従って**学校版では全員が絶対にサボらない**。
2. レンタル6体のデータは、行動傾向 `attitude` を持つが、サボりの数値 `loafChance` はすべて0（既定値）。原作の2つの性格軸のうち一方が無かった。
3. `おせわ`などの自動スキルは、**内部の回復・1HP耐え・一時的強化として既に確定実装**されているが、画面では「何が起きたか」を説明できていない。特に回復が既存の行動モーションと連続した場合に見落とす。

## Phase48実装
- `content/rental-roster.mjs`：学校向けレンタル6体の`SCHOOL_RENTAL_PERSONALITIES`に**サボり確率仮値 (3%,2%,1%,3%,2%,5%)** を追加。性格による行動傾向（攻撃/妖術/回復/とりつき/ガード）とサボりは独立。これらは本家内部確率の再現値と**断言しない**。
- `engine/combat.mjs`：学校試遊用`playtestSoulTuning:true`時のみ上のサボりデータを各キャラへ適用。従来の研究デフォルト`RENTAL_SQUAD`と研究テストの期待動作は維持。
- `lab/sites-embed-online-entry.mjs`：学校で使えたFirebase Friends方式に `enableLoafing:true` を追加。サボりが実際に判定されるようになる。ホストの戦闘判定のみ、ゲストでは再抽選しない。
- `ui/passive-feedback.mjs`：戦闘の正規のスキルイベントと、前後の自動行動を表示専用に対応付け、`lastStand`・`momentum`・`care`を日本語で示す。直前の行動について以前の`care`を誤って出さないため、`lastStand/momentum発動`（actionの前）、`care/momentum終了`（action後）を区別する。
- `ui/match-stage.mjs`と`lab/yw2-layout.css`：スキル発動時は上画面の右端に小さく「おせわ +4HP」「どひょうぎわ 発動」等を出す。HP/ダメージ・勝敗を演出側で再計算せず、**戦闘確定結果のimpact/recovery段階のみ**表示する。サークルと左端の通常行動表示をふさがない。
- `tests/phase48-school-loafing.test.mjs`、`tests/phase48-passive-feedback.test.mjs`：サボりが**本物のホスト判定**で発生すること、両者同一チーム、旧研究挙動の保存、偽スキルが出ないこと、前後のスキル表示と重複スナップショット安定を検証。
- `lab/match-stage.html?review=passive-skill`：本物のseed付き戦闘を進めて実際のスキル発動時点を選び、`tools/stage-smoke.mjs`で画像/DOMを検査する。**無効なダメージや偽スキルを直接注入しない**。

## 前版維持・次の作業
- 既存のGoogle Sites版、Drive V3、GitHub main、Firebase RTDB Rulesとデータを変更しない。dev branchでの実装のみ。新しいGoogle Sites貼付版はQAクリア前に配布しない。
- 遺伝的な性格/育成システムは初期6体レンタル版には不要。
- 次は原作と比較できる静止画を複数集め、モーションの強さ・1行動の認識しやすさ・ノーモーション成立要件（相手視点の表示保留）の研究を進める。
- 全数値は後から調整できる1か所のデータに集め、逐次テストで再現性を確保する。

## 検証済み｜学校向けフェーズ48の初回独立受入
- [Phase48専用QA #40498774364](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40498774364)：**SUCCESS**。GitHub Actions上で**595/595単体テスト成功**、6体戦4seed自然決着、実Chromiumで指タッチ/零式切替/行動VFX/学校向け仮性格のスキル発火を確認。
- 同一Actionsで**実際のホストゲームで`まえのめり`が発動した瞬間の画面**を1024x768画像として生成、`#mb-passive-notice`がhiddenでなく日本語の発動名を持つことを確認。
- 初回の画像レビューで、`まえのめり`の発動者と「撃破された敵」の名前を `→` でつないでしまい**敵がバフされたように見える誤表記**を発見。イベント本体の効果は正しいので**スキル表示の対象だけ修正**。再受入のDOMには `あかねこ まえのめり 発動` と表示された。
- Firebase Friendsの**Google Sites直接埋め込み用単体コードのビルドと無認証依存の静的検査PASS**。さらに[Phase37 Firebase Friendsエミュレータ #40496840751](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40496840751)はローフ設定を導入した直後の2端末構成でSUCCESS。
- この自動テストだけでは学校のSafari2台の最新版での操作・難易度・モーションの完成度は保証できない。サボり確率(3,2,1,3,2,5%)も**原作内部確率とは断言しない**。
- 初期研究用プログラムのサボりなし・過去6体レイアウト/元のGoogle Sites版は維持。**まだGoogle Drive新配布版/Google Sites既存版/main/本番Firebase Rulesは変更していない**。
