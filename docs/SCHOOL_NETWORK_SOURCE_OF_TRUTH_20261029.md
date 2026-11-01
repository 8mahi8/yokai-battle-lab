# 学校向け妖怪対戦：通信方式と開発優先順位の訂正（2026-10-29）

## 変更してはいけない完成条件
- 学校iPad Safari / Google Sites単体HTML貼り付け / 友達との1vs1。
- **唯一の現行学校オンライン方式：Firebase Realtime Database、AuthなしFriends、6桁ルーム番号**。
- 対戦判定はホスト正規エンジン、ゲストは入力送信と正規スナップショット表示。学校の旧V2では2026-10-27に実Safari二台接続成功。ただしその後の新版は未実機検証。
- **Supabase匿名Auth/RLS/旧サイト用HTMLは過去研究の残存物**。現在の学校向け採用方式に戻さない。過去のSupabase長時間対戦QAが`PACED-MATCH-WAIT`で失敗しても、**Firebaseの現行1vs1失敗と報告しないし、現行開発の優先ブロッカーにしない**。
- 本番Google Sites版、main、本番Firebase Rules/Database、Drive配布は本人が明示するまで変更しない。

## 2026-10-29 方針混線の原因と修正
- 旧Supabase用workflowが五本残り、`engine/combat.mjs`や`ui/match-stage.mjs`が変わるたびに自動実行されていた。直近の担当がそのFAILを現在のゲームの問題のように追い、本人との通信方式合意を取り違えた。
- 開発ブランチ上のみ、以下の**旧Supabaseワークフローの自動push実行を停止（`workflow_dispatch`だけ残し履歴調査用に保存）**：
  1. `.github/workflows/phase25-sites-supabase.yml`
  2. `.github/workflows/phase25-supabase-browser.yml`
  3. `.github/workflows/phase25-supabase-live-once.yml`
  4. `.github/workflows/phase28-full-match-supabase.yml`
  5. `.github/workflows/phase33-normal-paced-online.yml`
- 逆に現行`.github/workflows/phase37-firebase-friends.yml`は、エンジン・UI・台帳・カタログの更新時に**認証なしFirebase FriendsのQA**が起動するようpathsを追加。これによりNodeテストだけでなく現行のルーム通信・同期検証を見落としにくくする。
- 古いSupabaseファイルや過去履歴そのものは削除せず保管。通常のビルド経路`lab/sites-embed-online-entry.mjs`→`tools/build-sites-online.mjs --friends`→`network/firebase-room.mjs`/`network/firebase-match.mjs`は変更していない。

## 別の優先順位のずれ
- 直近のPhase2.2Cは原作資料で一致する「鼻血ボンバー」「大切断」を、**学校レンタル6体に存在しないcustom lab技**として実装していた。これは研究としては成立するが、本人の『原作対戦動画のように実際に遊べる』完成条件に直結していない。
- だから**研究の成功を学校版の原作再現が進んだ成功と混同しない**。原作資料の確認は必要だが、今後は本人提供の対戦動画で観察された**既存レンタルの技、サークル、妖気、必殺チャージ、敵味方の上画面、ホスト/ゲストの表示タイミング**を優先して、小さな実操作の流れを完結させる。
- 現行コードがSupabase向けに切り替わったわけではないが、古いネットワーク別workflowを勝手に再優先しない。
- **次の検証優先**：1. Firebase Friendsの正規通信のCI／2. 本家動画の一つの場面に対応するレンタル技の判定と下画面操作／3. 同じ場面を両視点実Chromiumで観察／4. 学校iPad Safari実機で本人試遊。不要な認証基盤の再構築や、本家にないキャラ技の追加を優先しない。

## 証拠の扱い
- Firebase実機成功は過去の学校V2の話。新しいdev HEADの学校Safari二台が成功したとは言えない。
- Firebase emu/Chrome合格≠学校実機成功。旧Supabase CIのPASS/FAIL≠現在のFirebase接続成否。
- 本来の完成条件：Google Sitesへの実埋込+学校Safari二台で相手の動作が止まらず、動画どおりの戦闘判断と結果表示ができること。
