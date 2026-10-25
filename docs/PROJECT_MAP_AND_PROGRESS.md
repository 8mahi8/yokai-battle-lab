# 妖怪対戦ブラウザゲーム｜設計全体図・現在地・次の一手（単一の進捗入口）

更新: 2026-10-25 JST
Repository: https://github.com/8mahi8/yokai-battle-lab
Development branch: `feat/phase1-action-circle-lab-20261023`
**最新の現在地（2026-10-25再監査）:** [再監査済み正式引き継ぎ](./HANDOFF_VERIFIED_20261025.md)。開発は**Phase25（Supabase 1vs1 / 学校Google Sites用HTML）**。HEAD `7bfc083b7b3de677744aabffa80ad891a4c4488a`で[Node497/497 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40195497455)、[Chromium戦闘画面・指操作PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40195497517)、[実Supabase・同一Chromium内2 iframeの匿名認証/部屋/操作ACK/自動行動・4画面幅E2E PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40195497511)。旧`Anonymous sign-ins are disabled`は過去の失敗であり現在のブロッカーではない。学校実Google Sites・旧iPad Safari2端末の試遊、原作3DSとの定量一致、通信の長時間復帰は**未検証**。実DBは4表ともRLS有効で、Security Advisor最新取得は**5 WARN**（匿名認証に関係する4件・漏えいパスワード保護OFF 1件）なので過去の「0件」を現況と混同しない。ゲームテスト用の残存行あり。学校Googleサイト版・GitHub `main`・本番Firebaseは今回無変更。原作再現を独自改善より優先する方針は不変。
> **重複実装防止の必読資料**: [Phase1〜25 既存成果の再利用マトリクス・次の作業計画](./REUSE_MATRIX_AND_NEXT_PLAN_20261025.md)。新作業の前に対応コード・既存テスト・原作未確定点を照合し、研究済み機能を別名で作り直さない。

> **Phase21D-B3 妖気研究の最新差分（2026-10-25）**：[名前付き特殊技4件・元資料の不確実性・新6テスト](./PHASE21D_B3_NAMED_SPECIAL_RECHARGE_20261025.md)。既存の24観測値・Soul回復の通常ホスト規則は維持。**Node503/503 PASS**（[実行ログ](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40201933897)）。予測に必要な上限値が原文で「?」の3体は未確認のまま。第1段階の妖気回復・零式つつくの定量原作一致は引き続き未完成。今回の変更は研究モジュール・テスト・資料だけで、Supabase/Gサイト/`main`に変更なし。\n\n> **原作妖気研究 Phase21D-B4（2026-10-25）**: [原作資料・攻撃と妖術の妖気比較・残された実測ゲート](./PHASE21D_B4_ATTACK_SOUL_BONUS_AUDIT_20261025.md)。攻略資料の「サボり/悪いとりつき中の相手への攻撃で妖気増加」は定性的情報のみ。既存`engine/phase21d-soul-observation.mjs`に**同一条件2観測の比較器**を追加。新10テストを含め[Node513/513 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40202609186)、[Chromiumステージ・実指操作PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40202609177)。原作の攻撃/妖術の回復ポイントは引き続き未確定。**正規オンラインのSoul計算・Supabase設定/DB・Googleサイト版・`main`は変更しない。**

> **【2026-10-25 ユーザー指示／オンライン復旧スコープ確定】** 遊ぶ相手は友達同士のみ。**ページ再読み込み・ブラウザ再起動・タブ閉鎖後に、以前の対戦やルームへ復帰する機能は不要**。ログイン再利用/ルーム再発見/セッション永続化/完全復帰の実装・QAを新たなタスクにしない。再読み込みしたら新規ルーム・新しい対戦を始める運用でよい。一方、**同じページを開いて対戦している最中**の軽い通信遅延・短い切断による画面停止、入力重複、対戦同期の崩れは品質問題として改善する。既存の最小限の同期保護は削らない。今後の「切断復帰」の記述はこの範囲に限って解釈する。

> **【2026-10-25 方針更新・Phase26試遊優先】** [妖気の試遊用仮数値・実装・調整方針](./PHASE26_PLAYTEST_SOUL_TUNING_20261025.md)。本人の判断で、原作で未確認の回復・吸収量を研究だけで追い続けず、**仮値と明示してSupabase Google Sites向け試遊版に採用し、友達との試遊から調整**する。既存の研究比較器は保持し、原作数値の確定とは呼ばない。仮値は `engine/playtest-soul-tuning.mjs` に一元化（非攻撃+5、攻撃+8、攻撃妖術+8、状態異常の敵への命中+4、零式つつく最大35の敵→味方移転）。通常の研究ホストはそのまま、実試遊版ホストだけ `playtestSoulTuning:true`。学校Googleサイト本番、`main`、Supabase DB/RLS、Firebaseは勝手に変更しない。リロード後の対戦復帰も不要。**今後の「未確認数値は通常版へ導入しない」は原作確定仕様としては正しいが、明示した試遊版の仮値を禁止する意味ではない**。

> **【Phase26の実装・QA完了（2026-10-25）】** 仮値[一元調整ファイル](../engine/playtest-soul-tuning.mjs)と[設計・試遊メモ](./PHASE26_PLAYTEST_SOUL_TUNING_20261025.md)を更新済み。旧実装のSoul・Pokeを再利用して**通常のSupabase Google Sites版のみ仮値をON**。追加した研究/通常対戦の単体およびホストPoke確認を含め [Node 522/522 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40204311353)、[Chromium戦闘/指入力PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40204311488)、[Supabase Sites貼付HTMLビルドPASS（約176KB）](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40204311419)、[実Supabase 2 iframe Chrome通信PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40204146664)。**これは旧学校iPad Safariや実Google Sitesへの貼付を試したことではない**。数値は原作未確定の仮値で、本人の試遊後に再調整する。

> **【2026-10-25 23:57 JST 指示更新：数値より戦闘システムの大枠完成を優先】** 本人は、妖気等の細かい数値を先に研究・調整するより**「1試合を開始→基本行動→必殺・つつく→6体気絶→勝敗表示まで遊べる戦闘ゲーム」を先に完成**させたい。Phase26の暫定Soul値は既に導入済みなので**しばらく数値調整を停止**し、原作未確認量は仮値のまま使う。今後の優先順位：**①全試合通しのホスト+ゲスト E2E（全6体KO/控え繰り上げ/停止なし/双方勝敗一致/オート進行）②基本システムの抜け（必殺技の攻撃・回復以外の種類／個別技・状態効果／零式つつくの複数結果を暫定でも実戦へ組込）③通常/零式/必殺/おはらい/前衛交代の操作を通したUI、勝敗表示と対戦終了の整理（現在はalert中心、再戦機能は必須ではない）④基礎の試合完成後にノーモーション必殺・カウンター等の対戦特有の高度戦術⑤旧Safari/Google Sites直接貼付の実機2台検証**。既存のPhase5/20/22の研究コード、Stage、Supabase E2Eを再利用し、同じ機能の再実装を禁止。**勝敗を決めるコード自体は既存、ただし全試合オンライン通しの受入試験は未実施**。ホストの自動進行は現在ボタンでONにする研究用1500ms間隔。原作完全一致・旧iPad Safari可動を完成と呼ばない。閃光魂、育成、ランキング、リプレイ、観戦、リロード後の対戦復帰は引き続き対象外。

> **【Phase27 キャラの役割を原作参考に変更（2026-10-25）】** [必殺技カテゴリと6体の役割](./PHASE27_ORIGINAL_INSPIRED_SPECIAL_ROLES_20261025.md)を確定。**キャラの完全再現は不要**、オリジナル6体を使いつつ原作の「単体/全体攻撃・全体回復・強化・弱体化」など効果の種類を参考にする。既存の必殺・とりつき台帳に**buff/debuff**を最小追加し、いしもり=味方全体攻撃強化、くろがね=敵前衛全体防御低下、すずかぜ=単体妖術に差別化。味方の良い状態/敵への弱体化の表示も追加。**[Node529/529 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40205856316)**、**[Chromium戦闘画面・Pointer操作PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40205856312)**。状態Lv・技パワー等は原作一致ではなく**仮値**。原作再現キャラ画像や固有名の追加はしない。**次はオンライン1試合を決着まで通して確認する**。Googleサイト学校版・main・SupabaseDB/Rulesは無変更。

> **【Phase28 完全対戦通しテスト（2026-10-26）】** [新たな優先計画とバグ修正根拠](./PHASE28_FULL_MATCH_ROADMAP_20261026.md)。本人は**学校用Phase27ファイルを固定、こちらは開発継続**を決定。正規ホストの初手→前衛6体KO→勝敗一致までの3試合E2E相当のNode検証で、**強制KO交代に3秒手動回転ロックが誤適用され進行停止**する実バグを再現・修正。自動交代だけロック解除、プレイヤー自身の3秒ロックを維持。[Node533/533 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40207757736)。これは**通信なしのホストと両席の画面状態比較**で、Supabaseの全試合試験や学校Safari検証ではない。開発修正前の**学校用固定Phase27にはこの不具合が残っている可能性**があるため、本人へ明示する。Supabaseリアル2iframe QA [最新再実行](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40207757764) は別途確認し、結果が確定するまで完了と呼ばない。次はクラウド通信での決着まで、勝敗画面、その次に未完成必殺/つつく、最後に高度対人・実機チューニング。

> **【Phase29 対戦終了UI／最新版の配布は本人の依頼時のみ（2026-10-26）】** 本人の「Googleサイトに貼るやつちょうだい」と言われるまでは**開発・QA・記録だけ続行**。旧Phase27学校試遊ファイルと学校公開版は触らず、未依頼の配布ファイル/Drive複製は作らない。[Phase29詳細](./PHASE29_MATCH_FINISH_UI_20261026.md)。確定winnerのみを使う**「勝利！」「敗北…」の結果画面**と試合後の操作無効化を実装。ローカル/ネット画面とも同じステージUI。**[Node534/534 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40208856871)**、**[実Chromium result UI含むPASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40208856856)**。次は実Supabaseの全6体KOまで両席一致を検証。未実施の学校SafariやGoogle Sites実貼付を「検証済み」と呼ばない。

> **【Phase28-B 実Supabaseの最終勝敗まで（2026-10-26）】** [実クラウド最終決着検証・通常版との分離と未検証事項](./PHASE28B_REAL_SUPABASE_FULL_MATCH_20261026.md)。Google Sites想定2 iframeが別匿名Authで実Supabaseルームを作成・参加し、**実ホストの戦闘6体KO→クラウド配信→ゲストの同じ勝者受信→勝利/敗北の逆画面→終了後操作無効**まで [CI成功](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40209857257)。専用ビルドだけに**高速進行/合成攻守ステータス**を入れ、通常公開用HTMLへ漏れていないこともCIでチェック。**通常レンタル同士の1500ms全ターン配信、学校Safari/Google Sitesでの実機対戦はまだ未検証**。本人が「Googleサイトに貼るやつちょうだい」と言うまでは新しい配布ファイルを生成して渡さず、学校の旧Phase27版と公開ページは固定。次は必殺/つつくの基本効果種の完成と、通常ペースのクラウド連続試合QA。

> **【Phase30 新しい必殺技3カテゴリ（2026-10-26）】** [Phase30の設計・実装・仮値・検証](./PHASE30_SPECIAL_EFFECT_FAMILIES_20261026.md)。本人の「数値より大枠」「原作キャラを完全コピーしない」「Googleサイト貼付ファイルは本人が依頼した時だけ」の方針を守る。既存の必殺効果計画と状態台帳/KO・行動許可を拡張し、**復活（控えKO含む）／敵からのHP吸収→味方回復／敵への攻撃＋能力低下**を正規ホストでプレイ可能にした。オリジナル6体の役割を振り直し、数値は仮。**[Node542/542 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40211265032)**、**[Chromium UI/タッチ/勝敗 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40211265053)**、**[Supabase 2iframe初期通信PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40211265071)**、**[実Supabaseクラウド高速6KO終局PASS（Phase30コードを含む）](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40211457091)**。自動テストの合成高速戦闘は学校旧iPad Safariで通常テンポを試したことではない。**配布済みPhase27と実Google Sites/mainは無変更**。次は零式つつく結果の複数化、その次は通常ペースの2端末長時間戦闘。

> **【Phase30-B 復活＋全体回復の資料再照合修正（2026-10-26）】** 本人の指摘を受けて[原作の固有必殺技と資料3系統を再照合](./PHASE30B_YW2_RESURRECTION_SOURCE_CORRECTION_20261026.md)。**花さか爺・心オバア：味方全体復活＋HP回復**、**おでんじん：単体復活**を区別。旧Phase30の「ほたる＝1体だけ復活」は誤った代表型選択だったので、ほたるの必殺を**味方6体の回復＋気絶者は全員復活（仮HP85）**へ修正。従来の単体復活kind自体は削除しない。KOが複数/控え/HP上限/G強化/対戦ホストの行動可否/Journalを追加テストで確認。**[Node546/546 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40212203910)**、**[Chromiumステージ/指操作/結果画面PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40212203922)**。旧学校Phase27ファイル・Googleサイト版/main/Supabase設定は無変更。新しいファイル配布は本人が明示するまで行わない。

**必ずこのファイルを最新の一つの状態表として扱う。** 他の `PHASE*.md` / `DEVELOPMENT_STATUS` は当時の作業証拠と歴史であり、本文に「LATEST」とあってもこの現状を上書きしない。

## 0. 絶対仕様（ゴールは一つ）
学校の古いiPad Safariで友達と遊ぶ、**妖怪ウォッチ2の対人戦闘ルールをまず忠実に再現した**完全無料のブラウザ1vs1。既存戦術が成立することを原作資料・実際の検証と照合した後だけ独自改善する。初期は双方同じオリジナルレンタル6体、**閃光魂なし**。本家に寄せた**上3vs3戦場／下6体メダルサークル＋4コマンド**構成。ゲームの単一HTML/CSS/JSをGoogle Sitesの「コードを埋め込む」へ**直接貼る**（GitHub Pages URLのiframeではない）。`main`・既存Googleサイト版・本番Firebaseは勝手に変更しない。**再読み込み・ブラウザ再起動後の対戦復帰は不要（2026-10-25確認）**。

## 1. システム全体の配置（縦につながる）
```text
[原作仕様 / 競技戦術の証拠]  ── Phase 1-10, Phase 21-22
              ↓
[戦闘の真実 / engine/*]  ── Phase 1-10研究、Phase 20統合、Phase 21検証
              ↓
[2席ホスト / engine/match-protocol.mjs]  ── Phase 11・18〜20
              ↓
[部屋と同期 / network/firebase-*.mjs]  ── Phase 12〜14、Phase 23安定化
              ↓
[本家風UI / ui/match-stage.mjs]  ── Phase 14〜18、Phase 24最終照合
              ↓
[学校 iPad Safari / Google Sites直接埋め込み] ── Phase 24実機・公開
```
**重要:** Phase番号が前でも「公開動作に統合済み」とは限らない。研究用 `createCombat` オプションと対戦用 `createMatchProtocol` **標準オプションを別々に確認する**。

## 2. フェーズと完了判定（5つの横断ゲート）
| フェーズ | 全体設計の箇所 | 既にあるもの | 次に必要な受け入れ判定 | 位置 |
|---|---|---|---|---|
| 1〜10 | 原作エンジン研究 | 行動順、4行動、とりつき、妖気、4チャージ、5おはらい、つつく、公式資料ベースのダメージ、各ヒット処理、独立研究用戦術 | 原作と確定できない数式を別扱いし実戦版へ段階統合 | **研究成果あり** |
| 11〜19 | ホスト通信・画面の土台 | 正規2席コマンド、Firebaseエミュレータ通信、上下画面、オリジナルキャラ、仮必殺効果 | デバッグ画面と実オンラインを混同せず、通信端末で検証 | **基盤あり** |
| 20 | 研究から正規1vs1への統合 | **20A: Phase9攻撃・妖術＋Phase10ヒット別処理。20B: DEF/STR/SPR能力低下を継続HP効果と分離してホストON**。両方とも個別技値は仮。 | 保留: 回復基礎式と毒/再生HP係数は原作確証までOFF。元の6体に多段技未付与。 | **根拠がある範囲は統合済み** |
| 21 | 原作ルール一致度 | **21A/B:** 3秒回転制限・ゲスト拒否。**21C:** 94行速度表＋初手比較器（原作同着は未完）。**21D-A/B:** 妖気24条件と矛盾分析。**21D-C1/C2:** 正規ホストつつく/12体妖気観測。**21D-C3:** 2014年通信対戦の「妖気を奪われたあと必殺」記録と2020年の連続吸収/複数必殺の戦術編成を確認（どちらも数値未取得）。 | 妖気受取先・回収量・発生確率を元の対人映像で照合し、数値が固まるまで通常版へ追加しない | **原作PvP定性資料と研究試験あり／数値未検証** |
| 22 | 原作PvP深層戦術 | Phase5ノーモーション・回転・カウンターの独立研究。**22A:** 仮妖気回収による研究用連射。**22B:** 正規ホスト4種チャージ/G技。**22C:** ゲストACKとChrome Firebaseローカル2席6タップの同期PASS。**22D-A/B:** 2我慢のcut-in回転例外は原作ロック時刻を未確定とし仮HPを止めた。cut-in中の前衛候補と仮想時刻64記録、3回以上回転との二重原因保持、2015年の両視点ノーモーション実験候補映像を特定。Node463/463、Chromeステージ・Firebase Emulator 2席PASS | **22D-C:** 2015年両視点映像から同期したフレーム時刻が実測できるときにだけ反映。2我慢例外の回転中ロック時刻、3回以上回転と追加効果は未定。Phase23/24旧iPad Safari実機・Google Sites直接コード貼り付け | **定性資料・研究診断・ブラウザ通信QA済／3DS実フレームと本番公開未検証** |
| 23 | 本番向け1vs1同期 | Firebase Auth+RTDB **ローカルエミュレーター2Chrome**、33権限チェック・必殺6タップACK、23Aのオフライン古い操作FIFO破棄と同一番号再送、23Bの権威dirty再publish・120行動書込集約・91入力順序検証。**23C:** 実Chrome2席で研究ホストアダプタに一度だけpublish故障注入。ゲストの本物の輪操作はホスト内部1回だけ実行され、未配信間はゲスト画面が進まず、同番号再送でも二重回転せず、ホスト再配信ボタンで同じrevisionを公開するとゲストの前衛・ACKが追いつく。Node469/469、Chrome2席Firebase QA PASS | **Phase24-A:** Google Sites HTML/CSS/JSを直接貼るためのバンドルとSafari互換ゲート。実クラウド/学校2端末での長時間ネットワーク・負荷検証は未実施。22D原作フレーム調査は別途継続 | **研究アダプタ故障注入→実Chrome2席ACK復旧 PASS／物理iPad・本番Firebaseは未検証** |
| 24 | 学校iPad・Google Sites直接埋込配布 | **24A/B:** CSS/JSとホスト/ゲストRTDB通信を直貼りHTMLへバンドル、Chrome2iframe+Firebase Auth/RTDB Emulatorで実2席ルーム/輪/チャージ/ACK/断線復帰PASS。**24C1/C2:** ホストのみ自動行動ON（1500ms仮間隔、断線/画面非表示/未publish時停止）、Chrome iframeの横幅1024/820/568/390pxで上下画面・実タップヒットPASS、旧Safari最低機能を開始前に検査。**24C3:** 既存`mygame-df915`を共用、`/yokaiRoomsV1`のみ別ルート・匿名Authはプレイヤーに操作不要のまま採用。合成共有Rulesの16条件をFirebase EmulatorでPASS。**24C4:** Web config/現行Rules/匿名Authオーナー申告を無通信で監査するツール新設、広い親RTDB権限や別プロジェクト設定をブロック、APIキー・Rulesをログへ出さず、共有Firebase設定の誤コミットを除外。Node491/491 PASS | **次:** 既存Firebase ConsoleでWeb config/匿名Authの有無と**現行RTDB Rules**を読み取り確認、出力した案をローカルエミュレーターで事前検証（実Rulesのデプロイは別承認）。実Google Sites編集/学校iPad Safari 2台で実験。原作未確定テンポ/技効果は別途研究 | **ローカルの既存プロジェクト照合器・Chrome2席QAはPASS／本番Firebase・実Google Sites・旧iPad Safariは未検証** |
| 25 | Supabase本命・実クラウド1vs1基盤 | 開発ブランチの戦闘engineを再利用、4つの`yw_*`表/RLS/host guest分離、約175KBの直貼りHTML生成。**Node497/497、Chrome研究UI・本番Supabase 2 iframe E2EすべてPASS**。過去の匿名Auth OFF障害は解消を観測 | **残:** 実Google Sites・学校旧iPad Safari2席・対戦中の通信安定性・原作3DS技値/妖気/フレーム照合。クラウドQAの残存テスト部屋は勝手に消さず後片付け設計。Advisor5 WARNは匿名運用を考慮して別途レビュー | **ブラウザクラウドE2EはPASS／学校実機・原作一致は未検証** |

## 3. 今回した作業（Phase25再監査・2026-10-25）

**全体設計のどこ:** 原作研究→`engine/match-protocol.mjs`（ホスト権威）→`network/supabase-room.mjs`（本番通信）→`ui/match-stage.mjs`（上下2画面）→Google Sites直接HTML貼り→学校旧iPad Safari試遊。

**確認した事実:** 正規開発ブランチの実ファイル・GitHub Actions最新ログ・実Supabaseプロジェクト状態を再照合。497件のNodeとChromium UI・ポインタ操作PASS、実Supabase匿名Authを使った2 iframeオンライン操作同期PASS。4表RLS有効、Project ACTIVE_HEALTHY。Supabase Security Advisorは最新**5 WARN**。2 room / 2 state / 2 input / 4 presenceのテスト行が残る（読み取り専用集計）。旧文書の「Auth disabled」「警告0」「495 tests」「クラウド対戦未実施」は現状を表していない。詳細とリンクは[再監査済み正式引き継ぎ](./HANDOFF_VERIFIED_20261025.md)。

**実施していないこと:** 学校実Google Sites/旧iPad Safariでの1vs1、原作3DSと完全一致する戦闘検証、長時間通信保証。今回GitHub文書を更新する以外、戦闘コード/Google Sites本番/Supabase DBやAuth/Firebase/mainを変更しない。

## 4. 次にする作業（Phase25以降）

1. **担当AIの仕事:** 原作再現の未確定領域（ノーモーション必殺、妖気量・受取先、同値行動順、カウンター/2我慢、技別数値）を既存資料と外部根拠から再検証。新機能の前に既存研究を検索してから原作との比較テストを増やす。
2. **担当AIの仕事:** 実Supabase 2 iframe E2E成功を基準に、同一ページ内の短い通信中断時の同期・長時間操作・試験部屋クリーンアップと旧Safari最低機能を検証する。現DBのテスト行を無確認で削除しない。最新Advisor警告を匿名サインイン前提とパスワード認証部分に分類して扱う。
3. **本人の出番（後段）:** 学校の旧iPad実機で試せるだけのHTML/手順/ブラウザQAを担当AI側で整えてから、Google Sites「コードを埋め込む」へ全文を貼り、友達と旧Safari2席の操作・同期・ラグを確認してもらう。**今は本人にAuth設定操作を頼まない。**
4. **現在の変更先:** GitHub開発ブランチの引き継ぎ文書のみ。`main`・Googleサイト版・既存Firebase・Supabase DB・他のゲームは変更しない。

## 5. 次フェーズへ進む条件と設計逸脱を防ぐルール
- **原作再現 → 対人戦術 → オンラインの安定 → 学校Googleサイト**の順を守る。画面装飾、独自ATB、次の5行動予測（UI標準ではOFF）、閃光魂、育成、ランキング、リプレイ、観戦は**現在のスコープに入れない**。
- 何かを「再現済み」と言うには、①資料と根拠の確信度、②戦闘コード、③再現テスト、④原作との比較ケースの4つが必要。**Node全件PASSは元ゲームとの一致を示さない**。
- 新機能の前に既存 `docs/` と `engine/` `tests/` を検索する。同じ研究を2回始めない。
- 少なくとも「原作確認済」「有力な非公式研究」「仮値」「未着手」を区別して記載。
- このファイルの **「今回」→「次」→「全体の設計のどこ」** を毎回作業終了時に更新し、GitHubとチャットの両方で報告する。大きい変更の際はここへ関連コード・run URL・次の受け入れ条件を残す。

## 6. 今後のチャット返信テンプレート（毎回、短くても必ず）
**今回**：XXを修正、実装／検証。テスト（n/n）・実機（済/未）。
**全体のどこ**：Phase NN / 何のモジュール。前段階は何が済み、後段階はまだ何が未完成か。
**次**：Phase NNの課題、採用条件・保留理由・君の作業要否。
**変更先**：開発ブランチ/Googleサイト版/実本番Firebase のどれを変えたか明記。
