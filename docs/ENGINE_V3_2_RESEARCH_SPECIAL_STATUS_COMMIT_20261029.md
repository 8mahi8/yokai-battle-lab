# 妖怪ウォッチ2対戦｜Engine V3-2 研究用必殺の状態確定共通化（2026-10-29）

## 目的
HP効果の共通Commitに続き、`combat.mjs / applyResearchSpecial`で研究用技の強化・弱体・攻撃後とりつきを`applyInspirit`へ直送していた**2つの分岐**を`commitResearchSpecialStatus`に統合。データ主導のEffect型・状態/HP確定の所有を明確化する。**原作のタイミングや状態倍率が確定したわけではない**。

## 実装と安全性
- `engine/special-impact-commit.mjs`に`commitResearchSpecialStatus({impact,target,casterSide,casterId,applyStatus})`追加。impactのtargetIdと正規target照合、敵/味方、`buff`のpositiveおよび`debuff/damage-status`のnegative、状態レベル1..4、生存中かを検査。失敗時はStatus台帳に一切書かない。
- `engine/combat.mjs`の`buff/debuff`の状態適用と、`damage-status`の命中後付与の計2箇所を、新APIに変更。組込6体は既存`commitPlannedSpecialStatus`、カスタム/原作形状研究用は新API。両方とも最後に同一の正規`applyInspirit → EffectCommitter → InspiritLedger`を使う。
- 状態抵抗の乱数を使う**位置、消費回数、KO後に状態を付けない条件、イベントの`resisted/applied`の形**は変更しない。HP、行動順、チャージ、Soul、演出時間への追加機能なし。旧分岐が原作未検証だからと新優先順位は導入しない。

## 原作と研究fixtureの区別
- [Mt. Wildwood YW2｜Elder Bloom](https://mtwildwood.net/yw2/yokai/elder-bloom)：`Full Bloom`は戦闘不能の味方の蘇生と回復を兼ねる。ページ上のYW2データはHP60%の記載あり。このプロジェクトのオリジナル6体の「revive-heal 75」等には直接適用しない。
- [Mt. Wildwood YW2｜Statiking](https://mtwildwood.net/yw2/yokai/statiking)：全敵からのHP吸収と味方への回復、吸収ダメージの50%という**原作個体**の資料がある。現在の`special-effects.mjs`の研究用吸収方式と数値・分配先の完全一致を保証しない。
- 出典から確認できるのは効果類型。**原作のStatus重ねがけ/抵抗/発火順、組込研究キャラの数字は依然未確認。** ユーザー提供原作対戦動画原本はこの回に新たに直接視聴していない。

## 確認済みと未確認
- GitHub現行ソースから直接V8上に読み込んだ関数で、正常3ケース・不正9ケースの**12条件PASS**、更新した`combat.mjs`と`special-impact-commit.mjs`のJS構文確認を実施。
- `tests/research-special-status-commit-v3.test.mjs`に**3つのNodeテスト**を保存。正しい状態ペイロード、対象/符号/レベル/KO拒否、3種×3seedで試合の決定性を検査する設計。**新規テストのNode実行と全件成功は未確認**。
- GitHub Actionsのcommitごとの一覧APIで以前の実行結果を得られず、ローカルgitクローンもネットワークDNS解決失敗。コードモードで全依存を再構築する試行はツールの呼出上限に到達。**今回HEADのNode全件、実Chromium、Firebase Friends no-Auth 2iframe、Google Sites HTML buildは未検証**。学校Safari実機2台も未確認。
- 残る戦闘コードの直接状態書き込み/重複発火、行動順・表示時間は別作業。V3-2終了とは言わない。

## 次の作業と禁止変更
現行HEADでCI/回帰・実ブラウザ/通信検証を再実施できる環境を確認してから、同seed同操作で旧版との**完全snapshot/event/Soul/KO比較**。未確認の発火順は原作資料を優先し、V3-3時刻/行動、V3-4 IDデータ駆動、V3-5実機へ段階移行。公開main、Google Sites学校版、本番Firebase Rules/DB/Auth、Google Driveは変更なし。本人作業は現段階で不要。
