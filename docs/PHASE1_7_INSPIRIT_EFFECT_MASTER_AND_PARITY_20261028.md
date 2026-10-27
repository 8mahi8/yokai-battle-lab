# Phase 1.7｜とりつく効果とキャラ技の共通化、既存対戦結果との比較
作成：2026-10-28 / 開発ブランチ：feat/phase1-action-circle-lab-20261023

## 目的
妖怪ウォッチ2らしい**良いとりつく／悪いとりつく**を、キャラごとの重複文字列や分散した正負リストから分離する。原作の確定仕様と学校レンタルの試遊用パラメータは別々に扱い、まず既存対戦への影響0を確認する。

## 今回の外部資料・原作観察の位置付け
1. [Mt. Wildwood — YW2 Inspirits](https://mtwildwood.net/inspirits.php?g=yw2)：良/悪の区別、耐性判定、効果レベル1～4、良の一部は全体30行動・悪の一部は解除まで持続など、**効果ごとに詳細条件が異なる**。今の`engine/inspirit.mjs`の研究仕様と照合したが、**今回持続の公式値を変更しない**。元データをそのまま全面適用したわけではない。
2. [攻略大百科 — おはらい](https://gamepedia.jp/youkai-yw2/archives/1397)：悪いとりつきは後衛で解除。ちからアップ・睡眠・HP持続減など多様な種類。**対象/解除の原作共通形を再確認**した。
3. [Game Programming Patterns — Type Object](https://gameprogrammingpatterns.com/type-object.html)：キャラ個別の重複処理ではなく、共有効果IDを参照する方式を採用。
4. [本人提供原作対戦動画の直近直接レビュー記録](./PHASE1_6_TECHNIQUE_CATALOG_AND_ORIGINAL_VIDEO_REVIEW_20261028.md)：この前の開発で元動画の2～4試合目の**一部フレームを実際に抽出・目視**した。今回新たにフレームごとのとりつき発生率・正確な持続数を確認したものではない。映像のどの範囲から何が裏付くかを混同しない。

### 確度の区別
- 原作の基本形として**良いとりつく＝味方への支援、悪いとりつく＝敵への妨害、悪いものをおはらいで解除**がある。
- **いまのレンタル6体の具体的とりつき割当**は`sleep/strength-up`の2つで、個体ごとの技名・耐性率・レベル・持続は学校試遊`fixture`。映像から原作の正確な値を得たわけではない。
- 効果マスターは研究用7種類（sleep, strength-up/down, defense-down, spirit-down, hp-loss, hp-regen）。現行`research-marker`は自動技ではないため研究ショートカットのまま台帳に追加しない。
- 勝手に「悪いとりつきは全て同じ持続」という新ルールや、混乱/全ステータス操作など未実装の効果を追加しない。

## 今回実装した変更
| 場所 | 仕事 | 戦闘互換 |
|---|---|---|
| `content/inspirit-effect-master.mjs` | 効果ID、`sign`（positive/negative）、効果系統、未確定durationを共有する一つの辞書 | 数値の変更なし |
| `content/rental-inspirit-moves.mjs` | 6体の`moveId`と効果ID、正負、対象（single_ally/enemy）、試遊レベル1、未確定durationの単一の著者ソース | `fixture`で固定 |
| `content/rental-roster.mjs` | 旧`inspirit`フィールドをマスターから派生する互換値に変更。旧のスナップに不要な`inspiritLevel:1`を追加しない | 不変 |
| `content/rental-move-master.mjs` | statusEffect/category/targetScopeを効果マスターからコンパイルする。攻撃のヒット数と区別してstatusは`hitPattern:none` | 不変 |
| `engine/selection.mjs` | AIの良/悪とりつき判定セットを効果マスターから生成。従来の7効果の所属は完全に同一 | 不変 |
| `engine/catalog-inspirit-spec.mjs` | 名前・5能力・skill・レベル・状態・対象・効果符号の整合を起動時に検証し、矛盾時はエラー | customチーム誤認防止 |
| `engine/combat.mjs` | `catalogInspiritResolution`明示フラグで本物のホスト行動が台帳の効果/正負/レベルを使う。RNG、候補選択、耐性、ledger/purify、Soul、勝敗は従来どおり | opt-in / built-in既定 |
| `engine/match-protocol.mjs` | 組込6体では開発版の既定true、custom teamsではfalse。クライアントコマンドでモード変更不可 | protocol wire不変 |

## テスト
新`tests/phase1-7-inspirit-source-and-host.test.mjs`に6テスト：
- 6体の技割り当て・正負・対象・レベル1・原作未確定durationsを明示
- 改竄した人物/レベル/効果で起動を拒否、customチームには正規レンタルIDを誤割当しない
- 既定Friends経路とコマンドの入力チェック
- 複数seed×学校/研究で旧/新の全イベント/HP/Soul/状態/勝敗・RNG順を比較
- 良いとりつくと悪いとりつくが本当に発動し、ターゲットが敵/味方で正しく分かれたことを検査
- 旧研究簡略モードとの比較、AIの飽和時の選択チェック

**GitHub Actions（コード最終コミット`1ca6af81a`）**：[Research Unit](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40601602650)では**Node単体649/649 PASS**、耐久試合もPASS。一方ワークフローのブラウザスモークはGitHub Actions側のChromium起動タイムアウトで失敗（DOMを出す前に時間切れ。コードのゲーム判定エラーと断定不可）。[独立Stage実Chromium QA](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40601602766)は**PASS**（操作、上下画面、両視点の勝敗）。研究単体ワークフロー全体を成功とは記載しない。
- ドキュメント更新でCIが再走した場合には、その結果を別のコミットSHAとともに確認する。学校Safari2台、原作動画の全フレーム比較、AuthなしFirebase Friends実戦は**今の時点で未検証**。
- 既存旧Supabaseブラウザ長時間QAの失敗は別の調査項目であり、このPhaseの原作データ整理と混同しない。

## 次の作業｜Phase1.8
**必殺技の定義を1つの共通マスターへ移す準備**。攻撃/回復/とりつき/防御アップ/蘇生/ドレイン/追加状態と**多対象／多段**を必ず分け、動画の局面・外部資料に出典を付ける。移行後も旧seed戦闘が変わらないことを比較し、`special-effects.mjs`の実イベントを正規ActionOutcomeへつなげる。ただし本家の「ひゃくれつ肉球」の打数等が資料で食い違うところは`unknown`で保留する。

**ロードマップ現在地：6段階中の Phase1（戦闘基盤の統一） / 1.7実装済、次1.8。Phase2～6はまだ完了ではない。**
