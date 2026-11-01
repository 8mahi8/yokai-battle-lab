# 妖怪対戦｜V3-2 パッシブ会心・ガード・生存Hookの共通化（2026-10-29）

## 1. 引き継ぎ時の根拠と方針

- 対象は `feat/phase1-action-circle-lab-20261023` のみ。学校Google Sites稼働版、main、本番Firebase Rules/DB、Driveには触れない。
- 最新のV3設計は [ENGINE_V3_ARCHITECTURE_SOURCE_FIRST_20261029](./ENGINE_V3_ARCHITECTURE_SOURCE_FIRST_20261029.md)。過去の6段階ロードマップと139件の開発文書を参照する場合、当時のSupabase/Firebase Auth選択・Phase番号・旧READMEを最新の方針と混同しない。
- 2026-10-29現在の通信方式は**Firebase RTDB／認証なしFriends／ホスト権威**。以前のSupabase CI失敗は現在の通信基盤の失敗ではない（[通信方式の正本](./SCHOOL_NETWORK_SOURCE_OF_TRUTH_20261029.md)）。
- 既存 [KO・スキルのV3-2共通化](./ENGINE_V3_2_KO_SKILL_LIFECYCLE_20261029.md) では `afterEnemyKO` と `afterAnyAction` まで抽出した。まだ会心等の4スキルは `engine/combat.mjs` に分散していた。
- 原作「妖怪ウォッチ2」の**発動順と厳密数値は未確定**。既存 `SKILL_TRIAL` の研究用値を変更したり、新しい原作確定値として扱ってはいけない。過去に担当者が原作動画のフレームを見た記録は参照したが、本工程で元MP4を直接開いていない。

## 2. 今回のコード差分

1. `engine/skill-hook-pipeline.mjs`：既存 `content/skill-catalog.mjs` の `trigger` を唯一のauthoring sourceにし、以下の副作用なしの実行入口を追加。
   - `beforeCriticalRoll(actor,baseBonus)`：`sharpCrit` の会心加算（上限98）。
   - `beforeDefenderCriticalRoll(defender,baseImmune)`：`critImmune` の会心無効。
   - `beforeGuardedPhysicalHit(attacker,baseGuardBreak)`：`guardBreak` の物理ガード無視。
   - `beforeLethalDamage(target,amount,spent)`：`lastStand` のHP1生存判定。
2. `engine/combat.mjs`：通常攻撃・攻撃妖術の会心とガード判定、共通 `EffectCommitter` が呼ぶ生存判定を上記Hookへ移動。乱数の抽選場所・抽選回数、命中/計算式、ガード倍率、HP確定・割り込み・KOの順番、既存のカスタム技の分岐を変えない。後で初期化した `skillHooks` をHP確定時に参照する閉包として結線した。
3. `tests/v3-skill-knockout-lifecycle.test.mjs`：6種のうち上記4種の発動・未発動・無効化・不正引数・生存判定の非破壊性を調べる2テストを追加。既存7ケースは維持。

変更したコードの履歴：
- [パッシブHook追加](https://github.com/8mahi8/yokai-battle-lab/commit/b7368acb6c135c592277ba7c397d4022aeafb3c2)
- [combatの実接続](https://github.com/8mahi8/yokai-battle-lab/commit/1d404c632470b12cb92fb21436be32e4ac5ffcde)
- [2ケース追加](https://github.com/8mahi8/yokai-battle-lab/commit/ccd54c6fca49592879ee8a9938c5379f48d7b7d9)

## 3. 検証と制約

- **今回の手元検査**：接続GitHubから現行の `skill-catalog.mjs`、`skill-effects.mjs`、`skill-hook-pipeline.mjs` を改めて取得。import/export構文のみ実行用に置換してV8上で実行し、元の直接判定と新しいHookの結果を、スキル6種類×ON/OFF×会心6条件・ガード/無効化/HP1耐久等にわたる **158条件で一致**を確認。HookはHPやイベントを勝手に変えない。
- `engine/combat.mjs` の参照が新Hookを指すことをソース照合。新しい外部依存やネットワーク仕様の変更なし。
- **同一HEADのNode全体スイート/自然6対6対戦/Chromium Stage/Firebase Friends Emulator 2席CIは、今回この時点では新たな結果を確認できていない。完了扱いしない。** 直前の旧V3-2版の[719/719 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40840254872)、[Chromium PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40840255136)、[Firebase 2 iframe PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40840226006)は**今回の変更後の受入証拠ではない**。
- GitHub Actionsの `research-unit.yml` はブランチへのpushで、`phase37-firebase-friends.yml` は `engine/**` 変更で自動起動する設定。両者の最終コードSHAをGitHubのrun内で直接確認するまでは、試験に合格したと断言しない。
- 学校Safari実機2台、原作内部Hook時刻と正確な倍率・確率、動画元ファイルは今回未検証。

## 4. 残るV3-2と次の最小工程

1. **先に自動受入ゲート**：`node --test tests/*.test.mjs`、自然6対6戦闘耐久、実Chromium Stage、Firebase Friends no-Auth/RTDB Emulator 2iframe、単体HTMLビルド。新コミットのsha・失敗箇所を残す。失敗なら先に修正する。
2. **既存 vs 新版同一seedの差分**：既定6体・ガード持ち・被会心・会心強化・HP1耐久で、host snapshot/hash、毎打イベント、KO/中断/妖気、2席ACKが一切変わらないことをテスト。研究用カスタム編成を標準レンタルの根拠にしない。
3. **次の新機能は個別必殺の追加ではなく型付きEffectPlan**：`content/rental-move-master.mjs` → 共通ActionIntent → target/accuracy/hit/guard/commit/heal/status/KO hooksを一つの型・順序で結ぶ。DoT、Soul/interrupt/poke/purifyは未統合境界として明示。未知の原作優先順位はテスト上の現行互換として保持し、正式な原作順と呼ばない。
4. V3-3（行動ポイント/妖気/プレイヤー別表示）→V3-4（ID登録だけでキャラ追加）→V3-5（試合全体・学校実機）に進む。**V3-2もまだ未完**。

**今回**：前担当の研究に基づく4スキルの共通Hook実接続、専用テスト追加、独立V8 158条件PASS、資料再監査。

**全体のどこ**：V3-2 Effect/Skill/KO共通エンジン（部分実装）。V3-0完、V3-1の入口まで完、V3-3以降未着手。

**次**：最新HEADの正式CI結果確認 → 旧新版比較 → typed EffectPlan → V3-3。

**本人の出番**：現時点では不要。学校版へ貼り付けるHTMLや本番Firebaseは変更しない。
