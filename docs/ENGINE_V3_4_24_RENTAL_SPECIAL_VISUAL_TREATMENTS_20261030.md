# Engine V3-4-24｜原作動画の必殺カットイン・着弾の「技別の違い」をレンタル6体に共通実装（2026-10-30）

## 元動画と公式/攻略資料の照合

本人2026-10-27原作動画**第1試合00:43〜00:52**：「ひゃくれつ肉球」の専用背景とキャラ大型カットイン→戦闘舞台に戻り数字を伴う連撃。一方**00:59〜01:05**「トホホの砲」は青紫カットイン→敵前衛への効果→すばやさDOWN表示。**01:42〜01:50**「大ガマ変化の術」は緑基調の別カットイン。別の録画[Phase49](./PHASE49_USER_SUPPLIED_ORIGINAL_PVP_VIDEO_REVIEW_20261027.md)でも技別背景を観察済み。これは[以前に直接観測された動画台帳](./ORIGINAL_PVP_VIDEO_20261027_MATCH01_OF04.md)の再確認であり、今ターンのMP4原本直接視聴ではない。

追加照合：
- [攻略大百科・妖怪ウォッチ2「トホホの砲」](https://gamepedia.jp/youkai-yw2/specials/3826) は**敵全体への30×1攻撃+すばやさDOWN**を記載。3対象の見た目を3Hitと取り違えてはいけない。
- [同「ひゃくれつ肉球」](https://gamepedia.jp/youkai-yw2/specials/3961) は20×5、[Mt. Wildwood YW2 ジバニャン](https://mtwildwood.net/ja/yw2/yokai/jibanyan)は20×7を記載。**同じ原作2の情報でも食い違うため、5/7いずれも本版で確定採用しない**。
- [原作対人研究](https://note.com/tombow_yw/n/n1e4cf179d2d9)はモーション中の相手側情報保留を説明。正確な演出ms/ラグの根拠ではない。

既存コードには**ホスト確定のSoultimateImpactLedger（対象と実HP）**と、明示研究fixtureの**SoultimateHitLedger（1打ごとの実HP）**がある。表示タイムライン`presentation/action-choreography.mjs`はターゲットindexとhit indexを既に分離済み。今回、そこでヒット数や乱数を作り直さない。

## 実装：原作の「技ごとに背景/エフェクトが異なる」という体験の構造を共有する

- **新規`presentation/soultimate-visual-profiles.mjs`**：正式な現行レンタルMoveMaster=`content/rental-soultimate-moves.mjs`の6カテゴリから、プレゼン用の**strike（攻撃）/siphon（吸命）/rally（味方強化）/storm（攻撃＋状態）/renew（復活・回復）/suppress（敵弱体化）**を導出。個別の技ロジックや原作ゲームに存在しない固有技は増設しない。数値も演出時間も変更なし。
- 出現条件は**実ホストSpecialイベントのactorと現行レンタル名前/skillおよび影響の種類が対応**すること。別キャラ/別スキル/出典付き原作技/異なる効果なら汎用シーン（安全なフォールバック）に戻す。ヒット数はこのProfileに存在しない。
- `ui/match-stage.mjs`の**読み取り専用`makeStageView`**が原作技ではないレンタル6体だけにProfileを付与し、`ui/battle-vfx.mjs`が同じHost`eventId`のCueに転送。`planActionChoreography`は存在する正規Profileを検証して、従来の**anticipation→impact→recovery**時間軸に渡す。
- カットイン：大型キャラ/技名は既存の原作風オリジナル素材を維持。`data-treatment`で線の方向・円/四角等の形状を6技種別に変える。
- 着弾：フィールドで`#mb-special-impact-style`を**impactフェーズ中だけ**表示。攻撃なら斜線、吸命なら吸収リング、味方強化なら立ち上がり光、攻撃＋状態なら渦、復活回復なら柔らかな光、弱体化なら圧力図形。いずれも**効果の意味を区別する演出であり、命中/状態成功の嘘表示ではない**。数値・MISS/HP・強化/弱体化の効果発動の権威は引き続き正規Hostのみ。`prefers-reduced-motion`ではアニメ停止。
- **ゼロ変更**：`engine/combat.mjs`、MatchCore、命中判定、Soultimate moveの威力・対象/HitPattern、RNG、勝敗、Soul消費、Firebase Friendsプロトコル、認証なし学校ネットワーク、ホスト時計、原作の不確かな秒数。原作キャラを6体に置換しない。

## QA、残る実機/原作差

- **新規`tests/v3-4-24-special-visual-profiles.test.mjs`4件**：レンタル必殺6種を**実`createCombat`**で発動→Host event→`makeStageView`→Cue→Choreographyで視覚効果が正しく選ばれる、Host snapshotの同値、未確認Hit数の保持、別キャラ/原作研究技/異なる効果の誤流用禁止、CSS全6種と動き抑制を確認。
- **実Chromium`lab/match-stage.html?review=real-special-ledger`**で、ホストが実際に解決したA1の必殺を検証。カットイン時に`strike`Profile、その後のimpactで着弾レイヤー`strike`と**B1→B2→B3の実Host HP結果が段階ごとに一致**することを、`tools/stage-smoke.mjs`の既存Phase14 QAの一部として確認する。
- 今回も元動画MP4を直接再取得/再生できていない。学校Safari実機2台・同じ技を本人の映像の横に並べた主観評価は未実施。元の自作6体は原作妖怪ではない。**今回の成果は表現の共通基盤と6技別の個性化であって、原作の個別の必殺カットインの1:1再現とは言わない**。

## 次 V3-4-25

第1試合で視覚的に大きい差として残る**KO後の青い火/失った前衛の退場と後衛からの補充**を、HostのKO/自動交代Eventだけを根拠にStageへ反映する。既存の`engine/knockout-lifecycle.mjs`と`ui/match-stage.mjs`の間で、原作の「位置が空き→残ったメンバーが前列に並ぶ」という場面を見せるための最小可視化にする。KOを演出都合で遅らせたり、回復/復活・試合終了を誤判定しない。すでに十分な既存演出があるならそこを優先評価してから変更する。

開発ブランチ：`feat/phase1-action-circle-lab-20261023`。学校Google Sites直貼り版、GitHub main、本番Firebase DB/Rules/Auth、Google Drive配布は変更していない。
