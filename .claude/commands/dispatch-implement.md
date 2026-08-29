---
description: 派工做一次實作型任務（新增 reference、加 SKILL.md recipe、寫新 command）
argument-hint: "[要實作的東西，例如「在 references/ 新增一份說明 whiteboard 命令的文件」]"
---

要實作的東西：$ARGUMENTS

照 `.claude/docs/handoff-templates.md` 的「2. 實作型」模板填空。驗收條件裡的驗證指令，從 `.claude/docs/judgment.md` 第 5 條找對應的實際指令（不要自己編一個聽起來合理的指令）。填好後用 `Agent` 工具派工，`model` 依 `.claude/docs/dispatch.md` 的對照表——一般實作用 `sonnet`；如果這個實作涉及「怎麼取捨內容」這種判斷密集的決定，先自己做這部分判斷，只把機械性的落實部分外包。

完成後別忘了：如果這次新增了頂層檔案或目錄，檢查 `sync-github.ps1` 的 `$PathsToStage` 是否需要更新（見 `.claude/docs/diagnosis.md` 案例 2）。
