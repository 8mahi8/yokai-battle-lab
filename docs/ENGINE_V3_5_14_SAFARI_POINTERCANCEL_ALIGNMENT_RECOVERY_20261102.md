# 妖怪ウォッチ2 Engine V3-5-14｜Safari操作中断時の時計合わせ誤成功と再開不能を修正（2026-11-02）

## なぜ今回これを優先したか

学校iPad Safariから、原作にある4方式の必殺チャージを操作する。V3-5-13までに、既存の`spin/tap/trace/align`全4方式をFirebase無認証実二席 + Chromium Pointer操作から完遂し、ホスト正規妖気消費/必殺発動を確認した。ただし、端末の画面回転、アプリ切替、手のひらの誤認識などでブラウザが発行し得る**`pointercancel`**は未受入だった。[MDN pointercancel](https://developer.mozilla.org/en-US/docs/Web/API/Element/pointercancel_event)／[W3C Pointer Events仕様](https://www.w3.org/TR/pointerevents3/)。

現行`ui/match-stage.mjs`は`pointercancel`と`lostpointercapture`を`finishPointer(event,true)`へ送るものの、非タップ操作すべてに**正規`gesture:{type:'up'}`**を送信していた。ところが`engine/charge-input.mjs`の時計`align`に限り、`up`は**手の位置が目標数字に近ければ1回成功する判定**。意図しないブラウザ中断が、成功判定と妖気消費・必殺技の一部進捗につながる恐れがあった。

## 先に見つかった制約／許可境界

最初に`gesture.type='cancel'`という専用入力を試験的に追加したが、**既存の`network/emulator/database.friends-noauth.rules.json`は入力ジェスチャーの種類を`tap/down/move/up`だけに制限している**。Firebase実二席ではゲスト側の書込みが**`permission_denied`**になり、リアルなRules/接続と互換性がないことを確認した（初回[失敗ログ](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41328913280)）。本番Rulesを変更したり、現行認証・通信を作り直す合理性はないため、この専用入力案は**完全に撤回**。エンジンとプロトコルの`cancel`許可も取り消して、今までのRTDB 4種類を維持した。

## 最終的な小さな修正

1. **`ui/match-stage.mjs`**：非タップ入力の中断では従来どおり`up`で動作を終えるが、**`kind==='align'`で`cancelled=true`の場合だけ`up`を送信しない**。その他の指の離し方・正常な`pointerup`は変更せず、ボタン/ドラッグ/タップの既存UIを維持。
2. **`engine/charge-input.mjs`**：時計の`down`処理の入り口で、**前のドラッグがまだ`active`のまま新しい`down`が来た場合にだけ、描画上の手の角度を12時（`-Math.PI/2`）に戻し、それから通常の「針の近くに触れたか」の判定**を行う。中断でホストに残った前回の手位置が次の合法タッチを妨害する、もう1つの不具合を解消。従来どおり実`up`が来なければ`count`は増えず、成功に必要な3回の閾値やSoul・RNG・技威力・行動時間は変えない。
3. **`tests/v3-5-14-pointercancel-contract.test.mjs`（新規3件）**：オンライン`normalizeMatchCommand`は**`cancel`を受け付けず、既存4タイプだけ**／Stageは中断時計時に成功の`up`を送らない／ホスト`align`に前ストロークの残骸があっても新しい正規`down`から再開できる／trace・purifyの従来`up`終了は変えないことを検査。
4. **`tools/sites-online-smoke.mjs`**：実`?chargecycle`の3番目の`align`開始時、Guestが本当に時計針を目標数字へ動かし**`pointercancel`**を発生させる。追加のFirebaseコマンド/ACKなしでホストの`challenge.count`が**増えず、妖気が100%のまま**、次の実Pointer down/move/upで1回を得て最終的に3回成功→正規必殺を発動するまで検査。同じ部屋の`spin/trace`2回と`align`1回が正規Hostイベントとして成立したか、ゲストのSoul消費と敵HP変化も検証。

`lab/match-stage.css`のタッチパッドにはすでに`touch-action:none`があり、このCSSは変更不要。Safari固有の表示時間などを推測で調整しない。

## 最終CI結果・作業範囲

- **ゲーム/QAソース最終検証HEAD `f42740120c3d3169d202be5fe9e7c33d3f187f79`**。
- [**Node 953/953 PASS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41329695172)。
- [**実Chromium Stage 16/16 PASS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41329691071)。
- [**Firebase No-Auth＋Chromium2席（通常Rules + 保管済み2026-10-22旧Rules再現）各1回、全2回連続全工程PASS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41329695160)、[別の同SHA ActionsもPASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41329691051)。`SITES-FRIENDS-CHARGE-CYCLE-PASS`が両試行成功し、今回追加の時計中断→再開を実ブラウザHost/Guestで通過。既存`SITES-FRIENDS-CHARGE-PASS`、`SITES-FRIENDS-G-CHARGE-PASS`、`SITES-FRIENDS-PURIFY-PASS`、`SITES-FRIENDS-PURIFY-CYCLE-PASS`、`SITES-FRIENDS-FULL-MATCH-PASS`、`SITES-FRIENDS-ONE-GAME-PASS`も両条件PASS。
- 本番Firebaseはread-only GET HTTP200の記録のみ。**本番書込み・現行Firebase Rulesの内容直接取得・学校のiPad Safari実機2台での手指操作・Google Sites本番埋込は未検証**。今回の試験はLinux実Chromiumの`srcdoc`とローカルFirebase RTDB Emulatorで、Safari実機の動作を証明したと扱わない。
- **GitHub開発ブランチのみ更新**。学校の稼働Google Sites HTML、本番Firebase Security Rules/DB/Auth、main、Google Drive配布は無変更。2026-11-08 00:00 JSTの期限が記録されているのは**過去Rules写しだけ**で、現本番Rulesとの同一性は未確認。

## ロードマップと次工程

**V3-5-14完了、V3-5全体は未完成**。V3-5-15以降は、極端に低頻度な例外を網羅するよりも、**原作の対戦画面/技/行動時間/キャラクター能力と学校向け現実装の主要ギャップ**を、出典・ユーザー提供動画の既存観察台帳・現コードから優先順で洗い出し、原作由来と研究仮実装を混同せず重要な差に絞って進める。元MP4原本をこの工程で直接見ていないことを維持。学校iPad Safari二台での一試合実機プレイが可能になったときは最優先で回帰/UXを確認する。実機未検証を理由に架空の指操作調整をしない。
