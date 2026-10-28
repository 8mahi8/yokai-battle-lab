# Phase2.2C｜原作の技データ2件を実ホストの1hit処理へ（custom lab only）

更新 2026-10-29 JST。開発ブランチ `feat/phase1-action-circle-lab-20261023`。

## 完成基準と研究範囲

本人の最終目標は**送付した原作『妖怪ウォッチ2』対人戦動画と同様の駆け引きを、学校iPad Safari + Google Sitesの友達対戦で実際に操作できること**。研究エンジンとNodeテストが成功してもこの完成条件とは別。

本工程は**原作資料で2つの『技の形』が一致するものを、独立したカスタム研究戦闘で実際に発動させる**。実キャラクター/育成/表情/3DSのムービーと正確な攻撃式まで同一にする工程ではない。元の本人提供MP4 5本はこの作業中に直接再視聴できていない。過去の「ひゃくれつ肉球」「トホホの砲」タイムコード付き観察記録とは区別する。

## W2限定のソース照合

| レファレンス名 | 妖怪 | 出典で一致した形 | 直接確認の出典 | 今回適用を控えた部分 |
| --- | --- | --- | --- | --- |
| 鼻血ボンバー | たらりん | 攻撃 / 敵全体 / 威力100×1（Lv1の表記） | [攻略大百科 技](https://gamepedia.jp/youkai-yw2/specials/3820)、[ゲーム攻略game-cap 妖怪](https://game-cap.com/youkaiwatch2/data/youkai_tararin.html) | 攻撃式の正確な乱数/弱点、戦闘アニメ、原作のレベル依存や行動硬直 |
| 大切断 | オオクワノ神 | 攻撃 / 敵1体 / 威力210×1（Lv1の表記） | [攻略大百科 技](https://gamepedia.jp/youkai-yw2/specials/3607)、[game-e 妖怪大辞典](https://game-e.com/youkai-watch-2/youkai/037.php) | 上記と同様、実原作キャラ能力・Lvやモーション未再現 |

**違うタイトル版の技**（バスターズ2、YW3等）のヒット数・属性を持ち込まない。特に「ひゃくれつ肉球」20×7（Mt. Wildwood YW2）と20×5（攻略大百科Y2）は引き続き衝突し、今回は組み込まない。本人動画内の「トホホの砲」30×1+すばやさ低下は資料上確認済みだが、**既存エンジンはスピードの段階低下を行動順に反映できると実証できていない**ので、「効果まで完全再現」と誤認させる実装を回避した。

## 新コードと技の情報経路

- **`content/yw2-soultimate-reference.mjs`** 新設。元データ2件に技ID・威力・対象・各対象Hit数1・出典URLを一括保持し、`Object.freeze`で読み取り専用化。evidence = `two-independent-yw2-guides`、rulesStatus = `shape-only`。レンタル6体の既存`content/rental-soultimate-moves.mjs`とは独立。
- **`engine/combat.mjs`** に `researchYw2Soultimate:null | moveId` を追加。使用条件は **`teams` に明示的な custom 6体×2チームを供給 + `researchSpecialEffects:true` + `researchDamageModel:true`、既存全体Hit数オーバーライドと併用禁止、レンタルカタログ選択不可**。開発時だけA1の技定義を参照データへ変える。既定nullなら学校Friendsと通常戦闘は一切変更されない。原作のたらりん/オオクワノ神の実外見・本来のキャラパラメータは、A1に自動追加していない。
- 前の`researchSoultimateHitCount`（2–9の純カスタム試験）の実ホスト経路を再利用し、**参考技1×敵3体/1×敵1体**の各ヒットについて実際に命中・会心・Guard・HP・LastStand・KOを計算、`researchSoultimateHits`で結果を記録。単なる`impact`の事後分割ではない。
- `contracts/soultimate-hit-ledger-v1.mjs` の検証範囲を**1–9Hit**へ拡張。見た目で`hitCount=1`と言っても`SoultimateHitLedger.originalHitCount`は**null**：これは「実ホスト打撃台帳」であり、原作の各打の正確な乱数式/アニメが検証済みとの宣言ではない。原作資料の確定したHit形は、別の`referenceSoultimate.hitCount=1`および証拠リンクに保持。
- `ui/battle-vfx.mjs` → `presentation/action-choreography.mjs` → `ui/match-stage.mjs` でも原作技の参照ID・Hit数/対象/evidenceの一致を検証。研究用画面の技カットインタイトルへ**「原作技の研究：鼻血ボンバー」「原作技の研究：大切断」**と表示し、実キャラA1の元肖像を原作たらりんと誤認しないようにする。公開版と既定レンタルの技名・カットインは一切変更しない。

## テスト・証拠

- `tests/phase2-2c-source-backed-single-hit-soultimate.test.mjs`：2件の原作資料形の凍結、全体3人×1Hit/単体1人×1Hitの実ホスト処理、実HP一致、cue→choreography→Hit表示、旧レンタルへの流入・誤った実験設定の拒否。
- 2026-10-29 JST時点コードのNode **691/691 PASS**、自然6体対戦耐久・研究Chrome PASS：[GitHub Actions 40721184570](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40721184570)。
- 実Chromiumの`lab/match-stage.html?review=yw2-reference-front` / `...-single`を加え、各技を本物のカスタムホストで発動させて、上画面の浮動数字/対象/HP/技名の表示を調べる`tools/stage-smoke.mjs`を追加。**この文書の初稿時点では最終Chromiumワークフローの成否は別途確認必要。後日成功を追記**。

## 非完了事項と次の優先順位

1. 最終ブラウザQAの2技の命中/HP検証が完了しているか確認し、失敗なら修正・再実行する。
2. **「トホホの砲」＝敵全体への単発攻撃＋すばやさDOWN**が元動画に登場する。速度低下が原作と同じ順番待ち・残り行動時間にどう作用するかソースを調べ、原作のSPDバフ/デバフ→行動順システムへ検証可能な形で接続する。単純に画面だけで「遅くなった」と表示して完了とはしない。
3. 同じ動作の原作動画と開発版Chromium連続フレームの差を見て、顔/カットイン/命中数字/待ち時間/相手側の表示停止の実際の違いを詰める。
4. 学校Safari 2席・Google Sites友達対戦で**今回の参照技は未配布／未試験**。今回編集したのはGitHub開発ブランチのみ。main、Google Sites稼働版、Firebase本番Rules/DB、旧Drive配布は更新禁止のまま。
