# 妖怪ウォッチ2対戦再現｜V3-4-7 ジバニャン通常攻撃・妖術の実戦接続

2026-10-30 JST。**開発ブランチ限定の部分再現研究**。最終目標は『妖怪ウォッチ2』原作対人戦の一貫した再現。公開学校ロビーや正式レンタル6体に、この原作キャラはまだ出していない。

## 原作資料（再確認）

- [攻略大百科：ジバニャン](https://gamepedia.jp/youkai-yw2/monsters/272) — するどいつめは威力**10×2**、火花の術は火属性**威力20**、ひゃくれつ肉球は**20×5**と記載。攻略ページのHP等はLv60であり、Lv99値へ取り違えない。
- [game-cap：ジバニャン](https://game-cap.com/youkaiwatch2/data/youkai_jibanyan.html) — するどいつめLv1 **10×2**、Lv10 **45×2**、火花の術Lv1 **20**、Lv10 **90**。技レベルで威力は変化する。今回は**Lv1での技威力だけを取り込む**。
- [Mt. Wildwood：ジバニャン YW2欄](https://mtwildwood.net/ja/yw2/yokai/jibanyan) — 通常技10×2、火術20と、それぞれの命中/ダメージ式の研究資料。**ひゃくれつ肉球を20×7と記載**し、上の国内資料（20×5）と不一致。現時点では確定不能なので元研究データの`disputed`を維持。
- [Game8：ジバニャン](https://game8.jp/youkai-watch2/497000) — Lv最大時の基準値 **HP322/ちから153/妖力90/守108/速165**。これはすべての性格・個体値・装備の値ではなく、基準値である。

## コーディング

新ファイル `content/yw2-jibanyan-normal-moves-lab.mjs`：
- `buildJibanyanNormalMoveLab({index?})` は前工程の immutable `YW2_ORIGINAL_REFERENCE_INDEX` の`yw2:jibanyan`から**文献で確定した（documented）数値とsourceIdsを抽出する**。未確定値・不正な数値・未定義sourceは拒否。
- 共通`extendCombatCatalog`へ`yw2:jibanyan:normal-moves-lab`を1体追加。新規技は**attack:「するどいつめ」10×2**と**technique:「火花の術」20・火属性×1**のみ。技それぞれの`evidence:'documented'`と`sourceRefs`を残す。Lv99基準の5能力値/ランクD/プリチー族も実際の出典に基づく。`YokaiDefinition.provenance`の`stats`/identityをdocumentedとし、4技全体は**2枠がfixtureであるためfixture**のまま。
- 名前は`ジバニャン（通常技のみ研究）`。**とりつき「しびれるお札」（速度ダウン）の実装は現行のinspiritsに未対応**、必殺「ひゃくれつ肉球」はヒット数文献不一致で未対応。研究のため当面は元の`rental-01`のInspirit/Soultimateを**ID共有のfixture**として借用。仮スキル`skill:momentum`は`まえのめり`原作の全量再現が未検証なので、発火効果の数値をfixtureと記録。性格AI重み/まじめさ/回避命中RNG/防御/技Lv1→Lv10成長などもfixture/未対応。
- `compileJibanyanNormalMoveTrialTeams({lab?})` は**既存の** `compileCatalogTeamsForCombat` と`BattleExecutionProfile V2`を通し、左右それぞれ6体（うち1体が研究用ジバニャン）の`createCombat({teams})`入力へ変換。新しいダメージ式、攻撃ループ、状態処理、ルーム/通信形式を作らない。
- このモジュールは学校用オンラインビルドからは**読み込まれない**。原作2技が実際の試合で処理されることだけを検証し、「ジバニャン完全再現」と称して公開しない。

## テスト内容

`tests/v3-yw2-jibanyan-normal-moves-lab.test.mjs`新規7件：
1. 新技2つが源データの10×2・火20×1/名前/出典と一致し、既存6体の24技は変化しない。
2. Lv99の基準5能力と「4技中2技だけ原作」の根拠表示/スキル・Inspirit・必殺・人格のfixture区別。
3. `CombatCatalog`→`BattleProfile V2`→`compileCatalogTeamsForCombat`で原作由来2技を両陣営6人の試合ロスターへ実際に導入。
4. 複数seedの自動6v6でジバニャンの攻撃2ヒットの各命中/ダメージと、火術の威力20/火属性を確認。**2ヒットとも外れた場合はダメージ計算値が無いのが正常**で、テストでnil許容（誤った期待値による初回CI失敗を訂正）。
5. 攻撃ヒット数・火属性・能力値が出典未確定・矛盾・禁止形式ならauthoringを中断。
6. 既存Lab/School 6体のseed比較とMatchProtocol replayを変更せず。
7. 研究用ジバニャンを**オンラインと同じ`MatchProtocol`のカスタムbattleOptions**へ通し、通常コマンド/ACK/自動行動とjournal再生を確認。実Firebaseで7体目の選択画面/ルームを公開したという意味ではない。

### CI証拠と注意

- **正式検証コードSHA `7d7fc1eb19bb22de799485d41cc5a80c47c9bfa7`**：[Research battle unit CI #40927920501](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40927920501) **Node 843/843 PASS、0 fail、0 skip**、自然6vs6耐久・実Chromium操作もSUCCESS。[Firebase Friends no-Auth QA #40927920539](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40927920539) **全ジョブSUCCESS**。Firebase RTDB Emulatorで2席/24ホスト行動のACKと正規snapshot一致、切断復帰、遅延公開中の8ホスト行動/正しいACK、実Chromium2iframeと4埋め込み幅、Google Sites用**未配布**HTML build（76 modules）すべてPASS。学校の本番Firebaseは予約済み非ルームキーへのGET1回（HTTP200、本文未閲覧、書込なし）。main・学校サイト・本番DB/Rules/Auth・Driveを変更していない。
- 初回の失敗1件は**2回とも外れた多段攻撃**で`event.damageResearch`が無いことをテストが考慮していなかったため。命中した試行のsource powerは厳密に検証する。

## 次工程 V3-4-8

原作にある**速度ダウンのとりつき**を現状の限定status registryで表現できるか検証し、特に速度の低下が行動順/時計・既存status効果に与える影響を確認する。計算式・持続/重複を原作から確認できない間は新規ルールを捏造しない。`ひゃくれつ肉球`は多段数20×5/20×7の一次資料が決着するまで保留。研究キャラの操作・見え方は実機動画比較とSafari2台試遊がV3-5の完了条件。

**現在地：V3-4-7 二つの原作通常技を共通戦闘エンジンで実行する試作まで**。原作全キャラ戦闘対応・本番オンライン投入・完全再現ではない。
