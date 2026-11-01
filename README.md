> **2026-11-02 V3-5-21｜ホスト確定のクリティカルを戦闘画面へ表示：** [引き継ぎ・原作照合・テスト](./docs/ENGINE_V3_5_21_CRITICAL_HIT_FEEDBACK_AND_MULTI_TARGET_EVIDENCE_20261102.md)。通常/研究必殺の1Hitごとの`critical`を再計算せず描画に反映。数値や通信は変更せず、学校の6体はそのまま。原作の複数対象連撃の配分/KO後挙動は出典不十分につき保留。新CIが完了するまで合格と記さない。

> **2026-11-02 V3-5-20｜原作必殺技の数値不一致とLast-Hit再描画修正：** [資料・コード・テスト・引継ぎ](./docs/ENGINE_V3_5_20_MULTITARGET_SOURCE_CONFLICT_AND_RECOVERY_20261102.md)。ブシニャン必殺は資料が25×10 / 20×10 / 22×9と衝突、全体Hitの各敵配分は未確認。安全に研究用の未確定データとして保存し、試遊対戦には適用せず。攻撃終了後の回復演出で最後のダメージ数字が繰り返し出る問題を修正。Node971/971・Chromium Stage PASS。学校HTML/Firebase Rules/mainは未変更。

> **2026-11-02 V3-5-19｜原作根拠のある3Hit通常技を研究環境で実演：** [資料・実装・テスト・引き継ぎ](./docs/ENGINE_V3_5_19_BUSHINYAN_SOURCE_ATTACK_20261102.md)。ブシニャン「閃光ぎり」20×3（YW2攻略3資料が一致）を学校版と分離した研究データとして収録。実カスタムHost→両席の連続Hit→Chromium表示まで確認。Node967/967・Stage PASS。原作本体の能力値/モーション/必殺Hit分配は未確定。学校Safari/Google Sites本番HTML、main、Firebase Rulesは変更なし。

> **2026-11-02 V3-5-18｜実Hit列の共通描画・原作数値色：** [調査・実装・検証・引き継ぎ](./docs/ENGINE_V3_5_18_NORMAL_HIT_TIMELINE_AND_BROWSER_QA_20261102.md)。Hostが記録した攻撃の各Hit/Missだけを共通Choreography・学校版と共通のStage表示へ接続。カスタム研究技は既存レンタルのMove IDを誤用せず、もとの6体・戦闘値・通信は維持。Node **965/965 PASS**（コード修正後 `bc118633`）。Chromium追加の新受入は最新HEADのCIで別途確認。原作5/7 Hit数資料衝突は未確定、V3-5は未完成。

> **2026-11-02 V3-5-17｜技名・実行定義の出典ゲート：** [原作参照と表示修正の正式記録](./docs/ENGINE_V3_5_17_SPECIAL_NAME_SOURCE_GATE_20261102.md)。レンタル6体の技名は維持。研究用の別必殺が同じスロット・キャラ名でもレンタル固有名を誤表示しないよう、実Hostの技種・対象範囲・威力・状態効果を一致判定。出典確認済み原作研究技は研究名、未認証の別技は汎用名。表示・テストのみ変更で戦闘値/通信不変。Node961件成功（[Actions](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41335044627)）、実Chromium Stage成功（[Actions](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41335038967)）。Firebase同HEADの結果は別途照合。学校Safari実機は未検証。V3-5全体未完成。

> **【2026-11-02 V3-5-16 引継ぎ再監査・多段Hit表示修正】** [正式な原作・実装・試験台帳](./docs/ENGINE_V3_5_16_HANDOFF_REAUDIT_AND_HIT_CAPTION_20261102.md)。Host確定の各命中/ミスに合わせて行動説明の数値を更新し、途中ヒットで最終合計を先出ししない。既存のゲーム結果/通信とオリジナル6体、未確定の原作Hit数はそのまま。開発ブランチのみ更新。V3-5全体・学校Safari実機受入は未完。

> **【2026-11-02 V3-5-15 最新】** [元動画と原作再現の重要ギャップ比較＋開戦「いざ勝負！」](./docs/ENGINE_V3_5_15_ORIGINAL_PVP_GAP_PRIORITIES_AND_OPENING_20261102.md)。原作動画の既存フレーム観察から、初戦のみの**非ブロッキング開戦表示**をFriendsに追加（950ms試用値）。**現在の6体は承認済みオリジナルレンタルで、通常技名と一部ヒット数は原作として未確定**。名前やHit数を独断で作らない。現行の大きな不足は技固有演出・原作の命中列・学校実機での体感テンポ。[Node955/955](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41331203475)、[Stage Chromium16/16](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41331203441)、[Firebase2席/通常＋保存旧Rules再現・全試合PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41331185608)。元MP4原本の今回直接再視聴と学校Safari実機2台試遊は未実施。**次V3-5-16、V3-5全体未完**。学校Google Sitesの稼働HTML、本番Firebase Rules/Auth/DB、main/Driveは変更なし。

> **【2026-11-02 V3-5-14 最新】** [時計合わせのブラウザ操作中断・再開バグ修正](./docs/ENGINE_V3_5_14_SAFARI_POINTERCANCEL_ALIGNMENT_RECOVERY_20261102.md)。**Safari`pointercancel`時に時計が成功扱いにならず、次の指で12時から正常にやり直せる**。もともとのFirebase Rulesは`tap/down/move/up`だけを許可するので、新通信タイプ案は試験で`permission_denied`を検出して**撤回**、Rules/Auth/通信方式は不変。[Node953/953](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41329695172)、[Stage16/16](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41329691071)、[実Firebase無認証二席全工程2回PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41329695160)。本物の学校iPad Safari2台・元MP4原本の今回直接再確認は未試験。次V3-5-15は原作再現に重要な未完部分を優先。学校のGoogle Sites稼働HTML/本番Firebase/main/Drive未変更。

> **【2026-11-02 V3-5-13 最新】** [必殺チャージ4方式のFirebase無認証2席・完走受入](./docs/ENGINE_V3_5_13_FOUR_SOULTIMATE_CHARGE_GESTURES_ONLINE_E2E_20261102.md)。既存tapに加え、**回すspin／なぞるtrace／時計align**をHostの正規選択と`srcdoc`実Pointer操作→両席ACK→妖気消費→本当の必殺技×3/敵HP変化まで確認。**[Node950/950](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41326495148)、[Stage16/16](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41326490328)、[Firebase二席・通常と旧Rules両条件で全工程PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41326490366)**。ゲーム本体の数値・ルールは変更なし、QA専用`?chargecycle`のみ追加。学校iPad Safari実機2台と元MP4原本の今工程直接確認は未実施。次 V3-5-14。学校Google Sites本番HTML、Firebase設定、main、Drive未変更。

> **【2026-11-02 V3-5-12 最新】** [原作5種類のおはらいをFirebase実2席で操作検証](./docs/ENGINE_V3_5_12_FIVE_PURIFY_GESTURES_ONLINE_E2E_20261102.md)。既存ゲーム本体/演出/入力判定は**変更せず**、本物のHost負とりつきからpop/連打/こする/回すの途中進捗と取消、最後のslash3斬りの正規おはらい完遂まで、学校Sites型2つのChromium`srcdoc`＋Firebaseローカル無認証で確認。[Node950/950](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41325027151)、[Stage16/16](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41325020257)、[Firebase実2席・旧Rules2回すべて成功](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41325027081)。**学校iPad Safari実機2台は未試験**。次 V3-5-13 は必殺チャージ残り3操作。学校Google Sites稼働HTML、本番Firebase設定、main、Drive無変更。

> **【2026-11-02 V3-5-11 最新】** [とりつきの予備動作中に状態マークが先行表示される問題を修正](./docs/ENGINE_V3_5_11_INSPIRIT_IMPACT_TIMING_20261102.md)。`inspirit`成功時、**上画面・本人のサークルの新規「⚠/↑」は命中後に描画**。Host正規状態、効果、HP、通信、ゲームルールは不変。**[Node950/950](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41323466145)、[Stage16/16](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41323465990)、[Firebase No-Auth 2席・過去Rules再現の全試合2回](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41323466038)成功**。学校Safari実機2台と元MP4の今回直接視聴は未検証。次V3-5-12。学校Google Sites稼働HTML、本番Firebase設定、main、Drive無変更。

> **【2026-11-01 V3-5-10 最新】** [原作対人「行動モーション中の相手輪表示保留」](./docs/ENGINE_V3_5_10_FRIENDS_OPPONENT_MOTION_VISIBILITY_20261101.md)を学校Friendsの表示に適用（既存投影コード再利用）。正規Hostの操作/HP/妖気/通信は遅れず、**相手が見ている前衛と妖気だけ再生中のモーション終了まで表示保留**。Firebase実Chromium2席で**Guest回転B1→B4のHost ACK→Host旧B1表示→終了後B4に復帰**を確認、その後おはらい・通常G・全6KO/双方結果を**旧Rules再現込み2回通し成功**。[Node950/950](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41283583422)・[Stage16/16](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41283580374)・[Firebase実2席2回PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41283583410)。**原作時間の厳密一致・学校Safari実機2台は未検証**。次 V3-5-11。学校Google Sites実稼働HTML/main/本番Firebase設定/Driveは変更なし。

> **【2026-10-31 V3-5-9 最新】** [原作PvP動画と戦闘画面の差分照合](./docs/ENGINE_V3_5_9_ORIGINAL_PVP_VISUAL_ALIGNMENT_20261031.md)。原作の**赤い円形ピン外輪**と**緑のスキル発動通知**に合わせてCSSを修正。大判必殺・KO青いひとだま・控え交代は既存のまま、ゲームルール/通信変更なし。**[Node950/950](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41178817313)、[Stage16/16](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41178817321)、[Firebase No-Auth実2席＋歴史的Rulesの全回帰二度通し](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41178817458) PASS**。学校のSafari実機2台とMP4原本の今回直接比較は未検証。**次 V3-5-10**：学校実試遊と原作の体感差分を優先。学校Sites稼働HTML、本番Firebase Rules/Auth/DB、main、Driveは未変更。

> **【2026-10-31 V3-5-8 最新】** [Google Sites短いiframeの下画面チャージ実通信受入](./docs/ENGINE_V3_5_8_SHORT_SITES_GESTURE_ACCEPTANCE_20261031.md)。**568×320／390×360／820×390px**でも実2席Firebase上で通常/Gチャージの中止・タッチ点へアクセス可能、既存おはらい/6体KO/結果まで2回PASS。**Node950件・Chromium Stage・Firebase実2席成功**。不必要なCSSを追加せず、ゲーム本体はV3-5-7と同じ。**10/22保存のFirebase Rules写しは11/8 00:00 JST期限**、現在の本番Rulesが同じか未確認のため接続不能リスクは要認識。学校Safari実機2台・原作動画原本直接比較は未実施。次V3-5-9。

> **【2026-10-31 V3-5-7 最新】** [学校iPad向けタッチ領域/円ドラッグ直後の敵ピン不具合修正](./docs/ENGINE_V3_5_7_FRIENDS_TOUCH_IPAD_20261031.md)：Friendだけの44pxヒット領域と`touch-action:none`、実指ドラッグ相当の`TouchEvent`→Host正規回転後の**敵への即時ピン誤抑止**を修正。学校形式の本物Firebase No-Auth Chromium2席/4サイズでタッチ→ACK→KO/勝敗を2回完走。**Node950件・Stage・Firebase実2席すべてPASS**。学校Safari実機2台と元MP4原本再生はまだ未検証。次V3-5-8は学校実機の操作感／試合時間。

> **【2026-10-31 V3-5-6 最新】** [通常学校対戦8シードのテンポ実測と友達用UI整理](./docs/ENGINE_V3_5_6_SCHOOL_PACING_AND_FRIENDS_UI_20261031.md)：**放置8試合で7試合121〜227行動で決着、1件240行動時点で未決着（停止なし）**。2.6秒/行動の暫定時計はそのまま。Friendsの開発用帯/REV/試験用文言を非表示、研究UIと戦闘ルールは不変。**Node950/950、Chrome Stage、Firebase No-Auth実2席と同一試合フルE2Eが成功**。学校iPad Safari2台と元MP4の原本直接比較は引き続き未検証。次V3-5-7は通常学校版の体感・端末画面確認。

> **【2026-10-31 V3-5-5 最新】** [一試合の全操作・Firebase2席通し結果](./docs/ENGINE_V3_5_5_ONE_ROOM_FULL_MATCH_E2E_20261031.md)：とりつき→おはらい→通常必殺→控え交代→零式G→6体KO→両者反対の勝敗まで**同じ部屋の正規実通信でPASS**。Node949/949・Stage Chrome・No-Auth RTDB二席成功。学校Safari実機・本家元動画直接再視聴・原作数値は未検証。次は通常レンタルの試合テンポ/学校実戦の品質検証。

> **【2026-10-31 V3-5-4 最新】** [オンライン実2席・おはらい完了E2E](./docs/ENGINE_V3_5_4_FRIENDS_PURIFY_E2E_20261031.md)：Node946件・Chromium/Firebase Emulator二席PASS。次はV3-5-5全試合統合。学校Safari実機と原作MP4直接比較は未検証。現行通信は認証なしFirebase Friends。

> **【2026-10-31 現行開発入口】** [最新V3-5-3 Friends GわざE2E・検証・次工程](./docs/ENGINE_V3_5_3_FRIENDS_ZERO_G_DAMAGE_E2E_20261031.md) / [引き継ぎ現況](./docs/HANDOFF_LATEST_20261030.md) / [6段階ロードマップ](./docs/ROADMAP_6_PHASE_PROGRESS_20261028.md)。開発はV3-5途中。原作値/学校Safari最新版は未検証。以下の旧2.5Dデモ記述は現行ゲーム仕様ではありません。

> **【2026-10-25最新入口】** この`main`由来のREADME本文は旧2.5D造形デモの記録です。**現在の開発状況は[再監査済み引き継ぎ](./docs/HANDOFF_VERIFIED_20261025.md)と[設計全体図](./docs/PROJECT_MAP_AND_PROGRESS.md)**を参照（開発ブランチ`feat/phase1-action-circle-lab-20261023`）。Phase25でSupabase実2 iframe E2EとNode497/497テストに成功。実Google Sites／学校iPad Safari／原作完全一致は未検証。以下のPhase20などの古い記述は履歴です。

> **2026-10-24｜このREADMEは古い2.5Dキャラ研究デモの説明です。今の対戦ゲーム完成状況ではありません。**
> 最新の原作再現1vs1と現在の開発位置は **[設計全体図・進捗管理](./docs/PROJECT_MAP_AND_PROGRESS.md)** を先に確認し、詳細は [最新引き継ぎ](./docs/HANDOFF_LATEST_20261024.md) を参照してください。
> 現在の開発はブランチ `feat/phase1-action-circle-lab-20261023`。Phase 20A（攻撃/妖術＋多段計算の対戦統合）が完了し、Phase 20B（とりつき・回復の根拠確認）が次。原作の完全再現・Googleサイト直貼り・学校実機検証は未完了です。**この下は歴史的な旧デモの説明で、現行仕様として採用しないこと。**

---

# 妖怪キャラ研究室 / 2.5D Lab

学校のiPad（Safari）向けブラウザ対戦ゲームを作る前段階として、**1体の造形・動きの品質を検証する専用ページ**です。現時点ではバトルではなく、キャラクターの動きを観察します。

## 試遊

GitHub Pages のURL: https://8mahi8.github.io/yokai-battle-lab/

デモの操作：待機 / 通常攻撃 / 妖術 / とりつき / 必殺技 / 被弾 / 気絶 / 移動を選択できます。正面・暫定斜め・専用背面表示、再生速度、一時停止、繰り返しを切り替え可能です。

## 制作方法

- すべての造形は自作SVG。公式画像・モデル・音声は同梱しません。GitHubで公開するため、現段階は既存キャラクターの完全再現ではなく**猫の妖怪を使った制作技術の検証**です。
- 小国戦線IIIの守護ゴーレム「ガルド」の制作資料を参照（https://github.com/8mahi8/shokoku-sensen/blob/main/docs/CHARACTER_PIPELINE.md）。輪郭先行 → パーツと関節 → キーポーズ → アニメーション → 小画面QA → 本編統合という工程を取り入れます。
- アニメーションは `requestAnimationFrame` とSVGグループの局所的な変形で描画。戦闘ロジックはありません。正式ゲームではSVGのランタイム負荷を測定し、必要ならスプライトアトラス書き出しを行います。
- 前後は異なる絵、斜めは暫定の横圧縮と回転。**斜めを完成した立体アニメーションと見なさない**こと。
- 一つのHTMLだけで動作し、外部ライブラリ、サーバー、課金を必要としません。

## 検証状況

- アニメーション8種、ビュー3種、IDの重複、JavaScriptの実行状態を簡易DOMで検証。
- SVGを静止画像に書き出して視覚確認済み。
- Chromium/Safariの実ブラウザ自動操作は、この実行環境のブラウザ通信制約によって**未確認**です。実機iPadでの最終評価はユーザーが行います。
- これは**初回造形候補（V0.1）**であり、ユーザー評価を経て改良する予定です。正式な妖怪ウォッチ2の戦闘や原作キャラクターはまだ含みません。

## 次にすること

1. 実機で画面レイアウト・アニメーションの自然さを評価。
2. ユーザーのフィードバックを受け、特に頭身、立体感、攻撃モーション、背面・斜め表現を修正。
3. 原作再現を行う場合、公開するビジュアル素材の権利について先に適切な対応方針を決める。
4. 品質基準が固まったらスプライトの書き出しと戦闘エンジン接続を検討。
