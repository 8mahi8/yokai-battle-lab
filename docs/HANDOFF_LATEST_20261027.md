# 妖怪ウォッチ2 対戦再現ブラウザゲーム｜最新引き継ぎ（2026年10月27日）

## プロジェクト
GitHub: https://github.com/8mahi8/yokai-battle-lab
開発ブランチ: `feat/phase1-action-circle-lab-20261023`
最新総合進捗: [PROJECT_MAP_AND_PROGRESS](./PROJECT_MAP_AND_PROGRESS.md)
基本アーキテクチャ: [ADR-0001](./ADR_0001_ORIGINAL_EXPERIENCE_FIRST_ARCHITECTURE_20261027.md)

君は次の開発担当。これまでの調査とコード・テストを実際に読んでから続行し、設計だけでなく開発ブランチで実装・検証・GitHub保存する。ユーザーの「任した」は自主的に進めてよいという意味。

## 何を目指すか
**原作『妖怪ウォッチ2』の内部プログラムを再現する必要はない**。**見た目・操作感・戦闘システム・駆け引き・ゲーム体験**が原作に近い、身内用オンライン1vs1を目指す。学校iPad SafariでGoogle Sitesへ**HTMLコードを直接埋め込んで**友達と遊ぶ。無料厳守、初期6体同一レンタル、育成省略、初期版は閃光魂なし。キャラの数・装飾より**妖怪らしい自律行動/モーション/表示/画面体験**を優先する。再現で不明な内部確率は仮値と明記し、推測を原作確定仕様として扱わない。

**Google Sitesで友達と実際に通信対戦できた実績あり**。ただし総合的な「妖怪ウォッチらしさ」はまだ低いとの校内評価。現行学校公開版・GitHub main・Firebase本番DB/Rulesを勝手に変更しない。Google Drive V3を既存のまま残す。通信方式を不要に全面刷新しない。

## 本人提供の重要な実動画（今回最優先）
ユーザーがチャットへ **`ScreenRecording_10-27-2026 20-42-47_1.mp4`** をアップロード（約216.5秒、1108×512、30fps、音声あり）。
YouTubeのダウンロードはユーザーに要求しない。このユーザー添付MP4を直接使って原作戦闘動画をフレーム抽出・目視で観察済み。
詳細な観察記録: [PHASE49_USER_SUPPLIED_ORIGINAL_PVP_VIDEO_REVIEW_20261027](./PHASE49_USER_SUPPLIED_ORIGINAL_PVP_VIDEO_REVIEW_20261027.md)
- **00:37–00:43**: 敵に赤く目立つ**円形ピン照準**。
- **01:04–01:10**: スキル発動ポップアップとダメージ等の別演出。
- **01:12–01:15 / 01:28–01:32**: 背景が切り替わる、**キャラを大きく映した必殺カットイン**。通常の攻撃画面とは別フェーズ。
- **02:24–02:32**: 回復数字から必殺へ続く場面。
- **03:08以降**: 勝敗表示。
- 録画は実況者の**編集字幕・合成レイアウト・カット**を含む。編集部分を原作UIと誤認せず、録画上の秒数を原作の内部待機時間と断言しない。**動画ファイルや著作物のフレームは公開GitHubへ転載しない**。本人から提供されたファイルの取得は必要に応じてこの会話添付を参照。

## ここまでに実装したこと
- Phase45: `content/rental-roster.mjs`へキャラ6体を分離、`presentation/action-catalog.mjs`で行動演出設定をデータ化、`presentation/action-choreography.mjs`が「予備動作→命中/効果→戻り」を計画する。
- Phase46: 戦闘スナップショットのイベントへ**安定`eventId`**を付ける。画面でヒット時にHPが変化。攻撃・妖術・回復・とりつき・ガード・サボりを別モーションに。学校向け公開版にはまだ反映していない。
- Phase48: 学校向けに`enableLoafing:true`。妖怪別のサボり仮確率を行動傾向とは別管理。`ui/passive-feedback.mjs`で本物の自動スキル発動を読めるように。**Phase48専用CI [#40498288006](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40498288006)は595/595テスト＋実Chromium＋Firebase Friendsビルド PASS**。その後ポップアップで自己強化を攻撃対象の強化と誤記しない修正済み。
- Phase49（**最新**）：添付された本家対戦動画を受け、`ui/match-stage.mjs`と`lab/yw2-layout.css`に、**大型キャラ必殺カットイン**、円形ピン照準、良/悪とりつきのステータスマークを開発ブランチへ追加。`presentation/action-catalog.mjs`の必殺の映像用予備動作を暫定1250msに変更。**戦闘計算・通信は変更せず表示のみ**。

## 現在のブロッカー（最初に直す）
開発ブランチ先頭近くのコミット `f264332ee8672a4850f85b13150249ec8f1aff62` で：
- **Research battle unit tests: SUCCESS** → https://github.com/8mahi8/yokai-battle-lab/actions/runs/40501148822
- **Phase14 実Chromium stage QA: FAILURE** → https://github.com/8mahi8/yokai-battle-lab/actions/runs/40501148848
- エラー: `Actual Soultimate portrait not visible: <div id="mb-special-flare" class="mb-special-flare" aria-hidden="true" data-creature="1" data-mode="normal">`
- 重要：`mb-special-flare`自体は**hiddenではなく存在する**。追加した`tools/stage-smoke.mjs`の**正規表現/HTML構造/ポートレートSVG/ラベル比較**のどれが合わないかまず調査。**単にテスト条件を外して合格させない**。実スクリーンショット`phase17-special-cutin-preview.png`を目視して、原作動画と比べ、画面にちゃんとキャラ・技名が大きく出ているか検証する。
- `ui/match-stage.mjs`の`renderSpiritPortrait(id)`が直接SVGを返すか等を実DOMで確認。`lab/match-stage.html?review=special`は**表示確認用fixture**で、必殺の実戦発動を証明しているわけではない。
- テスト再実行→Chrome画面再撮影/レビュー→必要な修正を開発ブランチへcommit。CIが通るまで新Google Sites版を配布しない。

## 次工程（優先度順）
1. **上記Phase49のChromeブロッカー解消**と必殺画像/ピン表示の実画像確認。必要ならCSS/レイアウト調整。
2. 参考動画に基づきキャラのサイズ、奥行き、行動アイコン、ダメージ/回復表示、状態変化を改善。実況編集の大きな字幕は模倣しない。
3. カットインの**実戦技イベント**と通信中の画面再生が一致するか、実Chromium 2画面で検証。現在の画面は旧戦闘進行間隔(2.6秒毎1tick)で仮実装のため、原作本来の読み合いとタイミングは未完。
4. `Phase49`の映像研究を技別に深掘り、原作と実装の「確認済み/違い/不明」を記録。ユーザー本人に動画保存の操作は不要。
5. 開発・QA・原作比較の品質に納得してから、必要なら学校用**新しい別名の**Google Sites直貼りHTML/TXTをGoogle Driveに個別保存。既存V3上書き禁止。最新Phase49は**まだ学校用Google Drive配布未済**。

詳細：[Phase46 実装](./PHASE46_ACTION_SCENE_VERTICAL_SLICE_20261027.md)、[Phase48](./PHASE48_SCHOOL_BATTLE_BEHAVIOR_AND_SKILL_VISIBILITY_20261027.md)、[Phase49](./PHASE49_USER_SUPPLIED_ORIGINAL_PVP_VIDEO_REVIEW_20261027.md)。
