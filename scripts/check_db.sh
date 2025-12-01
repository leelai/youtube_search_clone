#!/bin/bash
# 檢查 PostgreSQL 資料庫中的記錄數

echo "==========================================="
echo "YouTube Search Clone - Database Check"
echo "==========================================="
echo ""

# 檢查 PostgreSQL 容器是否運行
if ! docker ps | grep -q worlds_postgres; then
    echo "❌ PostgreSQL 容器未運行"
    echo "請先啟動: docker-compose up -d postgres"
    exit 1
fi

echo "✓ PostgreSQL 容器運行中"
echo ""

# 執行 SQL 查詢
echo "📊 查詢資料庫記錄數..."
echo ""

docker exec -it worlds_postgres psql -U worlds_user -d worlds_db -c "
SELECT 
    '總記錄數' as \"項目\",
    COUNT(*) as \"數量\"
FROM worlds;
"

echo ""
echo "📈 詳細統計..."
echo ""

docker exec -it worlds_postgres psql -U worlds_user -d worlds_db -c "
SELECT 
    COUNT(*) as \"總記錄數\",
    COUNT(DISTINCT title) as \"唯一標題數\",
    MIN(created_at) as \"最早記錄時間\",
    MAX(created_at) as \"最新記錄時間\",
    pg_size_pretty(pg_total_relation_size('worlds')) as \"資料表大小\"
FROM worlds;
"

echo ""
echo "🔍 最近 5 筆記錄預覽..."
echo ""

docker exec -it worlds_postgres psql -U worlds_user -d worlds_db -c "
SELECT 
    LEFT(title, 50) as \"標題\",
    LEFT(description, 60) as \"描述\",
    created_at as \"建立時間\"
FROM worlds
ORDER BY created_at DESC
LIMIT 5;
"

echo ""
echo "==========================================="
echo "✓ 檢查完成"
echo "==========================================="

