# Phase35｜学校の旧iPad Safari・Google Sites埋め込みで「匿名認証できません：Load failed」（2026-10-26）

## 実機報告
本人が**学校iPad/Google Sitesの直接コード埋込でルーム作成不能**と報告。実画面の表示は**「通信エラー：匿名認証できません：Load failed」**。これは`signInAnonymously()`の処理に到達した後の失敗なので、少なくとも画面を起動できるJSは読み込まれた。`window.supabase.createClient`検証を通った以上、**本事例を外部CDNの読み込み失敗と断定しない**。学校のネットワーク制限、Safariのクロスオリジン接続/CORS preflight不具合、iframeのセキュリティ制限などが候補。

## Supabase実プロジェクトの確認（本番設定は変更しない）
- 既存公開設定のプロジェクト `itqimlgnrjikaamstdlp` はACTIVE_HEALTHY。
- Supabase Authログでは**2026-10-26 UTC 00:10、02:19、03:08ごろ**`POST /signup`（signInAnonymously系）がHTTP200で成功。確認できたログのRefererは`http://localhost:3000`。**学校iPadの成功を意味しない**。
- 「Anonymous sign-ins are disabled」という明示メッセージが出ておらず、既に匿名ログイン成功記録があるため、**プロバイダー無効が原因である可能性は低い**。ただしサーバーログだけで学校のリクエストがどこで失敗したかは確定不能。
- 実装は`persistSession:false`であり**第三者Cookie/長期ログイン保存に直接依存しない**。ITPの影響をゼロとは断言しないが、現時点で主原因と確定しない。
- Supabase JS/Safariの公式issueで`TypeError: Load failed`やpreflight/CORSの失敗が報告されている: https://github.com/supabase/supabase/issues/20982 （2026年にも継続報告）。
- Supabase公式: `/auth/v1/health`へのGET + publishable `apikey`ヘッダーがhealthチェックに使える: https://supabase.com/kb/troubleshooting/how-do-i-check-gotrueapi-version-of-a-supabase-project-lQAnOR
- `/health`が成功しても、`/signup` POST/プリフライトまで成功するという証拠ではない。

## 実装した最小修正
- `ui/supabase-auth-diagnostics.mjs`：`Load failed`を**AUTH_NETWORK**（通信系）と分類。匿名ログイン設定無効を**AUTH_DISABLED**として別分類。429等のAPI拒否も区別。公開鍵だけで認証サーバーのhealthチェックを1回実施し、HTTP応答／CORSやネットワーク失敗／タイムアウトのコードを表示する。ユーザーID・session・JWT・IP・アクセス先等を自動送信する独自分析サーバーは一切ない。
- `lab/sites-embed-supabase-entry.mjs`：匿名認証失敗時に、元の短いエラーメッセージ・上記カテゴリ・healthチェックの結果を`.yw-online-status`へ表示。学校で画面を撮影して伝えられるようにする。`authBusy`ガードで多重実行しない。`匿名認証を再試行`を同じページで押して再度試せる（**勝手に無限リトライはしない**）。
- `tools/build-sites-supabase.mjs`：上記の再試行ボタンを埋込HTMLに追加。既存ゲーム画面と実際の対戦通信コードを維持。`persistSession:false`/既存RLS/DB/Authの権限設定は変更しない。
- `tests/supabase-auth-school-diagnostics.test.mjs`：Load failedとdisabledの区別、公開鍵・cookie不送信、health GET/CORS失敗・HTTP拒否、無効な設定の入力防止をテスト。
- テストで成功しても実学校旧iPadの通信が解決したとは言わない。これは**診断付き試遊版**であり、通信の恒久修正は原因により次工程で行う。

## 次に学校で見る表示
- `AUTH_NETWORK` + `AUTH_HEALTH_NETWORK` または `AUTH_HEALTH_TIMEOUT`：Supabaseに通信できない／SafariがCORSを遮断。学校Wi-Fiか、同じ端末を別ネットワークで試し切り分け。学校ネットワークの制限回避を勝手に勧めない。
- `AUTH_NETWORK` + `AUTH_HEALTH_OK`：healthのGETは成功、匿名登録POSTやプリフライトだけが失敗する可能性。Safariバグ、CORSなどを追跡。
- `AUTH_DISABLED`：本当にプロバイダーが無効なら管理画面で再確認（このケースは現時点で可能性低）。
- `Supabase匿名認証OK`になったが部屋作成で失敗：Auth後のRLS/DBフェーズの別問題として切り分け。
- 古いGoogle Sitesコードのままでは診断表示は出ない。最新版に手動貼り替えするまで旧版はそのまま。
