#!/bin/bash
# ============================================================
# YouTube Search Clone - 資料庫還原腳本
# ============================================================
# 功能：
# - 查看可用的備份檔案（不帶參數時）
# - 從備份檔案還原（帶參數時）
# - 重建資料庫結構
# - 匯入備份資料
# - 顯示匯入結果
# ============================================================
# 用法：
#   ./restore_data.sh                    # 列出可用備份
#   ./restore_data.sh backups/xxx.sql    # 從指定備份還原
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
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 取得腳本目錄
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_PATH="$PROJECT_ROOT/$BACKUP_DIR"

echo ""
echo "==========================================="
echo "🔄 YouTube Search Clone - 資料庫還原"
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

# 如果沒有提供參數，列出可用備份
if [ -z "$1" ]; then
    echo "📁 可用的備份檔案："
    echo ""
    
    if [ ! -d "$BACKUP_PATH" ]; then
        echo -e "${YELLOW}   找不到備份目錄: $BACKUP_DIR${NC}"
        echo ""
        echo "   請先執行備份: ./scripts/dump_data.sh"
        echo ""
        exit 0
    fi
    
    # 列出備份檔案
    BACKUP_FILES=$(find "$BACKUP_PATH" -name "*.sql" -type f 2>/dev/null | sort -r)
    
    if [ -z "$BACKUP_FILES" ]; then
        echo -e "${YELLOW}   沒有找到備份檔案${NC}"
        echo ""
        echo "   請先執行備份: ./scripts/dump_data.sh"
        echo ""
        exit 0
    fi
    
    echo "==========================================="
    for file in $BACKUP_FILES; do
        filename=$(basename "$file")
        if [[ "$OSTYPE" == "darwin"* ]]; then
            filesize=$(ls -lh "$file" | awk '{print $5}')
            filedate=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$file")
        else
            filesize=$(ls -lh "$file" | awk '{print $5}')
            filedate=$(stat -c "%y" "$file" | cut -d. -f1)
        fi
        echo -e "   ${CYAN}$filename${NC}"
        echo "      大小: $filesize | 建立時間: $filedate"
        echo ""
    done
    echo "==========================================="
    echo ""
    echo -e "${BLUE}💡 還原指令：${NC}"
    echo "   ./scripts/restore_data.sh $BACKUP_DIR/<檔案名稱>"
    echo ""
    exit 0
fi

# 取得備份檔案路徑
BACKUP_FILE="$1"

# 如果是相對路徑，轉換為絕對路徑
if [[ ! "$BACKUP_FILE" = /* ]]; then
    BACKUP_FILE="$PROJECT_ROOT/$BACKUP_FILE"
fi

# 檢查備份檔案是否存在
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ 找不到備份檔案: $1${NC}"
    echo ""
    echo "請檢查檔案路徑是否正確"
    echo "可用備份: ./scripts/restore_data.sh"
    exit 1
fi

BACKUP_FILENAME=$(basename "$BACKUP_FILE")

echo "📄 準備還原："
echo "   檔案: $BACKUP_FILENAME"
echo ""

# 顯示還原前的資料統計
echo "📊 還原前資料統計："
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
" 2>/dev/null || echo "   （資料表可能不存在）"

echo ""

# 確認還原
echo -e "${YELLOW}⚠️  警告：還原操作會覆蓋現有資料！${NC}"
echo ""
read -p "確定要繼續嗎？(y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "已取消還原操作"
    exit 0
fi

echo ""
echo -e "${YELLOW}⏳ 開始還原...${NC}"
echo ""

# 複製備份檔案到容器
docker cp "$BACKUP_FILE" "$DB_CONTAINER:/tmp/restore.sql"

# 執行還原
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -f /tmp/restore.sql 2>&1 | \
    grep -v "NOTICE:" | grep -v "^$" || true

# 清理暫存檔案
docker exec "$DB_CONTAINER" rm -f /tmp/restore.sql

echo ""
echo -e "${GREEN}✓ 還原完成！${NC}"
echo ""

# 顯示還原後的資料統計
echo "📊 還原後資料統計："
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
echo "==========================================="
echo -e "${GREEN}✓ 還原作業完成${NC}"
echo "==========================================="
echo ""

