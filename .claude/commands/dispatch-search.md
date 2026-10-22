---
description: 派工做一次搜尋型任務（找檔案、找版本號出現位置、確認路徑是否存在）
argument-hint: "[要找的東西，例如「所有引用 0.4.x 版本範圍的地方」]"
---

要找的東西：$ARGUMENTS

照 `.claude/docs/handoff-templates.md` 的「1. 搜尋型」模板，把「目標與動機」「驗收條件」「回報格式」填好（動機要問使用者或從對話上下文推斷，不要留空）。填好後用 `Agent` 工具派工，`subagent_type` 選 `Explore`（唯讀快速搜尋）或 `general-purpose`，`model` 依 `.claude/docs/dispatch.md` 的「Model 選擇對照表」選擇（機械性搜尋通常 `haiku` 或 `sonnet` 即可，不要預設用最貴的模型）。

派工前務必確認：這是唯讀任務，不要給它會寫檔的權限。
