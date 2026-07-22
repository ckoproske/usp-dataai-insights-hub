-- =============================================================================
-- USP Data & AI Strategy — Schema Migration: Special Initiative Flag
-- Adds special_initiative column to investment_overlays so investments can be
-- flagged as part of a special initiative (e.g. "CEO Reserve Ask") and filtered
-- on in the All Investments view.
-- July 2026
-- Run in: usp_data.usp_strategy (Databricks SQL editor)
-- =============================================================================

ALTER TABLE usp_data.usp_strategy.investment_overlays
ADD COLUMN special_initiative STRING
COMMENT 'Free-text flag for a special initiative this investment is tied to, e.g. "CEO Reserve Ask"';


-- =============================================================================
-- VERIFICATION
-- =============================================================================

SELECT col_name, data_type, comment
FROM (DESCRIBE TABLE usp_data.usp_strategy.investment_overlays)
WHERE col_name = 'special_initiative';
