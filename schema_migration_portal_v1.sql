-- =============================================================================
-- USP Data & AI Strategy — Schema Migration: Submit Portal v1
-- Adds fields needed to support the indicator actuals submission portal
-- April 2026
-- Run in: usp_data.usp_strategy (Databricks SQL editor)
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. bow_indicators — add collection_frequency
-- Drives the period selector in the portal submission form.
-- Portal reads this field to present the right time options to the submitter.
-- -----------------------------------------------------------------------------
ALTER TABLE usp_data.usp_strategy.bow_indicators
ADD COLUMN collection_frequency STRING
COMMENT 'annual | quarterly | bimonthly | monthly — drives period selector in submission portal';


-- -----------------------------------------------------------------------------
-- 2. pending_actuals — add portal submission fields
-- reading_date: when the data was actually observed or published (≠ submitted_at)
-- source_notes: where the data came from — required at submission time
-- period:       sub-annual period for non-annual indicators (Q1-Q4 or M01-M12)
-- reviewer_notes: reason recorded by reviewer when rejecting a submission
-- -----------------------------------------------------------------------------
ALTER TABLE usp_data.usp_strategy.pending_actuals
ADD COLUMN reading_date STRING
COMMENT 'Date the data was collected or published — may differ from submitted_at if entering from a report or partner update';

ALTER TABLE usp_data.usp_strategy.pending_actuals
ADD COLUMN source_notes STRING
COMMENT 'Where the data came from — required at submission. e.g. report name, URL, partner conversation';

ALTER TABLE usp_data.usp_strategy.pending_actuals
ADD COLUMN period STRING
COMMENT 'Sub-annual reporting period — Q1 | Q2 | Q3 | Q4 | M01–M12. Null for annual indicators.';

ALTER TABLE usp_data.usp_strategy.pending_actuals
ADD COLUMN reviewer_notes STRING
COMMENT 'Reason recorded by MLE reviewer when rejecting or querying a submission — visible to submitter';


-- -----------------------------------------------------------------------------
-- 3. bow_indicator_actuals — add period
-- Matches pending_actuals so period is preserved when a submission is approved
-- and written to the actuals table. reading_date and source_notes already exist.
-- -----------------------------------------------------------------------------
ALTER TABLE usp_data.usp_strategy.bow_indicator_actuals
ADD COLUMN period STRING
COMMENT 'Sub-annual reporting period — Q1 | Q2 | Q3 | Q4 | M01–M12. Null for annual indicators.';


-- -----------------------------------------------------------------------------
-- 4. portfolio_indicator_actuals — add period
-- Consistency with bow_indicator_actuals. reading_date and source_notes already exist.
-- -----------------------------------------------------------------------------
ALTER TABLE usp_data.usp_strategy.portfolio_indicator_actuals
ADD COLUMN period STRING
COMMENT 'Sub-annual reporting period — Q1 | Q2 | Q3 | Q4 | M01–M12. Null for annual indicators.';


-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Confirm bow_indicators has collection_frequency
SELECT col_name, data_type, comment
FROM (DESCRIBE TABLE usp_data.usp_strategy.bow_indicators)
WHERE col_name = 'collection_frequency';

-- Confirm pending_actuals new columns
SELECT col_name, data_type, comment
FROM (DESCRIBE TABLE usp_data.usp_strategy.pending_actuals)
WHERE col_name IN ('reading_date', 'source_notes', 'period', 'reviewer_notes');

-- Confirm period on actuals tables
SELECT col_name, data_type, comment
FROM (DESCRIBE TABLE usp_data.usp_strategy.bow_indicator_actuals)
WHERE col_name = 'period';

SELECT col_name, data_type, comment
FROM (DESCRIBE TABLE usp_data.usp_strategy.portfolio_indicator_actuals)
WHERE col_name = 'period';
