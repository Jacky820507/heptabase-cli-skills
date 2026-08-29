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

### 2026-07-04：`install-codex.ps1` 的複製目標可能與 Codex CLI 目前的 skill 探索路徑不符

**發生什麼**：`install-codex.ps1` 把 `skills/` 複製到 `~/.codex/skills/`（見該檔案 `$CodexSkillsDir` 預設值）。但查證 Codex CLI 官方文件（`developers.openai.com/codex/skills`，2026-07-04 用 WebFetch 直接讀取確認）顯示目前的 skill 探索路徑是 repo 層的 `.agents/skills`（`$CWD/.agents/skills`、`$REPO_ROOT/.agents/skills`）與使用者層的 `$HOME/.agents/skills`，文件裡完全沒有提到 `~/.codex/skills` 這個路徑。

**為什麼會發生**：不確定——可能是這支腳本寫成的時候 Codex CLI 用的是舊路徑慣例，後來官方改了探索路徑但這支腳本沒跟著更新；也可能官方文件本身有其他相容路徑沒寫清楚。兩種可能都沒有查證到足夠證據排除另一種。

**怎麼處理的**：**沒有修改 `install-codex.ps1`**。這是一支 README 記載、會實際影響使用者安裝結果的產品腳本，屬於 `maintenance.md`「動之前必須先問使用者」的範圍——貿然把複製目標從 `~/.codex/skills/` 改成 `$HOME/.agents/skills`，如果判斷錯了會讓原本能用的安裝流程失效。只在這裡記錄發現，並在 `CLAUDE.md`／`AGENTS.md` 的 repo map 裡加了提示。**`README.md:26` 也寫著同樣的 `~/.codex/skills` 路徑（"typically `~/.codex/skills`"）**——如果之後真的要修 `install-codex.ps1`，這裡也要跟著改，目前只有這筆記錄提到 README 這處，沒有另外列進 `maintenance.md` 的表格。

**要不要吸收成規則**：待使用者確認後處理，不是待吸收成規則——這不是「這個 repo 常犯的錯」，是一次性的「腳本可能過時」問題。使用者確認實際情況後（例如親自測試 `~/.codex/skills/` 現在還能不能被 Codex 讀到），視結果決定是否修改 `install-codex.ps1` 的 `$CodexSkillsDir` 預設值，並在那時把這筆記錄更新成「已處理」或刪除。

---

### 2026-07-03：`sync-github.ps1` 的發布白名單不包含新建立的 `CLAUDE.md`／`.claude/`

**發生什麼**：這套治理系統（`CLAUDE.md` + `.claude/docs/*.md` + `.claude/commands/*.md`）建置時，`sync-github.ps1` 的 `$PathsToStage` 陣列裡沒有 `CLAUDE.md` 或 `.claude`，如果照文件記載的發布流程跑這支腳本，這些新檔案會被靜默排除、不會被推到遠端。

**為什麼會發生**：這支腳本在治理系統之前就存在，白名單是針對當時的頂層檔案手動列出的，沒有機制會自動偵測「新增了一個頂層路徑」。

**怎麼處理的**：同一次 session 內已經把 `"CLAUDE.md"` 與 `".claude"` 加進 `$PathsToStage`（見 `sync-github.ps1`）。

**要不要吸收成規則**：待吸收——已經吸收進 `diagnosis.md` 案例 2 與 `maintenance.md` 的「需先問使用者」表格。這筆記錄留著是因為「白名單漏掉新路徑」這個模式以後還會再發生（下次新增其他頂層目錄時），保留原始案例方便對照。
