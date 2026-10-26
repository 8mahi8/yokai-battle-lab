# Phase36｜匿名認証の必要性・学校iPadでの二系統到達診断（2026-10-26）

## 結論（コードと実DBの読み取り確認）
匿名認証は**Supabase自体の必須条件ではない**が、**現行対戦ゲームのホスト/ゲスト分離には必須**。公開用の `sb_publishable_` キーはブラウザを識別する鍵で、プレイヤー本人の識別子ではない。現行 `network/supabase-room.mjs` は `uid` を要求して room `host_uid/guest_uid`、snapshot `author_uid`、ゲスト input `sender_uid`、presence `owner_uid` を扱う。`lab/sites-embed-supabase-entry.mjs` で `signInAnonymously()` 成功後だけ client を作っている。

2026-10-26のSupabase **読み取り専用SQL**で `yw_rooms_v1/yw_states_v1/yw_inputs_v1/yw_presence_v1` は4表とも **RLS true**、`anon` のテーブル許可（information_schema.role_table_grants）は**0件**、`authenticated` に必要な SELECT/INSERT/UPDATE があることを再確認。RLSの対象ロールはすべて `authenticated`、`auth.uid()` でホスト/ゲストを制限。従って `signInAnonymously()` 呼出だけ削除すると現行DBには部屋作成/参加/スナップショットを書けない。

Supabase公式：
- https://supabase.com/docs/guides/auth/auth-anonymous （匿名ログインでもPostgresでは authenticated ロール）
- https://supabase.com/docs/guides/getting-started/api-keys （公開鍵はアプリ識別、ユーザー識別ではない）
- https://supabase.com/docs/guides/api/creating-routes （REST endpointとアクセス制御）
- Safari Load failed 事例: https://github.com/supabase/supabase/issues/20982 （類似報告であり、本校原因の確定根拠ではない）

## 選択肢
1. **既存の匿名認証方式を暫定維持（現段階の推奨）**。学校の `Load failed` の原因を切り分ける。現行のRLS、Supabase内他ゲーム、配布済みGoogleサイト版を守る。
2. **Supabase Authなしのルーム番号方式**は技術的には可能。しかし公開鍵だけでは「誰がホストか」を区別できない。匿名 `anon` ロールのGRANT/RLS設計変更と、ホスト権限/ゲスト入力の不正使用を防ぐランダムな座席用capability・サーバー検証が必要。6桁の部屋番号だけをホスト権限に使うのは不適切。安全な新設計（RPC/Edge Function等）を作り、別環境で検証するまで本番テーブルを公開しない。既存のRLSに単に `TO anon USING(true)` を追加しない。
3. **Firebase RTDBの旧プロトタイプ**は保持されているが匿名認証を使う設計だった。別のドメインで繋がる可能性はあるが学校iPad成功の実績は本ゲームにはない。共有FirebaseプロジェクトのRules変更は他ゲームへの影響があるため勝手にしない。

Authだけ失敗してData APIに到達できることが確認されれば、Authなしの別構成を検証する合理性が生まれる。両方のAPIに到達できなければ、AuthをなくしてもSupabase URLへの通信問題を解消できない可能性が高い。**HTTP応答がある=認証やルーム作成が成功する、ではない。**

## 今回の実装（開発ブランチのみ）
`ui/supabase-auth-diagnostics.mjs` に `checkSupabaseGameApiReachability` を追加。認証に失敗したとき、従来の `GET /auth/v1/health` と並行して **`GET /rest/v1/yw_rooms_v1?select=code&limit=0`** を実施する。公開鍵 `apikey` のみ、`credentials:'omit'`、部屋番号・セッション・ユーザID・JWT・対戦データは送信しない。ゲーム表は現行 `anon` アクセス不可なので **HTTP 401/403 は「到達したが拒否」** と分類する。HTTP200でもAuth不要PvPの実証ではない。CORS/ネットワーク失敗/タイムアウトは別コードで表示。通常対戦処理・認証成功時の経路は変更しない。故障時の診断2件だけ追加し、無限再試行なし。専用の追加3件のテストを `tests/supabase-auth-school-diagnostics.test.mjs` に追加。

次に学校の旧iPad Googleサイト版でこの**新しい診断ロジックを含むコード**を本人が明示的に更新して試すまでは、原因確定・学校での対戦成功とは言わない。旧配布物は上書きしない。本人から最新版配布依頼があるまで新しいGoogle Sites配布HTML/TXTをDriveに生成・保存しない。GitHub `main`、Google Sites現行、SupabaseのAuth/DB/RLS、Firebaseは**無変更**。

## 次の実機判断表
| 認証 health | ゲーム API | 判断 |
|---|---|---|
| ネットワーク失敗 | ネットワーク失敗 | Supabase本体への通信/クロスオリジン障害を優先調査。Auth削除では救えない可能性大 |
| ネットワーク失敗 | HTTP応答あり（401/403可） | Authルート限定の失敗か確認。Authなし構成の検証候補 |
| HTTP応答あり | ネットワーク失敗 | Authは届くがData APIは遮断。Auth削除は逆効果 |
| HTTP応答あり | HTTP応答あり（401/403可） | `/signup` POST固有のプリフライト/Fetch障害を調べる。Safari問題の可能性 |
| 匿名認証OK | ルーム作成失敗 | RESTの権限・RLS・部屋作成APIレスポンスを見る |

未検証事項：学校Safariのネットワーク、CORSと実際の `/signup` POST、Google Sites iframeからの同一端末別回線、対戦1vs1。サーバーログだけで学校原因を断定しない。
