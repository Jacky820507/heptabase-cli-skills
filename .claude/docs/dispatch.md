---
name: dispatch
purpose: 模型與 subagent 調度守則——指揮官不下場、任務交辦怎麼寫、怎麼驗證
read_when: 要用 Agent 工具派 subagent、或要決定自己做還是交辦出去的時候
---

# 模型調度守則

如果你是 Codex CLI，請改讀 [`dispatch-codex.md`](dispatch-codex.md)——這份文件裡的 `Agent` 工具、`subagent_type`、model 別名都是 Claude Code 專屬語法，Codex 沒有對應的固定 schema 可以套用。

## 原則：指揮官不下場

你（正在跟使用者對話的這個 session）是指揮官。指揮官的價值在**判斷**，不在**體力活**。

- **一律派給便宜 subagent 做**：大量讀檔、掃整個 repo、查外部文件、批次改檔、跑驗證指令、對已完成工作做二次確認。
- **指揮官自己做**：只有「換成便宜模型會掉品質」的判斷本身——例如要不要升級模型、一個模稜兩可的規則怎麼解讀、要不要停下來問使用者。

**判準（不是感覺，是問句）**：這件事如果讓 Haiku 做，會不會因為「漏看細節」或「無法判斷模稜兩可之處」而做錯？會 → 指揮官自己做或用高階模型；不會（純體力/機械性）→ 派便宜 subagent。

- **反例（不該做的事）**：指揮官自己一個一個檔案 `Read` 全部 `skills/heptabase-cli/references/*.md` 只是為了確認格式一致——這是機械性掃描，該派 subagent。
- **正例（該做的事）**：指揮官自己決定「`silent_run.vbs` 該不該刪」——這需要判斷這支腳本是不是使用者在用的私人工具，體力活模型容易誤判成「沒人管的雜物就刪掉」。

## 驗證過的 model 值（本次盤點於 2026-07-03 觀察到，並非查文件得來）

`Agent` 工具的 `model` 參數是這幾個別名，不是完整 model ID：

| 別名（`Agent` 工具的 `model` 參數用這個） | 完整 model ID |
|---|---|
| `sonnet` | `claude-sonnet-5` |
| `opus` | `claude-opus-4-8` |
| `haiku` | `claude-haiku-4-5-20251001` |
| `fable` | `claude-fable-5` |

**這張表可能過時**——model 會改版。用之前先確認：呼叫 `Agent` 工具時看它的 schema 裡 `model` 參數的 enum 值是否還是這四個；如果 enum 變了，以你自己 session 當下看到的為準，不要死守這張表，並考慮更新這份文件。

## 沒有通用的「effort」參數

**這件事本次盤點特別澄清，因為容易被誤解**：`Agent` 工具本身**沒有** `effort` 參數可以套在任意派工上。`effort`（`low`/`medium`/`high`/`xhigh`/`max`）只存在於這幾個地方：

- `/code-review` skill 的參數（例如 `/code-review high`）。
- `ReportFindings` 工具的 `level` 欄位。
- Slash command／skill 檔案的 frontmatter 可以宣告 `effort:` 欄位（`.claude/commands/dispatch-*.md` 目前沒有用到這個欄位，只是舉例說明這個欄位存在的位置，不是「照抄那幾個檔案就看得到」）。

如果你想控制一個 subagent 花多少力氣，能動的旋鈕是：① 選 `model`（sonnet/opus/haiku/fable）、② 選 `subagent_type`、③ prompt 裡寫清楚要多深入（例如「快速掃過即可」vs「逐行核對」）。不要在 `Agent` 呼叫裡自己發明一個 `effort` 參數塞進去，schema 沒有這個欄位會直接報錯。

## 本 session 觀察到的 subagent 型別

這些是 harness 層級（不是這個 repo 特有）的通用 subagent，2026-07-03 觀察到：`claude`（萬用）、`claude-code-guide`（Claude Code/SDK/API 問題專用）、`Explore`（唯讀快速搜尋）、`general-purpose`、`Plan`（架構規劃）、`statusline-setup`。

**這份清單可能隨 harness 版本變動。** 呼叫 `Agent` 工具前，看它當下 schema 裡列出的 `subagent_type` 有哪些，不要假設上面這幾個一定都在。如果發現清單變了，更新這份文件。

## 任務交辦三要素

派工給 subagent 時，prompt 必須包含這三件事，缺一不可（模板見 [`handoff-templates.md`](handoff-templates.md)）：

1. **目標與動機**——不只是「做什麼」，還要「為什麼」，讓 subagent 在遇到你沒預想到的狀況時能自己判斷。
2. **驗收條件**——怎樣算做完、做對。寫成可檢查的句子，不要寫「弄好」這種模糊詞。
3. **回報格式**——見下面「回報合約」。

## Model 選擇對照表

| 任務類型 | 建議 model | 理由 |
|---|---|---|
| 讀檔、找檔案、跑既有指令、格式化輸出 | `haiku` 或 `sonnet` | 機械性，不需要判斷 |
| 一般實作、改 `references/*.md` 內容、寫 slash command | `sonnet` | 這個 harness 長期預設的主力模型 |
| 需要解讀模稜兩可規則、架構設計、對抗審查 | `opus`（若可用）或指揮官自己做 | 判斷密集 |
| 這份治理系統本身的高判斷內容（rubric、升降級邏輯） | 指揮官自己寫，不外包 | 外包等於沒有把判斷力真的轉移出去 |

**沒有查到「哪個任務一定要哪個 model」的官方規定**——上面是本次盤點的建議，不是查證出來的規則。如果你的 session 對某類任務發現更好的對照，更新這張表並在 `lessons-learned.md` 記一筆。

## 回報合約

Subagent 只回傳**結論**與 `file:line` 引用，不要把整份掃描結果貼回主對話。長產物（完整檔案內容、完整 log）一律先存檔，subagent 的回報裡只給路徑。

**範例（正確）**：
> 已確認三個 `.claude-plugin`/`.cursor-plugin` 版本號一致，均為 `1.4.1`（`.claude-plugin/plugin.json:3`、`.cursor-plugin/plugin.json:3`）。完整比對輸出存於 `/tmp/.../version-check.txt`。

**反例（錯誤，浪費指揮官的 context）**：
> 把三個 `plugin.json` 的完整內容原封不動貼回來，讓指揮官自己找哪裡不一樣。

## 升降級路徑

1. **便宜模型（haiku）錯一次** → 該次任務直接升到 `sonnet` 重做，不要在原模型上重試第二次。
2. **中階模型（sonnet）同一個子任務連錯兩次** → 升級（`opus` 或指揮官自己做），派工時**附上完整的失敗軌跡**（前兩次錯在哪、錯誤訊息、已排除的可能原因），不要讓升級後的 agent 從零開始摸索。
3. **找到能解的模式後** → 降回便宜模型，把同一個模式**批次套用**到其餘同類任務（例如：確認一個 `SKILL.md` 改法能通過 `npx --yes skills-ref validate` 後，其餘 `references/*.md` 的類似小改動可以交回 `haiku`）。
4. **同一件事最多重試兩輪**（含升級後那一輪）。兩輪都失敗，停下來問使用者，不要繼續換模型硬試——這通常代表問題不是「模型不夠強」，而是「需求本身不清楚」，見 [`judgment.md`](judgment.md) 的「換路 vs 重試」判準。

**repo 實例**：假設要把 `skills/heptabase-cli/references/property-values.md` 的某個範例更新成新的 CLI 輸出格式。`haiku` 直接改壞了 JSON 縮排 → 升到 `sonnet` 重做並附上壞掉的 diff → `sonnet` 改對了、也順手發現另外兩份 reference 有同樣的舊格式 → 把「用新格式取代舊格式」這個具體模式交回 `haiku` 批次套用到那兩份。

## 驗證不自驗

寫東西的 subagent，不能是驗證自己寫得對不對的那個 subagent——一律換一個**沒有先前對話記憶**的 fresh-context agent 或指揮官自己動手驗證。

- **檔案類改動**：派 fresh-context subagent 用 `Read` 把改完的檔案讀回來，跟原始需求逐條核對，不要只看 diff 有沒有跑完。
- **程式碼/設定類改動**：實際跑 `CONTRIBUTING.md` 列的三個指令——`npx --yes skills-ref validate ./skills/heptabase-cli`、`claude plugin validate .`、`node scripts/validate-cursor-plugin.mjs`——不要只用肉眼看設定檔覺得「應該沒問題」。
- **高風險判斷**（例如要不要刪一個看起來沒用的檔案、要不要改動 `allowed-tools`）：找第二意見，或者用不同 prompt 問兩次比較答案是否一致，而不是單一 agent 的第一個答案就採信。

**範例**：改完 `.claude-plugin/plugin.json` 的 `version` 後，不要自己看一眼覺得「數字對了就好」——派一個沒看過這次改動過程的 subagent，讀取這個檔案並比對 `.cursor-plugin/plugin.json`，確認兩邊真的一致。
