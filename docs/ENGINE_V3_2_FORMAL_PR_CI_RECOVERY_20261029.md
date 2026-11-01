# 妖怪ウォッチ2対戦｜Engine V3-2 正式GitHub Actions CI復旧と771件全件合格（2026-10-29）

## 背景：長くCI結果を取得できなかった本当の原因
- GitHub連携の`fetch_commit_workflow_runs`は**pull_request起動のワークフローのみ**取得する。一方、既存`.github/workflows/research-unit.yml`は開発ブランチへの**push起動**のみだった。したがって空配列は「テスト未実行」を意味しなかった。
- 開発ブランチの`research-unit.yml`に、mainをベースとするDraft PR用`pull_request`起動（engine/content/tests、テストtools、ワークフロー自身に限定）を追加した。もともとのpush・workflow_dispatchは維持。権限`contents: read`、外部公開・本番DB変更・成果物配布なし。
- PR #1は引き続きDraft。main・Google Sites本番・Firebase本番Rules/DB/Auth・Google Drive無変更。

## 第1回：初めて取得できた正式CIの失敗と根本原因
- 検証対象コミット：`c52c54fdfa5f9e326d658dd0fa28f52e44e8495e`。
- [GitHub Actions run 40896591460](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40896591460)：Node **771中769合格・2失敗**。研究用Poke Soul転送の2テスト（`tests/poke-soul-transfer-v3.test.mjs`）だけが失敗。
- 実データの`Poke`イベントには既存戦闘イベント識別機構による`eventId: 1`が付く。以前追加したテストの`deepStrictEqual`期待値にはそのフィールドが欠落。報酬量/recipient/source/HP/Soulに差はなく、**エンジンの新旧処理不一致や本家仕様の問題ではなくテストの期待値漏れ**だった。
- コミット`6cc44050ba92ea39c19a807d6aba929559d88193`：研究・試遊両方のPokeイベント期待値に`eventId:1`を明示。イベント採番は`tests/phase46-event-identity.test.mjs`で元々正規仕様。**ゲームエンジン/効果数値/乱数/レンタルパーティ/通信コード変更なし**。

## 第2回：実証された正式CI成功
- 対象コードコミット：`6cc44050ba92ea39c19a807d6aba929559d88193`。
- **[GitHub Actions run 40896818659](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40896818659) PASS**（Job unit success）。ログを直接取得し以下を確認：
  1. Node source syntax checks：success。
  2. `node --test tests/*.test.mjs`：**771 tests / 771 pass / 0 fail / 0 skip**。V3-2の研究用全impact preflight、HP/Status Commit、96条件の新旧差分比較、Poke Soul移動、既存Match Protocol等のテストを含む。
  3. `node tools/normal-match-endurance.mjs`：4 seedの6体vs6体自動戦闘がすべて自然決着。seed20261026/20261023/212/8192、122/119/178/205 actions、勝者あり、`NORMAL-RENTAL-ENDURANCE-PASS`をログで確認。
  4. `node tools/browser-smoke.mjs`：**Chromium実DOMでPASS**。2チームUI、Soul/チャージ、零式Pokeタップと妖気移動、ホスト・ゲスト操作とACK/リプレイ、ダメージ表示、5種類のおはらいポインタ操作、Flash関連UIの正常処理をログで確認。

## どこまで証明できたか
- **確認済み**：V3-2コードと最近追加した計771件のNode回帰テスト、自然対戦4本、開発環境の実Chromium UI操作が同じ正式コードコミットで合格した。これまでのローカルV8単体テストより強い根拠になった。
- **まだ確認していない**：最新V3-2 HEADに対するFirebase Friends no-Auth RTDB Emulatorの2つの独立した実クライアント通信E2E、Google Sites用単体HTML buildと埋め込み操作、**学校iPad Safari実機2台**。今回のChromium browser-smokeをそれらの代用とはしない。
- **原作再現の未確定部分**：命中/抵抗/技威力の資料未照合箇所、複数Hitや回転の演出時間、KO/スキル発火優先、双方画面におけるカットイン中の表示と入力。本人提供動画の原本は今回新たに直接視聴していない。原作の完全再現達成とは宣言しない。
- 現在のフェーズ：**V3-2後半、未完成**。次はFirebase二席E2EとGoogle Sites buildを正式に確認し、原作の未知の順序を守りながら残るAction/Status/Hit lifecycle境界を整理。V3-3実時間/行動順、V3-4データID汎用、V3-5学校実機試験へ。

## 以降のCI運用
- PRとpushのイベントを混同せず、**実行番号・コミットSHA・Jobの各step・Nodeテスト総数・失敗ログ**をセットで報告。
- docs-onlyコミット後、CI検証済みの最新コードコミットがどれかを必ず明記。現時点では`6cc44050`。後日新しいエンジンコードに手を入れたら、必ずその新SHAで再チェックする。
