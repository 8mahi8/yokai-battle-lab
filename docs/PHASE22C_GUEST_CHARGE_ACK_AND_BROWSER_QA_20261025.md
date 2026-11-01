# Phase22C｜ゲストの必殺入力ACKと実発動を分離・Chrome 2席E2E（2026-10-25）

## 位置と目標
ゲームの原作PvP戦術（Phase21D/22A）→ **Phase22Bで正規2席ホストの4チャージ・消費成功** → **Phase22Cでゲストの送信結果とチャージ途中/完了を明確に区別** → Phase23 Firebase通信安定 → Phase24 学校旧iPad Safari、Google Sitesに単一HTML/CSS/JSを「コードを埋め込む」で直接貼る。

原作のチャージ操作類型は前回調査済みの[攻略記事](https://game8.jp/youkai-watch2/504498)に基づく。**チャージの正確な必要回数やつつく妖気回収量は未確定。** 今回の修正は元ゲームの数値仕様ではなく、既存ブラウザゲームのホスト判定・ゲスト表示・通信信頼性。

## 調査で見つかった問題
- `engine/match-protocol.mjs`の権威側`dispatch`結果には`chargeInput`の`completed`（タッチ途中か最後か）があるが、クライアントに届く`snapshot.lastCommandOutcomes[seat]`には`applied`しかなかった。
- ゲスト`network/firebase-match.mjs`の受信`onAck`も`applied`しか公開しなかったため、UIは「入力を対戦に反映」としか言えない。**入力が通った≠必殺発動**。Firebaseへ書き込んだだけの状態を成功と扱ってもいけない。
- `ui/match-stage.mjs`でもホスト自身の`receipt.accepted`を一般に「操作を確定 / rev」と表示していた。通信ACK/ゲーム成功/タッチ進行を混同する可能性を直した。

## 実際に変更したもの
1. `engine/match-protocol.mjs`: 正規`chargeInput`のルール結果が`completed:boolean`と分かる場合のみ、`lastCommandOutcomes`にその値を付加。送信された座標・イベント順・Soul消費・ゲームステート指紋・クライアントの操作権限は変更しない。**途中タップで成功を捏造しない**。
2. `network/firebase-match.mjs`: ゲストが自分の送信seqと一致する承認済みホスト結果を受けたときだけ、検証済み`completed`を`onAck`へ渡す。欠損や古い判定は`applied:null`のまま保留。
3. `ui/match-feedback.mjs`: 正規の確認結果に応じて「必殺チャージ開始」「まだ発動していません」「必殺チャージ完了：わざを発動しました」「中止」「未確認」「拒否」を区別。
4. `ui/match-stage.mjs`: ホスト自身も`receipt.result`と対応する操作種を確認して判定文を表示。ホストがルール違反により拒否した操作を成功とは表さない。ゲストは従来どおり正規ホストのsnapshotでのみゲーム画面更新（楽観的ローカル進行はしない）。
5. **安全なブラウザ試験専用**：localhostのみで開ける`lab/firebase-match-stage.html?phase22c=1`は、Soul容量5・強制ガード・seed12の**明示された試験用フィクスチャ**をホストへ設定可能。通常画面・学校Google Sitesへは一切設定を持ち込まない。
6. `tools/firebase-charge-smoke.mjs`新規：実際のChromium内**匿名認証2席、Firebase Auth+RTDBローカルエミュレーター**で、ゲストB1が前衛→チャージ開始→**6回の実PointerEventタップ**→途中5回はゲージ維持と「まだ発動していません」→6回目のみ発動完了→ホスト/ゲスト両画面でゲージ消費を照合。`.github/workflows/phase14-firebase-browser.yml`に常時必須のブラウザQAとして追加。

## 自動テスト
- `tests/match-feedback.test.mjs`：途中入力/完了/取消/未確認/拒否のメッセージ分離（新規1件）。
- `tests/firebase-match.test.mjs`：研究用合法ガードで妖気が貯まるまでホストを進め、ゲストの必殺開始を権威側で許可、途中5入力の`applied:true, completed:false`、最後の1入力だけ`completed:true`を検証。途中1パケットのACK受信を意図的に落とし、**同じ入力番号の再送でゲージ/チャージが二重に進まない**ことを確認。最後は0になりjournal replayが一致（新規1件）。妖気不足で正規ホストから`soul_not_full`と拒否されたときにもゲストに成功と出さないケース（新規1件）。
- Node総数は先行451件＋新規3件＝**454件**。コード変更の実行ログはGitHub Actions参照。
- Firebase2ブラウザ試験はエミュレーターのみ。**本番Firebase、Google Sites埋込、学校iPad Safari実機、原作3DSの実フレーム再現を証明していない**。

## 守ったルール
ユーザーとその友達の本番プレイ体験を勝手に変えない。変更先は`feat/phase1-action-circle-lab-20261023`だけ。`main`、Googleサイト版、本番Firebase、料金/連携設定/閃光魂の初期OFF状態には変更なし。画面の基幹配置、レンタル6体も維持。

## 次
1. **22C追試**：Firebaseエミュレーター上の実2端末ゲスト画面のブラウザ試験から得られた失敗条件があれば、通信側を修正して同じCIを成功させる。
2. **22D**：ノーモーション必殺、カウンター必殺・輪の回転・同着・割込みタイミングを、対人実機映像と研究用独立コードのイベント窓で照合する。未証明の技やタイミングを本番へ混入させない。
3. **21D残**：つつく妖気吸収の受取先/量・攻撃/妖術/後衛の増減数値は原作で未確定。根拠を見つけるまでオンライン通常ルールへの実装はしない。
4. **23/24**：学校の古いiPad Safariで友達と2席実機、Google Sitesの直接HTMLコード埋め込み。サイトへの公開はユーザーが実施する。

**君の操作は現段階で不要**。
