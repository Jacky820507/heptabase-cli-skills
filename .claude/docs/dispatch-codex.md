---
name: dispatch-codex
purpose: Codex CLI 版的模型調度守則——跟 dispatch.md（Claude Code 版）同樣原則，但派工機制不同
read_when: 用 Codex CLI 在這個 repo 工作、要決定自己做還是交辦出去的時候
---

# 模型調度守則（Codex CLI 版）

如果你是 Claude Code，請改讀 [`dispatch.md`](dispatch.md)——這份是 Codex 專屬的派工機制，其餘判斷原則兩份文件相同。

## 原則：指揮官不下場（跟 Claude Code 版一樣）

你是指揮官，價值在判斷不在體力活。大量讀檔、掃 repo、查文件、批次改檔、跑驗證指令一律交辦；只有「換便宜模型會掉品質」的判斷本身自己做。判準與正反例見 [`dispatch.md`](dispatch.md) 的對應段落——這條原則跟你用哪個 CLI 無關，不重複寫一次。

## Codex 的派工機制，跟 Claude Code 不一樣

Codex CLI **沒有**一個像 Claude Code `Agent` 工具那樣、有固定 schema 可以查詢的派工工具。以下是 2026-07-04 查證 OpenAI 官方文件（`developers.openai.com/codex/concepts/subagents`）得到的結果：

- **怎麼派工**：用自然語言在對話裡明確要求，例如「產生 3 個 subagent 平行處理 X、Y、Z」。不是呼叫某個工具，是直接在 prompt 裡寫清楚要分派幾個、做什麼。
- **可以指定 model 與 reasoning effort**：可以幫每個 subagent 指定用哪個 model、`model_reasoning_effort`（例如次要的平行小工作用便宜的 model，判斷密集的用貴的）。
- **UNVERIFIED（查不到官方明確定義，第三方資料提到但沒有在官方頁面確認）**：`~/.codex/config.toml` 是否有 `[agents]` 區塊可以設定 `max_threads`／`max_depth` 這類參數。用之前自己查證目前版本的 `codex --help` 或官方文件，不要假設這個設定一定存在或語法如第三方資料所述。

**這代表你沒有一個可以直接檢查的「subagent 型別清單」或「model enum」**（不像 `dispatch.md` 可以叫 Claude Code 查 `Agent` 工具 schema）。要知道當下能用的 model 選項，直接問 Codex 本身，或查當時的官方文件，不要沿用這份文件裡任何具體 model 名稱——這份文件刻意不列出型號，因為會過時。

## `AGENTS.md` 的技術限制（跟這個 repo 直接相關）

- Codex 會從 repo 根目錄往下逐層找 `AGENTS.override.md`／`AGENTS.md`，串接起來一起讀，**串接後總大小上限 32 KiB**（`project_doc_max_bytes`，可在 `config.toml` 調整）。這個 repo 目前只有根目錄一份 `AGENTS.md`，離上限還很遠，但如果之後有人在子目錄（例如 `skills/heptabase-cli/`）加一份 `AGENTS.md`，要注意疊加後的總大小。
- `AGENTS.md` **沒有** `@file` 這類 import 語法，純粹當作靜態文字讀入——所以這份治理系統一直沒有用 import 語法（跟 `CLAUDE.md` 的設計一致），不是漏做。
- Codex 的「Custom Prompts」（`~/.codex/prompts/*.md`）官方文件已標記**棄用**，改推薦用 Skills 做可重複使用的指令——所以這個 repo 不會有 `.claude/commands/dispatch-*.md` 的 Codex 對應版本，見 `AGENTS.md` 的「派工」段落。

## 任務交辦三要素、回報合約、升降級路徑、驗證不自驗

這四塊跟 Claude Code 版完全共用同一套原則，差別只在「怎麼實際發出派工指令」（上面已經講完）：

- **任務交辦三要素**（目標與動機／驗收條件／回報格式）與五種任務型態的填空模板 → 直接用 [`handoff-templates.md`](handoff-templates.md)，內容跟 CLI 無關，把填好的模板貼進給 Codex subagent 的指示裡即可。
- **回報合約**（只回結論 + `file:line`，長產物存檔傳路徑）、**升降級路徑**（錯一次升級／中階同錯兩次帶失敗軌跡升級／解法降回便宜模型批次套用／最多兩輪重試）、**驗證不自驗**（fresh-context 讀回、實際跑 `npx --yes skills-ref validate ./skills/heptabase-cli`／`claude plugin validate .`／`node scripts/validate-cursor-plugin.mjs`、高風險判斷找第二意見）→ 規則本身見 [`dispatch.md`](dispatch.md) 對應段落，原則不因為換了 CLI 而改變，唯一要注意的是：升降級講的「同一模型重跑」在 Codex 這裡，合理的對應說法是「同一個 subagent 指示裡明講的 model 不變，重新下一次自然語言派工指令」——**這是這份文件作者的推論，不是查證自 OpenAI 官方文件的事實**，Codex 官方文件沒有明講「重跑」該怎麼對應。如果實際用起來這個對應不合理，直接改掉，不用當成既定規則。
