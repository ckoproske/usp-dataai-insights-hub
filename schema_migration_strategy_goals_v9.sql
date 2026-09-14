-- =============================================================================
-- USP Data & AI Strategy — Schema Migration: g2 procurement-state correction
-- September 2026
--
-- Follow-up to schema_migration_strategy_goals_v7.sql / v8.sql (both DONE — do
-- not re-edit or re-run those files). This migration updates g2's
-- chart_config.procurementStates:
--   1. The placeholder "Texas" row (invented pending the real answer) is
--      corrected to the actual state — Delaware, whose requirement was
--      established via their State Education Agency (SEA) through a newly
--      created entity, the AI Assurance Lab, mandating independent
--      verification (IVO) prior to AI tool procurement.
--   2. Adds a new "context" field (+ "contextAsOf":"Q3 2026") giving the
--      broader national IVO legislative picture, so it's clear Delaware's
--      education-procurement mandate is a distinct, narrower thing from the
--      general (still nascent) state/federal IVO framework landscape: no
--      state has enacted a full IVO framework yet; CA (SB 813, enrolled,
--      awaiting governor's signature), VA (HB 797/SB 384, passed — directs a
--      study of a future framework), OH (HB 628) and MN (HF 4544/SF 4636,
--      neither advanced) all have proposals; federal FRONTIER Act (H.R. 9925)
--      has not advanced either.
--
-- Nothing else on g2 changes — milestones, unitLabel, verificationBodies,
-- target_text/chart_type/chart_note/goal_note are all unchanged from v7.
-- g1 and g3 are NOT touched by this migration.
--
-- This migration is NOT executed as part of this change — no Databricks
-- credentials are available in this environment. Run it manually in the
-- Databricks SQL Editor once reviewed.
--
-- Run in: Databricks SQL Editor (usp_data catalog, usp_strategy schema)
-- Run manually — not executed as part of this change.
-- =============================================================================


-- =============================================================================
-- SECTION 1: g2 — Evidence & Safety Measures that Shift the Market (chart_config only)
-- =============================================================================

UPDATE usp_data.usp_strategy.strategy_goals
SET
  chart_config = '{"milestones":[{"year":"2026","count":2},{"year":"2027","count":4},{"year":"2028","count":12},{"year":"2029","count":36},{"year":"2030","count":75}],"unitLabel":"verification bodies","verificationBodies":[{"name":"EdSAFE AI Alliance","type":"Nonprofit consortium","status":"Publishing results","notes":"Early adopter; publishes vendor scorecards quarterly."},{"name":"Digital Promise","type":"Research nonprofit","status":"Publishing results","notes":"Runs its own edtech efficacy review process."},{"name":"1EdTech Consortium","type":"Standards body","status":"Onboarding","notes":"Piloting interoperability + evaluation standards alignment."},{"name":"ISTE","type":"Professional association","status":"Onboarding","notes":"Exploring seal-of-alignment program tied to our benchmarks."},{"name":"WestEd Evaluation Lab","type":"Research org","status":"Not yet engaged","notes":"Identified as a priority target for 2027 outreach."},{"name":"Jefferson Education Exchange","type":"Research nonprofit","status":"Not yet engaged","notes":"Runs its own edtech evidence ratings; potential alignment partner."}],"procurementStates":{"current":1,"states":[{"state":"Delaware","sinceYear":"2026","notes":"Established via Delaware''s State Education Agency (SEA) through a newly created entity, the AI Assurance Lab, which requires independent verification (IVO) prior to AI tool procurement."}],"contextAsOf":"Q3 2026","context":"IVOs are a new concept in AI governance, and no state has yet enacted a full IVO framework. Four proposals were introduced in California (SB 813), Virginia (HB 797/SB 384), Ohio (HB 628), and Minnesota (HF 4544/SF 4636). This year, Virginia passed its bill, which directs the state to study a future IVO framework, while the Ohio and Minnesota bills did not advance. California''s SB 813, which was enrolled and awaits signature by the Governor, would create professional audit standards and an IVO designation for qualified AI auditors. Importantly, these proposals generally establish the infrastructure for independent AI auditing rather than themselves requiring developers or deployers to undergo an IVO audit; a separate future legal requirement would be needed to mandate use of an IVO. At the federal level, the FRONTIER Act (H.R. 9925) would create a federal IVO framework, though the bill has not yet advanced."}}',
  last_updated = current_timestamp(),
  updated_by  = 'migration:v9-g2-procurement-state'
WHERE goal_id = 'g2';


-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- 1. Confirm the update landed
SELECT goal_id, number, title, chart_type, updated_by, last_updated
FROM usp_data.usp_strategy.strategy_goals
WHERE goal_id = 'g2';

-- 2. Confirm chart_config parses as valid JSON and the state name landed correctly
SELECT goal_id,
       get_json_object(chart_config, '$.procurementStates.current')            AS states_current,
       get_json_object(chart_config, '$.procurementStates.states[0].state')     AS state_name,
       get_json_object(chart_config, '$.procurementStates.states[0].sinceYear') AS since_year,
       get_json_object(chart_config, '$.procurementStates.states[0].notes')     AS notes,
       get_json_object(chart_config, '$.procurementStates.contextAsOf')         AS context_as_of,
       get_json_object(chart_config, '$.procurementStates.context') IS NOT NULL AS has_context
FROM usp_data.usp_strategy.strategy_goals
WHERE goal_id = 'g2';
-- Expect: states_current='1', state_name='Delaware', context_as_of='Q3 2026',
--         has_context=true.

-- 3. Confirm g1 and g3 were NOT touched by this migration
SELECT goal_id, number, title, updated_by, last_updated
FROM usp_data.usp_strategy.strategy_goals
WHERE goal_id IN ('g1','g3')
ORDER BY number;
