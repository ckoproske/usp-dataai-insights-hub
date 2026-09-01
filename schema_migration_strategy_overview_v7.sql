-- =============================================================================
-- USP Data & AI Strategy — Schema Migration: Strategy Overview ToA page
-- September 2026
--
-- Supports the new "Strategy" tab on the Strategy Overview page, which renders
-- the theory-of-change narrative (IF / THEN / THEN / ACCELERATING) over the
-- four portfolios and the six 2030 goals.
--
-- 1. strategy_goals.bold_stat — the headline stat pulled out of target_text and
--    rendered large on the goal cards, e.g. "50%" or "2-3x". Stored rather than
--    regex-derived: splitting prose on a leading number silently truncates
--    goal 6 ("2-3x ($415-540M) leverage…") to "2", and would mangle any future
--    goal whose target does not open with a clean figure. The page renders the
--    remainder by stripping this prefix from target_text, so there is exactly
--    one copy of the sentence.
--
-- 2. portfolios.note — optional italic footnote on a portfolio card (the design
--    uses it for the Data & AI Enablement Hub's intermediate-outcome line).
--    Added nullable and left unpopulated; nothing renders when NULL.
--
-- Run in: Databricks SQL Editor (usp_data catalog, usp_strategy schema)
-- =============================================================================


-- =============================================================================
-- SECTION 1: Add the columns
-- =============================================================================

ALTER TABLE usp_data.usp_strategy.strategy_goals
ADD COLUMNS (
  bold_stat STRING COMMENT 'Headline stat rendered large on goal cards, e.g. "50%" or "2-3x"; must be a leading substring of target_text'
);

ALTER TABLE usp_data.usp_strategy.portfolios
ADD COLUMNS (
  note STRING COMMENT 'Optional italic footnote on the portfolio card, e.g. an intermediate-outcome line; nothing renders when NULL'
);


-- =============================================================================
-- SECTION 2: Populate bold_stat for the six goals
--
-- Each value is the literal leading substring of that goal's target_text, so
-- the frontend can strip it to get the remainder of the sentence.
-- =============================================================================

MERGE INTO usp_data.usp_strategy.strategy_goals AS t
USING (
  SELECT * FROM VALUES
    ('g1', '50%'),
    ('g2', '75%'),
    ('g3', '40%'),
    ('g4', '70%'),
    ('g5', '40%'),
    ('g6', '2-3x')
  AS t(goal_id, bold_stat)
) AS s
ON t.goal_id = s.goal_id
WHEN MATCHED THEN UPDATE SET
  t.bold_stat    = s.bold_stat,
  t.last_updated = current_timestamp(),
  t.updated_by   = 'migration:strategy_overview_v7';


-- =============================================================================
-- SECTION 3: Populate the Data & AI Enablement Hub footnote
--
-- The Hub is the one portfolio carrying an intermediate-outcome line on its
-- card. The other three stay NULL and render no footnote.
-- =============================================================================

UPDATE usp_data.usp_strategy.portfolios
SET note = '% of USP reporting Hub support contributed to a significant AI-related decision'
WHERE portfolio_id = 'hub';


-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- 1. Both columns exist
SELECT table_name, column_name, data_type
FROM usp_data.information_schema.columns
WHERE table_schema = 'usp_strategy'
  AND (   (table_name = 'strategy_goals' AND column_name = 'bold_stat')
       OR (table_name = 'portfolios'     AND column_name = 'note') )
ORDER BY table_name, column_name;

-- 2. Every goal has a bold_stat, and it is a genuine prefix of target_text.
--    prefix_ok must be true for all six rows, otherwise the frontend's strip
--    would leave a duplicated or truncated sentence.
SELECT goal_id, number, bold_stat,
       STARTSWITH(target_text, bold_stat) AS prefix_ok,
       TRIM(SUBSTRING(target_text, LENGTH(bold_stat) + 1)) AS rendered_remainder
FROM usp_data.usp_strategy.strategy_goals
ORDER BY sort_order;

-- 3. Guard: no goal left without a stat — expect zero rows
SELECT goal_id, number, title
FROM usp_data.usp_strategy.strategy_goals
WHERE bold_stat IS NULL OR bold_stat = '';

-- 4. All four portfolios present, note nullable and currently unset
SELECT portfolio_id, title, note, sort_order
FROM usp_data.usp_strategy.portfolios
ORDER BY sort_order;
