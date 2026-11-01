# 妖怪ウォッチ2 忠実再現｜V3-5-20 原作全体連撃の資料不一致・回復演出の重複防止

**2026-11-02 / 作業対象：開発ブランチ feat/phase1-action-circle-lab-20261023**

## 1. 対象と原作照合

前工程 V3-5-19 [閃光ぎり・通常攻撃20×3](./ENGINE_V3_5_19_BUSHINYAN_SOURCE_ATTACK_20261102.md) は、技の3発を**同じ対象**に攻撃するホスト実戦・Chromiumで確認済。V3-5-20は、元動画の「必殺カットイン→複数のダメージ表示→復帰」に出てくる**敵前衛3体に対する全体連撃**と、画面での最後のダメージ数字の再生を扱う。

### ブシニャン「かつおブシ斬り」：既存認識より不一致が大きい

本家『妖怪ウォッチ2』表記として以下を確認：

| 資料 | Lv1威力 | 表記Hit数 | 対象の記述 |
|---|---:|---:|---|
| [攻略大百科・必殺](https://gamepedia.jp/youkai-yw2/specials/3892) | 25 | 10 | 敵複数 |
| [game-cap・ブシニャン](https://game-cap.com/youkaiwatch2/data/youkai_bushinyan.html) | 25 | 10 | 敵全 |
| [game-e・ブシニャン](https://game-e.com/youkai-watch-2/youkai/322.php) | 20 | 10 | 敵全体 |
| [Mt. Wildwood・Shogunyan (YKW2)](https://mtwildwood.net/yw2/yokai/shogunyan) | **22** | **9** | 対戦相手複数 |

『20×10』だけでなく**22×9**というデータマイニング系の資料も存在する。版違い・解釈違いの原因は未確認で、どれかを恣意的に「正解」と決めてはいけない。

複数の独立Web資料で「敵側の複数対象を斬る攻撃」という効果範囲は一致。ただし、以下は**未確認**：

1. 9/10回が**全体の攻撃回数**なのか、各敵1体ずつの回数なのか。
2. 各敵への攻撃配分・順番・ランダム対象選択・気絶後の再標的化。
3. ガード・MISS・クリティカル・一撃割込み時の命中表示。
4. 画面カットイン・命中・通常表示復帰のミリ秒。

過去の本人提供動画の観察記録 [MATCH01](./ORIGINAL_PVP_VIDEO_20261027_MATCH01_OF04.md) 00:43–00:52 / 01:28–01:37 は**ジバニャン「ひゃくれつ肉球」**の連続ヒット演出を確認しているが、ブシニャン必殺の打撃配分を直接検証した映像ではない。元動画原本は今回直接閲覧できていない。

## 2. GitHub実装

- `content/yw2-multitarget-soultimate-research.mjs`：資料ごとの `power`=[25,20,22]と `listedHits`=[10,9] を**出典ごとに凍結保存**。`allocation`は `status:'unknown',perTargetHits:null,globalHitSequence:null,retargetOnKO:null` とし、`battleReady:false`。学校用レンタル6体の定義も、既存 `YW2_REFERENCE_SOULTIMATES` の**原作元資料が合致した2技**も不変。未確認の全体9/10Hitを、Hostが解釈する `researchSoultimateHitCount` (「**対象1体あたり**のHit数」) に勝手に渡さない。
- `ui/match-stage.mjs`：`showImpact()` は `impact`/ `recovery` 両方で真のまま（命中後HPの確定表示を維持）。一方 `visibleHit()` は **impact中だけ**ダメージ数値・MISS・被弾反応を返す。以前は `recovery`への画面再構築で**最後のダメージ数字がもう一度生まれ直す**構造だったが、これで重複表示を避ける。ホストゲーム状態、Soul、時計、通信は変更しない。
- `lab/match-stage.html`：通常3連撃/出典付き「閃光ぎり」20×3 / カスタム3Hit必殺の既存Chromium実Host試験で、Hit全件の表示・HPを確認した後、**recovery画面では浮遊数値ゼロかつ最終HPを保持**するまでテスト完了としない。動画の正確なフレームタイミングを仮定しない。
- `tests/v3-5-20-unresolved-multitarget-and-recovery.test.mjs`：出典衝突・不変・未実装の確認、実Hostカスタム必殺の乱数/Hitプロトコル非影響、画面のlast-hit再発防止を回帰テスト。

## 3. 検証とリスク

最初の基準 `f207d5e` はGitHub ActionsのNode/Chromium/Firebase 2席がすべて成功。

- **今回のコードコミットに対するNode・Chromium Stage・Firebase 2席の終了結果を別途確認すること。CIがキュー中の状態ではPASS扱いしない。**
- 正しい「全体多段必殺」のエンジン実装は**まだ行わない**。今回の暫定情報だけで9/10Hit×3対象を作ると原作と異なる攻撃回数になる危険がある。
- 学校Safari実機2台・原作3DSの直接フレーム再測定は未検証。GitHub main・Google Sitesに直接貼り付けたHTML・Firebase Rules/Auth/DB・Drive配布は変更なし。

## 4. 次 V3-5-21 の優先作業

1. 上の3系統の最新HEAD CIが全成功であることの確認（失敗した場合は修正を最優先）。
2. 信頼できる実際の**ブシニャン必殺技**の3DSゲームプレイ画面で、「攻撃発生数」と「敵1体ごとの数字の出方・ダメージ/HP減算・KO後」が観測できる場面を探す。確定した技についてのみ正式なper-hit標的割当て方式を設計する。
3. 学校iPad Safariで実際に遊ぶ機会があれば、画面表示・試合テンポ・接続性の問題を原作研究より優先。原作研究用fixtureは身内レンタル6体へ無許可で適用しない。

**ロードマップ全体：ゲームエンジンV3-5進行中。原作体験の完全再現は未完了。**

## 5. 2026-11-02 実測CI追記

今回の**コードと新テスト**を含む `0d388345` で確認：

- [Node Research battle tests](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41361314423)：**971/971 PASS**。`V3-5-20` 4テストを含む。
- [Chromium Stage QA](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41361314464)：**SUCCESS**。16件のStage予備テスト、通常3Hit・出典つき閃光ぎり・カスタム必殺9Host Hitの各DOM受入成功。今回追加したrecovery再描画防止も各ケースの終了条件。
- [Firebase Friends 2席 CI](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41361320062)：独立の**実2クライアント・認証不要Rules・二iframe Chromium対戦**ステップはSUCCESS。その後の「旧Rules期限の再現・LIVE read-only probe」の全ワークフロー終了はこの追記時点で**進行中**。全体PASSと取り違えない。

後続の `docs/HANDOFF_LATEST_20261030.md` / `docs/ROADMAP_6_PHASE_PROGRESS_20261028.md` / README更新は文書変更。これらの最新HEADのCIは別途GitHub Actionsで確認する。学校iPad Safari実機では未検証。
