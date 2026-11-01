# Phase24-C2｜Google Sites埋め込み寸法・旧Safari機能チェックの先行受入（2026-10-25）

対象: `feat/phase1-action-circle-lab-20261023` の開発用オンライン単一HTMLとCIのみ

## 1. 目的と全体設計上の位置
原作再現の戦闘エンジン・研究（Phase20–22）→ Firebase Auth/RTDBの正規2席同期（Phase23）→ Google Sitesの「コードを埋め込む」に向けた単一HTMLと自動ホスト戦闘（Phase24A/B/C1）→ **Phase24C2：狭い埋込枠と古いSafariを想定したUI/ブラウザ機能の事前診断** → 本物のGoogle Sites/学校旧iPad Safari/承認済みFirebaseクラウドでの最後の受入。

本ターンは`main`、既存学校Googleサイト、実Firebaseのプロジェクト/Auth/RTDB Rules、課金を一切変更していない。

## 2. Google Sites・Firebase・Safari公式/互換資料
- [Google Sites Help: Embed code](https://support.google.com/sites/answer/90569?hl=en) はHTML/CSS/JSを直接コード欄へ貼る機能を説明し、JSは`<script>`、CSSは`<style>`内に置く。しかし巨大なHTMLの保存上限/埋込iframeでの実端末動作を保証していない。
- [Can I Use: Pointer Events](https://caniuse.com/pointer) によればiOS Safari 12.5以前はPointer Events非対応、iOS Safari 13は部分対応、13.2以降は対応。**学校のiPadOSの実バージョンは未確認。** Pointer Eventsが欠けると既存のメダルドラッグ・おはらいジェスチャーの入力が成立しないため、単にUIの見た目が映るだけで実機PASSとはしない。
- [Firebase Auth persistence](https://firebase.google.com/docs/auth/web/auth-state-persistence): `Persistence.NONE`はAuthをメモリにのみ保持し、ページを再読み込みすると消える。すでにPhase24Bで匿名Authに設定済み。ブラウザ完全再起動/ページ再読み込み後の同じ戦闘への自動再参加は**仕様対象外**。
- [Firebase Auth redirect + third-party storage](https://firebase.google.com/docs/auth/web/redirect-best-practices) の制限は`signInWithRedirect`の注意点。今回の実装は**匿名`signInAnonymously()`**なので同じ問題が起こると断言はできないが、Google Sitesのiframeと旧SafariでAuthが利用できるかは**本物の端末で最終確認必須**。iframe固有の認証・CDN/CSP問題はChromeエミュレーター合格で証明できない。

## 3. 実装／CIの変更
### `tools/sites-online-smoke.mjs`
すでに通っているChromeの**実2席iframe.srcdoc＋Auth/RTDBローカルエミュレーター**対戦試験へ、ゲストのiframeサイズを変えて同じ実DOMを再確認する工程を追加。測定条件:
- **1024×768** — 旧世代学校iPadの横画面を想定（ChromeでありiPadそのものではない）
- **820×620** — Google Sites埋込/画面分割でコンテンツ横幅が減った想定
- **568×520** — さらに幅の狭い埋込枠
- **390×760** — 縦向き・狭いブラウザのフォールバック

検証するのは **(a)** iframeの実viewport幅、 **(b)** ページの横方向オーバーフロー有無、 **(c)** 上画面、下画面、B側のメダル輪、回転ボタン、4コマンドの可視の位置、 **(d)** 回転ボタンとコマンドの中心を`document.elementFromPoint()`で検査して本当に対象ボタンにヒットすること、 **(e)** 元の対戦QA（ルーム作成、相手ACK、回転制限、ホスト自動進行、切断→再接続、OFF）の継続PASS。
Chromeの「見た目だけ合格」を避け、実際のクリック位置を検証する。

### `ui/sites-browser-capabilities.mjs`（新規）
個人情報・UAフィンガープリント・通信・保存なしの**完全ローカルな起動前診断**:
- `window.isSecureContext===true` (HTTPSの安全な画面/信頼できるlocalhost)
- `window.PointerEvent` (旧Safariのメダル操作)
- `window.crypto.getRandomValues` (安全な6桁ルーム生成)
- `window.TextEncoder` (通信パケットバイト数制限)

足りないブラウザ機能を日本語で列挙し、**Firebase Authを開始する前に拒否**する。`lab/sites-embed-online-entry.mjs`に統合。非対応なのに半分動く状態から部屋作成してゲスト画面が停止するリスクを抑える。ただしこれは動作可能性を判定する最低限の要件であり、旧iPadの十分な性能やSafari/Google Sitesの相互運用を保証しない。

### `tests/sites-browser-capabilities.test.mjs`（新規5件）
サポート正常、Pointer Events無し、HTTPS無し+安全乱数無し、TextEncoder無し、基本機能が全部ない場合を独立に確認。

## 4. 合格条件・残る問題
- 自動テスト: 従来474件+新規5件の**479件すべて合格**が目標（最終GitHub Actionsのrunと結果を照合して追記）。
- 実Chrome Firebase試験: 4サイズ＋ボタンのDOMヒットテスト＋2席オンライン1vs1/自動進行の既存受入が全成功。
- 実クラウド使用**0**、実Google Sites書込/公開**0**、資格情報収集**0**。
- なお **「学校旧iPad Safariで完璧に動く」とは判定できない**。学校iPadの実OS/SafariのPointer Events、Web Crypto、Firebase匿名Auth、3本の外部SDK、Google Sites iframe実高さ、画面全体の縦スクロール、入力遅延、長時間のメモリ/発熱は現物がなければ判断不可。
- 初期同一レンタル6体、閃光魂初期無し、未確認の原作ノーモーション/零式Soul数値/カウンターの仮フレームには変更を加えない。

## 5. 次
1. さらにできること: **実Chromeの幅以外に、進行と描画の負荷／長時間連続・低スペック端末に近いスロットリング試験**。ただし時間や体感を実機Safariの結果に読み替えない。
2. **学校の実機ゲート:** 本人が確認済みの独立・無料枠Firebase構成（Auth匿名・`yokaiRoomsV1`専用ルール）が揃って初めて、オンラインの安全な設定済みHTMLを本人がGoogle Sitesの**Embed code**へ貼付する。その後、旧iPad Safariの実端末2台で同じ6桁ルーム/4コマンド/ジェスチャー/切断復帰を試す。
3. OS/機種やログイン情報を不用意に回収しない。問題があれば表示されているエラー内容と「どの操作で停止したか」を本人から必要最小限確認し原因を絞る。

**作業範囲:** 開発ブランチ、Chromium/Firebaseローカルエミュレーター、Node試験、技術文書のみ。`main`/学校公開版/本番Firebaseは無変更。
