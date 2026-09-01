-- =============================================================================
-- USP Data & AI Strategy — Schema Migration: 2030 Strategy Goals re-cut (6 goals)
-- September 2026
--
-- Two changes:
--   1. Adds strategy_goals.baseline_text — a display override for baselines that
--      are qualified ("≤ 5%") or not yet established ("Pending, insufficient
--      evidence"). baseline_total stays numeric for progress math and is NULL
--      when no baseline exists.
--   2. Re-cuts the goal set from 5 to 6 goals, each with a 2026 baseline.
--
-- Goal renumbering (goal_id is stable per content lineage — do NOT renumber ids,
-- they are referenced by portfolio_goal_links, strategy_goal_actuals,
-- goal_ratings, comments (level='goal'), and content_edit_log):
--
--   g1  number 1  retitled  Enable AI Solutions        → Shared Technical Public Goods
--   g2  number 2  retitled  Build Trusted Evidence     → Evidence & Safety Measures…
--   g6  number 3  NEW       Infrastructure Designed for the Learners Who Need it Most
--   g3  number 4  was 3     Data-Informed Decision Making (target text revised)
--   g4  number 5  was 4     Comprehensive EW Momentum Measurement (target revised, 70% → 40%)
--   g5  number 6  was 5     Amplify Coordination and Impact (unchanged apart from number)
--
-- Chart fields (chart_type, chart_note, chart_config, goal_note) are deliberately
-- NOT touched — the existing charts are being kept as-is pending a separate
-- chart refresh. Note that g1's and g2's chart_config and goal_note still
-- describe the previous "% of learners reached" framing and will read as
-- inconsistent with the new target text until that refresh lands.
--
-- Annual targets (target_2026..target_2030, added in v3) are left NULL — only
-- the 2026 baseline and the 2030 target are known at this point.
--
-- SUPERSEDED IN PART: schema_migration_strategy_goals_v5.sql renumbers goal_id
-- so it matches the display number (g6→g3, g3→g4, g4→g5, g5→g6). Do NOT re-run
-- the MERGE below after v5 has been applied — it would re-insert 'g6' as a
-- second row for number 3.
--
-- Run in: Databricks SQL Editor (usp_data catalog, usp_strategy schema)
-- =============================================================================


-- =============================================================================
-- SECTION 1: Add baseline_text
-- =============================================================================

ALTER TABLE usp_data.usp_strategy.strategy_goals
ADD COLUMNS (
  baseline_text STRING COMMENT 'Display override for qualified/absent baselines, e.g. "≤ 5%" or "Pending, insufficient evidence"; falls back to baseline_total when empty'
);


-- =============================================================================
-- SECTION 2: Re-cut the goal set to 6 goals with 2026 baselines
-- =============================================================================

MERGE INTO usp_data.usp_strategy.strategy_goals AS t
USING (
  SELECT * FROM VALUES
    (
      'g1', 'Shared Technical Public Goods',
      '50% of PST solutions using our public goods show 2x the efficacy of those that don''t',
      1, '% of PST solutions', '%', 50.0, 0.0, 1,
      'Q1 2026 — Annual Update in PR',
      '2026', 0.0, CAST(NULL AS STRING)
    ),
    (
      'g2', 'Evidence & Safety Measures that Shift the Market',
      '75% of independent verification bodies using our evaluation infrastructure investments',
      2, '% of independent verification bodies', '%', 75.0, 0.0, 2,
      'Q1 2026 — Annual Update in PR',
      '2026', 0.0, CAST(NULL AS STRING)
    ),
    (
      -- NEW goal — no prior lineage, so it gets a fresh goal_id. The id suffix
      -- does not track the display number (number 3, id g6).
      'g6', 'Infrastructure Designed for the Learners Who Need it Most',
      '40% of target populations served by solutions that perform well on key benchmarks that center them',
      3, '% of target populations', '%', 40.0, CAST(NULL AS DOUBLE), 3,
      'Q1 2026 — Annual Update in PR',
      '2026', CAST(NULL AS DOUBLE), 'Pending, insufficient evidence'
    ),
    (
      'g3', 'Data-Informed Decision Making',
      '70% of district and postsecondary data decision-makers report using better, higher-quality data to support learning and advising',
      4, '% decision makers', '%', 70.0, 21.0, 4,
      'Q4 2025 — Annual Update in PR',
      '2026', 21.0, CAST(NULL AS STRING)
    ),
    (
      'g4', 'Comprehensive EW Momentum Measurement',
      '40% of field leaders have comprehensive data access within 6 months to all 5 E-W Momentum Points',
      5, '% of field leaders', '%', 40.0, 5.0, 5,
      'Q1 2026 — Annual Update in PR',
      '2026', 5.0, '≤ 5%'
    ),
    (
      'g5', 'Amplify Coordination and Impact',
      '2-3x ($415-540M) leverage on USP Data investment through key partnerships.',
      6, 'Investment leverage', 'x', 3.0, 1.1, 6,
      'Q4 2025 — Annual Update in PR',
      CAST(NULL AS STRING), CAST(NULL AS DOUBLE), CAST(NULL AS STRING)
    )
  AS t(goal_id, title, target_text, number, metric, unit, goal_2030, current_2026, sort_order,
       earliest, baseline_year, baseline_total, baseline_text)
) AS s
ON t.goal_id = s.goal_id
WHEN MATCHED THEN UPDATE SET
  t.title          = s.title,
  t.target_text    = s.target_text,
  t.number         = s.number,
  t.metric         = s.metric,
  t.unit           = s.unit,
  t.goal_2030      = s.goal_2030,
  t.current_2026   = s.current_2026,
  t.sort_order     = s.sort_order,
  t.earliest       = s.earliest,
  t.baseline_year  = s.baseline_year,
  t.baseline_total = s.baseline_total,
  t.baseline_text  = s.baseline_text,
  t.last_updated   = current_timestamp(),
  t.updated_by     = 'migration:strategy_goals_v4'
WHEN NOT MATCHED THEN INSERT (
  goal_id, title, target_text, number, metric, unit, goal_2030, current_2026, sort_order,
  earliest, baseline_year, baseline_total, baseline_text, last_updated, updated_by
) VALUES (
  s.goal_id, s.title, s.target_text, s.number, s.metric, s.unit, s.goal_2030, s.current_2026, s.sort_order,
  s.earliest, s.baseline_year, s.baseline_total, s.baseline_text, current_timestamp(), 'migration:strategy_goals_v4'
);


-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- 1. Confirm baseline_text exists
SELECT column_name, data_type
FROM usp_data.information_schema.columns
WHERE table_schema = 'usp_strategy' AND table_name = 'strategy_goals'
  AND column_name IN ('baseline_year','baseline_total','baseline_text')
ORDER BY column_name;

-- 2. Expect exactly 6 rows, number and sort_order both 1-6 with no gaps or dupes
SELECT goal_id, number, sort_order, title, goal_2030, unit,
       baseline_year, baseline_total, baseline_text, chart_type
FROM usp_data.usp_strategy.strategy_goals
ORDER BY sort_order;

-- 3. Guard against duplicate numbering — expect zero rows
SELECT number, COUNT(*) AS n
FROM usp_data.usp_strategy.strategy_goals
GROUP BY number
HAVING COUNT(*) > 1;

-- 4. Goals 1, 2, and 5 changed metric or target scale, so any actuals and
--    ratings recorded against the previous framing are now suspect. Review
--    these rows before the next reporting cycle.
SELECT a.goal_id, g.number, g.title, g.metric, a.year, a.actual_value, a.source_notes
FROM usp_data.usp_strategy.strategy_goal_actuals a
JOIN usp_data.usp_strategy.strategy_goals g ON g.goal_id = a.goal_id
WHERE a.goal_id IN ('g1','g2','g4')
ORDER BY a.goal_id, a.year;

SELECT r.goal_id, g.number, g.title, r.year, r.rating, r.assessed_at
FROM usp_data.usp_strategy.goal_ratings r
JOIN usp_data.usp_strategy.strategy_goals g ON g.goal_id = r.goal_id
WHERE r.goal_id IN ('g1','g2','g4')
ORDER BY r.goal_id, r.year;

-- 5. The new goal needs a portfolio linkage — expect zero rows for g6 until
--    portfolio_goal_links is populated.
SELECT * FROM usp_data.usp_strategy.portfolio_goal_links WHERE goal_id = 'g6';
