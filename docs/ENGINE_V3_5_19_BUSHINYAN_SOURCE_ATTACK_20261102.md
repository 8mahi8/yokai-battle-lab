> **V3-5-22 重要訂正（2026-11-02）:** このV3-5-19記録の「閃光ぎり20×3が原作で確定」は後の[ゲーム別見出し再監査](./ENGINE_V3_5_22_CROSS_GAME_SOURCE_SECTION_CORRECTION_20261102.md)で訂正した。日本語のYW2攻略3資料は20×3だが、Mt. Wildwoodの明示的なYW2欄は20×2。現在の `content/yw2-attack-reference.mjs` ではHit数を `disputed` とし、自動採用しない。この文書の20×3は**日本語資料を採用した研究Fixtureの記録**であり原作確定ではない。

# 妖怪ウォッチ2｜Engine V3-5-19：ブシニャン「閃光ぎり」原作裏付けの3Hit研究

2026-11-02 / 開発ブランチ `feat/phase1-action-circle-lab-20261023`

## 目的・優先度

学校iPad Safariの友達1vs1で、原作で観察できる連続攻撃の数字とHP変化を確実に表現する。V3-5-18は**任意のカスタム3Hit**を実Host→共通表示まで通した。この工程では、未確認の仮ヒット数ではなく**『妖怪ウォッチ2』で複数の独立資料が一致する通常技**を1件だけデータ化し、その値を使ったホストの研究実行とChromium表示を確認する。

原作の外見・全能力値・正確なダメージ式・攻撃速度・敵AI・正確な攻撃アニメは別問題。**原作再現完了ではない**。変更は研究用カスタムマッチのみで、承認済みの学校レンタル6体はそのまま。

## 出典照合（本家YW2限定）

対象：ブシニャン（S・イサマシ）通常攻撃「**閃光ぎり**」の Lv1 表示威力 **20 × 3**。

- [攻略大百科・ブシニャン](https://gamepedia.jp/youkai-yw2/monsters/459)：通常攻撃「閃光ぎり」20 × 3、別の必殺技「かつおブシ斬り」25 × 10。
- [game-cap・ブシニャン](https://game-cap.com/youkaiwatch2/data/youkai_bushinyan.html)：通常攻撃「閃光ぎり」Lv1 20 × 3（Lv10 44 × 3）。『妖怪ウォッチ2 真打・元祖・本家』の妖怪資料。
- [GameConductor・ブシニャン](https://gameconductor.com/yw2/jiten/detail/?no=353)：通常攻撃「閃光ぎり」20 × 3、必殺25 × 10。

ここで確定できるのは**YW2のブシニャン通常技名と威力表示20×3、1つの通常攻撃対象への3Hitという形**。相手を選ぶAI、クリティカルや命中確率、与ダメージの実測値は未検証。実際のダメージは従来の研究エンジンが計算したものを使い、20×3を「各Hitは必ず20ダメージ」とは扱わない。

別件：同じブシニャンの必殺「かつおブシ斬り」も多資料が25×10とするが、[game-e](https://game-e.com/youkai-watch-2/youkai/322.php) は20×10を記す。この工程では必殺技の威力を確定しない。また**敵全体に10Hit**の割り振り方が本家で確認できていないため、現エンジンの`hitsPerTarget`に10と設定して30Hitに増殖させてはならない。ジバニャン「ひゃくれつ肉球」の5/7Hit資料相違も未解決として保持。

## 実装

1. `content/yw2-attack-reference.mjs` に、原作研究専用 `yw2:bushinyan:senko-giri` を追加。`actor/name/slot/power/hitsPerTarget/targetScope` と出典URL3件を固定。学校用 `content/rental-attack-moves.mjs` と切り離す。
2. `yw2ReferenceAttackResearchOverride(id)` は出典の明確な2項目 `{attackPower:20,attackHits:3}` だけを返す。**本人のレンタル6体データや原作キャラの名前・肖像・HP・能力値を変更する関数ではない**。研究者が明示して custom roster に適用した場合のみ動く。
3. `tests/v3-5-19-source-backed-normal-three-hit.test.mjs` は原作データと既存6体が分離されていること、Host実試合の3Hit、両席の同一Host記録、命中・MISS・HPの各段階、偽のレンタル技ID/ActionOutcomeが混ざらないことをテスト。
4. `lab/match-stage.html?review=yw2-bushinyan-attack` は同じ実Host custom rosterに source-backed 20 × 3 を適用する **研究専用モード**。キャラ絵とHP/その他能力は学校オリジナル妖怪から借りるが、ブシニャンそのものを完全再現した体裁にしない。
5. `tools/stage-smoke.mjs` にChromium実DOM検査を追加。Source値とHostの3Hit→各Hitの本当のHP・ダメージ/ミス・数字の色・技ID非捏造を確かめる。V3-5-18の既存カスタム3Hitブラウザ試験も維持。

## 確認と制約

- 開始前HEAD `e6b5abb` はNode/Chromium/Firebaseローカル2席のGitHub Actions全成功を確認済。
- **この変更後の結果は該当CI HEADで明示的に確認する**。CIが終了していない場合、全合格と報告しない。
- 本人提供の元MP4ファイルは本チャットでは閲覧できず、以前の原作フレーム観察記録を参照した。今回の原作数値は独立Web資料3件と一致しているが、原作3DS実機での秒数/分配/攻撃挙動は未検証。
- 学校のGoogle Sitesに直接貼ったHTML版・Firebase Rules/Auth/DB・GitHub main/Pages・Driveには変更なし。学校Safari実機2台は未テスト。
- **V3-5エンジン完成ゲートは未達。**

## 次工程（V3-5-20候補）

命中列を含む原作の**必殺技**について、（1）技の総Hit数、（2）前衛3体へのHit割り振り、（3）KO後の次対象、（4）アニメの起点と時間を資料/本人元動画で独立確認する。これが揃うまでは「20×10全体必殺」を既存の per-target 10Hit 契約へ自動変換しない。学校Safari実機が用意できるなら、数値研究より実戦の操作/進行・画面品質の確認を優先する。

引き継ぎ時は [HANDOFF最新版](./HANDOFF_LATEST_20261030.md) と [6段階ロードマップ](./ROADMAP_6_PHASE_PROGRESS_20261028.md)を併読。

## V3-5-19 コードHEADの最終CI実測（2026-11-02）

コード＋新研究Chrome受入を含むコミット **`c39abf67`** に対して、GitHub Actionsの終了状態まで確認済み：

- Node **967/967 PASS**：[Research battle unit tests](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41338130252)
- Chromium Stage **16/16 PASS** かつ `V3-5-19-YW2-SOURCED-ATTACK-CHROMIUM-PASS` をジョブログで確認：[Phase14](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41338124340)
- Firebase Emulator / Friends 2席の全ワークフロー **SUCCESS**：[Phase37](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41338130275)

後続のREADME/HANDOFF/ROADMAPは**文書だけ**のコミットであり、上のテスト結果はコード `c39abf67` を対象にしたもの。学校Safari実機は未検証、Google Sites HTML/Firebase本番 Rules は無変更。
