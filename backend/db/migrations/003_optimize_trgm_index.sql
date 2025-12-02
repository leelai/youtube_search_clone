-- ============================================================
-- Optimization: Better pg_trgm indexes for fuzzy search
-- ============================================================

-- Set a lower similarity threshold for better recall with short keywords
-- This affects the % operator behavior
SET pg_trgm.similarity_threshold = 0.1;
SET pg_trgm.word_similarity_threshold = 0.1;

-- Drop old indexes if they exist (to recreate with better options)
DROP INDEX IF EXISTS idx_worlds_title_trgm;
DROP INDEX IF EXISTS idx_worlds_title_prefix;

-- Create optimized GIN index for trigram operations
-- This index supports: %, <%, similarity(), word_similarity()
CREATE INDEX IF NOT EXISTS idx_worlds_title_trgm_gin
    ON worlds USING GIN (title gin_trgm_ops);

-- Create GiST index as alternative (sometimes faster for certain queries)
CREATE INDEX IF NOT EXISTS idx_worlds_title_trgm_gist
    ON worlds USING GIST (title gist_trgm_ops);

-- Create index for ILIKE prefix searches
CREATE INDEX IF NOT EXISTS idx_worlds_title_lower_pattern
    ON worlds (LOWER(title) text_pattern_ops);

-- Create index for case-insensitive searches
CREATE INDEX IF NOT EXISTS idx_worlds_title_lower
    ON worlds (LOWER(title));

-- Analyze the table to update statistics
ANALYZE worlds;

