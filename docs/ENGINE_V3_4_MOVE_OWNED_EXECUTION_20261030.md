# 妖怪ウォッチ2ブラウザ対戦｜V3-4-4 技マスター所有の必殺・とりつき実行データ

記録：2026-10-30 JST。開発ブランチ `feat/phase1-action-circle-lab-20261023` のみ。**原作固有技・演出時間を推測で追加しない。**

## 今回解決した問題

V3-4-3では、創作7体目は`character.moveIds`で技IDを指定しながら、`BattleExecutionProfile.special`に同じ必殺効果（kind/scope/power/damageKind/statusEffect/level）を再び手書きし、`inspiritLevel`も別プロファイルに入力していた。技マスターとキャラプロファイルが食い違うと危険なので**技自身に実行データを持たせ、プロフィールはSoulランク/容量と実行の出典だけに縮小**する。

新しいデータをもうひとつの必殺技辞典に転載したわけではない。`RENTAL_SOULTIMATE_MOVES[i].definition`が元から唯一持っていた実行定義を、**同じ`RENTAL_MOVE_MASTER`のSoultimateレコードの`execution`へ参照し、immutable catalogから使う**。とりつきも`RENTAL_INSPIRIT_MOVES[i].level`から`move.level`へ同様に渡す。

## 実装したファイルと契約

1. `content/rental-move-master.mjs`：必殺技には任意`execution`（現研究fixtureであるkind/scope/power/damageKind/effect/level）、とりつきには任意`level`を追加。6体の既存技データから自動生成し、凍結したコピーとしてcatalogに載せる。他の攻撃/妖術技は従来どおり。未知の命中回数は`hitPattern:{type:'unknown',count:null}`のままで、ターゲット数と命中回数を混同しない。
2. `content/yokai-definition.mjs`：従来の`YOKAI_DEFINITION_SCHEMA=1`を維持。新しい任意fieldが存在する場合、**Soultimate専用**の`execution`のkind/scope/power/status/level/damageKindとmoveのtargetScope/category/power/statusEffect/hitPatternとの整合をカタログ生成時に検査。とりつき`level`は1〜4のみ。技と実行条件の矛盾、対象範囲の不一致、架空の原作フレーム設定はrejectする。既存の`execution`なしデータは互換入力として受け付ける。
3. `engine/catalog-battle-profile.mjs`：**新`BATTLE_EXECUTION_PROFILE_SCHEMA_V2=2`**を追加。V2プロフィールは`schema/characterId/evidence/sourceRefs/soultimateRank/soulCapacity`の6フィールドだけで、**`special`や`inspiritLevel`を一切含めない**。効果とレベルはcatalogに登録された各技の`execution`/`level`から取得して、既存`validateSpecialSpec`と`compileSoultimateEffectPlan`によって再検査し、従来の`createCombat({teams})`形へ変換する。
4. **V1プロフィールも引き続き使用可能**。`BATTLE_EXECUTION_PROFILE_SCHEMA=1`は`special`/`inspiritLevel`を指定する旧形式。技masterにも同じ値があれば一致が必要で、旧プロフィールの効果で技IDを上書きすることはできない。executionを持たないレガシー技はV1だけで実行可能、V2は拒否。これにより段階的な移行ができる。
5. `engine/catalog-battle-roster.mjs`の`compileCatalogTeamsForCombat`は既存のまま、任意`executionProfiles`としてV1またはV2を受け付ける。**旧6体の照合済みレンタル経路・本番Firebase・AI・HP・RNG・描画・カウンター必殺のフレーム処理には変更なし**。創作キャラだけ明示profile必須。

**V2の入力例**（この値は学校用の研究fixture、公式妖怪の性能ではない）：

```js
const profile = {
 schema: 2,
 characterId: 'v2-seventh',
 evidence: 'fixture',
 sourceRefs: [],
 soultimateRank: 1,
 soulCapacity: 100
};
// effect / damageKind / status level は character.moveIds が参照する
// move master にだけ存在する。profile に重複して書かない。
```

## 実行された検証

- **新規8件** `tests/v3-soultimate-move-master-v2.test.mjs`：6種類のレンタル必殺の元データ/unknown hit数/evidenceの一致、V1/V2共存、6効果形の実行可能性、V1/V2で創作7体目の必殺発動/HP/Soul/状態/RNGが5seed×75行動一致、3seedのオンライン`MatchProtocol` command/ACK/journal replay一致、原作未確認の命中数や攻撃種別の不正な変更がauthoring受付時に拒否、新旧の矛盾拒否、創作とりつきレベル3のV2実行/旧レベル1との矛盾拒否。
- 初回コードの回帰CIは**820/821 PASS, fail 1**。原因はテスト用に2つ生成した`MatchProtocol`の`hostNowMs`を同時刻に固定せず、リプレイ中の回転時刻が数ミリ秒ずれてjournalのバイト比較が失敗したこと。戦闘状態とhashは一致。**正式に両者のホスト時計を同じ固定時刻にするようテストを修正**し、再実行した。
- **正式合格コードSHA `518e810d11d9b53361299be4540ccaa43a24e55a`**：[Research battle unit #40923030136](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40923030136)：**Node 822/822 PASS、failure 0、skip 0**。6vs6自然対戦耐久PASS、実Chromium UI研究操作PASS。
- 同SHA：[Firebase Friends no Auth #40923029963](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40923029963)：**全Job SUCCESS**。RTDB Emulatorの2席/24ホスト行動/ACK/snapshot同一、切断→再接続、ホスト公開遅延8行動、実Chromium2iframeと4画面幅、Google Sites向け未配布HTML build（76 source modules、297,384 bytes）を確認。本番Firebaseへのチェックは**予約済み非ルームキーGET1回（HTTP200/本文非閲覧/書込0）**。本番ルール・DB/Auth・学校公開HTMLを変更せず。

## 次工程と残る課題

- 今回は**技の重複データの集約**であり、原作の新しい技データそのものの調査/忠実再現を一気に完成させたわけではない。`damageKind`等の源は研究用の架空レンタルfixture。技名、属性、効果値、難しい複合必殺のフレーム、ノーモーションの原作厳密タイミング、技レベルによる妖気補正も未検証。
- Skillの発火条件と発火数値は、現行6種`PLAYTEST_SKILL_CATALOG`と`SKILL_TRIAL`の研究用許可パイプラインを再利用。**任意に新しいSkill IDを登録しただけでは実行されない**。本家妖怪のskill DB化には出典ごとに検証が必要。
- **V3-4-5へ**：今ある「同じ数値のコンパイルテスト」を無限に積むのではなく、既存6体の技・スキルと表示ラベルを一つのデータ経路へ整理し、原作のキャラ・技一覧の資料から出典付きの最初の正規データパックを作れる範囲を見極める。プレイヤー向け学校キャラ選択UIの公開は別段階。
- V3-5では学校iPad Safari実機2台、Google Sitesへの実埋込、原作動画の動作/演出との直接照合が必要。ホストの**ブラウザ完全再起動後の試合復元**は未実装。本番ルーム向けに7体目が勝手に出ることはない。

main、学校公開版、本番Firebase Rules/DB/Auth、Google Driveへの変更はユーザー指示なしで実施しない。Draft PR #1の開発ブランチのみ更新した。
