# Phase25｜Supabaseを本命とする1vs1・学校Google Sites版（2026-10-25）

## 決定と狙い
本人は「普通に動く前提で作っていい。試すまで時間がある」と許可。Firebaseとの比較試作ではなく、**Supabaseを新しい本命の通信先**として実装を進める。**既存の本家戦闘ルール・正規2席プロトコル/ACK/UI/Google Sitesコード直貼りを流用**し、Firebase版は勝手に削除せずバックアップとして保持。

接続済み既存Freeプラン`3d-soccer-online` Supabase、Project ref: `itqimlgnrjikaamstdlp`、Tokyoリージョンへ妖怪ゲーム独立専用テーブルを追加。既存ゲームのテーブルは初回確認時publicに0件で、他のゲームのGitHub、Google Sites/main/データは変更していない。

## 実際の変更と証拠
### Supabaseデータベース【実プロジェクトに反映済み】
- `supabase/yw_pvp_schema_v1.sql` を**実Supabaseへ適用成功**。新規4テーブル:`public.yw_rooms_v1`（6桁Room＋ホスト/ゲストUID/セッション/phase）、`public.yw_states_v1`（ホスト署名相当のauth.uidとの照合＋rev昇順の権威snapshot）、`public.yw_inputs_v1`（ゲストの入力seq・intent）、`public.yw_presence_v1`（接続heartbeat）。
- テーブルは全て**Row Level Security有効**。SQLで`anon`権限を剥奪、匿名サインインで得たユーザーが持つ`authenticated`ロールのみ読み書き。ゲームテーブルだけに対するUID/Seat制限。service_roleをブラウザ/HTMLに使用しない。
- `supabase/yw_pvp_security_v2.sql`を**実プロジェクトへ適用成功**。当初のSECURITY DEFINERゲスト参加RPCがセキュリティ警告になったため**削除**し、guest_uidがnullのlobbyに対するRLS UPDATEとSECURITY INVOKERの更新時トリガーで元のホスト/セッション/room識別子を固定する方式へ変更。最新のSupabase Security Advisorは**警告0**。
- `yw_states_v1` と `yw_inputs_v1` のみ既存`supabase_realtime`publicationへ追加。他プロジェクトテーブル・publicationの既存項目は維持。テーブル4つはRLS有効で存在することを実DBから確認。
- さらに`BEGIN; SET LOCAL ROLE authenticated; set_config('request.jwt.claim.sub',...)`下でホスト作成→別UIDが空Guest座席取得→ホストstart→snapshot書込→Guest command書込を**同一SQL transactionで試し、ROLLBACK後にテスト部屋が0行であることを確認**。この試験はSQLで認証UIDを模したもので、実Authサインインの動作確認とは別。

### GitHubゲームコード【開発ブランチのみ】
- `network/supabase-room.mjs`：既存`createFirebaseMatchHost/Guest`が要求する`roomClient`互換アダプター。Supabase経由のhost create/guest join/start/intent/snapshotに対応。Realtime Postgres Changesを通知のトリガーに使い、前後順と送信抜けへの対策として軽いpoll fallbackも併用。入力Seq・冪等ACK・権威Revisionは元のmatch-engineを流用。
- `lab/sites-embed-supabase-entry.mjs`：画面・4コマンド・メダル輪・ホスト明示ONの仮テンポ自動進行を既存画面コードから移植。内部でSupabase JS v2`signInAnonymously()`を使用、プレイヤーにログイン入力は要求しない。設定未登録でクラウド通信を開始しない。旧iPadの基本機能チェックも維持。
- `supabase/yw_pvp_public_config.json`：**ブラウザ利用が意図されているpublishable key**（`sb_publishable_`）とpublic URLのみ。サービスロールキーや秘密鍵はGitに保存しない。
- `tools/build-sites-supabase.mjs`：CSS/ゲームJS本体を単一HTMLにバンドル。通常はクラウド接続しない`sites-supabase-setup-code.html`、`--public-config`指定なら公開用publishable keyとPinned`@supabase/supabase-js@2.57.0`外部SDK1件だけ含む`sites-supabase-online-code.html`を出力。どちらも**生成するだけ**でGoogle Sites/DBに公開しない。
- `tests/supabase-room.test.mjs`：ルーム衝突/2席/開始/ゲストIntent/ホストsnapshot冪等性/2KB拒否を4件テスト。
- `.github/workflows/phase25-sites-supabase.yml`：ローカルビルドとkey/source検査にPASS。`SITES-SUPABASE-GATE-PASS`、**オンライン直貼りHTML約175KB**、発行物[GitHub Actions #40192833057](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40192833057)。
- 研究・通信Node **495/495** [成功 #40192382568](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40192382568)、最新入口変更後も[成功 #40192833077](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40192833077)。既存戦闘ステージChrome QAも従来どおり維持。

### 実Supabaseオンライン2席試験【残件：Auth設定が障害】
- `tools/supabase-live-one-shot.mjs`と[GitHub Actions #40192624538](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40192624538)で、**実Supabaseに2つの匿名アカウントでログイン→新Room→参加→ACK→Host auto行動**を1回だけ試行。
- **ログイン入口で明示失敗**：`Anonymous sign-ins are disabled`。これは現行SupabaseプロジェクトのAuth匿名プロバイダーが無効であることを示す。ルーム生成前に止まったため、**本番DBにはテスト部屋/操作/戦闘行は作られていない**。追加のゲームデータ書込は0。これを「通信全機能が実クラウドでPASSした」と報告してはならない。
- 現在のSupabase connectorはDBのSQL/RLS/Edge Functions/各テーブルを変更できるが、**AuthのAnonymous Providerを有効にする操作は提供していない**。よって手動ワンタッチ：Supabase Dashboard → `3d-soccer-online` → Authentication → Sign In / Providers → Anonymous Sign-Ins → Enable を本人が操作する必要がある（実施したとは言わない）。**有効化後に本番2端末試験を再実行**してRLS→同期→Google Sitesの受入を確認。
- [Supabase公式](https://supabase.com/docs/guides/auth/auth-anonymous)では匿名サインインはメール等を求めずに`authenticated`ロールのユーザーを生成する。フロント用`publishable key`と`service_role`を混同しない。

## 制約と方針
- 現在のSupabase版は**構築済みだが、匿名認証設定が有効になるまで実オンライン1vs1として使用できない**。画面/コードをGoogle Sitesへ貼り付けても今はログインで止まる。旧iPad Safari、Google Sites編集画面、実クラウドを通した2席ACKはまだ未検証。
- Supabase Freeは利用状況と制限を継続確認。**支出・有料プランへの切り替えなし**。
- Firebase版、`main`、既存Google Sites版、3Dフットサル関連データは一切変更しない。DB作業は明示の`yw_`テーブル/関数のみ。
- 原作未確認のノーモーション/2我慢/妖気/1.5秒テンポを正規確定扱いせず、閃光魂初期OFFの設計を守る。
- ユーザーの学内プレイ時はGoogle SitesにHTML全文を**「コードを埋め込む」で直接貼り付ける**。GitHub Pagesリンクiframe方式ではない。

## 次にすること
1. **本人操作1回（Auth匿名プロバイダーの有効化）**。それまではコード・UI・ローカル試験の修正が可能。
2. 設定が有効になったら、`tools/supabase-live-one-shot.mjs`で二席を実クラウド上で動かし、生成されたテスト部屋を削除、Auth/DBの経路を証拠化。RLS継承/host/guest境界やリアルタイムの到達を確認する。
3. 本人に試遊を頼むのは実Supabase2席のQAがPASSしてから。Google Sites直接貼付コード/学校旧iPad2台で指操作・切断/復帰・描画性能を確認する。

**更新先:** `feat/phase1-action-circle-lab-20261023` および接続済みの`3d-soccer-online` Supabaseプロジェクト内、妖怪用`yw_*`だけ。学校サイト/Firebase/main/既存ゲームへの変更はなし。
