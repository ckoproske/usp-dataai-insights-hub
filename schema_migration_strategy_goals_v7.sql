-- =============================================================================
-- USP Data & AI Strategy — Schema Migration: Chart refresh for Goals 1, 2, 3
-- September 2026
--
-- This is the "separate chart refresh" that schema_migration_strategy_goals_v4.sql
-- flagged as pending: v4's comment explicitly noted that g1's and g2's
-- chart_config/goal_note still described the OLD "% of learners reached"
-- framing, and were being left stale on purpose until this refresh landed.
-- Goal 3 (g3) previously had no chart at all (chart_type NULL).
--
-- Changes in this migration:
--   1. New wording for target_text on g1, g2, g3 (see below). Titles are
--      unchanged.
--   2. New bold_stat for g1 ("50%") and g2 ("75%") — both are valid leading
--      substrings of their new target_text. g3's bold_stat is set to NULL:
--      its new target_text starts with "Within each solution space...", not
--      with "40%", so per the schema.dbml constraint ("bold_stat must be a
--      leading substring of target_text") it must not carry a bold_stat.
--   3. Three new chart_type values (also documented in schema.dbml's
--      chart_type column note):
--        g1 -> 'benchmark-speed-comparison'  (two-line time series; illustrative
--               mock data showing solutions using public goods closing the
--               benchmark-performance gap ~2x faster than those that don't)
--        g2 -> 'adoption-progress'           (cumulative adoption milestones by
--               year; mirrors the real vendor-adoption targets already
--               documented for the Develop AI Evaluation Infrastructure BOW)
--        g3 -> 'threshold-bars'              (per-solution-space bars against a
--               40% reference threshold; illustrative mock baseline)
--   4. chart_note and goal_note updated to match the new chart_type/chart_config
--      for all three goals.
--   5. g1's chart_config additionally carries adoptionPct (current/target2030/
--      trend — illustrative mock stat + sparkline for "% of PST solutions that
--      embed our public infrastructure"), solutions (the full PST solutions
--      list with embedsPublicGoods/benchmarkScore/detail), and keyBenchmarks
--      (static reference list of the benchmarks named in the solutions'
--      details). g2's chart_config additionally carries verificationBodies
--      (the full universe of independent verification bodies with
--      type/status/notes) and procurementStates (current/states — a
--      live-tracked count of states requiring independent evaluation prior
--      to procurement, NOT illustrative/mock data). These were merged into
--      the existing g1/g2 UPDATE statements below rather than added as a
--      separate v8 migration, since v7 has not been executed yet.
--
-- Goal numbering is stable going into this migration (confirmed via
-- schema_migration_strategy_goals_v5.sql, which rotated goal_id so it matches
-- the display number): g1 = number 1, g2 = number 2, g3 = number 3
-- ("Infrastructure Designed for the Learners Who Need it Most"). Goals 4, 5,
-- and 6 (g4, g5, g6) are NOT touched by this migration.
--
-- This migration is NOT executed as part of this change — no Databricks
-- credentials are available in this environment. Run it manually in the
-- Databricks SQL Editor once reviewed.
--
-- Run in: Databricks SQL Editor (usp_data catalog, usp_strategy schema)
-- Run manually — not executed as part of this change.
-- =============================================================================


-- =============================================================================
-- SECTION 1: g1 — Shared Technical Public Goods
-- =============================================================================

UPDATE usp_data.usp_strategy.strategy_goals
SET
  target_text = '50% of PST solutions using our public goods close the gap to top performance twice as fast as those that don''t (as measured by key benchmarks).',
  bold_stat   = '50%',
  chart_type  = 'benchmark-speed-comparison',
  chart_note  = 'Benchmark performance score over time — solutions using vs. not using public goods (illustrative, mock data pending real tracking)',
  goal_note   = 'Illustrative mock trajectory — real benchmark-speed data will populate once tracking is in place. Shows solutions using public goods (memory specs, eval tooling, benchmarks) closing the performance gap roughly 2x faster than solutions that don''t.',
  chart_config = '{"speedSeries":[{"period":"Q1","usingPublicGoods":30,"notUsing":29},{"period":"Q2","usingPublicGoods":40,"notUsing":32},{"period":"Q3","usingPublicGoods":52,"notUsing":35},{"period":"Q4","usingPublicGoods":66,"notUsing":38},{"period":"Q5","usingPublicGoods":80,"notUsing":42},{"period":"Q6","usingPublicGoods":92,"notUsing":46}],"speedLabelA":"Using Public Goods","speedLabelB":"Not Using Public Goods","speedYAxisLabel":"Benchmark performance score (0–100)","adoptionPct":{"current":12,"target2030":50,"trend":[{"year":"2026","pct":12},{"year":"2027","pct":20},{"year":"2028","pct":30},{"year":"2029","pct":40},{"year":"2030","pct":50}]},"solutions":[{"name":"Solution A","type":"Instruction + Tutoring","embedsPublicGoods":true,"benchmarkScore":78,"detail":"Uses portable memory spec v1 and domain benchmark eval; scored in top quartile on the Tutoring Efficacy Benchmark."},{"name":"Solution B","type":"Advising + Navigation","embedsPublicGoods":true,"benchmarkScore":64,"detail":"Embeds CSGA competency tags for pathway recommendations; mid-tier on Advising Pathway Accuracy Benchmark."},{"name":"Solution C","type":"Instruction + Tutoring","embedsPublicGoods":false,"benchmarkScore":41,"detail":"Does not yet embed portable memory spec; benchmark score reflects baseline performance without public-goods integration."},{"name":"Solution D","type":"Advising + Navigation","embedsPublicGoods":false,"benchmarkScore":38,"detail":"No public-goods integration; flagged as a priority outreach target for 2027."},{"name":"Solution E","type":"Instruction + Tutoring","embedsPublicGoods":true,"benchmarkScore":81,"detail":"Full integration — portable memory spec, domain benchmarks, and safety guardrails all embedded."},{"name":"Solution F","type":"Advising + Navigation","embedsPublicGoods":true,"benchmarkScore":70,"detail":"Adopted CSGA knowledge graph integration in 2026; benchmark score trending up."}],"keyBenchmarks":[{"name":"Tutoring Efficacy Benchmark","description":"Domain-specific benchmark measuring learning-gain efficacy for instruction & tutoring solutions."},{"name":"Advising Pathway Accuracy Benchmark","description":"Measures correctness/relevance of pathway recommendations for advising & navigation solutions."},{"name":"Portable Memory Continuity Test","description":"Evaluates whether a solution retains learner context and memory reliably across sessions."},{"name":"CSGA Competency Alignment Benchmark","description":"Measures how accurately a solution''s skill/competency tagging aligns with the CSGA knowledge graph."}]}',
  last_updated = current_timestamp(),
  updated_by  = 'migration:v7-chart-refresh'
WHERE goal_id = 'g1';


-- =============================================================================
-- SECTION 2: g2 — Evidence & Safety Measures that Shift the Market
-- =============================================================================

UPDATE usp_data.usp_strategy.strategy_goals
SET
  target_text = '75% of recognized independent verification bodies voluntarily adopt our OS evaluation infrastructure.',
  bold_stat   = '75%',
  chart_type  = 'adoption-progress',
  chart_note  = 'Cumulative independent verification bodies adopting the OS evaluation infrastructure, by year',
  goal_note   = 'Milestones mirror the vendor-adoption targets from the Develop AI Evaluation Infrastructure BOW (2 → 4 → 12 → 36 → 75+ vendors publicizing performance results, 2026–2030).',
  chart_config = '{"milestones":[{"year":"2026","count":2},{"year":"2027","count":4},{"year":"2028","count":12},{"year":"2029","count":36},{"year":"2030","count":75}],"unitLabel":"verification bodies","verificationBodies":[{"name":"EdSAFE AI Alliance","type":"Nonprofit consortium","status":"Publishing results","notes":"Early adopter; publishes vendor scorecards quarterly."},{"name":"Digital Promise","type":"Research nonprofit","status":"Publishing results","notes":"Runs its own edtech efficacy review process."},{"name":"1EdTech Consortium","type":"Standards body","status":"Onboarding","notes":"Piloting interoperability + evaluation standards alignment."},{"name":"ISTE","type":"Professional association","status":"Onboarding","notes":"Exploring seal-of-alignment program tied to our benchmarks."},{"name":"WestEd Evaluation Lab","type":"Research org","status":"Not yet engaged","notes":"Identified as a priority target for 2027 outreach."},{"name":"Jefferson Education Exchange","type":"Research nonprofit","status":"Not yet engaged","notes":"Runs its own edtech evidence ratings; potential alignment partner."}],"procurementStates":{"current":1,"states":[{"state":"Texas","sinceYear":"2026","notes":"State board rule requires third-party efficacy review before district procurement of AI tutoring tools."}]}}',
  last_updated = current_timestamp(),
  updated_by  = 'migration:v7-chart-refresh'
WHERE goal_id = 'g2';


-- =============================================================================
-- SECTION 3: g3 — Infrastructure Designed for the Learners Who Need it Most
-- =============================================================================

UPDATE usp_data.usp_strategy.strategy_goals
SET
  target_text = 'Within each solution space, at least 40% of target population served by solutions that perform well on key benchmarks that center them',
  bold_stat   = NULL,
  chart_type  = 'threshold-bars',
  chart_note  = '% of target population served by benchmark-strong solutions, by solution space (illustrative, mock data)',
  goal_note   = 'Illustrative mock baseline by solution space — real per-space benchmark coverage will populate as evidence comes in. The 40% line marks the 2030 target for every space.',
  chart_config = '{"threshold":40,"solutionSpaces":[{"label":"Instruction + Tutoring","pct":17},{"label":"Advising + Navigation","pct":23},{"label":"Assessment","pct":9},{"label":"Content Generation","pct":6}]}',
  last_updated = current_timestamp(),
  updated_by  = 'migration:v7-chart-refresh'
WHERE goal_id = 'g3';


-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- 1. Confirm the new target_text, bold_stat, and chart_type landed for g1/g2/g3
SELECT goal_id, number, title, target_text, bold_stat, chart_type, updated_by, last_updated
FROM usp_data.usp_strategy.strategy_goals
WHERE goal_id IN ('g1','g2','g3')
ORDER BY number;

-- 2. Confirm g3.bold_stat is NULL (per the schema.dbml leading-substring constraint)
SELECT goal_id, bold_stat
FROM usp_data.usp_strategy.strategy_goals
WHERE goal_id = 'g3' AND bold_stat IS NOT NULL;
-- Expect zero rows.

-- 3. Sanity-check chart_config is valid JSON and has the expected top-level keys
SELECT goal_id,
       chart_type,
       from_json(chart_config, 'map<string,string>') IS NOT NULL AS parses_ok
FROM usp_data.usp_strategy.strategy_goals
WHERE goal_id IN ('g1','g2','g3');

-- 4. Confirm g4, g5, g6 were NOT touched by this migration
SELECT goal_id, number, title, updated_by, last_updated
FROM usp_data.usp_strategy.strategy_goals
WHERE goal_id IN ('g4','g5','g6')
ORDER BY number;
