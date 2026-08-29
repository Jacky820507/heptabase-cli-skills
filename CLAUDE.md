# heptabase-cli-skills

`heptameta/heptabase-cli-skills` 的個人 fork。這是一個 **Claude Code plugin repo**：`skills/` 目錄下的內容會被打包出貨給任何安裝這個 plugin 的人，其餘都是維護這個 repo 用的內部工具，不會出貨。

**如果你是 Codex CLI**：對應的自動載入檔案是根目錄的 `AGENTS.md`，不是這份。兩份結構幾乎一樣，差別只在派工機制（見 `AGENTS.md` 的「派工」段落）。改這份檔案的 Repo map／硬規則時，記得檢查 `AGENTS.md` 是否也要同步更新。

## Read first

進這個 repo 做任何事之前，先讀 [`.claude/docs/diagnosis.md`](.claude/docs/diagnosis.md)——三個這次盤點時實際踩到、弱模型最容易再踩一次的坑，各附修法。

## Repo map

| 路徑 | 是什麼 | 能不能自己改 |
|---|---|---|
| `skills/heptabase-cli/` | **出貨的主要 skill**。CLI wrapper，版本鎖定於 `SKILL.md` frontmatter 的 `heptabase-cli-version-range`。有 `references/*.md`，SKILL.md 會指示「做某操作前必須先讀某份 reference」——新增內容時沿用同一模式 | 見 [`maintenance.md`](.claude/docs/maintenance.md) |
| `skills/gmail-to-heptabase-cards/` | **出貨的個人 skill**，中文撰寫，含使用者的白板 ID | 見 [`maintenance.md`](.claude/docs/maintenance.md) |
| `.claude-plugin/plugin.json`、`.cursor-plugin/plugin.json` | plugin 版本號來源，兩份要手動保持一致 | 需先問，見 diagnosis.md 案例 1 |
| `CONTRIBUTING.md` | 發版流程與 Release Checklist，發版前必讀 | 純文字潤飾可自行；流程內容需先問，見 `maintenance.md` |
| `sync-github.ps1` | **產品腳本**（README 有記載），推送到使用者 fork 的白名單陣列 | 新增頂層檔案時要檢查，見 diagnosis.md 案例 2；陣列本身改動需先問 |
| `install-codex.ps1`、`enable-codex-auto-sync.ps1` | 產品腳本，Codex 安裝用，README 有記載。**複製目標 `~/.codex/skills/` 與 Codex 官方文件記載的 `.agents/skills` 探索路徑可能不符，尚未確認**，見 `lessons-learned.md` | 需先問，見 `maintenance.md` |
| `AGENTS.md` | Codex CLI 的自動載入入口，跟這份檔案是同一套治理系統的另一個進入點 | 可自行擴充新 reference 內容 |
| `silent_run.vbs`、`sync_upstream.bat` | **使用者私人腳本**，沒有出現在任何文件裡，拉 upstream 用 | **絕對不要動**，見 diagnosis.md 案例 3 |
| `.githooks/`、`.github/workflows/` | git hooks 與 CI，跑跟 CONTRIBUTING 一樣的三個 validate 指令 | 不建議自行改 |
| `.claude/docs/` | 這份治理系統的內容檔（本檔案只是索引） | 可自行擴充新 reference 內容 |
| `.claude/commands/` | 任務交辦用的 slash command | 可自行擴充 |

## 治理文件索引

| 檔案 | 內容 | 什麼時候讀 |
|---|---|---|
| [`.claude/docs/diagnosis.md`](.claude/docs/diagnosis.md) | 三大踩雷案例與修法 | 一進 repo 就讀 |
| [`.claude/docs/dispatch.md`](.claude/docs/dispatch.md) | 模型/subagent 調度守則（**Claude Code 版**）、任務交辦格式、驗證規則 | 要派 subagent 或用 `Agent` 工具前 |
| [`.claude/docs/dispatch-codex.md`](.claude/docs/dispatch-codex.md) | 同上，**Codex CLI 版**（沒有 `Agent` 工具，派工機制不同） | 你是 Codex CLI 時，取代 dispatch.md |
| [`.claude/docs/judgment.md`](.claude/docs/judgment.md) | 何時升級模型／算完成／該問人／該換路／驗品質底線 的判準 | 遇到不確定該怎麼判斷時 |
| [`.claude/docs/handoff-templates.md`](.claude/docs/handoff-templates.md) | 五種任務型態的交辦模板；也有對應的 `/dispatch-*` slash command | 要派工前，或直接打 `/dispatch-search` 等指令 |
| [`.claude/docs/maintenance.md`](.claude/docs/maintenance.md) | 哪些檔案可自己改／哪些要先問；踩雷記錄怎麼寫回去 | 要動既有檔案前 |
| [`.claude/docs/lessons-learned.md`](.claude/docs/lessons-learned.md) | 累積的踩雷記錄 | 開始任務前掃一眼、踩雷後寫一筆 |
| [`.claude/docs/letter.md`](.claude/docs/letter.md) | 這次建置者（Fable 5, 2026-07-03）給未來 session 的信，含信心最低的部分 | 想了解這套制度的已知弱點時 |

## 硬規則

1. **指揮官不下場**：批次讀檔、掃 repo、驗證一律派 subagent；細節見 `dispatch.md`。
2. **改既有檔前先確認影響範圍**；新內容優先寫新檔。`git` 本身就是備份，不需要另外複製 `.bak`。
3. **版本號、私人腳本、雙 manifest 同步**：動之前先讀 `diagnosis.md` 與 `maintenance.md`，不要憑印象。
4. **驗證不自驗**：檔案類用讀回確認，程式碼/設定類實際跑 `CONTRIBUTING.md` 列的三個 validate 指令。
5. **不確定的事查證，查不到就明說「未確認」**，不要編造版本號、指令名稱或路徑。
6. **這份 CLAUDE.md 只當索引**：新增內容一律寫進 `.claude/docs/`，並在上面的索引表補一行，不要把長內容塞進這個檔案本身。

## 記憶 vs repo 檔案

跨 session 的個人偏好（例如「這個 repo 的文件用繁體中文寫」）存在 Claude Code 的記憶系統裡，不會出現在這裡。這份檔案跟 `.claude/docs/` 只放**任何人打開這個 repo 都該知道的規則**——會進 git，不是個人記憶。兩者衝突時，以這份 repo 檔案為準（記憶可能是舊的，repo 檔案是目前狀態）。
