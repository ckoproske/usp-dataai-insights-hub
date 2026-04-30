-- =============================================================================
-- USP Data & AI Strategy — Schema Migration: Indicator Units
-- Adds unit column to bow_indicators and portfolio_indicators
-- April 2026
-- Run in: usp_data.usp_strategy (Databricks SQL editor)
-- =============================================================================

ALTER TABLE usp_data.usp_strategy.bow_indicators
ADD COLUMN unit STRING
COMMENT 'Unit of measurement — e.g. %, #, $, schools, learners, partners';

ALTER TABLE usp_data.usp_strategy.portfolio_indicators
ADD COLUMN unit STRING
COMMENT 'Unit of measurement — e.g. %, #, $, schools, learners, partners';


-- =============================================================================
-- VERIFICATION
-- =============================================================================

SELECT col_name, data_type, comment
FROM (DESCRIBE TABLE usp_data.usp_strategy.bow_indicators)
WHERE col_name = 'unit';

SELECT col_name, data_type, comment
FROM (DESCRIBE TABLE usp_data.usp_strategy.portfolio_indicators)
WHERE col_name = 'unit';
