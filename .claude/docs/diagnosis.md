---
name: diagnosis
purpose: 此 harness 在這個 repo 最容易漏 token、失焦、出錯的三個地方，各附一個修法
read_when: 一進入這個 repo 就先讀這份；之後每次要做「發版」「同步」「新增頂層檔案」相關的事，動手前再讀一次
---

# 快速診斷

這份是給接手這個 repo 的較弱模型看的。三個案例都是這次盤點時**實際讀檔確認過**，不是猜測。

## 1. 三種「版本號」長得像，其實管不同的事

這個 repo 裡至少有三個地方寫著版本號，容易改錯或漏改：

- `.claude-plugin/plugin.json` 的 `version`（例如 `1.4.1`）—— **這是 Claude Code 判斷「有新版本」的唯一依據**（見 `CONTRIBUTING.md` 的 Release Process）。
- `.cursor-plugin/plugin.json` 的 `version` —— Cursor 用的，規則要求跟上面那個**手動保持一致**，沒有任何自動化幫你同步。
- `skills/heptabase-cli/SKILL.md` frontmatter 裡 `metadata.heptabase-cli-version-range`（例如 `"0.4.x"`）—— 這是**外部 Heptabase 桌面 App CLI** 的相容版本範圍，跟上面兩個 plugin 版本號完全無關，是三件不同的事。

**弱模型常犯的錯**：只改了 `.claude-plugin/plugin.json`，以為 release 就做完了；或者把 CLI 版本號跟 plugin 版本號搞混，只改了其中一個。

**修法**：發版前，照 `CONTRIBUTING.md` 的 Release Checklist 一條一條核對，不要憑印象。用這個指令找出所有版本號出現的地方，逐一確認是否都改了：

```bash
grep -rn "version" .claude-plugin/plugin.json .cursor-plugin/plugin.json skills/heptabase-cli/SKILL.md
```

## 2. `sync-github.ps1` 有一份硬編碼的「要發布哪些檔案」白名單

`sync-github.ps1`（README 記載的官方發布腳本）內部寫死了一個 `$PathsToStage` 陣列，只有陣列裡列出的路徑才會被 `git add` 進發布 commit。**新增一個不在這份清單裡的頂層檔案或目錄，會被這支腳本靜默略過，永遠不會被推到遠端**——不會報錯，你只會看到 push 成功，但那個新檔案其實沒有真的被加進去。

這次盤點就實際踩到這個問題：本次新增的 `CLAUDE.md` 與 `.claude/` 目錄一開始就不在清單裡，已經在同一次 session 內修正加入。

**弱模型常犯的錯**：以為 `git add` 過的東西一定會被 `sync-github.ps1` 一起發布出去，沒意識到這支腳本用的是自己的白名單、不是 `git status` 顯示的全部變更。

**修法**：每次在 repo 根目錄新增檔案或目錄後，打開 `sync-github.ps1` 檢查 `$PathsToStage` 是否需要加入新項目。如果不確定新檔案算不算「該發布」，先問使用者，不要自己猜。

## 3. 三支同步腳本，只有一支是產品程式碼

根目錄有三支看起來很像的腳本：

- `sync-github.ps1` —— **產品腳本**，README 有記載，用途是把本機修改推到使用者自己的 fork（`origin`）。
- `sync_upstream.bat` + `silent_run.vbs` —— **使用者私人自動化**，沒有出現在 README 或 CONTRIBUTING 任何一處，是使用者自己排程用來把上游 `heptameta/heptabase-cli-skills`（`upstream`）拉下來再推回自己 fork（`origin`）的背景工具，內含寫死的絕對路徑（`E:\Github Library\heptabase-cli-skills`）。

**弱模型常犯的錯**：因為這兩支私人腳本沒有文件、看起來像沒人管的雜物，把它們當成可以隨意刪除、整理或「順手」納入文件的對象。

**修法**：看到 `silent_run.vbs`、`sync_upstream.bat` 一律不動——不刪除、不重構、不加進 README，除非使用者明確要求。細節見 [`maintenance.md`](maintenance.md) 的「需先問使用者」清單。
