# Phase37｜学校iPad優先：BRAWL/小国戦線と同じFirebase RTDB・匿名認証不要の友達対戦方式（2026-10-26）

## なぜ変更するか
本人は2026-10-26の学校旧iPad Google SitesでSupabase版の`匿名認証できません：Load failed`を報告。「友達同士で遊ぶだけ。以前学校で動いたFirebaseに戻してほしい」と指示。本ゲームの最優先は**学校のSafariで2人がルーム番号を入力して対戦できること**。セキュリティのために基本通信を不必要に複雑化しない。ただし既存ゲームを巻き込む全DB権限変更は不可。

既存学校向けの
- [BRAWL 実際のGoogle Sites用HTML](https://github.com/8mahi8/brawl-bot-playtest/blob/main/sites/BRAWL_FRIENDS_1vs1.html)
- [小国戦線IIIのFirebase通信](https://github.com/8mahi8/shokoku-sensen/blob/main/online-net.js)
を直接監査。どちらも`mygame-df915`の `https://mygame-df915-default-rtdb.firebaseio.com/` にアクセスし、後者は`firebase.initializeApp({databaseURL:...})`、`firebase.database()` とブラウザ生成のclientIdを使用。**Firebase Auth / 匿名ログインを必須にしない旧式が実在する**。

Firebase公式：
- [RTDB rules / デフォルト拒否](https://firebase.google.com/docs/database/security)
- [Authのない操作ではauth=null](https://firebase.google.com/docs/database/security/rules-conditions)
- [親のRulesの許可は子へ継承](https://firebase.google.com/docs/rules/rules-behavior)
公式仕様上、**認証なしで使うには該当RTDBのRules側が未認証の通信を許す必要がある**。URLだけ入れれば使えると断言しない。

## 実装（開発ブランチ限定）
- **既存の** `network/firebase-room.mjs`、`network/firebase-match.mjs`、`engine/match-protocol.mjs`、`ui/match-stage.mjs`、`yokaiRoomsV1` を再利用。新しい独立ゲーム/別サーバーを作らない。
- `lab/sites-embed-online-entry.mjs` に**ビルド時だけ選択するFriendsモード**を追加。`signInAnonymously()`、`auth.setPersistence`などをこのモードから除去。各タブごとに`crypto.getRandomValues`で16バイトのランダムIDを作る（本人確認の証明ではなく座席ラベル）。ルーム/戦闘/ゲスト入力/ACK/プレゼンスは既存アダプタを使う。リロード後の再入場は不要。友達用戦闘で**playtestSoulTuningと6体スキル**をON（原作未確定の数値は仮値）。
- `tools/build-sites-online.mjs --friends` は既存のBRAWL/小国戦線用URLを使い、**Firebase app + databaseだけ**の2本のCDN SDKでGoogle Sitesの**直接貼付用HTML**をビルドする。ユーザーのGoogleログイン/Firebase Authは要求しない。これはビルド生成だけで学校へ配布・Google Sites更新しない。
- `--emulator-friends` は localhost限定・demo-yokai-lab用ビルドで、絶対に学校へ配布しない。
- `network/emulator/database.friends-noauth.rules.json` は**研究用サンプル**、`network/emulator/firebase.friends-noauth.json` は専用エミュレーター接続。このRulesを本番の共有 `mygame-df915` へ丸ごと反映することを**禁止**する。
- `tests/firebase-friends-noauth-emulator.cjs` は無認証ルーム作成・加入・試合開始・ゲスト操作・戦況/重複revision・他ゲームパス拒否を実RTDBエミュレーターで検査。`tools/sites-online-smoke.mjs --emulator-friends` は2つのGoogle Sites型srcdoc iframe（Google Sites本物ではない）で操作と切断→復帰を検査。CIは `.github/workflows/phase37-firebase-friends.yml`。

## 制約と他ゲーム保護
- 他ゲームと**Firebaseを共有するので、既存Rules全文を不用意に上書きしない**。専用 `yokaiRoomsV1` の必要最小限だけ調整。親Rulesが既に無条件許可していた場合、子の制限を後から付けても親許可は撤回できない。
- **認証なしではサーバーはホスト本人・ゲスト本人を検証できない。** browser-generated IDはゲーム内の座席ラベルに過ぎず、クライアント自身が任意IDを送れる。したがって他人が部屋番号を知れば戦況や操作を妨害できる可能性がある。身内限定・短時間・ゲームデータのみの許容範囲として割り切り、個人情報/秘密鍵/ほかのゲームデータは記録しない。
- RTDBのルールと書込みは接続されたFirebaseプロジェクト全体の費用・運用にも影響する。ルール変更が必要になった場合も他ゲームの通信を壊さない差分だけレビューする。
- **本番Firebaseの実Rulesをまだ取得していない**。旧運用Rulesに11月8日ごろの期限があったという記録もあり、現況は未確認。無料枠維持。
- Supabaseとその実DB/RLS/Authは今回変更せず、対策候補として保留。学校固定Phase27・配布済み診断版・学校Google Sites公開ページ・GitHub `main` も無変更。
- 元ゲームの原作仕様再現、ノーモーション表示保留、未確定フレームの研究優先は維持。最新版Google Sites用TXTとHTMLを別々にGoogle Driveへ保存するのは**本人が明示的に配布を依頼した時**。

## 学校での判断
1. Firebase Friends版でルーム作成が成功すれば、匿名Authが不要なRTDBルートを使えたということ。ただしこれだけではSupabase `Load failed` の唯一の原因が匿名Authだったとまでは証明しない。
2. `PERMISSION_DENIED` が出れば、RTDB URLは届いているがサーバーRulesが未認証クライアントを許していない可能性。現行Rulesを**読み取ってから**必要な差分だけレビュー・反映する。
3. `Load failed`/読み込み不能ならFirebase SDK/CDN/学校Wi-Fi/iframeなどを調査。学校ネットワークの制限を回避するような設定変更は勝手にしない。
4. ホスト/ゲスト両方でゲーム開始→操作ACK→勝敗まで実学校iPad2端末で成功するまで「学校版完成」と呼ばない。

## 検証
- 従来の匿名Firebaseエミュレーター版・Supabase版に影響を与えない、ビルド時条件分岐。
- 2026-10-26 Phase37初回CIでは `--emulator-friends` のSDK Auth 9099ゲートが旧検証条件に残りビルド停止。FriendsモードではAuthエミュレーターを使わないため、`tools/build-sites-online.mjs`のゲートを修正。
- [Phase37 friends Firebaseエミュレーター/2画面CI](https://github.com/8mahi8/yokai-battle-lab/actions/workflows/phase37-firebase-friends.yml) を必ず確認し、完了結果を追記。CI成功でも**学校実機成功ではない**。
