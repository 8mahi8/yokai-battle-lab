# Phase30｜必殺技の大枠：復活・HP吸収・攻撃＋状態異常（2026-10-26）

## 方針（本人の最新指示）
- 友達との1vs1で**戦闘システムの大枠を先に完成**させる。細かい技数値は仮値で試遊してから調整する。
- 原作キャラの完全な見た目や固有名の再現は不要。**効果の種類・戦術的役割**を参考にする。
- **「Googleサイトに貼るやつちょうだい」と依頼されるまで、開発とテストだけ進める**。新しいGoogle Sites用HTMLの配布やDriveへのコピーはしない。学校Phase27版、main、Supabase DB/RLS/Auth、Google Sites公開ページは変更しない。
- Flash魂、育成、ランキング、リロード後の同じ対戦復帰は不要。

## 原作で確認できる「種類」
- https://gamepedia.jp/youkai-yw2/specials
- https://3dsnote.com/youkai2/hissatsu-ichiran/
- 回復/復活や相手HP吸収の技は存在するが、今回の威力・吸収割合・復活HP・対象ルールは**オリジナル6体向けの仮値**である。原作の確定数値ではない。

## 今回の変更（既存エンジンに増分だけ）
- engine/special-effects.mjs: 既存の必殺計画関数を拡張。3種類を追加。
  - revive: 控えを含む気絶した味方**1体**のHPを回復。対象がいなければ効果ゼロ。
  - drain: 生存敵前衛にダメージを与え、**実際に奪ったHPの半分（仮）**を生存味方前衛の不足HPへ分ける。HP上限と敵HP下限を守り、敵から0なら回復0。
  - damage-status: ダメージ後に生きている相手へ弱体とりつき（抵抗の判定あり）。KO相手には付与しない。
- engine/combat.mjs: 既存の必殺処理、Inspirit台帳、HP計算、seed乱数、KO/行動可否・Journalの仕組みを再利用。復活させたメンバーを再び行動可能にする。
- ui/battle-vfx.mjs / ui/match-stage.mjs: 復活を「復活」表示にし、吸収回復を回復演出、攻撃＋弱体化をダメージ演出へ投影。
- **戦闘の大枠だけを拡張**し、既存の通信方式、戦闘進行、リアルタイムルーム接続は変更しない。

## レンタル6体の新しい必殺技カテゴリ
| オリジナル妖怪 | 効果 |
|---|---|
| あかねこ | 敵前衛全体への攻撃（継続） |
| こもれび | 敵前衛からHP吸収→味方前衛回復（変更） |
| いしもり | 味方前衛の攻撃強化（継続） |
| すずかぜ | 敵1体への妖術攻撃＋妖力低下（変更） |
| ほたる | 気絶した味方1体を復活（変更） |
| くろがね | 敵前衛の防御低下（継続） |

HP吸収power=80・味方分配1/2、復活HP=85、複合攻撃power=145・妖力低下Lv2は**仮値**。純粋な全体回復技の型もエンジン内に残してある（技カテゴリを削除していない）。回復術も従来どおり使える。

## 実際に検証したこと
- 新規 tests/phase30-special-types.test.mjs の**8件**：3種類の型/不正入力、控えのKO復活、全員健在時の空効果、HP吸収の上限/0時回復防止、攻撃＋弱体の対象、通常ホストでの発動、復活後の行動許可、Journalの再現。
- tests/playtest-special-archetypes.test.mjs の既存6体ロールを更新した。
- [Node542件成功](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40211265032)
- [Chromium戦闘/指操作/勝敗画面成功](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40211265053)
- [実Supabase 2 iframe 初期通信成功](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40211265071)
- [Google Sites HTMLビルド検査成功](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40211265170)
- 既存[実Supabase高速6KO決着成功](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40211012071)。最新版での再実行を別CIで確認する。

## 次の作業
1. **零式つつくの複数結果を通常対戦に追加**。現在は妖気吸収プレースホルダーのみ。原作資料で結果の種類を確認し、量・確率は仮値にして友達との試遊で修正する。
2. 通常編成・通常戦闘テンポで全ターンをネットワーク配信する長時間試合のE2E。高速テストとは別。
3. ノーモーション必殺／カウンターなど上級技術を既存研究コードから段階的に取り込む。
4. 学校旧iPad Safariでの実試遊。本人が新版ファイルを依頼するまでは開発版を渡さない。
