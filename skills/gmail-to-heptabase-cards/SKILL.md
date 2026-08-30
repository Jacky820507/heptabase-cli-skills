---
name: gmail-to-heptabase-cards
description: Convert Gmail messages into Heptabase cards. Use when the user asks to 抓取 Gmail 信件作為卡片, Gmail 轉 Heptabase 卡片, 信件變卡片, Gmail 原文卡, Gmail 整理卡, or schedule a weekly Gmail-to-Heptabase import. 支援寄件者白名單、用 Gmail message ID 去重、保留信件原文、另外建立 AI 整理卡，並將卡片放到 00_INBOX暫存區 白板。
metadata:
  short-description: 將指定 Gmail 信件轉成 Heptabase 原文卡與整理卡
---

# Gmail to Heptabase Cards

使用這個 Skill，透過 Gmail connector 與 Heptabase CLI，將指定 Gmail 信件轉成 Heptabase note card。

## 預設行為

- 只處理符合使用者寄件者白名單的 Gmail 信件。除非使用者明確要求，否則不要匯入整個 inbox。
- 每封新信建立兩張卡片：
  - `[Gmail原文] <subject>`：信件 metadata 加上完整原文。
  - `[Gmail整理] <subject>`：AI 產生的摘要、重點、行動事項與重要連結。
- 每張新建卡片都要放到 Heptabase 白板 `00_INBOX暫存區`。
- 建立卡片前，先用 Gmail message ID 去重。
- Heptabase 的讀寫只能透過 Heptabase CLI。絕對不要直接編輯 Heptabase 的本機資料檔。

## 寄件者白名單

預設不要匯入所有 Gmail inbox。執行前應由使用者在對話、automation prompt，或其他安全的設定來源提供寄件者白名單。

白名單可以包含：

- 寄件者顯示名稱
- 完整 email address
- 明確指定的寄件網域

請勿在可分享的 Skill 內寫入私人姓名、私人 email address 或固定個人白名單。

Gmail query 範例，請用使用者提供的實際白名單取代 placeholder：

```text
(from:"Sender Name" OR from:newsletter@example.com OR from:@example.org) newer_than:7d -in:spam -in:trash
```

如果 Gmail search 無法穩定用寄件者姓名命中，優先改用 email address 搜尋；若沒有 email address，先用較寬的 query 搜尋，再讀取信件 metadata 後用 `from_` 欄位過濾。

## Heptabase 目標位置

- 白板名稱：`00_INBOX暫存區`

請勿在可分享的 Skill 內寫入白板的真實 UUID。寫入前，先用名稱查出目前的白板 ID：

```bash
heptabase whiteboard list -n "00_INBOX暫存區" -l 20
```

使用 CLI 回傳的 `<whiteboardId>` 進行後續操作。

## 必要流程

1. 搜尋符合條件的 Gmail 信件。
2. 用 Gmail batch read 讀取候選信件。
3. 讀取 `from_` 後，排除不在白名單內的寄件者。
4. 用 Gmail message ID 搜尋 Heptabase 卡片來去重。
5. 每封新信建立一張原文卡與一張整理卡。
6. 用 `heptabase note save --content-file` 搭配 ProseMirror JSON 儲存完整卡片內容。
7. 將兩張卡片都加入 `00_INBOX暫存區`。
8. 驗證每張卡片都有正文內容，並且已在白板上。
9. 回報已處理的 Gmail ID、新建卡片 ID，以及略過的重複信件。

## 卡片內容規則

### 原文卡

標題：

```text
[Gmail原文] <subject>
```

正文：

- H1 標題。
- `信件來源` 段落，包含：
  - Gmail ID
  - 寄件者
  - 收件時間
  - 主旨
  - Gmail display URL
  - 附件或 inline image 檔名，如有
- `原文` 段落，包含完整信件本文。

不要在原文卡加入 AI 評論、摘要或行動事項。

### 整理卡

標題：

```text
[Gmail整理] <subject>
```

正文：

- H1 標題。
- Gmail 來源 metadata；若已建立原文卡，加入原文卡 ID 參照。
- `重點摘要`
- `核心重點` 或依主題調整的小節。
- `行動事項`
- `重要連結`
- `備註`

所有 AI 生成的理解、判斷與整理，只能放在整理卡。

## 安全寫入 Note

在某些環境中，Heptabase CLI 的 markdown create/append 路徑可能只保留第一個 heading。請使用以下較穩定的流程：

1. 建立 placeholder note：

```bash
heptabase note create -c "# [Gmail原文] Subject"
```

2. 讀取 note 取得 `contentMd5`：

```bash
heptabase note read <cardId>
```

3. 產生有效的 ProseMirror document JSON 檔。
4. 儲存內容：

```bash
heptabase note save <cardId> --content-md5 <md5> --content-file <jsonPath>
```

5. 加入白板：

```bash
heptabase whiteboard add-card --whiteboard-id <whiteboardId> --card-id <cardId>
```

在 Windows 上，JSON 檔使用 UTF-8 without BOM。每個段落應表示為 ProseMirror `paragraph` node。空白行可以是沒有 content 的 paragraph node。

## 去重

建立卡片前，先搜尋 Gmail message ID：

```bash
heptabase card list -q "<gmailMessageId>" --limit 20
```

如果既有 `[Gmail原文]` 或 `[Gmail整理]` 卡片已包含該 Gmail ID，略過該信件。

## 每週自動化

當使用者要求定時或每週匯入時，建立或更新 Codex cron automation，不要用臨時的手動排程替代。

建議排程：

```text
FREQ=WEEKLY;BYDAY=MO;BYHOUR=9;BYMINUTE=0;BYSECOND=0
```

Automation prompt 必須包含：

- 包含使用者當下提供的寄件者白名單，但不要把私人白名單寫回 Skill 檔案。
- 只搜尋最近 7 天。
- 排除 spam 與 trash。
- 用 Gmail ID 去重。
- 建立 `[Gmail原文]` 與 `[Gmail整理]` 卡片。
- 使用 `heptabase note save --content-file`。
- 將卡片加入 `00_INBOX暫存區`。
- 驗證正文內容與白板位置。

優先更新既有 automation，不要建立重複 automation。

## 限制

- 除非使用者明確要求讀取或處理附件，附件與 inline images 只記錄檔名與 metadata。
- Heptabase CLI 的文字流程不會上傳 binary media files。
- 如果信件本文太大，超過單次 CLI request 可承受範圍，請縮小 ProseMirror 內容，至少在原文卡保留 Gmail display URL，並回報此限制。
