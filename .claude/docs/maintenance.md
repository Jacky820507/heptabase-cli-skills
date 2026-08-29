---
name: maintenance
purpose: 哪些檔案可以自己改、哪些要先問使用者；踩雷教訓要寫回哪裡、累積多少要精簡
read_when: 要動任何既有檔案之前
---

# 維護協議

## 可以自行修改（不用先問）

- `.claude/docs/*.md`（這套治理文件本身）、`CLAUDE.md`、`AGENTS.md`——新增內容、修正過時資訊、補充案例。改完記得同步更新 `CLAUDE.md`**與** `AGENTS.md` 的索引表（兩份檔案分別是 Claude Code 與 Codex CLI 的自動載入入口，內容大致平行，只有派工機制那塊不同——改一份的 repo map／硬規則時檢查另一份是否也要跟著改，這是這套系統目前最明顯的「兩份索引要手動同步」風險點）。
- `skills/heptabase-cli/references/*.md` 的**內容擴充**——例如補一個新的 CLI 輸出範例、修正一個過時的欄位說明。前提是格式跟既有內容一致，且改完跑過 `npx --yes skills-ref validate ./skills/heptabase-cli` 通過。**結構性改動**（重新命名 reference 檔案、合併/拆分多份 reference）不算「內容擴充」，屬於重構型任務，套用 `handoff-templates.md` 的「3. 重構型」模板，且要找出並同步更新所有引用舊路徑的地方（含 `SKILL.md` 裡的連結）。
- 純措辭/錯字修正，不改變任何行為或規則語意的地方（`README.md`、`CONTRIBUTING.md` 的文字潤飾，但不改流程本身——`CONTRIBUTING.md` 記載的 Release Checklist、版本判斷順序等**流程內容**不算「純措辭」，改流程前必須先問）。

## 動之前必須先問使用者

| 檔案/路徑 | 為什麼要先問 |
|---|---|
| `.claude-plugin/plugin.json`、`.cursor-plugin/plugin.json` 的 `version` | 這是對外發版的訊號，改錯或改早都會讓使用者的 Claude Code 收到不對的更新 |
| `.claude-plugin/marketplace.json` | `CONTRIBUTING.md` 明講「不要在這裡加 plugin 的 version 欄位，除非刻意改變版本策略」——這是刻意的架構決定，不是隨手能改的設定 |
| `skills/heptabase-cli/SKILL.md` 的 `allowed-tools`、`metadata.heptabase-cli-version-range` | 改 `allowed-tools` 會改變這個 skill 能執行什麼指令，是安全邊界；改版本範圍要對應實際 CLI 相容性，不是憑感覺調 |
| `skills/gmail-to-heptabase-cards/**` | 使用者的私人自動化，含白板 ID 等個人設定；skill 內文也明講「不要把私人白名單寫回 skill 檔案」 |
| `silent_run.vbs`、`sync_upstream.bat` | 使用者私人腳本，沒有出現在任何文件裡；見 `diagnosis.md` 案例 3，不刪、不改、不「順手」文件化 |
| `.githooks/*`、`.github/workflows/*` | 動到 CI／git hook 行為，出錯會影響所有後續 commit 或 PR |
| `sync-github.ps1` 的 `$PathsToStage` 陣列 | 這是發布白名單，改錯會讓某些檔案永遠發不出去或發出不該發的東西；見 `diagnosis.md` 案例 2 |
| `install-codex.ps1`、`enable-codex-auto-sync.ps1` | `README.md` 記載的產品安裝腳本，是使用者安裝/更新 Codex 版 skill 的唯一途徑；改壞了會讓 README 的安裝說明失效 |

**判斷不確定屬於哪一類時**：套用 [`judgment.md`](judgment.md) 第 3 條「何時該停下來問使用者」——不可逆、沒有文件記載、猜錯代價高 → 問。

## 踩雷教訓寫回哪裡

- **這個 repo 通用、任何人接手都該知道的教訓**（例如又發現一個沒人文件化的腳本、又發現一個版本號容易搞混的地方）→ 寫進 [`lessons-learned.md`](lessons-learned.md)，格式見該檔案開頭的規範。
- **只跟這個使用者的個人偏好或工作習慣有關**（例如「這個使用者喜歡先看 diff 再決定要不要跑 validate」）→ 存進 Claude Code 的記憶系統，不要寫進 repo 檔案（記憶系統的細節見 `CLAUDE.md` 的「記憶 vs repo 檔案」段落）。
- 不確定算哪一類 → 寫進 `lessons-learned.md`，寧可讓 repo 檔案略多一點記錄，也不要讓教訓只存在某一次對話裡、下一個 session 完全看不到。

## 累積多長要精簡

`lessons-learned.md` 超過約 **150 行或 30 條記錄**時：
1. 把仍然成立、還會再發生的教訓（例如「新增頂層檔案要檢查 `sync-github.ps1`」這種結構性問題）整理進對應的治理文件本體（`diagnosis.md`／`maintenance.md`），變成規則而不是一條條記錄。
2. 已經被規則吸收、或已經不會再發生的舊記錄（例如某個已修好的一次性 bug）可以刪除。
3. 精簡後的 `lessons-learned.md` 應該只剩下「還沒被歸納成規則、但值得留著觀察」的記錄。
