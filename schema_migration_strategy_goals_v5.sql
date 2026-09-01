-- =============================================================================
-- USP Data & AI Strategy — Schema Migration: align goal_id with display number
-- September 2026
--
-- v4 kept goal_id pinned to content lineage while renumbering the goals, which
-- left the ids out of step with the numbers they render as:
--
--   goal_id  number   →   goal_id  number
--   g1       1            g1       1   (unchanged)
--   g2       2            g2       2   (unchanged)
--   g6       3            g3       3
--   g3       4            g4       4
--   g4       5            g5       5
--   g5       6            g6       6
--
-- That is a 4-way rotation (g6→g3→g4→g5→g6), so every id in the cycle collides
-- with a live one. Each table is therefore updated in two phases: park the
-- rotating ids under tmp_* values, then land them on their final values.
--
-- goal_id is referenced by six places:
--   strategy_goals.goal_id            (PK)
--   portfolio_goal_links.goal_id      (FK)
--   strategy_goal_actuals.goal_id     (FK)
--   goal_ratings.goal_id              (FK)
--   key_decisions.goal_id             (FK, populated when level = 'goal')
--   content_edit_log.entity_id        (generic, WHERE entity_type = 'strategy_goal')
--
-- comments.entity_id is NOT affected — that table only ever stores 'bow' and
-- 'portfolio' entity types.
--
-- Delta has no multi-table transaction, so run every statement in SECTION 1
-- before any statement in SECTION 2, and do not stop in between: between the
-- two sections the tmp_* ids are live and the app will not resolve those goals.
-- Run this when nobody is using the dashboard.
--
-- Run in: Databricks SQL Editor (usp_data catalog, usp_strategy schema)
-- =============================================================================


-- =============================================================================
-- PRE-FLIGHT: snapshot the current linkage so it can be compared afterwards
-- =============================================================================

SELECT 'strategy_goals' AS tbl, goal_id, CAST(number AS STRING) AS detail
FROM usp_data.usp_strategy.strategy_goals
UNION ALL
SELECT 'portfolio_goal_links', goal_id, portfolio_id
FROM usp_data.usp_strategy.portfolio_goal_links
UNION ALL
SELECT 'strategy_goal_actuals', goal_id, CONCAT(CAST(year AS STRING), ':', CAST(actual_value AS STRING))
FROM usp_data.usp_strategy.strategy_goal_actuals
UNION ALL
SELECT 'goal_ratings', goal_id, CONCAT(CAST(year AS STRING), ':', rating)
FROM usp_data.usp_strategy.goal_ratings
UNION ALL
SELECT 'key_decisions', goal_id, decision_id
FROM usp_data.usp_strategy.key_decisions WHERE goal_id IS NOT NULL
UNION ALL
SELECT 'content_edit_log', entity_id, log_id
FROM usp_data.usp_strategy.content_edit_log WHERE entity_type = 'strategy_goal'
ORDER BY tbl, goal_id;


-- =============================================================================
-- SECTION 1: park the rotating ids under tmp_* values
-- =============================================================================

UPDATE usp_data.usp_strategy.strategy_goals
SET goal_id = CASE goal_id
                WHEN 'g6' THEN 'tmp_g3'
                WHEN 'g3' THEN 'tmp_g4'
                WHEN 'g4' THEN 'tmp_g5'
                WHEN 'g5' THEN 'tmp_g6'
              END
WHERE goal_id IN ('g3','g4','g5','g6');

UPDATE usp_data.usp_strategy.portfolio_goal_links
SET goal_id = CASE goal_id
                WHEN 'g6' THEN 'tmp_g3'
                WHEN 'g3' THEN 'tmp_g4'
                WHEN 'g4' THEN 'tmp_g5'
                WHEN 'g5' THEN 'tmp_g6'
              END
WHERE goal_id IN ('g3','g4','g5','g6');

UPDATE usp_data.usp_strategy.strategy_goal_actuals
SET goal_id = CASE goal_id
                WHEN 'g6' THEN 'tmp_g3'
                WHEN 'g3' THEN 'tmp_g4'
                WHEN 'g4' THEN 'tmp_g5'
                WHEN 'g5' THEN 'tmp_g6'
              END
WHERE goal_id IN ('g3','g4','g5','g6');

UPDATE usp_data.usp_strategy.goal_ratings
SET goal_id = CASE goal_id
                WHEN 'g6' THEN 'tmp_g3'
                WHEN 'g3' THEN 'tmp_g4'
                WHEN 'g4' THEN 'tmp_g5'
                WHEN 'g5' THEN 'tmp_g6'
              END
WHERE goal_id IN ('g3','g4','g5','g6');

UPDATE usp_data.usp_strategy.key_decisions
SET goal_id = CASE goal_id
                WHEN 'g6' THEN 'tmp_g3'
                WHEN 'g3' THEN 'tmp_g4'
                WHEN 'g4' THEN 'tmp_g5'
                WHEN 'g5' THEN 'tmp_g6'
              END
WHERE goal_id IN ('g3','g4','g5','g6');

UPDATE usp_data.usp_strategy.content_edit_log
SET entity_id = CASE entity_id
                  WHEN 'g6' THEN 'tmp_g3'
                  WHEN 'g3' THEN 'tmp_g4'
                  WHEN 'g4' THEN 'tmp_g5'
                  WHEN 'g5' THEN 'tmp_g6'
                END
WHERE entity_type = 'strategy_goal' AND entity_id IN ('g3','g4','g5','g6');


-- =============================================================================
-- SECTION 2: land the tmp_* ids on their final values
-- =============================================================================

UPDATE usp_data.usp_strategy.strategy_goals
SET goal_id = SUBSTRING(goal_id, 5)
WHERE goal_id IN ('tmp_g3','tmp_g4','tmp_g5','tmp_g6');

UPDATE usp_data.usp_strategy.portfolio_goal_links
SET goal_id = SUBSTRING(goal_id, 5)
WHERE goal_id IN ('tmp_g3','tmp_g4','tmp_g5','tmp_g6');

UPDATE usp_data.usp_strategy.strategy_goal_actuals
SET goal_id = SUBSTRING(goal_id, 5)
WHERE goal_id IN ('tmp_g3','tmp_g4','tmp_g5','tmp_g6');

UPDATE usp_data.usp_strategy.goal_ratings
SET goal_id = SUBSTRING(goal_id, 5)
WHERE goal_id IN ('tmp_g3','tmp_g4','tmp_g5','tmp_g6');

UPDATE usp_data.usp_strategy.key_decisions
SET goal_id = SUBSTRING(goal_id, 5)
WHERE goal_id IN ('tmp_g3','tmp_g4','tmp_g5','tmp_g6');

UPDATE usp_data.usp_strategy.content_edit_log
SET entity_id = SUBSTRING(entity_id, 5)
WHERE entity_type = 'strategy_goal' AND entity_id IN ('tmp_g3','tmp_g4','tmp_g5','tmp_g6');


-- =============================================================================
-- SECTION 3: stamp the audit columns
-- =============================================================================

UPDATE usp_data.usp_strategy.strategy_goals
SET last_updated = current_timestamp(),
    updated_by   = 'migration:strategy_goals_v5'
WHERE goal_id IN ('g3','g4','g5','g6');


-- =============================================================================
-- SECTION 4: link the new goal to its portfolio
--
-- Goal 3 ("Infrastructure Designed for the Learners Who Need it Most") is new in
-- the v4 re-cut and had no portfolio linkage. It belongs to AI Infrastructure,
-- which already carries the matching indicators (low-SES learner test cases in
-- benchmarks, population-disaggregated benchmark performance).
--
-- Runs after SECTION 2, so the id is 'g3'. Guarded so it is safe to re-run.
-- If 'ai-infra' is not the literal portfolio_id, correct it here first:
--   SELECT portfolio_id, title FROM usp_data.usp_strategy.portfolios ORDER BY sort_order;
-- =============================================================================

INSERT INTO usp_data.usp_strategy.portfolio_goal_links (portfolio_id, goal_id)
SELECT 'ai-infra', 'g3'
WHERE NOT EXISTS (
  SELECT 1 FROM usp_data.usp_strategy.portfolio_goal_links
  WHERE portfolio_id = 'ai-infra' AND goal_id = 'g3'
);


-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- 0. The new goal's linkage — expect one row, ai-infra / g3
SELECT l.portfolio_id, l.goal_id, g.number, g.title
FROM usp_data.usp_strategy.portfolio_goal_links l
JOIN usp_data.usp_strategy.strategy_goals g ON g.goal_id = l.goal_id
WHERE l.goal_id = 'g3';

-- 1. goal_id must now equal 'g' || number for all six rows
SELECT goal_id, number, sort_order, title,
       CASE WHEN goal_id = CONCAT('g', CAST(number AS STRING)) THEN 'aligned' ELSE 'MISMATCH' END AS id_check
FROM usp_data.usp_strategy.strategy_goals
ORDER BY sort_order;

-- 2. No tmp_* ids left behind anywhere — expect zero rows
SELECT 'strategy_goals' AS tbl, goal_id FROM usp_data.usp_strategy.strategy_goals WHERE goal_id LIKE 'tmp_%'
UNION ALL
SELECT 'portfolio_goal_links', goal_id FROM usp_data.usp_strategy.portfolio_goal_links WHERE goal_id LIKE 'tmp_%'
UNION ALL
SELECT 'strategy_goal_actuals', goal_id FROM usp_data.usp_strategy.strategy_goal_actuals WHERE goal_id LIKE 'tmp_%'
UNION ALL
SELECT 'goal_ratings', goal_id FROM usp_data.usp_strategy.goal_ratings WHERE goal_id LIKE 'tmp_%'
UNION ALL
SELECT 'key_decisions', goal_id FROM usp_data.usp_strategy.key_decisions WHERE goal_id LIKE 'tmp_%'
UNION ALL
SELECT 'content_edit_log', entity_id FROM usp_data.usp_strategy.content_edit_log
  WHERE entity_type = 'strategy_goal' AND entity_id LIKE 'tmp_%';

-- 3. No orphaned child rows — every referencing goal_id must resolve. Expect zero rows.
SELECT 'portfolio_goal_links' AS tbl, l.goal_id
FROM usp_data.usp_strategy.portfolio_goal_links l
LEFT JOIN usp_data.usp_strategy.strategy_goals g ON g.goal_id = l.goal_id
WHERE g.goal_id IS NULL
UNION ALL
SELECT 'strategy_goal_actuals', a.goal_id
FROM usp_data.usp_strategy.strategy_goal_actuals a
LEFT JOIN usp_data.usp_strategy.strategy_goals g ON g.goal_id = a.goal_id
WHERE g.goal_id IS NULL
UNION ALL
SELECT 'goal_ratings', r.goal_id
FROM usp_data.usp_strategy.goal_ratings r
LEFT JOIN usp_data.usp_strategy.strategy_goals g ON g.goal_id = r.goal_id
WHERE g.goal_id IS NULL
UNION ALL
SELECT 'key_decisions', k.goal_id
FROM usp_data.usp_strategy.key_decisions k
LEFT JOIN usp_data.usp_strategy.strategy_goals g ON g.goal_id = k.goal_id
WHERE k.goal_id IS NOT NULL AND g.goal_id IS NULL;

-- 4. Exactly six goals, no duplicate ids or numbers — expect zero rows
SELECT goal_id, COUNT(*) AS n FROM usp_data.usp_strategy.strategy_goals GROUP BY goal_id HAVING COUNT(*) > 1;
SELECT number,  COUNT(*) AS n FROM usp_data.usp_strategy.strategy_goals GROUP BY number  HAVING COUNT(*) > 1;
