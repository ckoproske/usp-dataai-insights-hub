-- =============================================================================
-- USP Data & AI Strategy — Feedback table
-- Run once in Databricks SQL Editor
-- Safe to re-run: CREATE IF NOT EXISTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS usp_data.usp_strategy.feedback (
    feedback_id  STRING NOT NULL,
    submitted_by STRING,
    author_name  STRING,
    submitted_at TIMESTAMP,
    source       STRING,   -- 'dashboard' | 'portal'
    rating       INT,      -- 1–5 stars
    working_well STRING,
    improve      STRING
);

-- Verify
SELECT COUNT(*) AS total,
       ROUND(AVG(rating), 1) AS avg_rating
FROM usp_data.usp_strategy.feedback;
