---
description: 派工做一次研究型任務（查 Heptabase CLI 新版本改動、查證 Claude Code 功能是否存在）
argument-hint: "[要研究的問題，例如「heptabase --version 0.5.x 有沒有新增 whiteboard 相關指令」]"
---

要研究的問題：$ARGUMENTS

照 `.claude/docs/handoff-templates.md` 的「4. 研究型」模板填空。如果問題跟 Claude Code 本身的功能/語法有關（slash command、hooks、MCP、SDK），派工時 `subagent_type` 優先選 `claude-code-guide`；其餘用 `Explore` 或 `general-purpose`。`model` 選 `sonnet` 即可，除非問題本身需要綜合判斷多個矛盾來源。

驗收條件的核心規則來自 `.claude/docs/judgment.md` 第 5 條：**結論必須標明「已驗證」或「未驗證，建議使用者自行確認」**，不接受模稜兩可的「應該是這樣」。回報時附上依據（file:line、指令實際輸出、或文件連結），不是憑印象的轉述。
