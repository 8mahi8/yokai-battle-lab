# Phase 21C-B｜原作初手の行動権・同着・マッチング前衛の資料検証（2026-10-25）

**対象**: 原作研究 → 行動順（`engine/phase1.mjs`）→ 独立比較器（`engine/opening-first-action-audit.mjs`）。Phase21C-Aの94行速度表を再利用。**本番戦闘のAI/順序/速度を変更していない。**

## 1. 今回追加で確認した原作資料と証拠の格付け
- [Mt. Wildwood Turn Order](https://mtwildwood.net/turn-order.php)：初手は素早さ別の範囲から乱数、最小待ち値から行動、行動後は技のwait×素早さweight、回して前衛入りした妖怪は3×weight。**原作ROMそのものの再検証ではなくコミュニティ解析・実測データ**。同着や乱数seedは未提示。
- [マグロ「妖怪ウォッチ2対戦の全て」初期前衛行動権](https://note.com/uzoumzou_nanoha/n/n2fb6ae41559c)：対戦開始前に登録した前衛が特別な行動権を持ち、それは戦闘中に獲得した通常の行動権より弱いとの実戦記述。初期前衛と、バトル開始時に回転して見えている前衛が異なる例を提示。**競技者観測として有力だが内部数値・効果量は未確定**。
- [RC「妖怪ウォッチ2実験結果」優先行動権](https://note.com/ricosama0726/n/n14710bbe446c)：前衛の登録時点はマッチング時だろうという半回転の試験。被験例は限定的で正確な優先度計算・同着処理の根拠ではない。
- [たくトンボ「知って得する対戦の基礎テクニックと仕様のだいたい全て」](https://note.com/tombow_yw/n/n1e4cf179d2d9)：前衛補正は存在するが補正倍率には誤りがある可能性を自身で留保。**0.4〜0.6といった係数を確定実装しない**。
- 既存成果：[Phase1研究](./PHASE1_RESEARCH.md)、[Phase6初期前衛・閃光研究](./PHASE6_OPENING_FLASH_QA_20261023.md)、[Phase21C-A](./PHASE21C_INITIAL_ORDER_SOURCE_AUDIT_20261025.md)、`engine/opening-priority.mjs`・`tests/opening-match-offset.test.mjs`。Phase6の登録前衛と見えている前衛の別管理、再登場時の仮行動権、閃光魂研究の扱いを再確認。**実装の二重化を避けた**。

### 21C-Bの結論
1. 初期前衛登録と可視リングを同一視できない。現在の本番モデルの`turn===0`登録前衛再登場の仮処理は、**原作で他の妖怪が先に動いた後も初期行動権が残り得るという競技者記述を再現できたとは言えない**。ただし数値がなく正規ホストを変更しない。
2. Mt. Wildwoodの94行表は「どの妖怪が最初に動ける可能性があるか」を条件付きで判定できるが、実機初手の確率分布、同着、乱数seed、時間的境界を確定しない。
3. 原作プレイ映像の始点・素早さ・対戦前登録リング・回転履歴が揃わない映像で「行動順が間違っている」と断言しない。

## 2. 実装（原作ゲームを勝手に変更しない比較器）
**追加**: `engine/opening-first-action-audit.mjs` の純粋関数 `auditFirstAction`。6体×双方の**有効素早さ**、マッチング時リング位置、戦闘開始時に見えている位置、登録後のサークル回転有無、原作で最初に動いた妖怪IDを入力する。

- **厳密な比較条件**: 6体の初期前衛がマッチング時と開始時で一致し、登録後に1回もリングを動かしておらず、閃光魂や未知の初期行動スキルがないことが記録で確認できるケースのみ。
- その場合、既存`initialWaitRange`の独立な整数区間について「対象の最低waitが、ほかの全員の最大wait以下」のとき最初に動ける**可能性がある**と判定する。同値優先が原作不明なので同着を除外しない。観測した初手が範囲外なら`inconsistent-with-table`＝**この条件下の非公式待ち表モデルとの不一致**、原作ROMの誤りの証明ではない。
- マッチングと可視前衛が異なる、または回して戻すなど履歴がある場合は、常に`indeterminate`とし、仮の数値で「原作と一致／不一致」を決めない。
- `firstWaitRanges`、`possibleFirstActors`、唯一の候補なら`forcedFirstActor`を返す。入力を変えず、外部通信なし、偽のactor ID/欠落素早さ/範囲外オフセットは拒否。
- これは**研究機能**であり標準の`createMatchProtocol`・戦闘ゲームUI・Firebaseには未接続。学校Google Sitesやmainには導入しない。

### 例：純粋な研究用比較
```js
import {auditFirstAction} from './engine/opening-first-action-audit.mjs';
const slow=Array.from({length:6},()=>({speed:1}));
const a=slow.map(x=>({...x}));
a[0]={speed:999};
console.log(auditFirstAction({
  teams:[a,slow],
  matchingStartOffsets:[0,0],
  visibleStartOffsets:[0,0],
  wheelMovedSinceRegistration:false,
  observedFirstActor:'A1'
}));
// 94行表において possibleFirstActors:['A1']、
// status:'consistent-with-table' (原作実機の完全一致証明ではない)
```

## 3. 実施したテスト
`tests/phase21c-first-action-audit.test.mjs` に**8ケース**を追加。
- 同速の前衛6体：同着順を捏造せず全員候補
- 速1体・遅5体：初手が必ず速い候補となる
- 遅い妖怪が初手という架空例：条件を満たす場合のみ「待ち表モデルとの不一致」
- 開始前の前衛と登録前衛が異なる、同じ位置へ回し戻した履歴：どちらも**判定不能**
- 回転後の妖怪IDの割り当てと陣営区別、再現性・非破壊、無効入力の拒否

**Node + Chromium研究画面**: [run 40108875411](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40108875411) 成功。最新成果のrunは進捗マップで確認。原作3DSの実測照合は**未実施**。

## 4. 次の作業と判定ゲート
1. **21C-C観測資料の収集**: 初期の6体の有効速度・登録時前衛・開始時前衛・初手までのリング回転・最初の複数行動がわかる原作データを収集。素早さ効果・閃光魂・イベントスキルを記録。集められない場合は無根拠な調整をしない。
2. **同着ゲート**: 同じ待ち値を持つことと競合する両陣営の行動権を原作情報で直接確認する。実装のA優先・前衛順は現在の**仮実装**。
3. **登録前衛の継続条件**: マグロの具体例のように登録前衛を外してほかが行動してから戻す比較実験が必要。Phase6の仮クレジット`turn===0`を根拠なしに通常版へ入れない。
4. **Phase21D**: 既存の妖気研究を再利用して、行動種ごとの妖気増減を照合。原作確認ができていない数値は採用しない。
5. 以降 Phase22 → 23 → 24：PvPテクニックの本家照合 → Firebase/オンライン安定 → 学校iPad Safari・Googleサイト**直接HTMLコード貼り付け**。本番変更・費用はゼロ。

**ユーザー操作なし、開発ブランチのみ更新。** `main`、既存Googleサイト版、本番Firebaseに変更なし。原作再現優先、レンタル6体／初期閃光魂OFFの方針維持。
