# 妖怪ウォッチ2対戦｜V3-2 Poke妖気移動の共通Commit（2026-10-29）

## この変更の意味

原作に近づくための「ゲームエンジンの共通状態確定」を進める。**原作妖気吸収量、誰に妖気が入るか、発生率を証明した変更ではない**。旧試遊・研究対戦の同じ結果を維持しながら、`combat.mjs`内の2経路に重複していた「敵メーターを減らす→味方メーターを増やす」を`createSoulSystem.transferSoul`へ集約した。

- `engine/soul.mjs`：`transferSoul({sourceId,recipientId,maxAmount})`。全入力と敵味方別の所属を先に検証し、`min(maxAmount,sourceSoul,receiverCapacity-receiverSoul)`だけ、同じホスト処理内で確定する。0ならどちらも変化しない。Source/recipientは両方実メーター。最大値以上の生成、未登録ID、自陣内転送、異常な量を禁止。
- `engine/combat.mjs`：零式`pokeInput`の①学校用`playtestSoulTuning`の吸収結果（仮上限35）、②研究用`researchPokeSoulTransfer`（初期値0）の双方から同一APIを呼ぶ。**先頭の味方生存前衛を受け手とする旧仮仕様を維持**、味方前衛ゼロなら量0。敵の生存、零式モード、敵が前衛か/とりつき・サボり条件、1体1回、乱数抽選、チャレンジ12タップ、報酬イベントの構造は旧戦闘ホストのまま。
- `tests/poke-soul-transfer-v3.test.mjs`：新規5テスト。残量/満タン/上限/0/同陣営/未知ID/負数と非整数/失敗時全state不変、既存イベントの形・seed、通常HPダメージと999ダメージ経路非変更を確認する回帰テスト。**テスト追加済み≠今回のGitHub Actionsで合格確認済み**。

## 出典の階層

1. LEVEL-5公式 [妖怪ウォッチ2 バトル紹介](https://www.youkai-watch.jp/yw2/game/game06.html)：零式の「つつく」の機能とGわざ。ここにはPVP転送量・受取先・抽選率の式は掲載されない。
2. 原作のプレイヤー解説 [攻略の虎 バトル](https://toragame.com/youkai2/kihon/battle.php)、[game-e 妖怪レンズ](https://game-e.com/youkai-watch-2/battle/youkai-lens.php)：サボり/とりつき相手の「つつく」で妖気回復/吸収の説明。受取先・上限・対人内の発生率は裏付けられない。
3. [既存PVPつつく資料](./PHASE31_POKE_PVP_SOURCE_AUDIT_20261026.md)：対人用のHP攻撃・妖気吸収・999の分類は二次資料による。49.9/50/0.1の抽選割合、35魂、35ダメージと受取先は**試遊用fixture**。公式やユーザー提供動画に確認できない数値を原作仕様と呼ばない。

本人提供の原作動画現物は今回取得・再視聴していない。過去の観察資料は履歴として活用するが、直接見たとは記述しない。

## 差分と既存互換

- コードの変更対象は`engine/soul.mjs`と`engine/combat.mjs`。イベント・Snapshot・公開API `createMatchCore`・通信プロトコル・seed消費は変更しない意図。内部`createSoulSystem`に新メソッドが増えた。
- 入力不正時は`source.soul`と`recipient.soul`の双方を**検証前に一切変更しない**。勝手な全員回復、連打報酬、漏れた妖気の再配分を足さない。
- 実装後のフルNode/自然対戦/Chromium/RTDB Friends 2iframe/Google Sites単体HTMLビルド/学校Safari2端末の**最新コミット固有結果は未確認**。過去版の753テストPASSを今回の結果として使わない。

## 完了判定・未完

- Node新規5件と全件、自然6対6対戦、固定seedの`pokeInput`、実Chromium操作、Firebase認証なしFriends RTDB二画面、単体HTMLビルドを今回のSHAで確認する。失敗時は原因と修正コミットを記録する。
- 未確定の原作の転送先・転送量・状態/KOスキル発動順は、本家動画実測など確度の高い証拠があるまで変更せず保留する。
- 次のV3-2安全作業：`applyResearchSpecial`の非catalog impact時に残る直接HP更新の到達性・型を調べ、`EffectCommitter`に繋ぐ。この作業も古い結果と同seed同操作を維持する。
- **現在地：V3-2後半、未完**。V3-3時間・妖気・表示、V3-4完全IDデータ駆動、V3-5 Firebase Friends＋Safari実機はまだ先。
- `main`、公開Google Sites、Firebase本番DB/Rules/Auth、Google Driveへの変更なし。
