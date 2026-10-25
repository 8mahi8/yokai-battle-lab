# Phase33｜通常6体・長時間1vs1の通信と試合時間の検証（2026-10-26）

## ユーザー意図・配布の境界
本人より「長時間対戦の検証って何？任せるけど」。友達と長くプレイしているときに**ホストとゲストの戦況がズレたり、停止したり、入力ACKが届かなかったりしないか**を確かめるための、通常テンポ対戦テストを作成した。これまでPhase32では**通常の5ターンだけ**、Phase28では**合成超高火力/高速決着の7ターンだけ**検証済み。

開発ブランチのみ変更し、学校固定のPhase27単一HTML・実Google Sites・main・Supabase本番DB/RLS/Auth/他ゲームは無変更。新たな配布用HTMLを依頼なく作らない。

## 追加①：実Supabaseで通常の6体同士60ターン（Phase33 browser QA）
- `tools/supabase-sites-normal-paced-smoke.mjs` は**既存の設定済み正規Google Sites埋込HTML**（`dist/sites-supabase-online-code.html`）をそのまま、実Chromiumの2独立 iframe + 匿名Supabase Auth で動かす。開発用合成HP・攻撃力/QA高速終局ボタンは**絶対に含まない**。
- 実ルーム作成→参加→ホスト戦況保存完了→ゲスト戦況取得→双方プレゼンスの接続表示を確認。
- ホストの通常**1,500ms**自動時計をON。ゲスト画面で **15→30→45→60ターン**（仮に自然な勝敗が早ければ決着）まで進むこと、ゲストがホストより進んでいないこと、差が6ターンを超えないこと、12体の表示が保たれることを確認。
- 戦闘が進行中に**ゲストが手動でサークル回転**し、ホストとゲスト両方がBクライアントシーケンス1のACKを観測する。
- ホストの自動時計を止め、最終ターン数と画面Revision・A/Bコマンド番号が一致するまで待ち、停止後も勝手に進む「幽霊タイマー」を検出。決着したら勝敗も両画面一致を検査。
- `.github/workflows/phase33-normal-paced-online.yml` にて無料のGitHub Actions上で実通信試験を実行。独立した**CI専用の匿名試験ルーム**を作る。ユーザーの学校/公開ページは変更しない。
- 最初はChromiumの`--dump-dom --virtual-time-budget=190000`が**ブラウザ検証環境の210秒制限まで終了しなかった**ため、ゲーム側の同期不具合とは決めつけず、検証時間を最適化。`130000` budgetで同じ通常60ターン試験が[実Supabase成功](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40217794329)。実行ログ：
  `SITES-SUPABASE-PACED-PASS room=066442 normalRentals=6v6 guestCommand=ACK syncedTurns=60 checkpoints=60 win=false`。
- **検証方式の切り分け**：ブラウザ結果をローカルWebサーバーへ早期報告する別方式の最初の実行は、結果送信前にChromeが終了して[失敗](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40218011449)。既知の `--dump-dom` ライフサイクルを併用すると[別の実部屋で60ターン成功](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40218185568)。ただし複雑な新方式を導入する必然性はないため、**最初に60ターン成功した単純な130000仮想時刻予算 + `--dump-dom` の検証器と同一コードへ戻した**。この時点で**異なる実部屋で2回の通常60ターン成功**を確認：[初回](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40217794329)、[再検証](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40218185568)。

## 追加②：実レンタルAI同士の自然な試合時間
- `tools/normal-match-endurance.mjs` を新規作成。**既存6体、既存AI行動、playtestSoulTuning=true**、ホスト正規戦闘/100%決定的seedで、最大600ターンまで4本を測定する。戦闘値は変更しない。
- `.github/workflows/research-unit.yml` に測定ステップを追加し、通常の554件Nodeテストと一緒に実行。
- [実行ログ：4試合とも完走、単体テスト554件成功](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40217799000)。結果は：
  - seed 20261026: **103行動**（1.5秒×行動 ≒ **154.5秒 / 2分35秒**）、Aの勝ち・B全6KO
  - seed 20261023: **127行動**（**190.5秒 / 3分11秒**）、A勝ち・B全6KO
  - seed 212: **163行動**（**244.5秒 / 4分05秒**）、B勝ち・A全6KO
  - seed 8192: **180行動**（**270秒 / 4分30秒**）、B勝ち・A全6KO
- **これらは通信なし/人間入力なしの時間換算**であり、学校旧iPadの遅延や手動操作待ち時間は含まない。実際の人対人は長くも短くもなり得る。ゲームバランスをここで勝手に変更しない。

## 残る検証
1. 通常の1.5秒進行を**全6体KO決着まで実Supabaseの2席でつなぐ**検証は、60ターンでは未完了。通常AIで決着には約103〜180ターンの実測があるため、段階的に延長する。超高速の7ターンで全6KOしたPhase28とは区別する。
2. 60ターン1回の成功だけでは安定性統計と言えない。連続実行で再現性を検証し、落ちれば初期publish/長時間HTTP/重い描画等を切り分ける。
3. **実Google Sites直接貼りHTMLの旧学校iPad Safari 2台**はまだ未検証。本人が「Googleサイトに貼るやつちょうだい」と言った時だけ最新版HTMLを作り、実機のフィードバックでラグ/停止を改修する。
4. ノーモーション必殺・カウンター等の原作対戦テクニックは、必ず具体的な原作の資料を調べてから実装し、未確認の数値だけ仮扱いにする。
