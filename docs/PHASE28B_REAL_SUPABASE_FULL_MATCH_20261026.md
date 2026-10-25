# Phase28-B｜実Supabase 2 iframeで決着まで到達（2026-10-26）

## 本人の最新指示・公開版の境界
- 本人は「**Googleサイトに貼るやつちょうだい**」と明示したときにだけ新しい単一HTMLを受け取る運用を選択。それまでは開発・検証・GitHubの資料更新を続ける。
- 今回変更したのは既存GitHub開発ブランチの**QAコードだけ**。学校用Phase27ファイル、Google Sitesの公開ページ、main、Supabaseのデータベース定義/RLS/Auth設定、配布済みDriveファイルは変更していない。公開HTMLへQA高速戦闘を追加しない。
- 旧Safari/iPad実機2台は依然として未確認。友達同士の1vs1、無料、オリジナル同じ6体、Flash魂OFF、リロード後の復帰不要、細かな数値は試遊で調整。

## 以前に完成した部分（再実装を禁止）
- Phase28-A: 正規ホスト単体で6体KOのA/B両勝利・手動回転と強制控え交代・3秒クールダウンの共存を検証し、強制交代のロック不具合を修正済み。
- Phase29: 「勝利！」「敗北…」の両側結果UIと終了後入力停止、Chromium画面テストを完成済み。
- Phase25: Supabaseの匿名Auth→部屋作成→ゲスト参加→ACK→ホスト通常ターン→画面表示の実クラウド二画面テストを通過済み。

## 今回追加したもの
- `tools/build-sites-supabase.mjs` に **`--public-config --qa-full-match`** を追加。検証専用の別名 `dist/sites-supabase-qa-full-match-code.html` を生成する。元の `--public-config` 通常版 `dist/sites-supabase-online-code.html` は公開向けのまま。
- `lab/sites-embed-supabase-entry.mjs` に **ビルド時定数 `__YW_QA_FULL_MATCH__`** を使った、テスト専用チーム/高速終局ボタンを追加。通常版ではビルド定数が `false`、追加要素はesbuildの最適化で消える。WebページやURL・通信入力からQAをONにはできない。
- QAだけでは互いに同じレンタル6体ではなく、**Aが高攻撃・Bが低防御の合成戦闘値**を使用。決着まで短縮する目的で、ゲームバランスや正確な原作数値を示すものではない。
- 高速終局ボタンは実際の `createFirebaseMatchHost.advanceAuto()`→`createMatchProtocol`→`publishSnapshot` を利用する。途中の更新は同時転送を圧縮する場合があるが、最終戦況はSupabaseへ正式配信し、ゲストの `subscribeSnapshots` で受信する。別の偽の勝敗計算器は作っていない。
- `tools/supabase-sites-full-match-smoke.mjs` は実Chromium同一ブラウザ内の2 iframeで別匿名Auth・別セッション（部屋ホストとゲスト）を開始。部屋番号/ホスト開始/ゲスト接続→終局→**両者同一勝者**・6体KO・両者同じターン数・互いに逆の結果画面・終了後の操作拒否まで検査。
- `.github/workflows/phase28-full-match-supabase.yml` で通常版とQA版を個別ビルドし、通常版に `QA-ONLY-NEVER-DEPLOY` または `yw-online-qa-finish` が混入していたらCIを失敗させる。**QA版をアップロード・配布する手順は一切ない**。

## 実行結果
- [GitHub Actions 40209857257：成功](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40209857257)
- 実ログは `SITES-SUPABASE-FULL-MATCH-PASS ... turns=7 both seats / 6 KO / result UI / no post-win commands`。
- 通常版とQA版の分離チェックも成功。通常版のビルドサイズは **181,162 bytes**、QA版は **182,080 bytes**。
- 一度、QAフレームが読み込み前にボタンを押すテスト待機条件を間違え、次に検証用JS文字列の改行が壊れた。両方は**QAスクリプト側のミス**で、修正後にブラウザの実接続テスト成功。
- 既存のNode 534件、Chromiumステージ、通常版Google Sites用HTMLビルドは前段階で成功。今回のQA変更は既存ゲーム通信プロトコルやUIの動作を変更していない。

## 残っている厳密な検証
1. **通常のレンタル6体同士、標準の1500msホスト自動行動で全てのターンがゲストへ届く状況**を、決着まで時間をかけて実クラウド検証する。今回の高速終局は複数の途中スナップショットを省略するため、この検証と同値ではない。ネットワーク遅延・ゲスト停止が起きる場合は優先修正。
2. **学校Google Sitesにコード全文を貼った旧iPad Safari2台**の操作・ラグ・同期は本人が公開タイミングを指示した後に確認。
3. 戦闘システムの大枠で残る必殺技（復活・HP吸収・複合効果）、零式つつくの多種類報酬、上級技術（ノーモーション必殺・カウンター）は今後実装。
4. リロード復旧・高負荷チューニング・課金などは増やさない。

次は**より現実のテンポに近いクラウド長時間対戦**か、**必殺/つつくの大枠効果追加**。細かな数値/キャラの完全再現は後回し。
