-- =============================================================================
-- USP Data & AI Strategy — Schema Migration: Strategy Goals content + chart data
-- July 2026
--
-- Root cause: the "Strategy 2030 Goals" section of the dashboard is 100%
-- hardcoded in the STRATEGY_GOALS constant in dashboard.jsx — title, target
-- text, metrics, and all goal-specific chart data (grouped bars, momentum
-- points, leverage breakdowns). strategy_goals exists but only has 9 sparse
-- columns and is currently empty, so /api/goals returns [] today.
--
-- This migration:
--   1. Adds the missing columns (including a chart_config JSON column that
--      holds the chart-type-specific shape — groupedData/rightBreakout,
--      momentumPoints, or leverageData/leverageTotals).
--   2. Seeds the 5 goal rows with the exact literal values currently in
--      dashboard.jsx STRATEGY_GOALS (lines 104-205), so the DB round-trip
--      reproduces the dashboard pixel-for-pixel before any edits are made.
--
-- Safe to re-run: MERGE ON MATCHED/NOT MATCHED keeps this idempotent.
-- Run in: Databricks SQL Editor (usp_data catalog, usp_strategy schema)
-- =============================================================================


-- =============================================================================
-- SECTION 1: ALTER TABLE — new columns
-- =============================================================================

ALTER TABLE usp_data.usp_strategy.strategy_goals
ADD COLUMNS (
  earliest       STRING  COMMENT 'e.g. "Q1 2026 — Annual Update in PR"',
  source         STRING,
  update_freq    STRING,
  chart_type     STRING  COMMENT 'bar-grouped | momentum-points | stacked-bar-leverage | null',
  chart_note     STRING,
  goal_note      STRING,
  note           STRING,
  baseline_year  STRING,
  baseline_total DOUBLE,
  chart_config   STRING  COMMENT 'JSON — shape depends on chart_type: groupedData/rightBreakout, momentumPoints, or leverageData/leverageTotals',
  last_updated   TIMESTAMP,
  updated_by     STRING
);


-- =============================================================================
-- SECTION 2: Seed the 5 goals (literal values from dashboard.jsx STRATEGY_GOALS)
-- =============================================================================

MERGE INTO usp_data.usp_strategy.strategy_goals AS t
USING (
  SELECT * FROM VALUES
    (
      'g1', 'Enable AI Solutions',
      '40% of learners reached by solutions embedding portable memory and context',
      1, '% of students in K-12 and PS', '%', 40.0, 12.0, 1,
      'Q1 2026 — Annual Update in PR', '', 'Annual',
      'bar-grouped',
      '% of students in K-12 and PS reached, by solution type. ''All Learners'' reflects share of the 40% goal reached. Early directional estimates.',
      'By 2030, 40% of all learners are reached. Within that, 60% via Instruction + Tutoring and 23% via Advising + Navigation. Breakdown estimates show how those solution-type shares further split by capability.',
      CAST(NULL AS STRING),
      '2025', 0.0,
      '{"groupedData":[{"year":"2028","instruction":65,"advising":21,"allLearners":28},{"year":"2030","instruction":60,"advising":23,"allLearners":40}],"rightBreakout":{"advising":{"pct":23,"rows":[{"label":"Context Only","val":24},{"label":"Memory Only","val":14},{"label":"Both","val":8},{"label":"Not Covered","val":55}]},"instruction":{"pct":17,"rows":[{"label":"Context Only","val":26},{"label":"Memory Only","val":15},{"label":"Both","val":9},{"label":"Not Covered","val":50}]}}}'
    ),
    (
      'g2', 'Build Trusted Evidence in Education',
      '50% of learners reached by solutions that have adopted evidence-based benchmarks and evaluation technology that improve safety and quality',
      2, '% of students in K-12 and PS', '%', 50.0, 15.0, 2,
      'Q1 2026 — Annual Update in PR', '', 'Annual',
      'bar-grouped',
      '% of students in K-12 and PS reached, by solution type. ''All Learners'' reflects share of the 50% goal reached. Early directional estimates.',
      'By 2030, 50% of all learners are reached. Within that, 50% via Instruction + Tutoring and 30% via Advising + Navigation. Breakdown estimates show how those solution-type shares further split by capability.',
      CAST(NULL AS STRING),
      '2025', 0.0,
      '{"groupedData":[{"year":"2028","instruction":60,"advising":27,"allLearners":30},{"year":"2030","instruction":50,"advising":30,"allLearners":50}],"rightBreakout":{"advising":{"pct":30,"rows":[{"label":"Eval Tech + Efficacy","val":10},{"label":"Guardrails + Safety","val":20},{"label":"Both","val":6},{"label":"Not Covered","val":64}]},"instruction":{"pct":20,"rows":[{"label":"Eval Tech + Efficacy","val":20},{"label":"Guardrails + Safety","val":15},{"label":"Both","val":4},{"label":"Not Covered","val":61}]}}}'
    ),
    (
      'g3', 'Data-Informed Decision Making',
      '% of district and PS data decision makers report using better, higher-quality data to support learning and advising',
      3, '% decision makers', '%', 70.0, 28.0, 3,
      'Q4 2025 — Annual Update in PR', CAST(NULL AS STRING), CAST(NULL AS STRING),
      CAST(NULL AS STRING), CAST(NULL AS STRING), CAST(NULL AS STRING),
      CAST(NULL AS STRING),
      CAST(NULL AS STRING), CAST(NULL AS DOUBLE),
      CAST(NULL AS STRING)
    ),
    (
      'g4', 'Comprehensive EW Momentum Measurement',
      '% of state and district systems able to measure progress across all 5 E-W Momentum Points for learners',
      4, '% of systems measuring all 5 points', '%', 70.0, 18.0, 4,
      'Q1 2026 — Annual Update in PR', CAST(NULL AS STRING), CAST(NULL AS STRING),
      'momentum-points',
      'Share of state/district systems able to measure each E-W Momentum Point',
      CAST(NULL AS STRING),
      CAST(NULL AS STRING),
      CAST(NULL AS STRING), CAST(NULL AS DOUBLE),
      '{"momentumPoints":[{"label":"Passed Algebra by 9th Grade","short":"Algebra by 9th","current":42,"target2030":85},{"label":"Completed Gateway Courses","short":"Gateway Courses","current":35,"target2030":80},{"label":"Enrolled Immediately in PS","short":"Immediate PS Enroll","current":28,"target2030":75},{"label":"Applied Recognized Learning to Credential Pathway","short":"Recognized Learning","current":12,"target2030":65},{"label":"Earned a Credential of Value","short":"Credential of Value","current":22,"target2030":72},{"label":"All 5 Points (Composite)","short":"All 5 (Composite)","current":18,"target2030":70}]}'
    ),
    (
      'g5', 'Amplify Coordination and Impact',
      '2-3x ($415-540M) leverage on USP Data investment through key partnerships.',
      5, 'Investment leverage', 'x', 3.0, 1.1, 5,
      'Q4 2025 — Annual Update in PR', CAST(NULL AS STRING), CAST(NULL AS STRING),
      'stacked-bar-leverage',
      'Estimated investment leverage ($M) by partner type across time periods',
      CAST(NULL AS STRING),
      'Data for this goal will eventually automatically pull and refresh based on our new CRM tool within INVEST.',
      CAST(NULL AS STRING), CAST(NULL AS DOUBLE),
      '{"leverageData":[{"period":"2021–2025","label":"Historical","philanthropic":30,"hyperscalers":15,"vcImpact":10,"public":20},{"period":"2026–2030\\nTarget","label":"Target","philanthropic":190,"hyperscalers":120,"vcImpact":75,"public":30},{"period":"2026–2030\\nStretch","label":"Stretch","philanthropic":250,"hyperscalers":170,"vcImpact":90,"public":30}],"leverageTotals":{"target":"~$415M","stretch":"~$540M"}}'
    )
  AS t(goal_id, title, target_text, number, metric, unit, goal_2030, current_2026, sort_order,
       earliest, source, update_freq, chart_type, chart_note, goal_note, note,
       baseline_year, baseline_total, chart_config)
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
  t.source         = s.source,
  t.update_freq    = s.update_freq,
  t.chart_type     = s.chart_type,
  t.chart_note     = s.chart_note,
  t.goal_note      = s.goal_note,
  t.note           = s.note,
  t.baseline_year  = s.baseline_year,
  t.baseline_total = s.baseline_total,
  t.chart_config   = s.chart_config,
  t.last_updated   = current_timestamp(),
  t.updated_by     = 'migration:strategy_goals_v2'
WHEN NOT MATCHED THEN INSERT (
  goal_id, title, target_text, number, metric, unit, goal_2030, current_2026, sort_order,
  earliest, source, update_freq, chart_type, chart_note, goal_note, note,
  baseline_year, baseline_total, chart_config, last_updated, updated_by
) VALUES (
  s.goal_id, s.title, s.target_text, s.number, s.metric, s.unit, s.goal_2030, s.current_2026, s.sort_order,
  s.earliest, s.source, s.update_freq, s.chart_type, s.chart_note, s.goal_note, s.note,
  s.baseline_year, s.baseline_total, s.chart_config, current_timestamp(), 'migration:strategy_goals_v2'
);


-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- 1. Confirm new columns exist
SELECT column_name, data_type
FROM usp_data.information_schema.columns
WHERE table_schema = 'usp_strategy' AND table_name = 'strategy_goals'
  AND column_name IN ('earliest','source','update_freq','chart_type','chart_note',
                       'goal_note','note','baseline_year','baseline_total','chart_config',
                       'last_updated','updated_by')
ORDER BY column_name;

-- 2. Expect exactly 5 rows, sort_order 1-5
SELECT goal_id, number, title, chart_type, sort_order
FROM usp_data.usp_strategy.strategy_goals
ORDER BY sort_order;

-- 3. Spot-check chart_config JSON is present where expected (g1,g2,g4,g5) and null for g3
SELECT goal_id, chart_type, LEFT(chart_config, 60) AS chart_config_preview
FROM usp_data.usp_strategy.strategy_goals
ORDER BY sort_order;
