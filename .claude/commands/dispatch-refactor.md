---
description: 派工做一次重構型任務（合併重複內容、改檔名、調整目錄結構）
argument-hint: "[要重構的東西與原因，例如「合併 references 裡重複的 CLI 輸出範例」]"
---

要重構的東西：$ARGUMENTS

照 `.claude/docs/handoff-templates.md` 的「3. 重構型」模板填空——動機那格必須寫「現況造成什麼具體問題」，不能只寫「比較乾淨」。填好後用 `Agent` 工具派工，先用 `sonnet` 起手；如果牽涉到要不要改變某個既有慣例（例如檔名風格、目錄結構），這個取捨判斷由目前 session 自己做，不要外包給 subagent 自己決定。

驗收條件務必包含「找出所有引用舊路徑/舊名稱的地方並同步更新」——包含 `CLAUDE.md` 的索引表、`SKILL.md` 裡的 reference 連結。重構後派一個**不同於**執行重構的 fresh-context subagent 做審查型驗證（`/dispatch-review`），不要自己驗自己。
