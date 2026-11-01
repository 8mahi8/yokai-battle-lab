# 妖怪ウォッチ2 Engine V3-4-13｜ジバニャン固有の性格抽選とサボり重みの版別照合

2026-10-30。開発ブランチのみ。**原作データを読むだけで学校版の行動AIを変更しない。** 今回の最大の成果は、元レンタルAIが偶然一致していた「Grouchy」を**YW2の100%固定原作根拠に結び付けた**ことと、**YW1のサボり重み5をYW2の原作値として流用しない**と明確化したこと。

## 原作研究・版の違い

- [Mt. Wildwood, Attitudes（**YKW2**）](https://mtwildwood.net/attitudes.php?g=yw2)：原作の一般的な妖怪には40%/30%/20%/10%の4候補があるが、**GrouchyのYW2欄に「Jibanyan 100%」と明記**。したがって研究用ジバニャンは、個別のランダム性格選択器を新設せず、**Grouchy固定**として原作資料に基づいて扱える。
- [Mt. Wildwood, Jibanyan（**YKW2ページ**）](https://mtwildwood.net/yw2/yokai/jibanyan)：本ページは**YW1→YW2→YW3の節が連続**している。**「Default Attitude Grouchy · loaf weight 5」**はページの**YW1節**にあり、**YW2の「Battle behaviour」節は基本行動重み55/30/10/5のみを記載**する。従って**YW2ジバニャンのLoaf重み5をこの資料から確定してはいけない**。YW2についてレベル99の実Loaf％や厳密計算式も確認できず、**unknown**として保持する。
- [Mt. Wildwood, Attitudes（YKW2）](https://mtwildwood.net/attitudes.php?g=yw2)：サボり判定は基礎値・レベル・相手のSoothing Rhythm・Leader・Intimidation/Too Serious等から影響を受け、性格・通常技の加重抽選に**先行**する。一般論としての「loaf weight」をLv99の「毎行動5％サボる」に変換しない。
- ジバニャン原作3技（するどいつめ10×2/火花の術20/しびれるお札Lv2）、基本行動重み55/30/10/5、Grouchy優先規則は前工程から維持。必殺ひゃくれつ肉球20×5/20×7の資料不一致は**disputed**のまま、Skill sealと原作サボり確率、正確な性格ごとのLoaf判定は未完成。

## コード

1. `content/yw2-original-reference-pack.mjs`：ジバニャンに`behavior.attitudeOptions=documented([{attitude:'grouchy',chance:100}],['yw2_attitudes'])`を追加。対応source URLは`https://mtwildwood.net/attitudes.php?g=yw2`。**Loafは`behavior.loafWeight=unknown(['yw2_attitudes'])`**と明示。YKW1ページ由来の5を誤って記録しない。
2. `content/yw2-source-intake.mjs`：任意`attitudeOptions`は出典付きfact必須、documentedなら1〜4候補/重複IDなし/非負整数合計100、`loafWeight`は別factとして0〜100範囲の整数またはunknown/disputedを受け付ける。知識とランタイムを混同しない。UI研究用`getPreview`に原作の性格候補とraw loaf weightを出すが、未知のLoafは`null`。
3. `content/yw2-jibanyan-normal-moves-lab.mjs`：研究用`buildJibanyanNormalMoveLab({includeSourceAttitude:true})`を追加。**出典付きGrouchy 100%という単独候補が厳密にあるときだけ**既存`personality.attitude`へセット。4候補型なら抽選時刻/実確率の再現契約がないため安全に拒否。既存`CombatCatalog`→`BattleProfile V2`→`createCombat`を使い続け、追加RNGなし。
4. ジバニャン研究用prototypeは元から**仮のGrouchy**を持っていたため、今回の実装により**ゲームの実際の結果は変わらない**。ただし**それが正式な原作根拠で100%正しいことを確認できた**。人格全体の`provenance.personality='fixture'`と`battleReady:false`は維持し、`researchProvenance.originalFixedAttitude='grouchy'`、`originalLoafWeight=null`で確証ある部品だけ識別。
5. `loafChancePercent`は研究用の**従来fixture値**のまま。Loaf重みの無根拠な導入・倍率作成・実装オプションの学校オンラインへの開放はしていない。

## 自動検証

新規`tests/v3-yw2-fixed-attitude-loaf-source.test.mjs` **6件**：
- 100% Grouchyの出典とdeepFreeze、YW2 loafWeight unknown／Komasanは未登録のまま。
- 原作3技+基本重み+固定Grouchyを左右の各6体へ編成し、元の性格・装備・Loaf chanceはfixture維持。
- **source-on/off×4 seeded試合×100行動のHP/RNG/events/snapshot完全一致**：性格が固定100%なので新しい抽選乱数を消費しない。
- unknown/disputed/multiple-attitude候補はGrouchyを勝手に採用せず拒否、正規の出典付き多候補研究データはUI側に残せる。
- 不正な候補・重複・合計99/101・未知Loafの入力検証と、**YW1由来5を入力してもYW2実行Loaf確率に昇格させない**こと。
- カスタム`MatchProtocol`実戦リプレイと、Lab/School旧6体の正規host試合/replay不変。

- 初回の6新規テストでは880件中879件PASS、1件失敗。原因：原作「speed-down」研究フラグ必須のカスタムキャラを、**そのフラグを禁止する現行オンライン`MatchProtocol`**に渡そうとしたテストの誤り。**本番オンライン契約は緩めず**、オンラインは速度研究flag不要の2技編成で試験して修正。
- **正式コードSHA `d059a76d0e05f458d934d753b869c156fb7c1435`**：[Research battle CI #40939515534](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40939515534) **Node 880/880件PASS、fail0、skip0**。実6vs6自然対戦の耐久試験、実Chromium操作（零式つつく・妖気移動・カウンター輪）もSUCCESS。
- [Firebase Friends noAuth CI #40939515663](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40939515663) **正式全Job SUCCESS**：本物のFirebase RTDB Emulatorで2席24行動/ACK/正規snapshot一致、切断再接続と冪等再送、8 host行動分の公開遅延、実Chromium2iframe/4種類のGoogle Sites埋込幅、未配布HTML build**76 modules**全てPASS。本番Firebaseは予約済み非ルームキーへの**GET1回（200/本文未閲覧/書込0）**のみ。**学校Safari実機2台での検証ではない**。

## 現在地と次工程

**V3-4-13：ジバニャンの原作性格の100%固定根拠と、作品を跨いだLoaf資料混入の遮断**。V3-4原作対戦再現全体は未完。次のV3-4-14では(1)性格適用後の**Forgot to Guard・Pacifist・Chatty等の原作override**の実行契約、(2)未完成の攻撃damage-down状態、(3)実原作の必殺hitCount5/7衝突の順に、現行エンジンの価値が高い部分へ最小限でつなぐ。元動画と学校Safari実機2台、学校Google Sites直接貼り付け版は未検証。

main/学校版Google Sites HTML/Firebase本番DB・Security Rules・Auth/Google Driveは更新しない。Draft PR #1開発ブランチのみ更新。
