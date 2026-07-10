-- ─── Add a portal-only draft BOW under SFL ("PS Collaboration") ──────────────
-- Context: this BOW should be editable in the submit portal like any other,
-- but must not appear on the main dashboard (which renders BOWs from a
-- hardcoded DEFAULT_DATA structure in dashboard.jsx, not live from /api/bows —
-- omitting the row from that structure is what keeps it off the dashboard)
-- and its indicators must not appear in the Indicator Catalog.
-- Run in: Databricks SQL Editor (usp_data catalog, usp_strategy schema)

-- STEP 1: Add the is_draft column (safe/no-op if it already exists)
ALTER TABLE usp_data.usp_strategy.bows
ADD COLUMNS (is_draft boolean);

-- STEP 2: Backfill existing rows to false so they're unaffected
UPDATE usp_data.usp_strategy.bows
SET is_draft = false
WHERE is_draft IS NULL;

-- STEP 3: Confirm the next sort_order under SFL before inserting.
--   sfl-bow1/2/3 are assumed to be sort_order 1/2/3, making 4 the next value
--   used in Step 4 below — check this result matches before running Step 4,
--   and edit the literal 4 in Step 4 if it doesn't.
SELECT bow_id, title, sort_order
FROM usp_data.usp_strategy.bows
WHERE portfolio_id = 'sfl'
ORDER BY sort_order;

-- STEP 4: Insert the new draft BOW
--   invest_bow_id is left NULL — this BOW isn't tracked in INVEST.
INSERT INTO usp_data.usp_strategy.bows
  (bow_id, portfolio_id, title, description, invest_bow_id, sort_order, is_draft)
VALUES
  ('sfl-bow4', 'sfl', 'PS Collaboration', NULL, NULL, 4, true);

-- STEP 5: Verify — should show is_draft = true and appear in /api/bows
SELECT * FROM usp_data.usp_strategy.bows WHERE bow_id = 'sfl-bow4';

-- ─────────────────────────────────────────────────────────────────────────────
-- FIX-UP: Step 4 was run twice, producing two identical sfl-bow4 rows with
-- sort_order = 1 (colliding with sfl-bow1). Delta has no PK constraint to
-- prevent this. Since the duplicate rows are byte-identical, there's no WHERE
-- clause that targets only one — delete both and re-insert cleanly.
-- ─────────────────────────────────────────────────────────────────────────────

-- STEP 6: Remove both duplicate rows
DELETE FROM usp_data.usp_strategy.bows WHERE bow_id = 'sfl-bow4';

-- STEP 7: Re-insert once, with the correct sort_order (4, after sfl-bow1/2/3)
INSERT INTO usp_data.usp_strategy.bows
  (bow_id, portfolio_id, title, description, invest_bow_id, sort_order, is_draft)
VALUES
  ('sfl-bow4', 'sfl', 'PS Collaboration', NULL, NULL, 4, true);

-- STEP 8: Verify — exactly one row, sort_order = 4
SELECT bow_id, portfolio_id, title, sort_order, is_draft
FROM usp_data.usp_strategy.bows
WHERE bow_id = 'sfl-bow4';
