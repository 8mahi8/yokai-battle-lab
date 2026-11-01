# 妖怪対戦 Engine V3-2｜KO・スキルの共通イベント処理（2026-10-29）

**状態：KOと3種のパッシブイベントの実装移行は完了。V3全体の原作忠実性・全6スキルの実行hook化は未完。**

## 1. 開発意図

本人の「技を1件ずつ再現するよりゲームエンジンを先に」という優先順位に従い、戦闘エンジンの中心だった`combat.mjs`から「敵を倒した」「行動終了した」という処理とスキル個別の分岐を抽出する。

既に導入済みの`MatchCore`（正規状態オーナー）→`EffectCommitter`（HP/状態異常確定）を維持し、今回の`KnockoutLifecycle`（KO確定後の副作用）と`SkillHookPipeline`（KO/毎行動のパッシブ処理）を組み合わせる。ユーザー入力、Firebase Friends通信、サークルの時間や乱数の計算は変更しない。

## 2. 調査・3DS版の根拠と未確認点

- [妖怪ウォッチ2・ゲームの匠｜どひょうぎわ](https://youkai-gh.g-takumi.com/skill20.html)：HPが0になるとき一度だけHP1で耐えるという発動条件。現行共有`EffectCommitter.commitDamage`で**HP→生存hook**を既に共通処理している。SoulやDoTすべてを防ぐという主張はしない。
- [妖怪ウォッチ2・攻略大百科｜まえのめり](https://gamepedia.jp/youkai-yw2/skills/3033)、[ゲームの匠のYW2スキル一覧](https://youkai-gh.g-takumi.com/skill_list.php)：敵を倒したとき強くなる。**現行エンジンの5「自分の次の行動」・2段階の上昇は、初代情報を参考にした試作値であり、YW2正確値を証明していない。**敵を倒した本人の発動イベントを共通`afterEnemyKO`へ移す。
- [妖怪ウォッチ2・攻略大百科｜おせわ](https://gamepedia.jp/youkai-yw2/skills/2904)、[ゲームの匠YW2版おせわ](https://youkai-gh.g-takumi.com/skill34.html)：隣にいる味方が徐々に回復する。現行の`careMaxHpFraction=.02`は初代の資料に依存する**未確証数値**。**両陣営の1行動ごとに発動するかの正確な優先順も原作未確証**。
- [ゲームの匠・初代まえのめり](https://youkai.g-takumi.com/skill67.html)、[初代おせわ](https://youkai.g-takumi.com/skill8.html)：5ターンやHPの2%などは旧作で説明あり。**別バージョンの情報であってYW2の確定値ではない**。
- 原作映像は過去の解析記録を参照。**本工程で元動画ファイルを直接再視聴してはいない**。命中判定→ガード→HP変化→スキル→割り込み→KOの正確な原作順序も確定していない。

## 3. 今回の実装

### A. `engine/knockout-lifecycle.mjs`

`createKnockoutLifecycle({syncEligibility,afterEnemyKO,refreshPins})` が**実際にHPが0の相手**に対するKO後処理を単一入口`commit`へ統合。

- 通常攻撃・複数Hit：`syncEligibility→caster.knockouts++→afterEnemyKO→refreshPins`（従来の順序を維持）。
- 研究必殺技のKO：`caster.knockouts++→afterEnemyKO→syncEligibility`、後で1回`syncPinned`（旧コードと同じ）。
- つつくによるHPゼロ：`syncEligibility→refreshPins`。**既存ではつつくに通常攻撃のKO実績やスキルは付かない**。原作での扱いは未確認なので、技の勝手な拡張はしない。
- HP1の生存スキルが発動してHPが0でなければ、KO`commit`を受け付けない。引数の`eligibilityPhase`は**既存の順序差を隠さない明示オプション**で、原作が違うと証明されたらこの契約で更新する。
- 「一つのKOを重複受付しない」保証は現状**呼び出し元が死体に二度当てないことに依存**。将来のreviveと再KOを含むIDempotency設計はまだ未完成。

### B. `engine/skill-hook-pipeline.mjs`

`createSkillHookPipeline` が現時点の実行可能なパッシブtriggerをまとめた。

- `afterEnemyKO(caster,target)`：現在の「まえのめり」発動。既存の`skillBoosts`へ同じ値を書込み、同じhost eventを出す。
- `afterAnyAction(actor,existingBoost)`：従来の`careAtActionBoundary`（ベンチの「おせわ」も含む）→`EffectCommitter.commitHeal`→スキルイベント→`momentum`残りターン減算・終了通知を順番どおり実行。
- **KOしたそのターンで新規付与した強化を減らさない**：行動開始時に覚えた`existingBoost`の同一オブジェクトに対してだけ減算し、新規付与された強化は次の持ち主の行動から減らす。
- `SKILL_HOOK_CATALOG`は**既存の`content/skill-catalog.mjs`にある唯一の`PLAYTEST_SKILL_CATALOG`から派生**。後から新たな技や妖怪が増えても「トリガー名を2箇所へ手動登録」しない。ただし**登録した新しいスキル効果の実行ハンドラを開発する必要はある**。何でも自動実装されるわけではない。

### C. `engine/combat.mjs`を結線

- 元の`triggerKOAbility`専用実装を削除。
- 通常/必殺/つつくのKO三つのコード箇所を`koLifecycle.commit`へ移行。
- 手動の`careAtActionBoundary`/強化ターン減算を`skillHooks.afterAnyAction`へ置換。
- **既存の6レンタルキャラ/4技/HP・命中・guard・割り込み・Soul・乱数・勝敗は変更なし**。同一hostでスキルイベントを生成するため、ブラウザ側にスキルの判定を重複させない。

## 4. 検証

`tests/v3-skill-knockout-lifecycle.test.mjs` の7テストを追加：
1. 6スキルの発動条件カタログを唯一の既存カタログから派生できる。
2. 通常KOの同期・発動・ピン更新順と、自分の**次の5行動**で強化が減って終了すること。
3. 研究必殺のKOイベント順序が従来どおりであること。
4. つつくは勝手にKOスキルを発生させないこと。
5. 相手の行動後でも隣接した「おせわ」が共通hookから処理されること。
6. HP1で耐えた対象や不正なKO要求を受け付けないこと。
7. 実`MatchProtocol`の自然6レンタル戦闘が3seedで再現可能なこと。

加えて既存の単体6体vs6体完走、`lastStand`2回攻撃・2発必殺テスト、Damage/Care/KO、Stage本物Chromium、Firebase Friends No-Auth 2画面通信、Google Sites単体HTMLのビルドを継続実行。**テストPASSは原作完全再現を保証しない**。

- [Node **719/719 PASS・コード`766db4656`**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40839922240)
- [実Chromium Stage PASS・同コード](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40839922168)
- [**Firebase Friends/RTDBエミュレーター/本物の2 iframe PASS・コード`d3eb03447`**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40839622444)
- 最後にスキルのtriggerメタデータを既存カタログから自動派生へ変更（コード`841a6788b`、専用テスト追加版`a34541cac`）。**最終コードのNode [719/719 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40840254872)、Chromium [PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40840255136)、Firebase Friends RTDB実2 iframe [PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40840226006)**。Firebase版は最終のテストファイル更新より前の同一実装コードで確認。Docsだけの更新はゲーム/通信処理には触れない。

## 5. 未完と次

1. V3-2：**`sharpCrit`/ガード無視/`critImmune`/HP1生存についても同じhook契約を通す**。現在実行部分は旧`combat`の各計算位置に残る。今回の`SKILL_HOOK_CATALOG`は発動条件のdata定義を共有するが実行処理の完全移行ではない。
2. **EffectPlan/typed effect**：技カタログで示される`damage/heal/status/interrupt/KO/Soul`を型ごとに共通実行する。現在は最後のcommitと一部スキルhookのみ共通。
3. **同一seedでの旧版 vs 新版の全状態/イベント・KO・再接続再現**。現状の既存回帰は広いが、本家3DS版との詳細な差分比較は未完。
4. 学校Safari2台での最新エンジンUI試験は未実施。Google Sites公開版・GitHub main・Firebase本番rules/DB・Drive配布ファイルは変更しない。学校の公開版を勝手に更新しない。
