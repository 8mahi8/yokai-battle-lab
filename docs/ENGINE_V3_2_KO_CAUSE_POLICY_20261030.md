# 妖怪ウォッチ2対戦 Engine V3-2｜KO原因別ポリシーの共通化（2026-10-30）

## 目的・先に確認した事実
KO/スキル/状態の発火順序を原作未確認のまま統一してしまうと、原作の重要な戦術に誤差が出る。現在のホストでは**通常攻撃と必殺技で行動可否とKOスキルの順序が異なり、つつくでのKOには撃破者のスキルを付けない**。これは原作仕様が証明された相違点ではなく、**既存の研究用ホストの暫定契約**である。現状保存したまま、単一の名前付きポリシーで管理する。

### 外部資料による確認
- [妖怪ウォッチ2 攻略「ゲームの匠」スキル一覧](https://youkai-gh.g-takumi.com/skill_list.php)：`まえのめり`は「敵を倒すたび、攻撃力がアップ」。**KO時にスキルが発動する意味**を裏付ける。表示演出の前後や行動可否同期の瞬間までは証明しない。
- [妖怪ウォッチ2 スキル「まえのめり」](https://gamepedia.jp/youkai-yw2/skills/3033)：敵撃破による攻撃力上昇の記載。
- [妖怪ウォッチ2 スキル効果一覧](https://yw.blog.jp/archives/1009191722.html)：`まえのめり`は5ターンの間「ちから」「ようりょく」上昇という記述。現在の`SKILL_TRIAL.momentumOwnerTurns=5`と一致するが、**発動したターンが5ターンに含まれるか/自己行動以外の影響/正確なアップ量は未確定**。
- [妖怪ウォッチ2バトルシステム](https://game8.jp/youkai-watch2/505163)：妖気・ターゲット/メンバーサークル・おはらいの操作カテゴリの参考。今回KO順序の根拠にはしていない。
- 本人の原作対戦動画の生データは今回も直接アクセス・再観察できていない。

## 実装
- `engine/knockout-lifecycle.mjs`に不変の`KO_CAUSE_POLICY`と`ko.commitForCause({cause,caster?,target})`を追加。3種類の暫定契約：
  - **ordinary**：`before-skill`の行動可否同期→撃破者カウント・スキル→ピン更新。
  - **special**：撃破者カウント・スキル→`after-skill`の行動可否同期。ピン更新はこれまでどおり別タイミング。
  - **poke**：行動可否同期→ピン更新。撃破者カウント・スキルなし。
- `engine/hit-aftermath.mjs`の通常/必殺KOと`engine/combat.mjs`のPoke KOを原因別APIへ変更。KOの直接確定ロジック`commit`は既存テストや研究入力を壊さないよう保持。**原作のKO処理順を新たに決定していない。**
- 入力causeは必ず明示。無効なcause、必須撃破者なし、Pokeに架空の撃破者付与、HP非0なら副作用開始前に拒否。ポリシーはfreezeし、キャラ/スキルを増やすときに別々のbranchで暗黙の`eligibilityPhase`を発明しない。
- `tests/hit-aftermath-v3.test.mjs`をAPI変更に追随。新規`tests/v3-ko-cause-policy.test.mjs`で①不変ポリシー②旧commitとのイベント/KO数/状態の差分一致③全3種類のcallback正確な順序④不正入力の無変更を検証。

## 検証
- GitHub実ソースを使用するCode Mode V8内で新規4テストの本文を実行し、**4/4 PASS**（正式Nodeではない）。
- **正式QA合格**。コードコミット `6dd708ca2698452b01e342ac470b7533a7ac61f4` に対する[Research battle unit tests run 40899693694](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40899693694)は**775件／775件PASS、fail 0**。同runで実6対6自然対戦耐久とChromium research UI操作もSUCCESS。
- **オンラインQA合格**：[Phase37 Firebase Friends no Auth QA run 40899693718](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40899693718) 全Job SUCCESS。実Firebase Emulatorのルーム/ルール/24ホスト行動とACK・canonical snapshot照合、Chromium real 2iframe/no-Auth・host clock停止/再開、4横幅、Google Sites向け単体HTML build（74 source modules）PASS。本番Firebaseは読み取り専用の予約キーGET HTTP200（書込・body閲覧なし）。学校Safari実機2台は未試験。
- **原作のKOスキル/とりつき/演出フレーム順序は引き続き研究課題**。本cause政策と正式CIは既存研究動作の保全を証明するもので、原作優先順の保証ではない。
- PRはDraft。main・学校Google Sites版・本番Firebase Rules/DB/Auth・Drive変更なし。

## 次の作業
CIとFirebase統合QAが合格したら、本V3-2の**KO・状態・ターン末効果の効果順序表**をV3-3時間領域設計へ接続する。スキル発動から相手の画面反映、チャージcut-in中の停止/表示保留は、実原作動画/対人資料/双方iPad試験で分かる範囲を分離して記録し、未確認は推測で実装しない。**現在V3-2後半で未完成**。
