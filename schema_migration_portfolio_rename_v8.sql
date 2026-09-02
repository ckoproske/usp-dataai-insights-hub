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
SET title       = 'Strategy, Planning, and Management',
    description = 'The Strategy, Planning, and Management Portfolio provides the strategic, operational, and learning infrastructure that enables USP Data & AI to execute its strategy effectively and adapt over time.'
WHERE portfolio_id = 'cross-cutting';


-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Expect the new title on cross-cutting and the other three unchanged
SELECT portfolio_id, title, sort_order
FROM usp_data.usp_strategy.portfolios
ORDER BY sort_order;

-- Description should now open "The Strategy, Planning, and Management
-- Portfolio provides..." with no remaining reference to the old name.
SELECT portfolio_id,
       LEFT(description, 90) AS description_opening,
       description LIKE '%Cross%' AS still_mentions_old_name
FROM usp_data.usp_strategy.portfolios
WHERE portfolio_id = 'cross-cutting';
