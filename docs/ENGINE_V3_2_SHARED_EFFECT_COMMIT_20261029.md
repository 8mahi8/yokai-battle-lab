# V3-2｜共通Effect確定パイプライン（2026-10-29）

## 目的と今回の範囲
本人の要望「単発技の再現ではなく、先にゲームエンジンをしっかり作る」に従い、**既存レンタル6体の全戦闘で共通に使う『効果の確定』入口**を新設する。キャラ、技、原作未確証の命中率・Hit数・割り込み順序を増やさず、次にEffect/Skillのデータ駆動へ進める土台を整えた。

**今回の完了範囲はEffectの「commit」だけ**であり、原作の細かいResolve順序の完全解明、全skill hookの実装、スキル優先順位の原作一致はまだ未完。HP-over-time(研究DoT)のtick、特別なSoul吸収/転送、KO発生後の全部分岐は現在まだ旧コードに残っている。ここを完成したと偽らない。

## 参照した外部資料（2026-10-29）
- [LEVEL-5公式『妖怪ウォッチ2 妖怪とバトル』](https://www.youkai-watch.jp/yw2/game/game06.html)：Gわざ/必殺チャージ/零式・つつくを公式の操作類型とする。数値式やEffect hook発動順までは資料にない。
- [妖怪ウォッチ2｜攻略の虎『バトルについて』](https://toragame.com/youkai2/kihon/battle.php)：妖怪が自動行動し、プレイヤーが状況に応じて回転・必殺・つつく等を操作する構造を確認。Gわざは隣のゲージも消費。
- [ゲームエイト『妖怪ウォッチ2のバトルシステム』](https://game8.jp/youkai-watch2/505163)：攻撃/回復/バフ必殺技、ねらう、前後衛交替、後衛のおはらい5種、妖術・とりつき、属性/陣形など。**回復/悪いとりつき/必殺は共通Effectの異なるカテゴリーにできる**が、内部処理順はこの攻略サイトだけで断定できない。
- [Mt. Wildwood｜個別妖怪のHit/Guard/Interrupt研究例](https://www.mtwildwood.net/yw2/yokai/statiking)：技種類・Hit/クリティカル/ガード/ダメージ/チャージ解除が別々の論理を持つことの参考。**個別妖怪のデータは現在の6体へ流用しない**。
- [原作対戦動画に関する既存観察](./MATCH01_SECOND_PASS_INPUT_AND_TIMELINE_20261027.md)：独立した画面/バトルイベント根拠。元動画を今回新規再生・目視したとは言わない。

## 実装内容

### 共通の正規効果確定
`engine/effect-commit.mjs`：`createEffectCommitter({resolveDirectDamage,onSurvival,applyStatus,onStatus})`を新設。攻撃や必殺の**Hit/critical/guard/属性/乱数を計算し終わってから**このAPIへ渡す。実際のHP・状態台帳はここで確定され、そのあと既存エンジンが割り込み・KO・勝敗・妖気等を処理する。

| 効果 | 今回共通化した処理 | 原作/今後の未完 |
|---|---|---|
| damage | `commitDamage(target,amount)`：既存`resolveLastStand`を呼び、**HP確定→生存スキル発動**。通常攻撃、研究用必殺の単Hit/複数Hit、つつくダメージで共有 | 命中率、技固有の効果順、KOと割り込みの共通hook |
| heal | `commitHeal(target,amount)`：最大HPを超えないHP変化。妖術回復、研究用回復/蘇生必殺、既存お世話型スキルで共有 | 回復量計算式、蘇生や吸収の原作固有順序 |
| status | `commitStatus(spec)`：**とりつき台帳登録→行動可否の同期**。通常とりつき、研究用特殊効果で`applyInspirit`を経由して共有 | 状態異常命中・抵抗、複合状態の優先、継続効果/おはらい/終了hook |

- `engine/combat.mjs`の旧`applyDirectDamage`個別実装を削除し、同じ生存スキル callbackを共有の`onSurvival`へ移動。
- 妖術回復のモデル計算（未確証のbase heal式、任意乱数±10%）は**そのまま**、HPを増減する最後の段階だけを`commitHeal`へ移す。お世話型のスキルや研究用全体回復/蘇生も同じ入口にする。
- とりつきのsign/effect/resistance/研究フラグ等、**既存の入力検証後**に`commitStatus`へ流す。台帳登録が完了してから`syncCanAct`、その後に攻撃効果処理が続くという既存の順序を維持。
- **乱数使用、発動条件、同値優先、行動ポイント、Soul、front/back表示、イベント列は意図的に変更しない**。特殊効果/通常攻撃/つつくで別々にダメージを確定させていたコードを同じcommit APIに寄せるのが今工程の主眼。
- snapshot/Firebase形式/Engine ABIは維持。Coreはすでに`MatchCore`からのみ変更される。Nodeで純粋なEffect実行の順序をテストし、オンライン/Chromium回帰も追加。

## 互換の受入証拠
- [Actions **40837995784**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40837995784)：**Node 712/712 PASS**、既存自然6体対戦/原作研究群を含む。新規`tests/effect-commit-v3.test.mjs`で「HPを確定してから生存スキル」「一度きりの生存スキル」「回復の最大HP上限」「とりつき登録後のcanAct同期」「不正値は無変更」「複数seedで通常進行のjournal再演算」を確認。
- [Actions **40837995888**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40837995888)：実Chromium上下画面/操作テスト PASS。
- [Actions **40837911108**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40837911108)：**今回の本体変更`9ae18da112`のFirebase Friends no-Authエミュレーター、2埋込ブラウザ、24ホスト行動/ACK/再接続/4埋込幅 PASS**。後続の`71a2b9455c`は新しいテストの追加のみ（本体コード無変更）。
- **未確認**：学校Google Sites版Safari実iPad2台、本家の細かい効果発動順、ゲーム内の全スキルを実試合で確実に再現したこと。

## V3-2次工程
1. ルール確認と差分台帳：`combat.step`の Hit/crit→Guard→commitDamage→Interrupt→KO→Soul/Event の**既存順序**を図式化し、原作の証明済み/未確証箇所を分ける。矛盾を見つけても原作資料が揃うまでは勝手に数字を変えない。
2. **共通KO/スキルhookの発火順**（beforeDamage/afterDamage/beforeKO/onKO/afterAction）をデータに付けられる構造へ。生存スキル、KOごとのモメンタム、行動ごとの回復、状態tick、複合hit、つつく、必殺で一つの契約として扱う。ただし未実証のhook順を「原作順」と呼ばない。
3. `content/combat-catalog.mjs`にある技定義と`effect-commit.mjs`を、validなtyped effect planで接続して、**今後の妖怪追加にエンジンのif文の追加が不要**な設計へ。
4. 旧レンタル6体の2席同一seed+入力、6体KO、実Chrome、Firebase Friends ACK/再接続の継続比較。**新技・新キャラの単発追加はまだしない**。本番Google Sites/main/Firebase Rules/DB/Driveへは書き込まない。
