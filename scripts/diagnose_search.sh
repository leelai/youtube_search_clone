#!/bin/bash
# 診斷 TRGM vs BIGRAM 搜尋問題

echo "==========================================="
echo "搜尋模式診斷工具"
echo "==========================================="
echo ""

# 檢查容器
if ! docker ps | grep -q worlds_postgres; then
    echo "❌ PostgreSQL 容器未運行"
    exit 1
fi

KEYWORD="abc"
echo "🔍 測試關鍵字: $KEYWORD"
echo ""

# 1. 檢查 pg_trgm 相似度閾值
echo "1️⃣ 檢查 pg_trgm 相似度閾值"
docker exec worlds_postgres psql -U worlds_user -d worlds_db -c "SHOW pg_trgm.similarity_threshold;"
echo ""

# 2. 測試包含 "abc" 的標題
echo "2️⃣ 資料庫中包含 'abc' 的標題（不區分大小寫）"
docker exec worlds_postgres psql -U worlds_user -d worlds_db -c "
SELECT 
    LEFT(title, 60) as title,
    similarity(LOWER(title), LOWER('$KEYWORD')) as trgm_sim,
    bigm_similarity(LOWER(title), LOWER('$KEYWORD')) as bigm_sim
FROM worlds
WHERE LOWER(title) LIKE '%abc%'
LIMIT 10;
"
echo ""

# 3. 測試 TRGM 查詢（當前的實作）
echo "3️⃣ TRGM 查詢結果（使用 % 運算符）"
docker exec worlds_postgres psql -U worlds_user -d worlds_db -c "
SELECT COUNT(*) as count, '使用預設閾值' as note
FROM worlds
WHERE LOWER(title) % LOWER('$KEYWORD');
"
echo ""

# 4. 測試 BIGRAM 查詢
echo "4️⃣ BIGRAM 查詢結果（使用 LIKE likequery）"
docker exec worlds_postgres psql -U worlds_user -d worlds_db -c "
SELECT COUNT(*) as count
FROM worlds
WHERE LOWER(title) LIKE LOWER(likequery('$KEYWORD'));
"
echo ""

# 5. 測試降低 TRGM 閾值後的結果
echo "5️⃣ 測試降低 TRGM 閾值到 0.1"
docker exec worlds_postgres psql -U worlds_user -d worlds_db -c "
SET pg_trgm.similarity_threshold = 0.1;
SELECT COUNT(*) as count, '閾值 = 0.1' as note
FROM worlds
WHERE LOWER(title) % LOWER('$KEYWORD');
"
echo ""

# 6. 建議
echo "==========================================="
echo "💡 診斷結果與建議"
echo "==========================================="
echo ""
echo "如果 TRGM 查詢結果為 0 但降低閾值後有結果："
echo "→ 問題: pg_trgm 預設閾值太高"
echo "→ 解決方案: 修改後端程式碼，在查詢前設定較低的閾值"
echo ""
echo "執行以下命令查看建議的修復方案:"
echo "  cat scripts/fix_trgm_threshold.sql"
echo ""

