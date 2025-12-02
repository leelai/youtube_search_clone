# 搜尋優化研究筆記

> 📌 **返回主文檔**：[README.md](../README.md)

本文件記錄了 PostgreSQL pg_trgm 搜尋優化的研究發現，包括不同搜尋策略的效能比較與索引使用分析。

---

## 目錄

- [搜尋策略比較](#搜尋策略比較)
- [SQL 查詢差異分析](#sql-查詢差異分析)
- [索引使用情況](#索引使用情況)
- [為何 similarity() 無法使用 GIN 索引](#為何-similarity-無法使用-gin-索引)
- [搜尋結果差異](#搜尋結果差異)
- [優化建議](#優化建議)

---

## 搜尋策略比較

### 本專案有兩個搜尋端點

| 端點 | 頁面 | 使用的方法 |
|------|------|-----------|
| `/api/search/results` | `/search?query=xxx` | `SearchCombined()` - 三重搜尋 |
| `/api/search/compare` | `/lab/search-modes` | `FindByTitleTrgm()` / `FindByTitleBigram()` |

### 速度差異原因

| 因素 | `/search` (正常頁面) | `/lab/search-modes` (實驗室) |
|------|---------------------|---------------------------|
| **SQL 複雜度** | 3 個 CTE + UNION ALL | 單一查詢 |
| **子查詢** | 有 `NOT IN` 子查詢排除重複 | 無 |
| **索引效率** | `LIKE '%cyber%'` 需檢查索引條件 | TRGM/BIGRAM 索引較有效 |
| **匹配策略** | 前綴 + 模糊 + 包含 | 只做單一演算法 |

---

## SQL 查詢差異分析

### SearchCombined (三重搜尋)

```sql
WITH prefix_matches AS (
    -- 1. 前綴匹配 (最高優先級)
    SELECT id, title, description, created_at, 
           1.0::float as sim, 1 as match_type
    FROM worlds
    WHERE LOWER(title) LIKE LOWER($1) || '%'
),
fuzzy_matches AS (
    -- 2. 模糊匹配 (pg_trgm similarity)
    SELECT id, title, description, created_at,
           similarity(LOWER(title), LOWER($1)) as sim, 2 as match_type
    FROM worlds
    WHERE similarity(LOWER(title), LOWER($1)) > 0.1
      AND id NOT IN (SELECT id FROM prefix_matches)
),
contains_matches AS (
    -- 3. 包含匹配 (優先級最低)
    SELECT id, title, description, created_at,
           0.5::float as sim, 3 as match_type
    FROM worlds
    WHERE LOWER(title) LIKE '%' || LOWER($1) || '%'
      AND id NOT IN (SELECT id FROM prefix_matches)
      AND id NOT IN (SELECT id FROM fuzzy_matches)
)
SELECT * FROM (
    SELECT * FROM prefix_matches
    UNION ALL SELECT * FROM fuzzy_matches
    UNION ALL SELECT * FROM contains_matches
) combined
ORDER BY match_type, sim DESC, created_at DESC
LIMIT $2
```

### FindByTitleTrgm (單一 TRGM 搜尋)

```sql
SELECT id, title, description, created_at, 
       similarity(LOWER(title), LOWER($1)) as sim
FROM worlds
WHERE similarity(LOWER(title), LOWER($1)) > 0.1
ORDER BY sim DESC, created_at DESC
LIMIT $2
```

### 參考：pg_trgm_demo 專案的優化寫法

```sql
WITH search_results AS (
    -- 1. 精確前綴匹配
    SELECT id, title, description,
           similarity(title, $1) + 0.5 AS sim,
           'exact_prefix' AS match_type
    FROM worlds
    WHERE title ILIKE $1 || '%'

    UNION ALL

    -- 2. Trigram 相似度匹配 (使用 % 操作符，可用索引)
    SELECT id, title, description,
           similarity(title, $1) + 0.3 AS sim,
           'similarity' AS match_type
    FROM worlds
    WHERE title % $1
        AND NOT (title ILIKE $1 || '%')

    UNION ALL

    -- 3. Word similarity 匹配 (使用 <<% 操作符，可用索引)
    SELECT id, title, description,
           word_similarity($1, title) + 0.2 AS sim,
           'word_similarity' AS match_type
    FROM worlds
    WHERE $1 <<% title
        AND NOT (title ILIKE $1 || '%')
        AND NOT (title % $1)

    UNION ALL

    -- 4. 包含匹配
    SELECT id, title, description,
           similarity(title, $1) + 0.1 AS sim,
           'contains' AS match_type
    FROM worlds
    WHERE title ILIKE '%' || $1 || '%'
        AND NOT (title ILIKE $1 || '%')
        AND NOT (title % $1)
        AND NOT ($1 <<% title)
)
SELECT DISTINCT ON (id) *
FROM search_results
WHERE sim > 0.2
ORDER BY id, sim DESC
LIMIT 20;
```

**關鍵差異：**

| 特性 | 本專案 | pg_trgm_demo |
|------|--------|--------------|
| **Trigram 操作符** | ❌ 直接用 `similarity()` 函數 | ✅ 使用 `%` 操作符 |
| **Word Similarity** | ❌ 沒有使用 | ✅ 使用 `<<%` 操作符 |
| **排除重複邏輯** | `NOT IN (SELECT id...)` 子查詢 | `NOT (...)` 直接條件 |
| **去重方式** | 每個 CTE 用子查詢排除 | `DISTINCT ON (id)` 統一去重 |
| **索引利用** | 🐢 較差 | 🚀 較好 |

---

## 索引使用情況

### 目前建立的索引

```sql
-- GIN trigram 索引
CREATE INDEX idx_worlds_title_trgm_gin
    ON worlds USING GIN (title gin_trgm_ops);

-- GiST trigram 索引
CREATE INDEX idx_worlds_title_trgm_gist
    ON worlds USING GIST (title gist_trgm_ops);

-- 前綴搜尋索引 (text_pattern_ops)
CREATE INDEX idx_worlds_title_lower_pattern
    ON worlds (LOWER(title) text_pattern_ops);

-- 小寫索引
CREATE INDEX idx_worlds_title_lower
    ON worlds (LOWER(title));
```

### 三重搜尋的索引使用分析

| 搜尋類型 | SQL 語法 | 可用索引？ | 效能 |
|---------|----------|-----------|------|
| **Prefix Match** | `LOWER(title) LIKE 'cyber%'` | ✅ `text_pattern_ops` | 🚀 快 |
| **Fuzzy Match** | `similarity(LOWER(title), 'cyber') > 0.1` | ❌ Full Scan | 🐢 **慢** |
| **Contains Match** | `LOWER(title) LIKE '%cyber%'` | ⚠️ 需檢查 | 🐢 **可能慢** |

### 索引匹配問題

```
┌─────────────────────────────────────────────────────────────────┐
│  查詢用 LOWER(title)，但 GIN trigram 索引建在 title 上          │
│                                                                 │
│  WHERE LOWER(title) LIKE '%cyber%'                             │
│          ↑                                                      │
│          這個 LOWER() 可能讓 GIN 索引無法使用！                 │
│                                                                 │
│  改成這樣可以用 GIN trigram 索引：                              │
│  WHERE title ILIKE '%cyber%'                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 為何 similarity() 無法使用 GIN 索引

```
┌────────────────────────────────────────────────────────────┐
│  GIN 索引只支援「操作符」，不支援「函數計算」               │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ✅ WHERE title % 'cyber'                                  │
│     → 操作符問：「有沒有符合？」 → 索引可以快速回答 Yes/No │
│                                                            │
│  ❌ WHERE similarity(title, 'cyber') > 0.1                 │
│     → 函數問：「相似度是多少？」 → 必須計算每一行才知道    │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

| 類型 | 索引能回答？ | 原因 |
|------|-------------|------|
| `%` 操作符 | ✅ 能 | 只需判斷「符合/不符合」 |
| `similarity()` 函數 | ❌ 不能 | 需要**計算數值**，索引沒存這個值 |

**一句話總結：** 索引存的是 trigram token，不是相似度分數，所以無法跳過計算。

---

## 搜尋結果差異

### 操作符與函數的閾值差異

| 特性 | `%` 操作符 | `similarity()` 函數 |
|------|-----------|-------------------|
| **閾值** | 使用全局 `pg_trgm.similarity_threshold` (預設 **0.3**) | 可自訂閾值 (本專案用 **0.1**) |
| **索引** | ✅ 可用 GIN 索引 | ❌ 無法用索引 |
| **回傳** | Boolean (符合/不符合) | Float (0~1 的相似度分數) |
| **召回率** | 較低 (閾值高) | 較高 (閾值低) |

### 搜尋 "cyb" (短關鍵字) 的差異範例

```
┌─────────────────────────────────────────────────────────────┐
│  搜尋 "cyb" 的 similarity 分數                              │
├─────────────────────────────────────────────────────────────┤
│  "Cyberpunk 2077 Review"  →  similarity ≈ 0.15             │
│  "Cyber Security Guide"   →  similarity ≈ 0.18             │
│  "Cyborg Technology"      →  similarity ≈ 0.25             │
├─────────────────────────────────────────────────────────────┤
│  使用 % 操作符 (閾值 0.3)  → ❌ 全部找不到                  │
│  使用 similarity() > 0.1  → ✅ 全部找到                    │
└─────────────────────────────────────────────────────────────┘
```

### Trade-off 總結

| 場景 | `%` 操作符 (閾值 0.3) | `similarity() > 0.1` | 哪個較好？ |
|------|----------------------|---------------------|-----------|
| **完整關鍵字** (cyber) | ✅ 相同 | ✅ 相同 | 平手 |
| **短關鍵字** (cy, cyb) | ❌ 可能漏掉 | ✅ 更多結果 | similarity (召回率高) |
| **錯字容錯** (cyder→cyber) | ✅ 適中 | ✅ 更寬鬆 | 看需求 |
| **搜尋速度** | 🚀 快 | 🐢 慢 | `%` 操作符 |
| **結果精準度** | 較高 | 較低 (可能有雜訊) | `%` 操作符 |

---

## 優化建議

### 方法 1：改用 ILIKE（讓 GIN 索引可用）

```sql
-- 原本
WHERE LOWER(title) LIKE '%' || LOWER($1) || '%'

-- 改成
WHERE title ILIKE '%' || $1 || '%'  -- ✅ 可用 GIN trigram 索引
```

### 方法 2：建立 LOWER(title) 的 GIN 索引

```sql
CREATE INDEX idx_worlds_lower_title_trgm 
    ON worlds USING GIN (LOWER(title) gin_trgm_ops);
```

### 方法 3：改用 `%` 操作符取代 `similarity()` 函數

```sql
-- 原本 (無法用索引)
WHERE similarity(title, $1) > 0.1

-- 改成 (可用 GIN 索引)
WHERE title % $1
```

### 方法 4：使用 `DISTINCT ON` 統一去重

```sql
-- 原本 (多個子查詢)
AND id NOT IN (SELECT id FROM prefix_matches)
AND id NOT IN (SELECT id FROM fuzzy_matches)

-- 改成 (效能較好)
SELECT DISTINCT ON (id) *
FROM search_results
ORDER BY id, sim DESC
```

---

## 參考資源

- [PostgreSQL pg_trgm 官方文檔](https://www.postgresql.org/docs/current/pgtrgm.html)
- [pg_bigm 官方文檔](https://pgbigm.osdn.jp/pg_bigm_en-1-2.html)
- [pg_trgm_demo 專案](https://github.com/leelai/pg_trgm_demo)

---

> 📌 **返回主文檔**：[README.md](../README.md)

