-- =============================================================================
-- USP Data & AI Strategy — Rename the cross-cutting portfolio
-- September 2026
--
-- "Cross Cutting Supports" becomes "Strategy, Planning, and Management".
--
-- The portfolio_id stays 'cross-cutting'. It is a primary key referenced by
-- bows, portfolio_outcomes, portfolio_goal_links, portfolio_indicators,
-- portfolio_toa, key_decisions, content_edit_log and more, and the id is not
-- user-visible — only the title is.
--
-- This has to run for the rename to take effect. dashboard.jsx carries the new
-- label in PORT_COLORS and the sidebar, but loadFromAPI overwrites the
-- displayed name with portfolios.title, so the old name would still show
-- everywhere the live data reaches.
--
-- Run in: Databricks SQL Editor (usp_data catalog, usp_strategy schema)
-- =============================================================================


-- =============================================================================
-- BEFORE
-- =============================================================================

SELECT portfolio_id, title, sort_order
FROM usp_data.usp_strategy.portfolios
ORDER BY sort_order;


-- =============================================================================
-- RENAME
-- =============================================================================

UPDATE usp_data.usp_strategy.portfolios
SET title = 'Strategy, Planning, and Management'
WHERE portfolio_id = 'cross-cutting';


-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Expect the new title on cross-cutting and the other three unchanged
SELECT portfolio_id, title, sort_order
FROM usp_data.usp_strategy.portfolios
ORDER BY sort_order;

-- The description still opens "The Cross-Cutting Portfolio provides the
-- strategic, operational, and learning infrastructure...". Review whether it
-- should be reworded to match the new name — it renders on the portfolio page.
SELECT portfolio_id, LEFT(description, 160) AS description_opening
FROM usp_data.usp_strategy.portfolios
WHERE portfolio_id = 'cross-cutting';
