# 妖怪対戦ブラウザゲーム｜再監査済み・引き継ぎ基準（2026-10-25 JST）

> **現在地の優先順位**: このファイル（2026-10-25実地再監査）→ [PROJECT_MAP_AND_PROGRESS.md](./PROJECT_MAP_AND_PROGRESS.md) → 各フェーズの原資料・テスト → [HANDOFF_LATEST_20261024.md](./HANDOFF_LATEST_20261024.md)（履歴）。PR題名・main README・旧引き継ぎ文章は現在地ではない。状況が変わった場合は新しい検証日時と根拠を追記し、古い検証結果を「今も成功」と決めつけない。

## 1. 絶対に守る合意
- 目標: 学校の旧iPad Safariで、友達同士の完全無料1vs1。「妖怪ウォッチ2」の**対人戦闘システムをできるだけ忠実に先に再現し、その後で独自改善**。何かを足す前に、既存資料・コード・外部の公式資料/対戦研究で原作ルールを再確認。
- 最初は両プレイヤー同じオリジナルレンタル6体。育成・対戦履歴・ランキング・リプレイ・観戦・閃光魂は初期対象外。原作と異なる「次5行動予測」は研究UIに隔離し通常画面では標準OFF。
- 上段は双方の前衛3体、下段は自陣6メダルサークル＋「わざ/ねらう/おはらい/アイテム」。原作の対戦でアイテムは使用不可。零式つつく・Gわざ・3秒回転制限・ホスト判定ACKなど既存研究を使う。
- **Google Sites公開とは、生成HTML/CSS/JSの全文を「コードを埋め込む」に直接貼ること**。GitHub PagesのURL/iframeを貼る方式ではない。Google Sites既存版・`main`・他ゲーム・既存Firebaseを許可なく変更しない。
- 「任した」は調査・実装・自動試験・画面QA・開発ブランチ記録を自律的に進めてよいこと。ユーザーによる学校実機試遊が必要な時だけ明示して頼む。課金しない。
- **報告書式: 今回／全体のどこ／次／検証と未検証／変更先・本人の作業要否**。

## 2. 確認できた開発の現在地（GitHubを再読、2026-10-25）
- Repository: https://github.com/8mahi8/yokai-battle-lab
- 正規の開発ブランチ: `feat/phase1-action-circle-lab-20261023`、PR [#1](https://github.com/8mahi8/yokai-battle-lab/pull/1) は**Open / Draft / 未マージ**。PR題名「Phase1」は古く、実体はPhase25まで含む。
- 再監査時のHEAD: `7bfc083b7b3de677744aabffa80ad891a4c4488a`（2026-10-25T12:58:28Z）。`main`はキャラ2.5D旧研究デモであり、完成戦闘ゲームとして扱わない。
- `engine/*` が行動順、6体輪/回転、通常行動、攻撃・命中・ダメージ、とりつき、おはらい、妖気、チャージ、Gわざ、つつく等の**研究・実装**を持つ。実際の1vs1は `engine/match-protocol.mjs` → `network/supabase-room.mjs` → `ui/match-stage.mjs`。Firebase経路はバックアップとして保存。
- 正式通信用Supabaseは既存Free project `3d-soccer-online` 内に`yw_rooms_v1`/`yw_states_v1`/`yw_inputs_v1`/`yw_presence_v1`を独立構築。4テーブルすべてRLS有効（2026-10-25再読）。`supabase/yw_pvp_security_v2.sql`のRLS・SECURITY INVOKER room fenceを確認。DBや本番サイトには今回の再監査では**変更しない**。
- `tools/build-sites-supabase.mjs --public-config`で約175KBの `dist/sites-supabase-online-code.html`を**生成**する。生成物をGoogle Sitesへ**公開したことにはならない**。公開用publishable keyのみ使用し、service_roleをブラウザへ埋め込まない。GitHub Pages `main`の表示は別物。

## 3. 実行証拠（同一HEAD）
- [Node研究・通信テスト](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40195497455) **497/497 PASS**（資料中の495は古い）。
- [Chromium原作戦闘ステージ＋PointerEvents](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40195497517) **PASS**。4種チャージ、5種おはらい、つつく、キャンセル・2本指等を操作。
- [実Supabase接続のGoogle Sites想定2 `srcdoc` iframe Chromium E2E](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40195497511) **PASS**。実匿名Auth/2席の6桁ルーム作成参加/guestコマンドACK・輪3秒拒否/ホスト自動進行/1024・820・568・390pxの幅とタップ対象を検証。GitHub実ジョブログに `SITES-SUPABASE-CHROME-PASS` を確認。これは**1つのChromium内の2画面**で、異なる物理iPad2台でもGoogle Sites実サービスでもない。
- 過去の [実Supabase初回失敗](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40192624538) の `Anonymous sign-ins are disabled` は**過去の一時点の障害**。その後の実クラウドE2E成功から、現在「本人が匿名Authを有効化しなければ進めない」という依頼は古い。本人の設定操作を再び頼まない。

## 4. Supabase実監査（2026-10-25 JST）
- Projectは`ACTIVE_HEALTHY`、4表すべてRLS有効。GitHub UIの「Security Advisor警告0」は過去の記録であり、最新取得は**5件のWARN**：匿名サインイン可の4ゲーム表のRLSポリシー（各1件）＋プロジェクト共通の「漏えいパスワード保護OFF」（1件）。匿名ユーザー向けのUID/座席制限という意図的設計に起因する警告を含み、これだけでデータ漏えいが確定するわけではない。逆に安全性を無条件で確定しない。参考: https://supabase.com/docs/guides/database/database-advisors?queryGroups=lint&lint=0012_auth_allow_anonymous_sign_ins
- 読み取り専用集計ではゲーム表に**rooms 2 / states 2 / inputs 2 / presence 4**行が残存（直近テスト時刻）。「クラウドテストデータ0件」という旧記述は現状とは違う。**この再監査では削除・新規書込を行わない**。将来のテスト時は試験部屋の後片付けを設計・検証し、他の部屋を誤消去しない。
- 本番2席の切断・復帰の長期安定性、権限の境界、実学校端末での描画は別ゲート。過去のローカルFirebase成功でSupabase実機検証が済んだことにはならない。

## 5. 原作準拠として未達・仮扱い
- 原作3DS実映像との定量フレーム照合、行動順同値/初期補正、妖気回収の発生率・受取先・回収量、ノーモーション必殺/カウンター/2我慢cut-in条件、技ごとの実数値・一部状態継続/回復は**未確定**。
- 仮レンタル6体の技効果や自動行動間隔1500msを公式原作一致とは呼ばない。Node PASSは**コード内仕様の整合性**であり、原作との一致を示すものではない。
- 研究済みの詳細は `docs/PHASE21*.md`, `PHASE22*.md`, `REPRODUCTION_FIRST_FIDELITY_GATE_20261024.md` と `tests/*` を参照し、新たな仮数値を根拠なく作らない。

## 6. 次の担当がやる順序
1. **原作再現の未検証項目を、根拠→コード→再現テスト→画面/挙動確認で1つずつ詰める。** 独自改善・見た目の追加を先行させない。
2. Phase25 E2Eで通った事実を基準に、本番データを無断変更せず、通信の切断/復帰・古いSafari互換・試験室後片付けの検証を強化。Supabase Advisor警告は意図的anonymous運用との関係をレビューして分類。
3. 学校実機試遊を頼む前に、貼付HTMLの最新ビルド・Chrome QA・開発ブランチの差分とGoogle Sitesの手順を確認。学校の**実iPad Safari2席・実Google Sites直接貼り**は本人の試遊ゲートとして保留。
4. `main`、学校公開版、Supabase DB/RLS/Auth、既存Firebase・サッカー用データへの変更は、今ある合意・用途を守って個別に判定。少なくとも引き継ぎ作業のために勝手に変更しない。

**記録方針**: 今回はソース・Actionsログ・Supabaseメタデータの読取監査と、GitHub開発ブランチの文書整備のみ。実機試験/新しい戦闘修正/本番公開を行ったとは主張しない。
