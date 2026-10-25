# 妖怪対戦ブラウザゲーム｜設計全体図・現在地・次の一手（単一の進捗入口）

更新: 2026-10-25 JST
Repository: https://github.com/8mahi8/yokai-battle-lab
Development branch: `feat/phase1-action-circle-lab-20261023`
**現在（2026-10-25）:** Phase20/21の根拠ある原作ルールとPhase22B/Cの4種必殺/ゲストACKは正規2席ホストへ実装。Phase23A/B/CのFirebaseローカル2Chromeで旧タップ破棄/ホストdirty再publish/同一seq ACK復旧/故障注入の受入を完了。**Phase24-AはGoogle Sites直接貼付のオフライン1台2席単一HTMLを作成しChrome iframe.srcdocで合格。今回のPhase24-Bでは`createFirebaseRoomClient`/`createFirebaseMatchHost/Guest`の既存オンライン1vs1を同じ直接貼付コード形式へ統合し、Firebase Emulatorローカル2Chrome iframeで匿名Auth→6桁部屋→両画面/ゲスト回転ACK/3秒拒否/行動同期/断線復帰を検証。**オンラインのビルドは厳格に設定無し（通信しない170713バイト）、localhost限定エミュレーターQA（171529バイト）、将来の明示許可が必要なクラウド設定の3モードを分離。**[Phase24B最終のクラウド設定拒否/実Chrome2席Firebase Emulator全経路 #40174083143成功](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40174083143)、Node469/469・本家風Chromeも成功。** 本番Firebase実設定/RTDBルール配備、Google Sites実編集、学校旧iPad Safari別端末、原作未解明21D/22Dは未実施。次は24C許可された実クラウド構成と学校Safari実機ゲート。
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
| 24 | 学校iPad・Google Sites直接埋込配布 | **24A:** 正規ゲームのオフライン1台2席をCSS+JS合計152476バイトの1HTMLにバンドル、Chrome iframe/srcdoc QA成功。**24B:** Firebase Host/Guest/Roomと本家風UIのオンライン1vs1を単一HTMLにバンドル。**安全3モード**: 未設定版は接続禁止170713バイト、ローカルエミュレーター限定QA版171529バイト、明示承認がないと生成できない公開Web config版。localhost実Firebase Emulator＋本物のChromeの2つのコード埋込iframeでAuth匿名2席/部屋/権威ACK/3秒回転拒否/ホスト自動ステップ/断線復帰PASS。外部Firebase 10.8.0 compat CDN3本を設定済み版のみ使用 | **24C:** 独立Firebase実クラウドの許可/Auth匿名・専用RTDBルール、実Google Sites編集画面でのコード保存・外部SDK読み込みと埋込原点、学校旧iPad Safari2実機・操作遅延/回線断。原作21D/22D照合は別件 | **HTMLオンライン1vs1コード形式＋ローカル2Chrome同期検証PASS／実クラウド/Google Sites/Safari実機は未検証** |

## 3. 今回した作業（Phase24-B／2026-10-25）

**全体設計のどこ:** 原作ルール研究と正規2席`match-protocol` (Phase20〜22) → 安定化済みFirebase Room/Guest/Host ACK (Phase23) → **Google Sites「コードを埋め込む」に貼る、JS/CSS+通信/対戦UIの単一HTML生成 (Phase24-B)** → 本物の学校旧iPad Safari/実Google Sites/独立クラウドへの接続テスト (Phase24-C)。

**今回実装:** `lab/sites-embed-online-entry.mjs`にFirebase匿名Auth2席、6桁部屋作成／参加／試合開始、正規戦闘エンジン、実2席サークル/4操作、権威側のゲストACK、3秒回転拒否、Firebaseプレゼンス/断線復帰/待機タップ破棄/ホストdirty再送を**既存モジュールを直接再利用**して統合。 `tools/build-sites-online.mjs`はesbuild Safari13ターゲットのIIFE形式でCSS+ESMを単一HTMLへ束ねる。実クラウド接続先は**含めていない**。Google SitesへのURL埋め込みでなく、`<style>`+HTML+`<script>`という直貼り形式。

**3種類を明確に分離:** (A) `node tools/build-sites-online.mjs`は未設定の約170713バイト**安全な接続停止状態**、GitHub Actions artifactとしてダウンロード可能。(B) `--emulator`はlocalhost/127.0.0.1専用でFirebase Auth/RTDBエミュレーターとだけ接続し、**ダウンロード配布用artifactに含めない**。(C) 将来の承認済みクラウドは`YW_CLOUD_BUILD_APPROVED=1 node tools/build-sites-online.mjs --config <public-config.json>`で検証済みFirebase Web公開設定から生成できるが、本人の権限/設定/Rules/実費をAIが勝手に変更しない。**本ターンではクラウド構成を一度も読み込んでいない**。両設定済みモードはFirebase 10.8.0 compat CDN 3本をロード、未設定版は外部SDKを呼ばない。

**本物の2ブラウザ試験:** `tools/sites-online-smoke.mjs`と`.github/workflows/phase24-sites-online.yml`を追加。**生成済みの単一HTML文字列をChromeの`iframe.srcdoc`へ2つ読み込み、Firebase Auth+RTDBエミュレーターで本物の2つの匿名UIDを作り**、ルーム作成→相手6桁コード参加→試合開始→実画面12体/4コマンド→ゲスト前衛回転/ホストACK→3秒ルール拒否→自動行動同期→切断時ホスト進行停止→同じ試合で復帰を必須テスト。未設定版が**外部SDKなし・部屋作成ボタンdisabled・明示的な接続設定待ち**となるChrome試験も合格。

**結果:** [**Phase24B Online Google Sites HTMLビルド＋Chrome2席/Firebase実エミュレーターQA 成功 #40173549741**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40173549741)（セットアップ版170713バイト／QA専用エミュレーター版171529バイト）。[**既存469/469 Node**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40173549689)と[**本家風Chrome操作**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40173549698)も成功。**Chrome上のsrcdoc＋ローカルエミュレーター合格は、実Google Sitesへ貼って保存できること／Safari iPadでオンライン参加できることを意味しない**。

**詳細:** [Phase24-B 2席オンラインの単一HTML化、設定の明確な拒否、2ChromeエミュレーターQA](./PHASE24B_ONLINE_SITES_BUILD_EMULATOR_QA_20261025.md)。

**最終の安全検証追記:** 関連ソースの修正後、追加した`tools/sites-online-build-gate.mjs`で「クラウド用HTMLは承認フラグ無しでは生成不可」「虚構のWeb設定でのみ生成試験」「設定されたFirebase認証ドメインとRTDB URLが合わなければ拒否」を確認。ビルド時定数で**エミュレーターの接続先コードをクラウド版から完全削除**。ビルド/Chromium/Firebase Emulator2席が[最終run #40174083143](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40174083143)で全成功。最終のNodeは[469/469](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40174083179)、[本家風画面Chrome](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40174083120)も成功。クラウド接続や実Google Sites公開は未実施。

**既存仕様保護:** 元3DSのノーモーション必殺/カウンター対象・零式つつく妖気量はまだ未確認。推測値をゲームへ追加しない。初期閃光魂OFF。オンライン版の`研究用：次の行動`はホスト側手動ステップであり、完成した実時間自動ループとはまだ異なる。

**変更先・君の操作:** GitHub開発ブランチのみ。`main`、学校の現在のGoogleサイト版、実クラウドFirebase/認証/RTDBルール、課金、他人への公開は未変更。実機試験ゲートまでは君の操作不要。

## 4. 次にする作業（Phase24-C + 22D/21D残）

1. **24C実クラウド設定:** 独立の本人承認済みFirebaseプロジェクトで匿名Authと`yokaiRoomsV1`に限るRTDB Rulesをレビュー/導入して初めてクラウド用HTMLを組み立てる。Google Sites由来のiframe origin/認証の動作を本当の学校iPadで確認する。利用許可が未取得なら構成を勝手に作らない。
2. **24C学校Safari:** 実Google SitesのEmbed Codeへ171KBのオンラインHTMLが貼れるか、外部SDK3本/上下の戦場/指操作/回転/相手側描画/再接続/旧iPadメモリ/フレーム負荷/6桁部屋2端末を試す。**公開は本人が操作**する。
3. **正規戦闘の自動進行:** ホストの手動研究ステップが、ユーザーが期待する自動のリアルタイム対人戦に適切かとAction Clockを今後検証。ブラウザ・画面互換のチェック合格だけでゲーム全体を完成扱いしない。
4. **21D/22D原作未確定:** ノーモーションとカウンター対象の3DS正確フレーム、つつく妖気受取量・先は元映像で未検証。推測で追加しない。

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
