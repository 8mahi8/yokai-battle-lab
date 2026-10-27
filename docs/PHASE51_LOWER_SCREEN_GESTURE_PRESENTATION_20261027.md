# Phase51｜おはらい・必殺チャージ中も上画面の戦闘を隠さない（2026-10-27）

## 背景と根拠
本人提供の原作対戦録画4試合中、**視認できた1試合目**の00:15–00:20（紫の「連打！」→「おはらい完了！」→メダルサークル復帰）、01:11–01:21（「まわせ！」とおはらい）、00:44–00:52（上画面の「ひゃくれつ肉球」カットインと独立した下画面）などから、**上画面と下画面は同時に見える**という再現基準を作った。

原作の画面構成は[攻略大百科のバトル画面解説](https://gamepedia.jp/youkai-yw2/archives/1129)、[2014年4Gamer体験レポート](https://document.4gamer.net/games/253/G025374/20140710082/)でも照合。原作ゲームでは上画面をバトルに残し、下画面にタッチチャレンジを出す。動画に指は映らず、ジェスチャー成功の正確な時間・閾値は未証明。

以前の`ui/match-stage.mjs`はチャージ・おはらい・つつくの共通`#mb-modal`を`.mb-stage`直下へ置き、`lab/match-stage.css`の`position:fixed; inset:0`で**画面全域を遮蔽**。本家の「入力中にも戦況を観察する」体験と異なっていた。

## 変更（開発ブランチ）
1. `ui/match-stage.mjs`の操作領域を**`.mb-lower-screen`の内側**へ移動。従来の`#mb-touch-pad`、`chargeInput`/`purifyInput`/`pokeInput`コマンドとキャンセルはそのまま再利用。
2. `lab/match-stage.css`に**`.mb-yw2 .mb-lower-screen>.mb-modal`**の局所表示を追加。position absolute / inset0 が`lab/yw2-layout.css`のpositioned `.mb-lower-screen`に従い、上画面を遮らない。iPadの画面高に応じタッチ円を縮小。現地iPad Safariの実機視認性は別検証。
3. 画面全体を機能上モーダルにしていないので`role=dialog aria-modal="false"`へ変更。外側を操作できないという誤った読み上げをしない。
4. `lab/gesture-stage-qa.html`の**実Chromium検証**で「モーダルがlowerの子」「getComputedStyle position:absolute」「上画面矩形と重ならない」「下画面外へはみ出さない」「操作継続中も上画面の行動数が再レンダリングされる」を追加。既存のチャージ4種・おはらい5種・つつく・二本指・pointercancelの全検証を維持。
5. **エンジン戦闘、原作ルールの判定式、チーム編成、ホストステップ(暫定2600ms)、Firebase通信/本番設定は変更していない**。単に画面上の下画面入力ビューを本家の並列表示へ近づけた。

## 検証：過程と結果
- 実装途中の初回Chromium Stage QA [run 40525514184](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40525514184) は**最初のattemptで失敗**。ログでは「Render and interact in real Chromium」でステージブラウザ起動/描画チェックが通らず、入力QA手前で停止。前の同じ実装コードでStage QAが成功したことから環境不安定も考えられたが、**その段階では合格扱いにしない**。
- **コードを変更せず失敗したStage Jobだけ再実行**。attempt2 job `122266926205` は**成功**：`STAGE-PASS`、`GESTURE-PASS`（4 charge + 5 purification + poke + pointercancel + multitouch）、`MATCH-RESULT-PASS`、既存ステージ画像出力、Phase49カットインとPhase46予備/命中QAを確認。
- 同じソース版の [Research unit 604/604 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40525514133)。4シードの6v6自然終了も成功。
- 同じ**CSS変更を含む実装コード**の [Firebase Emulator + 2実ブラウザ QA成功](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40525294654)、[学校用オンラインSitesビルドQA成功](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40525294638)。ただしライブ学校iPad実機での見た目・入力検証ではない。
- Chromium QAは矩形交差検証など**DOMによるレイアウト保証**。出力されたPNG Artifactファイルそのものを担当は画面表示して肉眼で比較したわけではない。実機Safari 2台の再現確認は未実施。
- 過去の旧Supabaseワークフローの一部には別途失敗があり、学校Friends (Firebase RTDB・Authなし)とは切り分ける。

## 次：Phase52・54の原作再現
1. 原作動画の「おはらい完了！」が出るタイミングと**下画面での一時停止・通常サークル復帰**を映像・公式資料から確定。現状の`combat.mjs`は成功結果として`type:'purification'`を確定するが、`ui/battle-vfx.mjs`の通常アクションキューでは完了シーンを表示しない。嘘の追加効果/HPを発生させない。
2. 「打て！」は**飛来する球**、「斬れ！」は鎖の**ヒビ**など、種類名だけでなく本家に合わせたジェスチャーの画面変化と入力ルールを別々に再現する。閾値と必要回数は原作未測定の仮値。
3. 「ひゃくれつ肉球」など**多段ヒットが個別に表示**されるタイムラインと、対象別のHP/気絶/状態メッセージの描画順を原作秒刻みで追う。
4. 相手視点の行動モーション/サークル表示保留/ノーモーションの読み合いは2視点や対戦分析記録と照合した後、**通信と戦闘エンジンを無根拠に変更しない**形で設計する。
5. ファイル受領済みの2〜4試合目は現在のコンテナ処理が`ClientError`で映像未視聴。解析可能なツールに変わった際に、会話に残る原本の再読を優先。再送不要な限りユーザーへ要求しない。
6. 学校Google Sites稼働版は明示的なユーザー指示があるまで変更禁止。GitHub mainも不変更。

## 全体設計の位置
UI・バトル演出レイヤーの原作再現 (stage 下画面入力と上画面表示) に対する一件の確実な改善。戦闘の忠実度や原作同等チャージ時間を完成したという主張ではない。
