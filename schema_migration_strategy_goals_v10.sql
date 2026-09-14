-- =============================================================================
-- USP Data & AI Strategy — Schema Migration: g2 IVO map data
-- September 2026
--
-- Follow-up to schema_migration_strategy_goals_v9.sql (DONE — do not re-edit or
-- re-run that file). The "States Requiring Independent Evaluation Prior to
-- Procurement" section is now rendered as a schematic US tile map
-- (IvoAdoptionMap in dashboard.jsx) instead of a plain text list, so the
-- states named in v9's free-text "context" paragraph need to become
-- structured data the map can plot and highlight:
--
--   1. Adds "abbr":"DE" to the existing Delaware entry in
--      chart_config.procurementStates.states (the map keys off USPS
--      abbreviations against the STATE_GRID cartogram layout).
--   2. Adds a new chart_config.procurementStates.proposals array — the four
--      states named in the national-context paragraph, each with the bill
--      number and a status the map colors by:
--        CA -> "enrolled"     (SB 813, enrolled, awaiting governor's signature)
--        VA -> "passed_study" (HB 797 / SB 384, passed — directs a study of a
--                               future IVO framework)
--        OH -> "stalled"      (HB 628, did not advance)
--        MN -> "stalled"      (HF 4544 / SF 4636, did not advance)
--   3. Trims chart_config.procurementStates.context to drop the per-state
--      specifics now shown in the map/legend, keeping only the framing
--      sentence and the federal FRONTIER Act (H.R. 9925) note.
--
-- Nothing else on g2 changes — milestones, unitLabel, verificationBodies,
-- target_text/chart_type/chart_note/goal_note are all unchanged. g1 and g3
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
-- SECTION 1: g2 — Evidence & Safety Measures that Shift the Market (chart_config only)
-- =============================================================================

UPDATE usp_data.usp_strategy.strategy_goals
SET
  chart_config = '{"milestones":[{"year":"2026","count":2},{"year":"2027","count":4},{"year":"2028","count":12},{"year":"2029","count":36},{"year":"2030","count":75}],"unitLabel":"verification bodies","verificationBodies":[{"name":"EdSAFE AI Alliance","type":"Nonprofit consortium","status":"Publishing results","notes":"Early adopter; publishes vendor scorecards quarterly."},{"name":"Digital Promise","type":"Research nonprofit","status":"Publishing results","notes":"Runs its own edtech efficacy review process."},{"name":"1EdTech Consortium","type":"Standards body","status":"Onboarding","notes":"Piloting interoperability + evaluation standards alignment."},{"name":"ISTE","type":"Professional association","status":"Onboarding","notes":"Exploring seal-of-alignment program tied to our benchmarks."},{"name":"WestEd Evaluation Lab","type":"Research org","status":"Not yet engaged","notes":"Identified as a priority target for 2027 outreach."},{"name":"Jefferson Education Exchange","type":"Research nonprofit","status":"Not yet engaged","notes":"Runs its own edtech evidence ratings; potential alignment partner."}],"procurementStates":{"current":1,"states":[{"state":"Delaware","abbr":"DE","sinceYear":"2026","notes":"Established via Delaware''s State Education Agency (SEA) through a newly created entity, the AI Assurance Lab, which requires independent verification (IVO) prior to AI tool procurement."}],"proposals":[{"abbr":"CA","state":"California","bill":"SB 813","status":"enrolled"},{"abbr":"VA","state":"Virginia","bill":"HB 797 / SB 384","status":"passed_study"},{"abbr":"OH","state":"Ohio","bill":"HB 628","status":"stalled"},{"abbr":"MN","state":"Minnesota","bill":"HF 4544 / SF 4636","status":"stalled"}],"contextAsOf":"Q3 2026","context":"IVOs are a new concept in AI governance — no state has yet enacted a full IVO framework. These proposals generally establish the infrastructure for independent AI auditing rather than themselves requiring developers or deployers to undergo an IVO audit; a separate future legal requirement would be needed to mandate use of an IVO. At the federal level, the FRONTIER Act (H.R. 9925) would create a federal IVO framework, though the bill has not yet advanced."}}',
  last_updated = current_timestamp(),
  updated_by  = 'migration:v10-g2-ivo-map'
WHERE goal_id = 'g2';


-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- 1. Confirm the update landed
SELECT goal_id, number, title, chart_type, updated_by, last_updated
FROM usp_data.usp_strategy.strategy_goals
WHERE goal_id = 'g2';

-- 2. Confirm the map data is present and correct
SELECT goal_id,
       get_json_object(chart_config, '$.procurementStates.states[0].abbr')      AS delaware_abbr,
       get_json_object(chart_config, '$.procurementStates.proposals[0].abbr')   AS proposal_1_abbr,
       get_json_object(chart_config, '$.procurementStates.proposals[0].status') AS proposal_1_status,
       size(from_json(chart_config, 'struct<procurementStates:struct<proposals:array<string>>>').procurementStates.proposals) AS proposals_count
FROM usp_data.usp_strategy.strategy_goals
WHERE goal_id = 'g2';
-- Expect: delaware_abbr='DE', proposal_1_abbr='CA', proposal_1_status='enrolled',
--         proposals_count=4.

-- 3. Confirm g1 and g3 were NOT touched by this migration
SELECT goal_id, number, title, updated_by, last_updated
FROM usp_data.usp_strategy.strategy_goals
WHERE goal_id IN ('g1','g3')
ORDER BY number;
