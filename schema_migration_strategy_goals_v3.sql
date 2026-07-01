-- =============================================================================
-- USP Data & AI Strategy — Schema Migration: Strategy Goals annual targets
-- July 2026
--
-- Adds target_2026..target_2030 to strategy_goals so goal targets can be
-- entered per year in the portal, mirroring the existing target_2026..
-- target_2030 columns on bow_indicators / portfolio_indicators.
--
-- Run in: Databricks SQL Editor (usp_data catalog, usp_strategy schema)
-- =============================================================================

ALTER TABLE usp_data.usp_strategy.strategy_goals
ADD COLUMNS (
  target_2026 STRING,
  target_2027 STRING,
  target_2028 STRING,
  target_2029 STRING,
  target_2030 STRING
);


-- =============================================================================
-- VERIFICATION
-- =============================================================================

SELECT column_name, data_type
FROM usp_data.information_schema.columns
WHERE table_schema = 'usp_strategy' AND table_name = 'strategy_goals'
  AND column_name IN ('target_2026','target_2027','target_2028','target_2029','target_2030')
ORDER BY column_name;
