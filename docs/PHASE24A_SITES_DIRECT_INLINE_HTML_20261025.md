# Phase24-A｜Google Sites「コードを埋め込む」単一HTML生成・Chromium実DOM検証（2026-10-25）

**ブランチ** `feat/phase1-action-circle-lab-20261023`  
**位置** Phase21/22原作再現の戦闘エンジン → Phase23のFirebaseオンラインホスト／ACK基盤 → **Phase24-Aの配布コード形式・Safari旧端末向け静的な依存削減** → Phase24-Bの実Google Sites/旧iPad＋真の1vs1ゲート

## 1. 何を作ったか
`lab/sites-embed-local-entry.mjs`を新規追加。**正規`createMatchProtocol()`と`createMatchStage()`を使用**し、1台の端末でA/Bの双方を切り替えて6体メダル/4コマンド/自動戦闘/リセットを操作できる最初の直接埋込プレビュー。**オンライン対戦は不可**と画面に明記。勝手にSoulを100にしたり、原作不明な必殺技効果を研究モードで追加したりはしていない。

`tools/build-sites-embed.mjs`を追加。`esbuild@0.25.12`による`format:'iife'`の依存コード一体化と、既存の`lab/match-stage.css`/`lab/yw2-layout.css`を同じコード欄へインライン化。構文ターゲット`safari13`（※Safari本体の実機試験ではない）。**生成結果の直接埋込HTML** `dist/sites-embed-code.html`、**単体ブラウザ起動版** `dist/sites-embed-local-preview.html`の2ファイルを出力。生成物はGitHub Actionsでダウンロードできる。

**ビルドの機械チェック:** バンドル依存25ソース、1個の`<style>`と1個の通常`<script>`、CSS 33075 bytes、JS 118087 bytes、貼り付けHTML全体 152476 bytes、ES moduleの外部import無し。Firebaseやnetwork/emulatorの依存はビルドの入力一覧で禁止。HTML内にFirebaseの`demo-yokai-lab`、`useEmulator`、CDNのscript src、外部CSS linkなどは含めない。ユーザーの本番Firebase設定や資格情報は無い。

## 2. 本物のChromeで埋込断片を動作試験
`tools/sites-embed-smoke.mjs`を追加して、**生成した実HTML文字列を`iframe.srcdoc`へセット**し、Chromeで操作する。GitHub Actions上で以下をすべて自動検査する。

- 相対CSSや別ファイルJS import無しで`#battle-stage`が起動し、上下の画面がCSSで表示される
- 双方同一レンタル6体＝合計12体のオリジナルSVG立ち絵、4コマンド、初期はAだけのメダルサークル
- 研究モードのデバッグボタンではなく正規プロトコルのステップでターンが0→1へ進む
- A/B操作権を切り替え、B側のサークルが動き、前衛3体のIDが変わる
- 「初めから」ボタンが正規新ゲームを作り、ターンが0に戻る
- 外部`script src`/CSS link無し、オンラインではない表示が画面に残る

[**GitHub Actions Phase24A ビルド/Chrome srcdoc両方PASS（実行 #40170986643）**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40170986643)。その実行の「phase24-google-sites-offline-one-file」artifact内に二つのHTMLを保存している（artifactは14日保持）。ファイルはチャットにも受け渡し可能。

## 3. Google Sitesの公式仕様との照合
Google公式の[「Add HTML, CSS, or JavaScript code to your site」](https://support.google.com/sites/answer/90569?hl=en)は **Insert → Embed → Embed code → コード → Next → Insert** の直接貼付方式を説明し、JavaScriptを`<script>`、CSSを`<style>`タグに入れる必要がある。今回の生成断片はその構文に対応し、**GitHub Pages URL iframeではない**。

ただし、公式ヘルプに今回の**152476-byte**規模のコードがGoogle Sitesの入力欄で実際に保存/公開できると保証する記述は確認できていない。**Google Sites実サイトの入力欄への貼付と、旧世代学校iPad Safariでの真の動作検証は未実施**。

## 4. 原作・オンラインの境界
Phase24-Aは **配布形式の検証専用**。元の`network/firebase-room.mjs`/`network/firebase-match.mjs`には触れず、単一HTMLにはオンライン接続機構を含まない。このオフライン版を「友達と別端末でできる公開版」と呼ばない。

Phase23-Cまでの**ローカルFirebase Auth+RTDBエミュレーター2Chrome / 実ホストpublish再送 / ゲストACK**の成功は別の検証根拠であり、今回のオフラインHTMLに組み込んだものではない。学校Googleサイト版、`main`、本番Firebaseクラウド、サーバー設定、課金、閃光魂初期OFF方針は全て未変更。

## 5. 次にする作業
1. **24-Bオンライン直接埋込**: 研究用エミュレーターの`localhost`やデモUIDを除き、実際に利用許可された本番用Firebase設定+安全なRTDBルールへ接続するオンラインエントリーを別に設計する。**ユーザーのFirebase本番設定や課金の変更はせず**、許可されていない接続先は設けない。Google Sites埋込のオリジン・匿名認証が実動作するかは旧iPadで最終判定。
2. **24-B配布試験**: コードを本当のGoogle Sites編集画面へ貼れるか（文字数制限/保存/フレームの高さ/画面方向）、旧iPad Safari実機で操作できるかを確認する。実際の既存サイトは本人の明示的な貼り付け操作まで変更しない。
3. **22D残**: ノーモーションとカウンターの3DS動画の対象ロック・時刻はまだ未測定。研究用仮値を通常対戦の必殺演出へ採用しない。

**今回のコード実装・Chrome/srcdocビルド検証まではAI側で実行済み。現在の段階では本人に必須操作なし。**
