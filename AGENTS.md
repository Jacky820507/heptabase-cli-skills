# heptabase-cli-skills（Codex CLI 進入點）

`heptameta/heptabase-cli-skills` 的個人 fork，一個 Claude Code plugin repo，也透過 `skills/` 目錄出貨給 Codex CLI 使用者。這份檔案是 **Codex CLI** 專用的自動載入入口（`AGENTS.md`，Codex 從 repo 根目錄往下逐層讀取並串接，串接後總大小上限 32 KiB——這份檔案跟它指向的 `.claude/docs/*.md` 都保持精簡，不會逼近上限）。

**如果你是 Claude Code**：對應的自動載入檔案是根目錄的 `CLAUDE.md`，結構跟這份幾乎一樣，差別只在派工機制那一塊。兩份檔案的「Repo map」「硬規則」如果其中一份改了，記得檢查另一份是否也要同步，見 [`.claude/docs/maintenance.md`](.claude/docs/maintenance.md)。

## Read first

先讀 [`.claude/docs/diagnosis.md`](.claude/docs/diagnosis.md)——三個這次盤點時實際踩到、容易再踩一次的坑，各附修法。這份內容跟 Claude Code 用的完全共用，跟你用哪個 CLI 無關。

## Repo map

| 路徑 | 是什麼 | 能不能自己改 |
|---|---|---|
| `skills/heptabase-cli/` | **出貨的主要 skill**。CLI wrapper，版本鎖定於 `SKILL.md` frontmatter 的 `heptabase-cli-version-range` | 見 [`maintenance.md`](.claude/docs/maintenance.md) |
| `skills/gmail-to-heptabase-cards/` | **出貨的個人 skill**，中文撰寫，含使用者的白板 ID | 見 [`maintenance.md`](.claude/docs/maintenance.md) |
| `.claude-plugin/plugin.json`、`.cursor-plugin/plugin.json` | plugin 版本號來源，兩份要手動保持一致 | 需先問，見 diagnosis.md 案例 1 |
| `CONTRIBUTING.md` | 發版流程與 Release Checklist，發版前必讀 | 純文字潤飾可自行；流程內容需先問 |
| `sync-github.ps1` | **產品腳本**，推送到使用者 fork 的白名單陣列 | 新增頂層檔案時要檢查，見 diagnosis.md 案例 2 |
| `install-codex.ps1`、`enable-codex-auto-sync.ps1` | 把 `skills/` 複製進 Codex 的安裝腳本，README 有記載。**目前複製目標是 `~/.codex/skills/`，但 Codex 官方文件記載的 skill 探索路徑是 `.agents/skills`（repo 層）與 `$HOME/.agents/skills`（使用者層）——這兩者可能對不上，尚未確認，見 [`lessons-learned.md`](.claude/docs/lessons-learned.md)** | 需先問 |
| `silent_run.vbs`、`sync_upstream.bat` | **使用者私人腳本**，沒有出現在任何文件裡 | **絕對不要動**，見 diagnosis.md 案例 3 |
| `.claude/docs/` | 治理系統內容檔，Claude Code 與 Codex 共用 | 可自行擴充新內容 |
| `.claude/commands/` | **只有 Claude Code 讀得到**的 slash command。Codex 沒有對應的 in-repo 機制（見下方「派工」段落） | 不影響 Codex 使用者 |
| `CLAUDE.md` | Claude Code 的自動載入入口，跟這份檔案是同一套治理系統的另一個進入點 | 可自行擴充新 reference 內容 |

## 治理文件索引

| 檔案 | 內容 | 什麼時候讀 | 誰用 |
|---|---|---|---|
| [`.claude/docs/diagnosis.md`](.claude/docs/diagnosis.md) | 三大踩雷案例與修法 | 一進 repo 就讀 | 共用 |
| [`.claude/docs/dispatch-codex.md`](.claude/docs/dispatch-codex.md) | 派工／模型調度守則（Codex 版：怎麼派 subagent、驗證規則） | 要派 subagent 前 | **僅 Codex** |
| [`.claude/docs/judgment.md`](.claude/docs/judgment.md) | 何時升級模型／算完成／該問人／該換路／驗品質底線 的判準 | 遇到不確定該怎麼判斷時 | 共用 |
| [`.claude/docs/handoff-templates.md`](.claude/docs/handoff-templates.md) | 五種任務型態的交辦模板（填空即可用，跟 CLI 無關） | 要派工前 | 共用 |
| [`.claude/docs/maintenance.md`](.claude/docs/maintenance.md) | 哪些檔案可自己改／哪些要先問；踩雷記錄怎麼寫回去 | 要動既有檔案前 | 共用 |
| [`.claude/docs/lessons-learned.md`](.claude/docs/lessons-learned.md) | 累積的踩雷記錄 | 開始任務前掃一眼、踩雷後寫一筆 | 共用 |
| [`.claude/docs/letter.md`](.claude/docs/letter.md) | 建置者給未來 session 的信，含信心最低的部分 | 想了解這套制度的已知弱點時 | 共用 |

## 派工（Codex 沒有 Claude Code 的 `Agent` 工具）

指揮官不下場的原則不變（見 `dispatch-codex.md`），但 Codex CLI 沒有一個可以直接呼叫、有固定 schema 的派工工具——是用自然語言在對話裡明確要求「產生 N 個 subagent 去做 X」，並且可以指定每個 subagent 用哪個 model／`model_reasoning_effort`。細節、以及目前查證到的限制，見 [`dispatch-codex.md`](.claude/docs/dispatch-codex.md)，不要沿用 `dispatch.md`（那份是 Claude Code `Agent` 工具的專屬語法）。

Codex 的「Custom Prompts」（`~/.codex/prompts/*.md`，`/name` 呼叫）**已被官方文件標記為棄用**，且是使用者主目錄層級、無法隨這個 repo 一起發布，所以 `.claude/commands/dispatch-*.md` 沒有對應的 Codex 版本。要用 `handoff-templates.md` 的模板時，直接把填好的內容貼進給 Codex 的訊息裡即可。

## 硬規則

1. **指揮官不下場**：批次讀檔、掃 repo、驗證一律派 subagent；細節見 `dispatch-codex.md`。
2. **改既有檔前先確認影響範圍**；新內容優先寫新檔。
3. **版本號、私人腳本、雙 manifest 同步**：動之前先讀 `diagnosis.md` 與 `maintenance.md`，不要憑印象。
4. **驗證不自驗**：檔案類用讀回確認，程式碼/設定類實際跑 `CONTRIBUTING.md` 列的三個 validate 指令。
5. **不確定的事查證，查不到就明說「未確認」**，不要編造版本號、指令名稱或路徑——包含 Codex CLI 自己的功能細節，這些會隨 Codex 版本變動，這份文件裡標記「未確認」的地方用之前重新查證。
6. **這份 `AGENTS.md` 只當索引**：新增內容一律寫進 `.claude/docs/`，並在上面的索引表補一行。
