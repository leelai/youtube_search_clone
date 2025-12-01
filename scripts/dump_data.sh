#!/bin/bash
# ============================================================
# YouTube Search Clone - 資料庫備份腳本
# ============================================================
# 功能：
# - 自動建立 backups/ 目錄
# - 匯出完整的資料庫結構和資料
# - 檔案名稱包含時間戳記
# - 顯示資料筆數和檔案大小
# ============================================================

set -e

# 資料庫配置
DB_CONTAINER="worlds_postgres"
DB_USER="worlds_user"
DB_NAME="worlds_db"
BACKUP_DIR="backups"

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "==========================================="
echo "📦 YouTube Search Clone - 資料庫備份"
echo "==========================================="
echo ""

# 檢查 Docker 是否運行
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ 找不到 Docker 命令${NC}"
    exit 1
fi

# 檢查 PostgreSQL 容器是否運行
if ! docker ps | grep -q "$DB_CONTAINER"; then
    echo -e "${RED}❌ PostgreSQL 容器未運行${NC}"
    echo "請先啟動: docker-compose up -d postgres"
    exit 1
fi

echo -e "${GREEN}✓${NC} PostgreSQL 容器運行中"
echo ""

# 建立備份目錄
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_PATH="$PROJECT_ROOT/$BACKUP_DIR"

if [ ! -d "$BACKUP_PATH" ]; then
    echo -e "${BLUE}📁 建立備份目錄: $BACKUP_DIR${NC}"
    mkdir -p "$BACKUP_PATH"
fi

# 產生備份檔案名稱（含時間戳記）
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${DB_NAME}_dump_${TIMESTAMP}.sql"
BACKUP_FULL_PATH="$BACKUP_PATH/$BACKUP_FILE"

# 顯示資料庫統計
echo "📊 備份前資料統計："
echo ""

docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "
SELECT 
    '   worlds:          ' || COUNT(*) || ' 筆'
FROM worlds
UNION ALL
SELECT 
    '   search_history:  ' || COUNT(*) || ' 筆'
FROM search_history
UNION ALL
SELECT 
    '   search_impressions: ' || COUNT(*) || ' 筆'
FROM search_impressions
UNION ALL
SELECT 
    '   search_clicks:   ' || COUNT(*) || ' 筆'
FROM search_clicks;
"

echo ""
echo -e "${YELLOW}⏳ 開始備份...${NC}"
echo ""

# 執行 pg_dump
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" \
    --format=plain \
    --no-owner \
    --no-privileges \
    --clean \
    --if-exists \
    > "$BACKUP_FULL_PATH"

# 檢查備份是否成功
if [ $? -eq 0 ] && [ -f "$BACKUP_FULL_PATH" ]; then
    # 取得檔案大小
    if [[ "$OSTYPE" == "darwin"* ]]; then
        FILE_SIZE=$(ls -lh "$BACKUP_FULL_PATH" | awk '{print $5}')
    else
        FILE_SIZE=$(ls -lh "$BACKUP_FULL_PATH" | awk '{print $5}')
    fi
    
    LINE_COUNT=$(wc -l < "$BACKUP_FULL_PATH" | tr -d ' ')
    
    echo -e "${GREEN}✓ 備份完成！${NC}"
    echo ""
    echo "==========================================="
    echo "📄 備份資訊"
    echo "==========================================="
    echo "   檔案路徑: $BACKUP_DIR/$BACKUP_FILE"
    echo "   檔案大小: $FILE_SIZE"
    echo "   SQL 行數: $LINE_COUNT"
    echo "==========================================="
    echo ""
    echo -e "${GREEN}💡 還原指令:${NC}"
    echo "   ./scripts/restore_data.sh $BACKUP_DIR/$BACKUP_FILE"
    echo ""
else
    echo -e "${RED}❌ 備份失敗${NC}"
    exit 1
fi

