-- =============================================================================
-- USP Data & AI Strategy — Schema Migration: g4 Sector/Context Metrics chart
-- September 2026
--
-- Follow-up to schema_migration_strategy_goals_v7.sql (DONE — do not re-edit
-- or re-run that file). g4 ("Data-Informed Decision Making") previously had
-- no chart at all (chart_type NULL) — just a baseline/target stat. Adds a new
-- chart_type, "context-metric-bars" (also documented in schema.dbml's
-- chart_type/chart_config column notes), rendering the "Sector / Context
-- Metrics" box: a centered header with the existing 2026 baseline
-- (baseline_year/baseline_total, unchanged) shown top-right, a bold
-- subheading, and one horizontal bar per criterion (Timely, Interoperable,
-- Actionable), each with a parenthetical detail and a %.
--
-- Also sets bold_stat to "70%" (a valid leading substring of the existing
-- target_text, which already starts with "70%") — this was missing before.
--
-- chart_note is reused for the descriptive line under the subheading ("%
-- leaders reporting..."), matching the existing convention where chart_note
-- lives in its own column rather than duplicated inside chart_config.
--
-- Nothing else on g4 changes — target_text, baseline_year, baseline_total are
-- all unchanged. g1, g2, g3, g5, g6 are NOT touched by this migration.
--
-- This migration is NOT executed as part of this change — no Databricks
-- credentials are available in this environment. Run it manually in the
-- Databricks SQL Editor once reviewed.
--
-- Run in: Databricks SQL Editor (usp_data catalog, usp_strategy schema)
-- Run manually — not executed as part of this change.
-- =============================================================================


-- =============================================================================
-- SECTION 1: g4 — Data-Informed Decision Making
-- =============================================================================

UPDATE usp_data.usp_strategy.strategy_goals
SET
  bold_stat   = '70%',
  chart_type  = 'context-metric-bars',
  chart_note  = '% leaders reporting that the data they use most often meets each high-quality criteria',
  chart_config = '{"subheading":"High-quality data is timely, comprehensive, and actionable","criteria":[{"label":"Timely","detail":"Cross-sector insights within a week","pct":42},{"label":"Interoperable","detail":"Combining across systems \\"not at all hard\\"","pct":9},{"label":"Actionable","detail":"Used to make teaching & learning or advising & navigation decision","pct":69}]}',
  last_updated = current_timestamp(),
  updated_by  = 'migration:v12-g4-context-metrics'
WHERE goal_id = 'g4';


-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- 1. Confirm the update landed
SELECT goal_id, number, title, chart_type, bold_stat, updated_by, last_updated
FROM usp_data.usp_strategy.strategy_goals
WHERE goal_id = 'g4';

-- 2. Confirm chart_config parses as valid JSON and has 3 criteria
SELECT goal_id,
       get_json_object(chart_config, '$.subheading') AS subheading,
       size(from_json(chart_config, 'struct<criteria:array<string>>').criteria) AS criteria_count,
       get_json_object(chart_config, '$.criteria[0].label') AS criterion_1,
       get_json_object(chart_config, '$.criteria[0].pct')   AS criterion_1_pct
FROM usp_data.usp_strategy.strategy_goals
WHERE goal_id = 'g4';
-- Expect: criteria_count=3, criterion_1='Timely', criterion_1_pct='42'.

-- 3. Confirm g1, g2, g3, g5, g6 were NOT touched by this migration
SELECT goal_id, number, title, updated_by, last_updated
FROM usp_data.usp_strategy.strategy_goals
WHERE goal_id IN ('g1','g2','g3','g5','g6')
ORDER BY number;
