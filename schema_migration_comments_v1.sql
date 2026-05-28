-- =============================================================================
-- USP Data & AI Strategy — Comments table
-- Run once in Databricks SQL Editor
-- Safe to re-run: CREATE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS
-- =============================================================================

-- Create table (no-op if already exists)
CREATE TABLE IF NOT EXISTS usp_data.usp_strategy.comments (
    comment_id   STRING  NOT NULL,
    entity_type  STRING  NOT NULL,   -- 'bow' | 'portfolio'
    entity_id    STRING  NOT NULL,
    author       STRING,             -- display_name at post time
    author_email STRING,
    body         STRING  NOT NULL,
    created_at   TIMESTAMP,
    is_resolved  BOOLEAN
);

-- Add is_resolved to existing tables that were created before this column existed
ALTER TABLE usp_data.usp_strategy.comments
  ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN;

-- Verify
SELECT COUNT(*) AS total_comments,
       SUM(CASE WHEN is_resolved = true THEN 1 ELSE 0 END) AS resolved
FROM usp_data.usp_strategy.comments;
