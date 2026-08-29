---
description: 派工做一次審查型任務（審查改動是否符合規範、驗收條件是否真的達成）
argument-hint: "[要審查的東西與規範來源，例如「這次的版本 bump 是否照 CONTRIBUTING.md 的 Release Checklist 全部做到」]"
---

要審查的東西：$ARGUMENTS

照 `.claude/docs/handoff-templates.md` 的「5. 審查型」模板填空。**這是「驗證不自驗」規則的具體執行入口**（見 `.claude/docs/dispatch.md`）——派工對象必須是 fresh-context agent，絕對不能是剛才做這次改動的那個 subagent 或指揮官自己剛寫完就自己審。

驗收條件必須是逐條核對表格式（規範項目 → 符合／不符合／無法確認），不接受「整體看起來沒問題」這種整體式結論。如果審查對象涉及 `CONTRIBUTING.md` 的 Release Checklist 或 skills-ref 規範，優先實際跑對應驗證指令（`npx --yes skills-ref validate ./skills/heptabase-cli`、`claude plugin validate .`、`node scripts/validate-cursor-plugin.mjs`），不要只用肉眼比對規範文字。
