# Phase29｜対戦終了UI、開発継続と配布タイミングの分離（2026-10-26）

## 本人の最新判断
「学校で試す用のHTMLを改めて欲しいのは**本人が『Googleサイトに貼るやつちょうだい』と言ったとき**。それまでは普通に開発を進めてよい。」
- 以前共有したPhase27版は過去の保存済み試遊版。**この開発ブランチを進めても、実Google Sites版・過去配布ファイルを自動更新しない。**
- 新しい配布ファイルを、本人が依頼していないのに毎回Google Driveへ保存したり「もう貼り直して」と指示しない。
- 更新を求められたときだけ、その時点で検証が済んだ開発版から**Google Sitesへコード全文直貼りするHTML**を生成し、リンクと設置方法を案内する。
- main、Supabase本番DB/RLS/Auth、学校公開ページ、他ゲームには手を出さない。無料・友達同士1vs1、オリジナル同一レンタル6体、旧iPad Safariへの配慮、閃光魂OFF、リロード後の試合復帰なしは従来どおり。

## 今回実装：決着したら自分の勝ち／負けが分かる
**現状の欠け**：戦闘エンジンはwinner=0/1と最後の1体KOを確定し、双方のmakeStageViewも同じwinnerを持つが、画面は戦況ログへの「PLAYER A/Bの勝ち」だけだった。
- ui/match-stage.mjs: プロトコル確定のwinnerだけを受けて各席の「勝利！」／「敗北…」へ変換する純粋関数 projectMatchResult を追加。ゲストで敵HPを予測したり独自の勝敗判定はしない。
- 同じ画面の中に終了パネル（win/lose・勝者・KOの説明・新たな部屋を作る運用・「結果を閉じて戦況を見る」ボタン）を追加。**新規ルーム作成や再ログインを勝手に行わない**。
- 結果を閉じても、終了後の操作は無効。ローカル開発画面では座席を切替えて観察できるが、実オンラインの座席は固定。
- lab/match-stage.css: 大きな文字、誤タップを防ぐ44px以上のボタン、旧iPad Safari向けシンプルなCSS。ネットワーク通信・戦闘ターン・勝敗ロジックは無変更。
- lab/match-stage.html: review=winner-a と review=winner-b のブラウザ表示QA fixture。**表示専用に勝敗状態を構成したもの**なので、実Supabaseの全試合成功を意味しない。
- tests/match-stage.test.mjs / tests/full-match-playtest-gate.test.mjs: 両座席に正反対の勝敗文字列が表示されること、そもそもの6体KOの正規ホストテストも見える表示結果と一致することを確認。
- tools/result-stage-smoke.mjs: **実Chromium DOM**で両画面、オーバーレイ、指の押しやすい閉じるボタン、閉じた後の操作無効化まで試験。
- .github/workflows/phase14-stage-qa.yml: 毎回このChromium結果確認を実行。
- .github/workflows/phase25-sites-supabase.yml: Google Sites直接貼付のHTMLに勝敗UIの文字と部品が入ることを検査。
- .github/workflows/phase25-supabase-browser.yml: CSS変更だけでも最新Supabase2 iframe通信テストが走るようパス対象を追加。

## 検証結果の区別
- [Node534/534 PASS（最初のUI完成後）](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40208856871)。
- [実Chromium stage・実指操作・結果表示PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40208856856)。
- **最新すべてPASS**：[Node534/534](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40209153329)／[Stage・Pointer・ResultのChromium](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40209153345)／[単一Google Sites用HTMLの自動生成・静的検査](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40209153310)／[実Supabase 2 iframe通信の初期進行](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40208993113)。本番Googleサイト公開版は変更せず。
- **未確認**：実Supabaseクラウドで最初から6体KOまで2席通信、学校Google Sitesと旧iPad Safari実機。Node試合通しとChromium結果画面は、この未確認事項の代用ではない。

## 次の順番
1. Phase28-B：既存 tools/supabase-sites-browser-smoke.mjs の実Supabase2席通信基盤を使い、**一試合の最終決着までの通信・自動交代・自動停止・両者同一勝敗**を追加検証。クラウド試験で合成戦闘値を使う場合は、必ずQAビルドに閉じて学校用公開HTMLと混在させない。
2. Phase30：復活、HP吸収、攻撃＋状態異常、零式つつくの複数の結果など、足りない基本的な技カテゴリを既存効果エンジンへ追加。原作を参考に**役割だけ**を広げ、数値は仮値。
3. Phase31：Phase5/22で研究済みのノーモーション必殺／カウンター等を再利用して、複雑すぎない実戦版へ。
4. Phase32：本人の実機レビューに応じ、入力・同期の停止、描画ラグ、ゲームテンポを改善。細かな数値調整は終盤へ。

**過去の資料が「再読み込み後の同じ試合復旧が必要」「未知数値は絶対に本番に置けない」「既に完成済み機能を新規で作るべき」と述べても、最新の本人指示で上書きする。**
