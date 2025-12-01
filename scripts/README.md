# Data Seeding Script

這個資料夾包含用於填充 YouTube Search Clone 資料庫的種子資料腳本。

## 檔案說明

- `seed.py` - 主要的資料抓取和插入腳本
- `check_db.sh` - 檢查資料庫記錄數（詳細版）
- `count_records.sh` - 快速查詢記錄數（簡潔版）
- `check_db.py` - Python 版本的資料庫檢查工具
- `dump_data.sh` - 資料庫備份腳本
- `restore_data.sh` - 資料庫還原腳本
- `requirements.txt` - Python 依賴套件
- `README.md` - 本說明文件

## 安裝依賴

```bash
cd scripts
pip install -r requirements.txt
```

或使用虛擬環境（推薦）：

```bash
cd scripts
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## 使用前準備

1. 確保 PostgreSQL 資料庫已啟動：

```bash
# 從專案根目錄執行
docker-compose up -d postgres
```

2. 等待資料庫初始化完成（migrations 會自動執行）

## 使用方式

### 基本用法

```bash
# 抓取 10,000 筆資料（預設，並行模式）
python seed.py

# 快速測試 (100 筆)
python seed.py --total 100

# 抓取 1,000 筆資料
python seed.py --total 1000
```

### 進階選項

```bash
# 使用非並行模式（較慢但更穩定）
python seed.py --total 1000 --no-parallel

# 自訂各來源數量
python seed.py --arxiv 2500 --wikipedia 2500 --books 2000 \
               --quotable 1500 --facts 1000 --zenquotes 500

# 只抓取特定來源
python seed.py --quotable 500 --facts 500 \
               --arxiv 0 --wikipedia 0 --books 0

# 跳過 Wikipedia 暢銷書
python seed.py --skip-wiki-bestsellers
```

## 資料來源

腳本會從以下來源抓取資料：

1. **ArXiv Papers** (25%) - 學術論文摘要
2. **Wikipedia Articles** (25%) - 維基百科條目
3. **Google Books** (20%) - 書籍簡介
4. **Quotable.io** (15%) - 勵志名言
5. **UselessFacts** (10%) - 有趣的冷知識
6. **ZenQuotes** (5%) - 額外的名言來源
7. **Wikipedia Bestsellers** (~50 筆) - 暢銷書清單

## 資料庫設定

腳本會連接到以下資料庫（與 docker-compose.yml 一致）：

- Host: `localhost`
- Port: `5433`
- Database: `worlds_db`
- User: `worlds_user`
- Password: `worlds_password`

## 注意事項

1. **網路連線**：腳本需要穩定的網路連線來抓取資料
2. **執行時間**：
   - 並行模式：約 5-10 分鐘（10,000 筆）
   - 非並行模式：約 20-30 分鐘（10,000 筆）
3. **資料清除**：腳本會先清除 `worlds` 表中的所有現有資料
4. **索引**：索引已在 migrations 中定義，不需要手動建立

## 疑難排解

### 連線錯誤

如果出現資料庫連線錯誤：

```bash
# 檢查 PostgreSQL 是否正在運行
docker-compose ps

# 查看 PostgreSQL 日誌
docker-compose logs postgres

# 重啟 PostgreSQL
docker-compose restart postgres
```

### SSL 警告

腳本會自動禁用某些 API 的 SSL 警告（如 Quotable.io），這是正常的。

### 速率限制

某些 API 有速率限制（如 ZenQuotes），腳本已內建適當的延遲處理。

## 執行狀態監控

腳本已增強日誌功能，提供詳細的執行狀態資訊：

### 日誌特色

- ⏰ **時間戳記** - 每條日誌都包含時間戳記 `[HH:MM:SS]`
- 📊 **進度追蹤** - 定期更新各來源的抓取進度
- ⏱️ **速率估算** - 顯示每秒處理速率和預計剩餘時間
- 🔍 **詳細狀態** - 網路請求、資料庫操作等各階段狀態
- ⚠️ **警告提示** - 速率限制等待、錯誤重試等提示

### 範例輸出

```
[14:23:45] 🚀 啟動 YouTube Search Clone 資料種子腳本
============================================================
YouTube Search Clone - Data Seeding
============================================================
[14:23:45] 🎯 目標設定: 共 ~1000 筆資料
Target Configuration:
  ArXiv Papers: 250
  Wikipedia Articles: 250
  Google Books: 200
  Quotable Quotes: 150
  Random Facts: 100
  ZenQuotes: 50
  Wikipedia Bestsellers: Yes (~50)
  Execution Mode: PARALLEL
  Total Target: ~1000
============================================================
[14:23:45] ⚙️ 執行模式: 並行 (PARALLEL)
[14:23:45] 📊 開始資料收集階段...

🚀 PARALLEL MODE: All sources fetching simultaneously!
[14:23:45] 🚀 啟動並行模式：所有來源將同時開始抓取
[14:23:45] 🔧 建立執行緒池 (max_workers=7)，準備提交任務...
[14:23:45] 📤 ✓ 已提交任務: ArXiv (250 筆)
[14:23:45] 📤 ✓ 已提交任務: Wikipedia (250 筆)
[14:23:45] 📤 ✓ 已提交任務: Google Books (200 筆)
[14:23:45] 📤 ✓ 已提交任務: Quotable (150 筆)
[14:23:45] 📤 ✓ 已提交任務: UselessFacts (100 筆)
[14:23:45] 📤 ✓ 已提交任務: ZenQuotes (50 筆)
[14:23:45] 📤 ✓ 已提交任務: Wikipedia Bestsellers (~50 筆)
[14:23:45] ⏳ 所有任務已提交 (共 7 個來源)，等待執行完成...

[14:23:46] ℹ️ 開始抓取 Quotable.io 名言 (目標: 150 筆)
[14:23:46] ℹ️ 開始逐筆請求名言 (每次請求間隔 0.2 秒，預計需要 0.5 分鐘)
[14:23:47] ℹ️ 開始抓取 UselessFacts 冷知識 (目標: 100 筆)
[14:23:47] ℹ️ 開始逐筆請求冷知識 (每次請求間隔 0.2 秒，預計需要 0.3 分鐘)

[14:24:15] 📝 Quotable 進度: 100/150 (66.7%)
[14:24:20] 🎲 UselessFacts 進度: 100/100 (100.0%)
[14:24:22] ✅ UselessFacts 完成: 收集 100 筆冷知識，耗時 35.2 秒
[14:24:25] ✅ Quotable 完成: 收集 150 筆名言，耗時 39.8 秒

[14:24:30] ⏳ 等待 zenquotes 完成... (5/7)
[14:24:30] ℹ️ 開始抓取 ZenQuotes 名言 (目標: 50 筆)
[14:24:30] ℹ️ ⚠️  ZenQuotes 有嚴格速率限制 (每 30 秒 5 次請求)，預計需要 0.4 分鐘
[14:24:36] ⏸️ 達到速率限制，等待 6 秒... (已完成 5/50)
...

[14:25:45] ✅ 資料收集階段完成！
============================================================
Data Collection Summary:
  ArXiv Papers: 250
  Wikipedia Articles: 250
  Google Books: 200
  Quotable Quotes: 150
  Random Facts: 100
  ZenQuotes: 50
  Wikipedia Books: 48
  Total collected: 1048
  ⏱️  Total data collection time: 120.45 seconds (2.01 minutes)
============================================================
[14:25:45] 📊 總計收集: 1048 筆資料，耗時 2.0 分鐘

[14:25:45] 🔄 開始資料去重處理...
[14:25:45] ✅ 去重完成: 原始 1048 筆 → 唯一 1042 筆 (移除 6 筆重複)

[14:25:45] 💾 準備將 1042 筆資料寫入資料庫
============================================================
DATABASE OPERATIONS
============================================================
[14:25:45] 💾 開始資料庫操作
[14:25:45] 🔌 連線到 PostgreSQL (localhost:5433/worlds_db)
→ Connecting to PostgreSQL... ✓
[14:25:45] ✅ 資料庫連線成功
[14:25:45] 🗑️ 清除 worlds 表中的現有資料...
→ Clearing existing data... ✓
[14:25:45] ✅ 舊資料已清除
[14:25:45] 📥 開始插入 1042 筆資料 (批次大小: 100)
→ Inserting 1042 records...
  Progress: 1042/1042 (100.0%)
[14:25:48] ⏱️ 插入進度: 1000/1042 (96.0%) - 速率: 345 筆/秒 - 預計剩餘: 0 秒
[14:25:48] ✅ 資料插入完成，耗時 3.2 秒
[14:25:48] 🔍 驗證資料筆數...
✓ Successfully inserted 1042 records
[14:25:48] ✅ 確認: 資料庫中共有 1042 筆資料

✓ Indexes already exist from migrations
[14:25:48] 📇 索引已由 migrations 建立（pg_trgm 和 pg_bigm）
[14:25:48] 🔌 資料庫連線已關閉

============================================================
🎉 DATABASE SEEDING COMPLETED!
============================================================
[14:25:48] 🎉 資料庫種子資料填充完成！
```

### 日誌圖示說明

- 🚀 啟動/初始化
- 📤 任務提交
- ⏳ 等待/進行中
- 📝 Quotable 進度
- 🎲 UselessFacts 進度
- 💭 ZenQuotes 進度
- ⏸️ 速率限制等待
- ✅ 完成
- ⚠️ 警告
- ❌ 錯誤
- 💾 資料庫操作
- 🔌 連線狀態
- 📊 統計資訊
- 🎉 大功告成

## 檢查資料庫記錄數

提供三種方式檢查資料庫：

### 方式 1：詳細檢查（推薦）

```bash
./check_db.sh
```

顯示資訊：
- 總記錄數
- 唯一標題數
- 最早/最新記錄時間
- 資料表大小
- 最近 5 筆記錄預覽

### 方式 2：快速查詢

```bash
./count_records.sh
```

只顯示記錄總數，適合快速確認。

### 方式 3：Python 版本

```bash
python check_db.py
```

與詳細檢查相同功能，但使用 Python 實作。

### 輸出範例

```bash
$ ./check_db.sh
===========================================
YouTube Search Clone - Database Check
===========================================

✓ PostgreSQL 容器運行中

📊 查詢資料庫記錄數...

 項目    | 數量
---------+------
 總記錄數 | 1042
(1 row)

📈 詳細統計...

 總記錄數 | 唯一標題數 | 最早記錄時間              | 最新記錄時間              | 資料表大小
---------+----------+------------------------+------------------------+----------
    1042 |     1042 | 2024-12-01 14:25:45... | 2024-12-01 14:25:48... | 856 kB
(1 row)

🔍 最近 5 筆記錄預覽...
...

===========================================
✓ 檢查完成
===========================================
```

```bash
$ ./count_records.sh
worlds 表記錄數:     1042
```

## 資料庫備份與還原

專案提供了方便的腳本來備份和還原資料庫，參考自 [pg_trgm_demo](https://github.com/leelai/pg_trgm_demo) 專案。

### 匯出資料庫

```bash
./dump_data.sh
```

這會：
- 自動建立 `backups/` 目錄
- 匯出完整的資料庫結構和資料
- 檔案名稱包含時間戳記（例如：`worlds_db_dump_20251201_143025.sql`）
- 顯示資料筆數和檔案大小

輸出範例：

```
===========================================
📦 YouTube Search Clone - 資料庫備份
===========================================

✓ PostgreSQL 容器運行中

📊 備份前資料統計：

   worlds:          1042 筆
   search_history:  8 筆
   search_impressions: 0 筆
   search_clicks:   0 筆

⏳ 開始備份...

✓ 備份完成！

===========================================
📄 備份資訊
===========================================
   檔案路徑: backups/worlds_db_dump_20251201_143025.sql
   檔案大小: 1.2M
   SQL 行數: 12456
===========================================

💡 還原指令:
   ./scripts/restore_data.sh backups/worlds_db_dump_20251201_143025.sql
```

### 匯入資料庫

```bash
# 查看可用的備份檔案
./restore_data.sh

# 從備份檔案還原
./restore_data.sh backups/worlds_db_dump_20251201_143025.sql
```

這會：
- 列出可用備份（不帶參數時）
- 顯示還原前後的資料統計
- 執行還原操作
- 提示確認以避免誤操作

**⚠️ 注意**：還原操作會覆蓋現有資料，請謹慎使用！

## 授權

改編自 [pg_trgm_demo](https://github.com/leelai/pg_trgm_demo) 專案。

