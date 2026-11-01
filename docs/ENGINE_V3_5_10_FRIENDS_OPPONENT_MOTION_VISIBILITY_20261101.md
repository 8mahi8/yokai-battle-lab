# 妖怪ウォッチ2 Engine V3-5-10｜原作対人戦「モーション中の相手サークル表示保留」を学校Friendsに導入（2026-11-01）

## なぜ今回これを優先したか

ユーザーの最終目標は「提供した原作対戦動画のように実際に1vs1を遊ぶこと」。原作対人戦の戦術「ノーモーション必殺」は、単なる見た目ではなく、相手の回転や必殺準備が**現在の行動モーションが終わるまで対戦相手の画面に反映されない**ことを利用する。

- [対人戦経験者の仕様整理・「モーションとサークルの反映」](https://note.com/tombow_yw/n/n1e4cf179d2d9)：対戦でモーション中のサークル変更は相手の画面にすぐ反映されない、ノーモーション必殺/カウンターの技術が発生するという記述。**経験記述であり原作開発元の内部仕様書や本件2台実機計測ではない**。
- [ユーザー提供原作動画Match01の観察記録](./ORIGINAL_PVP_VIDEO_20261027_MATCH01_OF04.md)：技中に輪操作/ピン/カットインが連続。元MP4はこの工程では直接再視聴しておらず、**1人視点では相手側表示タイミングを確定できない**。
- [LEVEL-5公式バトル紹介](https://www.youkai-watch.jp/yw2/game/game06.html)：サークル・零式G/つつく等の基本操作の根拠であり、相手側遅延表示の根拠ではない。

既存`ui/seat-motion-visibility.mjs`には**本人の輪・HP・KO・状態・勝敗を遅らせず、相手の輪配置/前衛位置・相手の妖気可視表示に限って保留する描画専用の仕組み**があった。さらに`ui/seat-motion-delivery.mjs`は欠落したFirebase配信や複数行動バッチ等で無理に古い画面を再現しないよう、隣接する正規revision・単一アクション・演出未再生などに限定。従来は研究Stageのみ有効で学校Friendsでは無効だった。

## 実装

1. `lab/sites-embed-online-entry.mjs`の`createMatchStage`へ`researchOpponentVisibility:__YW_FRIENDS_MODE__`を渡す。**学校Friends/ローカルFriendエミュレーターだけ**で既存の表示保留を有効化。従来の研究画面・非Friends接続には影響しない。名前は歴史的に`research`だが、**描画投影**でありBattleEngine/Rulesの別バージョンではない。
2. **通信や戦闘進行には変更なし**。Firebaseへ送る正規Snapshot、Hostの前衛配置/妖気/HP/ダメージ/勝敗、Guestの入力受付/ACK・冷却時間、相手の切断/復帰判定はどれも即時のHost真実を維持。見た目だけ、現在再生中のアクションモーションまで相手の前衛/B1→B4交代・妖気ゲージ表示を保留。
3. `tools/sites-online-smoke.mjs`のローカル`?onegame` Firebase2席一試合の正規ホスト行動を使用。Hostが本物の負とりつきでB1に状態付与→**Hostのモーション保留を確認**→Guestが正規サークル回転→Host/Guest B1 ACK→GuestはB1が後衛に移動、正規HostスナップショットはB4が前衛、**Hostが見ている敵はまだB1**→モーション終わりにHostがB4へ追いつく、を同一の実ブラウザ/RTDB2席で検証。その後**おはらい5タップ・通常必殺6タップ・零式G6タップ・6体KO・双方勝敗**まで従来の経路を維持。
4. 今回の表示保留により、旧QAが「ホストから見える相手の妖気ゲージまで即時100%」を要求していた問題が露出。エミュレーター`?charge`/`?gcharge`の進行基準を**正規Host内の妖気とGuest自身の画面**に改め、Hostから見える相手の妖気が演出終了後に一致することは**追加の待機**で確認。試験を進めるためだけの不要なHost行動を繰り返さず、実ルールを変えない。

## 検証範囲

- `Node`ゲーム/通信/表示共通回帰 **950/950 PASS**： [Actions](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41283249216)（最初の実装/QA）
- 実Chromium Stage **16/16 PASS**：[Actions](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41283245794)（最初の実装/QA）
- FirebaseローカルRTDB + 2つの学校Sites型`srcdoc`実Chromium：実Hostのnegative Inspirit→Guest rotationの**異なる表示タイミングを実DOMで確認し、後続の全操作を完走**：[最初の全工程PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41283249153)。
- **[V3-5-10最終コード/QAのFirebase no-Auth実2席＋過去Rules再現2回完全PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41283583410)**。1回目・2回目の双方で回転・ピン/新モーション保留の旧前衛→真の前衛表示復帰、`SITES-FRIENDS-CHARGE-PASS` **2正規Soul行動**、`SITES-FRIENDS-G-CHARGE-PASS` **6正規Soul行動**、`SITES-FRIENDS-PURIFY-PASS`、`SITES-FRIENDS-FULL-MATCH-PASS`、`SITES-FRIENDS-ONE-GAME-PASS`（1試合13正規Host行動・全6KO・ホスト敗北/ゲスト勝利）を実行。QAはHostの敵妖気見た目が遅れることと正規妖気値を区別し、**表示遅延のために余分なHost自動行動を増やす誤りを修正**。本番Firebaseの読み取り専用GETもHTTP200、**書込みは未試験**。
- **最終QAコードコミット：`a0564c9baefb2539ce6351e5ff2b55c7b0d0cc86`**。同コミットの[Node950/950合格](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41283583422)と[Chromium Stage16/16合格](https://github.com/8mahi8/yokai-battle-lab/actions/runs/41283580374)も確認。文書更新は後続コミットで、学校Google Sitesへの反映を意味しない。
- これらは**1台のLinux Chromium内で2つのiframe**を並べたローカルFirebase実通信の受入試験。**学校のiPad Safari2台・Google Sites本番埋込での指操作・2台の描画時間同期は未検証**。正規モーションの正確な秒数は未確定で、今の`presentation/action-choreography.mjs`は原作の実フレーム秒数ではなく試作用表示時間。原作通りの全ノーモーション技術を完成したとは判定しない。
- 10/22保存の過去Firebase Rules写しには **2026-11-08 00:00 JSTの期限**。現在の本番Rulesが同じかは未確認。本番Rules/Auth/DBには許可なく変更していない（本番疎通はread-only）。
- **学校Google Sitesに現在貼られているHTMLは無変更**。学校版はGitHubの開発ブランチ更新では自動変更されない。main/Pages/Google Driveも今回更新していない。

## 次 V3-5-11

原作映像（可能であれば以前提供されたMP4原本）と二席の視覚差を対比して**相手の行動中の表示保留・必殺/回転の反映タイミング**を絞る。いまの試作用時間で確実な原作再現を宣言しない。実際の学校iPad Safari二台での正常な一試合・画面の見切れ/同期遅延・時間は最優先の未完受入。動画の観察から確定していないホスト行動時計やスキル確率・キャラ性能の独断変更はしない。
