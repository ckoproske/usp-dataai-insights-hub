-- =============================================================================
-- USP Data & AI Strategy — Schema Migration: g1 chart_config refinements
-- September 2026
--
-- Follow-up to schema_migration_strategy_goals_v7.sql (DONE — do not re-edit or
-- re-run that file). This migration ONLY updates g1's chart_config JSON to fix
-- three issues found in review of the "benchmark-speed-comparison" chart:
--
--   1. Time scale: g1's real timeframe is 2026-2030 (annual), but v7's
--      speedSeries used 6 fabricated quarterly points (Q1..Q6). Replaced with
--      5 annual points, period = "2026".."2030", keeping usingPublicGoods
--      diverging from notUsing at roughly the same "2x as fast" illustrative
--      shape (30/29 -> 45/33 -> 62/37 -> 78/41 -> 92/46).
--
--   2. Adoption baseline: adoptionPct.current was 12, inconsistent with the
--      goal's own current_2026 = 0. Fixed adoptionPct.current to 0, and fixed
--      the first (2026) point of adoptionPct.trend from 12 to 0 to match.
--      2027-2030 trend values (20/30/40/50) are unchanged.
--
--   3. Key benchmarks: the 4 named benchmarks in v7's keyBenchmarks
--      (Tutoring Efficacy Benchmark, etc.) were fabricated placeholders — the
--      real benchmarks for this goal have not been decided yet. Set
--      keyBenchmarks to an empty array; the dashboard now renders a
--      "Coming Soon" state for this section when the list is empty.
--
-- Nothing else on g1 changes (target_text/chart_type/chart_note/goal_note are
-- left as v7 set them — their wording does not reference the removed
-- illustrative footnote or the old quarterly labels, so no edit is needed).
-- solutions and speedLabelA/speedLabelB/speedYAxisLabel are also unchanged.
--
-- g2 and g3 are NOT touched by this migration — the other changes in this
-- round (removing the "Future Scenario Modeling" button and the "Ambition
-- 2045" sidebar) are pure frontend/JSX changes with no DB-backed data.
--
-- This migration is NOT executed as part of this change — no Databricks
-- credentials are available in this environment. Run it manually in the
-- Databricks SQL Editor once reviewed.
--
-- Run in: Databricks SQL Editor (usp_data catalog, usp_strategy schema)
-- Run manually — not executed as part of this change.
-- =============================================================================


-- =============================================================================
-- SECTION 1: g1 — Shared Technical Public Goods (chart_config only)
-- =============================================================================

UPDATE usp_data.usp_strategy.strategy_goals
SET
  chart_config = '{"speedSeries":[{"period":"2026","usingPublicGoods":30,"notUsing":29},{"period":"2027","usingPublicGoods":45,"notUsing":33},{"period":"2028","usingPublicGoods":62,"notUsing":37},{"period":"2029","usingPublicGoods":78,"notUsing":41},{"period":"2030","usingPublicGoods":92,"notUsing":46}],"speedLabelA":"Using Public Goods","speedLabelB":"Not Using Public Goods","speedYAxisLabel":"Benchmark performance score (0–100)","adoptionPct":{"current":0,"target2030":50,"trend":[{"year":"2026","pct":0},{"year":"2027","pct":20},{"year":"2028","pct":30},{"year":"2029","pct":40},{"year":"2030","pct":50}]},"solutions":[{"name":"Solution A","type":"Instruction + Tutoring","embedsPublicGoods":true,"benchmarkScore":78,"detail":"Uses portable memory spec v1 and domain benchmark eval; scored in top quartile on the Tutoring Efficacy Benchmark."},{"name":"Solution B","type":"Advising + Navigation","embedsPublicGoods":true,"benchmarkScore":64,"detail":"Embeds CSGA competency tags for pathway recommendations; mid-tier on Advising Pathway Accuracy Benchmark."},{"name":"Solution C","type":"Instruction + Tutoring","embedsPublicGoods":false,"benchmarkScore":41,"detail":"Does not yet embed portable memory spec; benchmark score reflects baseline performance without public-goods integration."},{"name":"Solution D","type":"Advising + Navigation","embedsPublicGoods":false,"benchmarkScore":38,"detail":"No public-goods integration; flagged as a priority outreach target for 2027."},{"name":"Solution E","type":"Instruction + Tutoring","embedsPublicGoods":true,"benchmarkScore":81,"detail":"Full integration — portable memory spec, domain benchmarks, and safety guardrails all embedded."},{"name":"Solution F","type":"Advising + Navigation","embedsPublicGoods":true,"benchmarkScore":70,"detail":"Adopted CSGA knowledge graph integration in 2026; benchmark score trending up."}],"keyBenchmarks":[]}',
  last_updated = current_timestamp(),
  updated_by  = 'migration:v8-g1-chart-fixes'
WHERE goal_id = 'g1';


-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- 1. Confirm the update landed
SELECT goal_id, number, title, chart_type, updated_by, last_updated
FROM usp_data.usp_strategy.strategy_goals
WHERE goal_id = 'g1';

-- 2. Confirm chart_config parses as valid JSON and has the expected top-level keys
SELECT goal_id,
       from_json(chart_config,
         'struct<speedSeries:array<struct<period:string,usingPublicGoods:int,notUsing:int>>,speedLabelA:string,speedLabelB:string,speedYAxisLabel:string,adoptionPct:struct<current:int,target2030:int,trend:array<struct<year:string,pct:int>>>,solutions:array<struct<name:string,type:string,embedsPublicGoods:boolean,benchmarkScore:int,detail:string>>,keyBenchmarks:array<struct<name:string,description:string>>>'
       ) IS NOT NULL AS parses_ok
FROM usp_data.usp_strategy.strategy_goals
WHERE goal_id = 'g1';

-- 3. Confirm the annual speedSeries (5 points, 2026-2030) and the fixed
--    adoptionPct.current / trend[0] = 0
SELECT goal_id,
       get_json_object(chart_config, '$.speedSeries[0].period')      AS first_period,
       get_json_object(chart_config, '$.speedSeries[4].period')      AS last_period,
       size(from_json(chart_config, 'struct<speedSeries:array<string>>').speedSeries) AS speed_series_len,
       get_json_object(chart_config, '$.adoptionPct.current')        AS adoption_current,
       get_json_object(chart_config, '$.adoptionPct.trend[0].pct')    AS adoption_trend_2026,
       get_json_object(chart_config, '$.keyBenchmarks')               AS key_benchmarks
FROM usp_data.usp_strategy.strategy_goals
WHERE goal_id = 'g1';
-- Expect: first_period='2026', last_period='2030', speed_series_len=5,
--         adoption_current='0', adoption_trend_2026='0', key_benchmarks='[]'.

-- 4. Confirm g2 and g3 were NOT touched by this migration
SELECT goal_id, number, title, updated_by, last_updated
FROM usp_data.usp_strategy.strategy_goals
WHERE goal_id IN ('g2','g3')
ORDER BY number;
