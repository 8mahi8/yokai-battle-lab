# 妖怪ウォッチ2 Engine V3-5-2｜学校Friends必殺技の「妖気消費だけ・効果なし」を解消し、実Firebase2席6タップをE2E検証（2026-10-30）

## 原作照合・今回優先した機能

- [レベルファイブ公式「妖怪とバトル」](https://www.youkai-watch.jp/yw2/game/game06.html)：ひっさつチャージを完了→技発動。零式Gわざは前衛妖気がたまっていると使用でき、敵をつつく操作もある。
- [Game8「必殺技の使い方と妖気ゲージの回復方法」](https://game8.jp/youkai-watch2/504498)：妖気満タン→わざ選択→タッチ式パワーチャージ→必殺発動の一連の操作。
- [攻略大百科「零式でできること」](https://gamepedia.jp/youkai-yw2/archives/1873)：Gわざは本人と両隣の妖気を使う別系統の技で、標準必殺と同じではない。現行レンタルのG効果値を原作の厳密な値と断定しない。
- 本人の第1原作対戦動画[観察台帳](./ORIGINAL_PVP_VIDEO_20261027_MATCH01_OF04.md)の00:43〜00:52では**ひゃくれつ肉球のチャージ/発動→専用カットイン→命中とHP変化**。今回のMP4原本直接視聴は不可能なため、過去の直接観察台帳とコード/公式資料の照合であり、実フレーム比較ではない。

## 重大な既存不具合をコード監査で発見

学校向け`lab/sites-embed-online-entry.mjs`はFriendsモードのHostを`createMatchProtocol({battleOptions:{playtestSoulTuning:true,enableLoafing:true}})`で起動していた。正規`engine/combat.mjs`では**`researchSpecialEffects=false`がデフォルト**であり、`resolveSoultimate()`は、タッチチャージ成功でも妖気を消費した直後に`{effectStatus:'unimplemented'}`を返して**敵への攻撃・回復・状態効果を発動しない**。過去のテストは「妖気消費とUIメッセージ」の成功と「必殺効果の発動」を混同していた。

ユーザーが希望する原作の「必殺を打って試合を動かす」体験を破壊するため、本工程で優先して修正。

## 実装したもの

1. **学校向けFriends Hostの既存プレイテスト必殺処理をON**：`playtestSoulTuning:true,enableLoafing:true`は維持し、`researchSpecialEffects:true,researchDamageModel:true,researchStatInspirits:true`を付ける。既存`engine/combat.mjs`の6レンタル必殺・効果コミット・Hostイベントをそのまま使い、チャージで妖気だけ消える状態を解消。**重要な副作用：**`researchDamageModel:true`で通常攻撃/妖術のダメージ計算も研究モデルに切り替わる。状態強化・弱体化を含む6つの必殺効果が依存する既存統合機構の設定を使っているため。原作のダメージ計算と完全一致したわけではなく、今後の実戦バランス・回帰試遊で評価する。**本番の学校Google Sites版へは未適用**、開発ブランチ保存のみ。
2. **エミュレーター専用の決定的Host fixture**：`__YW_EMULATOR_MODE__&&__YW_FRIENDS_MODE__`かつlocalhost埋込親ページ`?charge`の時**だけ**、以前Phase22Cで使ったSeed12・全ガード・妖気上限5の6v6、効果実行用の研究フラグを選ぶ。これは**テスト用の速い妖気蓄積**であり、学校の本来の妖気上限/確率を変更するものではない。ブラウザからは実`match.advanceAuto`の制御のみ可能、Host正規HPやSnapshotを改変するテストフックはなし。
3. `tools/sites-online-smoke.mjs --emulator-friends`に**別の新しい本物のChromium/2つのGoogle Sites型srcdoc iframe・認証なしFirebase RTDB room**を追加。6桁ルーム→自動ゲスト接続→Hostによる正規ガード2行動→両席B1妖気100%→ゲスト画面`わざ`+B1→実指タップをポインターイベントで6回→6件それぞれのHost/GuestのACK→両席妖気0→**Hostに`special`イベント・相手HP変化**→ホスト/ゲストともカットイン表示・同じ必殺名→発動成功ACK。
4. `tools/chrome-realtime-qa.mjs`はlocalhost-only URLホワイトリストに**`/qa?charge`だけ**を追加し、明示した失敗を検知できるようにした。リモートURLを実行できない既存のCDP read-only設計は維持。
5. `tools/build-sites-online.mjs`に**通常`--friends`成果物へエミュレーター専用`__ywFriendsChargeQa`が混入すればビルド失敗**、`--emulator-friends`に無ければ失敗という双方向ガードを追加。初回CIで学校版漏出を検知し、明示`__YW_EMULATOR_MODE__`条件で死コード除去して修正済み。
6. `tests/v3-5-2-friends-special-effect-regression.test.mjs`を追加。**本番FriendsのHost起動オプションに必殺効果の3フラグが保持**されること、実`createCombat`で通常レンタルA1の妖気消費→HP減少・Host`special`イベント→表示Cue成立を回帰テスト。原作個別技の多段回数は新規作成しない。

## 検証の根拠と境界

- [**実Firebase No-Auth二席・原作式の6タップ・Host効果・両Cut-in PASS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41063794276)（Host B1の妖気満タンに**正規2行動**、6件Guest touch ACK、Host Specialと両視点Cut-in、実相手HP変化が確認できる）。
- [**Stage Chromium QA PASS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41063783525)：既存1試合と原作UIの回帰。
- [**全Nodeテストの結果**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41064107772)：新規2件を追加。最新CIの成功/失敗と件数を確認してから最終報告で明記する。
- 従来の試験的なSeed12は原作のキャラ・妖気容量・タイミングを表さない。**通常`--friends`はデフォルトのレンタル6体の妖気容量・攻撃率を使用**し、Hostの効果フラグを変更しただけ。
- 本物の別々の学校iPad/Safari、学校Google Sitesへの直貼りと長時間1試合、原作録画MP4の逐フレーム比較は未検証。エミュレーターの同一Chromium2席・単体HTMLでの成功を学校本番動作と混同しない。
- 重要な残り：同じFirebase Friends E2Eで**零式Gわざのチャージ完了/3体妖気消費と効果、悪いとりつき→後衛おはらいタッチ完了→Host状態解除**はまだ未検証。技固有威力とHit回数・内部秒数・モーション中の相手画面保留も原作一致未達。

## 次工程 V3-5-3

まず今回の本番Friendsモードで有効化した効果が**バランス・状態異常・回復・勝敗の通常プレイ**を壊していないか、共通エンジンの標準6体で回帰し、**零式Gわざの3人分の妖気消費とHost効果**を認証なしFirebaseの実二席QAで検証。次に後衛の負とりつき状態へおはらいを通す。ブラウザに偽状態を注入しない、必要ならlocalhost研究fixtureを拡張するだけ。

開発ブランチ`feat/phase1-action-circle-lab-20261023`のみ。学校稼働Google Sites HTML、本番Firebase Rules/Auth/DB、GitHub main、Google Drive配布は**変更なし**。
