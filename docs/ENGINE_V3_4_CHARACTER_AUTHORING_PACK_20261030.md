# 妖怪ウォッチ2対戦｜Engine V3-4-1 データ駆動キャラ登録・検証入口

最終更新 2026-10-30。開発ブランチ `feat/phase1-action-circle-lab-20261023` 限定。原作技データの未確認部分を捏造せず、先に追加キャラ用の**authoring/catalogコンパイラ**を整備する。

## 実装範囲

既存 `content/combat-catalog.mjs` の **単一** `createCombatCatalog` を拡張した。新キャラの参照記録は、今までの `skill:{id,displayName,trigger,effect,evidence,...}` の繰り返しではなく **`skillId:'skill:...'` のみ**でもよい。キャラの4つの技は以前から存在する `moveIds:{attack,technique,inspirit,soultimate}` へ記録する。skill詳細は一つの`skills`マスター、技威力/ヒット数/属性/状態/evidenceは一つの`moveMaster`から解決する。**現行レンタル6体の古いinline skillレコードはそのまま互換サポート**。この工程では旧6体定義を破壊的変更しない。

また`extendCombatCatalog({baseCatalog,characters,moveMaster,skills})`を追加。既存のcatalogと新キャラ・新しい技だけを統合して新しいcatalogを返す（元のcatalogを更新しない）。既存のmoveId/skillIdを参照する場合は再定義不要。既存IDに別の技データで上書き、4技不足、スロット違い、欠損スキル、キャラ重複、同じ技IDの衝突などは**まとめて拒否**。

### 実際の新規キャラ追加の入力形

```js
// base = RENTAL_LAB_CATALOG（開発用）
// seventh = HP・性格・provenanceなど既存schema V1で検証する1体の記録
const {skill,...source}=structuredClone(RENTAL_YOKAI_REFERENCES_LAB[0]);
const seventh = {
 ...source,
 id:'authoring-seventh', name:'追加テスト妖怪',
 skillId:'skill:momentum',
 moveIds:{...source.moveIds,attack:'authoring-seventh:attack'}
};
const newAttack = {...structuredClone(RENTAL_LAB_CATALOG.getMove('rental-01:attack')),
 id:'authoring-seventh:attack', power:47};
const added = extendCombatCatalog({
 baseCatalog:RENTAL_LAB_CATALOG,
 characters:[seventh],
 moveMaster:[newAttack]
});
added.characters.length; // 7
added.moves.length; // 25（既存3技の定義は共有し、攻撃1技だけ新規）
```

上記は**仮の創作キャラとfixture値の登録テスト用例**で、妖怪ウォッチ2本家の7体目や公式の攻撃力を示してはいない。実際のサンプルは`tests/v3-character-pack-authoring.test.mjs`で実行できる。新しいskillIdを定義する場合は、今あるskill registryに1個だけ追加して二人以上で同じID参照もできる。

## 実装/テスト

- `content/combat-catalog.mjs`の入力検証：`skillId`と`skill`を同時指定したら拒否。不明skillIdならfail-closed。既存の技能種別を新実行エンジンに無断で追加しない。
- 新規`tests/v3-character-pack-authoring.test.mjs` **7件**：既存Lab/School6体をすべてskillId方式へ置き換えても**24技と全キャラ生成結果が完全一致**、7体目と1技追加のregistry増分、8体目・新しいskillを1個だけ共通定義、ID/slot衝突と欠損のatomic拒否、証拠sourceRefs、入力データの防御的コピーと不変性、6シード条件（School/Lab×3seed）で75行動まで**従来の本番型match snapshot・journal・戦闘出力が変わらない**ことを検証。
- 初回CIでは今回の新規テスト2件が**誤ったテスト期待値**（4体目のskill同定ミスと、cloneされた技にオブジェクト参照同一性を要求）で失敗。ゲームコードのロジック修正ではなく、masterを実際に参照して値と防御的コピーを検証するようテストを修正した。
- 検証コードSHA `0e3fdb2daedc779070ffab1cb40f1f9d74fe54d0`。GitHub Actions [Research battle unit tests #40918704679](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40918704679)：**Node 801/801 PASS、fail0**、自然6vs6・Chromium実操作も全ジョブ SUCCESS。
- GitHub Actions [Phase37 Firebase Friends QA #40918704743](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40918704743)：**全ジョブSUCCESS**。本番RTDBではなく**localhost emulator**でGoogle Sites Friends no-Auth単体HTML build（76 source modules、未配布版295,781bytes）、RTDBルーム・2席/24ホスト行動ACK・再接続・公開遅延・実Chromium2iframe・既存の時限ルールを確認。すべてPASS。本番Firebaseには予約済み非ルームキーへの**GET1回のみ**（HTTP 200、body未閲覧、writeなし）。

## 重要な未実装と次工程

これは**キャラを登録できるauthoringレベル**に達したもので、**対戦で7体目を使用可能になったわけではない**。現在の`engine/combat.mjs`は6人チームを受け、カタログ攻撃等のadapterは既存6体indexと旧`RENTAL_SQUAD`を前提にしている。新登録データを直接学校の対戦画面に追加すると、未検証のskillsや移行対象の既存式を紛れ込ませる恐れがある。

**V3-4-2**では、(a)6人分の登録済みID→検証済みの戦闘actorの組み立て、(b)既存6体の`combat`/match-protocolと同じ効果/RNG/時刻が出る差分テスト、(c)ソウル容量・性格・AI重み・技発火・表示IDなど旧レンタル固有の残りを確認してから、追加キャラの試合投入範囲を決める。新しいスキル名を定義できても、既存エンジンがその効果を実行できるとはまだ言わない。

本家の固有技名/数値/複合必殺の実ヒット数・演出フレーム/追加キャラの設定は資料未確認でありfixture/unknown扱い。原作映像本体と学校Safari実機2台での試験も未完。main、学校公開Google Sites HTML、本番Firebase DB/Rules/Auth、Google Driveは変更しない。
