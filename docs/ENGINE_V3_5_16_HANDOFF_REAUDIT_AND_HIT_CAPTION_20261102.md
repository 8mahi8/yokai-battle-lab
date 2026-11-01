# 妖怪ウォッチ2 V3-5-16｜引き継ぎ直後の原作・コード再監査と多段ヒット表示修正（2026-11-02）

## 結論と開発状態

- **現在地：V3-5 エンジン完成ゲートの途中。原作完全再現は未達。**
- 正式な最終目標は、本人が送った原作対人動画のように学校iPad Safariで6対6の1vs1が遊べること。Nodeテスト数・Chromium合格と原作忠実性は別。
- 2026-11-02 02:49 JSTごろに開発ブランチHEAD `2b5a460`を読み取り、README、HANDOFF、6段階ROADMAP、V3-5-15、技マスター、正規HitLedger、Choreography、Stage、テストを照合。新規追加時も**正式な承認済みレンタル6体**を維持し、知らない技名と本家ヒット数は創作しない。
- 元MP4原本は現在の会話ファイル検索で取得できなかった。過去実フレーム観察ログだけが本人提供映像の参照先であり「今回の再視聴」ではない。

## 原作資料と現コードの照合

1. 原作公式：[レベルファイブ「妖怪とバトル」](https://www.youkai-watch.jp/yw2/game/game06.html) は前衛妖気・Gわざ・零式つつくの存在を提示。対人の実時間/内部乱数は証明しない。
2. 過去本人動画記録：[Match01](./ORIGINAL_PVP_VIDEO_20261027_MATCH01_OF04.md) 00:43–00:52「ひゃくれつ肉球」では**カットイン→戻って複数ダメージ数字**、01:08–01:23 KO→前衛交代、02:01–02:06 勝敗。Phase49には技名ポップ・赤ピン・緑スキル通知。別録画/各フレームの正確秒数を混同しない。
3. 攻略資料の差：[攻略大百科・ひゃくれつ肉球](https://gamepedia.jp/youkai-yw2/specials/3961) の威力20×5と[Mt. Wildwood Wiki・ジバニャン（YW2）](https://mtwildwood.net/ja/yw2/yokai/jibanyan) の20×7は矛盾。既存 `content/yw2-original-reference-pack.mjs` は disputed として正しく保持、`tests/v3-original-yw2-research-source-pack.test.mjs` でその留保を固定。**ヒット数を一方に決めない**。
4. **独立した二つの資料で一致する研究用オリジナル技**：`鼻血ボンバー`威力100×1・敵全体は[攻略大百科](https://gamepedia.jp/youkai-yw2/specials/3820)/[game-cap](https://game-cap.com/youkaiwatch2/data/youkai_tararin.html)、`大切断`威力210×1・敵1体は[攻略大百科](https://gamepedia.jp/youkai-yw2/specials/3607)/[game-e](https://game-e.com/youkai-watch-2/youkai/037.php)。`content/yw2-soultimate-reference.mjs` と現コードは一致。ただしダメージ式・命中乱数・原作アニメ時間の証明ではなく、**カスタム研究用**。6体レンタルに適用しない。
5. [対戦研究記事](https://note.com/tombow_yw/n/n1e4cf179d2d9) は攻撃モーション中の相手サークル可視反映遅延を報告。現実装の `seat-motion-visibility` / `seat-motion-delivery` に類似の表示ゲートがすでにあり、Host確定状態と相手に見える状態の分離を維持。**何msか・対戦技術の完全一致は未確定**。

## 今回発見・修正した具体的不整合

現行 `ui/match-stage.mjs` の通常攻撃多段表示は `shownHp` と `visibleHit` でHost確定 `scenePlan.hitResults[sceneHitIndex]` を使っていた一方、`mb-action-label` は**最終合計 `action.amount`** と全体 `action.hit` を同時に表示していた。

例：1ヒット目MISS(0)、2ヒット目19ダメージでも、HPは最初のヒットまでしか反映されないのに、行動説明は先に「19」と表示された。この不整合は原作の内数値と関係なく、**同じ確定Host記録の表示整合性**だけで判定できる。

- `ui/battle-vfx.mjs`：純粋な `actionLabelImpact(action,hitResults,hitIndex)` を追加。現在フレームのHost確定Hit/Miss・damageを返し、旧式でヒット行が無いときは従来の `action.hit/amount` にフォールバック。
- `ui/match-stage.mjs`：下部行動説明を上記投影に統一。HP・上画面のヒット反応と同じ番号で表示。試合確定値/アニメの間隔・技名・攻撃対象選定/妖気/Host/通信/Firebase Rulesには一切変更なし。
- `tests/v3-5-16-action-hit-caption.test.mjs`：MISS→命中の2Hitと旧形式フォールバック、Stage接続を確認。
- 技固有の命中回数・名前・演出秒数はこれで本家一致になったわけではない。既存 `ActionOutcome`・`Soultimate HitLedger` は再実装せず活用。

## 確認結果と制約

- 引き継ぎ時点の前担当CI：Node 955/955（[run](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41331203475)）、Stage Chromium 16/16（[run](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41331203441)）、Firebase Emulator 2席全操作の正規通信テスト（[run](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41331185608)）をGitHubで成功ステータスまで確認。**これは今回の変更後テストではない**。
- 変更後のGitHub Actions結果は、必ず別途 HEAD と照合してから記録/報告。未確認時に PASS と書かない。
- 学校iPad Safari実機2台と Google Sites稼働版は未検証/未変更。GitHub main、学校稼働Google Sites HTML、Firebase本番 Rules/Auth/DB、Driveを変更しない。
- `docs` の10/22保管Firebase Rules写しに**11月8日 00:00 JST期限**あり。**現本番Rulesとの同一性は不明**。読み取りで確認した過去実績を期限後の動作保証と混同せず、本人許可なくRules変更しない。

## 次の最優先ステップ

1. **今回の実コミットHEADに紐づくNode / Chromium Stage / Firebase二席の回帰結果を確認**。失敗した場合は原因のある最小修正を行う。
2. 主要原作差分の「技名・命中列・技固有演出」について、まず**既存のHitLedgerが表現できること/できないこと**を実際の原作映像観察記録と照合する。確定しないヒット数を作らない。データ駆動の一ヶ所を改善し、以後同種の技で再利用できる変更のみ実施する。
3. 学校Safari二台で通常の6v6試合を本当に遊べる時は、**試合長、操作タイミング、回転・チャージ中の相手視点表示**の実地確認を優先。現固定2600msの時計やダメージを録画長から憶測変更しない。

この記録はV3-5-16の一部成果（再監査＋表示整合修正）。**V3-5全体の完成宣言ではない。**
