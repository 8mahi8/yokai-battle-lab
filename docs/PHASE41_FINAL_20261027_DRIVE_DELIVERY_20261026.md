# Phase41｜10/27学校試遊：Firebase認証なし最終版の検証とGoogle Drive保存（2026-10-26夜）

## 正式納品ファイル（Google Driveの実体をreadback確認済）
保存先フォルダ： [学校ゲーム / 妖怪ウォッチ2](https://drive.google.com/drive/folders/1xgKahjwoESrIam0JnbqUYivEQ2vyqiXO)
- [TXT / Google Sitesコード貼付用](https://drive.google.com/file/d/1hIRhAXGTu0qbrzJrT47syfKVARrlN3JP/view?usp=drivesdk)
  - ID `1hIRhAXGTu0qbrzJrT47syfKVARrlN3JP`
- [HTML / 同じソースコード](https://drive.google.com/file/d/1IYI1GPuYsVndR857V0trVSJ2JtJWiM8R/view?usp=drivesdk)
  - ID `1IYI1GPuYsVndR857V0trVSJ2JtJWiM8R`
- **両方とも191,574バイト。二ファイルの内容完全一致**、GitHub blob SHA `2b50cbad5a44c95595ecfbb908770778040327ec`。SHA-256 `16234a2f18c558a4a403d1c1531e4feb0198ae0d0d71e21fb07e33f832397ee1`。
- Google Drive metadata readbackでTXT MIME `text/plain`、HTML MIME `text/html`、両方 191574 bytes、非公開、正しい親フォルダを確認。旧版上書きなし。
- GitHub release専用ブランチ：`release/sites-firebase-friends-20261027-final`。txtとhtmlは同一Git blob SHAで、ZIPではない。
- 製品コードは正規 `--friends` ビルドから生成。Firebase Auth SDK/匿名認証なし。BRAWL/小国戦線IIIの既存Firebase Realtime Database URLを参照、`yokaiRoomsV1`独立ルーム。元Google Sitesページやルール/DB/mainは未変更。

## 受入検証
- [Phase41 最終ビルドCI #40337783300](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40337783300) **PASS**：Node **576/576成功**、実レンタル6体同士自然な決着を異なる4seedで再確認（約103–184自動行動）、学校版HTML静的チェック PASS、TXT/HTML一致。
- [Phase37 フレンド版オンライン Chromium 2画面＋Firebase Emulator CI #40334103575](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40334103575) **PASS**：Google Sites型srcdoc ×2で6桁ルーム作成→参加→ホスト開始→ゲスト自動接続→ホスト自動進行→サークル操作ACK→切断/復帰→一時停止。学校のGoogle Sites実ホストではない。
- [Phase24 従来 Firebase Auth版の回帰Chromium #40334103747](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40334103747) **PASS**。元の研究版を破壊していない。
- [Phase38 以前のFirebase公開期限ルールを模したRTDBローカル試験＋実Firebase未認証GET200 #40327052173](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40327052173) **PASS**。実本番writeは触れていない。期限付き `now < 1794063600000` が現行なら2026-11-08 00:00 JST失効。

## 明日2026-10-27学校での最短手順
1. **TXTファイルを開き、HTMLコードの全文をコピー**。GitHub/Driveのリンクではなく中身をGoogle Sitesの「埋め込む → コード」に貼る。公開版上書きより試遊用別ページ推奨。
2. 二人の旧iPad Safariで同じGoogle Sitesの公開URLを開く。ホスト「部屋を作る」→6桁を友達へ、ゲスト「参加」→ホスト「試合開始」。
3. **ゲストが自動で戦闘画面へ接続、ホストの通常行動が自動で始まる**のが本版の改良点。サークル操作・必殺・おはらい・つつく・敵HP変化を一回ずつ試す。長く遊べれば勝敗表示まで。
4. エラーが出たら「ホスト/ゲスト」「画面メッセージ」「どの操作で」を控える。オンライン/学校旧iPadの実成功は**まだ観測していない**。最後の本番検証は本人の実機操作が必須。

## ゲーム完成度の境界
友達1vs1試作品として機能構成は成立。元作の固有スキル、妖気・必殺条件の一部は原作正確値ではなく試遊用仮値。ノーモーションの原作相手画面演出遅延は研究モジュールのみでオンライン未統合。フル忠実再現とは呼ばない。旧iPad表示・本番Firebase write確認後の細部調整が残る。

## 中間転送データ
Google Docsの一時転送実験は元コードの行末表現を変えるため**採用せず**。ZIPアーティファクトから本体ファイルを直接抽出し、ローカルでGitHub blob SHAとバイト一致を確認してDriveにTXT/HTMLを別々にそのまま保存。一時Docはアップロード成功後に削除した。ユーザーの旧Google Driveファイルに変更なし。
