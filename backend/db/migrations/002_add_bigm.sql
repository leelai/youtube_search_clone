-- ============================================================
-- Version 2: Add pg_bigm extension for BIGRAM search comparison
-- ============================================================

-- Enable pg_bigm extension (for bigram-based text search)
-- Note: This requires a PostgreSQL image with pg_bigm installed
CREATE EXTENSION IF NOT EXISTS pg_bigm;

-- Add bigram index on worlds.title for BIGRAM search
CREATE INDEX IF NOT EXISTS idx_worlds_title_bigm
    ON worlds
    USING gin (title gin_bigm_ops);

-- Add bigram index on worlds.description for future use
CREATE INDEX IF NOT EXISTS idx_worlds_description_bigm
    ON worlds
    USING gin (description gin_bigm_ops);

