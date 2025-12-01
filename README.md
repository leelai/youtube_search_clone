# Worlds Search

一個類似 YouTube 搜索體驗的生產級自動完成 + 搜索系統，但針對 "Worlds" 內容進行優化。

## 功能特點

### 搜索體驗
- **實時自動完成**：輸入時即時顯示建議
- **兩種建議類型**：
  - 關鍵字建議 (keyword) - 點擊後導航到搜索結果頁
  - World 建議 (world) - 點擊後直接導航到 World 詳情頁
- **智能排名**：基於多種因素計算建議排名

### 排名算法
```
final_score = prefix_score + personal_score + trending_score + fuzzy_score + ctr_score
```

- **prefix_score (100/50/0)**：前綴匹配得分
- **personal_score (freq × 20)**：個人搜索歷史得分
- **trending_score (redis_score × 1.0)**：全局熱門得分
- **fuzzy_score (similarity × 10)**：模糊匹配得分 (pg_trgm)
- **ctr_score (ctr × 50)**：點擊率得分

### 行為追蹤
- 搜索曝光記錄 (impressions)
- 點擊記錄 (clicks)
- 搜索歷史記錄

## 技術棧

- **後端**：Go 1.22 + Gin
- **數據庫**：PostgreSQL 16 (pg_trgm 擴展)
- **緩存**：Redis (ZSET 熱門排行)
- **前端**：React + Vite + TypeScript + Tailwind CSS
- **容器化**：Docker + Docker Compose

## 快速開始

### 使用 Docker Compose

```bash
# 克隆項目
git clone <repository-url>
cd youtube_search_clone

# 啟動所有服務
docker-compose up --build

# 訪問前端
open http://localhost:3000

# API 端點
curl http://localhost:8080/api/search/suggestions?keyword=gar
```

### 本地開發

#### 後端
```bash
cd backend

# 安裝依賴
go mod download

# 啟動 PostgreSQL 和 Redis (使用 Docker)
docker-compose up postgres redis -d

# 運行後端
go run main.go
```

#### 前端
```bash
cd frontend

# 安裝依賴
npm install

# 開發模式
npm run dev

# 構建
npm run build
```

## API 端點

### 搜索 API

| 方法 | 路徑 | 描述 |
|------|------|------|
| GET | `/api/search/suggestions` | 獲取自動完成建議 |
| GET | `/api/search/results` | 獲取搜索結果 |
| POST | `/api/search/input` | 記錄搜索輸入 |
| POST | `/api/search/click` | 記錄點擊事件 |
| GET | `/api/search/trending` | 獲取熱門搜索 |

### Worlds API

| 方法 | 路徑 | 描述 |
|------|------|------|
| GET | `/api/worlds/:id` | 獲取 World 詳情 |

## 項目結構

```
.
├── docker-compose.yml
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── main.go
│   ├── go.mod
│   ├── config/
│   │   └── config.go
│   ├── db/
│   │   ├── db.go
│   │   └── migrations/
│   │       └── 001_init.sql
│   ├── models/
│   │   ├── world.go
│   │   ├── search_history.go
│   │   ├── impressions.go
│   │   ├── clicks.go
│   │   └── suggestion.go
│   ├── repositories/
│   │   ├── worlds_repository.go
│   │   ├── search_repository.go
│   │   └── logs_repository.go
│   ├── services/
│   │   ├── ranking_service.go
│   │   ├── suggestions_service.go
│   │   └── search_service.go
│   ├── handlers/
│   │   ├── search_handler.go
│   │   └── worlds_handler.go
│   ├── router/
│   │   └── router.go
│   └── utils/
│       ├── normalize.go
│       └── errors.go
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── tsconfig.json
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── index.css
        ├── types/
        │   └── index.ts
        ├── api/
        │   ├── searchApi.ts
        │   └── worldsApi.ts
        ├── hooks/
        │   └── useDebounce.ts
        ├── components/
        │   ├── SearchBar.tsx
        │   ├── SuggestionsDropdown.tsx
        │   ├── WorldCard.tsx
        │   └── Navbar.tsx
        └── routes/
            ├── HomePage.tsx
            ├── SearchPage.tsx
            └── WorldDetailPage.tsx
```

## 數據庫架構

### worlds 表
主要內容表，存儲可搜索的 World 實體。

### search_history 表
記錄用戶的搜索歷史，用於個人化推薦。

### search_impressions 表
記錄自動完成建議的曝光，用於 CTR 計算。

### search_clicks 表
記錄用戶對建議的點擊，用於 CTR 計算和行為分析。

### Redis trending_search ZSET
存儲全局熱門搜索關鍵字及其分數。

## 數據種子腳本

### scripts/seed_agnews_remote.py

從 Hugging Face 下載 AG News 資料集並導入到 `worlds` 表。

```bash
# 安裝依賴
pip install requests psycopg2-binary

# 下載並插入 20,000 筆資料（隨機洗牌）
python scripts/seed_agnews_remote.py --limit 20000 --shuffle

# 插入 50,000 筆資料
python scripts/seed_agnews_remote.py --limit 50000 --shuffle

# 只下載檔案，不寫入資料庫
python scripts/seed_agnews_remote.py --download-only

# 強制重新下載
python scripts/seed_agnews_remote.py --force-download --limit 20000
```

**CLI 參數：**

| 參數 | 說明 | 預設值 |
|------|------|--------|
| `--limit` | 要插入的資料列數 | 20000 |
| `--shuffle` | 插入前隨機洗牌 | False |
| `--force-download` | 強制重新下載檔案 | False |
| `--download-only` | 只下載檔案，不寫入資料庫 | False |
| `--url` | 自訂下載 URL | Hugging Face URL |
| `--output` | 本地儲存路徑 | `datasets/agnews.jsonl.gz` |

### scripts/seed.py

從 Wikipedia、ArXiv、Google Books 等 API 抓取資料並導入資料庫。

```bash
python scripts/seed.py
```

## K6 效能測試

本專案包含完整的 k6 負載測試套件，可測試不同資料量級別下的搜索 API 效能。

### 前置需求

```bash
# 安裝 k6
brew install k6        # macOS
# 或參考 https://k6.io/docs/getting-started/installation/

# 安裝 jq (用於解析 JSON)
brew install jq        # macOS
apt install jq         # Linux
```

### 使用 Makefile

```bash
# 查看所有可用命令
make help

# 準備特定數量的資料
make seed-1k           # 1,000 筆
make seed-10k          # 10,000 筆
make seed-100k         # 100,000 筆

# 執行 k6 測試 (使用當前資料庫資料)
make k6-test

# 完整基準測試 (準備資料 + 執行測試)
make benchmark-20k     # 測試 20K 資料
make benchmark-100k    # 測試 100K 資料

# 執行所有級別的完整基準測試套件
make benchmark-all
```

### 自訂測試參數

```bash
# 自訂虛擬用戶數和測試時間
K6_VUS=20 K6_DURATION=60s make k6-test

# 自訂 API URL
K6_BASE_URL=http://api.example.com:8080 make k6-test
```

### 直接執行 benchmark 腳本

```bash
# 執行所有級別測試
./scripts/run_benchmark.sh

# 只測試特定級別
./scripts/run_benchmark.sh 1k 10k 50k
```

### 測試輸出範例

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                    Search API Benchmark Results                           ║
╠═══════════════════════════════════════════════════════════════════════════╣
║   Size   │   p50    │   p95    │   p99    │   RPS    │ Status            ║
╠══════════╪══════════╪══════════╪══════════╪══════════╪═══════════════════╣
║       1k │   12.5ms │   25.3ms │   45.2ms │    850.2 │ OK                ║
║       5k │   15.2ms │   32.1ms │   58.4ms │    720.5 │ OK                ║
║      10k │   22.8ms │   48.6ms │   85.3ms │    580.1 │ OK                ║
║      50k │   45.1ms │   95.2ms │  180.5ms │    320.8 │ WARN              ║
╚══════════╧══════════╧══════════╧══════════╧══════════╧═══════════════════╝

Response Time (p95) by Data Size:
      1k │ ████████░░░░░░░░░░░░░░░░░░░░░░  25.3ms
      5k │ ██████████░░░░░░░░░░░░░░░░░░░░  32.1ms
     10k │ ███████████████░░░░░░░░░░░░░░░  48.6ms
     50k │ ██████████████████████████████  95.2ms
```

### 測試結果檔案

測試結果會儲存在 `k6/results/` 目錄：
- `summary.json` - 最新測試的完整結果
- `result_{size}.json` - 各級別的測試結果
- `benchmark_results.csv` - 所有測試的彙總 CSV

## 配置

### 環境變量

| 變量 | 描述 | 默認值 |
|------|------|--------|
| POSTGRES_DSN | PostgreSQL 連接字符串 | `postgres://worlds_user:worlds_password@localhost:5432/worlds_db?sslmode=disable` |
| REDIS_ADDR | Redis 地址 | `localhost:6379` |
| SERVER_PORT | 後端服務端口 | `8080` |
| VITE_API_BASE_URL | 前端 API 基礎 URL | (空，使用代理) |

## 許可證

MIT
