-- =============================================================================
-- USP Data & AI Strategy — Schema Migration: g4 primary progress chart
-- September 2026
--
-- Follow-up to schema_migration_strategy_goals_v12.sql (DONE — do not re-edit
-- or re-run that file). Reworks g4's "context-metric-bars" chart:
--
--   1. Adds chart_config.breakdown — a small array of decision-maker-type
--      categories (District, Postsecondary) with a "pct" field that starts
--      NULL. The primary progress chart (goal2030/current_2026/baseline,
--      all unchanged columns) now plots an "All Decision-Makers (Avg)" line
--      plus one additional line per breakdown entry once its pct is filled
--      in later — no further code change needed when that data lands, only
--      a chart_config update setting the pct.
--   2. The Sector/Context Metrics header text is removed from the UI (a
--      frontend-only change, no column affected) — the criteria bars
--      (Timely/Interoperable/Actionable) are now framed as supporting
--      context for what "high-quality" means, secondary to the new primary
--      progress chart.
--   3. Re-quotes criteria[1].detail using curly typographic quotes (“ ”)
--      instead of straight quotes, matching the dashboard.jsx fallback data
--      exactly and sidestepping the backslash-escaping pitfall from v12
--      (Databricks SQL treats backslash as an escape character inside
--      single-quoted string literals, unlike standard SQL).
--
-- Nothing else on g4 changes — target_text, bold_stat, chart_type, chart_note,
-- baseline_year, baseline_total are all unchanged from v12. g1, g2, g3, g5,
-- g6 are NOT touched by this migration.
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
  chart_config = '{"subheading":"High-quality data is timely, comprehensive, and actionable","criteria":[{"label":"Timely","detail":"Cross-sector insights within a week","pct":42},{"label":"Interoperable","detail":"Combining across systems “not at all hard”","pct":9},{"label":"Actionable","detail":"Used to make teaching & learning or advising & navigation decision","pct":69}],"breakdown":[{"key":"district","label":"District Decision-Makers","pct":null},{"key":"ps","label":"Postsecondary Decision-Makers","pct":null}]}',
  last_updated = current_timestamp(),
  updated_by  = 'migration:v14-g4-primary-progress'
WHERE goal_id = 'g4';


-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- 1. Confirm the update landed
SELECT goal_id, number, title, chart_type, bold_stat, updated_by, last_updated
FROM usp_data.usp_strategy.strategy_goals
WHERE goal_id = 'g4';

-- 2. Confirm chart_config parses as valid JSON, criteria are intact, and
--    breakdown is present with 2 NULL-pct entries
SELECT goal_id,
       get_json_object(chart_config, '$.criteria[1].detail')      AS criterion_2_detail,
       get_json_object(chart_config, '$.breakdown[0].key')        AS breakdown_1_key,
       get_json_object(chart_config, '$.breakdown[0].pct')        AS breakdown_1_pct,
       get_json_object(chart_config, '$.breakdown[1].key')        AS breakdown_2_key,
       get_json_object(chart_config, '$.breakdown[2].key')        AS breakdown_3_should_be_null
FROM usp_data.usp_strategy.strategy_goals
WHERE goal_id = 'g4';
-- Expect: criterion_2_detail='Combining across systems "not at all hard"'
--         (rendered with curly quotes), breakdown_1_key='district',
--         breakdown_1_pct=NULL, breakdown_2_key='ps',
--         breakdown_3_should_be_null=NULL.

-- 3. Confirm g1, g2, g3, g5, g6 were NOT touched by this migration
SELECT goal_id, number, title, updated_by, last_updated
FROM usp_data.usp_strategy.strategy_goals
WHERE goal_id IN ('g1','g2','g3','g5','g6')
ORDER BY number;
