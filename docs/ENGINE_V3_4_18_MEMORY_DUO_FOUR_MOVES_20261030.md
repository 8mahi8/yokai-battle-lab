# 妖怪ウォッチ2再現｜Engine V3-4-18：記憶系2体の原作4技を共通Effect/Statusへ接続（研究専用）
2026-10-30 JST。V3-4-17完了後の続き。対象は開発ブランチ `feat/phase1-action-circle-lab-20261023` のみ。**原作4技の「名前・効果・既知レベル」を戦闘で研究可能にしたのであって、学校配布キャラが完成したわけではない。**

## 確認した原作2の根拠

- [Mt. Wildwood Wazzat YW2](https://www.mtwildwood.net/yw2/yokai/wazzat)、[攻略大百科 Wazzat](https://gamepedia.jp/youkai-yw2/monsters/184)、[3dsnote](https://3dsnote.com/youkai2/wasurenbou/)：**記憶を食べる**＝相手を混乱（Lv1、所有者の行動ごと誤攻撃確率10%/Lv）、**スグワスレ〜ル**＝**敵全体の良いとりつきを解除**。原作ソウルチャージ100。
- [Mt. Wildwood Houzzat YW2](https://www.mtwildwood.net/yw2/yokai/houzzat)、[攻略大百科 Houzzat](https://gamepedia.jp/youkai-yw2/monsters/185)、[game-e Houzzat](https://game-e.com/youkai-watch-2/youkai/048.php)：**記憶をしまう**＝混乱Lv3、**記憶にございません！**＝**敵前衛全体へ混乱Lv3**。原作ソウルチャージ200。
- **YW1/YW3欄とYW2欄を混同しない**。共通資料が連続表示されるので版を明示した箇所だけ使用。
- **未確認を厳格に区別**：付与時の命中/抵抗の原作確率、味方誤攻撃対象の分布、自傷の可否、他とりつきとの優先順位・重ね付け、原作の技カットイン/サークルと同期した実時間、その他の性格/装備/レベル成長。現在の研究用戦闘はこれらに既存fixtureを使用。

## 既存の共通エンジンでの実装

1. `content/yw2-memory-duo-normal-lab.mjs`の旧`buildYw2MemoryDuoNormalLab()`は**デフォルトのまま**（既存6レンタル24技 + 2体の物理/妖術4技 = 28技、未実装2枠はfixture）。別の`buildYw2MemoryDuoFourMoveLab()`で出典付き全4枠の原作効果をコンパイルし、総計**8体/32技**の試験用カタログにする。物理/妖術はV3-4-16の既存経路を再利用。
2. 原作`Inspirit`は`source index → authored move `friendly-fire` Lv1/Lv3 → BattleProfile V2 → createCombat`。既存ActionPicker、InspiritLedger、V3-4-17の混乱による味方への攻撃/物理Hit/KOを利用。別の状態保存も別の行動抽選も作らない。
3. 共通`dispel`という**非ダメージ必殺効果**を`yokai-definition`、`special-effects`、`soultimate-effect-plan`と既存`special-impact-commit`の「単発ではない敵前衛対象」の型へ追加。Wazzat必殺は`InspiritLedger.removeBySign({id,sign:'positive'})`へルーティングし、敵の生存前衛3体の**良いとりつきだけ**削除する。無関係の陰性と後衛/HPは保護。新しい演出時刻や乱数を捏造しない。
4. Houzzat必殺は**既存**`debuff`（`friendly-fire` Lv3）を通し、敵前衛の各対象に適用。元からある付与時の抵抗判定は**研究fixture**として残る。技固有の数値を`combat.mjs`のif分岐に直書きしない。
5. source Wazzat/Houzzatの必殺コスト100/200に合わせ研究用プロファイルを Rank1/Rank3 に設定。**研究用Soulの回復速度や演出が原作一致した意味ではない**。
6. 両方の強化は**`includeSourceStatusMoves:true`で生成したcustom teams + `researchYw2Confusion:true` + `researchDamageModel:true`**の時のみ。通常のレンタル6体/学校Friends無認証オンライン`MatchProtocol`は研究フラグを拒否し、学校公開版に原作2体を表示しない。カタログの`provenance.moves`と`battleReady=false`は意図的に保持。

## 確認と結果

- `tests/v3-yw2-memory-duo-four-moves.test.mjs`で旧研究版と新版の非干渉、Lv1/Lv3の通常とりつきの実戦付与、Wazzat必殺が良いとりつきだけ前衛全員から解除、Houzzat必殺が敵前衛にLv3混乱、ソース欠落と改ざんの拒否、学校6体/オンラインを変えないことを検証。
- 最終機能+テストコード `97e943bdb9864cbb62b317dd056ee5cdd91bf2b5`：[Research CI #41041189583](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41041189583) **Node 914/914 PASS、0 fail**。[Phase14 Stage #41041189598](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41041189598) **SUCCESS**。Firebase Friends 2席CIの最終結果は同コミットの [#41041201748](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41041201748) を基準に確認する。
- 編集中に新しいdispel定義が正規化後の二重検証で拒否される不具合を発見し、同一検証器が厳密に許可する`{kind:'dispel',scope:'front',power:1,damageKind:null}`へ修正。既存レベル1の戦闘入力は`inspiritLevel`を省略するのでテストを適切に修正。途中CIの失敗を隠していない。
- **学校iPad Safari2台/実Google Sites埋込・原作動画のフレーム照合は未実施**。これは自動テストの成功と別の課題。

## 次工程：V3-4-19（優先順）

最初に今回の最終Firebase Friends二席とChromium UIの回帰を確認。次は**既存レンタル6体の試合全体**の行動時間・技別効果の表示タイミング・ホスト/ゲストの画面差を、同一正規イベントを基準に観察/修正。原作動画の既存観察記録を受入資料として用いる。特定キャラの追加や確率の推測で完成と錯覚しない。V3-5統一エンジン完成判定にはまだ進まない。

この段階ではGoogle Sites稼働HTML、main、本番Firebase Rules/Auth/DB、Google Driveは変更なし。開発ブランチとDraft PR #1の範囲のみ。