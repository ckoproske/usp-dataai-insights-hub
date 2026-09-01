-- =============================================================================
-- USP Data & AI Strategy — Fix: stale goal copies shadowing the live goals
-- September 2026
--
-- Symptom: opening a portfolio page briefly showed the correct new 2030 goals,
-- then replaced them with the pre-re-cut goal text.
--
-- Cause: the "2030 Goals" section of PortfolioOverviewToa has two mutually
-- exclusive sources (dashboard.jsx ~4484-4509). It renders
-- portfolio_toa.cross_indicators_json if that array is non-empty, and only
-- falls back to the live strategy_goals records when it is empty. The ToA row
-- is fetched asynchronously, so the live goals paint first and are then
-- overwritten once the fetch resolves.
--
-- ai-infra and sfl both stored hand-copied restatements of the OLD goals:
--
--   ai-infra  "Goal 1: 40% of learners reached by solutions embedding portable
--              memory & context"
--             "Goal 2: 50% of learners reached by solutions using evidence-based
--              benchmarks improving safety & quality"
--   sfl       "% district/PS decision makers using higher-quality data to
--              improve learning, advising, mobility & credentials"
--             "X% of field leaders have timely, comprehensive data to assess all
--              Amb45 EW Momentum Points"
--
-- Clearing those two lets the section render from strategy_goals, which is the
-- source of truth and cannot drift on the next re-cut.
--
-- cross-cutting and hub are deliberately left alone. Their entries are genuine
-- portfolio-specific impact measures (staff enablement, Hub NPS), not goal
-- restatements, and PORT_GOAL_MAP maps neither portfolio to a strategy goal, so
-- the fallback would render nothing for them.
--
-- No effect on PortfolioToaView — it is called with hideIndicators={true}
-- (dashboard.jsx:4677) and never renders this block.
--
-- Run in: Databricks SQL Editor (usp_data catalog, usp_strategy schema)
-- =============================================================================


-- =============================================================================
-- BEFORE: capture the text being removed, in case it is wanted elsewhere
-- =============================================================================

SELECT portfolio_id, cross_indicators_label, cross_indicators_json
FROM usp_data.usp_strategy.portfolio_toa
WHERE portfolio_id IN ('ai-infra','sfl');


-- =============================================================================
-- FIX: clear the stale goal restatements
-- =============================================================================

UPDATE usp_data.usp_strategy.portfolio_toa
SET cross_indicators_json = NULL
WHERE portfolio_id IN ('ai-infra','sfl');


-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Expect ai-infra and sfl NULL; cross-cutting and hub still populated.
SELECT portfolio_id,
       cross_indicators_label,
       cross_indicators_json,
       CASE
         WHEN portfolio_id IN ('ai-infra','sfl') AND cross_indicators_json IS NULL THEN 'cleared'
         WHEN portfolio_id IN ('cross-cutting','hub') AND cross_indicators_json IS NOT NULL THEN 'kept'
         ELSE 'UNEXPECTED'
       END AS check_result
FROM usp_data.usp_strategy.portfolio_toa
ORDER BY portfolio_id;
