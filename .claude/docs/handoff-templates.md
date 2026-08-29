---
name: handoff-templates
purpose: 五種任務型態的交辦模板——填空即可用，對應這個 repo 實際會發生的工作
read_when: 要派工給 subagent 前；或直接打對應的 /dispatch-* slash command 讓它引導你填空
---

# 任務交辦 prompt 範本

每個模板都是「任務交辦三要素」的填空版：**目標與動機 / 驗收條件 / 回報格式**（見 [`dispatch.md`](dispatch.md) 或 [`dispatch-codex.md`](dispatch-codex.md)，視你用哪個 CLI）。模板內容本身跟 CLI 無關，兩邊共用。

**Claude Code**：對應的 slash command 在 `.claude/commands/dispatch-*.md`，打指令後由目前 session 帶你把填空填好，再呼叫 `Agent` 工具——不是指令自己直接分岔出子 agent（原因見 `dispatch.md` 的「沒有通用的『effort』參數」段落下方的模型選擇邏輯：填空判斷要先由目前 session 做完，才輪到派工）。

**Codex CLI**：沒有對應的 in-repo slash command（Codex 的 Custom Prompts 已棄用，且是使用者主目錄層級，無法隨 repo 發布）。直接把填好的模板內容貼進給 subagent 的自然語言派工指示裡即可，見 `dispatch-codex.md`。

## 1. 搜尋型（Explore / general-purpose，通常 `sonnet` 或 `haiku`）

適用：找某個版本號出現在哪些檔案、找某個 CLI 指令被 `SKILL.md` 引用在哪幾處、確認某個路徑是否存在。

```
目標與動機：找出 ______（要找的東西），因為 ______（找到後要拿來做什麼決定）。
驗收條件：回報所有符合的 file:line；如果找不到，明確說「找不到」而不是沉默略過。
回報格式：只回結論清單（file:line + 一句話說明），不要貼整份檔案內容。
Do NOT：不要在找的過程中順手改檔案——搜尋型任務只讀不寫。
```

## 2. 實作型（sonnet，除非牽涉判斷密集的內容取捨則指揮官自己做）

適用：新增一份 `references/*.md`、在 `SKILL.md` 加一條 recipe、寫一支新的 `.claude/commands/*.md`。

```
目標與動機：實作 ______，因為 ______（對應哪個使用情境或哪個 diagnosis.md／使用者需求）。
驗收條件：① 內容符合 ______（例如既有 references/*.md 的格式慣例）；② 跑 ______ 驗證指令（見 judgment.md 第 5 條）通過；③ 沒有動到清單外的檔案。
回報格式：改了哪些檔案（file:line）、驗證指令的實際輸出（不是「應該沒問題」）。
Do NOT：不要順手「順便」重構旁邊看起來不整潔的內容——只做交辦範圍內的事。
```

## 3. 重構型（sonnet 起手，opus 或指揮官做最終取捨）

適用：合併重複的 reference 內容、重新命名檔案、調整目錄結構。

```
目標與動機：把 ______ 重構成 ______，因為 ______（現況造成什麼具體問題，不是「比較乾淨」這種模糊理由）。
驗收條件：① 重構後的行為/內容與重構前等價（列出怎麼比對）；② 所有引用舊路徑/舊名稱的地方都同步更新（含 CLAUDE.md 的索引表、SKILL.md 裡的 reference 連結）；③ 驗證指令通過。
回報格式：改動前後的對照（file:line → file:line）、有沒有找到並修掉遺漏的引用。
Do NOT：不要在同一次重構裡混入新功能——先重構完、驗證通過，新功能另開任務。
```

## 4. 研究型（Explore 找起點，claude-code-guide 用於 Claude Code/API 相關問題）

適用：研究 Heptabase CLI 新版本改了什麼、查證某個 Claude Code 功能是否真的存在再使用。

```
目標與動機：研究 ______，因為要用這個結果來決定 ______（不是為了研究而研究）。
驗收條件：結論必須標明「已驗證（附來源/指令輸出）」或「未驗證，建議使用者自行確認」，不能含糊帶過當作已驗證。
回報格式：結論 + 依據（file:line 或指令輸出或文件連結）+ 信心程度。
Do NOT：不要把「查不到」寫成「應該是這樣」——查不到就明說查不到，見 judgment.md 第 5 條與 dispatch.md 的驗證不自驗。
```

## 5. 審查型（fresh-context，一定不能是原本寫這段內容的那個 agent）

適用：審查一次 `SKILL.md` 改動是否符合 skills-ref 規範、審查一次版本 bump 是否照 `CONTRIBUTING.md` 的 Release Checklist 全部做到。

```
目標與動機：審查 ______ 是否符合 ______（具體規範來源，例如 CONTRIBUTING.md 的 Release Checklist、skills-ref 規範）。
驗收條件：逐條列出規範項目，每項標記「符合／不符合／無法確認」，不接受整體式的「看起來沒問題」。
回報格式：逐條核對表 + 對不符合項目的具體修法建議。
Do NOT：不要只審查「有沒有做」，要審查「做得對不對」——例如兩份 plugin.json 版本號都存在不代表它們數字一致。
```
