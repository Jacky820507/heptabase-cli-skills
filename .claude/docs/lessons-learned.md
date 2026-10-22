---
name: lessons-learned
purpose: 累積的踩雷記錄——還沒被歸納成規則、但值得留著觀察的教訓
read_when: 開始任務前掃一眼；踩雷後在這裡加一筆
---

# 踩雷記錄

## 格式

每筆記錄用這個結構，新記錄加在最上面（最新的在前）：

```
### YYYY-MM-DD：一句話標題

**發生什麼**：具體描述踩到的坑，附 file:line 或指令輸出。
**為什麼會發生**：根本原因，不是表面現象。
**怎麼處理的**：這次怎麼修的，或還沒修完的話目前卡在哪。
**要不要吸收成規則**：如果這是會重複發生的結構性問題，標記「待吸收進 diagnosis.md / maintenance.md」；如果是一次性狀況，標記「一次性，不需要變成規則」。
```

累積超過約 150 行或 30 條時，照 [`maintenance.md`](maintenance.md) 的「累積多長要精簡」處理。

---

### 2026-08-30：`scripts/validate-cursor-plugin.mjs` 在 Windows 本機跑不了

**發生什麼**：在 Windows（PowerShell 與 Git Bash 都一樣）跑 `node scripts/validate-cursor-plugin.mjs` 會失敗：`Cursor plugin schema validation failed: spawnSync npx ENOENT`。確認 `npx`／`npx.cmd` 都在 PATH 上（`where npx` 有回傳），問題出在腳本內用 `spawnSync("npx", ...)`——Node 在 Windows 上呼叫 `spawnSync` 時不會自動幫 `npx` 加上 `.cmd` 副檔名或用 shell 解析，除非顯式加 `shell: true` 或指定完整檔名，這是 Node on Windows 常見的已知行為。

**為什麼會發生**：這支腳本大概率是在 macOS/Linux（含 GitHub Actions CI）上寫成並測試的，那些平台上 `spawnSync("npx", ...)` 可以直接找到執行檔，不需要特殊處理；Windows 是例外情況，寫腳本的人可能沒有在 Windows 本機測過。

**怎麼處理的**：**沒有修改 `scripts/validate-cursor-plugin.mjs`**——這是 CI／發版流程共用的驗證腳本，屬於「動之前先確認影響範圍」的範圍，且 CI 本身（GitHub Actions，通常跑 Linux runner）大機率不受影響，貿然改 spawn 方式有風險。只在這裡記錄：**在 Windows 本機做 Release Checklist／preflight 時，這一步验证目前跑不過，需要使用者確認是否要修（例如改成 `spawnSync("npx.cmd", ...)` 或加 `shell: true`），或改成在 CI／WSL 上跑這個驗證**。

**要不要吸收成規則**：待使用者確認後處理。如果之後要修，屬於 `maintenance.md` 沒明講但風險等級接近「`.githooks/`、CI」那類，修之前先問。

---

### 2026-08-29（已處理）：`install-codex.ps1` 複製目標路徑的疑慮已由上游 README 更新解除

**發生什麼**：2026-07-04 曾記錄「`install-codex.ps1` 複製到 `~/.codex/skills/`，可能與 Codex 官方文件記載的 `.agents/skills` 探索路徑不符」。這次合併上游 `main`（17 個新 commit，含 `ed0a765`／`ca52ce4` "docs: add .agents skills layout for Codex and other agents"）後，`README.md` 已明確寫成「Copy the contents of `skills/` into your user skills path (prefer `~/.agents/skills/`; `~/.codex/skills/` still works)」——確認兩個路徑目前都相容，`~/.agents/skills/` 是官方建議的優先路徑。

**為什麼會發生**：Codex 官方在兩個路徑之間做了過渡期相容，上游維護者後來在文件裡把這件事講清楚了，不是這個 fork 這邊的判斷錯誤。

**怎麼處理的**：`CLAUDE.md`／`AGENTS.md` 的 repo map 已更新為「兩個路徑目前都相容，`~/.agents/skills/` 優先」，不再標記「未確認」。**仍未動 `install-codex.ps1` 本身**——它目前的 `~/.codex/skills/` 預設值依然有效，沒有非改不可的理由；如果之後要把預設值換成 `~/.agents/skills/`，仍屬於 `maintenance.md`「動之前必須先問使用者」的範圍。

**要不要吸收成規則**：一次性狀況，已解決，不需要變成規則。保留這筆記錄只是為了交代前一筆記錄的後續。

---

### 2026-07-03：`sync-github.ps1` 的發布白名單不包含新建立的 `CLAUDE.md`／`.claude/`

**發生什麼**：這套治理系統（`CLAUDE.md` + `.claude/docs/*.md` + `.claude/commands/*.md`）建置時，`sync-github.ps1` 的 `$PathsToStage` 陣列裡沒有 `CLAUDE.md` 或 `.claude`，如果照文件記載的發布流程跑這支腳本，這些新檔案會被靜默排除、不會被推到遠端。

**為什麼會發生**：這支腳本在治理系統之前就存在，白名單是針對當時的頂層檔案手動列出的，沒有機制會自動偵測「新增了一個頂層路徑」。

**怎麼處理的**：同一次 session 內已經把 `"CLAUDE.md"` 與 `".claude"` 加進 `$PathsToStage`（見 `sync-github.ps1`）。

**要不要吸收成規則**：待吸收——已經吸收進 `diagnosis.md` 案例 2 與 `maintenance.md` 的「需先問使用者」表格。這筆記錄留著是因為「白名單漏掉新路徑」這個模式以後還會再發生（下次新增其他頂層目錄時），保留原始案例方便對照。
