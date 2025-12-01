#!/usr/bin/env python3
"""
檢查資料庫記錄數的 Python 腳本
"""

import psycopg2
from datetime import datetime

# 資料庫連線參數（與 seed.py 相同）
DB_PARAMS = {
    'host': 'localhost',
    'port': 5433,
    'database': 'worlds_db',
    'user': 'worlds_user',
    'password': 'worlds_password'
}

def main():
    print("=" * 60)
    print("YouTube Search Clone - Database Check")
    print("=" * 60)
    print()
    
    try:
        print("🔌 連線到 PostgreSQL...", end=' ', flush=True)
        conn = psycopg2.connect(**DB_PARAMS)
        cur = conn.cursor()
        print("✓")
        print()
        
        # 查詢總記錄數
        print("📊 查詢資料庫記錄數...")
        cur.execute("SELECT COUNT(*) FROM worlds")
        total_count = cur.fetchone()[0]
        print(f"   總記錄數: {total_count:,} 筆")
        print()
        
        # 查詢詳細統計
        print("📈 詳細統計...")
        cur.execute("""
            SELECT 
                COUNT(*) as total,
                COUNT(DISTINCT title) as unique_titles,
                MIN(created_at) as earliest,
                MAX(created_at) as latest,
                pg_size_pretty(pg_total_relation_size('worlds')) as size
            FROM worlds
        """)
        stats = cur.fetchone()
        
        if stats and stats[0] > 0:
            print(f"   總記錄數: {stats[0]:,} 筆")
            print(f"   唯一標題數: {stats[1]:,} 筆")
            print(f"   最早記錄: {stats[2]}")
            print(f"   最新記錄: {stats[3]}")
            print(f"   資料表大小: {stats[4]}")
            print()
            
            # 顯示最近 5 筆記錄
            print("🔍 最近 5 筆記錄預覽...")
            cur.execute("""
                SELECT 
                    title,
                    LEFT(description, 80) as description,
                    created_at
                FROM worlds
                ORDER BY created_at DESC
                LIMIT 5
            """)
            
            records = cur.fetchall()
            for i, record in enumerate(records, 1):
                print(f"\n   [{i}] {record[0][:50]}")
                print(f"       {record[1]}...")
                print(f"       時間: {record[2]}")
        else:
            print("   ⚠️  資料表是空的")
        
        cur.close()
        conn.close()
        
        print()
        print("=" * 60)
        print("✓ 檢查完成")
        print("=" * 60)
        
    except psycopg2.OperationalError as e:
        print("❌")
        print()
        print(f"❌ 無法連線到資料庫: {e}")
        print("   請確認:")
        print("   1. PostgreSQL 容器已啟動: docker-compose up -d postgres")
        print("   2. 容器端口 5433 可以訪問")
        print("   3. 資料庫已初始化完成")
        exit(1)
    except Exception as e:
        print("❌")
        print()
        print(f"❌ 發生錯誤: {e}")
        exit(1)

if __name__ == "__main__":
    main()

