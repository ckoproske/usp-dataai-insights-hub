-- =============================================================================
-- USP Data & AI Strategy — Schema Migration: Indicator columns catch-up
-- Adds all columns used by the Edit Content portal that may be missing from
-- bow_indicators and portfolio_indicators.
--
-- Safe to re-run: every statement uses ADD COLUMN IF NOT EXISTS.
-- Run once in: Databricks SQL Editor (catalog: usp_data, schema: usp_strategy)
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. bow_indicators — add all columns the portal and dashboard rely on
-- -----------------------------------------------------------------------------

-- Display name (separate from the longer text/purpose description)
ALTER TABLE usp_data.usp_strategy.bow_indicators
ADD COLUMN IF NOT EXISTS name STRING
COMMENT 'Short display name for the indicator (distinct from the full text description)';

-- What the indicator is intended to measure
ALTER TABLE usp_data.usp_strategy.bow_indicators
ADD COLUMN IF NOT EXISTS purpose STRING
COMMENT 'Why this indicator was chosen / what it is intended to measure';

-- Unit of measurement (%, #, $, learners, etc.)
ALTER TABLE usp_data.usp_strategy.bow_indicators
ADD COLUMN IF NOT EXISTS unit STRING
COMMENT 'Unit of measurement — e.g. %, #, $, schools, learners, partners';

-- How often data is collected — drives period selector in submission portal
ALTER TABLE usp_data.usp_strategy.bow_indicators
ADD COLUMN IF NOT EXISTS collection_frequency STRING
COMMENT 'annual | quarterly | bimonthly | monthly — drives period selector in submission portal';

-- FK to sources table — resolves to source_name / source_url at query time
ALTER TABLE usp_data.usp_strategy.bow_indicators
ADD COLUMN IF NOT EXISTS source_id STRING
COMMENT 'FK to usp_strategy.sources — preferred over legacy data_source text field';

-- Measurement level in the results chain
ALTER TABLE usp_data.usp_strategy.bow_indicators
ADD COLUMN IF NOT EXISTS measurement_level STRING
COMMENT 'outcome | output | process';

-- Lifecycle status of the indicator
ALTER TABLE usp_data.usp_strategy.bow_indicators
ADD COLUMN IF NOT EXISTS status STRING
COMMENT 'active | discontinued | under_review';

-- Data quality notes visible to MLE
ALTER TABLE usp_data.usp_strategy.bow_indicators
ADD COLUMN IF NOT EXISTS data_quality_notes STRING
COMMENT 'Known data quality issues, caveats, or collection notes';

-- Soft-delete flag (true = visible, false/null = archived)
ALTER TABLE usp_data.usp_strategy.bow_indicators
ADD COLUMN IF NOT EXISTS is_active BOOLEAN
COMMENT 'Soft-delete: false or null = archived, true = active';

-- Backfill is_active for any existing rows where it was just added as null
UPDATE usp_data.usp_strategy.bow_indicators
SET is_active = true
WHERE is_active IS NULL;


-- -----------------------------------------------------------------------------
-- 2. portfolio_indicators — mirror the same columns
-- -----------------------------------------------------------------------------

ALTER TABLE usp_data.usp_strategy.portfolio_indicators
ADD COLUMN IF NOT EXISTS name STRING
COMMENT 'Short display name for the indicator';

ALTER TABLE usp_data.usp_strategy.portfolio_indicators
ADD COLUMN IF NOT EXISTS purpose STRING
COMMENT 'Why this indicator was chosen / what it is intended to measure';

ALTER TABLE usp_data.usp_strategy.portfolio_indicators
ADD COLUMN IF NOT EXISTS unit STRING
COMMENT 'Unit of measurement — e.g. %, #, $, schools, learners, partners';

ALTER TABLE usp_data.usp_strategy.portfolio_indicators
ADD COLUMN IF NOT EXISTS collection_frequency STRING
COMMENT 'annual | quarterly | bimonthly | monthly';

ALTER TABLE usp_data.usp_strategy.portfolio_indicators
ADD COLUMN IF NOT EXISTS source_id STRING
COMMENT 'FK to usp_strategy.sources';

ALTER TABLE usp_data.usp_strategy.portfolio_indicators
ADD COLUMN IF NOT EXISTS measurement_level STRING
COMMENT 'outcome | output | process';

ALTER TABLE usp_data.usp_strategy.portfolio_indicators
ADD COLUMN IF NOT EXISTS status STRING
COMMENT 'active | discontinued | under_review';

ALTER TABLE usp_data.usp_strategy.portfolio_indicators
ADD COLUMN IF NOT EXISTS data_quality_notes STRING
COMMENT 'Known data quality issues or caveats';

ALTER TABLE usp_data.usp_strategy.portfolio_indicators
ADD COLUMN IF NOT EXISTS tracking_notes STRING
COMMENT 'Internal tracking or methodological notes';

ALTER TABLE usp_data.usp_strategy.portfolio_indicators
ADD COLUMN IF NOT EXISTS is_active BOOLEAN
COMMENT 'Soft-delete: false or null = archived, true = active';

UPDATE usp_data.usp_strategy.portfolio_indicators
SET is_active = true
WHERE is_active IS NULL;


-- =============================================================================
-- VERIFICATION — run after the ALTER statements to confirm columns exist
-- =============================================================================

SELECT col_name, data_type, comment
FROM (DESCRIBE TABLE usp_data.usp_strategy.bow_indicators)
WHERE col_name IN (
  'name', 'purpose', 'unit', 'collection_frequency',
  'source_id', 'measurement_level', 'status',
  'data_quality_notes', 'is_active'
)
ORDER BY col_name;

SELECT col_name, data_type, comment
FROM (DESCRIBE TABLE usp_data.usp_strategy.portfolio_indicators)
WHERE col_name IN (
  'name', 'purpose', 'unit', 'collection_frequency',
  'source_id', 'measurement_level', 'status',
  'data_quality_notes', 'tracking_notes', 'is_active'
)
ORDER BY col_name;
