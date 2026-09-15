-- =============================================================================
-- USP Data & AI Strategy — Schema Migration: g5 state-level reporting detail
-- September 2026
--
-- Follow-up to schema_migration_strategy_goals_v13.sql (DONE — do not re-edit
-- or re-run that file). Adds state-by-state detail to g5's sectorContext
-- points, so each momentum point's "States Reporting" figure can expand to
-- show which states report it and how many K-12 students they represent:
--
--   1. Corrects two statesReportingN values that didn't match the confirmed
--      state lists: PS Enrollment 49 -> 47, Credential Earned 42 -> 43.
--      "Learning Applied" stays at statesReportingN: null — no state list
--      exists for it yet ("Need state list", per the source summary).
--   2. Adds points[].reportingStates[]{state,k12Enrollment} and
--      points[].k12EnrollmentTotal for the 4 points with confirmed lists:
--      Algebra by 9th (10 states, 9,547,459), Gateway Courses (22 states,
--      21,804,724), PS Enrollment (47 states/DC, 46,200,504), Credential
--      Earned (43 states/DC, 40,636,225). "ALL" (composite) and "Learning
--      Applied" are NOT given reportingStates — no confirmed list for either.
--
-- IMPORTANT — the k12Enrollment figures are K-12 total enrollment for each
-- reporting state, NOT postsecondary enrollment. This applies even to the
-- "PS Enrollment" momentum point: the 47-state list is confirmed (states
-- that report the PS Enrollment momentum point), but true PS-enrollment-by-
-- state figures are not yet available. The dashboard.jsx render code already
-- reflects this — it labels the expanded detail "K-12 Enrollment in
-- Reporting States" and appends "(PS enrollment by state pending)" whenever
-- no reportingStates entry has a psEnrollment value (true for all 4 points
-- today). A future migration can add a "psEnrollment" field per state once
-- that data exists — no frontend code change will be needed for it.
--
-- Nothing else on g5 changes — momentumPoints (labels/current/target2030),
-- target_text, bold_stat, chart_type, chart_note, baseline_year/
-- baseline_total/baseline_text, headerNote/intro/detail/k12CoveragePct/
-- psCoveragePct/waitTimeMonths/ambConnection are all unchanged from v13.
-- g1-g4 and g6 are NOT touched by this migration.
--
-- The chart_config literal below was generated programmatically from the
-- exact JS object literal in dashboard.jsx's STRATEGY_GOALS fallback (g5),
-- via JSON.stringify, so it is guaranteed to match the fallback exactly and
-- to be valid JSON. It contains one apostrophe (in "don't", inside
-- sectorContext.intro) which is escaped as '' per SQL string-literal rules;
-- it contains NO backslashes, so the backslash-escaping pitfall from v12
-- does not apply here.
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
  chart_config = '{"momentumPoints":[{"label":"Passed Algebra by 9th Grade","short":"Algebra by 9th","current":42,"target2030":85},{"label":"Completed Gateway Courses","short":"Gateway Courses","current":35,"target2030":80},{"label":"Enrolled Immediately in PS","short":"Immediate PS Enroll","current":28,"target2030":75},{"label":"Applied Recognized Learning to Credential Pathway","short":"Recognized Learning","current":12,"target2030":65},{"label":"Earned a Credential of Value","short":"Credential of Value","current":22,"target2030":72},{"label":"All 5 Points (Composite)","short":"All 5 (Composite)","current":18,"target2030":70}],"sectorContext":{"headerNote":"Reported does not mean reached","intro":"Reporting and access don''t move together — work is needed on both availability and access.","detail":"Cross-sector data access for K12 and PS leaders lags behind state reporting, but Algebra by 9th grade only requires within-school data, making it easier for leaders to access and use.","points":[{"short":"Algebra by 9th","statesReportingN":10,"statesReportingTotal":51,"leadersAccessPct":51,"k12EnrollmentTotal":9547459,"reportingStates":[{"state":"Connecticut","k12Enrollment":494937},{"state":"Florida","k12Enrollment":2871192},{"state":"Idaho","k12Enrollment":316265},{"state":"Mississippi","k12Enrollment":436523},{"state":"North Carolina","k12Enrollment":1544289},{"state":"Ohio","k12Enrollment":1674543},{"state":"Oregon","k12Enrollment":538452},{"state":"South Carolina","k12Enrollment":793760},{"state":"Hawaii","k12Enrollment":169308},{"state":"Louisiana","k12Enrollment":708190}]},{"short":"Gateway Courses","statesReportingN":22,"statesReportingTotal":51,"leadersAccessPct":25,"k12EnrollmentTotal":21804724,"reportingStates":[{"state":"Alabama","k12Enrollment":748650},{"state":"Alaska","k12Enrollment":131243},{"state":"Arizona","k12Enrollment":1117053},{"state":"Arkansas","k12Enrollment":485019},{"state":"Colorado","k12Enrollment":865205},{"state":"Connecticut","k12Enrollment":494937},{"state":"Idaho","k12Enrollment":316265},{"state":"Indiana","k12Enrollment":1032536},{"state":"Louisiana","k12Enrollment":708190},{"state":"Michigan","k12Enrollment":1377459},{"state":"New York","k12Enrollment":2509617},{"state":"North Carolina","k12Enrollment":1544289},{"state":"Ohio","k12Enrollment":1674543},{"state":"Tennessee","k12Enrollment":1003492},{"state":"Utah","k12Enrollment":689791},{"state":"Wisconsin","k12Enrollment":813869},{"state":"Wyoming","k12Enrollment":91036},{"state":"Washington","k12Enrollment":1089309},{"state":"Missouri","k12Enrollment":891248},{"state":"Florida","k12Enrollment":2871192},{"state":"Massachusetts","k12Enrollment":913258},{"state":"Mississippi","k12Enrollment":436523}]},{"short":"PS Enrollment","statesReportingN":47,"statesReportingTotal":51,"leadersAccessPct":27,"k12EnrollmentTotal":46200504,"reportingStates":[{"state":"Alabama","k12Enrollment":748650},{"state":"Connecticut","k12Enrollment":494937},{"state":"DC","k12Enrollment":92579},{"state":"Florida","k12Enrollment":2871192},{"state":"Georgia","k12Enrollment":1749701},{"state":"Illinois","k12Enrollment":1845607},{"state":"Indiana","k12Enrollment":1032536},{"state":"Kentucky","k12Enrollment":656407},{"state":"Maine","k12Enrollment":167702},{"state":"Maryland","k12Enrollment":889531},{"state":"Massachusetts","k12Enrollment":913258},{"state":"Michigan","k12Enrollment":1377459},{"state":"Minnesota","k12Enrollment":869967},{"state":"Nebraska","k12Enrollment":329162},{"state":"New Hampshire","k12Enrollment":165404},{"state":"North Carolina","k12Enrollment":1544289},{"state":"North Dakota","k12Enrollment":118895},{"state":"Ohio","k12Enrollment":1674543},{"state":"Oregon","k12Enrollment":538452},{"state":"Pennsylvania","k12Enrollment":1669364},{"state":"Rhode Island","k12Enrollment":133254},{"state":"South Dakota","k12Enrollment":141022},{"state":"Utah","k12Enrollment":689791},{"state":"West Virginia","k12Enrollment":245837},{"state":"California","k12Enrollment":5818042},{"state":"Alaska","k12Enrollment":131243},{"state":"Arizona","k12Enrollment":1117053},{"state":"Arkansas","k12Enrollment":485019},{"state":"Colorado","k12Enrollment":865205},{"state":"Delaware","k12Enrollment":141842},{"state":"Hawaii","k12Enrollment":169308},{"state":"Idaho","k12Enrollment":316265},{"state":"Iowa","k12Enrollment":501416},{"state":"Kansas","k12Enrollment":479468},{"state":"Louisiana","k12Enrollment":708190},{"state":"Mississippi","k12Enrollment":436523},{"state":"Montana","k12Enrollment":148895},{"state":"Nevada","k12Enrollment":484358},{"state":"New Jersey","k12Enrollment":1356496},{"state":"Oklahoma","k12Enrollment":698594},{"state":"South Carolina","k12Enrollment":793760},{"state":"Tennessee","k12Enrollment":1003492},{"state":"Virginia","k12Enrollment":1258852},{"state":"Wisconsin","k12Enrollment":813869},{"state":"Texas","k12Enrollment":5532518},{"state":"Washington","k12Enrollment":1089309},{"state":"Missouri","k12Enrollment":891248}]},{"short":"Learning Applied","statesReportingN":null,"statesReportingTotal":51,"leadersAccessPct":27},{"short":"Credential Earned","statesReportingN":43,"statesReportingTotal":51,"leadersAccessPct":36,"k12EnrollmentTotal":40636225,"reportingStates":[{"state":"Alabama","k12Enrollment":748650},{"state":"Alaska","k12Enrollment":131243},{"state":"Arizona","k12Enrollment":1117053},{"state":"Colorado","k12Enrollment":865205},{"state":"Connecticut","k12Enrollment":494937},{"state":"DC","k12Enrollment":92579},{"state":"Idaho","k12Enrollment":316265},{"state":"Louisiana","k12Enrollment":708190},{"state":"Maine","k12Enrollment":167702},{"state":"Massachusetts","k12Enrollment":913258},{"state":"Mississippi","k12Enrollment":436523},{"state":"Nevada","k12Enrollment":484358},{"state":"New Hampshire","k12Enrollment":165404},{"state":"New Jersey","k12Enrollment":1356496},{"state":"New Mexico","k12Enrollment":309955},{"state":"New York","k12Enrollment":2509617},{"state":"North Carolina","k12Enrollment":1544289},{"state":"North Dakota","k12Enrollment":118895},{"state":"Ohio","k12Enrollment":1674543},{"state":"Oklahoma","k12Enrollment":698594},{"state":"Oregon","k12Enrollment":538452},{"state":"Rhode Island","k12Enrollment":133254},{"state":"South Dakota","k12Enrollment":141022},{"state":"Vermont","k12Enrollment":78828},{"state":"Virginia","k12Enrollment":1258852},{"state":"Wisconsin","k12Enrollment":813869},{"state":"Wyoming","k12Enrollment":91036},{"state":"Washington","k12Enrollment":1089309},{"state":"California","k12Enrollment":5818042},{"state":"Missouri","k12Enrollment":891248},{"state":"Georgia","k12Enrollment":1749701},{"state":"Indiana","k12Enrollment":1032536},{"state":"Kansas","k12Enrollment":479468},{"state":"Kentucky","k12Enrollment":656407},{"state":"Maryland","k12Enrollment":889531},{"state":"Michigan","k12Enrollment":1377459},{"state":"Montana","k12Enrollment":148895},{"state":"Nebraska","k12Enrollment":329162},{"state":"South Carolina","k12Enrollment":793760},{"state":"Tennessee","k12Enrollment":1003492},{"state":"Utah","k12Enrollment":689791},{"state":"West Virginia","k12Enrollment":245837},{"state":"Texas","k12Enrollment":5532518}]},{"short":"ALL","statesReportingN":7,"statesReportingTotal":51,"leadersAccessPct":5,"leadersAccessDisplay":"≤ 5%"}],"k12CoveragePct":11.6,"psCoveragePct":10.6,"waitTimeMonths":16,"ambConnection":"Supporting 10M learners to a credential of value depends on decision-makers having comprehensive and actionable access to data at every momentum point along the way. By 2045, 45% of field leaders have comprehensive data access within 6 months to all 5 E-W Momentum Points."}}',
  last_updated = current_timestamp(),
  updated_by  = 'migration:v15-g5-state-detail'
WHERE goal_id = 'g5';


-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- 1. Confirm the update landed
SELECT goal_id, number, title, chart_type, updated_by, last_updated
FROM usp_data.usp_strategy.strategy_goals
WHERE goal_id = 'g5';

-- 2. Confirm chart_config parses as valid JSON, corrected N counts, and
--    reportingStates lengths/totals match the confirmed lists
SELECT goal_id,
       get_json_object(chart_config, '$.sectorContext.points[2].statesReportingN') AS ps_enroll_n,
       get_json_object(chart_config, '$.sectorContext.points[4].statesReportingN') AS credential_n,
       get_json_object(chart_config, '$.sectorContext.points[0].k12EnrollmentTotal') AS algebra_total,
       get_json_object(chart_config, '$.sectorContext.points[2].k12EnrollmentTotal') AS ps_enroll_total,
       get_json_object(chart_config, '$.sectorContext.points[4].k12EnrollmentTotal') AS credential_total,
       get_json_object(chart_config, '$.sectorContext.points[3].reportingStates') AS learning_applied_states_should_be_null
FROM usp_data.usp_strategy.strategy_goals
WHERE goal_id = 'g5';
-- Expect: ps_enroll_n='47', credential_n='43', algebra_total='9547459',
--         ps_enroll_total='46200504', credential_total='40636225',
--         learning_applied_states_should_be_null=NULL.

-- 3. Spot-check individual state entries parse correctly
SELECT goal_id,
       get_json_object(chart_config, '$.sectorContext.points[0].reportingStates[0].state')         AS algebra_state_1,
       get_json_object(chart_config, '$.sectorContext.points[0].reportingStates[0].k12Enrollment') AS algebra_state_1_enrollment,
       get_json_object(chart_config, '$.sectorContext.points[2].reportingStates[46].state')        AS ps_enroll_state_47
FROM usp_data.usp_strategy.strategy_goals
WHERE goal_id = 'g5';
-- Expect: algebra_state_1='Connecticut', algebra_state_1_enrollment='494937',
--         ps_enroll_state_47='Missouri' (the 47th/last entry in that list).

-- 4. Confirm g1-g4 and g6 were NOT touched by this migration
SELECT goal_id, number, title, updated_by, last_updated
FROM usp_data.usp_strategy.strategy_goals
WHERE goal_id IN ('g1','g2','g3','g4','g6')
ORDER BY number;
