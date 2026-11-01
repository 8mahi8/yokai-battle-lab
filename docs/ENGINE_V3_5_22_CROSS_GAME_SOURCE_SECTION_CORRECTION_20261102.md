# 妖怪ウォッチ2忠実再現｜V3-5-22 原作データ・ゲーム別見出しの誤読訂正

2026-11-02 ｜ブランチ `feat/phase1-action-circle-lab-20261023`

## 最重要：旧V3-5-19〜21の数値主張を訂正

前担当が引用した [Mt. Wildwood Shogunyan](https://mtwildwood.net/yw2/yokai/shogunyan) は、URLに `/yw2/` を含んでいても**1ページ内に『Yo-kai Watch（初代）』『Yo-kai Watch 2』『Yo-kai Watch 3』の独立見出しを併記**している。

ページの各セクションを読み直したところ、**22×9は初代『妖怪ウォッチ』の「Bonito Blade」であり、YW2版の数値ではない**。前V3-5-20/21の「YW2解析系では22×9」という主張は誤り。以下の事実と明確に区別する。

| ゲーム・掲載版 | ブシニャン必殺「かつおブシ斬り」 | 通常攻撃「閃光ぎり」 | 位置 |
|---|---|---|---|
| 初代 Yo-kai Watch セクション | 22×9 | 20×2 | Mt. Wildwood 上記URLの『Yo-kai Watch』見出し |
| Yo-kai Watch 2 セクション | **25×9** | **20×2** | 同URLの独立『Yo-kai Watch 2』見出し |
| 日本語のYW2専門資料 | **25×10**（[攻略大百科](https://gamepedia.jp/youkai-yw2/specials/3892)、[game-cap](https://game-cap.com/youkaiwatch2/data/youkai_bushinyan.html)）／**20×10**（[game-e](https://game-e.com/youkai-watch-2/youkai/322.php)） | **20×3**（[攻略大百科キャラ](https://gamepedia.jp/youkai-yw2/monsters/459)、game-cap、[GameConductor](https://gameconductor.com/yw2/jiten/detail/?no=353)） | いずれもYW2と明記のページ |

注意：ページ内のゲーム別値が異なる理由（対戦・NPC・内部表記・取得形態）はまだ調査中であり、独立の情報として保持する。Mt. WildwoodのYW2表記であっても、**ゲーム実機の敵3体へのダメージ回数の分配**まで証明するものではない。

**前V3-5-19の「通常技20×3は独立3資料が一致するので確定」とする表現も不十分。** 3件の日本語専門資料間では一致するが、同ゲームの別資料は20×2。どちらも真実と断定して原作対戦へ適用しない。

## コードの訂正

- `content/yw2-multitarget-soultimate-research.mjs`：YW2必殺威力の出典候補を25（日本語2資料＋Mt. Wildwoodの**YW2**セクション）、20（game-e）のみに訂正。Hit数10（日本語）/9（Mt. Wildwood YW2）は未確定。初代22×9は `excludedOtherGames:[{game:'yw1',...}]` として別のゲーム区分に明記。対象別Hitの割当・KO時の再標的化は引き続き `null`、`battleReady:false`。
- `content/yw2-attack-reference.mjs`：通常技威力20は維持、`hitsPerTarget:null` / `hitEvidence.status:'disputed'`、日本語20×3とMt. Wildwood YW2の20×2を出典別に保持。`yw2ReferenceAttackResearchOverride(id,profile)` は**明示的に `jp-guides` か `mtwildwood-yw2` を指定する研究画面からだけ**使える。未指定や未知profileはエラー。どちらかを自動選択せず、学校レンタル6体・原作対戦ルールに混ぜない。
- `lab/match-stage.html`：`?review=yw2-bushinyan-attack` は従来からの日本語資料20×3試験（**未確定の別解釈**）であることを明示。`?review=yw2-bushinyan-attack-mtw` でYW2別資料20×2も研究用カスタムHost上で描画。両者は同一の出典に裏付けされた代替研究で、原作仕様の選定ではない。
- `tests/v3-5-19-source-backed-normal-three-hit.test.mjs` と `tests/v3-5-20-unresolved-multitarget-and-recovery.test.mjs` を過去の誤った断定に合わせ続けないよう修正。`tests/v3-5-22-cross-game-provenance-audit.test.mjs` で初代/YW2混同の再発、未指定profile拒否、双方の実Host・両席スナップショット一致・6体不変を回帰検証。`tools/stage-smoke.mjs` に実Chromiumで2Hitと3Hitの別試行を追加。

## 今回の判断

1. **ゲーム上の原作技Hit分配・KO後標的変更はまだ実装しない。** 出典の数値だけでは1体への配分規則が不明。前工程で研究保留にした判断は適切。
2. **出典誤読を修正するために既存Hostの戦闘やFirebase通信を作り直さない。** 情報に不一致があるため原作再現の確定材料にできないだけで、試験用Fixtureの2/3Hit描画機能自体は必要。
3. 旧記録は監査履歴として残し、当文書を訂正の単一入口とする。今後原作資料を読む際はURL文字列ではなく、ページのゲーム別/キャラ別/対戦用個体別の**見出しと本文を同時に確認**する。

## テスト／開発状態

開始前 `d5572d2` のNode、Chromium、Firebase 2席 CIはすべて成功している。**今工程コードHEADの新CI結果は完了後に必ず追記し、未完了なら成功としない。**

学校Safari実機2台・原作3DS動画フレームの直接視聴は未実施。学校Google Sites埋込HTML・Firebase Rules/Auth/DB・GitHub main/Pages・Drive配布は未変更。原作の完全再現は未完了。

## 次工程：V3-5-23

試合中の大きな差分を優先する。出典を再検証したうえで元動画や本家の実プレイ映像を直接観察できれば、**1つの全体多段必殺の対象Hit列・KO後の挙動**を確認する。その証拠がなければ、学校Safariでの実プレイ・操作とバトルテンポなど現状のゲーム品質の検証を進める。別タイトル由来の数値や架空の原作ヒット数は導入しない。
