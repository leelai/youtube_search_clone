# TRGM 搜尋修復說明

## 問題描述

在 Search Modes Lab 頁面，TRGM 模式搜尋 "abc" 沒有結果，但 BIGRAM 模式有結果。

## 根本原因

### TRGM（原始實作）
```sql
WHERE LOWER(title) % LOWER('abc')  -- 使用 % 運算符
```
- `%` 運算符使用 **pg_trgm.similarity_threshold**（預設 0.3）
- 短字串如 "abc" 很難達到 0.3 的相似度閾值
- 結果：找不到任何匹配

### BIGRAM（現有實作）
```sql
WHERE LOWER(title) LIKE LOWER(likequery('abc'))  -- 使用 LIKE 模糊匹配
```
- `LIKE likequery()` 進行模糊包含匹配
- 只要標題包含相關字元就能匹配
- 結果：能找到包含 "abc" 的標題

## 解決方案

修改 `backend/repositories/worlds_repository.go` 中的三個函數：

### 1. FindByTitleTrgm
```go
// 修改前
WHERE LOWER(title) % LOWER($1)

// 修改後
WHERE similarity(LOWER(title), LOWER($1)) > 0.1
```

### 2. SearchByFuzzy  
```go
// 修改前
WHERE LOWER(title) % LOWER($1)

// 修改後
WHERE similarity(LOWER(title), LOWER($1)) > 0.1
```

### 3. SearchCombined (fuzzy_matches CTE)
```go
// 修改前
WHERE LOWER(title) % LOWER($1)

// 修改後  
WHERE similarity(LOWER(title), LOWER($1)) > 0.1
```

## 技術細節

- 不再使用 `%` 運算符（依賴全域閾值設定）
- 改用 `similarity()` 函數直接計算並比較相似度
- 閾值設為 **0.1**（更寬鬆，適合短字串搜尋）
- 這樣可以找到更多相關結果，特別是對短關鍵字

## 如何應用修復

### 方法 1：重啟 Docker Compose（推薦）

```bash
# 停止所有服務
docker-compose down

# 重新啟動（會重新編譯 backend）
docker-compose up -d

# 查看 backend 日誌確認啟動成功
docker-compose logs -f backend
```

### 方法 2：只重啟 Backend

```bash
# 重新編譯並重啟 backend
docker-compose up -d --build backend

# 查看日誌
docker-compose logs -f backend
```

## 驗證修復

1. 啟動服務後，開啟瀏覽器
2. 前往 http://localhost:3100/lab/search-modes
3. 搜尋 "abc"
4. 確認 **TRGM 模式**和**並排比較**模式都能找到結果

## 診斷工具

如需診斷 TRGM vs BIGRAM 的行為差異：

```bash
cd scripts
./diagnose_search.sh
```

這會顯示：
- 當前 pg_trgm 閾值設定
- 包含 "abc" 的標題及其相似度分數
- TRGM 和 BIGRAM 的查詢結果比較
- 降低閾值後的效果

## 相似度閾值選擇

| 閾值 | 特性 | 適用場景 |
|------|------|----------|
| 0.3 (預設) | 嚴格匹配 | 長字串、精確搜尋 |
| 0.2 | 中等寬鬆 | 一般用途 |
| 0.1 | 寬鬆匹配 | 短字串、容錯搜尋 |
| 0.0 | 過於寬鬆 | 不推薦（會返回不相關結果）|

**我們選擇 0.1** 作為平衡點，既能支援短字串搜尋，又不會返回太多不相關結果。

## 效能考量

- `similarity()` 函數需要計算每一行的相似度
- 但有 GIN 索引加速（`idx_worlds_title_trgm`）
- 對於千萬級資料，建議：
  - 增加其他過濾條件（如日期範圍）
  - 或考慮使用全文搜尋（FTS）配合 pg_trgm

## 參考資料

- [PostgreSQL pg_trgm 文檔](https://www.postgresql.org/docs/current/pgtrgm.html)
- [pg_bigm 官方文檔](https://pgbigm.osdn.jp/pg_bigm_en-1-2.html)

