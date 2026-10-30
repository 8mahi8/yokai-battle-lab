# 妖怪ウォッチ2対戦再現｜引き継ぎ現況（2026-10-30）

> 前チャットが開けず、直前担当の専用引き継ぎ文がない状態から、2026-10-30にGitHubを再監査して記録したスナップショット。古いHANDOFF_*.mdやPR本文の過去Phase記述は、現行実装の証明に使わない。

## 再開時の正規入口
- repo: `8mahi8/yokai-battle-lab`、開発ブランチ: `feat/phase1-action-circle-lab-20261023`
- 初回監査時HEAD: `a5bbd41061060f81e49c1399b56daf15b49e2026`（V3-4-16 docs）。**その後同日V3-4-17開発済み**：[V3-4-17詳細](./ENGINE_V3_4_17_FRIENDLY_FIRE_CONFUSION_20261030.md)
- Draft PR #1: https://github.com/8mahi8/yokai-battle-lab/pull/1
- まず読む現行工程・設計: [6段階ロードマップ](./ROADMAP_6_PHASE_PROGRESS_20261028.md)、[V3アーキテクチャ](./ENGINE_V3_ARCHITECTURE_SOURCE_FIRST_20261029.md)、[学校通信の正規方針](./SCHOOL_NETWORK_SOURCE_OF_TRUTH_20261029.md)、[直近V3-4-16](./ENGINE_V3_4_16_MEMORY_DUO_NORMAL_MOVES_20261030.md)
- 以前のPhase資料やSupabase資料は過去研究の経緯。コードの正規状態とユーザーの新しい承認済み方針を優先。

## 本人の完成条件と厳守事項
- **原作『妖怪ウォッチ2』の1vs1対人バトル体験を再現する。** 元動画のサークル、敵ピン、チャージ、必殺、Gわざ/つつく、おはらい、3前衛/3後衛、行動タイミング、双方の表示・進行、試合終了を、実際に操作可能な一つの戦闘として再現。1技ごとの専用パッチより、共通MatchCore・Effect・時間・表示・出典付き技/Skillデータで揃える。
- 両者同じレンタル6体から始める。閃光魂・育成・ランキング等の新仕様を勝手に追加しない。原作値に未確証があればfixture/研究と区別する。
- 学校iPad Safari／Google Sitesへ**単体HTML直接貼り付け**／Firebase Realtime Database **Friends・認証なし・6桁ルーム**。過去のSupabaseは現行通信方式ではない。Firebaseを不用意に作り直さない。
- GitHub開発ブランチは開発に使ってよい。ただし本ゲームの継続方針として、**学校に実際に貼られたHTML、main、Firebase本番Rules/DB/Auth、Google Drive配布物**は、明示依頼まで変更しない。
- 原作の対戦動画ファイルを今回直接見たわけではない。過去の観察台帳は参照可能だが、元動画を確認したかのように報告しない。学校Safariで未検証なら明記。

## 今回コード／CIから確認した最新現在地
- **Engine V3-4 第17工程**まで開発履歴と実コード・テストが存在。V3-4-17は研究用の混乱（味方を確率攻撃する状態）を共通行動・物理Hit/KOへ接続、[Node908/908 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41038374000)、[Firebase Friends 2-client PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41038374004)、[stage PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41038368804)。混乱の味方対象抽選は研究fixture。通常online未導入。V3-4-15は原作キャラID→共有スキル「まもりわすれ」→既存行動選択器の接続。V3-4-16はわすれん帽・メゾン・ドワスレの**原作通常攻撃/妖術の計4技**・能力・基本行動重みを共通カタログ経由で研究用6vs6へ接続。実ファイル `content/yw2-memory-duo-normal-lab.mjs`、`tests/v3-yw2-memory-duo-normal-lab.test.mjs`。
- **重要：**上記2体のとりつき/必殺は原作効果がまだ未実装で、研究fixtureを使用、`battleReady=false`。通常の学校レンタル6体と現行online MatchProtocolへその2体は導入されていない。進捗を「原作キャラ2体完成」と読み替えない。
- 監査時HEAD `a5bbd410` に対する [Research battle CI #40973249690](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40973249690)、[Firebase Friends 2-client #40973249628](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40973249628)、[Chromium stage #40973242426](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40973242426) の全jobが **success**。直前の実装コミット `01d55eea91dac5bb31cc1c37699f2600d8e7ae5a` は [Node 901/901 PASS と文書で記録](./ENGINE_V3_4_16_MEMORY_DUO_NORMAL_MOVES_20261030.md)、[実装時CI #40972890661](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40972890661) も success。
- 2026-10-30のこの引き継ぎ確認では**新たなローカル単体テスト・iPad実機試験は実施していない**。成功の根拠はGitHub上の既存Actions。

## 未完成・次の合理的工程
- V3-4-17候補は、原作の「混乱／味方誤攻撃」を既存の共通Status/Effect/行動選択へ統合するために、**原作2の資料から発動条件・対象・確率・行動順・解除条件を先に検証**すること。別エンジンや独自の即席混乱処理を増設しない。
- ただし**研究キャラの追加自体を目的にしない**。目的は既存6体と試合全体の原作再現。次作業は、既存の状態基盤に不足している一般機構と現在のレンタル戦闘への効果を吟味してから最小範囲で実装。
- ほかの不足：原作版のスキル封印・性格AIの全条件、必殺効果/対象/ヒット数の完全一致、ジバニャン「ひゃくれつ肉球」5/7hitの資料食い違い、原作動画と実画面の逐次比較、学校iPad Safari2台・本当のGoogle Sites埋込での新V3実戦。
- **V3-5エンジン完成判定は未達**。CI PASS≠原作仕様一致≠学校実機試験成功。
- 作業後は今回作業／テスト結果と未検証／ロードマップ現在地／次工程／コミットの有無を簡潔に報告し、最新ロードマップと引き継ぎの相違を更新する。

## 監査の範囲
2026-10-30にGitHubのブランチ一覧、最新25コミット、開発HEADの509ファイルツリー、ROADMAP、V3設計・V3-4-14〜16工程資料、Firebase現行方針、テストファイル、GitHub Actions HEADのjob結果を直接確認。前担当の直前会話にはアクセスできないため、未コミットの作業・意思決定は確認済みと主張しない。
