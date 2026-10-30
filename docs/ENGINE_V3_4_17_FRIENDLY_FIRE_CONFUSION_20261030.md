# YW2 V3-4-17｜混乱による味方誤攻撃を共通行動・命中・KOへ接続（研究限定）

2026-10-30 JST。V3-4-16からの継続。原作の通常試合を完成したという意味ではなく、**共通エンジンの次の不足を1つ埋めた**。学校Google Sites直接貼付版、GitHub main、本番Firebase DB/Auth/Rules、Drive配布は未変更。

## 原作2の根拠と不確実性

- [Mt. Wildwood YW2 Wazzat](https://www.mtwildwood.net/yw2/yokai/wazzat)：わすれん帽の「Memory Eater」は「被とりつき妖怪の**自身の行動時**に味方へ誤攻撃する確率を持つ」、Lv1=10%、複数回付与で最大Lv5=50%、戦闘終了またはおはらいまで。**命中（付与）成功確率と、付与後の毎行動の誤攻撃率を混同しない**。
- [Mt. Wildwood YW2 Houzzat](https://www.mtwildwood.net/yw2/yokai/houzzat)、[YW2 Inspirit list](https://www.mtwildwood.net/inspirits.php?g=yw2)：メゾン・ドワスレ「Memory Loss」は原作Lv3の同種効果。とりつきリストでは「味方を攻撃」「Lv3」「持続期限なし」。
- [Game8 妖怪ウォッチ2 わすれん帽](https://game8.jp/youkai-watch2/497052)、[メゾン・ドワスレ](https://game8.jp/youkai-watch2/496843)、[ゲームe](https://game-e.com/youkai-watch-2/youkai/048.php)：日本語の効果と「敵前衛全体を混乱させる」必殺を確認。
- **不明/未検証**：味方の誰を狙うか（候補は前衛のみか、体力や位置による重みはあるか）、混乱とサボり判定の優先順位、他の行動禁止スキル・魅了/とりつき競合、ランダムの内部消費順、多段とりつきのレベル加算タイミング、混乱した味方が自傷可能か、実機の演出。**これらを「原作実証済み」としない**。

## 実装した共通経路

1. `engine/confusion-action.mjs` は純粋なオーナー行動判定。既存StatusLedgerの`friendly-fire`陰性エントリを読み、研究用にLvを合算（上限5）、10%×Lvで1回だけ判定。原作の味方対象の厳密な抽選は不明なので、**生存中の他の味方前衛からの一様抽選を明示的fixture**として使う。状態が無い／他の生存前衛がいない時に余計な乱数を消費しない。
2. `content/inspirit-effect-master.mjs` に出典付きの`friendly-fire/negative/target_override`を登録。既存の選択器`actionWeights/pickAction`を再利用し、別のAI抽選器は増やさない。
3. `engine/combat.mjs` は`researchYw2Confusion:true`かつ**明示custom teams + researchDamageModel**のみで、通常の行動開始時に共通resolverを呼ぶ。発動した時は攻撃を味方へ向けるが、**物理命中・会心・ガード・被弾・Interrupt・HP commitは今ある経路**を使う。原作AI/画面仕様に無い特別なボタンはない。
4. 同陣営KOで`afterEnemyKO`や「敵を倒した」カウントが誤発火しないよう、共通KO原因`friendly-fire`を追加。同じ`before-skill` eligibility／ピン更新の既存メカニクスを使う。敵KOの順序はそのまま。ここも原作の詳細なフレーム順序ではなく、**内部の正規処理整合**を優先した判断。
5. `applyInspirit({effect:'friendly-fire'})` は研究flag必須、陰性、時間制限なし。これまでのLedgerと後衛おはらいを使う。試合のイベントに`confusion:{level,chancePercent,triggered,targetId,targetModel:'research-unverified'}`を追加するのも研究flag経由だけ。
6. **既存6体/通常online MatchProtocolにこのflagは許可されていない**。初期の原作2体Wazzat/Houzzatの研究パックは現在、4技中のとりつき/必殺がfixtureのまま、`battleReady=false`。研究エンジンの機構ができたこととキャラ完成を分ける。

## 検証範囲

- 新規 `tests/v3-yw2-friendly-fire-confusion.test.mjs`：確率境界Lv1/Lv3/Lv5・二重付与上限、原作とfixtureの区別、既存AIでの負とりつき付与、実6vs6で同陣営への攻撃とHP減少、同陣営KOの敵扱い防止、後衛の既存おはらい、追加flagなしの戦闘/RNGスナップショット一致、オンラインflag拒否。
- `tests/phase1-7-inspirit-source-and-host.test.mjs` の分類マスター8件固定という旧assertを、新型追加を明示した9件+旧8ID不変へ修正。これは**既存本番レンタルの6つの技を変更したものではない**。
- GitHub Actionsの結果はランIDを監査して後から追記する。ローカル/学校Safari2台・元3DS動画フレームとの比較はこの工程では未実施。CIだけを原作完全再現の証拠としない。

## 次の1工程

まず今回のCI/ブラウザ/2席Firebaseを確認して不具合修正。次に「原作とりつき/必殺のレベル・対象・成功判定」を`TypedEffectPlan`と既存StatusLedgerへ繋ぎ、**わすれん帽とメゾン・ドワスレのInspiritと必殺2種**を実戦化する。ただし元レンタルへの追加・学校公開は行わず、不明な確率は研究ラベルのままにする。現在地：V3-4-17研究用共通混乱 → V3-4残工程 → V3-5エンジン完成判定。