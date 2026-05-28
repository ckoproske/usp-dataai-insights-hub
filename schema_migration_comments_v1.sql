-- =============================================================================
-- USP Data & AI Strategy — Comments table
-- Run once in Databricks SQL Editor
-- =============================================================================

CREATE TABLE IF NOT EXISTS usp_data.usp_strategy.comments (
    comment_id   STRING  NOT NULL,
    entity_type  STRING  NOT NULL,   -- 'bow' | 'portfolio'
    entity_id    STRING  NOT NULL,
    author       STRING,             -- display_name at post time
    author_email STRING,
    body         STRING  NOT NULL,
    created_at   TIMESTAMP
);

-- Optional: verify
SELECT 'comments table ready' AS status;
