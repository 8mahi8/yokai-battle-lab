# 引き継ぎ後の過去資料横断監査・元動画アクセス状況｜2026-10-28

対象：`8mahi8/yokai-battle-lab` / `feat/phase1-action-circle-lab-20261023`。この記録は**既存資料の再読・照合**であり、新たな原作ルールの確定、ゲーム本体の新実装、新CI合格を意味しない。GitHub `main`、学校Google Sites稼働版、本番Firebase DB/Rules/Auth、既存Google Drive配布は変更しない。

## 横断した資料
GitHubで実際に内容を取得し、2026-10-23初期引継ぎ～2026-10-28最新ロードマップまで**80件以上**の文書（Phase10～51、Phase1.3～1.10、Phase2.1A～C、ADR-0001～0004、オンライン移行・学校実機、原作動画の記録など）を横断。単に最新版の引継ぎ文を読んだだけではない。全リポジトリ内の全ファイルを網羅した主張ではない。

最新版の単一入口：
- [6段階ロードマップ](./ROADMAP_6_PHASE_PROGRESS_20261028.md)
- [Phase1.10統合監査](./PHASE1_10_FOUNDATION_INTEGRATION_AUDIT_20261028.md)
- [全体設計V2](./ARCHITECTURE_V2_SOURCE_FIRST_FULL_BATTLE_BLUEPRINT_20261028.md)
- [Phase2.1C-1](./PHASE2_1C_TECHNIQUE_ELEMENT_AND_DAMAGE_FORMULA_MATRIX_20261028.md)
- [重複実装防止の過去監査](./REUSE_MATRIX_AND_NEXT_PLAN_20261025.md)
- [2026-10-27学校実機の実際の不満点](./PHASE43_SCHOOL_20261027_REAL_USER_PLAYTEST_FIXES.md)
- [原作4試合の初期照合](./ORIGINAL_PVP_FOUR_MATCH_IMPLEMENTATION_AUDIT_20261027.md)

## 時系列を踏まえて確定できること
1. **目的は原作の対人戦ルール・操作感の忠実化**。オリジナルの同一レンタル6体、学校iPad Safari、Google Sitesへの直接HTML埋込、Firebase Friends RTDB。育成・ランキング・履歴・閃光魂・本格的なブラウザ再起動後の同一試合復帰は初期対象外。原作と異なるノーモーション専用ボタン禁止。
2. **2026-10-27には本人と友人が旧Firebase Friends V2で学校Google Sites/Safari 2端末対戦に成功**。しかしサークルの指ドラッグ不能、何をしているかわからない技演出、攻撃偏重に見える動作、妖気の遅さを確認。Phase43 V3以降の修正、Phase49/50、Phase1～2最新開発コードはその実機試験済みと混同しない。
3. 原作の行動順・待ちポイントは`engine/phase1.mjs`、ホスト事実は`engine/combat.mjs`と`engine/match-protocol.mjs`、対戦通信は`network/firebase-room.mjs`／`firebase-match.mjs`、描画は`ui/match-stage.mjs`。既存の`engine/presentation-timeline.mjs`等にノーモーション／回転の研究モデルは**既にあるが通常の友達対戦本体に未接続**。重複実装を避ける。
4. オンラインFriendsの`lab/sites-embed-online-entry.mjs`は**ホスト自動行動2600ms固定（原作とは無関係の試遊値）**、`createMatchProtocol()`の輪制限既定は3000ms。原作ゲームの論理Wait・実時間・プレイヤー別表示を混同しない。
5. Phase1で6体×4技と6スキルの共通技・スキル台帳がホストへ接続された。ただし**ActionOutcome V2への変換は通常物理攻撃のみ**、必殺の本物のヒット列・表示保留・おはらいの専用完了表現は未完。型やヒット数・Power・性格や妖気の多数の値は依然`fixture`。
6. Phase2.1Aの命中率整数丸め・2.1Bのガード係数は過去CI根拠あり。Phase2.1C-1の属性Play/Penetrate研究コードは開発ブランチに保存済み。ただし**2.1C追加後のNode全体／Chromium／Firebaseの回帰合格は現時点で未検証**。直近確証は以前の2.1B `672/672`成功。式のWiki対3DS実測推定の差も保留。
7. 通信方式の古い記録は時点で異なる：当初Firebase Auth研究→Supabase匿名認証→学校で`Load failed`→既存BRAWL/小国戦線と同様の**Firebase AuthなしFriends**に変更。昔の「Supabaseの設定を変更せよ」「Firebase Auth必須」は現在の学校Friend対戦への指示として採用しない。
8. [Phase38](./PHASE38_PRIOR_FIREBASE_RULES_AND_READONLY_AUDIT_20261026.md)にある2026-10-22共有のFirebaseルールは**2026-11-08 00:00 JST**で期限切れの形式。現在の本番Rules全文はこの監査では読み出していない。もし未変更ならほかのゲームにも影響するが、本人の明示依頼なく本番設定を変更しない。

## ユーザーが以前送付した原作MP4（全5本）と観察の履歴
以下のファイル名・長さは**過去のGitHub観察記録によるものであり、今回MP4を直接開いて計測した値ではない**。
| 映像 | 以前の観察事実 | 今回のアクセス |
| --- | --- | --- |
| `ScreenRecording_10-27-2026 20-42-47_1.mp4`（216.533秒） | Phase49で元MP4の約4秒刻み＋重点区間の実フレームを目視。ピン、ひっさつカットイン、状態/UIを記録 | 元MP4未取得 |
| `ScreenRecording_10-27-2026 21-10-49_1.mp4`（126.83秒） | 4試合中第1試合。00:15–00:20のおはらい画面、00:44–00:52のひゃくれつ肉球のカットイン→連続ダメージ、00:59–01:05のトホホの砲等を以前の担当が元映像/静止フレームで確認 | 元MP4未取得 |
| `ScreenRecording_10-27-2026 21-10-49_1(2).mp4`（348.47秒） | 2026-10-28 Phase1.6では約19秒ごとの一部フレーム直接抽出で大ガマ変化の術・氷結地獄等を確認 | 元MP4未取得 |
| `ScreenRecording_10-27-2026 21-10-49_1(3).mp4`（275.37秒） | 2026-10-28 Phase1.6で序盤の一部実フレームを確認 | 元MP4未取得 |
| `ScreenRecording_10-27-2026 21-10-49_1(5).mp4`（260.87秒） | 2026-10-28 Phase1.6で15、60、110、175、235秒の5フレームを個別確認 | 元MP4未取得 |

2026-10-27の[受領・再アクセス失敗記録](./ORIGINAL_PVP_MATCH02_TO04_VIDEO_ACCESS_RETRY_20261027.md)に「2～4は未視聴」とあるのは**その時点の事実**。後の[Phase1.6での部分実フレーム観察](./PHASE1_6_TECHNIQUE_CATALOG_AND_ORIGINAL_VIDEO_REVIEW_20261028.md)が新しい履歴。**2～4試合を全編精査したとは言わない**。今回はFilesの会話・Library検索でも元MP4を発見できなかったので、以前の担当の文字記録は読めても、今の担当が動画本体を新規視聴した証拠はない。必要なら元ファイルが再アクセス可能となった時点でタイムコードと画面を再検証し、原作映像/転載画像をGitHubへ公開しない。

## 実装前の優先ゲート
1. Phase2.1C-2：新開発HEADでNode全体・Chromium操作画面・Firebase Friendsエミュレーターを独立検証。CIを観測できない場合、未実施・未確認と区別して報告。
2. Phase2.1Cの未確定式は、版・技威力・Spirit/Defense・1hit/多hit・会心・属性/乱数の条件を分ける。個別の正確な数値がわからないままレンタル6体を原作確定データへ変更しない。歴史的文書のYW1のダメージリンクをYW2の証明に使わない。
3. Phase2.2必殺技：対象複数と**個別ヒット回数**を区別。すでにあるマスター/ホスト/ActionOutcomeV2を再利用し、原作動画の技固有Hit表示へ結ぶ。全必殺を多段化しない。
4. Phase2.3：とりつく・スキルを効果ごとの原作根拠で更新。Phase3～5の行動ポイント/双方の表示保留・下画面並行操作の本家照合、Phase6の学校Safari2端末再試験まで6段階ロードマップを守る。

**今回の作業**：資料と実装構造、過去原作動画観察記録、時系列の矛盾を横断監査し、本資料に記録。**ゲーム本体修正0・新テスト実行0**。**次**：Phase2.1C-2 CI・実ブラウザ・Firebaseの新コミット回帰検証。**現在地**：Phase1完了、Phase2進行中（2.1C-1研究実装済／2.1C-2未完）。
