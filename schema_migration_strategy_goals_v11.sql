-- =============================================================================
-- USP Data & AI Strategy — Schema Migration: g3 solution-space scope
-- September 2026
--
-- Follow-up to schema_migration_strategy_goals_v7.sql (DONE — do not re-edit or
-- re-run that file). g3's "threshold-bars" chart_config.solutionSpaces listed
-- 4 mock solution spaces (Instruction + Tutoring, Advising + Navigation,
-- Assessment, Content Generation). Only the first two are in scope for this
-- goal — drops Assessment and Content Generation.
--
-- Nothing else on g3 changes — threshold (40), target_text/chart_type/
-- chart_note/goal_note are all unchanged from v7. g1 and g2 are NOT touched
-- by this migration.
--
-- This migration is NOT executed as part of this change — no Databricks
-- credentials are available in this environment. Run it manually in the
-- Databricks SQL Editor once reviewed.
--
-- Run in: Databricks SQL Editor (usp_data catalog, usp_strategy schema)
-- Run manually — not executed as part of this change.
-- =============================================================================


-- =============================================================================
-- SECTION 1: g3 — Infrastructure Designed for the Learners Who Need it Most
-- =============================================================================

UPDATE usp_data.usp_strategy.strategy_goals
SET
  chart_config = '{"threshold":40,"solutionSpaces":[{"label":"Instruction + Tutoring","pct":17},{"label":"Advising + Navigation","pct":23}]}',
  last_updated = current_timestamp(),
  updated_by  = 'migration:v11-g3-solution-spaces'
WHERE goal_id = 'g3';


-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- 1. Confirm the update landed
SELECT goal_id, number, title, chart_type, updated_by, last_updated
FROM usp_data.usp_strategy.strategy_goals
WHERE goal_id = 'g3';

-- 2. Confirm chart_config parses as valid JSON and has exactly 2 solution spaces
SELECT goal_id,
       get_json_object(chart_config, '$.threshold') AS threshold,
       size(from_json(chart_config, 'struct<solutionSpaces:array<string>>').solutionSpaces) AS space_count,
       get_json_object(chart_config, '$.solutionSpaces[0].label') AS space_1,
       get_json_object(chart_config, '$.solutionSpaces[1].label') AS space_2
FROM usp_data.usp_strategy.strategy_goals
WHERE goal_id = 'g3';
-- Expect: threshold='40', space_count=2, space_1='Instruction + Tutoring',
--         space_2='Advising + Navigation'.

-- 3. Confirm g1 and g2 were NOT touched by this migration
SELECT goal_id, number, title, updated_by, last_updated
FROM usp_data.usp_strategy.strategy_goals
WHERE goal_id IN ('g1','g2')
ORDER BY number;
