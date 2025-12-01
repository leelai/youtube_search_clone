-- ============================================================
-- World Search System - Database Initialization
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- TABLES
-- ============================================================

-- 1. worlds - Primary content being searched (like YouTube videos)
CREATE TABLE IF NOT EXISTS worlds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for prefix + pg_trgm fuzzy search
CREATE INDEX IF NOT EXISTS idx_worlds_title_trgm
    ON worlds USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_worlds_title_prefix
    ON worlds (title text_pattern_ops);

CREATE INDEX IF NOT EXISTS idx_worlds_description_trgm
    ON worlds USING gin (description gin_trgm_ops);

-- 2. search_history - Stores finalized search inputs
CREATE TABLE IF NOT EXISTS search_history (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    keyword TEXT NOT NULL,              -- raw user input
    normalized_keyword TEXT NOT NULL,   -- lowercased, trimmed, normalized
    has_result BOOLEAN,
    selected_world_id UUID,             -- world the user finally clicked (if any)
    device VARCHAR(20),
    client_app_version VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_history_user_time
    ON search_history (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_history_keyword
    ON search_history (normalized_keyword);

CREATE INDEX IF NOT EXISTS idx_search_history_prefix
    ON search_history (normalized_keyword text_pattern_ops);

-- 3. search_impressions - Autocomplete suggestion impressions
CREATE TABLE IF NOT EXISTS search_impressions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID,
    keyword TEXT NOT NULL,              -- original input at suggestion time
    normalized_keyword TEXT NOT NULL,
    suggestion TEXT NOT NULL,           -- what was shown
    suggestion_type VARCHAR(20) NOT NULL, -- "keyword" | "world"
    world_id UUID,                      -- if type = world
    position INT NOT NULL,              -- rank index in suggestion list
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_impressions_keyword
    ON search_impressions (normalized_keyword);

CREATE INDEX IF NOT EXISTS idx_search_impressions_user
    ON search_impressions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_impressions_suggestion
    ON search_impressions (suggestion, suggestion_type);

-- 4. search_clicks - Click logs for suggestions
CREATE TABLE IF NOT EXISTS search_clicks (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID,
    keyword TEXT NOT NULL,              -- prefix user had when suggestions were shown
    normalized_keyword TEXT NOT NULL,
    clicked_suggestion TEXT NOT NULL,   -- text of clicked suggestion
    suggestion_type VARCHAR(20) NOT NULL, -- "keyword" | "world"
    world_id UUID,                      -- if click was on a world suggestion
    position INT,                       -- position in suggestion dropdown
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_clicks_keyword
    ON search_clicks (normalized_keyword);

CREATE INDEX IF NOT EXISTS idx_search_clicks_user
    ON search_clicks (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_clicks_suggestion
    ON search_clicks (clicked_suggestion, suggestion_type);

-- ============================================================
-- SEED DATA - Sample Worlds
-- ============================================================

INSERT INTO worlds (id, title, description, created_at) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Garmin 840 北高實測 World', 
     'Garmin Edge 840 實測紀錄，從台北騎到高雄的完整路線與心得分享。包含電量續航、導航準確度、爬坡數據等詳細評測。', 
     NOW() - INTERVAL '5 days'),
    
    ('22222222-2222-2222-2222-222222222222', 'Giant TCR 公路車 World',
     'Giant TCR Advanced Pro 公路車完整評測，碳纖維車架輕量化設計，適合長途騎乘與比賽使用。',
     NOW() - INTERVAL '10 days'),
    
    ('33333333-3333-3333-3333-333333333333', 'PostgreSQL pg_trgm Demo World',
     '深入了解 PostgreSQL 的 pg_trgm 擴展，實現高效的模糊搜索和相似度匹配功能。',
     NOW() - INTERVAL '15 days'),
    
    ('44444444-4444-4444-4444-444444444444', 'React Hooks 深入解析 World',
     'React Hooks 完整教學，包含 useState、useEffect、useContext、useReducer 等核心概念與實戰應用。',
     NOW() - INTERVAL '3 days'),
    
    ('55555555-5555-5555-5555-555555555555', 'Docker Compose 實戰指南 World',
     '從零開始學習 Docker Compose，建立多容器應用程式的完整流程與最佳實踐。',
     NOW() - INTERVAL '7 days'),
    
    ('66666666-6666-6666-6666-666666666666', 'Go 語言並發編程 World',
     'Go 語言 Goroutine 和 Channel 深入教學，掌握高效並發編程技巧。',
     NOW() - INTERVAL '12 days'),
    
    ('77777777-7777-7777-7777-777777777777', 'Redis 緩存策略 World',
     'Redis 緩存設計模式與策略，包含 ZSET 排行榜、分布式鎖、會話管理等實用案例。',
     NOW() - INTERVAL '8 days'),
    
    ('88888888-8888-8888-8888-888888888888', 'TypeScript 進階技巧 World',
     'TypeScript 高級類型系統、泛型、裝飾器等進階特性完整解析。',
     NOW() - INTERVAL '4 days'),
    
    ('99999999-9999-9999-9999-999999999999', 'Garmin Fenix 7 越野跑 World',
     'Garmin Fenix 7 越野跑實測，GPS 精準度、心率監測、路線導航功能評測。',
     NOW() - INTERVAL '6 days'),
    
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Giant Revolt 礫石車 World',
     'Giant Revolt Advanced 礫石車評測，適合混合路面騎乘的全能車款。',
     NOW() - INTERVAL '9 days'),
    
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Garmin Connect 數據分析 World',
     '如何使用 Garmin Connect 分析運動數據，設定訓練計劃與追蹤進度。',
     NOW() - INTERVAL '2 days'),
    
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Kubernetes 入門到精通 World',
     'Kubernetes 容器編排完整教學，從基礎概念到生產環境部署。',
     NOW() - INTERVAL '14 days'),
    
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'GraphQL API 設計 World',
     'GraphQL API 設計最佳實踐，與 REST API 的比較與選擇指南。',
     NOW() - INTERVAL '11 days'),
    
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Gaming PC 組裝指南 World',
     '2024 年遊戲電腦組裝完整指南，從零件選購到系統安裝。',
     NOW() - INTERVAL '1 day'),
    
    ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Nginx 負載均衡 World',
     'Nginx 負載均衡配置教學，實現高可用性 Web 服務架構。',
     NOW() - INTERVAL '13 days'),
    
    ('11111111-2222-3333-4444-555555555555', 'Giant Propel 空力車 World',
     'Giant Propel Advanced SL 空力公路車評測，風洞測試數據與實際騎乘體驗。',
     NOW() - INTERVAL '16 days'),
    
    ('22222222-3333-4444-5555-666666666666', 'PostgreSQL 性能優化 World',
     'PostgreSQL 查詢優化技巧，索引設計、執行計劃分析、參數調優。',
     NOW() - INTERVAL '17 days'),
    
    ('33333333-4444-5555-6666-777777777777', 'React Native 跨平台開發 World',
     'React Native 跨平台應用開發實戰，一次編寫同時支援 iOS 和 Android。',
     NOW() - INTERVAL '18 days'),
    
    ('44444444-5555-6666-7777-888888888888', 'Garmin Venu 智慧手錶 World',
     'Garmin Venu 3 智慧手錶完整評測，健康監測、運動追蹤、日常使用體驗。',
     NOW() - INTERVAL '19 days'),
    
    ('55555555-6666-7777-8888-999999999999', 'Git 進階工作流程 World',
     'Git 分支策略與團隊協作最佳實踐，包含 Git Flow、GitHub Flow 等工作流程。',
     NOW() - INTERVAL '20 days');

-- ============================================================
-- Insert some sample search history for demo user
-- ============================================================

INSERT INTO search_history (user_id, keyword, normalized_keyword, has_result, device, client_app_version, created_at) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Garmin', 'garmin', true, 'web', '1.0.0', NOW() - INTERVAL '1 day'),
    ('00000000-0000-0000-0000-000000000001', 'garmin 北高', 'garmin 北高', true, 'web', '1.0.0', NOW() - INTERVAL '2 days'),
    ('00000000-0000-0000-0000-000000000001', 'Giant', 'giant', true, 'web', '1.0.0', NOW() - INTERVAL '3 days'),
    ('00000000-0000-0000-0000-000000000001', 'PostgreSQL', 'postgresql', true, 'web', '1.0.0', NOW() - INTERVAL '4 days'),
    ('00000000-0000-0000-0000-000000000001', 'React', 'react', true, 'web', '1.0.0', NOW() - INTERVAL '5 days'),
    ('00000000-0000-0000-0000-000000000001', 'Docker', 'docker', true, 'web', '1.0.0', NOW() - INTERVAL '6 days'),
    ('00000000-0000-0000-0000-000000000001', 'garmin 北高', 'garmin 北高', true, 'web', '1.0.0', NOW() - INTERVAL '7 days'),
    ('00000000-0000-0000-0000-000000000001', 'garmin 北高', 'garmin 北高', true, 'web', '1.0.0', NOW() - INTERVAL '8 days');
