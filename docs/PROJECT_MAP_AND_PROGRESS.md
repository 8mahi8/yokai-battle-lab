# 妖怪対戦ブラウザゲーム｜設計全体図・現在地・次の一手（単一の進捗入口）

更新: 2026-10-25 JST
Repository: https://github.com/8mahi8/yokai-battle-lab
Development branch: `feat/phase1-action-circle-lab-20261023`
**現在: Phase20A/B・21A/Bの根拠ある部分を正規2席ホストへ統合済み。21C同着・21Dつつく妖気吸収・22Dノーモーション/カウンターの3DS確定フレームは未測定のため研究専用。22B/Cで4種必殺チャージとゲストの本当の発動ACKを、23Aで回線断中の未送信連打破棄/同一番号再送を、23Bでホストdirty戦況の再publishと120自動行動・91連番入力を検証済み。**Phase23-CではChrome内の独立Auth2席/Firebase RTDBローカルエミュレーターで、ゲストの実画面の輪回転→ホスト内部で1回適用→研究アダプタの次回publishを1回だけ故障注入→ゲストに誤ったACK/前衛を出さず、ゲスト同番号再送で重複回転0→ホストの実UI「未反映の戦況を再送」で同じrevisionをpublish→両画面一致まで検証。Node469/469、Chromeステージ・2席Firebase QA全成功。** 次はPhase24-A Google Sitesに「コードを埋め込む」自己完結のHTML/JS/CSSビルドと旧iPad Safari実機ゲート。
**必ずこのファイルを最新の一つの状態表として扱う。** 他の `PHASE*.md` / `DEVELOPMENT_STATUS` は当時の作業証拠と歴史であり、本文に「LATEST」とあってもこの現状を上書きしない。

## 0. 絶対仕様（ゴールは一つ）
学校の古いiPad Safariで友達と遊ぶ、**妖怪ウォッチ2の対人戦闘ルールをまず忠実に再現した**完全無料のブラウザ1vs1。既存戦術が成立することを原作資料・実際の検証と照合した後だけ独自改善する。初期は双方同じオリジナルレンタル6体、**閃光魂なし**。本家に寄せた**上3vs3戦場／下6体メダルサークル＋4コマンド**構成。ゲームの単一HTML/CSS/JSをGoogle Sitesの「コードを埋め込む」へ**直接貼る**（GitHub Pages URLのiframeではない）。`main`・既存Googleサイト版・本番Firebaseは勝手に変更しない。完全なブラウザ再起動後の自動復元はユーザー不要の判断。

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
| 24 | 学校iPad・配布 | 上下画面と指サークル、レンタル6体と4コマンドのブラウザ画面は既存。**Google公式はHTML/CSS/JSを「Embed code」に直接貼る方式をサポート**。現研究版はlocalhost専用Firebase Emulator、相対CSS・ES module import依存で、そのままコード欄に貼る完成版ではない | **24A:** 相対CSS/JSを単一HTMLに束ね、テスト用エミュレーター接続と本番の設定/データを分離するビルドを実装。**24B:** 古い学校iPad Safariで指操作・2端末通信、Google Sitesへ**コード直接貼り付け**、公開操作は本人 | **準備条件を確認／直接埋め込みHTML未完成・実機未検証** |

## 3. 今回した作業（Phase23-C／2026-10-25）
**全体設計のどこ:** 原作忠実再現研究（Phase21/22、未確定msは通常OFF）→ 正規対戦ホスト`engine/match-protocol.mjs` → **Phase23-C Firebase通信・権威判定ACK復旧の実ブラウザ受入** → Phase24旧世代iPad Safari/Google Sitesへ自己完結HTMLを直接コード埋込。

**改善点と目的:** Phase23-BまでのNode注入検証では、ゲスト操作をホストが1回適用したが`publishSnapshot`だけ失敗すると、ゲストが同番号を再送しても重複入力として無視され、ホストが権威snapshotを再publishするまではACKが来ないことが確定。今回はその**見た目・再送ボタン・前衛ID・両席の画面・復旧時のrevision**を、Firebase Auth/RTDBローカルエミュレーター＋実Chromeのホスト/ゲスト2iframeで検証した。

**実装と検証:** `lab/firebase-match-stage.html?phase23c=1`限定で、研究用ホストルームアダプタの**次のsnapshot publishだけを1回失敗させる故障注入**を追加（localhost限定、通常のゲームや実Firebaseへの注入は不可）。`onSnapshot`/`onError`でホストの`dirty`と再配信ボタンの状態を更新。`tools/firebase-charge-smoke.mjs`の既存「ゲスト6タップ完了→Soul両画面消費→Firebase SDK goOffline→goOnline→復帰ACK」に続けて、**ゲスト画面からサークル右回転→ホストは1回だけ回転/revision進行→ゲストは前衛3体・revisionを変更しない→ゲスト同じ番号で再送しても二重回転なし/ACKなし→ホスト画面の未反映戦況再送ボタン→ゲストへACK反映/ホスト・ゲスト前衛3体一致/revisionは1つだけ進む**まで実DOMで必須チェック。

**結果:** [**Firebaseローカル2席Chrome/Auth/RTDB・33権限＋実指操作＋Phase23C故障回復 PASS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40165732704)。[**Node469/469＋研究Chromium PASS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40165732709)。[**Chromeの本家風ステージ指操作 PASS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40165732668)。検証は**同じChrome内の独立iframe2席とローカルAuth/RTDB**。サーバー全体の障害、別端末間の実遅延、本番クラウド、学校の旧iPad SafariとGoogle Sites貼り付けは未試験。故障注入はFirebaseクラウドではなく**ホストのローカル研究アダプタ境界**で行った。

**今回の資料:** [Phase23-C 研究専用の実Chrome二席・故障注入ACK復旧の詳細QA](./PHASE23C_REAL_BROWSER_HOST_PUBLISH_REPAIR_20261025.md)。

**Phase24準備として確認した公式仕様:** [Google Sitesヘルプ](https://support.google.com/sites/answer/90569?hl=en)はHTML/CSS/JSの**コードを埋め込む**方式に対応し、JSは`<script>`、CSSは`<style>`で囲む。GitHub PagesのURLを貼る方式とは異なる。現在の`lab/firebase-match-stage.html`は**localhost Firebase Emulator・相対CSS・ES module import**を用いており、そのまま直接貼り付け可能な公開用HTMLではない。Phase24-Aで単一HTMLバンドル/安全なオンライン設定注入/旧Safari互換の検証が必要で、Google Sitesへ公開したとは主張しない。

**変更先と君の作業:** GitHub開発ブランチ`feat/phase1-action-circle-lab-20261023`の研究UI・Chrome QA・docsのみ。main、Googleサイトの既存公開版、本番Firebase・料金・閃光魂初期OFFの方針は変更なし。現時点で君の操作不要。

## 4. 次にする作業（Phase24-A → 24B、Phase22D/21D残）
1. **24A:** 相対CSSと戦闘UI/ホスト/通信モジュールを単一HTMLへバンドルするビルド・Chrome検証、Firebase SDK依存/設定を研究環境と将来の本番から分離。**Google Sitesコード欄への直接貼り付け**で動く形式を目指す。外部実クラウドを勝手に設定しない。
2. **24B:** 旧iPad Safariの本物の2端末でGoogle Sites埋め込みコードが動くか、ルーム接続・上下画面/タッチ・発熱/ラグ/再接続を確認してから本人が公開。
3. **22D:** 2015年のノーモーション/カウンター映像の同期フレームを取得できた場合だけ具体時刻を原作照合。研究用仮800/500msを無根拠に正規ゲームへ入れない。
4. **21D:** 零式つつくの妖気吸収量・受取先・攻撃/妖術Soul回復は未確認のため仮数値を正規対戦に追加しない。閃光魂初期OFF。

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
