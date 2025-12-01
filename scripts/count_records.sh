#!/bin/bash
# 快速查詢 worlds 表的記錄數

# 檢查容器是否運行
if ! docker ps | grep -q worlds_postgres; then
    echo "❌ PostgreSQL 容器未運行，請先啟動: docker-compose up -d postgres"
    exit 1
fi

# 執行查詢
echo -n "worlds 表記錄數: "
docker exec worlds_postgres psql -U worlds_user -d worlds_db -t -c "SELECT COUNT(*) FROM worlds;"

