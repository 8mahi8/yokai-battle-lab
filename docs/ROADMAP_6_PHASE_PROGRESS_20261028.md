# 妖怪ウォッチ2対人再現｜6段階ロードマップ進捗の単一入口
最終更新：2026-10-30。**各開発作業の終わりに更新**。新しい担当AIはこの文書・最新引継ぎ・V2全体設計の順に確認する。
**本プロジェクトはオリジナルキャラ6体で、原作の対人戦術と体験を可能な限り忠実に再現する**。**2026-10-28 本人が最終目標を再確認：「送った原作対戦動画のように『妖怪ウォッチ2』を実際に遊べること」**。操作・ルール・戦闘中の見え方・進行テンポ・画面遷移を一体のゲーム体験として優先する。キャラの大量追加や独自改善は後回し。元動画に含まれる実況編集字幕や通知はゲーム原作のUIと取り違えない。

## 最上位の完成定義（本人の原作対戦動画をゲームとして再現する）
- **見るだけのデモでも計算式だけが似ている戦闘でもなく、プレイヤーが動画と同様の判断を実際に行える1vs1**にする。上画面の3vs3自動戦闘を見ながら、下画面の6体サークル回転・ターゲット選択・必殺チャージ・おはらい・零式/G/つつくを原作と同様の因果関係で操作できること。
- **動画にある1場面を受け入れ試験にする**。原作映像の「操作前→操作→技の準備→カットイン/命中または状態効果→画面復帰」を、実装の同一種の行動を操作した画面と並べて比較し、差を具体的な未完項目として記録する。多段と複数対象を区別し、スキル/ガード/とりつき/KO・回復/妖気の意味と順序も一致させる。
- **対人の読み合いを結果として再現する**。行動順・サークル待ち・時間的制約・相手画面の表示保留が十分に再現され、その結果として既知の対戦テクニックが原作と同じ理由で自然に発生すること。ノーモーション専用の独自ボタンや効果は追加しない。
- **友達と完成した試合を通せること**。学校iPad Safari上のGoogle Sites直接貼りHTML + Firebase Friendsのホスト/ゲスト2台で、開始→各操作→戦闘と表示同期→6体KO→勝敗まで違和感なく実試遊できること。Chrome・Node・エミュレーターのテストだけでは完成と呼ばない。
- **再現の根拠と留保**：原作動画の「実フレーム観察」、公式/解析資料、対戦者経験、試遊fixtureを区別。映像から内部乱数・ダメージ式・相手の画面・全ヒット数を断定しない。本人提供動画の全編実ファイルに未アクセスのときは既存観察記録までを根拠とする。動画の編集字幕と原作UIを区別し、元動画や画像を公開GitHubへ転載しない。
- **2026-10-29 の本人の再指示が優先**：1技/1動画場面ずつ専用実装する方式を中断し、**ゲームエンジンV3の統一設計→単一の行動・技・スキル・状態・時間・表示規約→全キャラのデータ駆動移行→試合全体で原作再現**の順序に変更。動画の局面は機能別の追加順ではなくエンジン完成後の統合受け入れ試験に再利用。6段階の詳細履歴は保存するが、作業の優先順位はV3-0〜V3-5を最優先。



## 毎回の報告ルール（本人からの確定依頼）
**必ず次の3つをユーザーに報告する。**
1. **今回した作業**：何を確認/実装/テストしたか。証拠（GitHubコミット、Actions、原作動画の時刻等）と、未検証点を区別。
2. **次する作業**：次の具体的な1工程、その理由と完了判定。
3. **ロードマップの現在地**：Phase 1～6のどこ、どのサブステップ、何が未完か。「作業進捗」と「原作再現度」を混同しない。
本番Google Sites稼働HTML、GitHub main、Firebase本番Rules/DB、旧Drive配布は本人の明示依頼まで更新しない。

## 2026-10-30 V3-3-4｜ホスト公開遅延とACK・相手画面の通信因果

- [実装検証・Firebase公式資料・正式ログ・留保](./ENGINE_V3_3_PUBLISH_LAG_ACK_UI_QA_20261030.md)。新規`tests/firebase-match.test.mjs`2件：ホストのpublish保留中に24自動行動しても**guest revision/ACK/stageは古い正規snapshotのまま**、入力2はACKまでFIFO待ち。publish再開後ACK [1,2]、revision26、ホスト/ゲスト一致・ログ再生一致、24回のIntermediate publishを抑制。1回のpublish失敗後の正規状態再送も確認。
- `tests/firebase-friends-noauth-emulator.cjs`に、新規部屋を使う**本物のRTDB Emulator2席**の遅延公開E2E追加。テスト用Promiseでホスト公開直前だけ一時保留し、8回のホスト行動中ゲストのrevision/旧画面/未ACKを確認。ゲート解放後に2ACK・revision10・一貫した最新画面へ追いつくことを確認。`FIREBASE-FRIENDS-PUBLISH-LAG-PASS`をログに残す。**ゲームロジック・通信ロジック・本番Firebase Rules変更なし。**
- **検証済みコードSHA `71e0095ac8d5f78c82941ff418d28b086a43fb87`、[Research Node+Chromium CI #40910421158](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40910421158)全工程SUCCESS：Node 789/789 PASS・6vs6自然耐久・Chromium操作成功**。[Firebase Friends Emulator+Chrome CI #40910420953](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40910420953)全工程SUCCESS：新publish-lag E2E、reconnect、24行動、2iframe、Sites HTML build全てPASS。既存本番Firebase匿名GET1回HTTP200のみ、書込0。
- **現在地：V3-3-4通信因果QA完了。V3-3全体・ゲーム完成ではない。** 次は原作を踏まえた時間・表示・正規効果の発火順序の引き渡し規約を詰め、V3-4のデータID化に入る。学校Safari実機2台・Google Sites実埋込・原作動画直接比較・ホストタブ再起動後の同一試合復元は未検証/未実装。main・学校公開HTML・本番Firebase Rules/DB/Auth・Drive無変更。

## 2026-10-30 V3-3-3｜Firebaseの再送エラー・正規ACKと実RTDB再接続

- [根本原因・原作/公式資料・コード変更・正式QA](./ENGINE_V3_3_FIREBASE_RECONNECT_ACK_GUARD_20261030.md)。`network/firebase-match.mjs`のゲスト通信において、古いsendのPromiseが新しい明示再送の後から失敗しても古いエラーをUIに出さず、受信スナップショットのパケットrevisionと本体revision一致・guest seq妥当性が揃わなければACKしないよう修正した。既存のstop-and-waitと元の番号での再送、disconnect中のunsent queue破棄は維持。
- `tests/firebase-match.test.mjs`に2件追加、`tests/firebase-friends-noauth-emulator.cjs`に**実RTDB EmulatorのゲストgoOffline→ホスト3行動→goOnline→正規snapshot catch-up・重複ACKなし→新seq入力成功**の自動検証を追加した。**同じseq+intentの再送でrevision増加しない**ことも実機構で確認。
- **コードSHA `5f69ab28c84b02315e59b15c814b4d702908884b`の[研究CI #40907604375](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40907604375)全工程SUCCESS：Node 787/787 PASS、自然6vs6耐久・Chromium操作PASS**。[Firebase Friends QA #40907604381](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40907604381)も**全工程SUCCESS**。新`FIREBASE-FRIENDS-RECONNECT-ACK-PASS`、2席24行動/ACK/snapshot一致、実Chromium 2iframe、Sites単体HTMLビルド成功。本番FirebaseにGET1回のみ（200）、writeなし。
- 現在は**V3-3-3完了、V3-3全体は未完**。**完全なブラウザ再起動後の対戦復元は未実装**、学校Safari実機2台・Google Sites実埋込・原作動画直接比較も未検証。次はsnapshot publish遅延/再送/ACKと画面状態の因果関係を2席実通信で検証し、V3-4に移るための統合契約を仕上げる。main・学校公開版・本番Firebase DB/Rules/Auth・Drive変更なし。

## 2026-10-30 V3-3-2｜12シードの試合因果統合QA

- [技術・原作根拠・実行ログ](./ENGINE_V3_3_CAUSAL_INTEGRATION_QA_20261030.md)。新規`tests/v3-time-causality-integration.test.mjs`5件。Seed6種類×Damageモデルon/off=**12通り**で、モーション中と即時表示を同じ命令列で進めても正規`snapshot`全体（表示フィールド以外）、HP、Soul、KO、行動順、Inspirit、イベントが一致。正規イベント数と表示sequence/アニメーションmsを混同せず、V3-1既存観測APIとV3-3読み取り値の整合性も検査。
- Counter必殺は確定された仮の命中時刻に到達してから一回だけEffect+Counter-hit確定、同時刻の回転入力より先に命中、0msで再処理しても二重発火しないことを検査。3回以上の回転+我慢2消費は原作未検証のため**未確定イベントとしてHP変更せず**。原作内部の厳密なタイミングを新しく発明した訳ではない。
- **コードSHA `9f98e4f6a499cbab01b03f60ad3f8ca6bc293db4`に対する[研究CI 40905841527](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40905841527)正式成功**：Node **785/785 PASS**、自然6vs6耐久・実Chromium操作PASS。[Firebase no-Auth QA 40905841822](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40905841822)も**全工程SUCCESS**：Google Sites単体HTML build、RTDB Emulator 2席/ACK/24ホスト行動とcanonical状態一致、Chromium実2iframe、旧期限ルールを独立Emulatorで再現。本番Firebaseは予約済み非ルームキーへのGET1回のみ（200）、書込なし。
- **現在地：V3-3-2（統合因果の回帰ゲート）まで完了、V3-3全体は未完**。次は2席オンラインのコマンド受理→ACK→正規状態更新→相手表示の順序を、遅延・再送・一時切断を含むプロトコルで検証。学校Safari実機2台/Google Sites実埋め込み/原作元動画の時間比較は未検証。main・本番Firebase DB/Rules/Auth・公開サイト・Drive無変更。

## 2026-10-30 V3-3-1｜3つの時間領域を読み取りAPIへ分離

- [実装と根拠・QA](./ENGINE_V3_3_TIME_DOMAIN_OBSERVER_20261030.md)。V3-2の効果・KO・状態Commitを保持したまま`engine/time-domain-contract.mjs`の読取専用`readBattleTimeDomains`と、`battle.timeDomains()`を追加。表示無効の通常ゲームにも対応し、`logical(action-points)`/`canonical(host-event-ordinal)`/`display(research-animation-ms)`を明示的に分ける。生の状態参照や乱数消費は無し。原作秒数の換算・旧Snapshot変更は無し。
- 新規`tests/v3-time-domain-contract.test.mjs`5件。論理アクション・hostイベント・モーション表示の単位を区別し、モーションで遅れるのは表示だけで戦闘状態・HP・Soul・KO・行動・イベント順が変わらないこと、ノーモーションチャージの見かけは二重Commitにならないことを検査。
- **コードSHA `94852603112dcffdf7411367362a44b60a1998e9`の[GitHub Actions research CI 40903151441](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40903151441)成功：Node 780/780 PASS・自然6vs6決着4件・Chromium操作PASS**。同SHAの[Firebase Friends run 40903151393](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40903151393)も**全工程SUCCESS**：2クライアントRTDB Emulator・24ホスト行動/ACK/snapshot、実Chromium2iframe、Google Sites単体HTML build（75モジュール）、4埋込幅、旧期限Rules別Emulator確認までPASS。本番FirebaseはGET一回のみ200（書込なし）。学校Safari実機2台/原作対戦動画の直接比較はまだ未達。
- 現在は**V3-3-1の開始**。次は論理行動・正規Commit・相手可視化の順序契約を統合受入テストに拡張。V3-3全体は未完成、V3-4キャラ/技定義・V3-5学校実機完了ではない。main・学校公開HTML・本番Firebase Rules/DB・Google Drive無変更。

## 2026-10-30 V3-2継続｜KO原因別ポリシーを共通化／正式CI合格

- [KO/スキル発火順の監査・原作根拠・最新QA結果](./ENGINE_V3_2_KO_CAUSE_POLICY_20261030.md)。`KO_CAUSE_POLICY`を不変の共通定義に追加、`commitForCause`で原因`ordinary`・`special`・`poke`を明示する。通常攻撃は同期→KOスキル→ピン更新、必殺技はKOスキル→同期、Pokeは同期→ピン更新で撃破者を加算しない。**既存研究ホストの優先順を維持したもので、原作フレーム順を新たに断定したものではない**。
- `hit-aftermath.mjs`と`combat.mjs`を原因別APIへ切替。効果数値・乱数・Soul・時計・表示・KOカウントを維持。新規Nodeテスト4件と既存HitAftermathテストを調整、旧commitとのcall順の差分も検証。
- **コードSHA `6dd708ca2698452b01e342ac470b7533a7ac61f4`の正式CI合格**：[Research QA run 40899693694](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40899693694) **Node 775/775件合格、自然6vs6耐久・Chromium操作PASS**。[Firebase Friends QA run 40899693718](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40899693718) **認証なしRTDB Emulator・Chrome実2iframe・Google Sites HTML build・24ホスト行動/ACK PASS**。学校Safari実機2台と原作のKO発火/表示の厳密なタイミングは未検証。
- [次工程のV3-3時間・因果境界設計入口](./ENGINE_V3_3_TIME_CAUSAL_BOUNDARY_PLAN_20261030.md)：論理行動wait、正規効果Commit、入力時刻、相手画面公開時刻を分離したまま検証。**V3-2後半・未完成**。main・本番Firebase DB/Rules/Auth・学校公開版・Drive無変更。

## 2026-10-29 V3-2継続｜Firebase Friends PR統合QA正式合格

- [本番変更なしのFirebase Emulator・HTML build・2iframe結果](./ENGINE_V3_2_FIREBASE_PR_QA_RECOVERY_20261029.md)。既存の`phase37-firebase-friends.yml`にread-only PR triggerを追加し、**コードSHA `e9f75f6ba2afcd09c3c5a8155d43597c388bba83`の[GitHub Actions run 40897292624](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40897292624)全step SUCCESS**。
- ログで`SITES-ONLINE-BUILD-PASS`（学校Firebase Friends用単体HTMLとエミュ版）、`FIREBASE-FRIENDS-COMBAT-REGRESSION-PASS`（24ホスト行動/ACK/state一致）、`FIREBASE-FRIENDS-NOAUTH-PASS`（ルーム/2席/権限Rules）、`SITES-FIREBASE-FRIENDS-EMULATOR-PASS`（Chromium実2iframe、ホストclock停止/復帰、四埋込幅）を確認。旧2026-11-08期限Rulesは**別Emulator上**で確認し現在時点のSmoke PASS。
- 本番Firebaseへの**非ルームキーへのGET1回**はHTTP 200（`readOnly:true`、Body未検査・Write未検査）。**本番DB/Rules/Auth変更0、学校サイト・Drive公開変更0**。同SHAの研究Node/自然耐久/Chromium CI [40897292655](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40897292655) SUCCESS。
- **学校Safari iPad2台での本当のGoogle Sites対戦と原作動画の時間/操作再現が未検証**。V3-2後半・未完成。次はV3-2残り効果責務の監査とV3-3（時間/表示/行動）への引渡し、V3-4 IDカタログ化、V3-5学校実機。

## 2026-10-29 V3-2継続｜正式PR CI復旧・771全件PASS

- [正式Actions根拠・落ちた2件の原因・未検証範囲](./ENGINE_V3_2_FORMAL_PR_CI_RECOVERY_20261029.md)。既存`research-unit.yml`に読み取り専用PR起動を追加（push/手動は維持）。以前のGitHub連携がPR run限定のためpush CI一覧を取得できていなかった原因を解消。
- 初回正式run [40896591460](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40896591460) 771中769 PASS、2件はPokeイベント`eventId:1`のテスト期待値漏れ。`tests/poke-soul-transfer-v3.test.mjs`だけ修正。ゲームエンジン・Poke報酬・原作仮値の変更なし。
- **コードSHA `6cc44050ba92ea39c19a807d6aba929559d88193`の[正式Actions run 40896818659](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40896818659)全工程SUCCESS**：Node **771/771 PASS**、6vs6自然決着4 seed PASS、Chromium実DOM・零式Poke・妖気・おはらい・ホスト/ゲストコマンド・ダメージ・UI PASS。Node単体だけでなく正式ブラウザ検証まで記録できた。
- ただし**最新コードに対するFirebase Friends no-Auth RTDB二席Emulator/E2EとGoogle Sites HTML build、学校Safari実機2台はこのrunでは未検証**。V3-2後半・未完成、V3-3/4/5へ完了と誤認しない。次はFirebase/HTML検証と発火順序棚卸し。main・本番Firebase・学校公開HTML・Driveは無変更。

## 2026-10-29 V3-2継続｜旧新必殺Effectの96ケース差分検証

- [差分オラクル・検証証拠・非対象](./ENGINE_V3_2_RESEARCH_SPECIAL_DIFFERENTIAL_20261029.md)。`tests/research-special-differential-v3.test.mjs`に研究用必殺8種類×3初期HP状態×4seed=96例の旧新HP/状態台帳/効果イベント/抵抗乱数消費/勝敗の差分テストを追加。
- GitHub実ソースを使ったV8テスト本文実行で**96/96一致、攻撃KOの追加状態抑制 PASS**。新旧の戦闘Host全体、HitAftermath、Skill/KO優先、RTDB通信を比較できたわけではない。**現在HEADの正式Node test・Chromium・Firebase Friends・Google Sites HTMLビルド・学校Safari実機2台は未確認**。
- `combat.mjs`の現行HP更新責務をキーワード監査し、直接の`target.hp=`型を確認できず、HPはEffectCommit経由に集まっている。残る状態purifyとKO/行動/表示時刻の順序は、原作証拠と正式統合QAの結果を見て着手。**V3-2後半・未完成**。main/公開サイト/本番Firebase/Driveは無変更。

## 2026-10-29 V3-2継続｜研究用必殺の全impact事前検証

- [実装とQAの証拠・未確認範囲](./ENGINE_V3_2_RESEARCH_SPECIAL_PREFLIGHT_20261029.md)：`special-impact-commit.mjs`に`assertResearchSpecialImpact`を追加し、研究用・カスタム必殺の全効果をHP/Status確定前に検証。標準6体の`assertPlannedSpecialImpact`と同じ先行検証段階へ揃えた。原作未知の威力・命中/抵抗乱数・ターン/KO順は変更しない。
- 旧研究用`defense-down`必殺の回帰テストに必要だった`researchStatInspirits:true`と前提の`researchDamageModel:true`を追加。Nodeテスト4件を新設。GitHub実コードを用いたV8局所検証は合法7/不正8の15条件と、実研究Planの全8カテゴリ18impactがPASS。**最新HEADの正式Node全件、Chromium、Firebase Friends 2iframe、HTML build、学校Safari実機は未確認**。同seed旧新全snapshot/event比較も未実施。
- 現在地：**V3-2後半・未完**。次は正式CIを確認してから旧新完全比較・残る戦闘処理の棚卸し。V3-3時間/妖気/視認性→V3-4データ駆動→V3-5学校Safari2台。main、学校公開HTML、本番Firebase、Driveは無変更。

## 2026-10-29 V3-2継続｜研究用必殺状態異常を共通Commitへ

- [根拠・実コード・検証限界](./ENGINE_V3_2_RESEARCH_SPECIAL_STATUS_COMMIT_20261029.md)。`commitResearchSpecialStatus`で、既存`combat.mjs`のカスタム/原作形状研究用必殺のbuff/debuffおよびdamage-status直付与を同一Effect/Status確定境界に移す。組込6体の`commitPlannedSpecialStatus`、原作未確定のresist・KO・割り込み・時間優先は変更しない。
- GitHub実ソースを用いたV8で12条件の直接検査PASS、実プランが生成する状態付与7ケースのCommitペイロード一致PASS、関連2モジュール/新規Nodeテストの構文PASS。Nodeテスト3件を追加したが**正式Node全件・Chromium・Firebase Friends・単体HTML buildは現HEADで未確認**、学校Safari2台未実機試験。
- **V3-2後半・未完成**。次は正式CI/旧新同seed完全snapshot・event・Soul・KO比較、残るEffect所有と状態優先の棚卸し。V3-3行動/表示時間→V3-4データID汎用化→V3-5オンライン試合/実機の順。main・学校サイト・本番Firebase Rules/DB・Driveは変更しない。

## 2026-10-29 V3-2継続｜研究用必殺HP確定を共通Commitへ

- [研究用必殺の変更・原作根拠・未検証範囲](./ENGINE_V3_2_RESEARCH_SPECIAL_HP_COMMIT_20261029.md)。
- `commitResearchSpecialHp`新設：catalogなしの研究/参照必殺にもEffectCommitterへ送る一本化境界を用意。旧`combat.mjs`の`else target.hp=impact.hpAfter`は、既存Planで到達しない危険な直接代入なので削除し、未知kindはfail-closed。既存の判定順・seed消費・技数値・通信は変更しない。
- 実GitHubソースを使ったV8局所テスト36条件と、既存`planResearchSpecial`のHP impact14ケースの旧新比較がPASS。新規Nodeテスト4件を追加。ただし**今回HEADのNode全件・Chromium・Firebase Friends・HTML buildの正式CI結果は未取得**、学校Safari2台も未試験。
- **現在：V3-2後半、完了宣言しない。** 次は正式CIと全snapshot/event/KO/Soul比較、その後残る効果責務棚卸し。V3-3〜V3-5に進んだ証明ではない。main/公開サイト/本番Firebase/Drive無変更。

## 2026-10-29 V3-2継続｜Poke妖気移動の共通Commit

- [原作根拠・変更コード・未確認範囲](./ENGINE_V3_2_POKE_SOUL_TRANSFER_20261029.md)。
- `createSoulSystem.transferSoul`で敵→味方の妖気移動を事前検証・上限/残量制約付きの**単一atomic commit**へ統合。playtest / researchの重複したset/add分岐を撤去。従来の仮の35移動、最初の生存前衛、抽選・イベント形を変更せず、原作の受取先・確率・実数値は未確認のまま。
- 新規`tests/poke-soul-transfer-v3.test.mjs`で境界、失敗時無変更、両Poke経路の結果とイベント、HP・999側非変更を監視。実GitHub上のソースを用いた純粋Soul API 10条件の実行確認はPASS。**最新HEADのNode全件／Chromium／Firebase RTDB／Google Sites build／学校Safari2台の新規PASSはまだ未確認。**
- **位置：V3-2後半進行中**。次は本変更のCI監査→非catalog研究用Special残HP直書きの安全な共通化→V3-3行動/表示時間、V3-4データ追加、V3-5試合/実機。公開main、学校Google Sites、本番Firebase、Driveに変更なし。

## 2026-10-29 V3-2継続｜Hit/KO/割り込み・DoT・妖気の効果境界を統合

- [実装/原作根拠/不確かな点/受入状況](./ENGINE_V3_2_HIT_TURN_SOUL_LIFECYCLE_20261029.md)
- `hit-aftermath.mjs`：通常攻撃の割り込み後KO、必殺1対象の割り込み後KO、研究多段の各ヒット割り込みと対象終了時KOを、**同じ権威ホストの処理境界**へ移す。対象・RNG・スキル/KO判定の優先順は旧仕様維持。
- `owner-turn-effect-lifecycle.mjs`+`effect-commit.mjs`：所有者行動時の継続HP効果と全体/所有者ターン期限を共有。直接攻撃と異なるDoTのサバイバル処理は原作未証明であるため勝手に変えない。
- `action-soul-accrual.mjs`：プレイテスト妖気増加/研究全員増加/非攻撃時回復を共有し、不正同時指定は開始前に拒否。オリジナルの正確な妖気増加量は未証明。
- [正式Node **753/753 PASS＋自然対戦耐久／ブラウザSmoke PASS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40876209404)、[Chromium Stage PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40876209175)、同一ゲームコードの[Google Sites HTML build PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40876180124)。新規テストで8条件の通常Hit時同一snapshot、9条件のSoul mode同一snapshot、研究DoTのphase同期、KO前後順をカバー。
- **位置：V3-2進行中**。原作未確定の優先順位と多段・Poke/Soul移動を次工程で詰める。V3-3時間軸/行動/視認性→V3-4キャラ/技データのみで追加→V3-5オンライン学校2台。main/学校サイト/本番Firebase/Drive無変更。

## 2026-10-29 V3-2継続｜必殺のHP・状態異常を共通型Planから実確定

- [変更・検証・原作情報の区別](./ENGINE_V3_2_SPECIAL_IMPACT_COMMIT_20261029.md)。
- `engine/special-impact-commit.mjs` を追加し、**6種類の既存必殺に対して全impactの型・対象ID・敵味方・HP量・状態名・連動効果を試合状態変更前に検証**。
- 旧`EffectCommitter`でHPを実確定し、旧`applyInspirit`でStatusを実確定する共通アダプタを`combat.mjs`に接続。処理対象の判定、KO/Interrupt/Soulと耐性RNGの順序は変更しない。未知Hitを勝手に1Hitに固定しない。
- 新規`tests/special-impact-commit-v3.test.mjs`は全6必殺の正しいCommit、誤った対象/不正Status/二重回復/KO時付与拒否を監視。既存の新旧6必殺完全snapshot/event比較も維持。**[Node 737/737 PASS・耐久/ブラウザ Smoke](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40872738857)**、[Chromium Stage PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40872738876)、同一ゲームコードの[Firebase Friends RTDB noAuth/2 iframe PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40872702123)、[Google Sites単体HTML PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40872702284)。
- **現在地：V3-2 続行**。数値/発火順を原作と照合した完全エンジンではない。次はDoT/継続回復/Soul/Interrupt/KOの統合根拠整理、その後V3-3行動/妖気/相手表示、V3-4データだけのキャラ追加、V3-5オンライン実機。公開main・学校サイト・本番RTDB・Driveは未変更。

## 2026-10-29 V3-2継続｜必殺6技の複合Effect Planと全6キャラ新旧完全比較

- [実装・原作資料・テスト・残件の詳細](./ENGINE_V3_2_COMPOSITE_SOULTIMATE_PLAN_20261029.md)。
- `engine/soultimate-effect-plan.mjs`を新設。既存技マスターから6必殺を、damage、drain→heal、buff、damage→生存時status、revive＋healのatomic複合、debuffに分類。`hitPattern:unknown`は`originalHitCount:null`で保存（仮の一撃数を捏造しない）。
- `combat.mjs`では組込6体の必殺Planと実際の効果定義を照合する。**旧ホストのtarget・乱数・damage/KO/interrupt/Soul・イベント順はまだ変更なし。** 共通実行器への全面移管は次フェーズ。
- 最終**[Node 732/732 PASS・6体自然対戦耐久・browser smoke PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40870875950)**。6必殺すべてで新しい組込Plan経路と旧カスタム編成経路を同seed・同入力で完全snapshot/event比較。初回テストの研究依存フラグ設定ミスを修正し再実行して合格。実Chromium [PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40870366594)、同一エンジンコードのFirebase Friends no-Auth実2 iframe [PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40870222395)、Google Sites単体HTML [PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40870222384)。
- **現在地：V3-2進行中**。次：Status継続tick、Soul/割り込み/KOと複合effect実行の本格共通化→V3-3。学校iPad Safari最新版は未実機確認。main/Google Sites公開版/本番Firebase/Driveに変更なし。

## 2026-10-29 V3-2継続｜型付きEffectPlanで通常技18件を実ホストへ接続

- [実装・原作未確定事項・受入条件・検証範囲](./ENGINE_V3_2_TYPED_EFFECT_PLAN_20261029.md)。
- **共通Plan**：既存単一技マスター24件から通常技18件（物理6・攻撃妖術4・回復妖術2・とりつく6）を、`damage/heal/status`の型付きEffectPlanへ変換。標準レンタル6体のホスト`combat.mjs`が効果の正規確定に利用する。
- **研究との境界**：必殺6件は対象/Hit/複合効果を混同しないため未移行、カスタムrosterは旧コードを通す。原作未知値、新妖怪、学校配布版は変更しない。
- **結果**：GitHubソースを用いたV8 78検査、実18 Plan/6特殊拒否/18Commitと不正入力検証、JS構文はPASS。**新headのNode全件/8seed旧新比較/Chromium/Firebase Friends 2画面CIは未確認**。テストコードは追加済みだが合格を断定しない。
- **次工程**：正式CI確認→不具合修正→Soultimateの効果/対象/Hit別Planの設計・共通処理。V3-2未完、V3-3～5は今後。main/学校サイト/Firebase本番/Drive無変更。

## 2026-10-29 V3-2継続｜パッシブ会心・ガード・HP1生存を単一Hookへ

- [引き継ぎ後の実コード・テスト・検証と未完事項](./ENGINE_V3_2_PASSIVE_ROLL_HOOKS_20261029.md)。
- `beforeCriticalRoll`、`beforeDefenderCriticalRoll`、`beforeGuardedPhysicalHit`、`beforeLethalDamage`を`engine/skill-hook-pipeline.mjs`に追加し、`combat.mjs`と結線。6種のスキルtriggerを既存catalogのみから導出（重複定義を作らない）。**新キャラ/新技や原作未確定数値は追加なし。**
- GitHub現物の純粋スキルHookはV8で**158条件の旧動作一致**。2つの専用Nodeテストケースを追加。ただし**最新コミットのNode全件/自然戦闘/Chrome/Firebase Friends CIは結果未確認**で、古い719件成功をこの更新の証拠として流用しない。
- 現在地は**V3-2進行中**。次：最新HEADの正式CI → seed差分比較 → typed EffectPlan共通解決。学校Safari最新版未検証。公開/main/本番DB/Rules/Drive不変更。

## 2026-10-29 V3-2更新｜共通KO後処理・スキルhook・既存スキルカタログの統合

- [**実KO/スキルhookのコード変更・原作確認・検証証拠・未完部分**](./ENGINE_V3_2_KO_SKILL_LIFECYCLE_20261029.md)
- **共通KO確定**：`engine/knockout-lifecycle.mjs`新設。通常打撃（複数Hit）・必殺・つつくが`koLifecycle.commit`を利用。行動可否同期、KO実績/スキル発動、ピン解放の**旧順序差を明示して保持**。HP1耐久の後にKOが発生しなければ呼べない。つつくのKOを勝手に通常撃破へ追加計上しない。
- **共通スキルhook**：`engine/skill-hook-pipeline.mjs`新設。`afterEnemyKO`（まえのめり）と`afterAnyAction`（おせわ/強化経過/終了）を分離し、コード内の手書きの複製を削減。**スキル発動条件は`content/skill-catalog.mjs`から派生**するため、二重のトリガーカタログは持たない。他4種の技能の実行hook本体は今後移行。
- **3DS版出典**：どひょうぎわ＝一度HP1で耐える、まえのめり＝KO後に強化、おせわ＝隣接妖怪の回復。**現行5ターン/2段階/HP2%は旧作情報も含む研究fixtureであり、原作2の確証なし**。本工程で原作の不明な割り込み優先や計算式は変更しない。
- **最終受入**：[**Node 719/719 PASS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40840254872)、[**実Chromium Stage/Purify/Gesture PASS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40840255136)、[**Firebase Friends認証なし実RTDB/2 iframe PASS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40840226006)。CIはゲーム本体`841a6788b`と専用テスト`a34541cac`を検証。Safari実機最新試験は未実施。
- **次する作業**：`beforeCriticalRoll`/`beforeGuard`/`beforeLethalDamage`もスキルtrigger IDで実処理へ移行 → 技カタログからtyped Effect Planへ結線。**新キャラ・個別演出の追加はまだ保留**。main/学校Google Sites/Firebase本番/Drive配布物は変更していない。

## 2026-10-29 V3-2着手｜共通Effect確定で通常攻撃・必殺・つつく・回復・とりつきを束ねた

- [**V3-2共通Effect実装・原作根拠・検証・未完のhook/キャラ拡張**](./ENGINE_V3_2_SHARED_EFFECT_COMMIT_20261029.md)
- **戦闘本体の改修**：`engine/effect-commit.mjs`を新設し、既存`combat.mjs`の4系統のダメージ、4箇所の回復、通常/研究用とりつき登録を共通の`commitDamage/commitHeal/commitStatus`へ移行。**HP確定→どひょうぎわhook／状態台帳書込→canAct同期**の順序を共有。乱数・元の計算式・状態・Soul・KOの規則は変更しない。
- **参照**：レベルファイブ公式YW2の必殺・G/零式・つつく、ゲームエイト/攻略の虎の通常攻撃・回復・後衛おはらい・とりつき、Mt.WildwoodのHit/Guard/チャージ中断研究。**対象や効果の類型を支持する資料であって、発動順序の厳密な保証ではない**。
- **証拠**：[Node **712/712** PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40837995784)、[実Chromium操作・画面 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40837995888)、[V3-2新Effect本体のFirebase Friends認証なしRTDB2席 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40837911108)。後続テストのみ追加した版は戦闘本体無変更。学校iPad Safariは最新版未試験。
- **残るV3-2**：共通のKO/スキルhook、個別の途中Hit/割り込み、状態tick、Soul転送、技データ→typed Effect Planの結合。今回の変更だけで「全行動を統一した完成エンジン」とは評価しない。**次は共通KO/Skill hook順序の整理と実装**。新技・新キャラは後回し。
- **公開への変更なし**：main、学校Google Sites、Firebase本番Rules/DB、Drive配布物は変更していない。

## 2026-10-29 V3-1中間｜同一の行動ポイント計算器＋3つの時刻領域を実コードに導入

- [**V3-1の変更ファイル／YW2資料／705テスト・Firebase Friends・実Chromium／不明点／次のステート統一工程**](./ENGINE_V3_1_ACTION_TIME_BOUNDARIES_20261029.md)
- **実装済**：`engine/action-timeline-core.mjs`の`advanceLogicalAction`を、正規の実行`phase1.step()`と将来5手`phase1.predict()`の**両方から呼び出す**。これまであった二重の行動ポイント計算を廃止。共通のwait減算・同値優先・研究Flash優先・次のwaitへの復帰を1経路にし、4seedでforecast≡実次行動／forecastがRNG/状態を変えないことを確認。
- **時間の分離**：`engine/core-time-domains.mjs`は`logical-action-points`（速さ/手番）、`trusted-host-monotonic-ms`（回転制限）、`presentation-ms`（相手にまだ見せない時間）を**変換不可能な別ドメイン**として定義。現行ホストの`sampleHostInputMs`を共通化し、`match-protocol.inspectTimeDomains()`を診断専用に追加。**正規snapshot/ハッシュ/通信形式は不変**。診断phase名は原作phaseが完成した意味ではない。
- **外部資料を再照合**：Mt.WildwoodのYW2 94行Speed表・交換後のwaitと、対戦研究のノーモーション必殺（モーション中の相手視点遅延）。計算式全例・同値tie・本家のframe/msは未確証。今回勝敗や技数値は変更していない。
- **証拠**：[Node **705/705**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40836091285)、[実Chromiumステージ/全ジェスチャーPASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40836091245)、[Firebase Friends認証なし2 iframe + 実RTDB emulator PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40836331560)。現行Firebase CIのpathsに`engine/**`を追加済み。学校実iPad Safari2端末は最新版未試験。
- **V3-1の正規状態入口を追加**：`engine/match-core.mjs`で唯一の`createCombat`インスタンスを閉じ込め、対戦プロトコルは正規コマンド・自動行動・snapshot・予測を`MatchCore`へすべて委譲。**4seed・全入力列/32自動行動で旧HostとMatchCoreの戦闘状態/結果/予測が完全一致**。[最新Node **707/707 PASS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40836968526)、[Stage Chromium PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40836968607)、[新Core実装のFirebase Friends RTDB2席PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40836923783)。内部SubSystemはまだ`combat.mjs`内に残るため、状態/Effect完全統合ではない。
- **次はV3-1残り**：HP/wheel/Soul/status/スキル/行動待ち/演出イベントの**内部変更を共通のEffect/State pipelineへ抽出**し、旧エンジンvs新Coreの同seed＋入力列＋hash比較を毎回継続。**技1個単位の追加、E1-B、学校Google Sites公開は保留**。main、公開Google Sites版、本番Firebase Rules/DB、Drive配布は変更しない。

## 2026-10-29 最新方針｜ゲームエンジンV3優先へ全面移行（E1-Bなど単独機能は保留）

- [**原作根拠と実GitHubの構造監査・エンジンV3設計ADR・6段階の移行ゲート**](./ENGINE_V3_ARCHITECTURE_SOURCE_FIRST_20261029.md)。本人の「1個ずつ再現するのでなく、しっかりゲームエンジンを作るところから」という指示に従い、**技1件追加／個別映像1場面追加中心を中断**。実装する順は **V3-0既存戦闘を固定→V3-1唯一の正規状態/時間/phase→V3-2効果とスキルhook共通化→V3-3行動ポイント・妖気・相手表示遅延→V3-4キャラ/技データだけで追加できる形へ→V3-5 6v6+2席通し実戦**。
- **調査結果**：`engine/combat.mjs`約1185行に機能・研究フラグが混在、`phase1`/Soul/Status/AI/研究presentationが個別にある。良い基盤は`content/combat-catalog.mjs`のデータID参照と`engine/match-protocol.mjs`のhost権威・seq・hash/replay、現行Firebase Friends。**全面破棄せず同一の既定seed・commandの結果を保ちながら抽出**。
- **根拠**：LEVEL-5公式、3DS攻略、対戦者のモーション中サークル表示遅延/行動ポイント資料、Epic Gameplay Ability System設計。出典確信度・未検証の倍率/秒数は分離。元MP4直接再視聴を偽らない。
- **V3-0の着手**：`tests/engine-v3-migration-baseline.test.mjs`に既存6+6構成・前後衛・HP/Soul・ピン・勝敗・4 seedの決定性とhost journal replay等の不変条件を追加。これは**旧エンジンの互換基準**であって原作完全一致の証明ではない。
- **次**：Coreの時間/phase/状態の単一契約を実装し、**既存プロトコルとFirebase Friendsの実戦結果を変えず**に移行する。E1-B・トホホの砲などの個別技/場面開発は保留。main/本番Google Sites/Firebase Rules/DB/Driveは触れない。
- **V3-1本体に第一歩**：`engine/match-command-kernel.mjs`に、これまで`match-protocol.mjs`内部だったコマンド検証/Host→Combat dispatchを抽出。既存export/API、3秒輪制約、transport seq/hash、画面/通信は無変更。`aedb76a4b6`で[Node **696/696** PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40785361654)、[Stage Chromium PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40785361641)、[**現行Firebase Friends2席 RTDB＋画面PASS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40785361637)。戦闘の全Effect/時間/状態がV3へ移行済みとは言わない。

## 2026-10-29 E1完了｜第1試合00:15–00:20のおはらい「ホスト事実→下画面完了→復帰」を実操作で証明

- [**E1の動画時刻・実コード変更・実Chromium/Node/Firebaseの厳密証拠・原作として未確証な値**](./PHASE2_E1_PURIFICATION_VIDEO_SLICE_20261029.md)。
- **既存再利用**：Phase51で既におはらいジェスチャーモーダルは下画面内だけに配置済み。今工程ではホスト既存`type:'purification'`イベントの新しい実成功・本人座席・解除対象を認証してから、下画面へ**「おはらい完了！」→サークル復帰**のフィードバックを追加。部分入力や開始ACKでは出さず、二重再生・過去通知・相手側漏れを防止。表示1.15秒・14タップは研究fixtureで原作の確定値ではない。
- **受入**：実ホスト後衛A4に**開発ラボだけで**負とりつきを準備→実UIから13タップで未完→途中も上画面可視・自動戦闘進行→14タップでホストが実解除→自分側だけ完了→通常サークルへ。相手側と遅れてjoinした画面に古い完了を見せない。コード`25e7cca159` [実Chromium全Stage・実タッチ・E1 **PASS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40783539449)、[Node **694/694**＋自然6体耐久・研究ブラウザ **PASS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40783539494)、[現行Firebase Friends2-frame RTDB実ブラウザ回帰 **PASS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40782778031)。
- **証拠の限界**：E1のホスト解除を実RTDBのゲスト2-frameで行ったわけではない（E1は実ホスト＋ローカルChromium、Firebaseは別の回帰）。学校Google Sitesの実iPad Safari2台は最新版未試験。元原作動画は過去の時刻付き記録参照で、今工程の元MP4新規視聴は不可。
- **次 E1-B**：正規の対戦進行で感染した後衛が現れるテストシードを固定し、**本物のFirebase Friends2席**のゲストが解除操作→ACK→自己側だけ完了の実ブラウザを証明（本番チート注入禁止）。別途原作動画の時間・出現条件と対比。Google Sites版/main/本番Firebase/Drive既存配布物は変更なし。

## 2026-10-29 軌道修正実施｜Firebase Friends実戦ゲートの偽PASS修復と実合格

- [**原因・GitHub変更・実ブラウザ厳密受け入れ・次の原作動画1場面**](./PHASE2_REFOCUS_FIREBASE_FRIENDS_ACCEPTANCE_20261029.md)。本人の指摘を受け、研究技追加や旧通信方式追跡を止め、**原作の操作→ホスト正規判定→ゲスト表示**に優先順位を戻した。
- **重大なQA検証穴修正**：`tools/sites-online-smoke.mjs`は昔のChromium `--dump-dom`の**JavaScript本文に含まれたPASS文字列**を見て誤PASSできた。厳密化で未作成ボタン・srcdocローカル拒否・仮想時刻と実通信の競合・iframe幅計測の問題を発見し、Node22標準WebSocket + Chrome DevTools Protocolの**実時間画面DOM**監視へ変更。今回の`--emulator-friends`は本番Rules/DB書き込みせず、認証なしFirebaseのローカルエミュレーターだけを操作。
- **コードSHA `a4a61d3a3d`実受入**：[**Phase37 Firebase Friends 2 iframe real Chromium SUCCESS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40725564365)＝ルーム作成/参加→ゲスト輪回転/クールダウン拒否→ゲスト「ねらう」敵タップと両画面ACK・ピン→ホスト実行→切断停止/再接続・4画面幅まで**可視結果PASS**。[**Node694/694・自然6体完走・研究Chromium SUCCESS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40725564087)、[**実Stage/タッチ/おはらい/勝敗Chromium SUCCESS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40725564084)。
- 古い**Supabase5本＋Firebase Auth3本のCIはpush自動実行を停止**（履歴は残し手動可）。学校版は唯一`phase37-firebase-friends.yml`の認証なしルート。研究用カスタム技2件は学校のゲーム完成度向上としては数えない。
- **次：第1試合動画00:15–00:20の「連打！→おはらい完了→サークル復帰」**。既存レンタル6体で上画面が操作中も見え、下画面タップがゲスト→ホスト→ゲストへ正規反映される**同一場面**を実装/検証する。横断的にPhase2規則/Phase4操作/Phase5画面/Phase6通信を使う。元MP4の新しい直接視聴はしていない。学校Safari実機2台で最新HEADは未試験。本番Google Sites/main/Rules/DB/Drive配布は無変更。

## 2026-10-29 方針訂正：学校の現行通信は Firebase Friends だけ
- [**現行通信方式の単一資料・旧Supabaseワークフロー停止・開発優先順位の訂正**](./SCHOOL_NETWORK_SOURCE_OF_TRUTH_20261029.md)。本人の指摘を受け、2026-10-26以降の実際の方針（Firebase Realtime Database、**AuthなしFriends**、学校Google Sites単体HTML）を再確認。
- **旧Supabase 5 workflowは開発ブランチのpush自動実行を停止し履歴用の手動dispatchのみ**に変更。失敗したSupabaseの60ターンCIを現行Firebase対戦の欠陥と混同したのは誤り。実装経路`lab/sites-embed-online-entry.mjs`/`network/firebase-room.mjs`/`network/firebase-match.mjs`を現行として維持。
- **Firebase Friends CIはエンジン／描画／技データの更新でも起動するように拡張**。成功は現行オンライン基盤の模擬QAであり、学校Safari二台の新HEAD実機成功を意味しない。
- **優先順位の過失**：資料上確認できた独立custom研究技の追加が続いていたが、本人の完成定義（送付原作動画のように友達と操作できる）から逸れていた。これらの研究結果を学校のプレイ可能な対戦が改善した結果として数えない。次は**既存レンタル6体の戦闘局面×両者の操作/表示×Firebase Friends通信**を一本の受入テストにする。原作に無い技追加・Supabase再実装は優先しない。
- **main／学校Google Sites版／本番Firebase RulesとDB／旧Drive配布は未変更**。

## ロードマップ
| Phase | 目的 | 2026-10-29時点 | 次の受け入れ条件 |
|---|---|---|---|
| **Phase 1** | **戦闘基盤の統一** | **完了（1.10 総合監査通過）**：6体×4技・6スキルの正規台帳→ホスト処理→攻撃V2・両視点UIの通し監査。蘇生必殺の古い対象参照を修正。原作数値はfixtureが多く残る | Phase2へ移行：原作の一次映像・文献で技ごとの本当の命中数/Power/効果を検証してから1技ずつ忠実化。学校Safari本番テストは後段 |
| **Phase 2** | **戦闘ルールを原作へ近づける** | **進行中（2.2C-1：資料一致2技の1Hit×全体／単体をcustom実ホストと実Chromiumで証明／全原作数値は未確証）**：2.1A整数命中率＋2.1B原作確認済みの通常ガード50%・強化ガード25%をホストの物理/妖術に適用。GuardBreakは物理限定。組込6体は無変更、custom研究入力で確証 | E1ローカル実ホストとChromium画面は合格。次はE1-B：実Firebase Friends2席で合法な感染後衛を作り、ゲストおはらい入力→ホスト解除→本人だけ完了を通す。未確証トホホSPD等は保留 |
| Phase 3 | 行動順と戦闘の時間 | 後続（現行は待ちポイント研究＋ホスト2600ms固定） | 原作に準拠した論理行動順とモーション/操作タイミングの対応を確認 |
| Phase 4 | 操作と対人戦特有の仕組み | 後続（下画面ミニゲームとサークル等の既存実装あり） | おはらい/必殺/つつく/零式と**双方の表示保留**を原作局面で検証 |
| Phase 5 | 上下画面/アニメーション | 後続（見た目の研究版あり） | 技別カットイン・命中順・状態・HP・結果を動画と比較 |
| Phase 6 | オンライン総合/学校試遊 | 後続（Firebase Friends試遊基盤とChrome QAあり） | Firebaseホスト/ゲストの判定一致と学校Safari 2端末の操作・長試合が実証される |

**「進行中/後続」は研究や既存試作品が存在しない意味ではない**。現在の仕事の優先レーンを示す。個々の機能はPhaseをまたいで縦切り実装し、テストする。

## 2026-10-29 Phase2.2C-1 完了｜原作資料で一致した1Hit技2種を研究ホストへ
- [ソース4本・変更ファイル・各テスト・受入条件・原作から残る差分](./PHASE2_2C_SOURCE_BACKED_SOULTIMATE_SHAPES_20261029.md)。『妖怪ウォッチ2』鼻血ボンバー：威力100×1・敵全体（攻略大百科 + game-cap）／大切断：210×1・敵1体（攻略大百科 + game-e）。**これらは技の形のみが資料で一致する**。原作の入力条件、実命中/会心RNG、カットイン秒数、元キャラ外観の再現が完了したとは言わない。ジバニャン20×5/7の資料矛盾は未解消。
- **開発**：新`content/yw2-soultimate-reference.mjs`で出典と効果形を別台帳化、明示custom roster + opt-in`researchYw2Soultimate`のみでA1へ研究用技を割当。既存ホストの**本当の命中/会心/HP/KO**を1回×複数対象または1回×1対象で処理し、`contracts/soultimate-hit-ledger-v1.mjs`の1hit検証へ。原作の出典一致回数は`referenceSoultimate.hitCount=1`、戦闘実行用の元Hit台帳は`originalHitCount:null`を維持し、原作全計算再現という誤認を避ける。研究用カットインは「原作技の研究：技名」と区別。**標準レンタル6体・学校Friends/Google Sites公開版は無変更**。
- **実証**：最新コード`fc66a0e292` [Node **691/691**・自然6体戦闘耐久・研究Chrome PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40721184570)、[実Chromium Stageで原作参考技2種の**それぞれの技名・対象・画面数字・HP表示が実ホスト結果と一致** PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40721184436)。以前の必殺/おはらい/サークル/2視点勝敗QAもPASS。コード本体最新UI変更`ede60c7aa7`に対するFirebaseブラウザエミュレーター・Google Sites HTML生成も成功。
- **残余の別レーン長時間QA**：[Supabase normal-paced 60 actions run](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40721025699) は`PACED-MATCH-WAIT`のまま不成功だった。現時点では**テスト/ネットワーク/ゲームのどこが原因か不確定**なので、フェーズ全般の完璧な長時間オンライン動作を宣言しない。再実行での原因切り分け対象。
- **次**：2.2C-2は本人原作動画にも出た「トホホの砲」の**単発×敵全体＋SPDダウン**。本家のSPD変化が残り待ちポイント・順番にどう反映するか調べ、原作の因果を再現できる仕組みを優先。学校iPad実機2台は未試験。Google Sites版、main、Firebase本番Rules/DB、既存Driveは無変更。

## 2026-10-29 Phase2.2B-2 完了｜試験用カスタム実ホストhit列を実画面へ
- [原作の5/7Hit数矛盾、実装対象、試験証拠・未完一覧](./PHASE2_2B2_CUSTOM_SOULTIMATE_REAL_HITS_20261029.md)。Mt. Wildwoodのジバニャン20×7と攻略大百科／日本語攻略リストの20×5は資料で矛盾しており**本家のHit数は未確証**。本人の原作動画は今ターン直接アクセス不可のため、過去の第1試合動画観察記録を参照（動画全フレームを新しく視聴したとは主張しない）。
- **コード変更**：`engine/combat.mjs`に明示カスタム6×2 roster + 研究用ダメージモデル・必殺効果を必須とするopt-in`researchSoultimateHitCount:2..9`を追加。**既定null**（学校レンタル6体の仕様と戦闘結果は無変更）。実カスタム必殺の1発ごとにHost HP・命中・会心・ガード・既存LastStand・KO打ち切りを適用し`researchSoultimateHits`を記録。
- **契約と描画**：新`contracts/soultimate-hit-ledger-v1.mjs`で不変型／各打HP・MISS・KO後禁止・予定hitの不足禁止を検証。`ui/match-stage.mjs`/`ui/battle-vfx.mjs`/`presentation/action-choreography.mjs`で、対象数と別に`specialHitIndex`を表示。既存`SoultimateImpactLedger`（対象ごとの最終効果）とは独立。新`tests/phase2-2b2-soultimate-real-hit-ledger.test.mjs`がカスタム実ホスト3打×3対象・KO打ち切り・改ざん拒否・デフォルト互換を検証。
- **ゲーム本体最新コードSHA `41fc220452`の証拠**：[Node **687/687**・自然6体耐久＋研究用Chromium SUCCESS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40719822331)、[実Chromium上下画面/全操作/両視点結果、カスタム実ホスト**9回の命中/HP表示** SUCCESS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40719822217)。ログ`PHASE22-REAL-HOST-PER-HIT-DOM-PASS nine host hit/HP states`。
- **初回失敗と再検証**：初回687件中686合格でplanned回数を偽装できる検証穴を発見し、KOでない対象には全予定hitを要求するよう修正。最終687/687合格。最新研究ブラウザ初回起動タイムアウトもジョブ内再試行で成功。いずれも失敗履歴を維持。
- **次**：2.2Cにて一次映像と原作資料が揃った技から標準技へ落とす。学校Safari本物2台・最新Google Sites Friends版・実本番Firebaseは未試験。GitHub main／Google Sites版／Firebase本番設定・DB／Drive配布は変更しない。

## 2026-10-29 Phase2.2B-1 完了｜実ホストの必殺HP/状態記録→画面へ
- [詳細なソース差・今回のホスト→表示一貫性・残る未完成](./PHASE2_2B_HOST_IMPACT_LEDGER_AND_SOURCE_GAP_20261029.md)。本家ひゃくれつ肉球20×7（Mt. Wildwood）と20×5（攻略大百科ほか）の資料矛盾は未解消。原作の「トホホの砲」は攻略大百科で30×1・敵全体+すばやさDOWN。**同じ対象への連続hitと、複数の対象への単発結果を混同しない。**
- **ゲーム品質改善**：`contracts/soultimate-impact-ledger-v1.mjs`を新設。実ホスト必殺の各対象HP before/after・増減量・状態抵抗/適用を不変で検証し、`ui/match-stage.mjs`/`ui/battle-vfx.mjs`/`presentation/action-choreography.mjs`から表示。相手の再接続/古いスナップでも、該当技の原記録を使って段階HP表示できる。**ゲームの本当のHP・Soul・行動順・ルーム通信やレンタル必殺の未知hitCountは変えていない。**
- **同一コードSHA `0bfce781050`の実行証拠**：[Node683/683、6体自然耐久、研究ブラウザSUCCESS（attempt 2）](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40714382531)、[実Chromium Stage/全ジェスチャー/勝敗/3体の実ホストHP逐次表示 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40714382565)。研究unit初回はNode合格後Chromium起動タイムアウトでFAIL、同一run再実行で成功した事実を区別。テストfixtureの初回依存設定不足も修正済。
- **未完**：元原作MP4をこの作業で直接再生できていない。本家の正しい各技Hit数・対象配分・状態の順序は未証明。学校Safari 2台最新版・実Google Sites Friends公開版も未検証。
- **次**：2.2B-2原作一次映像と資料で確認できた技から**「対象ごとの結果」とは別の「一撃ごとの実ホストhit列」**を段階導入。原作ルールの未確証部分を仮定で埋めない。本番Google Sites・GitHub main・Firebase Rules/DB・Drive配布は未変更。

## 2026-10-28 Phase2.2A 完了｜必殺技ターゲット表示と本家hit数の厳密区別
- [詳細な原作資料の5/7 hit記述差、既存本人動画の時刻、実装・試験・留保](./PHASE2_2_SOULTIMATE_TARGET_VS_HIT_VISUAL_TIMELINE_20261028.md)。原作「ひゃくれつ肉球」はMt. Wildwood YW2が20×7、攻略大百科 YW2が20×5と記載し、この時点で数値は確定しない。「トホホの砲」は資料上30×1で敵全体+素早さDOWN。**敵3体に命中＝3連撃ではない**。
- **実装**：`presentation/action-choreography.mjs`に`specialTargetIndex/currentSpecialImpact/nextSpecialImpactAtMs`、`ui/match-stage.mjs`にターゲット毎の浮動結果/表示前HPの保持。全て**プレゼン専用**、ホストダメージや妖気/行動順・未確証`hitPattern`は一切変えない。敵3体の順表示テンポは研究用の仮設定で本家実時間ではない。
- **最終コードコミット`608947f988`の証明**：[Node 680/680 + 完走耐久 SUCCESS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40707841601)、[実Chromium Stage/全操作/結果 SUCCESS、加えて必殺3体B1→B2→B3の**1対象ずつ浮動数字**DOM実描画PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40707841744)。実ホストが起こした必殺効果→3対象cue→画面時間割りの独立Node検査も追加。ただし**Chromium3体表示はプレゼン用fixture、原作MP4の連撃実測ではない**。
- **次**：Phase2.2B：原作動画でhit/target/状態変化を実時刻再照合し、元資料間のヒット数矛盾を解消できた技から個別hit ledgerを開発。学校Google Sites公開版、main、本番Firebase Rules/DB、旧Drive配布は未変更。最新版学校Safari2台は未試験。

## 2026-10-28 Phase2.1C-2 完了｜原作ルール研究コードの新回帰証明
- **実装差分**：学校用Firebase Friendsの認証なしRTDBテストに、ゲストの輪操作ACK→ホスト実戦24行動→ゲストへ正規状態配布→snapshot完全一致の回帰を追加（ゲーム本体は変更なし）。テスト実装初回の`game.turn`参照ミスで一度失敗し、正しい`game.clock.turn`へ修正、再試験成功。
- **同じ最終コードSHA `4a63bef846`のテスト実績**：[Node 677/677 + 6体自然耐久 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40705027981)、[実Chromium上下画面/全ジェスチャー/両視点結果 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40705027869)、[Firebase Friends認証なしRTDB + 2 iframe実Chromium + 24行動正規状態同一性 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40705028114)。
- [Phase2.1Cの差分・確証・留保・QA詳細](./PHASE2_1C_TECHNIQUE_ELEMENT_AND_DAMAGE_FORMULA_MATRIX_20261028.md)。**Phase2.1C-2のQAゲートは完了**だが、原作データの矛盾（Wiki式vs実測推定式、Play/Penetrate未確証併用順序）、元MP4の今ターン直接未観察、学校Safari最新版未検証は残る。
- **次**：Phase2.2技固有の「対象が複数」≠「多段ヒット」を原作映像＋技資料に照合し、実戦結果のhit列と見た目の命中順へ段階適用。学校Google Sites稼働版・main・本番Firebase・Drive配布は触らない。
- **実画面も確認**：[Phase2.2へ渡すChromium PNG4枚の実目視・原作動画との差分監査](./PHASE2_2_VISUAL_EVIDENCE_GATE_FROM_REAL_CHROMIUM_20261028.md)。通常行動でキャラ自身の動きが小さい一方、必殺カットインが大きく出ていることを確認。これはLOCAL研究画面の静止画像であり、学校Friends Safari版・連続動画の検証ではない。

## 2026-10-28 引き継ぎ後の履歴・動画の横断監査（コード無変更）
- [引き継ぎ過去資料80件以上の横断監査／元動画5本のアクセス状態／原作再現の未完一覧](./HANDOFF_ARCHIVE_AUDIT_AND_VIDEO_ACCESS_20261028.md)。Phase10～51とPhase1/2、学校の2026-10-27実機試遊、オンライン方式の変遷、ユーザー動画の直接観察履歴を再読。古い資料の「2～4試合未視聴」は2026-10-28 Phase1.6の一部実フレームレビューで一部更新されたが、全編フレーム比較は未完。**今回元MP4はアクセス不可、直接再生したと主張しない。**
- **本工程は資料照合と保存のみ。ゲームコードとテスト数は不変。次工程は2.1C-2の新コミットNode/Chromium/Firebase回帰証明。** 旧学校V2の2台成功と新開発版の実機未試験を区別。Google Sites稼働版・main・本番Firebase・Drive配布は無変更。

## 最新作業（Phase2 / サブステップ2.1C-1：属性Play/Penetrateを研究ホストへ）
- **[詳細な原作比較マトリクス・実装・未検証点](./PHASE2_1C_TECHNIQUE_ELEMENT_AND_DAMAGE_FORMULA_MATRIX_20261028.md)** を追加。Mt. WildwoodのYW2妖術ダメージ式と2026-09-16実機推定式の差を、1hit・通常/会心・Defense/criticalDefense・乱数・属性の条件で整理。通常時の理論差は `(Power+Spirit)/210 - Defense/350` で、係数の恣意的置換は行わない。
- **原作に根拠ある部分だけ縦切り実装**：新`engine/element-model.mjs`で対象耐性、該当属性Play 0/1/2ソース、Penetrateを分離。`engine/combat.mjs`からcustom研究チームの実ホスト妖術へ接続。組込6体に原作未確認の能力を付けず、通常スナップを保つ。`engine/damage-model.mjs`の属性上限だけ3×1.4へ拡張。研究用の新5テストを`tests/phase2-1c-technique-element-original-rule.test.mjs`に追加。
- **検証状況**：GitHubから取得した実ソースの純粋計算部分はV8で**最新8条件PASS**（当初9条件の研究後に、PenetrateとPlayの同時適用順が未証明と分かり、組合せを明示拒否するよう修正）。ただし**新コミットのNode全テスト/Chromium/FirebaseエミュレーターCI成功は未確認**で、Phase2.1Cはまだ完了扱いしない。672/672とChromium PASSは**以前の2.1Bでの結果**。今回は原作元MP4の新規フレーム確認はできていない。学校Safari2端末も未検証。
- **次**：Phase2.1C-2 新コミットのCI・ブラウザ・Firebase回帰確認、原作動画が取得可能なら実フレーム照合。式の差は原作実測で決着するまで未解決のまま。
- **保護範囲**：Google Sites稼働版、GitHub main、本番Firebase Rules/DB、Drive配布物は無変更。

### 前回：Phase2.1B

## 今回した作業（Phase2 / サブステップ2.1B：強化ガード25%の実ホスト適用・式の根拠比較）
- [詳細な原作根拠・最新コード・試験記録](./PHASE2_1B_YW2_GUARD_BOOST_AND_FORMULA_RESEARCH_20261028.md)。[Mt. Wildwood YW2 Guarding](https://mtwildwood.net/guarding.php?g=yw2)で**通常ガード×0.5、強化ガード×0.25、GuardBreak貫通**を確認。ダメージ式は[Mt Wildwood YW2 damage](https://mtwildwood.net/damage.php?g=yw2)と[2026-09-16実機2台の推定式](https://note.com/atoato429429429/n/nfefe8749d432)で妖術係数に僅差があるため、**式全体を推測で置換していない**。YW1の「ガード中はダメージ乱数なし」とYW2の記載も混同しない。
- **コード実装**：`engine/damage-model.mjs`に省略可能`guardBoost`（Boolean）＋`guardFactor`を導入。実`engine/combat.mjs`で**custom編成だけに`guardBoost:true`を明示でき、guard中なら物理/妖術ともダメージ25%**。物理だけGuardBreakでガード軽減を無視。旧研究ダメージOFF経路も同じ。組込6体には無根拠に強化ガードを付けず、旧snapshotに新キーを勝手に入れない。
- **新テスト5件**：`tests/phase2-1b-guard-boost-original-rule.test.mjs`。通常半減・強化1/4・物理貫通・妖術非貫通の値、3seedの研究用**本物のガード行動/攻撃/妖術**とseedリプレイ、非Boolean拒否と組込6体の互換性を検証。
- **最終コード/testコミット`868f9e5f8`**：[Research Node **672/672 PASS＋耐久PASS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40652761991)、[本物のChromium Stage/Gesture/MatchResult PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40652762022)。ホスト実装SHA`2a719cee2`の[Firebase Emulator browser QA PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40652708751)、[Google Sites Online QA PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40652708498)、[offline 1HTML embed PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40652708527)も確認。学校Safari2台の実戦はまだ未検証。
- **本人原作動画**：今回は元MP4の新規フレーム直接閲覧ができなかったため、[Phase2.1Aの直接元動画の観察記録](./PHASE2_1A_YW2_INTEGER_HIT_CHANCE_20261028.md)を継続一次資料として使用。係数0.25の根拠は動画ではなく上記解析資料。原作バスターズ・YW3のダメージ式は採用しない。Google Sitesの学校稼働版・main・本番Firebase Rules/DB・Drive配布は無変更。

## 次する作業（Phase2 / サブステップ2.1C）
物理/妖術ダメージの原作Wiki式と日本の3DS実機推定式の差を、**技ごとの威力・ヒット数・ステータス・会心・ガード・属性・乱数幅**で条件付け、検証可能な誤差マトリクスを作る。元素Play（×1.2／2ソースで×1.4）・Penetrate（耐性1未満を無視）も原作資料に沿って効果ID/場スキルと対象耐性を分離し、嘘の倍率を勝手に組込レンタルに足さない。本人の原作動画のガード/ダメージHITシーンを時系列で照合する。

## 前回の作業（Phase2.1A）

## 今回した作業（Phase2 / サブステップ2.1A：原作の命中率を整数に量子化）
- **原作資料に基づく実ゲームルール修正**：[Mt. Wildwood Hit Chance](https://mtwildwood.net/hit-chance.php)によると、Speed85対151の命中率は84.8→**84%へ切り捨て**、物理技の命中補正を掛けた結果も整数へ切り捨てて0～99の乱数と比較。従来の`engine/hit-model.mjs`は小数の確率で直接比較していた。**`base=Math.floor(clamp(...))`と`probability=Math.floor(clamp(base*moveAccuracy,...))`を実装し、ホスト実戦の通常物理/攻撃妖術に適用**。RNGを追加消費していない。元6体のPower/効果はfixtureのまま。
- **比較の注意**：元資料の追加スキル`Gassy Sphere`6体で合成0.4倍という例は、物理技の`moveAccuracy`が0.5～4倍という別の定義。混同してテストに0.4を入れた初回は失敗したが、**本体の有効範囲を緩めず、別の追加スキル係数は未実装と明示**してテストを修正した。Action末尾の隣接回復skillイベントを最後の`action`と取り違えたテストも行動ID検索に改めた。
- **単体/統合テスト**：`tests/hit-model.test.mjs`を実例へ更新、新`tests/phase2-1-original-hit-quantization.test.mjs`で3ケースを追加。5個のseedで物理・妖術をホストで実発動、`hitResearch`に整数境界が記録され、2座席の表示・ジャーナル再演算の値が一致。**[Research Unit 667/667 PASS＋耐久PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40645583960)**、**[実Chromium Stage/Gesture/Result PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40645583976)**。[Firebase Emulator browser QA](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40645193643)とSites Offline/Onlineビルドも本体変更コミットで通過。
- **原作の一次資料**：本人提供の原作MP4第1試合52～70秒・114～117秒の元フレームを**今回直接抽出し、目視レビュー**。技の専用演出・戦場・サークルの同時表示は確認できるが、単独動画から0～99の命中乱数・母数は検証できない。解析資料をダメージ/命中アルゴリズムの根拠とし、**映像を技名/場面遷移の一次資料**として扱う。
- 原作のダメージ式はすでに`damage-model.mjs`へ多数実装されているが、外部で異なる実測推定もある。**ここで式や技の威力を勝手に置き換えない**。本件の詳しい証拠：[Phase2.1A](./PHASE2_1A_YW2_INTEGER_HIT_CHANCE_20261028.md)。Google Sites学校稼働版、GitHub main、本番Firebase Rules/DB、Drive配布は変更していない。

## 次する作業（Phase2 / サブステップ2.1B）
通常攻撃・妖術について、[Mt. Wildwood YW2ダメージ資料](https://mtwildwood.net/damage.php?g=yw2)と[2026年9月の実機対戦ダメージ検証](https://note.com/atoato429429429/n/nfefe8749d432)をゲームの版/技カテゴリ/会心/属性の条件ごとに照合し、**確実に原作と一致する1項目**を絞ってホストに適用。次の未実装スキル係数は技命中倍率と混同しない。本人原作動画の打数・HIT/MISS連続フレームも引き続き一次資料として調べる。今後も1変更ごとにNode、Chromium、Firebaseの結果を別々に報告する。

## 前回の作業（Phase1.10）

## 今回した作業（Phase1 / サブステップ1.10：総合監査完了・Phase2移行判定）
- [完全なPhase1.10監査・コード修正・原作直接動画レビュー](./PHASE1_10_FOUNDATION_INTEGRATION_AUDIT_20261028.md)を作成。6キャラ×4技と6スキル→各catalog spec→ホストの真のHP/Soul/status/KO→現行`events`→2座席表示→物理攻撃専用ActionOutcome V2→演出計画のつながりを確認した。
- **実装上の穴を修正**：`combat.mjs`で必殺技の**効果定義は共通マスター**なのに、蘇生のためにKO後衛を含める対象選択だけ**旧`caster.special.kind`**を読んでいた。`special-effects.mjs`に`researchSpecialAllies(spec,wholeTeam,livingFront)`を追加し、実ホスト効果と対象の双方で**同一解決済みspec**を利用。HP/乱数/回復式は不変。
- 新`tests/phase1-10-integrity-audit.test.mjs`で4ケース追加。誤キャラ参照を避け、旧`caster.special`を意図的に不一致にしたKO後衛蘇生テスト、複数seedの**ホスト→両座席View→ActionOutcome V2→演出→決定論的journal再実行**を検査。原作未確認の全技は`fixture`のまま、必殺のヒット数`unknown`を維持。
- **最終実装/testコミット`c0373b91`**：[Research Node **664/664 PASS＋耐久試合 PASS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40642251110)、[Stage Chromium/gesture/結果 **PASS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40642251099)。本体修正コミット`a6ebc727`の[Firebase emulator QA成功](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40642200382)と[Sitesビルド成功](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40642200314)も確認。**Firebase Emulatorでは匿名Auth研究経路を含むため、学校AuthなしFriends Safari実機2台の動作保証と混同しない**。
- 本人の**原作MP4実ファイルから直接3フレームを抽出/目視**：第2試合90秒で「ザ・無表情」専用カットイン、第3試合90秒で複数数字＋状態表示、第4試合110秒で「敵が行動しなくなる」効果と下画面を確認。いずれも瞬間の一次資料で、打数・持続/計算式・動作時間は未判明。勝手に`documented`へ昇格していない。
- **判定**：Phase1はソフトウェア基盤の範囲で完了、Phase2へ進む。**原作再現が完成した/学校公開が完了したとは言わない**。Google Sites稼働版、GitHub main、本番Firebase Rules/DB、Drive配布は変更なし。

## 次する作業（Phase2 / サブステップ2.1）
**原作の戦闘ルールを1技ずつ実証して修正**：まず物理攻撃または妖術のうち、元動画と信頼できる資料で威力・ヒット数・属性/命中挙動が確認できる技を1種類選ぶ。キャラは引き続きオリジナルレンタル6体。記録するのは原作のルール上の根拠と、現在fixtureとの差分、seed/画面の回帰検証。原作の不明数値を後付けしない。続いてPhase2.2必殺多段/範囲、2.3とりつく/スキル効果、2.4実戦統合を順に進める。

## 前回の作業（Phase1.9）

## 今回した作業（Phase1 / サブステップ1.9：固有スキルIDからホスト実処理へ）
- **既存6スキル** `momentum`（KO後強化）、`care`（隣接回復）、`sharpCrit`（会心率）、`critImmune`（会心無効）、`lastStand`（致死1回耐え）、`guardBreak`（物理ガード無視）の`skillId/trigger/effect`を`content/skill-catalog.mjs`から検証し、現行ホストの判定場所へ接続した。**原作の倍率や持続数値はfixtureで、変えていない**。
- 新`engine/catalog-skill-spec.mjs`：名前・5能力・スキル・6種類の発火条件・効果が共通カタログに一致するか戦闘開始時に検証。不一致/誤カスタムIDは拒否。`engine/combat.mjs`は`catalogSkillResolution`時に正規IDから求める`skillFor`を既存のKO/ダメージ/急所/ガード/回復処理に渡す。`engine/skill-effects.mjs`の隣接回復だけ任意`skillOf`を受け取れるよう拡張。**新イベントバスやタイマーを追加しない**。
- `engine/match-protocol.mjs`では組込みレンタルの開発版で既定true、明示カスタムteamはfalse。ゲストからの切替は不可。イベントや通信wireの形式は変更なし。
- `tests/phase1-9-skill-catalog-host-parity.test.mjs`で6件追加。ID/trigger/effectの整合・誤データ拒否・6枚隣接・学校/研究複数seed・Pin入力・skillイベント・旧ダメージモデルまで一致を確認。**[研究単体660/660＋耐久PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40640840994)**、**[Chromium Stage/Gesture/Result PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40640840904)**。
- 原作調査は[攻略大百科スキル一覧](https://gamepedia.jp/youkai-yw2/skills)と[ゲームの匠スキル一覧](https://youkai-gh.g-takumi.com/skill_list.php)、[Game Programming Patterns Event Queue](https://gameprogrammingpatterns.com/event-queue.html)。本人提供動画は以前の観察記録を参照し、**今回MP4の新規全フレーム検証を行えたとは言わない**。正確なスキル係数・発火順位は未実証。
- 詳細：[Phase1.9 実装と外部根拠](./PHASE1_9_PASSIVE_SKILL_CATALOG_HOST_PARITY_20261028.md)。学校Google Sites稼働版・GitHub main・Firebase本番Rules/DB・Drive配布は無変更。

## 次する作業（Phase1 / サブステップ1.10）
**Phase1戦闘基盤の総合点検**：6体→4技とスキルID→ホストの効果→`ActionOutcome`→画面/通信の依存関係が正しいか確認。現在`ActionOutcome V2`は通常攻撃だけなので、スキルを勝手に攻撃Hit列へ捏造して統合しない。全レーンの原作証拠`observed/documented/fixture/unknown`を照合し、Phase2へ移るために残る仕様を優先付けする。学校iPad実機二台の検証は適切な時点で本人に依頼する。

## 前回の作業（Phase1.8）

## 今回した作業（Phase1 / サブステップ1.8：必殺技の統一マスター・実ホスト接続）
- **技定義の一元化**：新`content/rental-soultimate-moves.mjs`に6体の必殺技（通常ダメージ/ドレイン/バフ/ダメージ+状態変化/蘇生+回復/デバフ）の型・対象・Power・付与状態を記録。全て**試遊fixture**。範囲に複数対象がいても**多段ヒットではない**。元ゲームの打数が確認できていないダメージ系は`hitPattern:{type:'unknown',count:null}`、攻撃以外の技は`none,0`。
- `content/rental-roster.mjs`にあった個別の5つの`special`直書きを除去、共通マスターから互換用`special`を生成。`content/rental-move-master.mjs`は技のID/対象/型/状態情報を上記単一ソースから生成。
- **戦闘エンジンへ接続**：`engine/catalog-soultimate-spec.mjs`でキャラ・5能力・スキル・技ID・Power・対象・追加状態/不明HitCountの整合を厳密検査。`engine/combat.mjs`のホスト必殺効果解決は新`catalogSoultimateResolution`使用時マスターの技定義を採用。元のHP/KO/Soul/状態/計算式/乱数は変えず、レンタルの開発版`MatchProtocol`で既定true、custom teamはfalse。
- **試験**：新`tests/phase1-8-soultimate-catalog-host-parity.test.mjs`に5ケース追加。6種の必殺を実際に発動し、旧/新のホスト結果・HP・状態・勝敗を同seed比較。**[研究単体654/654＆耐久PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40603028705)**、**[実Chromium Stage/Gesture/Result PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40603028781)**。途中の1件失敗は状態ダウンの実験フラグ不足で、テスト条件を修正して通過。既存ゲーム本体のルール制限は緩めていない。
- **原作**：[Mt Wildwood YW2 Moves](https://mtwildwood.net/yw2/moves) と [攻略大百科の必殺一覧](https://gamepedia.jp/youkai-yw2/specials)を確認、**敵一体/複数と1hit/多hitを明確に分離**。本人提供MP4第1試合の従来観察記録と第2試合の実フレームサンプルを再確認。録画の全打数/アニメ時間の確定は未実施。
- **未完**：必殺ごとの本物の多段/全体命中回数・原作数値、スキルの実行効果統合、学校Safari二台対戦。**学校Google Sites稼働版・GitHub main・Firebase本番ルール/DBは無変更**。全証拠：[Phase1.8](./PHASE1_8_SOULTIMATE_MASTER_HOST_PARITY_20261028.md)。

## 次する作業（Phase1 / サブステップ1.9）
**固有スキルの共通台帳→ホスト発火条件/効果の縦切り接続**。最初の1スキルについて従来の戦闘結果と同seed比較し、ほかの5スキルへ安全に展開。特殊技の多段ヒットは別レーンで原作の録画と資料に一致した段階で実装する。学校試遊は実機の受け入れ条件が揃うまで保留。

## 前回の作業（Phase1.7）

## 今回した作業（Phase1 / サブステップ1.7：とりつく共通データ化）
- `content/inspirit-effect-master.mjs`：現行の研究用7効果のID・正負・分類・未確定持続を共通管理。`content/rental-inspirit-moves.mjs`：6体のとりつき効果（sleep / strength-up）、対象、仮レベル1を単一の著者データへ移した。**原作の確定技名/確率/時間ではない**。
- `content/rental-roster.mjs`で従来の`inspirit`を共有ソースから互換生成。`content/rental-move-master.mjs`は正負・対象・状態IDを台帳から構築。`engine/selection.mjs`のAI対象飽和判定も同じ正負辞書を参照。
- `engine/catalog-inspirit-spec.mjs`が名前/5能力/スキル/技/レベル/対象を起動時に照合し、`engine/combat.mjs`の本物のホスト行動へ接続。組込みレンタルで新方式を既定使用、customでは旧方式。旧のRNG・命中/耐性・おはらい・ledger・Soul・勝敗を変更しない。
- `tests/phase1-7-inspirit-source-and-host.test.mjs`を6テスト追加。**Node 649/649 PASS**、複数seed×学校/研究で旧/新のイベント・HP・状態・勝敗一致、良悪とりつきの実発動とターゲット検査。独立[Chromium実画面QA PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40601602766)。ただし[単体ワークフロー全体](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40601602650)はChromium browser-smokeの起動タイムアウトで失敗（Node検査は全合格）。[後続Research Unit 649/649・耐久・ブラウザスモーク全SUCCESS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40601951502)を確認。途中Chromeタイムアウトの失敗履歴も残す。
- 原作調査：[Mt Wildwood YW2 Inspirits](https://mtwildwood.net/inspirits.php?g=yw2)、[攻略大百科 おはらい](https://gamepedia.jp/youkai-yw2/archives/1397)。本人の原作動画は[Phase1.6の一部フレーム実見記録](./PHASE1_6_TECHNIQUE_CATALOG_AND_ORIGINAL_VIDEO_REVIEW_20261028.md)を参照、**今回とりつきの正確な持続・命中/抵抗率を動画から新規確定してはいない**。
- 全証拠・コード・次工程：[Phase1.7](./PHASE1_7_INSPIRIT_EFFECT_MASTER_AND_PARITY_20261028.md)。学校Sites稼働版、GitHub main、本番Firebase Rules/DBは無変更。

## 次する作業（Phase1 / サブステップ1.8）
**必殺技の共通マスター化**。単体・範囲と単発・多段を区別し、追加効果・回復・蘇生・ドレインの専用処理を整理する。原作動画の技シーンを直接検証できた範囲と、外部資料で確認できる範囲を分ける。既存ゲームの実戦結果と同seed比較してからホストへ接続する。

## 前回の作業（Phase1.6）

## 今回した作業（Phase 1 / サブステップ1.6：攻撃・回復妖術の実ホスト接続）
- **共通技のデータ一元化**：`content/rental-technique-moves.mjs`に6体の試遊用妖術威力/攻撃・回復/仮neutral属性/ダメージ技ヒット数を一箇所で記述。`rental-roster`の`techniquePower`/`technique`は互換自動生成。`rental-move-master`は妖術の`category, power, hitPattern, element, targetScope`を技ソースから作成。
- **戦闘エンジンの実移行**：`engine/catalog-technique-spec.mjs`でキャラの全5能力/名前/技/スキルと台帳が一致することを厳密検査。`engine/combat.mjs`では新`catalogTechniqueResolution`のとき攻撃・回復妖術の威力/種類/属性/ヒット数を台帳から取得し、既存の命中・ダメージ・回復・Soul・勝敗をそのまま利用。組込み6体は`match-protocol`既定true、custom teamsは従来動作。
- **自動テスト**：`tests/phase1-6-technique-source-and-host.test.mjs`に5テスト追加。[**Research Unit 643/643 PASS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40600243250)、[**Chromium Stage/Gesture/Result QA PASS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40600243175)。学校/研究・複数seedで**両方の妖術（攻撃/回復）を実際に発生**させ、旧方式・新方式のHP/妖気/イベント/勝敗が一致。
- **今回の重要な違い：ユーザー提供原作動画を実ファイルから直接レビューできた**。4つの元MP4の存在/尺を`ffprobe`で確認し、2,3,4本目の一部フレームを抽出・目視。技別カットイン/サークル/状態文字などを観察。全編を観察したとは言わず、妖術の原作威力・回復式・対象・時間は未確定。詳細は[Phase1.6原作動画・実装証拠](./PHASE1_6_TECHNIQUE_CATALOG_AND_ORIGINAL_VIDEO_REVIEW_20261028.md)。外部技資料・Type Objectも照合。
- **未完**：とりつく・必殺技の効果データソースは旧ロスタに残存。学校Safari2台の実機試験は未実施。原作数値はあくまで`fixture`。学校Sites稼働版・GitHub main・本番Firebase Rules/DB・Drive配布は無変更。

## 次する作業（Phase 1 / サブステップ1.7）
**とりつくの共有効果マスター化**（良/悪・対象・状態効果ID・レベル/解除条件）を原作資料と本人の録画で確認する。未知の持続ターンや発生率を原作確定とはしない。既存戦闘解決を維持してデータ駆動化し、同seed・同入力で旧/新を比較する。その後必殺/スキルへ。

## 前回の作業（Phase 1.5）
## 今回した作業（Phase 1 / サブステップ1.5：キャラID参照と24技マスター）
- **実装済**：`content/rental-character-move-refs.mjs`がキャラ6体について4技IDとスキルIDを保持。`content/rental-move-master.mjs`が24件の技定義を一元管理し、`content/rental-yokai-definitions.mjs`がID参照の一次データから旧V1のフル技定義を**互換生成**する。`content/combat-catalog.mjs`は参照-onlyキャラとmoveMasterを直接入力として、4技ID→実技定義への照合を行う。
- **攻撃威力の実単一ソース化**：旧`RENTAL_SQUAD`内の`attackPower`リテラルを削除。`content/rental-attack-moves.mjs`のみで6体の攻撃威力を定義し、旧`attackPower`プロパティは生成。攻撃回数は全員1ヒットのfixtureを保持。原作のヒット数と主張しない。
- `techniquePower`、とりつく、必殺技の効果元データは**依然レガシーロスタを著者ソースに使う移行途中**。4技の「参照」は整理したが、4技全部の実値を独立させたわけではない。原作動画第1試合の既存観察記録は継続利用。2～4試合目の映像は未直接確認。
- **検証済**：最新実装コミット`14ae7c688`の[Research 638/638 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40597123520)、[Chromium Stage/gestures/results PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40597123947)。誤技ID・誤スロット・欠損・重複・不変性、旧/新の学校用シードホスト結果一致を検査。学校iPad Safari2台/PNG自体の人間の目視確認は未完。学校Sites稼働版・main・本番Firebase Rules/DB未変更。
- 本作の原作値はまだ`fixture`。原作再現が数値で向上したとは言わず、「原作資料から正確な技値を後で投入しやすくなった」段階とする。
- 詳細・出典・実装・未完：[Phase1.5移行記録](./PHASE1_5_MOVE_MASTER_AND_CHARACTER_REFS_20261028.md)。

## 次する作業（Phase 1 / サブステップ1.6）
**妖術（攻撃/回復）を次の技カテゴリとして直接技マスターに格納・戦闘処理に接続する。** 現行の`techniquePower`・`techniqueHits`・`technique`の重複を減らしつつ、同一シードの命中/回復/HP/妖気/勝敗を維持する。技の原作値が不明なら`fixture`のまま。続けてとりつく・必殺へ段階展開。

## 前回の作業（Phase 1.4）
## 今回した作業（Phase 1 / サブステップ1.4：ホスト攻撃と共通技台帳を接続）
- 既存レンタル6体の`moveId`を`engine/catalog-attack-spec.mjs`で名前・5能力・技威力・ヒット数・スキルIDと厳密照合し、実ホストの通常物理ダメージ解決に**共通move.power/hitPattern.count**を渡した。計算式/ターゲット/乱数/HP/妖気/勝敗は旧コードを利用。
- `engine/combat.mjs`に明示ブール`catalogAttackResolution`を追加。カスタムチームへ誤IDを付けない（指定カスタム＋明示trueは拒否）。`engine/match-protocol.mjs`は**組込レンタルでは開発版既定true**、カスタム指定では既定false。ゲストの通信コマンドからは変更不可。
- `tests/catalog-attack-host-parity.test.mjs`で**複数seed×学校/研究**の旧（false）・新（true）ホスト全試合状態と攻撃結果を比較。レガシー算式/カスタム編成/標準版既定の動作も確認。旧Sourceデータと新Catalogの威力/命中回数が異なる場合は**起動時に拒否**。**まだ旧`rental-roster`に移行互換の威力の二重定義が残る**。
- 外部資料ではYW2の技固有威力・ヒット数を確認。[Mt. Wildwood (Statiking)](https://mtwildwood.net/yw2/yokai/statiking)、[Game Programming Patterns Type Object](https://gameprogrammingpatterns.com/type-object.html)を参照。**本人提供動画1試合目の以前のフレーム観察記録**は戦闘表示の一次資料として参照したが、今回元MP4を新たに直接視聴していない。残り3試合も未観察。
- **検証**：コミット`8f2dafebf`の[Research 633/633 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40552398719)、[Chromium Stage QA PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40552398778)。旧Supabase QAで一部の公開スナップショット待機タイムアウトはあったが、現行学校Firebase Friendsと混同しない。学校Safari実機2台では未検証。
- 途中`attackPower`を分岐内だけで宣言してしまい他の行動時にReferenceErrorとなった。**変数の可視範囲を修正し、設計境界テストを緩めず、633件全合格まで再検証**。失敗の記録も[Phase1.4証拠](./PHASE1_4_CATALOG_ATTACK_HOST_PARITY_20261028.md)に保持。
- 今回の変更は「原作の値に合わせた」わけではなく、**正しい原作数値を採用したとき、技定義から本計算へ反映できるようになった**という進捗。Google Sites稼働版・main・本番Firebaseは不変更。

## 次する作業（Phase 1 / サブステップ1.5）
**キャラ定義の4技を共通moveId参照へ正規化**し、技ごとの全フィールドの二重管理を減らす。その後、1体ずつ戦闘へ接続する。成功判定は旧/新同seed戦闘の命中・HP・妖気・KO・勝敗一致、および学校向けFirebase基盤の既存QA成功。原作動画の未閲覧3試合がアクセスできれば優先して直接確認する。

## 前回の作業記録（Phase 1 / 1.3）
## 今回した作業（Phase 1 / サブステップ1.3：動画根拠の命中順表示）
- ユーザーから再強調：「本人が提供した原作プレイ動画も**重要な一次資料**」。資料照合表：[Phase1.3動画・実装の証拠](./PHASE1_3_USER_VIDEO_HIT_EVIDENCE_20261028.md)。
- **一次観察記録の再読**：第1試合00:44–00:52、01:29–01:35の「ひゃくれつ肉球」カットイン→複数ヒットの順次表示を確認。トホホの砲など別の技とは演出・効果が違う。1試合目の**以前に実フレームを観察した記録**に基づく。**今回新たに元MP4を直接再生できたわけではなく、2～4試合目は依然として実フレーム未確認**。Files検索でMP4を取得できず、コンテナ/ローカルPython環境も起動できなかった。映像の時間値・回数は確定しない。
- **実装**：`presentation/action-choreography.mjs`でV2の`hitResults`から表示用`hitIndex/currentHit/nextHitAtMs`を投影し、`ui/match-stage.mjs`がヒット境界で対象の命中/MISS/数字/HPを順次描画する。**予定攻撃数ではなく実記録されたヒットだけ**。既存のimpact表示時間を均等分割するのは**試遊仮タイミング**、原作同等ではない。
- ヒット途中の`hpBefore/hpAfter`はホストのヒット記録からのみ取得。新しいダメージ/ヒット数/状態変化を作らない。戦闘エンジン、RNG、行動順、Firebase wire、学校本番は不変更。
- テスト：単一実行ヒット（KOで後続なし）、MISS→命中、HP変化、表示境界を`tests/action-outcome-v2.test.mjs`に追加。GitHub Actions **[研究単体 627/627 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40550496995)**。同じUI実装コミット`477033242`の[Stage Chromium QA PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40550338560)、[Firebase emulator QA PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40550338614)、[Sites Emulator QA PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40550338538)を確認。後続の`6079d441`では表示コードは変更せずコメントと単体テストを修正。後続の[最新Stage再実行](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40550496951)は確認時点で実行中のため成功扱いにしない。
- テスト途中の静的純粋性検査は追加コメントの`window`語に反応して失敗。時間依存APIはコードに使っておらず、コメント修正後に627件成功。失敗を緩めたり無視していない。
- **残作業**：具体的な本家ヒット間隔、原作の多段必殺の正確な回数と技固有の表示、学校iPad Safari実機、原作4試合を使った画面目視比較は未完了。

## 次する作業（Phase 1 / サブステップ1.4）
**共通技データの最初の通常攻撃を実際のホスト解決処理へ段階接続**する。旧版と同じseed/入力で命中・ダメージ・HP・乱数・勝敗が変わらないことを比較する。合わせて、元MP4の再アクセスが可能になった段階で第2～4試合のフレームを優先して観察し、原作の命中・効果・操作の採用根拠を増やす。学校Sites稼働版は勝手に差し替えない。

## 前回の作業記録（Phase 1 / 1.2）
## 今回した作業（Phase 1 / サブステップ1.2：ActionOutcome V2）
- **共通戦闘結果の契約**を`contracts/action-outcome-v2.mjs`へ独立させた。戦闘計算と描画の双方から参照でき、`presentation/`が`engine/`を直接importしない。現行のアーキテクチャ境界テストを保持。
- V2スキーマは`schema=2`、`eventId`（戦闘イベントID）、`actionId`（論理行動ID）、`actorId`、`moveId`、`actionKind='attack'`、`moveEvidence`、`outcome.hits`（命中順/会心/HP前後/実ダメージ）、`effects=[]`、`winner`を保持。
- **見えていない事実を創作しない**：原作で未確定の数値を付けず、旧戦闘エンジンが確定した`multiHit.hits`以外から新ヒットを追加しない。各ヒットの前後HP連続性、MISSの0ダメージ、総ダメージ一致、KO後に追加ヒットがないことを契約として検証。状態変化や妖気変化はこの研究版の攻撃イベントに命中別の確定情報がないため、`effects=[]`のまま（将来別途実装）。
- `presentation/legacy-attack-to-v2.mjs`は従来イベントの**非破壊変換**。整合しない内容/別キャラの試遊データなら`null`へ倒す。Firebase送信に`schema=2`の本体変更を強制しない。
- `ui/match-stage.mjs` → `ui/battle-vfx.mjs` → `presentation/action-choreography.mjs`まで**V2の不変結果を読み取り専用で渡す**。旧画面イベントと併存し、従来画面表示・集計ダメージを変えない。`scenePlan.actionOutcomeV2`とDOMの`data-outcome-schema`で自動QA可能。
- `tests/action-outcome-v2.test.mjs`を追加。MISS、KO中断、ありえないHP/偽状態の拒否、未知キャラ拒否、旧スナップとの不変性、実ホスト→実画面演出の一気通貫など**6ケース**。過去の619テストに追加。
- **実行と演出の時間はまだ独立していないヒット表示の段階**：1ヒットごとのメタデータは保存済みだが、映像上は従来の集約ヒット演出を続ける。原作ヒット間隔の秒数は未確定。
- 今回の変更は**戦闘イベントの翻訳と表示側の検証**であり、旧ホストのRNG、HP、妖気、行動順、Firebaseの通信契約、学校Google Sites版、mainを変えていない。
- **検証済**（契約モジュールを`contracts/`へ分離したコード、コミット`fe70ca419`）：[Research Unit 625/625 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40548481623)、[Chromium Stage QA PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40548481738)、[Firebase emulator QA PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40548481443)、[Sites online emulator/build QA PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40548481405)。
- **注意**：今回のFirebase QAには旧匿名認証を利用する研究経路も含まれる。学校向けの**AuthなしFriends実戦2台**をこの合格だけから断言しない。学校Safari実機未検証。現在の表示は旧画面の集計ヒットで、ヒットごとのアニメ再生はまだ。原作の時間は未確定。
- **途中の失敗も記録**：`presentation/action-choreography.mjs`から`engine/`へ共通契約を直接importしてしまい、[アーキテクチャ境界テストが失敗](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40548270683)。テストを弱めず、`contracts/action-outcome-v2.mjs`へ移動し、以後625件全合格で再確認。

## 次する作業（Phase 1 / サブステップ1.3）
**最優先は新V2結果を参照して命中ごとに見せる処理の設計と原作比較**。ただしヒット間隔や追加効果の裏付けがない箇所は再現済みとはしない。並行して、攻撃処理本体の1技を新しい共通技データで処理できるよう移行し、同一seedの従来結果と比較する。次に特殊攻撃の共通化を始める。

## 前回までの作業記録（Phase 1 / 通常攻撃の最初の縦切り）

### 実装
- 新規 `presentation/legacy-attack-outcome.mjs`：原作への裏付けのない命中を増やさず、既存ホスト`attack`イベントの`multiHit.hits[]`から**命中/会心/HP前後/ダメージの記録済み事実のみ**を抽出。現行レンタル6体の識別ID・名前・5ステータス・技威力を正規台帳と照合できた場合にだけ`moveId`を付与。カスタムチーム・データ欠落・矛盾する記録は`null`へ倒す。
- `ui/match-stage.mjs`：表示用`makeStageView`でイベントを**複製し、投影だけを追加**。オンラインの`MatchProtocol`や`game.snapshot()`は不変更。原作風の画面で`data-move-id`/`data-recorded-hits`を追跡できるが、内部技IDをユーザーに表示しない。
- `ui/battle-vfx.mjs`：従来の単発集計キューに`moveId`と順序のある`hitResults`を追加。描画演出は従来のまま。
- `presentation/action-choreography.mjs`：**既存ホストの結果のみ**を保持する表示計画メタデータ。今回はヒット別の独立アニメーションはまだ無し。
- `tests/legacy-attack-outcome.test.mjs`：2ヒット、MISS→KO途中停止、既存イベントの改変なし、カスタムチーム拒否、古いイベント互換、**実`createMatchProtocol`→`makeStageView`→`latestBattleCue`→`planActionChoreography`**の通しを確認。

### 原作との関係
- 現行レンタルの攻撃・ヒット回数は**試遊用fixture**。原作のジバニャン等の必殺ヒット数を推定・付与しない。
- 現在の正規ホストイベントの`amount`と`multiHit.hits`を再現/転写するだけ。戦闘効果処理・ホスト時間・Firebase・サークル入力は変更しない。**原作再現度が数値的に上がったと断定しない**。
- この`legacy-attack-projection-v1`はV2の正規`ActionOutcome`の代わりではなく、**V2へ段階移行するための読み取り専用アダプタ**。

### 品質・証拠
- 初版通しテストコミット`3a412a3a`： [Research unit 619/619 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40546323564) ＋ [実Chromium Stage QA SUCCESS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40546323613)。
- 最終の識別照合修正 `97a115e` まで含む[研究単体 619/619 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40546708006)・[実Chromium Stage QA成功](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40546708048)を確認した。カスタムチームの数値偽一致もテスト済み。
- Google Sitesの学校iPad 2台はこの新コードで未検証。GitHub ActionsのChromium描画QAが実Safari検証の代わりとは限らない。

## 以前の次工程（V2導入前に記した計画）
1. **ActionOutcome v2の正規スキーマを、旧ホストイベントと無矛盾なデータに絞って定義**し、通常攻撃の1ヒットを新形式にしたときも同じゲームの決定的状態・ヒット結果を保持できるテストを追加。
2. 次に通常攻撃の単発→多段で**命中ごと表示**をつなぐ。画面表示側で架空のダメージを生成しない。
3. 原作資料と実際の第1試合のタイムコードを使い、ヒット間隔・動作時間を確定できるところと未確認なところに分ける（相手視点は保留）。
4. Firebase実2ブラウザと学校Sitesビルドを再検証してから初めて配布候補とする。本人の依頼なしに学校版は差し替えない。

## 参考
- [ARCHITECTURE_V2 全体設計](./ARCHITECTURE_V2_SOURCE_FIRST_FULL_BATTLE_BLUEPRINT_20261028.md)
- [ADR-0004 技スキル台帳](./ADR_0004_MOVE_SKILL_REGISTRY_V1_20261028.md)
- [HANDOFF_LATEST](./HANDOFF_LATEST_20261027_PHASE50.md)
