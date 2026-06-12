-- =============================================================================
-- USP Data & AI Strategy — Indicator period targets table
-- Run once in Databricks SQL Editor
-- Safe to re-run: CREATE TABLE IF NOT EXISTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS usp_data.usp_strategy.indicator_period_targets (
    target_id    STRING    NOT NULL,
    indicator_id STRING    NOT NULL,
    entity_type  STRING    NOT NULL,   -- 'bow' | 'portfolio'
    year         INT       NOT NULL,
    period       STRING    NOT NULL,   -- 'H1','H2' | 'Q1'–'Q4' | 'Jan–Feb' etc. | 'M01'–'M12'
    target_value DOUBLE,
    updated_by   STRING,
    updated_at   TIMESTAMP
);

-- Verify
SELECT COUNT(*) AS total FROM usp_data.usp_strategy.indicator_period_targets;
