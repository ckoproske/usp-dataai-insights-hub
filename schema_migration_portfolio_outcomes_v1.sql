-- =============================================================================
-- USP Data & AI Strategy — Data Migration: Seed portfolio_outcomes and
-- portfolio_indicators from portfolio_toa_lanes / portfolio_toa_lane_indicators
--
-- Root cause: portfolio_outcomes and portfolio_indicators tables were empty
-- (or had stale hardcoded content), causing the dashboard portfolio progress
-- pages to fall back to DEFAULT_DATA rather than showing slide-accurate content.
-- The ToA tables were seeded correctly in schema_migration_toa_v1.sql;
-- this migration keeps portfolio_outcomes and portfolio_indicators in sync
-- with that source of truth.
--
-- Mapping:
--   portfolio_toa_lanes       → portfolio_outcomes
--     lane_id                 → outcome_id
--     label                   → short_title
--     outcome_text            → outcome
--     first activity_text     → activity  (first by sort_order per lane)
--     sort_order              → sort_order
--
--   portfolio_toa_lane_indicators → portfolio_indicators
--     indicator_id            → indicator_id
--     portfolio_id            → portfolio_id
--     lane_id                 → outcome_id  (FK to portfolio_outcomes)
--     indicator_text          → text
--     (targets left NULL — set separately via the portal or actuals workflow)
--
-- Safe to re-run: MERGE ON NOT MATCHED inserts missing rows;
--                 WHEN MATCHED UPDATE keeps text in sync with ToA edits.
-- Run in: Databricks SQL Editor (usp_data catalog, usp_strategy schema)
-- =============================================================================


-- =============================================================================
-- SECTION 1: portfolio_outcomes  (one row per ToA lane)
-- =============================================================================

MERGE INTO usp_data.usp_strategy.portfolio_outcomes AS t
USING (
  SELECT
    l.lane_id          AS outcome_id,
    l.portfolio_id,
    l.label            AS short_title,
    a.activity_text    AS activity,
    l.outcome_text     AS outcome,
    l.sort_order
  FROM usp_data.usp_strategy.portfolio_toa_lanes l
  LEFT JOIN (
    SELECT lane_id, activity_text,
           ROW_NUMBER() OVER (PARTITION BY lane_id ORDER BY sort_order) AS rn
    FROM usp_data.usp_strategy.portfolio_toa_activities
  ) a ON a.lane_id = l.lane_id AND a.rn = 1
  WHERE COALESCE(l.is_active, true) = true
) AS s ON t.outcome_id = s.outcome_id
WHEN MATCHED THEN UPDATE SET
  short_title = s.short_title,
  activity    = s.activity,
  outcome     = s.outcome,
  sort_order  = s.sort_order
WHEN NOT MATCHED THEN INSERT (
  outcome_id, portfolio_id, short_title, activity, outcome, sort_order
) VALUES (
  s.outcome_id, s.portfolio_id, s.short_title, s.activity, s.outcome, s.sort_order
);


-- =============================================================================
-- SECTION 2: portfolio_indicators  (one row per ToA lane indicator)
-- =============================================================================

MERGE INTO usp_data.usp_strategy.portfolio_indicators AS t
USING (
  SELECT
    i.indicator_id,
    i.portfolio_id,
    i.lane_id          AS outcome_id,
    i.indicator_text   AS text,
    CAST(NULL AS STRING) AS data_source,
    CAST(NULL AS DOUBLE) AS baseline,
    CAST(NULL AS DOUBLE) AS target_2026,
    CAST(NULL AS DOUBLE) AS target_2027,
    CAST(NULL AS DOUBLE) AS target_2028,
    CAST(NULL AS DOUBLE) AS target_2029,
    CAST(NULL AS DOUBLE) AS target_2030
  FROM usp_data.usp_strategy.portfolio_toa_lane_indicators i
) AS s ON t.indicator_id = s.indicator_id
WHEN MATCHED THEN UPDATE SET
  text       = s.text,
  outcome_id = s.outcome_id
WHEN NOT MATCHED THEN INSERT (
  indicator_id, portfolio_id, outcome_id, text,
  data_source, baseline,
  target_2026, target_2027, target_2028, target_2029, target_2030
) VALUES (
  s.indicator_id, s.portfolio_id, s.outcome_id, s.text,
  s.data_source, s.baseline,
  s.target_2026, s.target_2027, s.target_2028, s.target_2029, s.target_2030
);


-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- 1. Outcome counts per portfolio (expect: hub=3, sfl=6, cross-cutting=4, ai-infra=3)
SELECT portfolio_id, COUNT(*) AS outcomes
FROM usp_data.usp_strategy.portfolio_outcomes
GROUP BY portfolio_id ORDER BY portfolio_id;

-- 2. Indicator counts per portfolio (expect: hub=12, sfl=10, cross-cutting=12, ai-infra=9)
SELECT portfolio_id, COUNT(*) AS indicators
FROM usp_data.usp_strategy.portfolio_indicators
GROUP BY portfolio_id ORDER BY portfolio_id;

-- 3. Spot-check: outcomes with their text
SELECT outcome_id, portfolio_id, short_title, LEFT(outcome, 80) AS outcome_preview
FROM usp_data.usp_strategy.portfolio_outcomes
ORDER BY portfolio_id, sort_order;

-- 4. Confirm indicators link back to valid outcomes
SELECT i.indicator_id, i.portfolio_id, i.outcome_id, LEFT(i.text, 60) AS indicator_preview
FROM usp_data.usp_strategy.portfolio_indicators i
LEFT JOIN usp_data.usp_strategy.portfolio_outcomes o ON o.outcome_id = i.outcome_id
WHERE o.outcome_id IS NULL;
-- Expected: 0 rows (no orphans)
