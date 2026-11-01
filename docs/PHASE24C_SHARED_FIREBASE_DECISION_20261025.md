# Phase24C Firebase共用方針へ変更（2026-10-25）

## 今回の決定
**既存のFirebaseプロジェクト `mygame-df915` をそのまま共有する。新規のFirebaseプロジェクトは作らない。**

根拠となる過去のGitHub実装：
- [BRAWLのGoogle Sites直接埋込コード](https://github.com/8mahi8/brawl-bot-playtest/blob/main/sites/BRAWL_FRIENDS_1vs1.html) は `https://mygame-df915-default-rtdb.firebaseio.com/` を使用。
- [小国戦線IIIの通信コード](https://github.com/8mahi8/shokoku-sensen/blob/main/online-net.js) も同一Firebaseの `ROOT='shokokuRooms1v1'` を使用。
- [小国戦線IIIの説明](https://github.com/8mahi8/shokoku-sensen/blob/main/README.md) に、BRAWLと同じRTDBを使い別パスへデータを保存する方針が明記済み。
- [妖怪対戦の現行コード](../network/firebase-room.mjs) の保存先は最初から `YOKAI_ROOM_ROOT='yokaiRoomsV1'`。**別の保存先を作り直す必要はない**。

| ゲーム | 共通RTDB | ルート |
| --- | --- | --- |
| BRAWL | `mygame-df915` | BRAWL既存のルームパス（手を加えない） |
| 小国戦線III | `mygame-df915` | `/shokokuRooms1v1` |
| 妖怪対戦 | `mygame-df915` | `/yokaiRoomsV1` |

**注意：データのパスが別ということと、Firebase Security Rules上の権限が独立していることは別。** RTDBの[公式Rules](https://firebase.google.com/docs/database/security)は親パスの広い読み書き許可が子に継承される。既存ゲームが使う権限を壊さず、`yokaiRoomsV1`に必要な匿名Auth／ホスト・ゲストの操作権限を確保するなら、**現在のRulesを先に取得して差分だけ設計する**ことが条件。

## 必要なこと／不要なこと
**不要:** 新規Firebaseプロジェクト、データベース、課金プラン変更、別ドメイン・別URL、GitHub Pages iframeでの公開。

**既存プロジェクトで確認するだけ:**
1. `mygame-df915`の**Webアプリ設定**（`apiKey`, `authDomain`, `projectId`, `appId`, `databaseURL`の公開用セット）。BRAWL・小国戦線は主にDatabase URLだけで初期化していたが、**妖怪対戦の現実装は`signInAnonymously()`を利用するためWeb Auth初期化設定が必要**。公開Web設定そのものは秘匿パスワードではない。
2. 同じFirebaseプロジェクトの**Anonymous sign-in** が既に有効か。
3. 現在のRTDB Rulesを**他ゲームのパスも含めて安全に保つ**形で、妖怪対戦の `/yokaiRoomsV1` に必要な読書きを追加できるか。`network/emulator/database.rules.json`は**研究用単独Rulesの例**で、**これを既存本番Rulesへ丸ごと上書きしてはいけない**。
4. 学校のiPadでGoogle Sitesの**コード直接貼付**と2端末匿名Authが通るか。旧端末は未検証。

## このターンで実際に行った静的検証
- `tools/sites-online-build-gate.mjs`に**既存プロジェクトID `mygame-df915` + 既存RTDB URL + 架空の`apiKey`/`appId`** を用いたビルドケースを追加。ビルドが`yokaiRoomsV1`に限定されたルームコードを含むこと、研究エミュレーターのURLが混入しないことを確認。
- **架空の公開設定だけでHTMLを生成する検証。実Firebaseへの接続・書込・ルール変更は一切なし。**
- 共通入口 `docs/PROJECT_MAP_AND_PROGRESS.md` に「新Firebase不要・既存`mygame-df915`を共用」を反映。
- Firebase既存のルームを閲覧したり削除したりすることもない。

## 次にすること
- 新規Firebase作成案は取り下げ、**既存`mygame-df915`の公開Web設定＋匿名Auth可否＋現行Rulesの確認**へ切り替え。
- 情報が取れ次第、Google Sitesへ貼れる実オンラインHTMLをビルドして試験する。ただし実サイトへの貼付・Firebase Rulesの本番反映は本人の承認範囲に従う。
- Google Sitesの公開版、`main`、既存BRAWL/小国戦線の通信処理を勝手に変更しない。旧iPad Safari実機の最終検証を別途行う。
