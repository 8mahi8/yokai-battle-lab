# 妖怪ウォッチ2対戦 V3-3-1｜論理・確定・表示の3時間領域の読み取り契約

2026-10-30。原作の新たなフレーム/演出秒数を発明せず、旧V3-2で管理していた3領域に共通の型と観測方法を設ける工程。

## 何を実装したか

- `engine/time-domain-contract.mjs` 新設。`readBattleTimeDomains({clockSnapshot,hostEvents,presentationSnapshot})` は**副作用ゼロ**の読取アダプタ。結果は3つの個別領域に分離する。
  - `logical`：`unit:'action-points'`、`actionCount=clock.turn`、`pointsElapsed`。**リアルなmsではない**。
  - `canonical`：`unit:'host-event-ordinal'`、現在のホスト実イベント配列の件数と最後の通番。**イベント通番は表示sequenceでも行動回数でもない**。全イベント数の読み取りであり、KO/HPが更新された全個別操作を表す詳細なコミット監査ログではない。
  - `display`：有効時のみ`unit:'research-animation-ms'`、`nowMs`、`blockedUntilMs`、可視化保留・公開済み件数・最後の可視イベントsequence。表示機構無効時は`null`を返す。ms値は原作実測値ではなく研究fixture。
- どの返却値にも生のstate配列やオブジェクト参照を渡さず、読み取り専用のプリミティブ値だけを`Object.freeze`で返す。数値単位とスナップショット構造が不正な場合は副作用開始前に拒否。
- `engine/combat.mjs` に`battle.timeDomains()` を追加。既存`battle.snapshot()`、`step`、`rotate`、`advancePresentation`、イベントや同期プロトコルの出力形式は変更しない。`timeDomains()`は実ゲーム状態に影響を与えない。
- `tests/v3-time-domain-contract.test.mjs` 新規5テスト。時計・イベント・表示の単位隔離、表示無効、モーション中の受理済み操作/HP/妖気/KOの一致、隠れたチャージ完了の可視化のみ遅延、無効ドメイン入力拒否を検査する。

## 原作資料と確定できない範囲

- [Mt. Wildwood｜YW2 Turn Order](https://mtwildwood.net/turn-order.php?g=yw2)：待機カウンタの小さい前衛が次に動く。初手の乱数と速度表、ほぼ全技のwait3、サークル切替等はシステム行動としてwait0、入れ替わって前衛に戻る場合のwait再設定を説明。**この待機値と現実のアニメーションミリ秒を直接換算できるとの記載はない**。
- [たくトンボ｜妖怪ウォッチ2対戦研究](https://note.com/tombow_yw/n/n1e4cf179d2d9)：モーション中の回転/必殺チャージが相手画面でモーション終了時に初めて反映され、隠れたチャージがノーモーションに見えることを具体例で説明。**経験に基づく対戦観察であり、原作の正確なフレーム、ネットワーク内部、ヒット判定順は別証拠が必要**。
- 今回ユーザー提供の実対戦動画原本を閲覧しておらず、記録されている観察だけを使って設計を進めた。

## 検証と受け入れ基準

- 検証対象のゲームコードは`engine/combat.mjs`と`engine/time-domain-contract.mjs`で、アクションや判定式の変更は0。
- 正式Node CI [Research battle unit tests](https://github.com/8mahi8/yokai-battle-lab/actions/workflows/research-unit.yml)、実Chromiumの研究UI、Firebase Friends no-Auth Emulatorの二席とGoogle Sites HTMLの[Phase37](https://github.com/8mahi8/yokai-battle-lab/actions/workflows/phase37-firebase-friends.yml) の新SHAで合格してからV3-3-1を合格とする。
- 学校iPad SafariでのGoogle Sites実2台通信、原作カットインの実映像フレーム、ノーモーション/カウンターの本家と同一の発火瞬間は未確認。**V3-3全体完了/原作完全再現とは呼ばない**。

## 次工程
まず同seed・同操作で表示保留の有無だけを変えたとき、`snapshot`から表示フィールドを除いた全状態と`timeDomains().logical/canonical`が一致するテストを拡充する。次に原作動画で観察可能なカットイン/表示保留を、時間の値を捏造せず受け入れ条件として設定。V3-3の行動順・コミット順序と公開順序を明文化し、V3-4で効果定義に接続する。

**禁止変更**：main、学校公開Google Sites HTML、本番Firebase DB/Rules/Auth、Google Drive。開発PRはDraftのまま。
