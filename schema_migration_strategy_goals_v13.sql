-- =============================================================================
-- USP Data & AI Strategy — Schema Migration: g5 Sector/Context Metrics
-- September 2026
--
-- Follow-up to schema_migration_strategy_goals_v7.sql (DONE — do not re-edit
-- or re-run that file). g5 ("Comprehensive EW Momentum Measurement") already
-- had a "momentum-points" chart (horizontal bars + US heatmap, chart_config
-- momentumPoints[], unchanged by this migration). This migration:
--
--   1. Updates target_text from "...within 6 months to all 5 E-W Momentum
--      Points" to "...within six months to at least two E-W Momentum
--      Points" (the 2030 target threshold is "at least two" points, not
--      "all 5" — "all 5" is actually the 2045 Ambition target, now captured
--      separately in sectorContext.ambConnection below). Sets bold_stat to
--      "40%" (a valid leading substring of the new target_text).
--   2. Adds chart_config.sectorContext — a new "Sector / Context Metrics" box
--      rendered IN ADDITION to (below) the existing bar chart + US heatmap,
--      not replacing them:
--        - headerNote/intro/detail: framing copy ("Reported does not mean
--          reached" — reporting and access on E-W Momentum Points move at
--          different rates)
--        - points[]: per-momentum-point comparison of % of states reporting
--          data vs. % of field leaders with access to it (a reporting/access
--          gap dumbbell chart). "Learning Applied" has no states-reporting
--          data yet (statesReportingN: null); "ALL" (composite) uses a
--          display override "≤ 5%" matching the existing baseline_text
--          convention for qualified/rounded values.
--        - k12CoveragePct / psCoveragePct: % of K12 / postsecondary students
--          covered by states with ALL momentum points (11.6% / 10.6%).
--        - waitTimeMonths: current cross-sector data wait time for district
--          leaders (16 months).
--        - ambConnection: ties this goal to Ambition 2045 (10M learners to a
--          credential of value; 2045 target of 45% access to all 5 points).
--
-- Nothing else on g5 changes — momentumPoints, chart_type, chart_note,
-- baseline_year/baseline_total/baseline_text are all unchanged. g1-g4 and g6
-- are NOT touched by this migration.
--
-- This migration is NOT executed as part of this change — no Databricks
-- credentials are available in this environment. Run it manually in the
-- Databricks SQL Editor once reviewed.
--
-- Run in: Databricks SQL Editor (usp_data catalog, usp_strategy schema)
-- Run manually — not executed as part of this change.
-- =============================================================================


-- =============================================================================
-- SECTION 1: g5 — Comprehensive EW Momentum Measurement
-- =============================================================================

UPDATE usp_data.usp_strategy.strategy_goals
SET
  target_text = '40% of field leaders have comprehensive data access within six months to at least two E-W Momentum Points',
  bold_stat   = '40%',
  chart_config = '{"momentumPoints":[{"label":"Passed Algebra by 9th Grade","short":"Algebra by 9th","current":42,"target2030":85},{"label":"Completed Gateway Courses","short":"Gateway Courses","current":35,"target2030":80},{"label":"Enrolled Immediately in PS","short":"Immediate PS Enroll","current":28,"target2030":75},{"label":"Applied Recognized Learning to Credential Pathway","short":"Recognized Learning","current":12,"target2030":65},{"label":"Earned a Credential of Value","short":"Credential of Value","current":22,"target2030":72},{"label":"All 5 Points (Composite)","short":"All 5 (Composite)","current":18,"target2030":70}],"sectorContext":{"headerNote":"Reported does not mean reached","intro":"Reporting and access don''t move together — work is needed on both availability and access.","detail":"Cross-sector data access for K12 and PS leaders lags behind state reporting, but Algebra by 9th grade only requires within-school data, making it easier for leaders to access and use.","points":[{"short":"Algebra by 9th","statesReportingN":10,"statesReportingTotal":51,"leadersAccessPct":51},{"short":"Gateway Courses","statesReportingN":22,"statesReportingTotal":51,"leadersAccessPct":25},{"short":"PS Enrollment","statesReportingN":49,"statesReportingTotal":51,"leadersAccessPct":27},{"short":"Learning Applied","statesReportingN":null,"statesReportingTotal":51,"leadersAccessPct":27},{"short":"Credential Earned","statesReportingN":42,"statesReportingTotal":51,"leadersAccessPct":36},{"short":"ALL","statesReportingN":7,"statesReportingTotal":51,"leadersAccessPct":5,"leadersAccessDisplay":"≤ 5%"}],"k12CoveragePct":11.6,"psCoveragePct":10.6,"waitTimeMonths":16,"ambConnection":"Supporting 10M learners to a credential of value depends on decision-makers having comprehensive and actionable access to data at every momentum point along the way. By 2045, 45% of field leaders have comprehensive data access within 6 months to all 5 E-W Momentum Points."}}',
  last_updated = current_timestamp(),
  updated_by  = 'migration:v13-g5-sector-context'
WHERE goal_id = 'g5';


-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- 1. Confirm the update landed
SELECT goal_id, number, title, target_text, bold_stat, chart_type, updated_by, last_updated
FROM usp_data.usp_strategy.strategy_goals
WHERE goal_id = 'g5';

-- 2. Confirm chart_config parses as valid JSON and both momentumPoints and
--    sectorContext survived
SELECT goal_id,
       size(from_json(chart_config, 'struct<momentumPoints:array<string>>').momentumPoints) AS momentum_points_count,
       size(from_json(chart_config, 'struct<sectorContext:struct<points:array<string>>>').sectorContext.points) AS sector_context_points_count,
       get_json_object(chart_config, '$.sectorContext.k12CoveragePct') AS k12_pct,
       get_json_object(chart_config, '$.sectorContext.waitTimeMonths') AS wait_months
FROM usp_data.usp_strategy.strategy_goals
WHERE goal_id = 'g5';
-- Expect: momentum_points_count=6, sector_context_points_count=6, k12_pct='11.6',
--         wait_months='16'.

-- 3. Confirm g1-g4 and g6 were NOT touched by this migration
SELECT goal_id, number, title, updated_by, last_updated
FROM usp_data.usp_strategy.strategy_goals
WHERE goal_id IN ('g1','g2','g3','g4','g6')
ORDER BY number;
