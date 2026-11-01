# Phase38｜別チャットで共有済みのFirebase実ルール（2026-10-22）を回収・再現・本番読取診断

**日時:** 2026-10-26 / **対象:** `mygame-df915`（BRAWL・小国戦線III・妖怪対戦が使うRealtime Database）。

## 根拠の階層
- **2026-10-22の別チャット**（3Dフットサル開発・Firebase Consoleスクリーンショット）の記録に以下のRulesが登場。
- **2026-10-25の別チャット**で本人は「以前確認した現行ルールから変更なし」と回答。
- したがって**「本人が過去に示したルール」**は確認できる。しかし、この回答時点で**管理者権限による2026-10-26の本番Security Rules全文取得は未実施**であり、現在の実設定が同一とは断定しない。

```json
{
  "rules": {
    ".read": "now < 1794063600000",
    ".write": "now < 1794063600000"
  }
}
```

このミリ秒値は**2026-11-08 00:00 JST**（UTC 2026-11-07 15:00）の境界。**11月8日午前0時になった瞬間にこのルールによる読書き許可が失効する**。運用中の他のゲームにも影響する。11月8日を過ぎてもプレイする場合、ルールの再検討が必要になる。本人が変更したかどうかは現在分からない。

## 原作ゲームのFirebaseとの整合
- BRAWL: `https://mygame-df915-default-rtdb.firebaseio.com/` / Firebase RTDB、Firebase Auth不要。
- 小国戦線III: 同じRTDB `shokokuRooms1v1`、Auth不要。
- 妖怪対戦 Phase37: 同じRTDB `yokaiRoomsV1`、`--friends`生成HTMLで Firebase App+Database SDKだけを利用、Auth不要。ランダムな16byte IDは座席の識別ラベルであり認証機構ではない。
- [Firebase公式Rules](https://firebase.google.com/docs/database/security)では親ノードで読書きを許可すると子へ継承する。**過去のroot Rulesが実際に現在有効なら、`yokaiRoomsV1`を追加するために別のRulesデプロイは不要**。逆に本番に独自`yokaiRoomsV1` Rulesを追加しても、rootの公開許可を打ち消せない。
- これはルーム番号を知る者や第三者から操作される可能性がある**身内・短期テスト専用の構成**。無期限の無認証データベース公開を推奨するものではない。

## 今回の実検証・実装
1. `network/emulator/database.historical-20261022.rules.json` を別チャットのRulesと**全キー一致**させて追加。**ローカルdemoエミュレーター専用**。他ゲームのデータベースには適用しない。
2. `network/emulator/firebase.historical-20261022.json` からこのRulesでFirebase Emulatorを起動する。2026-11-08 00:00 JSTより前なら既存 `tools/sites-online-smoke.mjs --emulator-friends` を実行し、**実Chromeの2つのsrcdoc iframe**でルーム作成→参加→操作ACK→自動戦闘→切断・復帰が通ることをチェック。期限が切れた後のCIでは**旧Rulesは失効したものとして試遊試験をスキップ**し、期限切れを明示する。
3. `tools/firebase-school-readonly-probe.mjs` は**実Firebaseに対して完全読み取り専用**の到達テスト。固定の非ルーム診断用キーへの**未認証GET 1回だけ**実施し、HTTPステータス分類だけ出す。**既存対戦データ、レスポンス本文、ユーザーID、認証トークンを読み取らず、roomを新規作成せず、書込・削除・Rules変更・課金変更を行わない**。これで**GitHub Actionsからの未認証READの現況**は限定的に診断できる。**未認証WRITE、Google Sites iframe/iPad Safari実通信、現在のRules全文は検証できない。**
4. すべて [Phase37 Friends workflow](https://github.com/8mahi8/yokai-battle-lab/actions/workflows/phase37-firebase-friends.yml) で走らせ、公開版はそのまま。過去のルールが何であれ、`tools/preview-shared-rtdb-rules.mjs --friends` がroot公開を拒否するのは正しい。**既存の開いたrootを残す限り、子ルートでセキュリティ境界を作れない**ため。

## 次の判断
- GitHub ActionsのREAD-only GETがHTTP200でも「実DBで書込可能」「学校Safariで動く」「実Rules全文を取得した」とは言わない。
- 学校で部屋作成・参加が通れば**Google Sites版の2人対戦**としてはまず合格。ただし11月8日以降は現Rulesの期限が切れるため、利用継続には再設定が必要になる。
- 2026-11-08までの短期試遊では、**本人の既存Rulesが変わっていなければ、本番Rules・Auth設定を触らずPhase37 `--friends`を試す**のが最短ルート。
- 保存・配布が必要ならTXTとHTMLを**別々**にGoogle Drive保存する。本人の明示的な配布依頼より前にGoogle Sitesや本番設定を勝手に更新しない。今はGitHub開発ブランチの変更のみ。


## 2026-10-26 実行結果（Phase38 PASS）
- [GitHub Actions **#40327052173**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40327052173) 全ジョブPASS。
- **元の厳しい実験用Rules**でも `FIREBASE-FRIENDS-NOAUTH-PASS`（2人で作成/参加/入力/状態）と `SITES-FIREBASE-FRIENDS-EMULATOR-PASS`（実Chromium 2 iframe）を再確認。
- **2026-10-22のスクリーンショットと全文一致する「期限付きroot .read/.write」ルール**を別のローカルFirebase emulatorに適用し、同じ**実Chromium 2 iframeでGoogle Sites型コードの認証なし作成→参加→試合操作→切断復帰PASS**。ログに `HISTORICAL-RULES-EXACT-MATCH`、二度目の `SITES-FIREBASE-FRIENDS-EMULATOR-PASS` を確認。これは**当時のルールが現行だった場合の互換性実証**。
- **実本番RTDBへ無認証GET** 1回：`FIREBASE-SCHOOL-READONLY {"status":"UNAUTH_READ_HTTP_OK","httpStatus":200,"readOnly":true,"bodyInspected":false,"writeTested":false,"schoolSafariTested":false}`。空の診断用非ルームキーに対する読取だけで本文は捨てた。**現在の本番Firebaseの認証なしREAD経路はGitHub Actionsから成功した。**
- **未検証**：本番WRITE、現在のRules本文、学校iPad SafariからのRTDB通信、本物のGoogle Sites iframe、長期安定、11月8日以降の利用可否。Firebaseの本番データとRules、学校サイト、GitHub mainは無変更。
