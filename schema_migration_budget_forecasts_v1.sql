-- =============================================================================
-- USP Data & AI Strategy — Schema Migration: Budget Forecast Snapshots v1
-- Adds budget_forecast_snapshots for point-in-time budget forecast captures
-- May 2026
-- Run in: usp_data.usp_strategy (Databricks SQL editor)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- budget_forecast_snapshots — append-only store of forecast captures
--
-- snapshot_data: JSON array of BOW-level rows at time of capture.
--   Each row contains all computed fields: budget_allocation, committed_total,
--   committed_paid, committed_unpaid, committed_grants, committed_contracts,
--   potential_total, potential_grants, potential_contracts, potential_by_stage,
--   pipeline_total, headroom, expected_forecast (null until attrition rate wired),
--   expected_headroom (null until attrition rate wired).
--
-- Rows are never updated or deleted — snapshots are immutable records.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usp_data.usp_strategy.budget_forecast_snapshots (
  snapshot_id    STRING    NOT NULL,
  label          STRING    NOT NULL,
  fiscal_year    INT       NOT NULL,
  snapshot_date  DATE      NOT NULL,
  taken_by       STRING    NOT NULL,
  snapshot_data  STRING    NOT NULL
)
COMMENT 'Append-only point-in-time captures of the budget forecast table. snapshot_data is a JSON array of BOW-level rows. Never update or delete rows.';

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DESCRIBE TABLE usp_data.usp_strategy.budget_forecast_snapshots;
