# 妖怪ウォッチ2対人再現｜V3-3-5からV3-4へ：戦闘イベントと技・スキルのID参照

2026-10-30 JST。開発ブランチのみ。原作から未確認の行動・スキル効果・アニメーション秒数は新たに作らない。

## 経緯
V3-3-1〜4で、論理行動point / HP・状態の正規commit / 演出表示ms / ホスト送信revisionとゲストACKを分離して検証した。V3-4のデータ駆動化へ移るには、検証ログの「誰が何を行ったか」が現在の**キャラID・技ID・スキルID**に安全につながる必要がある。ただし既存のFirebase snapshotやイベント本体にIDを増やすとcanonical hash・リプレイ・2席通信互換性に影響する。そのため、今回は**既存データに副作用を持たない読み取りAdapter**を採用した。

## 実装
- **新規** `engine/causal-source-trace.mjs` の `inspectCausalSourceTrace({battleSnapshot,catalog,teamCharacterIds})`：正規event IDごとに `{eventId,type,actorId,characterId,moveId,moveSlot,passiveSkillId,evidence,domain:'canonical-commit'}` を、immutableなauthoring catalogから作る。攻撃・妖術/回復・とりつき・必殺技はそれぞれ単一のID参照。ガード・サボり・スキル自体は架空の「技ID」を付けずnullとする。各技のヒット数・威力・ターゲットは既存のmove masterにのみ保持する。
- `visible` と `buffered` は別領域 `presentation-research-ms` で、表示sequence、開始at、visibleAt、delayedを表す。正規 `eventId` と表示 `sequence` は**1:1で結び付けていない**。今の両ログには同一イベントの対応識別子が無いため、確証なしに時刻や一致関係を製造しない。後から必要になった際は、Hostのイベント正規生成側で決まったIDを表示へ明示的に伝播する規約を設計すること。
- `engine/combat.mjs`で`battle.inspectCausality()`を公開。各`rental-01..06`の`attack/technique/inspirit/soultimate`と`skill`を、`RENTAL_CHARACTER_MOVE_REFS`と`RENTAL_LAB_CATALOG`または学校用`RENTAL_SCHOOL_CATALOG`から取得。**元データを直接コピーせず、同一catalogを利用**。
- `engine/match-core.mjs` → `engine/match-protocol.mjs` にread-only `inspectCausality()`を渡す。**Firebase配信snapshot / 本番HTML UI / 正規events / RNG / Damage / 行動時計 / journal / network hashは一切変更しない**。
- **重要な境界条件**：明示的に`teams`を渡した自作チームは、レンタルと見た目・名前・パラメーターが同じでも**同一IDだと推測しない**。actor-source IDマッピングを持たないcustom teamはnullのまま。照合した名前・skill・5stats・actorIdが違えばfail-closed。これによって将来追加キャラの誤同定を防ぐ。
- 全返却は凍結した新しい診断オブジェクトであり、元状態の配列や参照を公開しない。

## 自動テスト
- 新規 `tests/v3-causal-source-trace.test.mjs` **5件**。両陣営6体の**計24種類の著作技枠**を確定データのIDに結び付け、正常・無行動・スキル・表示中/表示後・自作チーム非推論・偽造ID/重複event・invalid timestampを検証。
- `tests/match-core-owner-v3.test.mjs`の、公開メソッド名を固定したAPIテストを新しい読み取り専用公開メソッドに追随させた。最初のCIでここだけ失敗（**793/794 PASS, 1 fail**）したが、ゲーム動作バグではなく新しい公開APIを意図的に含めたことによる契約更新。修正後の同テスト・新5件は正式CI合格。
- コードSHA `1ad6c7fd95190d71c8430962bf14e2ccd62d821a`：[Research battle unit tests run 40912717332](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40912717332) **Node 794/794 PASS, fail 0**、自然6vs6決着耐久とChromium実操作QAまで全Job SUCCESS。独立`match.inspectCausality()`呼び出しの前後で`snapshot`・`hash`・`journal`がbyte-equivalentであることも検証。
- 同SHA：[Firebase Friends no-Auth run 40912717660](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40912717660) **全工程SUCCESS**。Google Sites単体HTML build（76 source modules、Friends未配布版295,292bytes）、RTDB Emulator実2席/24ホスト行動とACK一致、切断再接続、ホスト公開遅延、実Chromium 2iframe・4埋め込み幅、旧期限Rules別Emulatorテストを全件合格。本番Firebaseは予約済み非ルームキーGET1回のHTTP 200（本文未閲覧、書込0）。

## 原作と資料の根拠
- [Mt. Wildwood｜Yo-kai Watch 2 Turn Order](https://mtwildwood.net/turn-order.php?g=yw2)：前衛のwaitカウンタと次の行動の順序、通常action wait3、切替システムwait0。**対戦時のms↔point変換は定義していない**。
- [攻略大百科｜妖怪ウォッチ2 能力・アクション画面の見方](https://gamepedia.jp/youkai-yw2/archives/1446)：キャラが4種の行動「こうげき・ようじゅつ・ひっさつ・とりつく」と受動スキルを持つというゲーム構造。**攻撃効果、status、技名、秒数の原作一致までは裏付けない**。
- 参考原作動画の生データはこのチャットで直接再生できていない。レンタル6体とIDはゲーム用の**創作・fixture**であり、本家の実データ・名称を転写したものではない。

## 次の仕事：V3-4へ移行
1. 現在の`RENTAL_MOVE_MASTER`、character refs、skill catalogが持つauthoring IDsに合わせ、**新キャラ追加時に必要な定義・検証・任意UIラベルを共通の入力形**で扱う。まず6体現行データを1つの取り込み境界で検証し、同じ通常戦闘・必殺・スキル効果が既存legacyホストと同一seed/操作で一致することを証明。
2. `rental`限定の分岐/重複した形検証を、外部の好きなキャラと混同せず汎用定義に寄せる。源が明確な情報はevidence/sourceRefs、未確認はfixture/unknownを維持。原作未確認の数値を勝手に「公式」へ昇格させない。
3. 元動画と学校iPad Safari2台は未検証。main・学校公開HTML・本番Firebase Rules/DB/Auth・Driveへの変更は本人が明示的に頼んだ時のみ。

**進捗：V3-3-5の読み取り共通規約まで実装。V3-4のデータ駆動完成、V3-5原作体験・iPad実機完了ではない。**
