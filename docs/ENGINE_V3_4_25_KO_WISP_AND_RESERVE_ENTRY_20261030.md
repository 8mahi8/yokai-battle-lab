# Engine V3-4-25｜KO青い火・前衛全滅後の控え登場表示（2026-10-30）

## 原作の根拠と実際の仕様境界

本人が2026年10月27日に提供した原作『妖怪ウォッチ2』第1試合の過去フレーム観察記録
[ORIGINAL_PVP_VIDEO_20261027_MATCH01_OF04](./ORIGINAL_PVP_VIDEO_20261027_MATCH01_OF04.md)に、**01:08〜01:23に気絶した位置の青い火・欠員・控え復帰、01:52〜02:00にも青い火を伴う気絶/前衛交代**が明記されている。別の公式画像/解説で6体円と前衛/後衛を照合：
[レベルファイブ公式・妖怪とバトル](https://www.youkai-watch.jp/yw2/game/game06.html)。
今回元MP4を新たに取得・フレーム確認したわけではない。火の形状、消えるまでの秒数、KO直後の交代タイミングは**未確認**なので、オリジナルCSSによる試遊用再現とする。

事前コード監査で重要な発見：
- `engine/knockout-lifecycle.mjs`はKOに関する資格/Skillを既に決定し、`engine/combat.mjs`の`ensureFront()`は**3前衛が全員KOし、後衛に生存者がいれば次の自動ホスト行動開始時に強制回転**。全てのKOのたびに即交代するコードではない。ここは勝手に変えない。
- `ui/match-stage.mjs`はすでに`shownHp()`で**impact前に旧HP、命中後に確定HP**を投影。KOは`mb-ko`で薄くするだけで、青い火と登場演出はなかった。
- **特に重要**：前衛が全滅した次の`advanceAuto()`では、控えが前に出た後**同じ行動中にその控え自身がKOされるケース**がある。したがって「現在HPが1以上」の判定で登場者を認識すると欠落する。**前の確定スナップショットで生存していた控えが実際に前衛に移った**事実で判断すべきで、最新HPからKO火へ段階変化する。

## 最小の実装

1. **新規 `ui/ko-view-transition.mjs`**：2つの隣接するHost確定`makeStageView()`と新規Host`events`のみから、実ダメージで生存→HP0になった前衛の`{id,side,position,eventId}`、および**旧前衛3体がすべてKO→新しい前衛に旧控えの生存者が含まれる**事実`{side,eventId,ids,frontIds}`を投影。KO用にはダメージ正規イベント`action/special/poke`の検証を要求。MISS、回復、同じrevの再描画、飛びrev、前衛3体が生きている時のプレイヤー回転、古い初期接続は新エフェクト無し。自動交代の原因を勝手に推測せず、ホストが確定した結果に限る。**控えが登場した同じホスト行動でKOになっても登場した事実は失われない**。
2. **`ui/match-stage.mjs`**：既存`shownHp(unit)`が実際に0を表示する時だけ、上画面前衛の旧スプライトを**青いオリジナルの魂火 `mb-ko-wisp`**へ変更。`shownHp`は既存Host HitLedger/Choreographyを使うので**着弾前にフライングKOしない**。下画面の6体円/確定HPは変更しない。
3. 先の`projectKoViewChange`で確認された登場者だけ、次の正規ホスト`eventId`の**anticipation段階**に`mb-arriving`を付ける。通常のプレイヤー手動回転やタイムラグ・再接続で架空の「全滅後の増援」を作らない。
4. **`lab/yw2-layout.css`**：ゲームのオリジナル素材のみで青い火の二層グラデーション/浮遊と、控え妖怪の短い登場アニメをCSS実装。`prefers-reduced-motion`で無効。`engine/combat.mjs`、`engine/phase1.mjs`、Host MatchCore/Protocol、Firebase RTDB/Auth/Rules、勝敗、交代の猶予/クールダウン、HPダメージ、妖怪技データ、原作の未確定msは**変更なし**。

## 検証ゲート

- `tests/v3-4-25-ko-flame-reserve-transition.test.mjs`：本物の`createMatchProtocol`で6体戦を実行し、過去と最新のHost正規状態から投影したKO/補充と**2席の同じ結果**を検証。実Host全6体撃破・実KOイベント対応・同じrev/飛び受信/手動サークル/MISS/不正データの誤演出防止。カスタム本物Host必殺がHP0にしたことも専用検証。
- `lab/match-stage.html?review=ko-phase-v3`と`tools/stage-smoke.mjs`：本物の決定的Host対戦結果から**最初の敵KOと控え登場をそれぞれ取り出し**、Chromium DOMで「着弾前にはKO火がない／着弾後にだけ青い火が出る／3体全滅後の真の控えにだけ登場クラスが付く」を確認。偽のHP0状態を画面用に作らない。
- 新しいテストを初めて実行した際、**旧控えが前衛に出た同じ行動でKOされる**ため、「最新スナップショットでもHP>0の控え」の条件は不十分と分かった。実Hostのコードに手を加えず、**控えが登場する直前のHP>0**へ修正した。古い失敗CIをテスト合格と数えない。
- **CI結果は最終実装をテストしたworkflowのログで判定**。学校iPad Safari2台・Google Sites実貼付・元MP4直接比較は未検証。

## 現在の原作再現度と次の作業

原作録画で重要な「HP0で青い火、後衛の登場」は画面体験として再現を前進。ただし細かいスプライト形状や時間は推定せず試遊用の動き。原作同等のKOと交代の内部優先規則や実時間を達成したとは言わない。

次 **V3-4-26**：今回のKO/増援の見え方を、原作動画観察記録の00:11〜02:06に沿う**一試合中の連続表示**と統合し、ゲーム開始/KO/試合終了の画面演出を実画面で確認。必要なら、勝敗表示に演出が被る問題など現実的なもののみ修正する。学校のiPad Safari実機の試遊を依然最終ゲートとして扱う。

変更先：`8mahi8/yokai-battle-lab`の開発ブランチ`feat/phase1-action-circle-lab-20261023`のみ。GitHub main/学校Google Sites/本番Firebase Security Rules・Auth・DB/Driveへの変更なし。
