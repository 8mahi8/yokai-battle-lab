# 妖怪ウォッチ2再現 Engine V3-4-19｜演出中の行動IDと状態系必殺の結果を統一（2026-10-30）

## 完成条件に対する位置

ユーザーが重視するのは**原作動画のような自然な一試合と操作中の見え方**。V3-4-18までの戦闘研究に接続した今回の修正は、戦闘結果やキャラ追加ではなく**ホスト確定イベント→本人/相手両側の表示**の矛盾を減らすもの。原作の相手視点遅延（ノーモーション）や動画の再現が全面完成したわけではない。

- 原作対戦経験による[たくトンボ｜モーションとサークルの反映](https://note.com/tombow_yw/n/n1e4cf179d2d9)：**入力は正しく受け付けられつつ、相手視点では前のモーション終了まで表示が保留される**。それを技専用ボタンで再現しない。今回は**入力権利やホスト時間には触れず、表示のみ**を修正。
- 本人が提供した映像の既存読み取り：[`PHASE49_USER_SUPPLIED_ORIGINAL_PVP_VIDEO_REVIEW_20261027.md`](./PHASE49_USER_SUPPLIED_ORIGINAL_PVP_VIDEO_REVIEW_20261027.md) および[`MATCH01_SECOND_PASS_INPUT_AND_TIMELINE_20261027.md`](./MATCH01_SECOND_PASS_INPUT_AND_TIMELINE_20261027.md)。**今回元MP4を再生したわけではない**。原作では必殺のカットイン→効果→戻り、通常のとりつき/ミス表示/連続技が別々の見える場面を持つが、正確なフレーム/ミリ秒値は確定できない。
- [MDN Page Visibility](https://developer.mozilla.org/ja/docs/Web/API/Page_Visibility_API)：Safariを含むブラウザでは隠れたタブ/iframeのアニメーション/タイマーが制限され得る。既存の`visibilitychange`の際にFIFOを捨て正規状態に戻る動作を維持。一般的な復帰仕様の参考であり、学校実機での保証ではない。

## 見つかった2つの実際の構造的ずれ

1. 旧`ui/match-stage.mjs`はPhase50で**複数イベントをFIFO演出**できたが、画面内の`mb-action-label`がそのFIFOではなく、**最新のホストsnapshot中の最後のaction**を読んでいた。例えば3連続行動を同時受信すると「A1の演出中にA3の攻撃名」などの見え方となり得た。また攻撃のmissを予備モーション中から表示していた。
2. V3-4-18でわすれん帽の**味方/敵のプラスとりつき解除**を`dispel`という正規の非ダメージ・非状態付与としてモデル化できた一方、旧`ui/battle-vfx.mjs`の表示は特殊効果を`damage`へ丸め、`contracts/soultimate-impact-ledger-v1.mjs`は`dispel`を受理しなかった。そのため原作2体の研究用実戦では**HPダメージ扱いの効果表示、あるいはホスト対象台帳が失われる**可能性があった。

## 今回の変更（戦闘値には触らない）

- `ui/battle-cue-sequence.mjs`の`actionForVisibleCue(events,cue)`：新しい独立した戦闘エンジンではなく、**受信済み既存ホストイベントの読み取りだけ**。現在FIFOで再生中の`eventId`（旧データなら`action:turn`）に対応するactionを解決。ホストログから該当IDが欠けていれば**勝手に最後の別行動を代入しない**。
- `ui/match-stage.mjs`の行動説明をこの現在演出IDへ統合。**MISSの説明はimpact以降**に表示。入力受付・HP計算・予測ゲージ・イベントキュー長/スキップ/視認復帰の規則は変更しない。
- `contracts/soultimate-impact-ledger-v1.mjs`：`dispel`を**HP変化なし・removeSign positive・既存の`removed`から導いた実解除数・appliedとの整合**として受け入れる。受信後の検証も同じ契約を使う。不一致/偽HPは拒否、原作の必殺が複数ヒットしたかのように数えない。
- `ui/battle-vfx.mjs`は`dispel`を独立した効果として表示。実際に解除無しは`MISS`にせず無反応、解除成功は暫定とりつきエフェクトを使用（色や音が原作と一致した保証なし）。
- `presentation/action-choreography.mjs`はhost ledgerの対象/量/成功状態と表示Planの一致をチェックする際に`dispel`を対象として明示する。ターゲットはヒット回数と異なる。

## 検証

- `tests/v3-4-19-presentation-event-contract.test.mjs`：3行動のまとめ受信と演出中のevent ID参照・旧turn ID・無いID・改ざん・履歴変化無しを検証。
- 実際のV3-4-18原作研究`createCombat`でわすれん帽の`dispel`、0件解除、メゾン・ドワスレの前衛混乱を発動し、`host events→special impact ledger→visual cue→choreographyFrame`を通して検証。**0ダメージ/0解除でミスや攻撃が捏造されない**ことを確認。
- Node全件/Stage Chromium/RTDB Emulator 2席のCI結果は実際に完了したものだけロードマップ/引き継ぎに追記。学校iPad Safari実機2席・Google Sites直接貼付版と、本人原作動画の同フレーム比較は未実施。

## 今後の順番

次 V3-4-20 の第一候補は**両席の画面表示保留（モーションが終わるまで相手のサークル/チャージ表示を保留）を、既存プレゼンTimelineを使って計測・段階実装**。先に原作映像の証拠の種類と、ホストcanonical/seat-visibleの境界を明確化する。**常に正規ホストの入力受付が優先**で、見た目だけで入力を不正に禁止しない。少人数Safariの接続性/操作性を悪化させる設計は避ける。

学校で実際に配布中のGoogle Sites HTML、Firebase Security Rules/本番DB、GitHub main、Drive配布ファイルは更新していない。