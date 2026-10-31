# Phase42｜つつくの999ダメージ：原作対人出現率監査／試遊仮値縮小（2026-10-27）

## ユーザーの重大な反証
「これ対戦で見たことないレベルだから、多分確率ありえん低いぞ。他の人もそんな感じってぽいし」
既存のPhase31版 `pokeHeavyWeight:1` は*根拠を伴わないプレイテスト用仮の1%*。**対戦でほとんど見ないという証言と整合しにくい**ので、安易な「原作1%」主張と頻発する一撃を避ける。

## 調べた原作証拠の階層
1. 原作の**通信対戦でも「つつく」の一撃999という効果カテゴリが存在する**との二次説明：[妖怪ウォッチ2 Wiki系／戦闘の概要](https://ja.wikid.org/%E5%A6%96%E6%80%AA%E3%82%A6%E3%82%A9%E3%83%83%E3%83%812_%E5%85%83%E7%A5%96%2F%E6%9C%AC%E5%AE%B6%2F%E7%9C%9F%E6%89%93)、[二次解説](https://asobigokoro.work/yokai-watch-2-ganso-honke-shinuchi/)。「PVPの効果はHPダメージ/妖気吸収/一撃に限定」とする。**公式一次資料に発生率は載っていない**。
2. プレイヤーの**公式対戦・オンライン対戦での999体験を扱った動画** [ようかもch・2021-11-19](https://www.youtube.com/watch?v=pGHmdxPZ9ho)。公開説明には公式対戦/つつく/999の語があるが、**全カットを同期再生して検証したという主張はしない**。
3. 希少さの**一般戦闘も含む経験談**：[2026年1月 Reddit『250h+初めて遭遇、rare』](https://www.reddit.com/r/yokaiwatch/comments/1q3lkzc/secret_poke_option/)、[2023年12月 Reddit『極稀、2回だけ／見たことない』](https://www.reddit.com/r/yokaiwatch/comments/18j2gbp)、[2023年11月 Reddit](https://www.reddit.com/r/yokaiwatch/comments/17qb7lq/has_anyone_ever_seen_hit_when_poking_a_yokai_in/)。**通信対戦だけの標本ではない**、つつく総回数の分母も不明。これを使って原作の正確な `0.1%` を推定することは不可。
4. [2014年の「つつく一撃」記録](https://youkai.jp-hp.com/)も存在。通常のPokeの「赤黒い表示のレアな選択肢」という目撃報告があり、**現行の単純な『12タップ後に結果を乱数抽選する』のはUI発生順として原作と違う可能性**。別途画面録画とフレーム／選択条件確認が必要。

## コード変更の範囲
- `engine/playtest-soul-tuning.mjs`だけで3効果の重みを通常ダメージ **49%→49.9%**、妖気吸収50%据え置き、一撃999 **1%→0.1%**とした。**0.1%は原作の確定確率ではなく、過度に頻発しないための保守的な試遊仮値**。
- 原作で効果の種類が存在する点、999のダメージ額、HP上限による実ダメージ制限、スキル『どひょうぎわ』の挙動、乱数再演、二席オンライン、Firebase Rulesは変更なし。
- `tests/phase31-poke-pvp-outcomes.test.mjs`の確率境界を49.9%／99.9%に更新し、ホストシード2560の999経路は**最初のroll≒0.9991397なので0.1%版でも確定的に実行できる**。1%の表記を除外。
- この調整は今後原作の確率・出現条件の直接データが見つかれば差し替える。効果出現率と「つつける状態」「赤黒い選択肢の表示」「成功させる入力」は別変数・別事象の可能性があるので一括で原作再現と呼ばない。

## 実際に生成・配布したPhase42 V2（2026-10-27・ユーザーのDrive）
- **更新版TXT**: https://drive.google.com/file/d/13p2-xQ1dBK5moWlsFRumB3_XdQB-YoJt/view?usp=drivesdk
- **更新版HTML**: https://drive.google.com/file/d/13GzK54kaK6g5WA-B2xrTadkkRwCdbkZf/view?usp=drivesdk
- 旧版と同じ[Drive内フォルダ](https://drive.google.com/drive/folders/1xgKahjwoESrIam0JnbqUYivEQ2vyqiXO)。**191,577バイト**、同一 SHA256 `346538ca6d07d80f1e6c43df6e36d61b70d6f1af8703ec37e28a2c8844e1e087`、GitHub blob `728c25431deed861f33f3c28546b644c344ab4c2`。
- [Phase42 CI成功 #40354171436](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40354171436)：全576テスト＋6体自然終局＋Friend版安全性・0.1%境界＋TXT/HTML同一。明日用 `release/sites-firebase-friends-20261027-rare999` を別ブランチ保存。
- Google Drive両ファイルのメタデータを読み戻し、サイズ191577、MIME `text/plain`／`text/html`、指定フォルダ保存確認。既存のPhase41最終ファイルは変更・削除していない。
- **明日から使うときはV2のTXTを優先**。既存Phase41のFINALは1%のまま。Google Sites既存ページにはまだ反映していない。

## 明日のビルド区別
**先にDriveへ渡した「20261027_FINAL」ファイルは1%の旧値のまま**。GitHub開発枝のコードを書き換えても、既にDrive保存済のTXT/HTMLは勝手に更新されない。新版をビルド・受入して**別名称の新しい2ファイル**としてDrive保存するときは、旧ファイルを無断上書きしない。

## 数値の定性的な違い
- 1%=100回つついて少なくとも1回出る確率は約63.4%（独立抽選なら）。
- 0.1%=100回つついて1回以上は約9.5%、1,000回で約63.2%（独立抽選なら）。
- ※**原作発生率の推定ではなく**、あくまで今のランダム実装での計算。原作の赤黒いレア表示・フローは別問題。

## QA
GitHub Actions 最新 `node --test tests/*.test.mjs` 完走確認の上で納品する。サイト版・既存Drive版・main・Firebase本番ルール/DBを無断書換えしない。
